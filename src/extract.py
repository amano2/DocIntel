from typing import Dict, Any, List
from src.openrouter_service import OpenRouterService
from src.config import (
    DOC_TYPE_INVOICE, DOC_TYPE_CONTRACT, DOC_TYPE_COMPLIANCE, 
    DOC_TYPE_PO, DOC_TYPE_TAX_FORM
)

class ExtractionError(Exception):
    pass

def get_prompt_for_type(doc_type: str) -> str:
    base_prompt = """
    Extract the following structured fields from the document.
    For each field, you MUST return a JSON object with three keys:
    - 'value': The extracted value (string, number, or array, as appropriate)
    - 'confidence': A float between 0.0 and 1.0 indicating how confident you are.
    - 'source': A short string describing where in the document you found this (e.g. "top right", "paragraph 3").
    
    If a field is not found, return null for the value, 0.0 for confidence, and "not found" for source.
    """
    
    if doc_type == DOC_TYPE_INVOICE:
        return base_prompt + """
        Extract these fields:
        - vendor_name
        - invoice_number
        - date
        - subtotal
        - tax
        - total
        - line_items (an array of objects containing description, quantity, price)
        """
    elif doc_type == DOC_TYPE_CONTRACT:
        return base_prompt + """
        Extract these fields:
        - parties (array of strings)
        - effective_date
        - term_or_renewal
        - key_obligations (array of strings)
        - signature_status (signed or unsigned)
        """
    elif doc_type == DOC_TYPE_COMPLIANCE:
        return base_prompt + """
        Extract these fields:
        - relevant_clause_references (array of strings)
        - required_actions (array of strings)
        - deadlines (array of strings)
        """
    elif doc_type == DOC_TYPE_PO:
        return base_prompt + """
        Extract these fields:
        - po_number
        - vendor_name
        - order_date
        - total_amount
        """
    elif doc_type == DOC_TYPE_TAX_FORM:
        return base_prompt + """
        Extract these fields:
        - form_type (e.g., W-9, W-2, 1099)
        - taxpayer_name
        - tax_id_or_ssn
        """
    else:
        return base_prompt + """
        Extract any key entities or summary points you find.
        - key_entities (array of strings)
        - summary
        """

async def extract_structured_data(llm_service: OpenRouterService, doc_type: str, text: str, images_b64: List[str], is_scanned: bool) -> Dict[str, Any]:
    prompt = get_prompt_for_type(doc_type)
    
    if not is_scanned and text:
        prompt += f"\n\nDocument text:\n{text[:8000]}"
        
    try:
        # For simplicity, if it's a multi-page scanned doc, we should ideally pass all images.
        # But to avoid context limits or token blowups on free tiers, we might limit it.
        # OpenRouter supports multiple image_url blocks, but let's pass just the first for MVP or modify service later to accept list.
        # Assuming our openrouter_service only takes one image for now.
        image = images_b64[0] if is_scanned and images_b64 else None
        
        result = await llm_service.generate_json(
            prompt=prompt,
            image_base64=image,
            is_vision=is_scanned
        )
        return result
    except Exception as e:
        raise ExtractionError(f"Failed to extract structured data: {str(e)}")
