"""
Document Intelligence Orchestration Pipeline.

Orchestrates the complete multimodal processing lifecycle:
1. Ingestion: Native text extraction or rasterization for scanned pages.
2. Classification: Categorization via OpenRouter Free Multimodal LLM.
3. Structured Extraction: Type-specific prompt execution with confidence scoring.
4. Anomaly Detection: Math, duplicate, chronology, and signature verification.
5. Indexing: Embedding & indexing in FAISS for RAG Q&A.
6. Persistence: Full audit logging in SQLite.
"""

from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union
import json

from src.ingest import ingest_document, IngestedDocument
from src.classify import classify_document, ClassificationResult
from src.extract import extract_structured_data, ExtractionResult
from src.anomaly import detect_anomalies, AnomalyFlag
from src.index import VectorIndex, default_vector_index
from src.database import get_db, Database
from src.openrouter_service import OpenRouterService, default_openrouter_service


def process_document(
    file_path: Union[str, Path],
    doc_id: Optional[str] = None,
    token: Optional[str] = None,
    vector_index: Optional[VectorIndex] = None,
    llm_service: Optional[OpenRouterService] = None,
    progress_callback: Optional[Callable[[str, float, str], None]] = None
) -> Dict[str, Any]:
    """
    Executes the end-to-end multimodal processing pipeline for a single document.
    
    Args:
        file_path: Path to the document.
        doc_id: Optional unique document ID.
        token: User's JWT token for Supabase multitenancy.
        vector_index: VectorIndex instance.
        llm_service: OpenRouterService instance.
        progress_callback: Optional callback receiving (stage, progress_float, message).
        
    Returns:
        Dictionary containing doc_id, filename, doc_type, fields, anomalies, and confidence.
    """
    def emit(stage: str, progress: float, msg: str):
        if progress_callback:
            try:
                progress_callback(stage, progress, msg)
            except Exception:
                pass

    database = get_db(token)
    v_idx = vector_index or default_vector_index
    service = llm_service or default_openrouter_service
    
    # 1. Ingestion
    emit("INGESTING", 0.15, "Extracting text layer and rasterizing visual pages...")
    ingested_doc = ingest_document(file_path=file_path, doc_id=doc_id)
    
    # 2. Classification
    emit("CLASSIFYING", 0.35, "Categorizing document type via Multimodal Router...")
    classification = classify_document(doc=ingested_doc, llm_service=service)
    
    # 3. Structured Extraction
    emit("EXTRACTING", 0.60, f"Extracting structured {classification.doc_type} fields with confidence scoring...")
    extraction = extract_structured_data(
        doc=ingested_doc,
        doc_type=classification.doc_type,
        llm_service=service
    )
    
    # 4. Anomaly Detection
    emit("ANOMALY_DETECTION", 0.80, "Executing deterministic math invariants & security checks...")
    existing_invoices = database.list_all_invoices()
    anomalies = detect_anomalies(
        doc_id=ingested_doc.doc_id,
        doc_type=classification.doc_type,
        extracted_fields=extraction.fields,
        raw_text=ingested_doc.full_text,
        existing_invoices=existing_invoices,
        llm_service=service
    )
    
    # 5. Database Persistence (Audit Trail)
    emit("INDEXING", 0.92, "Persisting audit ledger and generating FAISS vector embeddings...")
    database.insert_document(
        doc_id=ingested_doc.doc_id,
        filename=ingested_doc.filename,
        file_path=ingested_doc.file_path,
        doc_type=classification.doc_type,
        is_scanned=ingested_doc.is_scanned,
        total_pages=ingested_doc.total_pages,
        raw_text=ingested_doc.full_text,
        overall_confidence=extraction.overall_confidence,
        status="processed" if extraction.status == "success" else "flagged"
    )
    database.save_extracted_fields(doc_id=ingested_doc.doc_id, fields=extraction.fields)
    database.save_anomalies(doc_id=ingested_doc.doc_id, anomalies=anomalies)
    
    # 6. FAISS Vector Indexing
    fields_summary = "\n".join([
        f"- {k}: {v.get('value')}" for k, v in extraction.fields.items() if v.get("value") is not None
    ])
    v_idx.add_document(
        doc_id=ingested_doc.doc_id,
        filename=ingested_doc.filename,
        full_text=ingested_doc.full_text,
        doc_type=classification.doc_type,
        fields_summary=fields_summary,
        db=database
    )
    
    emit("COMPLETED", 1.0, f"Successfully processed {ingested_doc.filename} ({len(anomalies)} anomalies flagged).")
    
    return {
        "doc_id": ingested_doc.doc_id,
        "filename": ingested_doc.filename,
        "doc_type": classification.doc_type,
        "classification_confidence": classification.confidence,
        "is_scanned": ingested_doc.is_scanned,
        "total_pages": ingested_doc.total_pages,
        "overall_confidence": extraction.overall_confidence,
        "fields": extraction.fields,
        "anomalies": [a.to_dict() for a in anomalies],
        "status": extraction.status
    }

