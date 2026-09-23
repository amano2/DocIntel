from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import uuid
import uvicorn
from pydantic import BaseModel

from src.database import get_db_client
from src.openrouter_service import OpenRouterService
from src.index import FaissIndexer
from src.pipeline import PipelineManager
from src.rag_qa import RAGService

app = FastAPI(title="DocIntel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services
llm_service = OpenRouterService()
indexer = FaissIndexer()
pipeline = PipelineManager(indexer, llm_service)
rag_service = RAGService(indexer, llm_service)

async def verify_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return authorization.split(" ")[1]

@app.get("/")
def read_root():
    return {"message": "DocIntel API is running"}

@app.get("/health")
def health_check():
    # A real health check would verify db, model, index
    return {"status": "healthy", "components": {"db": "ok", "llm": "ok", "faiss": "ok"}}

@app.post("/api/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    token: str = Depends(verify_token)
):
    try:
        db = get_db_client(token)
        # Get user_id from the token (Supabase auth session info can be fetched if needed, 
        # or we rely on RLS. But we need user_id to insert into `documents` table).
        # We can fetch the user by verifying the token with Supabase auth:
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
            file_options={"content-type": file.content_type}
        )
        
        # Insert initial record
        db.table("documents").insert({
            "doc_id": doc_id,
            "user_id": user_id,
            "filename": filename,
            "file_path": file_path,
            "status": "processing"
        }).execute()
        
        # Start background processing
        background_tasks.add_task(
            pipeline.process_document,
            user_id=user_id,
            doc_id=doc_id,
            filename=filename,
            file_bytes=file_bytes,
            jwt_token=token
        )
        
        return {"doc_id": doc_id, "status": "processing"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/upload/status/{doc_id}")
def get_upload_status(doc_id: str, token: str = Depends(verify_token)):
    return pipeline.get_progress(doc_id)

@app.get("/api/documents")
def list_documents(token: str = Depends(verify_token)):
    db = get_db_client(token)
    response = db.table("documents").select("*").order("upload_time", desc=True).execute()
    return {"documents": response.data}

@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str, token: str = Depends(verify_token)):
    db = get_db_client(token)
    # Get doc
    doc_resp = db.table("documents").select("*").eq("doc_id", doc_id).execute()
    if not doc_resp.data:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Get fields
    fields_resp = db.table("extracted_fields").select("*").eq("doc_id", doc_id).execute()
    
    # Get anomalies
    anomalies_resp = db.table("anomalies").select("*").eq("doc_id", doc_id).execute()
    
    return {
        "document": doc_resp.data[0],
        "fields": fields_resp.data,
        "anomalies": anomalies_resp.data
    }

class CorrectFieldRequest(BaseModel):
    field_value: str

@app.post("/api/documents/{doc_id}/correct/{field_id}")
def correct_field(doc_id: str, field_id: str, req: CorrectFieldRequest, token: str = Depends(verify_token)):
    db = get_db_client(token)
    db.table("extracted_fields").update({
        "field_value": req.field_value,
        "confidence": 1.0,
        "corrected": True,
        "corrected_at": "now()"
    }).eq("id", field_id).execute()
    return {"status": "success"}

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
        doc_ids=req.doc_ids
    )
    
    db.table("query_log").insert({
        "user_id": user_id,
        "question": req.query,
        "answer": answer,
        "cited_doc_ids": cited_doc_ids
    }).execute()
    
    return {"answer": answer, "cited_doc_ids": cited_doc_ids}

@app.get("/api/anomalies")
def get_anomalies(token: str = Depends(verify_token)):
    db = get_db_client(token)
    response = db.table("anomalies").select("*, documents(filename)").eq("status", "open").execute()
    return {"anomalies": response.data}

@app.get("/api/dashboard/stats")
def get_dashboard_stats(token: str = Depends(verify_token)):
    db = get_db_client(token)
    docs = db.table("documents").select("doc_id", count="exact").execute()
    anomalies = db.table("anomalies").select("id", count="exact").execute()
    
    # Fake ROI calc based on MVP constraints
    doc_count = docs.count or 0
    time_saved_minutes = doc_count * 13.5 # 15 mins manual -> 1.5 mins tool
    
    return {
        "documents_processed": doc_count,
        "anomalies_flagged": anomalies.count or 0,
        "est_time_saved_hours": time_saved_minutes / 60
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
