"""
Document Classification Module.

Classifies ingested documents into one of the target business categories:
- 'invoice': Invoices, bills, receipts, purchase orders.
- 'contract': Agreements, NDAs, MSAs, vendor contracts, terms of service.
- 'compliance_doc': SOC2, GDPR, ISO audits, regulatory compliance reports.
- 'other': Unrecognized or general business documents.

Handles both text-layer documents and scanned/image-based documents via OpenRouter free multimodal LLMs.
"""

from dataclasses import dataclass
from typing import Optional, Any
import numpy as np
from src.ingest import IngestedDocument
from src.openrouter_service import OpenRouterService, default_openrouter_service
from src.config import SUPPORTED_DOC_TYPES, CLASSIFIER_PATH

_cached_classifier: Optional[Any] = None


def _get_local_classifier():
    """Lazily loads the fine-tuned scikit-learn classifier pipeline."""
    global _cached_classifier
    if _cached_classifier is None and CLASSIFIER_PATH.exists():
        try:
            import joblib
            _cached_classifier = joblib.load(CLASSIFIER_PATH)
        except Exception as e:
            print(f"Warning: Could not load local classifier from {CLASSIFIER_PATH}: {e}")
    return _cached_classifier


@dataclass
class ClassificationResult:
    """Structured result from document classification."""
    doc_type: str
    confidence: float
    explanation: str
    source: str  # 'local_fine_tuned_classifier', 'openrouter_text', 'openrouter_vision', or 'heuristic_fallback'


CLASSIFICATION_PROMPT = """
You are a senior document intelligence AI for enterprise document processing.
Analyze the provided document (text and/or image) and classify it into EXACTLY ONE of the following categories:

1. 'invoice': Invoices, billing statements, accounts payable vendor bills, receipts with payment totals and line items.
2. 'contract': Legal contracts, Non-Disclosure Agreements (NDA), Master Services Agreements (MSA), Statements of Work (SOW), signed covenants.
3. 'compliance_doc': Regulatory audit reports, SOC 2 / GDPR / ISO assessments, compliance checklist documents.
4. 'purchase_order': Formal enterprise purchase orders (PO), procurement requisitions, itemized order confirmations with approval signatures.
5. 'tax_form': Official tax records, IRS Form W-9, Form 1099-NEC / 1099-MISC, Taxpayer Identification Number (TIN/EIN) certifications.
6. 'other': Any document that does not clearly fit the above categories.

Return a valid JSON object with the following structure:
{
    "doc_type": "invoice" | "contract" | "compliance_doc" | "purchase_order" | "tax_form" | "other",
    "confidence": float (between 0.0 and 1.0, e.g. 0.95),
    "explanation": "Brief 1-2 sentence rationale explaining key cues used to classify this document"
}
"""


def classify_document(
    doc: IngestedDocument,
    llm_service: Optional[OpenRouterService] = None
) -> ClassificationResult:
    """
    Classifies an IngestedDocument using local fine-tuned ML classifier or OpenRouter multimodal vision/text.
    
    Args:
        doc: The IngestedDocument to classify.
        llm_service: Optional custom OpenRouterService instance.
        
    Returns:
        ClassificationResult with predicted doc_type, confidence score, and explanation.
    """
    # 1. First priority: High-speed local fine-tuned classifier (<1ms, 100% free offline)
    local_clf = _get_local_classifier()
    if local_clf is not None and doc.full_text and len(doc.full_text.strip()) > 30:
        try:
            text_input = f"{doc.filename} {doc.full_text[:3500]}"
            probs = local_clf.predict_proba([text_input])[0]
            classes = local_clf.classes_
            best_idx = int(np.argmax(probs))
            predicted_type = str(classes[best_idx])
            prob = float(probs[best_idx])

            if predicted_type in SUPPORTED_DOC_TYPES and prob >= 0.70:
                return ClassificationResult(
                    doc_type=predicted_type,
                    confidence=round(prob, 3),
                    explanation=f"Classified as {predicted_type} via fine-tuned model ({prob*100:.1f}% confidence).",
                    source="local_fine_tuned_classifier"
                )
        except Exception as e:
            # Fall back to heuristic / API classification
            pass

    service = llm_service or default_openrouter_service
    
    if not service.is_configured:
        # Heuristic fallback if API key is not configured
        return _heuristic_classify(doc)

    images = []
    if doc.is_scanned:
        # Collect page images for vision call
        images = [p.image for p in doc.pages if p.image is not None][:3]
        source_mode = "openrouter_vision"
        prompt = CLASSIFICATION_PROMPT + f"\nDocument filename: {doc.filename}\n"
    else:
        source_mode = "openrouter_text"
        snippet = doc.full_text[:3000]
        prompt = CLASSIFICATION_PROMPT + f"\nDocument filename: {doc.filename}\nDocument Content Snippet:\n{snippet}"

    try:
        data = service.generate_structured(prompt=prompt, images=images if images else None)
        
        doc_type = str(data.get("doc_type", "other")).lower().strip()
        if doc_type not in SUPPORTED_DOC_TYPES:
            doc_type = "other"
            
        confidence = float(data.get("confidence", 0.5))
        confidence = max(0.0, min(1.0, confidence))
        explanation = str(data.get("explanation", "Classified via multimodal understanding."))
        
        return ClassificationResult(
            doc_type=doc_type,
            confidence=confidence,
            explanation=explanation,
            source=source_mode
        )
    except Exception as e:
        # Graceful fallback to heuristic classification if API is rate limited (429) or offline
        fallback = _heuristic_classify(doc)
        fallback.explanation = f"{fallback.explanation} [Auto-fallback: {str(e)[:75]}...]"
        return fallback


def _heuristic_classify(doc: IngestedDocument) -> ClassificationResult:
    """Rule-based heuristic fallback when no API key is provided."""
    text_lower = (doc.filename + " " + doc.full_text).lower()
    
    if any(k in text_lower for k in ["purchase order", "po#", "po-", "requisition", "deliver to", "order date"]):
        return ClassificationResult("purchase_order", 0.95, "Identified purchase order procurement indicators.", "heuristic_fallback")
    elif any(k in text_lower for k in ["w-9", "1099", "taxpayer identification", "tax classification", "employer identification", "tin", "ein", "form w9"]):
        return ClassificationResult("tax_form", 0.96, "Identified IRS tax certification form keywords (W-9 / 1099 / TIN / EIN).", "heuristic_fallback")
    elif any(k in text_lower for k in ["compliance", "audit", "soc 2", "gdpr", "iso", "remediation", "non-compliant"]):
        return ClassificationResult("compliance_doc", 0.95, "Identified regulatory audit and compliance indicators.", "heuristic_fallback")
    elif any(k in text_lower for k in ["invoice", "inv-", "subtotal", "amount due", "billed to", "unit price"]):
        return ClassificationResult("invoice", 0.95, "Identified invoice keywords in document header/text.", "heuristic_fallback")
    elif any(k in text_lower for k in ["agreement", "contract", "nda", "confidentiality", "parties", "hereby agree", "services agreement"]):
        return ClassificationResult("contract", 0.95, "Identified legal agreement/contract terms.", "heuristic_fallback")
        
    return ClassificationResult("other", 0.50, "Document does not match standard invoice/contract/compliance/po/tax patterns.", "heuristic_fallback")
