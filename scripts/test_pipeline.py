import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src.pipeline import process_document
from src.database import default_db
from src.rag_qa import answer_document_query

def main():
    sample_dir = Path("data/sample_docs")
    docs = sorted(list(sample_dir.glob("*.pdf")))
    print(f"Running end-to-end pipeline on {len(docs)} sample documents...\n")
    
    for doc_path in docs:
        print(f"--> Processing: {doc_path.name}")
        res = process_document(doc_path)
        print(f"    Type: {res['doc_type']} | Scanned: {res['is_scanned']} | Confidence: {res['overall_confidence']:.2f}")
        print(f"    Anomalies caught: {len(res['anomalies'])}")
        for a in res['anomalies']:
            print(f"      * [{a['severity'].upper()}] ({a['field']}): {a['message']}")
        print()

    print("--> Testing RAG Q&A:")
    query = "What is the total amount due for TechCorp Solutions?"
    answer_res = answer_document_query(query)
    print(f"Query: {query}")
    print(f"Answer: {answer_res.answer}")
    print(f"Citations: {[s.filename for s in answer_res.sources]}")
    print("\nEnd-to-end pipeline test passed!")

if __name__ == "__main__":
    main()
