import { DocumentItem, DocumentVersion, ExtractedField } from '../types';

/**
 * Generate a deterministic pseudo-SHA256 hex checksum for a given field snapshot.
 */
export function generateFieldsChecksum(fields: Record<string, ExtractedField>): string {
  const serialized = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v.value}:${v.numericValue || ''}:${v.confidence}`)
    .join('|');

  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256-${hex}b9c74f109a`;
}

/**
 * Ensures a document has at least its initial baseline version (v1.0).
 */
export function getDocumentVersions(doc: DocumentItem): DocumentVersion[] {
  if (doc.versions && doc.versions.length > 0) {
    return doc.versions;
  }

  // Generate baseline version from doc creation state
  const baselineVersion: DocumentVersion = {
    id: `VER-${doc.id}-v1.0`,
    versionNumber: 'v1.0',
    label: 'Initial Ingestion Baseline',
    timestamp: doc.uploadDate || '2025-02-28 09:14 UTC',
    author: 'DocIntel Multimodal OCR Engine',
    changeSummary: `Catalog entry created with ${Object.keys(doc.fields).length} extracted fields and ${doc.anomalies.length} invariant flags.`,
    fieldsSnapshot: JSON.parse(JSON.stringify(doc.fields)),
    status: doc.status === 'VERIFIED' ? 'VERIFIED' : 'REVIEW_REQUIRED',
    anomaliesCount: doc.anomalies.length,
    checksum: generateFieldsChecksum(doc.fields)
  };

  return [baselineVersion];
}

/**
 * Append a new version to a document after an edit, calibration, or approval.
 */
export function createNewVersion(
  doc: DocumentItem,
  label: string,
  changeSummary: string,
  author: string = 'Aman Hossain',
  isMajor: boolean = false
): DocumentVersion {
  const existingVersions = getDocumentVersions(doc);
  const latestVersion = existingVersions[existingVersions.length - 1];
  
  let nextVersionNumber = 'v1.1';
  if (latestVersion) {
    const match = latestVersion.versionNumber.match(/v(\d+)\.(\d+)/);
    if (match) {
      let major = parseInt(match[1], 10);
      let minor = parseInt(match[2], 10);
      if (isMajor) {
        major += 1;
        minor = 0;
      } else {
        minor += 1;
      }
      nextVersionNumber = `v${major}.${minor}`;
    }
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  const newVersion: DocumentVersion = {
    id: `VER-${doc.id}-${nextVersionNumber}-${Date.now()}`,
    versionNumber: nextVersionNumber,
    label,
    timestamp: now,
    author,
    changeSummary,
    fieldsSnapshot: JSON.parse(JSON.stringify(doc.fields)),
    status: doc.status,
    anomaliesCount: doc.anomalies.filter(a => !a.resolved).length,
    checksum: generateFieldsChecksum(doc.fields)
  };

  return newVersion;
}
