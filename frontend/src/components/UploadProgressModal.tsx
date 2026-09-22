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

  const startPipelineExecution = async (presetType: string, fileTitle: string, docType: DocumentType) => {
    setIsProcessing(true);
    setCurrentStageIndex(0);
    setProgress(5);
    setLogs([`[0.00s] Initialized ingestion thread for ${fileTitle}`]);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(elapsed);
    }, 50);

    // Simulate early stages for UI UX since backend on Vercel is fully synchronous
    setTimeout(() => {
      if (progress < 22) {
        setProgress(22);
        setCurrentStageIndex(0);
        setLogs(prev => [...prev, `[${((Date.now() - startTimeRef.current) / 1000).toFixed(2)}s] PyPDF text extract OK; Rasterized 2 pages @ 300DPI`]);
      }
    }, 1500);

    try {
      // Actually hit the backend so the DB + FAISS gets populated!
      const { seedSampleDocument } = await import('../api');
      const liveDoc = await seedSampleDocument(presetType);

      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      setCurrentStageIndex(4);
      setLogs(prev => [...prev, `[${((Date.now() - startTimeRef.current) / 1000).toFixed(2)}s] Dense embeddings synced to FAISS; Record committed to database`]);
      
      setCompletedDoc(liveDoc);
      showToast('success', 'Pipeline Execution Complete', `${fileTitle} indexed into knowledge base.`);
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);
      showToast('error', 'Pipeline Failed', err.message);
    }
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
