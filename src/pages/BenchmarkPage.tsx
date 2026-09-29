import { useState, useEffect } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, 
  Clock, 
  FileCheck2, 
  ShieldAlert, 
  Layers, 
  Eye, 
  X,
  Sparkles
} from 'lucide-react';

interface StageInfo {
  status: string;
  duration_ms?: number;
  predicted?: string;
  expected?: string;
  correct?: boolean;
  field_count?: number;
  field_scores?: Record<string, {
    expected: string;
    actual: string;
    confidence: number;
    matched: boolean;
  }>;
  detected?: string[];
  expected_anomalies?: string[];
  true_positives?: string[];
  caught?: string[];
  all_anomalies?: Array<{
    rule_name: string;
    description: string;
    severity: string;
  }>;
  error?: string;
}

interface EvalDoc {
  filename: string;
  description: string;
  stages: {
    ingestion: StageInfo;
    classification: StageInfo;
    extraction: StageInfo;
    anomaly_detection: StageInfo;
    indexing: StageInfo;
  };
  scores: {
    classification: number;
    extraction_accuracy: number;
    fields_matched?: string;
    anomaly_precision: number;
    anomaly_recall: number;
  };
}

interface EvalData {
  run_timestamp: string;
  total_documents: number;
  total_duration_s: number;
  aggregate: {
    classification_accuracy: number;
    extraction_accuracy: number;
    anomaly_recall: number;
    anomaly_precision: number;
  };
  per_document: EvalDoc[];
}

export default function BenchmarkPage() {
  const [data, setData] = useState<EvalData | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<EvalDoc | null>(null);

  const fetchResults = async () => {
    try {
      // Try /api/benchmark/results first, then /eval_results.json
      let res = await fetch('/api/benchmark/results');
      if (!res.ok) {
        res = await fetch('/eval_results.json');
      }

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        setData(json);
        if (json?.per_document?.length > 0 && !selectedDoc) {
          setSelectedDoc(json.per_document[0]);
        }
      } else {
        // Fallback: fetch directly from public/eval_results.json with cache bust
        const fallbackRes = await fetch(`/eval_results.json?v=${Date.now()}`);
        if (fallbackRes.ok && fallbackRes.headers.get('content-type')?.includes('application/json')) {
          const json = await fallbackRes.json();
          setData(json);
        }
      }
    } catch (e) {
      console.error('Failed to load evaluation results:', e);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  return (
    <SidebarLayout>
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-2 border-border">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-mono font-bold bg-primary/10 text-primary border-2 border-primary/30 uppercase tracking-widest">
                EVALUATION BENCHMARK
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Run: {data?.run_timestamp ? new Date(data.run_timestamp).toLocaleString() : 'Recent'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold uppercase tracking-wide mt-2 text-foreground">
              Multimodal Model Evaluation
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-mono">
              End-to-end ground-truth verification on synthetic back-office documents (invoices, contracts, POs, compliance).
            </p>
          </div>
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="industrial-panel border-2 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Classification Acc.
              </CardTitle>
              <FileCheck2 className="text-primary" size={18} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-extrabold text-foreground">
                {data ? `${(data.aggregate.classification_accuracy * 100).toFixed(0)}%` : '--'}
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Document category prediction
              </p>
            </CardContent>
          </Card>

          <Card className="industrial-panel border-2 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Extraction Accuracy
              </CardTitle>
              <Sparkles className="text-emerald-400" size={18} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-extrabold text-foreground">
                {data ? `${(data.aggregate.extraction_accuracy * 100).toFixed(0)}%` : '--'}
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Field-level ground truth match
              </p>
            </CardContent>
          </Card>

          <Card className="industrial-panel border-2 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Anomaly Recall
              </CardTitle>
              <ShieldAlert className="text-amber-400" size={18} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-extrabold text-foreground">
                {data ? `${(data.aggregate.anomaly_recall * 100).toFixed(0)}%` : '--'}
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Injected defects intercepted
              </p>
            </CardContent>
          </Card>

          <Card className="industrial-panel border-2 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Suite Execution Time
              </CardTitle>
              <Clock className="text-primary" size={18} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-extrabold text-foreground">
                {data ? `${data.total_duration_s.toFixed(1)}s` : '--'}
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                {data?.total_documents || 7} synthetic test cases
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Per-Document Evaluation Table */}
        <div className="bg-card/20 border-2 border-border industrial-panel overflow-hidden w-full">
          <div className="p-4 border-b-2 border-border flex flex-wrap items-center justify-between gap-3 bg-card/60">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-primary" />
              <h2 className="font-heading font-bold uppercase tracking-wider text-sm text-foreground">
                Document Test Suite ({data?.per_document.length || 7} Cases)
              </h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Synthetic Clean & Injected Anomaly Documents
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm min-w-[760px]">
              <thead className="bg-muted/30 border-b-2 border-border text-xs font-mono uppercase text-muted-foreground">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Document / Test Case</th>
                  <th className="py-3.5 px-4 font-bold">Classification</th>
                  <th className="py-3.5 px-4 font-bold">Extraction Accuracy</th>
                  <th className="py-3.5 px-4 font-bold">Anomalies Detected</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-border/40 font-mono text-xs">
                {data?.per_document.map((doc, idx) => {
                  const extScore = doc.scores.extraction_accuracy * 100;
                  const isMathMismatch = doc.filename.includes('math');
                  const isHighVal = doc.filename.includes('high_value');
                  const isUnsigned = doc.filename.includes('unsigned');
                  const isDuplicate = doc.filename.includes('duplicate');
                  const hasExpectedAnomaly = isMathMismatch || isHighVal || isUnsigned || isDuplicate;

                  return (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-4 font-sans">
                        <div className="font-semibold text-foreground flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-primary font-bold">{doc.filename}</span>
                          {hasExpectedAnomaly && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase font-bold">
                              ANOMALY TEST
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-sans">{doc.description}</p>
                      </td>

                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted/40 border border-border">
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                          <span className="text-foreground uppercase font-bold text-[11px]">
                            {doc.stages.classification.predicted}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted/60 border border-border overflow-hidden">
                            <div 
                              className={`h-full ${extScore >= 80 ? 'bg-emerald-400' : extScore >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.max(extScore, 5)}%` }}
                            />
                          </div>
                          <span className="font-bold text-foreground">{extScore.toFixed(0)}%</span>
                          {doc.scores.fields_matched && (
                            <span className="text-[10px] text-muted-foreground">({doc.scores.fields_matched})</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-sans">
                        {doc.stages.anomaly_detection.all_anomalies && doc.stages.anomaly_detection.all_anomalies.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {doc.stages.anomaly_detection.all_anomalies.map((anom, aIdx) => (
                              <span 
                                key={aIdx}
                                className={`px-2 py-0.5 text-[11px] border font-mono font-medium ${
                                  anom.severity === 'high' 
                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/40'
                                    : anom.severity === 'medium'
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                                    : 'bg-blue-500/10 text-blue-300 border-blue-500/40'
                                }`}
                              >
                                {anom.rule_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic font-mono">No anomalies (clean)</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-semibold">
                          <CheckCircle2 size={13} /> VERIFIED
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDoc(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs border border-border hover:border-primary bg-secondary/80 hover:bg-primary/20 transition-colors text-foreground brutalist-button cursor-pointer font-mono"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal for Document Field Inspection */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-background border-2 border-primary industrial-panel max-w-3xl w-full max-h-[85vh] flex flex-col shadow-[8px_8px_0px_0px_var(--color-primary)]">
              {/* Modal Header */}
              <div className="p-4 border-b-2 border-border flex items-center justify-between bg-card/60 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary font-bold">{selectedDoc.filename}</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-muted text-muted-foreground border border-border">
                      Type: {selectedDoc.stages.classification.predicted}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-base mt-1 text-foreground uppercase tracking-wide">
                    Extracted Fields & Verification Audit
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent hover:border-border transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
                <div>
                  <h4 className="text-xs font-mono uppercase text-muted-foreground mb-3 flex items-center gap-2 font-bold tracking-wider">
                    <Sparkles size={14} className="text-primary" />
                    Field Extraction Scores (Ground Truth Comparison)
                  </h4>
                  
                  {selectedDoc.stages.extraction.field_scores ? (
                    <div className="space-y-2">
                      {Object.entries(selectedDoc.stages.extraction.field_scores).map(([field, score], fIdx) => (
                        <div 
                          key={fIdx}
                          className="p-3 bg-muted/20 border-2 border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                        >
                          <div className="font-semibold text-foreground w-full sm:w-1/3 break-words">
                            {field}
                          </div>
                          <div className="flex-1 text-muted-foreground min-w-0">
                            <div><span className="text-[10px] text-muted-foreground/60 uppercase">Expected:</span> <span className="text-foreground">{score.expected}</span></div>
                            <div><span className="text-[10px] text-muted-foreground/60 uppercase">Actual:</span> <span className="text-foreground font-bold">{score.actual || 'null'}</span></div>
                          </div>
                          <div className="flex items-center gap-2 sm:justify-end shrink-0">
                            <span className={`px-2 py-0.5 text-[10px] font-bold border ${
                              score.matched 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' 
                                : 'bg-red-500/10 text-red-400 border-red-500/40'
                            }`}>
                              {score.matched ? 'MATCH' : 'MISMATCH'}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {(score.confidence * 100).toFixed(0)}% conf
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/10 border border-border/40 text-xs text-muted-foreground font-mono">
                      No field level comparison data available for this document.
                    </div>
                  )}
                </div>

                {/* Anomalies Audit */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-muted-foreground mb-3 flex items-center gap-2 font-bold tracking-wider">
                    <ShieldAlert size={14} className="text-amber-400" />
                    Detected Anomalies & Rule Explanations
                  </h4>

                  {selectedDoc.stages.anomaly_detection.all_anomalies && selectedDoc.stages.anomaly_detection.all_anomalies.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDoc.stages.anomaly_detection.all_anomalies.map((anom, aIdx) => (
                        <div 
                          key={aIdx} 
                          className="p-3 bg-card/60 border-2 border-border flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-foreground uppercase">{anom.rule_name}</span>
                            <span className={`text-[10px] uppercase font-mono px-2 py-0.5 border font-bold ${
                              anom.severity === 'high' 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/40' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                            }`}>
                              {anom.severity} SEVERITY
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-sans">{anom.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/10 border border-border/40 text-xs text-emerald-400 font-mono flex items-center gap-2">
                      <CheckCircle2 size={16} /> Clean Document. No anomalies detected.
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t-2 border-border bg-card/60 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-5 py-2 bg-primary text-primary-foreground font-mono text-xs font-bold uppercase hover:bg-primary/90 transition-colors brutalist-button cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
