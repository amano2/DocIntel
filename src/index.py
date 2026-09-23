import os
import json
import faiss
import numpy as np
from typing import List, Dict, Any, Tuple
from sentence_transformers import SentenceTransformer

INDEX_PATH = "faiss_index.bin"
METADATA_PATH = "faiss_metadata.json"

class FaissIndexer:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.dimension = self.model.get_sentence_embedding_dimension()
        
        if os.path.exists(INDEX_PATH):
            self.index = faiss.read_index(INDEX_PATH)
        else:
            self.index = faiss.IndexFlatIP(self.dimension)
            
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, 'r') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = []

    def _save(self):
        faiss.write_index(self.index, INDEX_PATH)
        with open(METADATA_PATH, 'w') as f:
            json.dump(self.metadata, f)

    def _chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size):
            chunks.append(" ".join(words[i:i+chunk_size]))
        return chunks

    def add_document(self, doc_id: str, user_id: str, text: str):
        if not text.strip():
            return
            
        chunks = self._chunk_text(text)
        embeddings = self.model.encode(chunks, normalize_embeddings=True)
        
        # Add to FAISS
        self.index.add(np.array(embeddings).astype('float32'))
        
        # Add metadata
        for chunk in chunks:
            self.metadata.append({
                "doc_id": doc_id,
                "user_id": user_id,
                "text": chunk
            })
            
        self._save()

    def search(self, user_id: str, query: str, top_k: int = 5, doc_ids: List[str] = None) -> List[Dict[str, Any]]:
        if self.index.ntotal == 0:
            return []
            
        query_vector = self.model.encode([query], normalize_embeddings=True)
        
        # Retrieve more to allow for filtering
        k_search = min(self.index.ntotal, top_k * 10)
        distances, indices = self.index.search(np.array(query_vector).astype('float32'), k_search)
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1:
                continue
            meta = self.metadata[idx]
            
            # RLS / Auth filter
            if meta["user_id"] != user_id:
                continue
                
            # Compare mode filter
            if doc_ids and meta["doc_id"] not in doc_ids:
                continue
                
            results.append({
                "doc_id": meta["doc_id"],
                "text": meta["text"],
                "score": float(dist)
            })
            
            if len(results) >= top_k:
                break
                
        return results
