"""
Supabase Vector Indexing Module using SentenceTransformers and pgvector.

Features:
- Encodes chunks using local 'all-MiniLM-L6-v2'.
- Persists embeddings to Supabase `document_chunks` table for multi-tenant hybrid search.
"""

import os
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
from sentence_transformers import SentenceTransformer

from src.config import EMBEDDING_MODEL_NAME
from src.database import Database

class VectorIndex:
    """Manages local SentenceTransformer and interfaces with Supabase pgvector."""

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or EMBEDDING_MODEL_NAME
        self._encoder: Optional[SentenceTransformer] = None

    @property
    def encoder(self) -> SentenceTransformer:
        """Lazy loader for SentenceTransformer model."""
        if self._encoder is None:
            self._encoder = SentenceTransformer(self.model_name)
        return self._encoder

    def add_document(
        self,
        doc_id: str,
        filename: str,
        full_text: str,
        doc_type: str,
        fields_summary: str = "",
        chunk_size: int = 500,
        overlap: int = 100,
        db: Optional[Database] = None
    ) -> int:
        """
        Chunks, embeds, and indexes a single document into Supabase.
        """
        if db is None or db.user_id is None:
            return 0
            
        chunks = self._create_chunks(
            doc_id=doc_id,
            filename=filename,
            text=full_text,
            doc_type=doc_type,
            fields_summary=fields_summary,
            chunk_size=chunk_size,
            overlap=overlap
        )
        
        if not chunks:
            return 0

        texts = [c["text_content"] for c in chunks]
        embeddings = self.encoder.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

        insert_payloads = []
        for chunk, emb in zip(chunks, embeddings):
            chunk["embedding"] = emb.tolist()
            chunk["user_id"] = db.user_id
            insert_payloads.append(chunk)

        db.client.table("document_chunks").insert(insert_payloads).execute()
        
        return len(chunks)

    def search(
        self, 
        query: str, 
        top_k: int = 4, 
        doc_ids: Optional[List[str]] = None,
        db: Optional[Database] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs semantic vector search across the indexed document chunks via Supabase pgvector.
        """
        if db is None or db.user_id is None:
            return []

        query_emb = self.encoder.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
        
        rpc_params = {
            "query_embedding": query_emb.tolist(),
            "match_threshold": 0.0,
            "match_count": top_k,
            "target_user_id": db.user_id
        }
        
        if doc_ids:
            rpc_params["filter_doc_ids"] = doc_ids
            
        res = db.client.rpc("match_document_chunks", rpc_params).execute()
        
        results = []
        for row in res.data:
            item = {
                "doc_id": row["doc_id"],
                "filename": row["filename"],
                "doc_type": row["doc_type"],
                "text": row["text_content"],
                "similarity_score": row["similarity"]
            }
            results.append(item)

        return results

    def _create_chunks(
        self,
        doc_id: str,
        filename: str,
        text: str,
        doc_type: str,
        fields_summary: str,
        chunk_size: int,
        overlap: int
    ) -> List[Dict[str, Any]]:
        """Splits document text into overlapping chunks and appends metadata."""
        chunks = []
        
        if fields_summary:
            chunks.append({
                "doc_id": doc_id,
                "filename": filename,
                "doc_type": doc_type,
                "text_content": f"Document: {filename} ({doc_type})\nKey Extracted Data:\n{fields_summary}",
                "chunk_type": "structured_summary"
            })

        if not text.strip():
            return chunks

        words = text.split()
        if len(words) <= chunk_size:
            chunks.append({
                "doc_id": doc_id,
                "filename": filename,
                "doc_type": doc_type,
                "text_content": f"Document: {filename}\n{text}",
                "chunk_type": "body_text"
            })
            return chunks

        start = 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk_str = " ".join(words[start:end])
            chunks.append({
                "doc_id": doc_id,
                "filename": filename,
                "doc_type": doc_type,
                "text_content": f"Document: {filename}\n{chunk_str}",
                "chunk_type": "body_text"
            })
            if end == len(words):
                break
            start += (chunk_size - overlap)

        return chunks


# Singleton default index
default_vector_index = VectorIndex()
