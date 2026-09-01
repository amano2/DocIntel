"""Test OpenRouter API connectivity with user's model."""
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from src.openrouter_service import OpenRouterService
from src.classify import classify_document
from src.ingest import ingest_document

def test_live_call():
    print("Testing live OpenRouter call...")
    service = OpenRouterService()
    print(f"Using Model: {service.model_name}")
    print(f"Is Configured: {service.is_configured}")
    
    try:
        res = service.generate_text("Say 'DocIntellect is ready!' in 5 words.")
        print(f"Direct response:\n{res}\n")
    except Exception as e:
        print(f"Error in direct generation: {e}")

    try:
        # Test structured extraction on a sample document
        sample_pdf = Path("data/sample_docs/invoice_01_standard_techcorp.pdf")
        doc = ingest_document(sample_pdf)
        classification = classify_document(doc, llm_service=service)
        print(f"Classification Result for {sample_pdf.name}:")
        print(f"  Type: {classification.doc_type}")
        print(f"  Confidence: {classification.confidence}")
        print(f"  Explanation: {classification.explanation}")
    except Exception as e:
        print(f"Error in document classification: {e}")

if __name__ == "__main__":
    test_live_call()
