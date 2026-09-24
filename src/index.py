"""
FAISS vector index module for document corpus search.
Uses sentence-transformers for embedding and supports semantic chunking
with configurable overlap to preserve context at chunk boundaries.
"""

import os
import json
import re
import faiss
import numpy as np
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from src.config import CHUNK_SIZE, CHUNK_OVERLAP
from src.logger import get_logger

log = get_logger("index")

INDEX_PATH = "faiss_index.bin"
METADATA_PATH = "faiss_metadata.json"


class FaissIndexer:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.dimension = self.model.get_sentence_embedding_dimension()

        if os.path.exists(INDEX_PATH):
            self.index = faiss.read_index(INDEX_PATH)
            log.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
        else:
            self.index = faiss.IndexFlatIP(self.dimension)
            log.info("Created new FAISS index")

        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, 'r') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = []

    def _save(self):
        faiss.write_index(self.index, INDEX_PATH)
        with open(METADATA_PATH, 'w') as f:
            json.dump(self.metadata, f)

    def _chunk_text(self, text: str) -> List[str]:
        """
        Semantic-aware chunking with overlap.
        Splits on paragraph/sentence boundaries first, then enforces word limits.
        Adjacent chunks share CHUNK_OVERLAP words to preserve context.
        """
        # Split on paragraph boundaries (double newline or multiple newlines)
        paragraphs = re.split(r'\n\s*\n', text.strip())

        # Merge very short paragraphs, split very long ones
        segments: List[str] = []
        buffer = ""
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            combined = f"{buffer} {para}".strip() if buffer else para
            word_count = len(combined.split())
            if word_count <= CHUNK_SIZE:
                buffer = combined
            else:
                if buffer:
                    segments.append(buffer)
                # If the paragraph itself is too long, split by sentences
                if len(para.split()) > CHUNK_SIZE:
                    sentences = re.split(r'(?<=[.!?])\s+', para)
                    sent_buffer = ""
                    for sent in sentences:
                        combined_sent = f"{sent_buffer} {sent}".strip() if sent_buffer else sent
                        if len(combined_sent.split()) <= CHUNK_SIZE:
                            sent_buffer = combined_sent
                        else:
                            if sent_buffer:
                                segments.append(sent_buffer)
                            sent_buffer = sent
                    if sent_buffer:
                        buffer = sent_buffer
                    else:
                        buffer = ""
                else:
                    buffer = para
        if buffer:
            segments.append(buffer)

        # Apply overlap between adjacent chunks
        if CHUNK_OVERLAP > 0 and len(segments) > 1:
            overlapped: List[str] = []
            for i, seg in enumerate(segments):
                if i == 0:
                    overlapped.append(seg)
                else:
                    prev_words = segments[i - 1].split()
                    overlap_prefix = " ".join(prev_words[-CHUNK_OVERLAP:])
                    overlapped.append(f"{overlap_prefix} {seg}")
            segments = overlapped

        # Fallback: if no segments were created, do simple word-level split
        if not segments:
            words = text.split()
            for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
                chunk = " ".join(words[i:i + CHUNK_SIZE])
                if chunk.strip():
                    segments.append(chunk)

        return segments

    def add_document(self, doc_id: str, user_id: str, text: str):
        """Chunk, embed, and index a document's text content."""
        if not text.strip():
            return

        chunks = self._chunk_text(text)
        embeddings = self.model.encode(chunks, normalize_embeddings=True)

        self.index.add(np.array(embeddings).astype('float32'))

        for i, chunk in enumerate(chunks):
            self.metadata.append({
                "doc_id": doc_id,
                "user_id": user_id,
                "text": chunk,
                "chunk_index": i,
            })

        self._save()
        log.info(
            f"Indexed document {doc_id[:8]}: {len(chunks)} chunks",
            extra={"data": {"doc_id": doc_id, "chunks": len(chunks), "total_vectors": self.index.ntotal}},
        )

    def search(
        self,
        user_id: str,
        query: str,
        top_k: int = 5,
        doc_ids: List[str] = None,
    ) -> List[Dict[str, Any]]:
        """Semantic search with user-scoped filtering."""
        if self.index.ntotal == 0:
            return []

        query_vector = self.model.encode([query], normalize_embeddings=True)

        # Retrieve more results to allow for user/doc filtering
        k_search = min(self.index.ntotal, top_k * 10)
        distances, indices = self.index.search(np.array(query_vector).astype('float32'), k_search)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1:
                continue
            meta = self.metadata[idx]

            # User-level access control
            if meta["user_id"] != user_id:
                continue

            # Optional document scope filter
            if doc_ids and meta["doc_id"] not in doc_ids:
                continue

            results.append({
                "doc_id": meta["doc_id"],
                "text": meta["text"],
                "score": float(dist),
                "chunk_index": meta.get("chunk_index", 0),
            })

            if len(results) >= top_k:
                break

        return results
