"""
FastAPI backend for the DocIntel document intelligence agent.
Endpoints: /upload, /extract, /query, /anomalies, /audit-log, /upload/stream (SSE).
Includes request-level trace IDs and structured logging middleware.
"""

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Optional, List
import uuid
import asyncio
import json
import uvicorn
from pydantic import BaseModel
from datetime import datetime

from src.database import get_db_client
from src.openrouter_service import OpenRouterService
from src.index import FaissIndexer
from src.pipeline import PipelineManager
from src.rag_qa import RAGService
from src.logger import get_logger, set_trace_id

log = get_logger("api")

app = FastAPI(title="DocIntel API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global Services ──────────────────────────────────────────────────────────
llm_service = OpenRouterService()
indexer = FaissIndexer()
pipeline = PipelineManager(indexer, llm_service)
rag_service = RAGService(indexer, llm_service)


# ── Middleware: Request Tracing ──────────────────────────────────────────────
@app.middleware("http")
async def trace_id_middleware(request: Request, call_next):
    trace_id = set_trace_id()
    log.info(
        f"{request.method} {request.url.path}",
        extra={"data": {"method": request.method, "path": request.url.path}},
    )
    response = await call_next(request)
    response.headers["X-Trace-Id"] = trace_id
    return response


# ── Auth Dependency ──────────────────────────────────────────────────────────
async def verify_token(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = None
) -> str:
    # Support both Authorization header and ?token= query param (for EventSource)
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1]
    if token:
        return token
    raise HTTPException(status_code=401, detail="Missing or invalid token")


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "DocIntel API is running", "version": "1.1.0"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "components": {"db": "ok", "llm": "ok", "faiss": f"{indexer.index.ntotal} vectors"},
    }


# ── Upload & Pipeline ────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    token: str = Depends(verify_token),
):
    try:
        db = get_db_client(token)
        user_resp = db.auth.get_user(token)
        user_id = user_resp.user.id

        file_bytes = await file.read()
        doc_id = str(uuid.uuid4())
        filename = file.filename
        file_path = f"{user_id}/{doc_id}/{filename}"

        # Upload to Supabase Storage
        db.storage.from_("documents").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type},
        )

        # Insert initial record
        db.table("documents").insert({
            "doc_id": doc_id,
            "user_id": user_id,
            "filename": filename,
            "file_path": file_path,
            "status": "processing",
        }).execute()

        log.info(
            f"Upload accepted: {filename}",
            extra={"data": {"doc_id": doc_id, "filename": filename, "size_bytes": len(file_bytes)}},
        )

        # Start background processing
        background_tasks.add_task(
            pipeline.process_document,
            user_id=user_id,
            doc_id=doc_id,
            filename=filename,
            file_bytes=file_bytes,
            jwt_token=token,
        )

        return {"doc_id": doc_id, "status": "processing"}

    except Exception as e:
        log.error(f"Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── SSE: Real-Time Pipeline Progress ────────────────────────────────────────
@app.get("/api/upload/stream/{doc_id}")
async def stream_pipeline_progress(doc_id: str, token: str = Depends(verify_token)):
    """
    Server-Sent Events endpoint for real-time pipeline progress.
    The client connects and receives stage updates as they happen.
    """
    queue = pipeline.subscribe_sse(doc_id)

    async def event_generator():
        try:
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=120.0)
                    yield f"data: {json.dumps(data)}\n\n"
                    # Stop streaming when pipeline completes or fails
                    if data.get("stage") in ("COMPLETED", "FAILED"):
                        break
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield f": keepalive\n\n"
        finally:
            pipeline.unsubscribe_sse(doc_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/api/upload/status/{doc_id}")
def get_upload_status(doc_id: str, token: str = Depends(verify_token)):
    return pipeline.get_progress(doc_id)


# ── Documents CRUD ───────────────────────────────────────────────────────────
@app.get("/api/documents")
def list_documents(token: str = Depends(verify_token)):
    db = get_db_client(token)
    response = db.table("documents").select("*").order("upload_time", desc=True).execute()
    return {"documents": response.data}


@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str, token: str = Depends(verify_token)):
    db = get_db_client(token)
    doc_resp = db.table("documents").select("*").eq("doc_id", doc_id).execute()
    if not doc_resp.data:
        raise HTTPException(status_code=404, detail="Document not found")

    fields_resp = db.table("extracted_fields").select("*").eq("doc_id", doc_id).execute()
    anomalies_resp = db.table("anomalies").select("*").eq("doc_id", doc_id).execute()

    return {
        "document": doc_resp.data[0],
        "fields": fields_resp.data,
        "anomalies": anomalies_resp.data,
    }


# ── Field Correction with Audit Trail ────────────────────────────────────────
class CorrectFieldRequest(BaseModel):
    field_value: str


@app.post("/api/documents/{doc_id}/correct/{field_id}")
def correct_field(
    doc_id: str,
    field_id: str,
    req: CorrectFieldRequest,
    token: str = Depends(verify_token),
):
    db = get_db_client(token)
    user_resp = db.auth.get_user(token)
    user_id = user_resp.user.id

    # Fetch current value BEFORE overwriting
    current = db.table("extracted_fields").select("field_value, field_name").eq("id", field_id).execute()
    previous_value = current.data[0]["field_value"] if current.data else None
    field_name = current.data[0]["field_name"] if current.data else "unknown"

    # Write to immutable audit log
    db.table("audit_log").insert({
        "doc_id": doc_id,
        "field_id": field_id,
        "field_name": field_name,
        "user_id": user_id,
        "previous_value": previous_value,
        "corrected_value": req.field_value,
    }).execute()

    # Update the field
    db.table("extracted_fields").update({
        "field_value": req.field_value,
        "confidence": 1.0,
        "corrected": True,
        "corrected_at": datetime.utcnow().isoformat(),
    }).eq("id", field_id).execute()

    log.info(
        f"Field corrected: {field_name}",
        extra={"data": {
            "doc_id": doc_id, "field_id": field_id, "field_name": field_name,
            "previous": previous_value, "corrected": req.field_value, "user_id": user_id[:8],
        }},
    )

    return {"status": "success", "field_name": field_name}


# ── Audit Log ────────────────────────────────────────────────────────────────
@app.get("/api/audit-log")
def get_audit_log(
    doc_id: Optional[str] = None,
    token: str = Depends(verify_token),
):
    """Retrieve the immutable audit trail. Optionally filter by document."""
    db = get_db_client(token)
    query = db.table("audit_log").select("*").order("created_at", desc=True)
    if doc_id:
        query = query.eq("doc_id", doc_id)
    response = query.limit(100).execute()
    return {"audit_log": response.data}


@app.get("/api/documents/{doc_id}/audit-log")
def get_document_audit_log(doc_id: str, token: str = Depends(verify_token)):
    """Audit trail for a specific document."""
    db = get_db_client(token)
    response = (
        db.table("audit_log")
        .select("*")
        .eq("doc_id", doc_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"audit_log": response.data}


# ── RAG Query ────────────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str
    doc_ids: Optional[List[str]] = None


@app.post("/api/query")
async def run_query(req: QueryRequest, token: str = Depends(verify_token)):
    db = get_db_client(token)
    user_id = db.auth.get_user(token).user.id

    answer, cited_doc_ids = await rag_service.answer_query(
        user_id=user_id,
        query=req.query,
        doc_ids=req.doc_ids,
    )

    db.table("query_log").insert({
        "user_id": user_id,
        "question": req.query,
        "answer": answer,
        "cited_doc_ids": cited_doc_ids,
    }).execute()

    return {"answer": answer, "cited_doc_ids": cited_doc_ids}


# ── Anomalies ────────────────────────────────────────────────────────────────
@app.get("/api/anomalies")
def get_anomalies(
    severity: Optional[str] = None,
    token: str = Depends(verify_token),
):
    db = get_db_client(token)
    query = db.table("anomalies").select("*, documents(filename)").eq("status", "open")
    if severity:
        query = query.eq("severity", severity)
    response = query.execute()
    return {"anomalies": response.data}


# ── Dashboard Stats ──────────────────────────────────────────────────────────
@app.get("/api/dashboard/stats")
def get_dashboard_stats(token: str = Depends(verify_token)):
    db = get_db_client(token)
    docs = db.table("documents").select("doc_id", count="exact").execute()
    anomalies = db.table("anomalies").select("id", count="exact").execute()

    doc_count = docs.count or 0
    anomaly_count = anomalies.count or 0
    time_saved_minutes = doc_count * 13.5

    return {
        "documents_processed": doc_count,
        "anomalies_flagged": anomaly_count,
        "est_time_saved_hours": round(time_saved_minutes / 60, 1),
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
