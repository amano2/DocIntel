import asyncio
from typing import Dict, Any, Callable
from src.openrouter_service import OpenRouterService
from src.ingest import ingest_document
from src.classify import classify_document
from src.extract import extract_structured_data
from src.anomaly import detect_anomalies
from src.index import FaissIndexer
from src.database import get_db_client

class PipelineManager:
    def __init__(self, indexer: FaissIndexer, llm_service: OpenRouterService):
        self.indexer = indexer
        self.llm_service = llm_service
        # In a real app we'd use Redis or DB to store progress. For MVP, we'll store in a dict.
        self.progress_store: Dict[str, Dict[str, Any]] = {}
        
    def _update_progress(self, doc_id: str, stage: str, percent: int):
        if doc_id not in self.progress_store:
            self.progress_store[doc_id] = {}
        self.progress_store[doc_id]["stage"] = stage
        self.progress_store[doc_id]["percent"] = percent

    def get_progress(self, doc_id: str) -> Dict[str, Any]:
        return self.progress_store.get(doc_id, {"stage": "UNKNOWN", "percent": 0})

    async def process_document(self, user_id: str, doc_id: str, filename: str, file_bytes: bytes, jwt_token: str):
        try:
            self._update_progress(doc_id, "INGESTING", 15)
            # Ingest
            ingest_res = ingest_document(file_bytes, filename)
            text = ingest_res['text']
            images = ingest_res['images']
            is_scanned = ingest_res['is_scanned']
            total_pages = ingest_res['total_pages']
            
            # Update DB with initial ingested state
            db = get_db_client(jwt_token)
            db.table("documents").update({
                "is_scanned": is_scanned,
                "total_pages": total_pages,
                "extracted_text": text
            }).eq("doc_id", doc_id).execute()

            self._update_progress(doc_id, "CLASSIFYING", 35)
            # Classify
            doc_type = await classify_document(self.llm_service, text, images, is_scanned)
            db.table("documents").update({"doc_type": doc_type}).eq("doc_id", doc_id).execute()

            self._update_progress(doc_id, "EXTRACTING", 60)
            # Extract
            extracted_data = await extract_structured_data(self.llm_service, doc_type, text, images, is_scanned)
            
            # Save extracted fields to DB
            for field_name, field_info in extracted_data.items():
                if isinstance(field_info, dict):
                    val = field_info.get("value")
                    # If it's a list/dict, store as JSON string or handle appropriately. For MVP, cast to str if not string/number
                    if isinstance(val, (list, dict)):
                        import json
                        val = json.dumps(val)
                    else:
                        val = str(val) if val is not None else None
                        
                    db.table("extracted_fields").insert({
                        "doc_id": doc_id,
                        "user_id": user_id,
                        "field_name": field_name,
                        "field_value": val,
                        "confidence": field_info.get("confidence", 0.0),
                        "source": field_info.get("source", "unknown")
                    }).execute()

            self._update_progress(doc_id, "ANOMALY_DETECTION", 80)
            # Anomaly Detection
            anomalies = await detect_anomalies(self.llm_service, doc_type, extracted_data)
            
            # Save anomalies to DB
            for anomaly in anomalies:
                db.table("anomalies").insert({
                    "doc_id": doc_id,
                    "user_id": user_id,
                    "rule_name": anomaly.get("rule_name", "Unknown Rule"),
                    "description": anomaly.get("description", "Unknown Description"),
                    "severity": anomaly.get("severity", "medium")
                }).execute()

            self._update_progress(doc_id, "INDEXING", 92)
            # Indexing
            if text:
                # Run this in a thread or block since FAISS is CPU-bound
                self.indexer.add_document(doc_id, user_id, text)

            self._update_progress(doc_id, "COMPLETED", 100)
            db.table("documents").update({"status": "completed"}).eq("doc_id", doc_id).execute()

        except Exception as e:
            self._update_progress(doc_id, "FAILED", 100)
            print(f"Pipeline failed for {doc_id}: {str(e)}")
            try:
                db = get_db_client(jwt_token)
                db.table("documents").update({"status": "failed"}).eq("doc_id", doc_id).execute()
            except:
                pass
