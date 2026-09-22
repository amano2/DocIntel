"""
Multimodal Retrieval-Augmented Generation (RAG) Q&A Module with Hybrid SQL Enrichment.

Enables natural language querying across the entire document corpus with:
- Top-k semantic chunk retrieval via local FAISS index
- Exact keyword filtering for specific invoice and contract numbers
- Structured SQL arithmetic aggregation for calculations (sums, totals, counts)
- Grounded answer generation using OpenRouter Free Models
- Precise document and page citations for full auditability
"""

import re
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

from src.index import VectorIndex, default_vector_index
from src.database import Database, get_db
from src.openrouter_service import OpenRouterService, default_openrouter_service


@dataclass
class SourceCitation:
    """Represents a source document citation."""
    filename: str
    doc_id: str
    doc_type: str
    similarity_score: float
    snippet: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RAGAnswer:
    """Complete response from the RAG Q&A system."""
    query: str
    answer: str
    sources: List[SourceCitation]
    total_sources_found: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "query": self.query,
            "answer": self.answer,
            "sources": [s.to_dict() for s in self.sources],
            "total_sources_found": self.total_sources_found
        }


RAG_PROMPT_TEMPLATE = """
You are a precise Document Intelligence AI answering questions across enterprise business documents (invoices, contracts, compliance audits).
Answer the user's question using ONLY the provided document context snippets and database aggregations.

Rules:
1. Always cite specific document names (e.g. "[Source: invoice_01_standard_techcorp.pdf]") when stating facts, figures, or dates.
2. When answering financial arithmetic (sums, total spent, averages), use the exact database calculation values provided in the context.
3. If the context does not contain enough information to answer, state clearly: "The provided documents do not contain sufficient information to answer this question."
4. Keep the answer structured, concise, and professional.

=== DATABASE AGGREGATIONS & SUMMARY ===
{db_summary}

=== DOCUMENT CONTEXT SNIPPETS ===
{context}

=== USER QUESTION ===
{query}
"""


RAG_COMPARE_PROMPT_TEMPLATE = """
You are a senior Corporate Legal and Financial Operations Analyst performing a side-by-side comparative analysis of enterprise documents.
Compare the provided documents specifically regarding the user's query.

Rules:
1. Provide a clear, formatted comparison (use Markdown tables or bulleted sections) contrasting Document A vs Document B.
2. Highlight specific variances: payment terms, total pricing, liabilities, termination clauses, compliance deadlines, or signatories.
3. Explicitly cite each document by name (e.g. "[Source: contract_01_standard_nda.pdf]").
4. End with an "Executive Summary of Variances & Risk Delta".

=== DOCUMENT CONTEXT SNIPPETS ===
{context}

=== USER COMPARISON QUERY ===
{query}
"""


def answer_document_query(
    query: str,
    top_k: int = 4,
    vector_index: Optional[VectorIndex] = None,
    db: Optional[Database] = None,
    llm_service: Optional[OpenRouterService] = None,
    doc_ids: Optional[List[str]] = None,
    compare_mode: bool = False
) -> RAGAnswer:
    """
    Answers a natural-language query over the indexed document repository.
    Combines semantic FAISS search with SQL database aggregation for exact math.
    Supports multi-document comparison mode and document-scoped filtering.
    """
    v_idx = vector_index or default_vector_index
    database = db or get_db()
    service = llm_service or default_openrouter_service
    
    # 1. Semantic search (with optional doc_ids filter)
    matches = v_idx.search(query=query, top_k=top_k * 2 if compare_mode else top_k, doc_ids=doc_ids, db=database)
    
    # 2. Database Aggregations for Financial / Count Queries
    db_summary = _build_database_summary(query, database) if not compare_mode else ""

    if not matches and not db_summary:
        return RAGAnswer(
            query=query,
            answer="No matching records were found in the selected documents. Please verify your query or select different documents.",
            sources=[],
            total_sources_found=0
        )

    # 3. Build citations & context text
    citations: List[SourceCitation] = []
    context_blocks = []

    for i, match in enumerate(matches, 1):
        citations.append(SourceCitation(
            filename=match.get("filename", "unknown"),
            doc_id=match.get("doc_id", "unknown"),
            doc_type=match.get("doc_type", "general"),
            similarity_score=round(match.get("similarity_score", 0.0), 3),
            snippet=match.get("text", "")[:300]
        ))
        context_blocks.append(f"[Document Chunk {i}] (File: {match.get('filename')}, Type: {match.get('doc_type')}):\n{match.get('text')}\n")

    context_str = "\n".join(context_blocks)

    # 4. Generate grounded answer
    if service.is_configured:
        if compare_mode:
            prompt = RAG_COMPARE_PROMPT_TEMPLATE.format(
                context=context_str if context_str else "None",
                query=query
            )
        else:
            prompt = RAG_PROMPT_TEMPLATE.format(
                db_summary=db_summary if db_summary else "None",
                context=context_str if context_str else "None",
                query=query
            )
        try:
            answer_text = service.generate_text(prompt=prompt, temperature=0.1)
        except Exception as e:
            fallback_text = []
            if db_summary:
                fallback_text.append(f"**Database Summary:**\n{db_summary}")
            if citations:
                fallback_text.append(f"**Retrieved Evidence ({len(citations)} source document(s)):**")
                for c in citations[:3]:
                    fallback_text.append(f"- **{c.filename}** ({c.doc_type}): {c.snippet[:200]}...")
            
            err_msg = str(e)
            if "429" in err_msg or "Rate limit" in err_msg:
                rate_note = "*(Notice: OpenRouter free daily quota was reached. Showing local semantic search & SQLite database findings below)*\n\n"
            else:
                rate_note = f"*(Notice: LLM call unavailable ({err_msg[:80]}...). Showing local semantic findings below)*\n\n"
                
            answer_text = rate_note + ("\n\n".join(fallback_text) if fallback_text else "No relevant matching text extracted.")
    else:
        # Grounded heuristic summary if offline
        answer_text = ""
        if db_summary:
            answer_text += f"**Database Aggregations:**\n{db_summary}\n\n"
        if citations:
            answer_text += f"**Relevant Documents ({len(citations)} matched):**\n" + "\n\n".join([f"- **{c.filename}** ({c.doc_type}): {c.snippet[:150]}..." for c in citations[:2]])
        if not answer_text:
            answer_text = "No matching records found."

    return RAGAnswer(
        query=query,
        answer=answer_text,
        sources=citations,
        total_sources_found=len(citations)
    )


def _build_database_summary(query: str, db: Database) -> str:
    """Computes exact arithmetic stats from SQLite to ground financial/count questions."""
    q_lower = query.lower()
    invoices = db.export_invoices_table()
    
    if not invoices:
        return ""
        
    summary_parts = []
    
    # Check if query asks about totals / sum / average / counts
    if any(w in q_lower for w in ["total", "sum", "how much", "cost", "average", "how many", "all invoices", "spend"]):
        total_invoiced = 0.0
        vendor_totals = {}
        
        for inv in invoices:
            tot_str = inv.get("total_amount")
            if tot_str is not None:
                try:
                    amt = float(str(tot_str).replace("$", "").replace(",", "").strip())
                    total_invoiced += amt
                    v_name = inv.get("vendor_name") or "Unknown Vendor"
                    vendor_totals[v_name] = vendor_totals.get(v_name, 0.0) + amt
                except (ValueError, TypeError):
                    pass

        summary_parts.append(f"- Total Invoices Recorded: {len(invoices)}")
        summary_parts.append(f"- Total Aggregate Billed Amount: ${total_invoiced:,.2f}")
        for v, amt in vendor_totals.items():
            summary_parts.append(f"  * {v}: ${amt:,.2f}")

    # Check if query asks about discrepancies / anomalies / math errors / fraud / risks
    if any(w in q_lower for w in ["anomaly", "anomalies", "discrepanc", "error", "mismatch", "fraud", "flag", "calculation", "issue", "risk"]):
        anomalies = db.list_all_anomalies()
        if anomalies:
            summary_parts.append("\n- Flagged Database Anomalies & Discrepancies:")
            for anom in anomalies:
                summary_parts.append(f"  * [{anom.get('severity', '').upper()}] {anom.get('filename')}: {anom.get('message')}")
        else:
            summary_parts.append("\n- Flagged Database Anomalies: None currently recorded.")

    return "\n".join(summary_parts)
