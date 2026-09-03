const API_BASE = '/api';

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchDocuments({ page = 1, limit = 50, doc_type = null, search = null } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  if (doc_type && doc_type !== 'all') params.set('doc_type', doc_type);
  if (search && search.trim()) params.set('search', search.trim());

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/documents${query}`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function fetchDocumentDetails(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}`);
  if (!res.ok) throw new Error('Failed to fetch document details');
  return res.json();
}

export async function fetchAnomalies(severity = null) {
  const url = severity && severity !== 'all' ? `${API_BASE}/anomalies?severity=${severity}` : `${API_BASE}/anomalies`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch anomalies');
  return res.json();
}

export async function correctField(docId, fieldName, newValue) {
  const res = await fetch(`${API_BASE}/documents/${docId}/correct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field_name: fieldName, new_value: newValue })
  });
  if (!res.ok) throw new Error('Failed to correct field');
  return res.json();
}

export async function queryRAG(query, { topK = 4, docIds = null, compareMode = false } = {}) {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      top_k: topK,
      doc_ids: docIds,
      compare_mode: compareMode
    })
  });
  if (!res.ok) throw new Error('Failed to query RAG');
  return res.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function getUploadStatus(jobId) {
  const res = await fetch(`${API_BASE}/upload/status/${jobId}`);
  if (!res.ok) throw new Error('Failed to get upload status');
  return res.json();
}

export function getDocumentPreviewUrl(docId) {
  return `${API_BASE}/documents/${docId}/preview`;
}

export function getExportAllUrl() {
  return `${API_BASE}/documents/export-all`;
}

export async function fetchEvaluationSummary() {
  const res = await fetch(`${API_BASE}/eval/summary`);
  if (!res.ok) throw new Error('Failed to fetch evaluation summary');
  return res.json();
}
