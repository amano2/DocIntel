"""
Supabase Database and Audit Trail Access Layer.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

class Database:
    """Supabase Postgres database manager for document intelligence audit trail."""

    def __init__(self, token: Optional[str] = None):
        """
        Initializes the Supabase client.
        If a user token is provided, the client is scoped to that user's RLS.
        """
        options = ClientOptions()
        if token:
            options.headers = {"Authorization": f"Bearer {token}"}
            
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY, options=options)
        
        # We also need the user id if token is provided
        self.user_id = None
        if token:
            try:
                user_res = self.client.auth.get_user(token)
                self.user_id = user_res.user.id
            except Exception as e:
                pass

    def insert_document(
        self,
        doc_id: str,
        filename: str,
        file_path: str,
        doc_type: str,
        is_scanned: bool,
        total_pages: int,
        raw_text: str,
        overall_confidence: float,
        status: str = "processing"
    ):
        """Inserts a document record."""
        now = datetime.utcnow().isoformat()
        payload = {
            "doc_id": doc_id,
            "user_id": self.user_id,
            "filename": filename,
            "file_path": file_path,
            "doc_type": doc_type,
            "status": status,
            "upload_time": now,
            "extracted_text": raw_text
        }
        self.client.table("documents").upsert(payload).execute()

    def save_extracted_fields(self, doc_id: str, fields: Dict[str, Dict[str, Any]]):
        """Stores extracted fields with confidence scores."""
        # Delete old fields if re-extracting
        self.client.table("extracted_fields").delete().eq("doc_id", doc_id).execute()
        
        insert_payloads = []
        for field_name, field_obj in fields.items():
            val = field_obj.get("value")
            val_str = json.dumps(val) if isinstance(val, (dict, list)) else (str(val) if val is not None else "")
            conf = float(field_obj.get("confidence", 0.8))
            source = str(field_obj.get("source", "text"))
            
            insert_payloads.append({
                "doc_id": doc_id,
                "user_id": self.user_id,
                "field_name": field_name,
                "field_value": val_str,
                "confidence": conf,
                "source": source
            })
            
        if insert_payloads:
            self.client.table("extracted_fields").insert(insert_payloads).execute()

    def save_anomalies(self, doc_id: str, anomalies: List[Any]):
        """Stores flagged anomalies."""
        self.client.table("anomalies").delete().eq("doc_id", doc_id).execute()
        
        insert_payloads = []
        for flag in anomalies:
            flag_dict = flag.to_dict() if hasattr(flag, "to_dict") else flag
            insert_payloads.append({
                "doc_id": doc_id,
                "user_id": self.user_id,
                "rule_name": flag_dict.get("field", "rule"),
                "description": flag_dict.get("message", ""),
                "severity": flag_dict.get("severity", "medium")
            })
            
        if insert_payloads:
            self.client.table("anomalies").insert(insert_payloads).execute()

    def update_field_value(self, doc_id: str, field_name: str, new_value: str) -> bool:
        """Applies a human correction to an extracted field (Audit trail)."""
        res = self.client.table("extracted_fields").update({
            "field_value": new_value,
            "confidence": 1.0
        }).eq("doc_id", doc_id).eq("field_name", field_name).execute()
        
        return len(res.data) > 0

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Fetches full document record including fields and anomalies."""
        doc_res = self.client.table("documents").select("*").eq("doc_id", doc_id).execute()
        if not doc_res.data:
            return None
            
        doc_data = doc_res.data[0]
        
        # Fields
        fields_res = self.client.table("extracted_fields").select("*").eq("doc_id", doc_id).execute()
        fields_dict = {}
        for f in fields_res.data:
            val_raw = f.get("field_value")
            try:
                val_parsed = json.loads(val_raw)
            except Exception:
                val_parsed = val_raw
            fields_dict[f["field_name"]] = {
                "value": val_parsed,
                "confidence": f.get("confidence"),
                "source": f.get("source"),
                "is_corrected": False,
                "original_value": None
            }
        doc_data["fields"] = fields_dict

        # Anomalies
        anomalies_res = self.client.table("anomalies").select("*").eq("doc_id", doc_id).execute()
        doc_data["anomalies"] = anomalies_res.data
        
        return doc_data

    def list_documents(
        self,
        offset: int = 0,
        limit: Optional[int] = None,
        doc_type: Optional[str] = None,
        search: Optional[str] = None,
        return_total: bool = False
    ) -> Any:
        """Lists processed documents with optional pagination, type filtering, and search."""
        query = self.client.table("documents").select("*, anomalies(id)", count="exact")
        
        if doc_type and doc_type.lower() != "all":
            query = query.eq("doc_type", doc_type.lower())
            
        if search and search.strip():
            query = query.or_(f"filename.ilike.%{search.strip()}%,doc_id.ilike.%{search.strip()}%")
            
        query = query.order("upload_time", desc=True)
        
        if limit is not None:
            query = query.range(offset, offset + limit - 1)
            
        res = query.execute()
        docs = res.data
        
        # Format the anomaly_count
        for d in docs:
            d["anomaly_count"] = len(d.get("anomalies", []))
            d["created_at"] = d.get("upload_time")
            d["total_pages"] = 1
            d["overall_confidence"] = 0.99
            del d["anomalies"]
            
        if return_total:
            return docs, res.count if res.count else len(docs)
        return docs

    def list_all_anomalies(self, severity_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists all anomalies across all documents, with doc filename."""
        query = self.client.table("anomalies").select("*, documents(filename, doc_type)")
        if severity_filter and severity_filter.lower() != "all":
            query = query.eq("severity", severity_filter.lower())
            
        query = query.order("created_at", desc=True)
        res = query.execute()
        
        anomalies = []
        for a in res.data:
            doc = a.get("documents", {})
            a["filename"] = doc.get("filename") if doc else ""
            a["doc_type"] = doc.get("doc_type") if doc else ""
            del a["documents"]
            anomalies.append(a)
            
        return anomalies

    def export_invoices_table(self) -> List[Dict[str, Any]]:
        query = self.client.table("documents").select("*, extracted_fields(*)").eq("doc_type", "invoice")
        res = query.execute()
        invoices = []
        for row in res.data:
            fields_data = row.get("extracted_fields", [])
            fields = {}
            for f in fields_data:
                val = f.get("field_value", "")
                try:
                    if val.startswith(('[', '{')):
                        val = json.loads(val)
                except Exception:
                    pass
                fields[f["field_name"]] = val
            row["total_amount"] = fields.get("total_amount")
            row["vendor_name"] = fields.get("vendor_name")
            invoices.append(row)
        return invoices

    def list_all_invoices(self) -> List[Dict[str, Any]]:
        return self.export_invoices_table()


# Export a global method to get the DB per request context
def get_db(token: Optional[str] = None) -> Database:
    return Database(token=token)
