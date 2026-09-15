import React, { useState, useEffect, useRef } from 'react';
import { Upload, CheckCircle2, Loader2, AlertCircle, FileText, ArrowRight, X, Sparkles, ShieldAlert, Layers } from 'lucide-react';
import { DocumentItem, DocumentType } from '../types';
import { useToast } from './ToastProvider';
import { uploadDocumentFile } from '../api';

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentCreated: (doc: DocumentItem) => void;
}

const STAGES = [
  { id: 'INGESTING', label: 'Multimodal Ingestion', desc: 'Dual-pathway PDF rasterization & OCR token extraction', targetProgress: 20 },
  { id: 'CLASSIFYING', label: 'Dynamic Semantic Routing', desc: 'Zero-shot prompt routing & document archetype mapping', targetProgress: 40 },
  { id: 'EXTRACTING', label: 'Calibrated Key-Value Extraction', desc: 'Extracting financial tables, dates, entities & confidence scores', targetProgress: 65 },
  { id: 'ANOMALY_DETECTION', label: 'Deterministic Guardrails', desc: 'Mathematical invariant verification, duplicate hashes & legal risk', targetProgress: 85 },
  { id: 'INDEXING', label: 'Vector & Relational Indexing', desc: 'FAISS dense semantic indexing & SQLite audit ledger commit', targetProgress: 100 },
];

export function UploadProgressModal({ isOpen, onClose, onDocumentCreated }: UploadProgressModalProps) {
  const { showToast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [completedDoc, setCompletedDoc] = useState<DocumentItem | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedPreset('preset-invoice');
      setCustomFile(null);
      setIsProcessing(false);
      setCurrentStageIndex(0);
      setProgress(0);
      setElapsedMs(0);
      setLogs([]);
      setCompletedDoc(null);
    }
  }, [isOpen]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const startPipelineExecution = (presetType: string, fileTitle: string, docType: DocumentType) => {
    setIsProcessing(true);
    setCurrentStageIndex(0);
    setProgress(5);
    setLogs([`[0.00s] Initialized ingestion thread for ${fileTitle}`]);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(elapsed);
    }, 50);

    // Sequence stages realistically
    setTimeout(() => {
      setProgress(22);
      setCurrentStageIndex(0);
      setLogs(prev => [...prev, `[0.24s] PyPDF text extract OK; Rasterized 2 pages @ 300DPI for multimodal fallback`]);
    }, 400);

    setTimeout(() => {
      setProgress(44);
      setCurrentStageIndex(1);
      setLogs(prev => [...prev, `[0.55s] Dynamic classifier confidence 98.6% -> Classified archetype as ${docType}`]);
    }, 850);

    setTimeout(() => {
      setProgress(68);
      setCurrentStageIndex(2);
      setLogs(prev => [...prev, `[0.98s] Extracted line items, subtotal, tax & counterparty entities with calibrated confidence`]);
    }, 1350);

    setTimeout(() => {
      setProgress(88);
      setCurrentStageIndex(3);
      if (presetType.includes('invoice')) {
        setLogs(prev => [...prev, `[1.42s] [WARN] Invariant check flagged ERR_MATH_INVARIANT_MISMATCH: Subtotal + Tax != Total`]);
      } else if (presetType.includes('duplicate')) {
        setLogs(prev => [...prev, `[1.42s] [ALERT] Fraud Engine: Duplicate content hash collision detected in historical ledger!`]);
      } else {
        setLogs(prev => [...prev, `[1.42s] [OK] Deterministic invariants validated; All guardrails cleared without violations`]);
      }
    }, 1850);

    setTimeout(() => {
      setProgress(100);
      setCurrentStageIndex(4);
      setLogs(prev => [...prev, `[2.15s] Dense embeddings synced to FAISS; Record committed to SQLite audit database`]);

      if (timerRef.current) clearInterval(timerRef.current);

      // Create new document item
      const newDoc: DocumentItem = {
        id: `DOC-LIVE-${Date.now().toString().slice(-4)}`,
        title: fileTitle,
        fileName: `${fileTitle.replace(/\s+/g, '_')}.pdf`,
        fileSize: '1.2 MB',
        docType: docType,
        category: docType === 'INVOICE' ? 'Financial Operations' : 'Legal Procurement',
        uploadDate: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        vendorOrParties: 'Palantir Commercial Technologies → Acme Corp',
        totalAmount: docType === 'INVOICE' ? 18450.00 : 0.00,
        currency: 'USD',
        status: presetType.includes('nda') ? 'AUTO_APPROVED' : 'REVIEW_REQUIRED',
        overallConfidence: 96.5,
        pages: 2,
        ocrPathway: 'HYBRID_MULTIMODAL',
        fields: {
          invoice_number: {
            key: 'invoice_number',
            label: 'Document Identifier',
            value: `DOC-INGEST-${Math.floor(1000 + Math.random() * 9000)}`,
            confidence: 99.4,
            type: 'text'
          },
          subtotal: {
            key: 'subtotal',
            label: 'Subtotal Amount',
            value: '$15,000.00',
            numericValue: 15000.00,
            confidence: 96.8,
            type: 'currency'
          },
          tax_amount: {
            key: 'tax_amount',
            label: 'Sales Tax (8%)',
            value: '$1,200.00',
            numericValue: 1200.00,
            confidence: 97.1,
            type: 'currency'
          },
          total_amount: {
            key: 'total_amount',
            label: 'Total Amount Due',
            value: presetType.includes('invoice') ? '$18,450.00' : '$16,200.00',
            numericValue: presetType.includes('invoice') ? 18450.00 : 16200.00,
            confidence: 98.2,
            type: 'currency'
          }
        },
        anomalies: presetType.includes('invoice') ? [
          {
            id: `ANOM-GEN-${Date.now()}`,
            code: 'ERR_MATH_INVARIANT_MISMATCH',
            severity: 'high',
            ruleType: 'math_invariant',
            title: 'Arithmetic Invariant Discrepancy (+$2,250.00)',
            description: 'Subtotal ($15,000.00) + Tax ($1,200.00) = $16,200.00, but printed total is $18,450.00. Unreconciled difference.',
            expectedValue: '$16,200.00',
            actualValue: '$18,450.00',
            fieldKey: 'subtotal',
            resolved: false
          }
        ] : [],
        auditTrail: [
          {
            id: `AUD-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
            fieldKey: 'PIPELINE_INGEST',
            fieldLabel: 'Asynchronous Ingestion',
            previousValue: 'UPLOADED_RAW',
            newValue: 'INDEXED_COMPLETE',
            author: 'DocIntel Agent (Pipeline Daemon)',
            reason: 'Processed via 5-stage multimodal pipeline in 2.15s'
          }
        ],
        rawTextPreview: `PALANTIR COMMERCIAL TECHNOLOGIES
DOCUMENT IDENTIFIER: LIVE-INGEST-${Math.floor(1000 + Math.random() * 9000)}
DATE: ${new Date().toLocaleDateString()}
SUBTOTAL: $15,000.00
SALES TAX: $1,200.00
TOTAL DUE: ${presetType.includes('invoice') ? '$18,450.00 [MISMATCH]' : '$16,200.00'}`,
        boundingBoxes: [
          { page: 1, top: 12, left: 10, width: 80, height: 20, label: 'Document Header' },
          { page: 1, top: 60, left: 55, width: 38, height: 25, label: 'Financial Schedule', isAnomaly: presetType.includes('invoice') }
        ]
      };

      setCompletedDoc(newDoc);
      showToast('success', 'Pipeline Execution Complete', `${fileTitle} indexed into knowledge base.`);
    }, 2400);
  };

  const handleLaunchPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId === 'preset-invoice') {
      startPipelineExecution('invoice', 'Palantir Foundry Infrastructure Invoice 2025', 'INVOICE');
    } else if (presetId === 'preset-msa') {
      startPipelineExecution('msa', 'Snowflake Enterprise Platform Master Services Agreement', 'MSA_CONTRACT');
    } else if (presetId === 'preset-duplicate') {
      startPipelineExecution('duplicate', 'Suspect Duplicate Hardware Billing Invoice', 'INVOICE');
    } else {
      startPipelineExecution('nda', 'Mutual Strategic IP Protection Agreement', 'NDA');
    }
  };

  const handleCustomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomFile(file);
    setSelectedPreset('custom');
    setIsProcessing(true);
    setCurrentStageIndex(0);
    setProgress(5);
    setLogs([`[0.00s] Initialized live upload & ingestion thread for ${file.name}`]);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(elapsed);
    }, 50);

    try {
      const liveDoc = await uploadDocumentFile(file, (job) => {
        setProgress(job.progress);
        const stageIdx = 
          job.stage === 'INGESTING' ? 0 :
          job.stage === 'CLASSIFYING' ? 1 :
          job.stage === 'EXTRACTING' ? 2 :
          job.stage === 'ANOMALY_DETECTION' ? 3 :
          job.stage === 'INDEXING' ? 4 : 2;
        setCurrentStageIndex(stageIdx);
        setLogs(prev => [...prev, `[${((Date.now() - startTimeRef.current) / 1000).toFixed(2)}s] ${job.message}`]);
      });

      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      setCurrentStageIndex(4);
      setCompletedDoc(liveDoc);
      showToast('success', 'Document Ingested & Verified', `Processed ${liveDoc.title} and saved to audit ledger.`);
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);
      showToast('error', 'Ingestion Pipeline Error', err.message || 'Failed to upload document');
    }
  };

  return (
    <div 
      id="upload-pipeline-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0E]/80 backdrop-blur-sm"
    >
      <div 
        id="upload-pipeline-modal" 
        className="w-full max-w-2xl bg-[#141518] border border-[#2A2C31] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2C31] bg-[#141518]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#16171B] border border-[#2A2C31] flex items-center justify-center text-[#C5B358]">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif italic text-base text-[#E5E5E5]">Multimodal Ingestion Pipeline</h3>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E9097]">Asynchronous OCR, Invariant Validation &amp; Vector Indexing</p>
            </div>
          </div>
          <button
            id="close-upload-modal-button"
            onClick={onClose}
            className="text-[#8E9097] hover:text-[#E5E5E5] p-1.5 rounded-md border border-[#2A2C31] bg-[#16171B] hover:bg-[#2A2C31] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!isProcessing && !completedDoc ? (
            <div className="space-y-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#8E9097] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C5B358]" />
                Select Industry Sample Document or Upload Custom File
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  id="preset-invoice-button"
                  onClick={() => handleLaunchPreset('preset-invoice')}
                  className="flex flex-col text-left p-4 rounded-xl border border-[#2A2C31] bg-[#16171B] hover:border-[#C5B358] transition-all group cursor-pointer shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full border border-[#C5B358]/40 bg-[#C5B358]/10 text-[#C5B358] font-mono uppercase tracking-wider font-semibold">
                      Math Invariant Flag
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8E9097] group-hover:text-[#C5B358] transition-colors" />
                  </div>
                  <h4 className="text-xs font-semibold text-[#E5E5E5] group-hover:text-[#C5B358] font-serif">
                    SaaS Cloud Hosting Invoice
                  </h4>
                  <p className="text-[11px] text-[#8E9097] mt-1 leading-relaxed">
                    Test case with unallocated +$2,250 surcharge triggering deterministic invariant detection.
                  </p>
                </button>

                <button
                  id="preset-msa-button"
                  onClick={() => handleLaunchPreset('preset-msa')}
                  className="flex flex-col text-left p-4 rounded-xl border border-[#2A2C31] bg-[#16171B] hover:border-[#C5B358] transition-all group cursor-pointer shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full border border-[#D9534F]/40 bg-[#D9534F]/10 text-[#D9534F] font-mono uppercase tracking-wider font-semibold">
                      Legal Ops Risk
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8E9097] group-hover:text-[#C5B358] transition-colors" />
                  </div>
                  <h4 className="text-xs font-semibold text-[#E5E5E5] group-hover:text-[#C5B358] font-serif">
                    Enterprise MSA Contract
                  </h4>
                  <p className="text-[11px] text-[#8E9097] mt-1 leading-relaxed">
                    Multi-page agreement evaluated for unlimited liability indemnity and signature annexes.
                  </p>
                </button>

                <button
                  id="preset-duplicate-button"
                  onClick={() => handleLaunchPreset('preset-duplicate')}
                  className="flex flex-col text-left p-4 rounded-xl border border-[#2A2C31] bg-[#16171B] hover:border-[#C5B358] transition-all group cursor-pointer shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full border border-[#C5B358]/40 bg-[#16171B] text-[#C5B358] font-mono uppercase tracking-wider font-semibold">
                      Fraud Guardrail
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8E9097] group-hover:text-[#C5B358] transition-colors" />
                  </div>
                  <h4 className="text-xs font-semibold text-[#E5E5E5] group-hover:text-[#C5B358] font-serif">
                    Duplicate Ledger Collision
                  </h4>
                  <p className="text-[11px] text-[#8E9097] mt-1 leading-relaxed">
                    Tests SHA-256 cryptographic hash matching to prevent accounts payable double-billing.
                  </p>
                </button>

                <button
                  id="preset-nda-button"
                  onClick={() => handleLaunchPreset('preset-nda')}
                  className="flex flex-col text-left p-4 rounded-xl border border-[#2A2C31] bg-[#16171B] hover:border-[#C5B358] transition-all group cursor-pointer shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full border border-[#C5B358]/40 bg-[#C5B358]/10 text-[#C5B358] font-mono uppercase tracking-wider font-semibold">
                      STP Clean Baseline
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8E9097] group-hover:text-[#C5B358] transition-colors" />
                  </div>
                  <h4 className="text-xs font-semibold text-[#E5E5E5] group-hover:text-[#C5B358] font-serif">
                    Bilateral Mutual NDA
                  </h4>
                  <p className="text-[11px] text-[#8E9097] mt-1 leading-relaxed">
                    Compliant contract meeting straight-through processing thresholds with zero anomalies.
                  </p>
                </button>
              </div>

              {/* Drag and Drop Custom File Section */}
              <div className="pt-2">
                <label 
                  id="custom-file-dropzone"
                  htmlFor="custom-file-input"
                  className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-[#2A2C31] hover:border-[#C5B358] bg-[#0B0C0E] hover:bg-[#16171B] cursor-pointer transition-all"
                >
                  <FileText className="w-6 h-6 text-[#8E9097] mb-2" />
                  <span className="text-xs font-medium text-[#E5E5E5]">Drop PDF / TIFF document or click to browse</span>
                  <span className="text-[10px] text-[#8E9097] font-mono mt-0.5">Supports PDF, PNG, JPEG, TIFF up to 25MB</span>
                  <input
                    id="custom-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.tiff"
                    onChange={handleCustomFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            /* Live Stepper and Telemetry */
            <div className="space-y-6">
              {/* Progress Summary Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#C5B358] flex items-center gap-1.5">
                    <Loader2 className={`w-3.5 h-3.5 ${progress < 100 ? 'animate-spin' : ''}`} />
                    Job Telemetry: {(elapsedMs / 1000).toFixed(2)}s Elapsed
                  </div>
                  <h4 className="font-serif italic text-base text-[#E5E5E5] mt-1">
                    {progress < 100 ? 'Processing Ingestion Micro-Stages...' : 'Ingestion Completed &amp; Verified'}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono text-[#C5B358]">{progress}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#0B0C0E] border border-[#2A2C31] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#C5B358] h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* 5-Stage Micro Stepper */}
              <div className="space-y-2">
                {STAGES.map((st, idx) => {
                  const isDone = progress >= st.targetProgress;
                  const isCurrent = currentStageIndex === idx && progress < 100;
                  
                  return (
                    <div
                      key={st.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        isCurrent
                          ? 'bg-[#16171B] border-[#C5B358] text-[#E5E5E5]'
                          : isDone
                          ? 'bg-[#141518] border-[#2A2C31] text-[#E5E5E5]'
                          : 'bg-[#0B0C0E] border-[#2A2C31]/40 text-[#8E9097]'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C5B358]" />
                        ) : isCurrent ? (
                          <Loader2 className="w-3.5 h-3.5 text-[#C5B358] animate-spin" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded border border-[#2A2C31] flex items-center justify-center text-[9px] font-mono text-[#8E9097]">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-medium tracking-tight">{st.label}</h5>
                          <span className="text-[10px] font-mono text-[#8E9097]">Stage {idx + 1}/5</span>
                        </div>
                        <p className="text-[11px] text-[#8E9097] mt-0.5 leading-snug">{st.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Terminal Logs Telemetry Stream */}
              <div className="border border-[#2A2C31] bg-[#0B0C0E] rounded-lg p-3 font-mono text-xs text-[#8E9097] max-h-36 overflow-y-auto space-y-1">
                <div className="text-[9px] uppercase tracking-widest text-[#8E9097] pb-1 border-b border-[#2A2C31]">
                  Real-Time Daemon Stream (/var/log/docintel/ingest.log)
                </div>
                {logs.map((log, i) => (
                  <div key={i} className="text-[#8E9097] leading-tight text-[11px]">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2C31] bg-[#141518]">
          <span className="text-[11px] text-[#8E9097] font-mono">
            {completedDoc ? 'Ready for Human-in-the-Loop calibration' : 'Dual-pathway text + multimodal vision'}
          </span>
          {completedDoc ? (
            <button
              id="view-processed-document-button"
              onClick={() => {
                onDocumentCreated(completedDoc);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C5B358] hover:bg-[#D8C76D] text-[#0B0C0E] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              Open in Review Console
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              id="cancel-upload-button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-3.5 py-1.5 rounded-lg border border-[#2A2C31] bg-[#16171B] text-[#8E9097] hover:text-[#E5E5E5] text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
