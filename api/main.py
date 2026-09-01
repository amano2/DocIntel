"""
FastAPI REST Service for Multimodal Document Intelligence Agent.

Endpoints:
- POST /upload: Uploads PDF/image and runs end-to-end multimodal pipeline.
- GET /documents: Lists all processed documents with status & anomaly count.
- GET /documents/{doc_id}: Retrieves full document extraction, confidence, and anomalies.
- POST /documents/{doc_id}/correct: Updates a field value (Human-in-the-loop audit trail).
- POST /query: RAG Q&A semantic search across the corpus with source citations.
- GET /anomalies: Lists all detected anomalies filterable by severity (high/medium/low).
- GET /dashboard/stats: Returns aggregated business metrics (review time saved, docs processed, error rate).
"""

import io
import os
import shutil
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from PIL import Image
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.config import (
    DATA_DIR,
    ESTIMATED_HOURLY_REVIEWER_RATE_USD,
    ESTIMATED_MANUAL_REVIEW_MINUTES_PER_DOC
)
from src.database import Database, default_db
from src.pipeline import process_document
from src.rag_qa import answer_document_query

UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Multimodal Document Intelligence Agent API",
    description="Enterprise API for multimodal invoice, contract, and compliance document extraction, anomaly detection, and RAG Q&A.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response Models ---

class QueryRequest(BaseModel):
    query: str = Field(..., description="Natural language question to ask over the document corpus")
    top_k: int = Field(4, description="Number of top relevant chunks to retrieve")


class FieldCorrectionRequest(BaseModel):
    field_name: str = Field(..., description="Name of the field being corrected")
    new_value: str = Field(..., description="New corrected value")


# --- Endpoints ---

@app.get("/")
def root():
    return {
        "service": "Multimodal Document Intelligence Agent API",
        "version": "1.0.0",
        "status": "operational",
        "docs_url": "/docs"
    }


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Ingests and processes an uploaded PDF or image file through the full intelligence pipeline.
    """
    file_suffix = Path(file.filename).suffix.lower()
    if file_suffix not in [".pdf", ".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {file_suffix}. Allowed: PDF, PNG, JPG, JPEG, WEBP."
        )

    doc_id = str(uuid.uuid4())
    saved_path = UPLOAD_DIR / f"{doc_id}_{file.filename}"
    
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = process_document(file_path=saved_path, doc_id=doc_id)
        return {
            "message": "Document successfully processed",
            "document": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")


@app.get("/documents")
def list_documents():
    """Returns a summary list of all processed documents."""
    docs = default_db.list_documents()
    return {"documents": docs, "total_count": len(docs)}


@app.get("/documents/{doc_id}")
def get_document_details(doc_id: str):
    """Retrieves full extraction details, confidence scores, and anomalies for a document."""
    doc = default_db.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document with ID '{doc_id}' not found.")
    return doc


@app.get("/documents/{doc_id}/preview")
def get_document_preview(doc_id: str):
    """
    Renders and streams a PNG visual preview thumbnail of the first page of a document.
    """
    doc = default_db.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    file_path = Path(doc.get("file_path", ""))
    if not file_path.exists():
        matches = list(DATA_DIR.glob(f"**/{doc.get('filename')}"))
        if matches:
            file_path = matches[0]
        else:
            raise HTTPException(status_code=404, detail="Original document file not found on disk.")
    
    suffix = file_path.suffix.lower()
    img_bytes = io.BytesIO()
    
    if suffix == ".pdf":
        import pymupdf
        pdf_doc = pymupdf.open(str(file_path))
        if len(pdf_doc) > 0:
            pix = pdf_doc[0].get_pixmap(dpi=150)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img.save(img_bytes, format="PNG")
        pdf_doc.close()
    elif suffix in [".png", ".jpg", ".jpeg", ".webp"]:
        img = Image.open(file_path).convert("RGB")
        img.thumbnail((1200, 1600))
        img.save(img_bytes, format="PNG")
    else:
        raise HTTPException(status_code=400, detail="Preview not available for this format.")
        
    img_bytes.seek(0)
    return Response(content=img_bytes.getvalue(), media_type="image/png")


@app.post("/documents/{doc_id}/correct")
def correct_document_field(doc_id: str, payload: FieldCorrectionRequest):
    """
    Updates an extracted field value by a human reviewer (Audit Trail record).
    """
    success = default_db.update_field_value(
        doc_id=doc_id,
        field_name=payload.field_name,
        new_value=payload.new_value
    )
    if not success:
        raise HTTPException(status_code=404, detail="Document or field not found.")
    return {"message": "Field successfully corrected and logged in audit trail."}


@app.post("/query")
def rag_query(payload: QueryRequest):
    """
    Executes semantic RAG Q&A across the entire document corpus with source citations.
    """
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    result = answer_document_query(query=payload.query, top_k=payload.top_k)
    return result.to_dict()


@app.get("/anomalies")
def list_anomalies(severity: Optional[str] = Query(None, description="Filter by severity: high, medium, low, or all")):
    """Lists flagged anomalies across all documents."""
    anomalies = default_db.list_all_anomalies(severity_filter=severity)
    return {"anomalies": anomalies, "total_count": len(anomalies)}


@app.get("/dashboard/stats")
def get_dashboard_metrics():
    """
    Computes ROI & executive dashboard business metrics:
    - Total documents processed
    - Scanned vs text-layer ratio
    - Total anomalies detected (high / medium / low)
    - Type breakdown (invoices, contracts, compliance) with status counts
    - Review hours saved & dollar cost saved
    - Recent documents for audit trail
    """
    docs = default_db.list_documents()
    anomalies = default_db.list_all_anomalies()
    
    total_docs = len(docs)
    scanned_docs = sum(1 for d in docs if d.get("is_scanned"))
    text_docs = total_docs - scanned_docs
    
    high_sev = sum(1 for a in anomalies if str(a.get("severity", "")).lower() == "high")
    med_sev = sum(1 for a in anomalies if str(a.get("severity", "")).lower() == "medium")
    low_sev = sum(1 for a in anomalies if str(a.get("severity", "")).lower() == "low")
    
    # Financial & Time ROI Calculations
    total_hours_saved = (total_docs * ESTIMATED_MANUAL_REVIEW_MINUTES_PER_DOC) / 60.0
    total_cost_saved_usd = total_hours_saved * ESTIMATED_HOURLY_REVIEWER_RATE_USD
    
    # Document Type breakdown
    type_stats = {
        "invoice": {"total": 0, "clean": 0, "needs_review": 0, "critical": 0},
        "contract": {"total": 0, "clean": 0, "needs_review": 0, "critical": 0},
        "compliance_doc": {"total": 0, "clean": 0, "needs_review": 0, "critical": 0},
        "other": {"total": 0, "clean": 0, "needs_review": 0, "critical": 0}
    }
    
    # Map high severity doc_ids
    high_sev_doc_ids = set(a.get("doc_id") for a in anomalies if str(a.get("severity", "")).lower() == "high")
    
    for d in docs:
        dtype = str(d.get("doc_type", "other")).lower()
        if dtype not in type_stats:
            dtype = "other"
        type_stats[dtype]["total"] += 1
        anom_cnt = d.get("anomaly_count", 0)
        conf = d.get("overall_confidence", 1.0)
        did = d.get("doc_id", "")
        
        if anom_cnt == 0 and conf >= 0.85:
            type_stats[dtype]["clean"] += 1
        elif did in high_sev_doc_ids:
            type_stats[dtype]["critical"] += 1
        else:
            type_stats[dtype]["needs_review"] += 1
            
    return {
        "total_documents": total_docs,
        "scanned_documents": scanned_docs,
        "native_text_documents": text_docs,
        "anomalies": {
            "total": len(anomalies),
            "high": high_sev,
            "medium": med_sev,
            "low": low_sev
        },
        "type_breakdown": type_stats,
        "business_roi": {
            "estimated_hours_saved": round(total_hours_saved, 1),
            "estimated_cost_saved_usd": round(total_cost_saved_usd, 2),
            "estimated_review_mins_per_doc": ESTIMATED_MANUAL_REVIEW_MINUTES_PER_DOC,
            "analyst_hourly_rate_usd": ESTIMATED_HOURLY_REVIEWER_RATE_USD
        },
        "recent_documents": docs[:10]
    }
