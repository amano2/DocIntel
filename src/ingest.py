"""
Multimodal Document Ingestion Module.

Handles both native text-layer PDFs and scanned/image-based PDFs:
1. Extracts text layer via pypdf / PyMuPDF.
2. Checks text density per page: if empty/sparse (< 50 chars), rasterizes page to an image.
3. Packages pages with text and/or images for subsequent classification & vision-assisted extraction.
"""

import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Union
from PIL import Image
import pypdf
import pymupdf

from src.config import MIN_CHAR_COUNT_FOR_TEXT_LAYER


@dataclass
class IngestedPage:
    """Represents a single page in an ingested document."""
    page_number: int
    text: str
    is_scanned: bool
    image: Optional[Image.Image] = None


@dataclass
class IngestedDocument:
    """Represents a fully ingested document ready for classification & extraction."""
    doc_id: str
    filename: str
    file_path: str
    total_pages: int
    is_scanned: bool
    full_text: str
    pages: List[IngestedPage] = field(default_factory=list)


def ingest_document(file_path: Union[str, Path], doc_id: Optional[str] = None) -> IngestedDocument:
    """
    Ingests a document (PDF or image).
    Extracts text layer if present; rasterizes pages with low/no text to high-res images for vision extraction.
    
    Args:
        file_path: Path to the PDF or image file.
        doc_id: Optional unique identifier; if None, generates a UUID.
        
    Returns:
        IngestedDocument containing text, page metadata, and images where applicable.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Document file not found at: {path}")
    
    doc_id = doc_id or str(uuid.uuid4())
    suffix = path.suffix.lower()
    
    # Handle direct image uploads (.png, .jpg, .jpeg, .tiff, .webp)
    if suffix in [".png", ".jpg", ".jpeg", ".tiff", ".webp", ".bmp"]:
        img = Image.open(path).convert("RGB")
        page = IngestedPage(
            page_number=1,
            text="",
            is_scanned=True,
            image=img
        )
        return IngestedDocument(
            doc_id=doc_id,
            filename=path.name,
            file_path=str(path),
            total_pages=1,
            is_scanned=True,
            full_text="",
            pages=[page]
        )
    
    # Handle PDF files
    if suffix == ".pdf":
        return _ingest_pdf(path, doc_id)
        
    raise ValueError(f"Unsupported file format: {suffix}. Supported formats: PDF, PNG, JPG, JPEG, WEBP.")


def _ingest_pdf(pdf_path: Path, doc_id: str) -> IngestedDocument:
    """Processes a PDF file, determining text vs vision requirements per page."""
    pdf_doc = pymupdf.open(str(pdf_path))
    total_pages = len(pdf_doc)
    pages: List[IngestedPage] = []
    has_any_scanned_page = False
    full_text_list = []
    
    for page_idx in range(total_pages):
        page_num = page_idx + 1
        mu_page = pdf_doc[page_idx]
        extracted_text = mu_page.get_text("text").strip()
        
        # Check text length against threshold
        char_count = len(extracted_text)
        is_scanned_page = char_count < MIN_CHAR_COUNT_FOR_TEXT_LAYER
        
        page_image: Optional[Image.Image] = None
        if is_scanned_page:
            has_any_scanned_page = True
            # Rasterize page to image at 200 DPI for high-accuracy multimodal vision extraction
            pix = mu_page.get_pixmap(dpi=200)
            page_image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
        pages.append(IngestedPage(
            page_number=page_num,
            text=extracted_text,
            is_scanned=is_scanned_page,
            image=page_image
        ))
        
        if extracted_text:
            full_text_list.append(f"--- Page {page_num} ---\n{extracted_text}")
            
    pdf_doc.close()
    
    return IngestedDocument(
        doc_id=doc_id,
        filename=pdf_path.name,
        file_path=str(pdf_path),
        total_pages=total_pages,
        is_scanned=has_any_scanned_page,
        full_text="\n\n".join(full_text_list),
        pages=pages
    )
