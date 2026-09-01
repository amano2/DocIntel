"""Test scanned document processing with OpenRouter."""
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from src.openrouter_service import OpenRouterService
from src.classify import classify_document
from src.extract import extract_structured_data
from src.ingest import ingest_document

def test_scanned_doc():
    service = OpenRouterService()
    scanned_pdf = Path("data/sample_docs/invoice_03_scanned_vertex_hardware.pdf")
    doc = ingest_document(scanned_pdf)
    print(f"Ingested {scanned_pdf.name}: is_scanned={doc.is_scanned}, total_pages={doc.total_pages}")
    
    classification = classify_document(doc, llm_service=service)
    print(f"Classification: type={classification.doc_type}, conf={classification.confidence}, source={classification.source}")
    
    extraction = extract_structured_data(doc, doc_type=classification.doc_type, llm_service=service)
    print(f"Extraction Status: {extraction.status}, overall_conf={extraction.overall_confidence}")
    for k, v in list(extraction.fields.items())[:5]:
        print(f"  - {k}: {v}")

if __name__ == "__main__":
    test_scanned_doc()
