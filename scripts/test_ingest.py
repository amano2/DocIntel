"""Test ingestion module."""
from pathlib import Path
from src.ingest import ingest_document

def test_ingestion():
    sample_dir = Path("data/sample_docs")
    docs = sorted(list(sample_dir.glob("*.pdf")))
    print(f"Testing {len(docs)} documents:")
    for doc_path in docs:
        ingested = ingest_document(doc_path)
        print(f"  - {doc_path.name}: is_scanned={ingested.is_scanned}, pages={ingested.total_pages}, text_len={len(ingested.full_text)}")
    print("Ingestion test passed!")

if __name__ == "__main__":
    test_ingestion()
