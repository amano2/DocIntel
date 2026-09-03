"""
Local Vector Indexing Module using SentenceTransformers and FAISS.

Features:
- 100% Free & Local: Uses 'all-MiniLM-L6-v2' via sentence-transformers and FAISS-CPU.
- Incremental updates: Add documents without re-indexing the entire corpus.
- Stores chunk text & metadata (doc_id, filename, page_number) for exact source attribution.
"""

import os
import json
import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

from src.config import VECTOR_STORE_DIR, EMBEDDING_MODEL_NAME


class VectorIndex:
    """Manages local FAISS index and chunk metadata."""

    def __init__(self, index_dir: Optional[Path] = None, model_name: Optional[str] = None):
        self.index_dir = index_dir or VECTOR_STORE_DIR
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self.model_name = model_name or EMBEDDING_MODEL_NAME
        
        self.index_file = self.index_dir / "faiss.index"
        self.meta_file = self.index_dir / "chunks_metadata.pkl"
        
        self._encoder: Optional[SentenceTransformer] = None
        self.index: Optional[faiss.IndexFlatIP] = None
        self.metadata: List[Dict[str, Any]] = []
        
        self._load_or_init_index()

    @property
    def encoder(self) -> SentenceTransformer:
        """Lazy loader for SentenceTransformer model."""
        if self._encoder is None:
            self._encoder = SentenceTransformer(self.model_name)
        return self._encoder

    def _load_or_init_index(self):
        """Loads FAISS index from disk if present, else creates a new inner product (cosine) index."""
        if self.index_file.exists() and self.meta_file.exists():
            try:
                self.index = faiss.read_index(str(self.index_file))
                with open(self.meta_file, "rb") as f:
                    self.metadata = pickle.load(f)
                return
            except Exception as e:
                print(f"Warning: Could not load existing index: {e}. Reinitializing...")

        # Initialize new FAISS index (dimension 384 for all-MiniLM-L6-v2)
        dim = 384
        self.index = faiss.IndexFlatIP(dim)
        self.metadata = []

    def save(self):
        """Persists the FAISS index and metadata to disk."""
        if self.index is not None:
            faiss.write_index(self.index, str(self.index_file))
            with open(self.meta_file, "wb") as f:
                pickle.dump(self.metadata, f)

    def add_document(
        self,
        doc_id: str,
        filename: str,
        full_text: str,
        doc_type: str,
        fields_summary: str = "",
        chunk_size: int = 500,
        overlap: int = 100
    ) -> int:
        """
        Chunks, embeds, and indexes a single document.
        
        Returns:
            Number of chunks indexed.
        """
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

        texts = [c["text"] for c in chunks]
        embeddings = self.encoder.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

        if self.index is None:
            dim = embeddings.shape[1]
            self.index = faiss.IndexFlatIP(dim)

        self.index.add(embeddings.astype(np.float32))
        self.metadata.extend(chunks)
        self.save()
        
        return len(chunks)

    def search(self, query: str, top_k: int = 4, doc_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Performs semantic vector search across the indexed document chunks.
        Supports filtering by specific doc_ids for document comparison mode.
        
        Returns:
            List of matching chunks with similarity scores and source metadata.
        """
        if self.index is None or self.index.ntotal == 0:
            return []

        query_emb = self.encoder.encode([query], convert_to_numpy=True, normalize_embeddings=True)
        fetch_k = min(self.index.ntotal, top_k * 6 if doc_ids else top_k)
        scores, indices = self.index.search(query_emb.astype(np.float32), fetch_k)

        target_ids = set(doc_ids) if doc_ids else None
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.metadata):
                item = dict(self.metadata[idx])
                if target_ids is not None and item.get("doc_id") not in target_ids:
                    continue
                item["similarity_score"] = float(score)
                results.append(item)
                if len(results) >= top_k:
                    break

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
        
        # Include structured fields summary as a prime search chunk if available
        if fields_summary:
            chunks.append({
                "doc_id": doc_id,
                "filename": filename,
                "doc_type": doc_type,
                "text": f"Document: {filename} ({doc_type})\nKey Extracted Data:\n{fields_summary}",
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
                "text": f"Document: {filename}\n{text}",
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
                "text": f"Document: {filename}\n{chunk_str}",
                "chunk_type": "body_text"
            })
            if end == len(words):
                break
            start += (chunk_size - overlap)

        return chunks


# Singleton default index
default_vector_index = VectorIndex()
