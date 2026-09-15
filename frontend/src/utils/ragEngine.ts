import { DocumentItem, RAGCitation, RAGMessage } from '../types';

/**
 * Executes a RAG query against the FastAPI backend (/api/query).
 * Maps the backend response (sources[]) to the frontend RAGMessage format (citations[]).
 * Falls back to a grounded client-side summary only on genuine network failure.
 */
export async function executeRAGQuery(
  query: string,
  allDocs: DocumentItem[],
  selectedDocIds: string[] = [],
  isCompareMode: boolean = false
): Promise<RAGMessage> {
  // Always attempt the real backend first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for LLM calls

    const response = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        query,
        top_k: isCompareMode ? 6 : 4,
        doc_ids: selectedDocIds.length > 0 ? selectedDocIds : undefined,
        compare_mode: isCompareMode
      })
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();

      // Map backend sources[] → frontend RAGCitation[]
      const citations: RAGCitation[] = (data.sources || []).map((src: any) => ({
        docId: src.doc_id || '',
        docTitle: src.filename
          ? src.filename.replace(/^[a-f0-9-]+_/, '').replace(/\.pdf$/i, '').replace(/_/g, ' ')
          : 'Unknown Document',
        page: src.page || 1,
        snippet: src.snippet || '',
        relevanceScore: typeof src.similarity_score === 'number' ? src.similarity_score : 0.9
      }));

      return {
        id: `rag-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: data.answer || 'No answer generated.',
        citations,
        mode: isCompareMode ? 'comparative' : (selectedDocIds.length === 1 ? 'single_doc' : 'corpus_wide'),
        reasoningType: 'HYBRID_VECTOR_SQL',
        comparedDocIds: selectedDocIds.length > 0 ? selectedDocIds : undefined
      };
    } else {
      // Non-OK HTTP response — surface the error clearly
      const errBody = await response.text().catch(() => 'No response body');
      throw new Error(`Server returned ${response.status}: ${errBody.slice(0, 200)}`);
    }
  } catch (err: any) {
    // Only fall back to client-side if it's a genuine network error (e.g. backend offline)
    const isNetworkError = (
      err.name === 'AbortError' ||
      err.message?.includes('fetch') ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('ECONNREFUSED')
    );

    if (!isNetworkError) {
      // Server error — return it to the user directly
      return {
        id: `rag-error-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `**RAG Query Error**\n\n${err.message || 'An unknown error occurred contacting the backend.'}`,
        citations: [],
        mode: 'corpus_wide',
        reasoningType: 'HYBRID_VECTOR_SQL'
      };
    }

    // Genuine offline fallback — grounded summary from loaded document state
    const targetDocs = selectedDocIds.length > 0
      ? allDocs.filter(d => selectedDocIds.includes(d.id))
      : allDocs;

    const citations: RAGCitation[] = targetDocs.slice(0, 3).map((doc, idx) => ({
      docId: doc.id,
      docTitle: doc.title,
      page: 1,
      snippet: doc.rawTextPreview.split('\n').slice(0, 3).join(' '),
      relevanceScore: 0.90 - idx * 0.05
    }));

    const docsRequiringReview = targetDocs.filter(d => d.status === 'REVIEW_REQUIRED');
    const totalAnomalies = targetDocs.reduce((sum, d) => sum + d.anomalies.length, 0);

    const offlineAnswer = [
      `### Offline Mode — Backend Unavailable`,
      ``,
      `Could not reach the DocIntel backend server. Showing grounded summary from ${targetDocs.length} locally-loaded document(s).`,
      ``,
      `**Query:** "${query}"`,
      ``,
      `**Local Corpus State:**`,
      `- Total documents loaded: ${targetDocs.length}`,
      `- Documents requiring review: ${docsRequiringReview.length}`,
      `- Total anomalies detected: ${totalAnomalies}`,
      ``,
      `**To get full AI-powered answers, ensure:**`,
      `1. The FastAPI backend is running: \`python -m uvicorn api.main:app --port 8000\``,
      `2. The FAISS vector index is built (run the pipeline on your documents first)`
    ].join('\n');

    return {
      id: `rag-offline-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: offlineAnswer,
      citations,
      mode: targetDocs.length === 1 ? 'single_doc' : 'corpus_wide',
      reasoningType: 'HYBRID_VECTOR_SQL',
      comparedDocIds: targetDocs.map(d => d.id)
    };
  }
}
