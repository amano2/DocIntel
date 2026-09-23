from typing import List, Dict, Any, Tuple
from src.openrouter_service import OpenRouterService
from src.index import FaissIndexer

class RAGService:
    def __init__(self, indexer: FaissIndexer, llm_service: OpenRouterService):
        self.indexer = indexer
        self.llm_service = llm_service
        
    async def answer_query(self, user_id: str, query: str, doc_ids: List[str] = None) -> Tuple[str, List[str]]:
        """
        Answers a user's query using RAG.
        Returns a tuple of (answer, cited_doc_ids)
        """
        results = self.indexer.search(user_id=user_id, query=query, top_k=5, doc_ids=doc_ids)
        
        if not results:
            return "I couldn't find any relevant information in your documents to answer that question.", []
            
        context_parts = []
        cited_doc_ids = set()
        
        for i, res in enumerate(results):
            doc_id = res["doc_id"]
            text = res["text"]
            context_parts.append(f"--- Document {doc_id} ---\n{text}")
            cited_doc_ids.add(doc_id)
            
        context = "\n\n".join(context_parts)
        
        system_prompt = """
        You are a helpful document intelligence assistant.
        Answer the user's question using ONLY the provided context from their documents.
        If the answer is not contained in the context, say so clearly. 
        Cite the document ID if you reference specific information.
        """
        
        prompt = f"Context:\n{context}\n\nQuestion:\n{query}"
        
        answer = await self.llm_service.generate_text(prompt=prompt, system_prompt=system_prompt)
        
        return answer, list(cited_doc_ids)
