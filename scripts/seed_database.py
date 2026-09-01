"""
Seeds the runtime database (db/documents.db) and FAISS vector index
with all benchmark synthetic sample documents.
"""

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from src.pipeline import process_document
from src.config import SAMPLE_DOCS_DIR


def seed():
    print("==================================================")
    print("SEEDING RUNTIME DATABASE & FAISS VECTOR INDEX")
    print("==================================================")
    
    docs = sorted(list(SAMPLE_DOCS_DIR.glob("*.pdf")))
    print(f"Found {len(docs)} sample documents in {SAMPLE_DOCS_DIR}...")
    
    for doc_path in docs:
        res = process_document(doc_path)
        doc_type = res.get("doc_type", "unknown")
        conf = res.get("overall_confidence", 0.0)
        anom_count = len(res.get("anomalies", []))
        print(f"  [+] Ingested: {doc_path.name:<40} | Type: {doc_type:<15} | Conf: {conf:.1%} | Flags: {anom_count}")
        
    print("==================================================")
    print("SUCCESS: Database and vector index are ready!")
    print("==================================================")


if __name__ == "__main__":
    seed()
