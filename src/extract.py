"""
Structured field extraction module.
Uses type-specific prompts to extract fields with {value, confidence, source} triples.
Supports multi-page vision input for scanned documents.
"""

from typing import Dict, Any, List
from src.openrouter_service import OpenRouterService
from src.config import (
    DOC_TYPE_INVOICE, DOC_TYPE_CONTRACT, DOC_TYPE_COMPLIANCE,
    DOC_TYPE_PO, DOC_TYPE_TAX_FORM, MAX_VISION_PAGES
)
from src.logger import get_logger

log = get_logger("extract")


class ExtractionError(Exception):
    pass


def get_prompt_for_type(doc_type: str) -> str:
    """Returns the extraction prompt for a given document type."""
    base_prompt = """
    Extract the following structured fields from the document.
    For each field, you MUST return a JSON object with three keys:
    - 'value': The extracted value (string, number, or array, as appropriate)
    - 'confidence': A float between 0.0 and 1.0 indicating how confident you are.
    - 'source': A short string describing where in the document you found this (e.g. "page 1, top right", "paragraph 3").
    
    If a field is not found, return null for the value, 0.0 for confidence, and "not found" for source.
    """

    if doc_type == DOC_TYPE_INVOICE:
        return base_prompt + """
        Extract these fields:
        - vendor_name
        - invoice_number
        - date
        - due_date
        - subtotal
        - tax
        - total
        - line_items (an array of objects containing description, quantity, unit_price, amount)
        - payment_terms
        - currency
        """
    elif doc_type == DOC_TYPE_CONTRACT:
        return base_prompt + """
        Extract these fields:
        - parties (array of strings)
        - effective_date
        - expiry_date
        - term_or_renewal
        - key_obligations (array of strings)
        - governing_law
        - signature_status (signed or unsigned)
        - signature_date
        """
    elif doc_type == DOC_TYPE_COMPLIANCE:
        return base_prompt + """
        Extract these fields:
        - document_title
        - issuing_authority
        - relevant_clause_references (array of strings)
        - required_actions (array of strings)
        - deadlines (array of strings)
        - compliance_status
        """
    elif doc_type == DOC_TYPE_PO:
        return base_prompt + """
        Extract these fields:
        - po_number
        - vendor_name
        - order_date
        - delivery_date
        - total_amount
        - line_items (an array of objects containing description, quantity, unit_price, amount)
        - shipping_address
        """
    elif doc_type == DOC_TYPE_TAX_FORM:
        return base_prompt + """
        Extract these fields:
        - form_type (e.g., W-9, W-2, 1099)
        - taxpayer_name
        - tax_id_or_ssn
        - tax_year
        - filing_status
        """
    else:
        return base_prompt + """
        Extract any key entities or summary points you find.
        - key_entities (array of strings)
        - summary
        - dates_mentioned (array of strings)
        - amounts_mentioned (array of strings)
        """


async def extract_structured_data(
    llm_service: OpenRouterService,
    doc_type: str,
    text: str,
    images_b64: List[str],
    is_scanned: bool,
) -> Dict[str, Any]:
    """
    Extract structured fields from a document.
    For scanned docs, sends up to MAX_VISION_PAGES page images to the vision model.
    For text-layer docs, sends the raw text.
    """
    prompt = get_prompt_for_type(doc_type)

    if not is_scanned and text:
        prompt += f"\n\nDocument text:\n{text[:8000]}"

    try:
        if is_scanned and images_b64:
            # Send multiple pages (up to budget) for scanned docs
            pages_to_send = images_b64[:MAX_VISION_PAGES]
            log.info(
                f"Sending {len(pages_to_send)}/{len(images_b64)} pages to vision model",
                extra={"data": {"total_pages": len(images_b64), "sent_pages": len(pages_to_send)}},
            )

            result = await llm_service.generate_json_multipage(
                prompt=prompt,
                images_base64=pages_to_send,
            )
        else:
            result = await llm_service.generate_json(
                prompt=prompt,
                image_base64=None,
                is_vision=False,
            )

        field_count = sum(1 for v in result.values() if isinstance(v, dict))
        log.info(f"Extraction returned {field_count} fields for doc_type={doc_type}")
        return result

    except Exception as e:
        log.error(f"Extraction failed: {e}", exc_info=True)
        raise ExtractionError(f"Failed to extract structured data: {str(e)}")
