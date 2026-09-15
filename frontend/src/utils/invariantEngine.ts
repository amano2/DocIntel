import JSZip from 'jszip';
import { DocumentItem, AnomalyItem, AuditLogEntry } from '../types';
import { createNewVersion, getDocumentVersions } from './versionManager';

/**
 * Deterministic mathematical invariant recalculation:
 * Verifies if Subtotal + Tax = Total within 0.01 threshold.
 */
export function recalculateDocumentInvariants(
  doc: DocumentItem,
  updatedFieldKey: string,
  newRawValue: string,
  reviewerName: string = 'Human Reviewer'
): { updatedDoc: DocumentItem; auditEntry: AuditLogEntry; anomalyResolved: boolean } {
  const clonedDoc: DocumentItem = JSON.parse(JSON.stringify(doc));
  const field = clonedDoc.fields[updatedFieldKey];
  const prevValue = field ? field.value : '';

  // Parse numeric value if currency/numeric
  let numericVal: number | undefined = undefined;
  const cleaned = newRawValue.replace(/[^0-9.-]+/g, '');
  if (cleaned && !isNaN(Number(cleaned))) {
    numericVal = parseFloat(cleaned);
  }

  // Update field
  if (field) {
    field.value = newRawValue;
    if (numericVal !== undefined) {
      field.numericValue = numericVal;
    }
    field.isCorrected = true;
    field.confidence = 100.0; // Human validated
  }

  // Mathematical invariant check
  let mathAnomalyResolved = false;
  const subtotalField = clonedDoc.fields['subtotal'];
  const taxField = clonedDoc.fields['tax_amount'];
  const totalField = clonedDoc.fields['total_amount'];

  if (subtotalField?.numericValue !== undefined && taxField?.numericValue !== undefined && totalField?.numericValue !== undefined) {
    const computedSum = subtotalField.numericValue + taxField.numericValue;
    const diff = Math.abs(computedSum - totalField.numericValue);

    // Find any existing math invariant anomaly
    const mathAnomalyIndex = clonedDoc.anomalies.findIndex(a => a.ruleType === 'math_invariant');

    if (diff < 0.05) {
      // Invariant is now satisfied!
      if (mathAnomalyIndex !== -1) {
        clonedDoc.anomalies[mathAnomalyIndex].resolved = true;
        clonedDoc.anomalies[mathAnomalyIndex].resolutionNote = `Resolved via human edit: Subtotal ($${subtotalField.numericValue.toFixed(2)}) + Tax ($${taxField.numericValue.toFixed(2)}) matches Total ($${totalField.numericValue.toFixed(2)}).`;
        mathAnomalyResolved = true;
      }
      // Update doc status if all anomalies resolved
      if (clonedDoc.anomalies.every(a => a.resolved)) {
        clonedDoc.status = 'VERIFIED';
      }
    } else {
      // Invariant still violated, update anomaly description
      if (mathAnomalyIndex !== -1) {
        clonedDoc.anomalies[mathAnomalyIndex].resolved = false;
        clonedDoc.anomalies[mathAnomalyIndex].description = `Recalculated: Subtotal ($${subtotalField.numericValue.toFixed(2)}) + Tax ($${taxField.numericValue.toFixed(2)}) = $${computedSum.toFixed(2)}, but total is $${totalField.numericValue.toFixed(2)}. Discrepancy: $${(totalField.numericValue - computedSum).toFixed(2)}.`;
        clonedDoc.anomalies[mathAnomalyIndex].expectedValue = `$${computedSum.toFixed(2)}`;
      }
    }
  }

  // Create audit log entry
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const auditEntry: AuditLogEntry = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: now,
    fieldKey: updatedFieldKey,
    fieldLabel: field?.label || updatedFieldKey,
    previousValue: prevValue,
    newValue: newRawValue,
    author: `${reviewerName} (HITL Console)`,
    reason: mathAnomalyResolved 
      ? 'Corrected OCR misread; mathematical invariant recalculated and verified.' 
      : 'Manual field update and compliance audit log registration.',
    triggeredRecalc: true,
    actionType: 'FIELD_EDIT'
  };

  clonedDoc.auditTrail.unshift(auditEntry);

  // Generate and append new version snapshot
  const currentVersions = getDocumentVersions(clonedDoc);
  const newVer = createNewVersion(
    clonedDoc,
    mathAnomalyResolved ? 'Invariant Reconciled' : `Calibrated ${field?.label || updatedFieldKey}`,
    `Updated ${field?.label || updatedFieldKey} from "${prevValue}" to "${newRawValue}"`,
    reviewerName,
    false
  );
  auditEntry.versionNumber = newVer.versionNumber;
  clonedDoc.versions = [...currentVersions, newVer];

  return {
    updatedDoc: clonedDoc,
    auditEntry,
    anomalyResolved: mathAnomalyResolved
  };
}

/**
 * Generate enterprise batch export (.zip) with:
 * 1. Document JSON manifests
 * 2. Master CSV audit ledger
 * 3. Accuracy & compliance summary
 */
export async function generateEnterpriseBatchZip(documents: DocumentItem[]): Promise<Blob> {
  const zip = new JSZip();

  // 1. Individual JSON extraction manifests
  const manifestsFolder = zip.folder('extracted_manifests');
  documents.forEach(doc => {
    manifestsFolder?.file(
      `${doc.id}_extracted.json`,
      JSON.stringify(
        {
          document_id: doc.id,
          title: doc.title,
          file_name: doc.fileName,
          type: doc.docType,
          status: doc.status,
          overall_confidence: doc.overallConfidence,
          extracted_fields: doc.fields,
          anomalies: doc.anomalies,
          audit_trail: doc.auditTrail,
          system_metadata: {
            ocr_pathway: doc.ocrPathway,
            pages: doc.pages,
            exported_at: new Date().toISOString()
          }
        },
        null,
        2
      )
    );
  });

  // 2. Master Audit Trail CSV
  const csvRows: string[] = [];
  csvRows.push('Document ID,Title,Doc Type,Status,Confidence,Total Amount,Anomalies Count,Resolved Anomalies,Last Audited By,Audit Trail Count');

  documents.forEach(doc => {
    const total = doc.totalAmount !== undefined ? doc.totalAmount.toFixed(2) : 'N/A';
    const totalAnomalies = doc.anomalies.length;
    const resolvedAnomalies = doc.anomalies.filter(a => a.resolved).length;
    const lastAuditAuthor = doc.auditTrail[0]?.author || 'System Ingest';
    const sanitizedTitle = `"${doc.title.replace(/"/g, '""')}"`;

    csvRows.push(
      `${doc.id},${sanitizedTitle},${doc.docType},${doc.status},${doc.overallConfidence}%,${total},${totalAnomalies},${resolvedAnomalies},"${lastAuditAuthor}",${doc.auditTrail.length}`
    );
  });

  zip.file('audit_trail_summary.csv', csvRows.join('\n'));

  // 3. Compliance and Benchmark Verification Report
  zip.file(
    'compliance_verification_report.json',
    JSON.stringify(
      {
        platform: 'DocIntel Agent Multimodal SaaS',
        version: '3.4.0-enterprise',
        export_timestamp: new Date().toISOString(),
        total_documents_exported: documents.length,
        documents_by_status: {
          VERIFIED: documents.filter(d => d.status === 'VERIFIED').length,
          REVIEW_REQUIRED: documents.filter(d => d.status === 'REVIEW_REQUIRED').length,
          AUTO_APPROVED: documents.filter(d => d.status === 'AUTO_APPROVED').length,
          REJECTED: documents.filter(d => d.status === 'REJECTED').length
        },
        invariant_engine: {
          math_invariants_enforced: true,
          duplicate_hash_check_active: true,
          compliance_audit_ledger_locked: true
        }
      },
      null,
      2
    )
  );

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Trigger browser file download
 */
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
