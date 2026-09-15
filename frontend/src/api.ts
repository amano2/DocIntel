import { DocumentItem, DocumentType, AnomalySeverity, ExtractedField, BoundingBox, AnomalyItem } from './types';
import { supabase } from './lib/supabase';

export const API_BASE = '/api';

/** Helper to wrap fetch with JWT Auth header */
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(options.headers || {});
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(url, { ...options, headers });
}

/**
 * Maps raw backend document dictionary from SQLite into rich frontend DocumentItem interface.
 *
 * Handles BOTH list-level responses (no fields/anomalies, only anomaly_count) 
 * and detail-level responses (full fields + anomalies array).
 *
 * List endpoint (/documents):   returns doc_id, filename, doc_type, is_scanned, anomaly_count, status, confidence
 * Detail endpoint (/documents/id): returns all of above + fields{}, anomalies[], raw_text, audit_trail
 */
export function adaptBackendDocToFrontend(rawDoc: any): DocumentItem {
  const docId = rawDoc.doc_id || rawDoc.id;
  const rawFileName = rawDoc.filename || rawDoc.fileName || 'document.pdf';
  const cleanTitle = rawFileName
    .replace(/^[a-f0-9-]+_/, '')
    .replace(/\.pdf$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const docTypeRaw = (rawDoc.doc_type || rawDoc.docType || 'invoice').toLowerCase();
  let docType: DocumentType = 'INVOICE';
  let category = 'Financial Operations & Accounts Payable';
  if (docTypeRaw.includes('contract') || docTypeRaw.includes('msa') || docTypeRaw.includes('nda')) {
    docType = docTypeRaw.includes('nda') ? 'NDA' : 'MSA_CONTRACT';
    category = 'Legal Procurement & Vendor Obligations';
  } else if (docTypeRaw.includes('compliance') || docTypeRaw.includes('audit') || docTypeRaw.includes('soc')) {
    docType = 'COMPLIANCE_DOC';
    category = 'Security Compliance & Certifications';
  } else if (docTypeRaw.includes('order') || docTypeRaw.includes('po') || docTypeRaw.includes('purchase')) {
    docType = 'PURCHASE_ORDER';
    category = 'Procurement & Purchase Orders';
  } else if (docTypeRaw.includes('tax') || docTypeRaw.includes('w9') || docTypeRaw.includes('1099')) {
    docType = 'TAX_FORM';
    category = 'Tax Compliance & Entity Verification';
  }

  // ── Fields (only present in detail-level response) ──────────────────────────
  const rawFields = rawDoc.fields || {};
  const fields: Record<string, ExtractedField> = {};
  const boundingBoxes: BoundingBox[] = [];

  for (const [key, field] of Object.entries(rawFields)) {
    const f: any = field;
    const isNum = key.includes('amount') || key.includes('total') || key.includes('subtotal') || key.includes('tax') || key.includes('price');
    const isDate = key.includes('date');
    const confVal = typeof f.confidence === 'number'
      ? (f.confidence > 1 ? f.confidence : Math.round(f.confidence * 1000) / 10)
      : 95.0;

    const strVal = typeof f.value === 'object' && f.value !== null
      ? (Array.isArray(f.value)
          ? f.value.map((i: any) => typeof i === 'object' ? Object.values(i).join(' - ') : i).join('; ')
          : JSON.stringify(f.value))
      : String(f.value ?? '');

    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const bbox: BoundingBox = {
      page: 1,
      top: 0,
      left: 0,
      width: 100,
      height: 100,
      label,
      fieldKey: key,
      isAnomaly: false
    };
    boundingBoxes.push(bbox);

    fields[key] = {
      key,
      label,
      value: strVal,
      rawValue: f.value,
      confidence: confVal,
      source: f.source || 'Page 1, Text Layer',
      sourceCitation: f.source || 'Page 1, Text Layer',
      isCorrected: Boolean(f.is_corrected),
      type: isNum ? 'currency' : (isDate ? 'date' : 'text'),
      boundingBox: bbox
    };
  }

  // Parse vendor/parties from extracted fields (detail-level only)
  const vendorOrParties =
    fields.vendor_name?.value ||
    fields.parties?.value ||
    fields.company_name?.value ||
    fields.certified_entity?.value ||
    'Commercial Back-Office Entity';

  // Parse total amount
  let totalAmount = 0;
  if (fields.total_amount?.value) {
    totalAmount = parseFloat(String(fields.total_amount.value).replace(/[^0-9.]/g, '')) || 0;
  }

  // ── Anomalies ──────────────────────────────────────────────────────────────
  // Detail endpoint → anomalies is an array (or single object — normalize both)
  // List endpoint   → anomalies is absent; only anomaly_count (integer) is present
  const rawAnomaliesRaw = rawDoc.anomalies;
  const rawAnomalies: any[] = Array.isArray(rawAnomaliesRaw)
    ? rawAnomaliesRaw
    : (rawAnomaliesRaw && typeof rawAnomaliesRaw === 'object' ? [rawAnomaliesRaw] : []);

  const anomalyCount: number =
    typeof rawDoc.anomaly_count === 'number'
      ? rawDoc.anomaly_count
      : rawAnomalies.length;

  let anomalies: AnomalyItem[] = rawAnomalies.map((a: any, idx: number) => {
    const sev = (a.severity || 'high').toLowerCase() as AnomalySeverity;
    
    // Map backend anomaly to UI's expected deterministic ruleType
    let ruleType: AnomalyItem['ruleType'] = 'math_invariant';
    const fieldLower = String(a.field || '').toLowerCase();
    const msgLower = String(a.message || a.description || '').toLowerCase();

    if (fieldLower.includes('subtotal') || fieldLower.includes('total') || fieldLower.includes('tax') || msgLower.includes('sum') || msgLower.includes('match') || msgLower.includes('discrepancy')) {
      ruleType = 'math_invariant';
    } else if (fieldLower.includes('invoice_number') || msgLower.includes('duplicate')) {
      ruleType = 'fraud_duplicate';
    } else if (fieldLower.includes('is_signed') || msgLower.includes('signature') || msgLower.includes('unexecuted') || msgLower.includes('signed')) {
      ruleType = 'signature_missing';
    } else if (fieldLower.includes('date') || msgLower.includes('prior') || msgLower.includes('expiration') || msgLower.includes('effective')) {
      ruleType = 'date_inversion';
    } else if (msgLower.includes('bank') || msgLower.includes('wire') || msgLower.includes('routing') || msgLower.includes('account')) {
      ruleType = 'wire_fraud_bank';
    } else if (fieldLower.includes('compliant') || msgLower.includes('remediation') || msgLower.includes('control') || msgLower.includes('deadline')) {
      ruleType = 'compliance_deadline';
    } else {
      ruleType = 'terms_discrepancy';
    }

    return {
      id: `ANOM-${a.id || idx + 1}`,
      code: a.type || 'INVARIANT_RULE',
      severity: (sev === 'high' || sev === 'medium' || sev === 'low') ? sev : 'high',
      ruleType,
      title: (a.message || a.description || 'Invariant Violation Detected').split('.')[0],
      description: a.message || a.description || 'Rule violation flagged during extraction audit.',
      fieldKey: a.field,
      resolved: Boolean(a.is_resolved)
    };
  });

  // Cross-reference anomalies with fields
  for (const anom of anomalies) {
    if (anom.fieldKey && fields[anom.fieldKey] && !anom.resolved) {
      fields[anom.fieldKey].hasAnomaly = true;
      fields[anom.fieldKey].anomalyMessage = anom.description;
      fields[anom.fieldKey].anomalySeverity = anom.severity;
      if (fields[anom.fieldKey].boundingBox) {
        fields[anom.fieldKey].boundingBox!.isAnomaly = true;
      }
    }
  }

  // If list-level (no detailed anomalies), synthesize placeholders from anomaly_count
  // so Dashboard telemetry correctly flags docs needing review.
  if (anomalies.length === 0 && anomalyCount > 0) {
    for (let i = 0; i < anomalyCount; i++) {
      anomalies.push({
        id: `ANOM-PENDING-${docId}-${i}`,
        code: 'PENDING_DETAIL_LOAD',
        severity: 'high',
        ruleType: 'math_invariant',
        title: 'Anomaly detected — click to load details',
        description: `This document has ${anomalyCount} anomaly flag(s). Select it in the Review Console for full details.`,
        resolved: false
      });
    }
  }

  // ── Confidence & Status ───────────────────────────────────────────────────
  const overallConf = typeof rawDoc.overall_confidence === 'number'
    ? (rawDoc.overall_confidence > 1 ? rawDoc.overall_confidence : Math.round(rawDoc.overall_confidence * 1000) / 10)
    : 94.0;

  // Backend status strings: 'clean', 'processed', 'review_required', 'failed'
  const rawStatus = (rawDoc.status || 'processed').toLowerCase();
  let status: DocumentItem['status'];
  if (rawStatus === 'failed') {
    status = 'REJECTED';
  } else if (anomalyCount > 0) {
    status = 'REVIEW_REQUIRED';
  } else if (rawStatus === 'clean' || overallConf >= 85) {
    status = 'VERIFIED';
  } else {
    status = 'REVIEW_REQUIRED';
  }

  return {
    id: docId,
    title: cleanTitle,
    fileName: rawFileName,
    fileSize: `${Math.max(1.1, ((rawDoc.raw_text?.length || 2000) / 1024)).toFixed(1)} MB`,
    docType,
    category,
    uploadDate: rawDoc.created_at
      ? rawDoc.created_at.replace('T', ' ').substring(0, 19) + ' UTC'
      : new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
    vendorOrParties,
    totalAmount,
    currency: fields.currency?.value || 'USD',
    status,
    overallConfidence: overallConf,
    pages: rawDoc.total_pages || 1,
    ocrPathway: rawDoc.is_scanned ? 'VISION_OCR_FALLBACK' : 'DUAL_PDF_TEXT',
    fields,
    anomalies,
    auditTrail: (rawDoc.audit_trail || []).map((entry: any, eIdx: number) => ({
      id: `AUD-${eIdx + 1}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      fieldKey: entry.field || 'field',
      fieldLabel: (entry.field || 'field').replace(/_/g, ' ').toUpperCase(),
      previousValue: entry.old_value || 'None',
      newValue: entry.new_value || 'Corrected',
      author: entry.user || 'Human Reviewer',
      reason: 'Audited during manual verification review',
      triggeredRecalc: true,
      actionType: 'FIELD_EDIT'
    })),
    rawTextPreview: rawDoc.raw_text || 'No raw text extracted.',
    boundingBoxes
  };
}

/**
 * Fetch paginated list of documents from backend.
 */
export async function fetchDocuments(
  page = 1,
  limit = 100,
  docType?: string,
  search?: string
): Promise<{ documents: DocumentItem[]; total_count: number; total_pages: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (docType && docType !== 'ALL') params.append('doc_type', docType.toLowerCase());
  if (search) params.append('search', search);

  const res = await fetchWithAuth(`${API_BASE}/documents?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch documents: ${res.statusText}`);
  }
  const data = await res.json();
  const adapted = (data.documents || []).map(adaptBackendDocToFrontend);
  return {
    documents: adapted,
    total_count: data.total_count || adapted.length,
    total_pages: data.total_pages || 1
  };
}

/**
 * Fetch full details for a single document (includes fields, anomalies, raw_text, audit_trail).
 */
export async function fetchDocumentDetails(docId: string): Promise<DocumentItem> {
  const res = await fetchWithAuth(`${API_BASE}/documents/${docId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch document ${docId}: ${res.statusText}`);
  }
  const raw = await res.json();
  return adaptBackendDocToFrontend(raw);
}

/**
 * Submit field correction (Human-in-the-loop audit trail).
 */
export async function correctDocumentField(docId: string, fieldName: string, newValue: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/documents/${docId}/correct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field_name: fieldName, new_value: newValue })
  });
  if (!res.ok) {
    throw new Error(`Failed to correct field: ${res.statusText}`);
  }
}

/**
 * Upload a document file and track asynchronous pipeline progress.
 */
export async function uploadDocumentFile(
  file: File,
  onProgress?: (job: { progress: number; stage: string; message: string; status: string }) => void
): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetchWithAuth(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }
  const initData = await res.json();
  const jobId = initData.job_id;

  // Poll status until complete or failed
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 600));
    try {
      const statusRes = await fetchWithAuth(`${API_BASE}/upload/status/${jobId}`);
      if (statusRes.ok) {
        const job = await statusRes.json();
        if (onProgress) {
          onProgress({
            progress: typeof job.progress === 'number' ? Math.round(job.progress * 100) : 50,
            stage: job.stage || 'PROCESSING',
            message: job.message || 'Processing document...',
            status: job.status || 'processing'
          });
        }
        if (job.status === 'completed') {
          return await fetchDocumentDetails(jobId);
        }
        if (job.status === 'failed') {
          throw new Error(job.error || job.message || 'Processing failed.');
        }
      }
    } catch (pollErr: any) {
      if (pollErr.message?.includes('failed')) throw pollErr;
    }
  }

  // Fallback if polling timed out
  return await fetchDocumentDetails(jobId);
}

/**
 * Fetch aggregate dashboard statistics directly from backend.
 */
export async function fetchDashboardStats(): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return await res.json();
}

/**
 * Fetch empirical evaluation telemetry.
 */
export async function fetchEvaluationSummary(): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE}/eval/summary`);
  if (!res.ok) throw new Error('Failed to fetch evaluation summary');
  return await res.json();
}

/**
 * URL for batch export.
 */
export function getExportAllUrl(): string {
  return `${API_BASE}/documents/export-all`;
}
