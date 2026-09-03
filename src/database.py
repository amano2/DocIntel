"""
SQLite Database and Audit Trail Access Layer.

Stores:
- Document records & ingestion metadata
- Extracted structured fields with confidence scores & human correction history
- Flagged anomalies with severity levels and resolution status
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from src.config import DB_PATH


class Database:
    """SQLite database manager for document intelligence audit trail."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_tables()

    def get_connection(self) -> sqlite3.Connection:
        """Returns a SQLite connection with dict-like row access."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self):
        """Initializes tables if they do not exist."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Documents table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                doc_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                is_scanned INTEGER NOT NULL DEFAULT 0,
                total_pages INTEGER NOT NULL DEFAULT 1,
                raw_text TEXT,
                overall_confidence REAL DEFAULT 0.0,
                status TEXT DEFAULT 'processed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 2. Extracted Fields table (Audit trail)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS extracted_fields (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT NOT NULL,
                field_name TEXT NOT NULL,
                field_value TEXT,
                confidence REAL DEFAULT 1.0,
                source TEXT DEFAULT 'text',
                is_corrected_by_user INTEGER DEFAULT 0,
                original_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doc_id) REFERENCES documents (doc_id) ON DELETE CASCADE
            );
            """)

            # 3. Anomalies table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS anomalies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT NOT NULL,
                field TEXT,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL,
                suggested_action TEXT,
                is_resolved INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doc_id) REFERENCES documents (doc_id) ON DELETE CASCADE
            );
            """)
            
            # Indexes for high performance queries
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_fields_doc_id ON extracted_fields (doc_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_doc_id ON anomalies (doc_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies (severity);")
            
            conn.commit()

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
        status: str = "processed"
    ):
        """Inserts or replaces a document record."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO documents (
                doc_id, filename, file_path, doc_type, is_scanned, total_pages,
                raw_text, overall_confidence, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id, filename, file_path, doc_type, 1 if is_scanned else 0,
                total_pages, raw_text, overall_confidence, status, now, now
            ))
            conn.commit()

    def save_extracted_fields(self, doc_id: str, fields: Dict[str, Dict[str, Any]]):
        """Stores extracted fields with confidence scores."""
        with self.get_connection() as conn:
            # Delete old fields if re-extracting
            conn.execute("DELETE FROM extracted_fields WHERE doc_id = ?", (doc_id,))
            
            for field_name, field_obj in fields.items():
                val = field_obj.get("value")
                # Serialize complex values (dicts, lists) to JSON string
                val_str = json.dumps(val) if isinstance(val, (dict, list)) else (str(val) if val is not None else "")
                conf = float(field_obj.get("confidence", 0.8))
                source = str(field_obj.get("source", "text"))
                
                conn.execute("""
                INSERT INTO extracted_fields (
                    doc_id, field_name, field_value, confidence, source, is_corrected_by_user
                ) VALUES (?, ?, ?, ?, ?, 0)
                """, (doc_id, field_name, val_str, conf, source))
                
            conn.commit()

    def save_anomalies(self, doc_id: str, anomalies: List[Any]):
        """Stores flagged anomalies."""
        with self.get_connection() as conn:
            conn.execute("DELETE FROM anomalies WHERE doc_id = ?", (doc_id,))
            
            for flag in anomalies:
                flag_dict = flag.to_dict() if hasattr(flag, "to_dict") else flag
                conn.execute("""
                INSERT INTO anomalies (
                    doc_id, field, severity, message, type, suggested_action, is_resolved
                ) VALUES (?, ?, ?, ?, ?, ?, 0)
                """, (
                    doc_id,
                    flag_dict.get("field", ""),
                    flag_dict.get("severity", "medium"),
                    flag_dict.get("message", ""),
                    flag_dict.get("type", "rule"),
                    flag_dict.get("suggested_action", "")
                ))
            conn.commit()

    def update_field_value(self, doc_id: str, field_name: str, new_value: str) -> bool:
        """Applies a human correction to an extracted field (Audit trail)."""
        with self.get_connection() as conn:
            row = conn.execute(
                "SELECT field_value FROM extracted_fields WHERE doc_id = ? AND field_name = ?",
                (doc_id, field_name)
            ).fetchone()
            
            if not row:
                return False
                
            orig_val = row["field_value"]
            conn.execute("""
            UPDATE extracted_fields
            SET field_value = ?, confidence = 1.0, is_corrected_by_user = 1, original_value = ?
            WHERE doc_id = ? AND field_name = ?
            """, (new_value, orig_val, doc_id, field_name))
            
            conn.execute("""
            UPDATE documents SET updated_at = ? WHERE doc_id = ?
            """, (datetime.utcnow().isoformat(), doc_id))
            
            conn.commit()
            return True

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Fetches full document record including fields and anomalies."""
        with self.get_connection() as conn:
            doc_row = conn.execute("SELECT * FROM documents WHERE doc_id = ?", (doc_id,)).fetchone()
            if not doc_row:
                return None
                
            doc_data = dict(doc_row)
            
            # Fields
            field_rows = conn.execute("SELECT * FROM extracted_fields WHERE doc_id = ?", (doc_id,)).fetchall()
            fields_dict = {}
            for f in field_rows:
                val_raw = f["field_value"]
                try:
                    val_parsed = json.loads(val_raw)
                except Exception:
                    val_parsed = val_raw
                fields_dict[f["field_name"]] = {
                    "value": val_parsed,
                    "confidence": f["confidence"],
                    "source": f["source"],
                    "is_corrected": bool(f["is_corrected_by_user"]),
                    "original_value": f["original_value"]
                }
            doc_data["fields"] = fields_dict

            # Anomalies
            anomaly_rows = conn.execute("SELECT * FROM anomalies WHERE doc_id = ?", (doc_id,)).fetchall()
            doc_data["anomalies"] = [dict(a) for a in anomaly_rows]
            
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
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            where_clauses = []
            params = []
            
            if doc_type and doc_type.lower() != "all":
                where_clauses.append("LOWER(d.doc_type) = ?")
                params.append(doc_type.lower())
                
            if search and search.strip():
                where_clauses.append("(d.filename LIKE ? OR d.doc_id LIKE ?)")
                term = f"%{search.strip()}%"
                params.extend([term, term])
                
            where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
            
            total_count = 0
            if return_total or limit is not None:
                count_query = f"SELECT COUNT(*) FROM documents d {where_sql}"
                total_count = cursor.execute(count_query, params).fetchone()[0]
                
            query = f"""
            SELECT 
                d.doc_id, d.filename, d.doc_type, d.is_scanned, d.total_pages,
                d.overall_confidence, d.status, d.created_at,
                COUNT(a.id) as anomaly_count
            FROM documents d
            LEFT JOIN anomalies a ON d.doc_id = a.doc_id
            {where_sql}
            GROUP BY d.doc_id
            ORDER BY d.created_at DESC
            """
            if limit is not None:
                query += f" LIMIT {int(limit)} OFFSET {int(offset)}"
                
            rows = cursor.execute(query, params).fetchall()
            docs = [dict(r) for r in rows]
            
            if return_total:
                return docs, total_count if total_count > 0 else len(docs)
            return docs

    def list_all_invoices(self) -> List[Dict[str, Any]]:
        """Returns invoice metadata for duplicate cross-check."""
        with self.get_connection() as conn:
            rows = conn.execute("""
            SELECT d.doc_id, d.filename,
                   MAX(CASE WHEN f.field_name = 'invoice_number' THEN f.field_value END) as invoice_number,
                   MAX(CASE WHEN f.field_name = 'vendor_name' THEN f.field_value END) as vendor_name,
                   MAX(CASE WHEN f.field_name = 'total_amount' THEN f.field_value END) as total_amount
            FROM documents d
            JOIN extracted_fields f ON d.doc_id = f.doc_id
            WHERE d.doc_type = 'invoice'
            GROUP BY d.doc_id
            """).fetchall()
            return [dict(r) for r in rows]

    def list_all_anomalies(self, severity_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists all anomalies across all documents, with doc filename."""
        with self.get_connection() as conn:
            if severity_filter and severity_filter.lower() != "all":
                query = """
                SELECT a.*, d.filename, d.doc_type 
                FROM anomalies a
                JOIN documents d ON a.doc_id = d.doc_id
                WHERE LOWER(a.severity) = ?
                ORDER BY a.created_at DESC
                """
                rows = conn.execute(query, (severity_filter.lower(),)).fetchall()
            else:
                query = """
                SELECT a.*, d.filename, d.doc_type 
                FROM anomalies a
                JOIN documents d ON a.doc_id = d.doc_id
                ORDER BY a.created_at DESC
                """
                rows = conn.execute(query).fetchall()
            return [dict(r) for r in rows]

    def export_invoices_table(self) -> List[Dict[str, Any]]:
        """
        Exports all processed invoices with flattened structured fields
        formatted for direct ERP/QuickBooks/Xero accounting import.
        """
        with self.get_connection() as conn:
            query = """
            SELECT 
                d.doc_id,
                d.filename,
                d.created_at as processed_at,
                d.overall_confidence,
                MAX(CASE WHEN f.field_name = 'vendor_name' THEN f.field_value END) as vendor_name,
                MAX(CASE WHEN f.field_name = 'invoice_number' THEN f.field_value END) as invoice_number,
                MAX(CASE WHEN f.field_name = 'invoice_date' THEN f.field_value END) as invoice_date,
                MAX(CASE WHEN f.field_name = 'due_date' THEN f.field_value END) as due_date,
                MAX(CASE WHEN f.field_name = 'subtotal' THEN f.field_value END) as subtotal,
                MAX(CASE WHEN f.field_name = 'tax_amount' THEN f.field_value END) as tax_amount,
                MAX(CASE WHEN f.field_name = 'total_amount' THEN f.field_value END) as total_amount,
                MAX(CASE WHEN f.field_name = 'payment_terms' THEN f.field_value END) as payment_terms,
                COUNT(a.id) as flag_count
            FROM documents d
            LEFT JOIN extracted_fields f ON d.doc_id = f.doc_id
            LEFT JOIN anomalies a ON d.doc_id = a.doc_id
            WHERE d.doc_type = 'invoice'
            GROUP BY d.doc_id
            ORDER BY d.created_at DESC
            """
            rows = conn.execute(query).fetchall()
            return [dict(r) for r in rows]


# Singleton default database
default_db = Database()
