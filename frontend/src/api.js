const API_BASE = '/api';

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function fetchDocumentDetails(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}`);
  if (!res.ok) throw new Error('Failed to fetch document details');
  return res.json();
}

export async function fetchAnomalies(severity = null) {
  const url = severity ? `${API_BASE}/anomalies?severity=${severity}` : `${API_BASE}/anomalies`;
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

export async function queryRAG(query, topK = 4) {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: topK })
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

export function getDocumentPreviewUrl(docId) {
  return `${API_BASE}/documents/${docId}/preview`;
}
