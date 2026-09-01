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
from typing import Optional
from src.ingest import IngestedDocument
from src.openrouter_service import OpenRouterService, default_openrouter_service
from src.config import SUPPORTED_DOC_TYPES


@dataclass
class ClassificationResult:
    """Structured result from document classification."""
    doc_type: str
    confidence: float
    explanation: str
    source: str  # 'openrouter_text' or 'openrouter_vision'


CLASSIFICATION_PROMPT = """
You are a senior document intelligence AI for enterprise document processing.
Analyze the provided document (text and/or image) and classify it into EXACTLY ONE of the following categories:

1. 'invoice': Invoices, billing statements, purchase orders, receipts with payment totals and line items.
2. 'contract': Legal contracts, Non-Disclosure Agreements (NDA), Master Services Agreements (MSA), vendor terms, signed legal agreements.
3. 'compliance_doc': Regulatory audit reports, SOC 2 / GDPR / ISO assessments, compliance checklist documents.
4. 'other': Any document that does not clearly fit the above 3 categories.

Return a valid JSON object with the following structure:
{
    "doc_type": "invoice" | "contract" | "compliance_doc" | "other",
    "confidence": float (between 0.0 and 1.0, e.g. 0.95),
    "explanation": "Brief 1-2 sentence rationale explaining key cues used to classify this document"
}
"""


def classify_document(
    doc: IngestedDocument,
    llm_service: Optional[OpenRouterService] = None
) -> ClassificationResult:
    """
    Classifies an IngestedDocument using OpenRouter (Text or Multimodal Vision).
    
    Args:
        doc: The IngestedDocument to classify.
        llm_service: Optional custom OpenRouterService instance.
        
    Returns:
        ClassificationResult with predicted doc_type, confidence score, and explanation.
    """
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
    
    if any(k in text_lower for k in ["compliance", "audit", "soc 2", "gdpr", "iso", "remediation", "non-compliant"]):
        return ClassificationResult("compliance_doc", 0.95, "Identified regulatory audit and compliance indicators.", "heuristic_fallback")
    elif any(k in text_lower for k in ["invoice", "inv-", "subtotal", "amount due", "billed to", "unit price"]):
        return ClassificationResult("invoice", 0.95, "Identified invoice keywords in document header/text.", "heuristic_fallback")
    elif any(k in text_lower for k in ["agreement", "contract", "nda", "confidentiality", "parties", "hereby agree", "services agreement"]):
        return ClassificationResult("contract", 0.95, "Identified legal agreement/contract terms.", "heuristic_fallback")
        
    return ClassificationResult("other", 0.50, "Document does not match standard invoice/contract/compliance patterns.", "heuristic_fallback")
