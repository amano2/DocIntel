import io
import fitz  # PyMuPDF
import base64
from typing import List, Dict, Any, Tuple
from src.config import MIN_CHAR_COUNT_FOR_TEXT_LAYER

class IngestionError(Exception):
    pass

def ingest_document(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Ingests a document (PDF or Image).
    Returns a dictionary with:
      - 'text': Extracted text (if native text layer exists and is large enough)
      - 'images': List of base64 encoded strings of pages (if scanned/image-based)
      - 'is_scanned': Boolean indicating if vision fallback is needed
      - 'total_pages': Number of pages
    """
    ext = filename.split('.')[-1].lower()
    
    if ext in ['png', 'jpg', 'jpeg']:
        # Direct image upload
        b64_image = base64.b64encode(file_bytes).decode('utf-8')
        return {
            'text': "",
            'images': [b64_image],
            'is_scanned': True,
            'total_pages': 1
        }
        
    if ext == 'pdf':
        try:
            doc = fitz.open("pdf", file_bytes)
            total_pages = len(doc)
            
            full_text = ""
            for page_num in range(total_pages):
                page = doc.load_page(page_num)
                full_text += page.get_text() + "\n\n"
                
            full_text = full_text.strip()
            
            # If we found enough text, return it as a native text PDF
            if len(full_text) > MIN_CHAR_COUNT_FOR_TEXT_LAYER:
                return {
                    'text': full_text,
                    'images': [],
                    'is_scanned': False,
                    'total_pages': total_pages
                }
                
            # Otherwise, it's likely a scanned PDF. Rasterize pages.
            images_b64 = []
            for page_num in range(total_pages):
                page = doc.load_page(page_num)
                # Render page to an image (200 DPI approx)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_bytes = pix.tobytes("jpeg")
                images_b64.append(base64.b64encode(img_bytes).decode('utf-8'))
                
            return {
                'text': full_text, # Might be empty or garbage OCR
                'images': images_b64,
                'is_scanned': True,
                'total_pages': total_pages
            }
            
        except Exception as e:
            raise IngestionError(f"Failed to process PDF: {str(e)}")
            
    raise IngestionError(f"Unsupported file type: {ext}")
