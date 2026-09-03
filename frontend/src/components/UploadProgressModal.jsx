import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X 
} from 'lucide-react';
import { getUploadStatus } from '../api';

const STAGES = [
  { key: 'INGESTING', label: 'Document Ingestion', desc: 'OCR text-layer & vision page rasterization', icon: FileText },
  { key: 'CLASSIFYING', label: 'Taxonomy Classification', desc: 'Determining invoice, contract, or compliance', icon: Layers },
  { key: 'EXTRACTING', label: 'Structured Extraction', desc: 'Calibrated field confidence scoring', icon: Sparkles },
  { key: 'ANOMALY_DETECTION', label: 'Anomaly & Fraud Checks', desc: 'Math invariants, signatures, IBAN checks', icon: ShieldCheck },
  { key: 'INDEXING', label: 'Vector Indexing & Audit', desc: 'FAISS embeddings & SQLite audit persistence', icon: Database },
];

export default function UploadProgressModal({ isOpen, jobId, filename, onComplete, onClose }) {
  const [statusData, setStatusData] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !jobId) return;

    setStatusData({
      stage: 'QUEUED',
      progress: 0.05,
      message: 'Initializing multimodal intelligence pipeline...',
      status: 'processing'
    });
    setElapsedSec(0);
    setError(null);

    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    let pollInterval = setInterval(async () => {
      try {
        const data = await getUploadStatus(jobId);
        setStatusData(data);

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          clearInterval(timer);
          setTimeout(() => {
            if (onComplete) {
              onComplete(data.result?.doc_id || jobId);
            }
          }, 1000);
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          clearInterval(timer);
          setError(data.error || data.message || 'Pipeline failed during processing');
        }
      } catch (err) {
        console.error('Polling upload status error:', err);
      }
    }, 800);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [isOpen, jobId]);

  if (!isOpen) return null;

  const currentStage = statusData?.stage || 'QUEUED';
  const progressPct = Math.round((statusData?.progress || 0.05) * 100);
  const isCompleted = statusData?.status === 'completed';

  const getStepState = (stepKey, stepIndex) => {
    const stageOrder = ['QUEUED', 'INGESTING', 'CLASSIFYING', 'EXTRACTING', 'ANOMALY_DETECTION', 'INDEXING', 'COMPLETED'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const targetIndex = stageOrder.indexOf(stepKey);

    if (isCompleted || currentIndex > targetIndex) return 'done';
    if (currentIndex === targetIndex) return 'active';
    return 'pending';
  };

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-blue)' }}>
                  Asynchronous Ingestion Pipeline
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  • {elapsedSec}s elapsed
                </span>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px', letterSpacing: '-0.01em' }}>
                {filename || 'Processing Document'}
              </h3>
            </div>

            {error && (
              <button 
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <span>{statusData?.message || 'Processing...'}</span>
              <span>{progressPct}%</span>
            </div>
            <div 
              style={{
                height: '6px',
                width: '100%',
                backgroundColor: 'var(--bg-surface-subtle)',
                borderRadius: '9999px',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: error 
                    ? '#ef4444' 
                    : isCompleted 
                    ? '#10b981' 
                    : 'linear-gradient(90deg, var(--brand-blue), #3b82f6)',
                  borderRadius: '9999px',
                }}
              />
            </div>
          </div>

          {/* 5-Stage Stepper List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {STAGES.map((step, idx) => {
              const state = getStepState(step.key, idx);
              const StepIcon = step.icon;

              let iconColor = 'var(--text-muted)';
              let bg = 'var(--bg-surface-subtle)';
              let titleColor = 'var(--text-muted)';

              if (state === 'done') {
                iconColor = '#10b981';
                bg = 'rgba(16, 185, 129, 0.12)';
                titleColor = 'var(--text-primary)';
              } else if (state === 'active') {
                iconColor = 'var(--brand-blue)';
                bg = 'rgba(59, 130, 246, 0.12)';
                titleColor = 'var(--text-primary)';
              }

              return (
                <div 
                  key={step.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    backgroundColor: state === 'active' ? 'var(--bg-surface-subtle)' : 'transparent',
                    border: state === 'active' ? '1px solid var(--border-subtle)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {state === 'done' ? (
                      <CheckCircle2 size={18} color="#10b981" />
                    ) : state === 'active' ? (
                      <Loader2 size={18} color="var(--brand-blue)" className="animate-spin" />
                    ) : (
                      <StepIcon size={16} color={iconColor} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: state === 'active' ? '700' : '600', color: titleColor }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {step.desc}
                    </div>
                  </div>

                  {state === 'active' && (
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--brand-blue)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Running
                    </span>
                  )}
                  {state === 'done' && (
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#10b981' }}>
                      Passed
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error Banner */}
          {error && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '12.5px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{error}</span>
              <button 
                className="btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '11.5px', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}

          {/* Success Banner */}
          {isCompleted && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '12.5px',
                fontWeight: '600',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>Pipeline complete — loading document view...</span>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
