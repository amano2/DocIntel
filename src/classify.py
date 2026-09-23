from typing import Dict, Any, List
from src.openrouter_service import OpenRouterService
from src.config import SUPPORTED_DOC_TYPES

class ClassificationError(Exception):
    pass

async def classify_document(llm_service: OpenRouterService, text: str, images_b64: List[str], is_scanned: bool) -> str:
    """
    Classifies the document into one of the SUPPORTED_DOC_TYPES.
    """
    prompt = f"""
    You are a document classification system. 
    Analyze the provided document and classify it into EXACTLY ONE of the following types:
    {', '.join(SUPPORTED_DOC_TYPES)}

    If the document is a mix or does not clearly match, choose 'other'.
    Respond strictly in JSON format like this:
    {{
      "doc_type": "<type>"
    }}
    """
    
    if not is_scanned and text:
        prompt += f"\n\nDocument text:\n{text[:4000]}" # Limit text to avoid blowing context
        
    try:
        # If it's scanned, we only send the first page to classify
        image = images_b64[0] if is_scanned and images_b64 else None
        
        result = await llm_service.generate_json(
            prompt=prompt,
            image_base64=image,
            is_vision=is_scanned
        )
        
        doc_type = result.get("doc_type", "other").lower()
        if doc_type not in SUPPORTED_DOC_TYPES:
            doc_type = "other"
            
        return doc_type
        
    except Exception as e:
        raise ClassificationError(f"Failed to classify document: {str(e)}")
