"""
Pipeline orchestrator for the DocIntel document processing flow.
Coordinates: Ingestion → Classification → Extraction → Anomaly Detection → Indexing.

Supports SSE (Server-Sent Events) for real-time progress streaming to the frontend,
structured logging with per-document trace IDs, and cross-document anomaly checks.
"""

import asyncio
import json
from typing import Dict, Any, List, Optional
from src.openrouter_service import OpenRouterService
from src.ingest import ingest_document
from src.classify import classify_document
from src.extract import extract_structured_data
from src.anomaly import detect_anomalies
from src.index import FaissIndexer
from src.database import get_db_client
from src.logger import get_logger, set_trace_id, PipelineTimer

log = get_logger("pipeline")


# ── Pipeline Stage Definitions ───────────────────────────────────────────────
STAGES = [
    {"name": "INGESTING",         "percent": 10,  "label": "Extracting text & rasterizing pages"},
    {"name": "CLASSIFYING",       "percent": 25,  "label": "Identifying document type"},
    {"name": "EXTRACTING",        "percent": 50,  "label": "Extracting structured fields"},
    {"name": "ANOMALY_DETECTION", "percent": 75,  "label": "Running anomaly checks"},
    {"name": "INDEXING",          "percent": 90,  "label": "Building search index"},
    {"name": "COMPLETED",         "percent": 100, "label": "Processing complete"},
]


class PipelineManager:
    def __init__(self, indexer: FaissIndexer, llm_service: OpenRouterService):
        self.indexer = indexer
        self.llm_service = llm_service
        self.progress_store: Dict[str, Dict[str, Any]] = {}
        # SSE subscriber queues: doc_id -> list of asyncio.Queue
        self._sse_subscribers: Dict[str, List[asyncio.Queue]] = {}

    # ── Progress Management ──────────────────────────────────────────────────

    def _update_progress(self, doc_id: str, stage: str, percent: int, label: str = ""):
        progress = {
            "stage": stage,
            "percent": percent,
            "label": label,
        }
        self.progress_store[doc_id] = progress
        # Push to all SSE subscribers for this doc
        self._broadcast_sse(doc_id, progress)

    def _broadcast_sse(self, doc_id: str, data: Dict[str, Any]):
        """Push progress event to all connected SSE clients for this doc_id."""
        queues = self._sse_subscribers.get(doc_id, [])
        dead_queues = []
        for q in queues:
            try:
                q.put_nowait(data)
            except asyncio.QueueFull:
                dead_queues.append(q)
        # Clean up dead queues
        for dq in dead_queues:
            queues.remove(dq)

    def subscribe_sse(self, doc_id: str) -> asyncio.Queue:
        """Register a new SSE subscriber for pipeline progress on a document."""
        q: asyncio.Queue = asyncio.Queue(maxsize=50)
        if doc_id not in self._sse_subscribers:
            self._sse_subscribers[doc_id] = []
        self._sse_subscribers[doc_id].append(q)
        # Send current progress immediately if available
        if doc_id in self.progress_store:
            q.put_nowait(self.progress_store[doc_id])
        return q

    def unsubscribe_sse(self, doc_id: str, q: asyncio.Queue):
        """Remove an SSE subscriber."""
        if doc_id in self._sse_subscribers:
            try:
                self._sse_subscribers[doc_id].remove(q)
            except ValueError:
                pass
            if not self._sse_subscribers[doc_id]:
                del self._sse_subscribers[doc_id]

    def get_progress(self, doc_id: str) -> Dict[str, Any]:
        return self.progress_store.get(doc_id, {"stage": "UNKNOWN", "percent": 0, "label": ""})

    # ── Duplicate Invoice Detection ──────────────────────────────────────────

    def _check_duplicate_invoice(
        self, db, doc_id: str, user_id: str, extracted_data: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Cross-corpus check: does another document from this user have the
        same invoice_number + vendor_name combination?
        """
        anomalies: List[Dict[str, str]] = []

        inv_number_raw = extracted_data.get("invoice_number", {})
        vendor_raw = extracted_data.get("vendor_name", {})

        inv_number = inv_number_raw.get("value") if isinstance(inv_number_raw, dict) else None
        vendor = vendor_raw.get("value") if isinstance(vendor_raw, dict) else None

        if not inv_number:
            return anomalies

        try:
            # Query extracted_fields for any OTHER document with the same invoice_number
            result = (
                db.table("extracted_fields")
                .select("doc_id, field_value")
                .eq("field_name", "invoice_number")
                .eq("field_value", str(inv_number))
                .neq("doc_id", doc_id)
                .execute()
            )

            if result.data:
                dup_doc_ids = [r["doc_id"] for r in result.data]
                anomalies.append({
                    "rule_name": "Duplicate Invoice Number",
                    "description": (
                        f"Invoice #{inv_number} from '{vendor or 'unknown vendor'}' "
                        f"already exists in {len(dup_doc_ids)} other document(s): "
                        f"{', '.join(d[:8] for d in dup_doc_ids)}. "
                        f"Potential duplicate payment risk."
                    ),
                    "severity": "high",
                })
                log.warning(
                    f"Duplicate invoice detected: {inv_number}",
                    extra={"data": {"doc_id": doc_id, "duplicates": dup_doc_ids}},
                )
        except Exception as e:
            log.error(f"Duplicate check query failed: {e}")

        return anomalies

    # ── Main Pipeline ────────────────────────────────────────────────────────

    async def process_document(
        self,
        user_id: str,
        doc_id: str,
        filename: str,
        file_bytes: bytes,
        jwt_token: str,
    ):
        trace_id = set_trace_id(doc_id[:12])
        log.info(
            f"Pipeline started for {filename}",
            extra={"data": {"doc_id": doc_id, "filename": filename, "user_id": user_id[:8]}},
        )

        try:
            # ── Stage 1: Ingestion ───────────────────────────────────────────
            self._update_progress(doc_id, "INGESTING", 10, "Extracting text & rasterizing pages")

            with PipelineTimer(log, "INGESTION", doc_id):
                ingest_res = ingest_document(file_bytes, filename)

            text = ingest_res["text"]
            images = ingest_res["images"]
            is_scanned = ingest_res["is_scanned"]
            total_pages = ingest_res["total_pages"]

            db = get_db_client(jwt_token)
            db.table("documents").update({
                "is_scanned": is_scanned,
                "total_pages": total_pages,
                "extracted_text": text,
            }).eq("doc_id", doc_id).execute()

            log.info(
                f"Ingestion complete: {total_pages} pages, scanned={is_scanned}",
                extra={"data": {"doc_id": doc_id, "total_pages": total_pages, "is_scanned": is_scanned}},
            )

            # ── Stage 2: Classification ──────────────────────────────────────
            self._update_progress(doc_id, "CLASSIFYING", 25, "Identifying document type")

            with PipelineTimer(log, "CLASSIFICATION", doc_id):
                doc_type = await classify_document(self.llm_service, text, images, is_scanned)

            db.table("documents").update({"doc_type": doc_type}).eq("doc_id", doc_id).execute()
            log.info(f"Classified as: {doc_type}", extra={"data": {"doc_id": doc_id, "doc_type": doc_type}})

            # ── Stage 3: Structured Extraction ───────────────────────────────
            self._update_progress(doc_id, "EXTRACTING", 50, "Extracting structured fields")

            with PipelineTimer(log, "EXTRACTION", doc_id):
                extracted_data = await extract_structured_data(
                    self.llm_service, doc_type, text, images, is_scanned
                )

            # Persist extracted fields
            field_count = 0
            for field_name, field_info in extracted_data.items():
                if isinstance(field_info, dict):
                    val = field_info.get("value")
                    if isinstance(val, (list, dict)):
                        val = json.dumps(val)
                    else:
                        val = str(val) if val is not None else None

                    db.table("extracted_fields").insert({
                        "doc_id": doc_id,
                        "user_id": user_id,
                        "field_name": field_name,
                        "field_value": val,
                        "confidence": field_info.get("confidence", 0.0),
                        "source": field_info.get("source", "unknown"),
                    }).execute()
                    field_count += 1

            log.info(f"Extracted {field_count} fields", extra={"data": {"doc_id": doc_id, "field_count": field_count}})

            # ── Stage 4: Anomaly Detection ───────────────────────────────────
            self._update_progress(doc_id, "ANOMALY_DETECTION", 75, "Running anomaly checks")

            with PipelineTimer(log, "ANOMALY_DETECTION", doc_id):
                # Standard rule-based + LLM anomalies
                anomalies = await detect_anomalies(self.llm_service, doc_type, extracted_data)

                # Cross-corpus duplicate invoice check
                if doc_type == "invoice":
                    dup_anomalies = self._check_duplicate_invoice(db, doc_id, user_id, extracted_data)
                    anomalies.extend(dup_anomalies)

            # Persist anomalies
            for anomaly in anomalies:
                db.table("anomalies").insert({
                    "doc_id": doc_id,
                    "user_id": user_id,
                    "rule_name": anomaly.get("rule_name", "Unknown Rule"),
                    "description": anomaly.get("description", "Unknown Description"),
                    "severity": anomaly.get("severity", "medium"),
                }).execute()

            log.info(
                f"Anomaly detection complete: {len(anomalies)} flags",
                extra={"data": {"doc_id": doc_id, "anomaly_count": len(anomalies)}},
            )

            # ── Stage 5: Indexing ────────────────────────────────────────────
            self._update_progress(doc_id, "INDEXING", 90, "Building search index")

            with PipelineTimer(log, "INDEXING", doc_id):
                if text:
                    self.indexer.add_document(doc_id, user_id, text)

            # ── Done ─────────────────────────────────────────────────────────
            self._update_progress(doc_id, "COMPLETED", 100, "Processing complete")
            db.table("documents").update({"status": "completed"}).eq("doc_id", doc_id).execute()
            log.info(f"Pipeline completed successfully", extra={"data": {"doc_id": doc_id}})

        except Exception as e:
            self._update_progress(doc_id, "FAILED", 100, f"Pipeline error: {str(e)[:100]}")
            log.error(
                f"Pipeline FAILED for {doc_id}: {str(e)}",
                extra={"data": {"doc_id": doc_id, "error": str(e)}},
                exc_info=True,
            )
            try:
                db = get_db_client(jwt_token)
                db.table("documents").update({"status": "failed"}).eq("doc_id", doc_id).execute()
            except Exception as db_err:
                log.error(f"Failed to update document status after pipeline failure: {db_err}")
