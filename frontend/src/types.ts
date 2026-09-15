export type DocumentType = 'INVOICE' | 'MSA_CONTRACT' | 'COMPLIANCE_DOC' | 'PURCHASE_ORDER' | 'NDA' | 'TAX_FORM';

export type AccentColor = 'cyan' | 'emerald' | 'amber' | 'violet' | 'azure';

export type AnomalySeverity = 'high' | 'medium' | 'low';

export type AnomalyRuleType = 
  | 'math_invariant' 
  | 'fraud_duplicate' 
  | 'wire_fraud_bank'
  | 'signature_missing' 
  | 'date_inversion'
  | 'renewal_inconsistency'
  | 'contract_risk' 
  | 'compliance_deadline' 
  | 'terms_discrepancy';

export interface BoundingBox {
  page: number;
  top: number; // percentage 0-100
  left: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  label?: string;
  fieldKey?: string;
  isAnomaly?: boolean;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  rawValue?: any;
  confidence: number;
  source?: string; // Document source citation triplet (e.g. "Page 1, Subtotal Line 24")
  sourceCitation?: string;
  numericValue?: number;
  isCorrected?: boolean;
  type: 'text' | 'currency' | 'date' | 'percentage' | 'signature';
  boundingBox?: BoundingBox;
  hasAnomaly?: boolean;
  anomalyMessage?: string;
  anomalySeverity?: AnomalySeverity;
}

export interface AnomalyItem {
  id: string;
  code: string;
  severity: AnomalySeverity;
  ruleType: AnomalyRuleType;
  title: string;
  description: string;
  expectedValue?: string;
  actualValue?: string;
  fieldKey?: string;
  resolved: boolean;
  resolutionNote?: string;
}

export interface DocumentVersion {
  id: string;
  versionNumber: string; // e.g. "v1.0", "v1.1", "v2.0"
  label: string; // e.g. "Initial Extraction Baseline", "Subtotal Recalibration"
  timestamp: string;
  author: string;
  changeSummary: string;
  fieldsSnapshot: Record<string, ExtractedField>;
  status: 'REVIEW_REQUIRED' | 'VERIFIED' | 'REJECTED' | 'AUTO_APPROVED';
  anomaliesCount: number;
  checksum: string; // e.g. "sha256-a4f78..."
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  fieldKey: string;
  fieldLabel: string;
  previousValue: string;
  newValue: string;
  author: string;
  reason: string;
  triggeredRecalc?: boolean;
  actionType?: 'FIELD_EDIT' | 'STATUS_CHANGE' | 'ANOMALY_RESOLVED' | 'BASELINE_INGEST' | 'VERSION_RESTORED' | 'CHECKPOINT';
  versionNumber?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  docType: DocumentType;
  category: string;
  uploadDate: string;
  vendorOrParties: string;
  totalAmount?: number;
  currency?: string;
  status: 'REVIEW_REQUIRED' | 'VERIFIED' | 'REJECTED' | 'AUTO_APPROVED';
  overallConfidence: number;
  pages: number;
  ocrPathway: 'DUAL_PDF_TEXT' | 'VISION_OCR_FALLBACK' | 'HYBRID_MULTIMODAL';
  fields: Record<string, ExtractedField>;
  anomalies: AnomalyItem[];
  auditTrail: AuditLogEntry[];
  versions?: DocumentVersion[];
  rawTextPreview: string;
  boundingBoxes: BoundingBox[];
}

export interface UploadJob {
  jobId: string;
  fileName: string;
  fileSize: string;
  docTypeGuess: DocumentType;
  status: 'QUEUED' | 'INGESTING' | 'CLASSIFYING' | 'EXTRACTING' | 'ANOMALY_DETECTION' | 'INDEXING' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStageText: string;
  stageLogs: Array<{ stage: string; timestamp: string; durationMs?: number }>;
  startTime: number;
  durationMs?: number;
  resultDocId?: string;
}

export interface EvaluationMetricSummary {
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  stpRate: number;
  totalEvaluated: number;
  avgLatencyMs: number;
  zeroCostTierCompliance: number;
  confusionMatrix: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
  };
}

export const DEFAULT_EVALUATION_BENCHMARK_DATA: EvaluationMetricSummary = {
  precision: 97.4,
  recall: 96.1,
  f1Score: 96.7,
  accuracy: 96.8,
  stpRate: 89.2,
  totalEvaluated: 450,
  avgLatencyMs: 2150,
  zeroCostTierCompliance: 100.0,
  confusionMatrix: {
    truePositives: 418,
    falsePositives: 11,
    trueNegatives: 19,
    falseNegatives: 2
  },
  breakdownByType: {
    INVOICE: { precision: 98.4, recall: 97.2, f1: 97.8, count: 150 },
    MSA_CONTRACT: { precision: 96.2, recall: 94.5, f1: 95.3, count: 120 },
    COMPLIANCE_DOC: { precision: 97.8, recall: 96.4, f1: 97.1, count: 75 },
    PURCHASE_ORDER: { precision: 98.1, recall: 96.8, f1: 97.4, count: 55 },
    NDA: { precision: 99.1, recall: 98.5, f1: 98.8, count: 25 },
    TAX_FORM: { precision: 96.7, recall: 95.2, f1: 95.9, count: 50 }
  }
};

export interface RAGCitation {
  docId: string;
  docTitle: string;
  page: number;
  snippet: string;
  relevanceScore: number;
}

export interface RAGMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  citations?: RAGCitation[];
  mode?: 'single_doc' | 'comparative' | 'corpus_wide';
  reasoningType?: 'HYBRID_VECTOR_SQL' | 'VISION_LLM_GROUNDED' | 'DETERMINISTIC_RULES';
  comparedDocIds?: string[];
}

export type NavigationTab = 'dashboard' | 'review' | 'rag' | 'benchmark';
