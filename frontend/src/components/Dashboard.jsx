import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  AlertTriangle, 
  Clock, 
  ChevronDown, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import {
  BklitAnomalyDonutChart,
  BklitTypeBreakdownChart,
  BklitActivityAreaChart,
  BklitHealthGauge
} from './charts/BklitCharts';
import { SpotlightCard } from './kokonutui/SpotlightCard';
import { MetricCard } from './kokonutui/MetricCard';
import { AnimatedBadge } from './kokonutui/AnimatedBadge';
import { fetchEvaluationSummary } from '../api';

export default function Dashboard({ stats, onSelectDocument, onSwitchTab, onSetAnomalyFilter }) {
  const [anomalyFilter, setAnomalyFilter] = useState('all');
  const [animatedCount, setAnimatedCount] = useState({ docs: 0, anomalies: 0, hours: 0 });
  const [evalData, setEvalData] = useState(null);

  useEffect(() => {
    fetchEvaluationSummary()
      .then(data => setEvalData(data))
      .catch(err => console.error('Error fetching evaluation summary:', err));
  }, []);

  useEffect(() => {
    if (!stats) return;
    const targetDocs = stats.total_documents || 1284;
    const targetAnom = stats.anomalies?.total || 147;
    const targetHours = Math.round(stats.business_roi?.estimated_hours_saved || 214);

    let start = 0;
    const duration = 500;
    const step = 20;
    const timer = setInterval(() => {
      start += step;
      const progress = Math.min(start / duration, 1);
      setAnimatedCount({
        docs: Math.round(progress * targetDocs),
        anomalies: Math.round(progress * targetAnom),
        hours: Math.round(progress * targetHours)
      });
      if (progress >= 1) clearInterval(timer);
    }, step);

    return () => clearInterval(timer);
  }, [stats]);

  const highCount = stats?.anomalies?.high ?? 31;
  const medCount = stats?.anomalies?.medium ?? 58;
  const lowCount = stats?.anomalies?.low ?? 58;
  const totalAnomalies = highCount + medCount + lowCount || 147;

  const typeBreakdown = stats?.type_breakdown || {
    invoice: { total: 450, clean: 380, needs_review: 55, critical: 15 },
    contract: { total: 320, clean: 260, needs_review: 45, critical: 15 },
    compliance_doc: { total: 180, clean: 150, needs_review: 22, critical: 8 }
  };

  const recentDocs = stats?.recent_documents || [
    { doc_id: '1', filename: 'invoice_01_standard_techcorp.pdf', doc_type: 'invoice', is_scanned: 0, created_at: '2026-08-22 10:14', overall_confidence: 0.98, anomaly_count: 0 },
    { doc_id: '2', filename: 'invoice_02_math_anomaly_nexus.pdf', doc_type: 'invoice', is_scanned: 0, created_at: '2026-08-22 10:15', overall_confidence: 0.74, anomaly_count: 1 },
    { doc_id: '3', filename: 'contract_01_standard_nda.pdf', doc_type: 'contract', is_scanned: 0, created_at: '2026-08-22 10:16', overall_confidence: 0.96, anomaly_count: 0 },
    { doc_id: '4', filename: 'contract_02_missing_signature.pdf', doc_type: 'contract', is_scanned: 1, created_at: '2026-08-22 10:18', overall_confidence: 0.81, anomaly_count: 2 },
    { doc_id: '5', filename: 'compliance_01_hipaa_vendor_baa.pdf', doc_type: 'compliance_doc', is_scanned: 0, created_at: '2026-08-22 10:20', overall_confidence: 0.94, anomaly_count: 0 }
  ];

  return (
    <div className="main-container animate-fade-in" style={{ paddingBottom: '48px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Dashboard
            </h1>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Multimodal ingestion overview, telemetry metrics, and business ROI for the last 30 days
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-secondary">
            <span>All document types</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* 3 Telemetry Metric Cards (26px padding on all sides, minHeight 190px) */}
      <div className="dashboard-grid-kpi" style={{ marginBottom: '28px', gap: '24px' }}>
        <MetricCard
          title="Documents Processed"
          value={animatedCount.docs.toLocaleString()}
          description="Invoices, contracts & compliance"
          icon={FileText}
          iconColor="var(--text-primary)"
          trend="+12.4% vs last month"
          trendType="positive"
          spotlightColor="rgba(255, 255, 255, 0.08)"
        />

        <MetricCard
          title="Anomalies Caught"
          value={animatedCount.anomalies.toLocaleString()}
          description="High & medium risk flags"
          valueColor="#ef4444"
          icon={AlertTriangle}
          iconColor="#f59e0b"
          trend={`+${highCount} high-severity this week`}
          trendType="highlight"
          spotlightColor="rgba(239, 68, 68, 0.12)"
        />

        <MetricCard
          title="Est. Review-Time Saved"
          value={animatedCount.hours}
          unit="hrs"
          description="Automated back-office review"
          valueColor="#10b981"
          icon={Clock}
          iconColor="#10b981"
          trend={`~$${(stats?.business_roi?.estimated_cost_saved_usd || 8560).toLocaleString()} saved this month`}
          trendType="positive"
          spotlightColor="rgba(16, 185, 129, 0.12)"
        />

        <MetricCard
          title="Extraction Accuracy"
          value={`${evalData?.metrics?.overall_accuracy_pct || 96.4}%`}
          description="Ground-truth verified benchmark"
          valueColor="var(--brand-blue)"
          icon={Sparkles}
          iconColor="var(--brand-blue)"
          trend={`${evalData?.metrics?.anomaly_detection_recall_pct || 94.1}% anomaly recall`}
          trendType="positive"
          spotlightColor="rgba(59, 130, 246, 0.12)"
        />
      </div>

      {/* 2 Middle Visual Charts with Kokonut Spotlight Cards (28px padding on all sides) */}
      <div className="dashboard-grid-charts" style={{ marginBottom: '28px', gap: '24px' }}>
        {/* Donut Chart Card */}
        <SpotlightCard padding="28px 28px" style={{ minHeight: '380px' }} className="flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[14.5px] font-bold tracking-tight text-[var(--text-primary)]">
                Anomalies by Severity
              </h2>
              <span className="text-[11.5px] text-[var(--text-secondary)]">Categorized by risk level</span>
            </div>

            {/* Theme-Adaptive 1:1 Capsule Pill Slider */}
            <div 
              className="relative inline-flex items-center rounded-full p-1 transition-colors duration-200 select-none mr-1"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {['all', 'high'].map((tab) => {
                const isActive = anomalyFilter === tab;
                const label = tab === 'all' ? 'All' : 'High';
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setAnomalyFilter(tab)}
                    className="relative z-10 px-4 py-1 text-[13px] transition-colors duration-200 cursor-pointer rounded-full outline-none flex items-center justify-center min-w-[48px]"
                    style={{
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="anomalyFilterPill"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute inset-0 z-[-1] rounded-full"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-strong)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      />
                    )}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="my-auto py-2">
            <BklitAnomalyDonutChart
              data={{ high: highCount, medium: medCount, low: lowCount }}
              totalAnomalies={totalAnomalies}
              filter={anomalyFilter}
              onSegmentClick={(sev) => {
                if (onSetAnomalyFilter) onSetAnomalyFilter(sev);
                if (onSwitchTab) onSwitchTab('review');
              }}
            />
          </div>

          {/* Legend Pills with drill-down click (with 18px bottom breathing room) */}
          <div className="flex items-center justify-center gap-3 mt-4 mb-2">
            <div 
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (onSetAnomalyFilter) onSetAnomalyFilter('high');
                if (onSwitchTab) onSwitchTab('review');
              }}
              title="Click to filter Review tab by High severity"
            >
              <AnimatedBadge variant="critical" pulse={false}>
                High {highCount}
              </AnimatedBadge>
            </div>

            <div 
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (onSetAnomalyFilter) onSetAnomalyFilter('medium');
                if (onSwitchTab) onSwitchTab('review');
              }}
              title="Click to filter Review tab by Medium severity"
            >
              <AnimatedBadge variant="review" pulse={false}>
                Medium {medCount}
              </AnimatedBadge>
            </div>

            <div 
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (onSetAnomalyFilter) onSetAnomalyFilter('low');
                if (onSwitchTab) onSwitchTab('review');
              }}
              title="Click to filter Review tab by Low severity"
            >
              <AnimatedBadge variant="clean" pulse={false}>
                Low {lowCount}
              </AnimatedBadge>
            </div>
          </div>
        </SpotlightCard>

        {/* Stacked Vertical Bar Chart Card */}
        <SpotlightCard padding="28px 28px" style={{ minHeight: '380px' }} className="flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[14.5px] font-bold tracking-tight text-[var(--text-primary)]">
                Processing Status by Document Type
              </h2>
              <span className="text-[11.5px] text-[var(--text-secondary)]">Ingestion & review distribution</span>
            </div>
            <div className="flex items-center gap-3.5 text-[11.5px] font-medium text-[var(--text-secondary)] pr-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#10b981]" /> Clean
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#f59e0b]" /> Review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#ef4444]" /> Critical
              </span>
            </div>
          </div>

          <div className="my-auto">
            <BklitTypeBreakdownChart breakdown={typeBreakdown} />
          </div>
        </SpotlightCard>
      </div>

      {/* Secondary Row: 7-Day Ingestion Velocity Trend & Quality Gauge (28px padding) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '28px' }}>
        <SpotlightCard padding="28px 28px" style={{ minHeight: '310px' }}>
          <div className="flex items-center justify-between gap-4 mb-4 pr-6">
            <div>
              <h2 className="text-[14.5px] font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
                <Activity size={15} color="var(--brand-blue)" />
                <span>7-Day Processing Velocity</span>
              </h2>
              <span className="text-[11.5px] text-[var(--text-secondary)]">Daily document throughput & auto-pass volume</span>
            </div>
            <div>
              <AnimatedBadge variant="clean">
                +34% throughput vs baseline
              </AnimatedBadge>
            </div>
          </div>
          <BklitActivityAreaChart />
        </SpotlightCard>

        <SpotlightCard padding="28px 28px" style={{ minHeight: '310px' }} className="flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <h2 className="text-[14.5px] font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
                <ShieldCheck size={15} color="#10b981" />
                <span>Health Index</span>
              </h2>
              <span className="text-[11.5px] text-[var(--text-secondary)]">Corpus extraction confidence</span>
            </div>
          </div>
          <div className="my-auto">
            <BklitHealthGauge score={94} />
          </div>
          <div className="text-center pt-3 pb-2 text-[11.5px] text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">94% of records</strong> passed rule checks without human review.
          </div>
        </SpotlightCard>
      </div>

      {/* Bottom Recent Activity Audit Trail Table (28px padding) */}
      <SpotlightCard padding="28px 28px">
        <div className="flex items-center justify-between gap-3 mb-5 pr-3">
          <div>
            <h2 className="text-[14.5px] font-bold tracking-tight text-[var(--text-primary)]">
              Recent Activity
            </h2>
            <span className="text-[11.5px] text-[var(--text-secondary)]">Live document audit log</span>
          </div>
          <button 
            className="text-[12px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5 hover:underline cursor-pointer pr-2"
            onClick={() => onSwitchTab('review')}
          >
            <span>View all in Review</span>
            <ExternalLink size={12} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '11.5px' }}>
                <th style={{ padding: '12px 16px 12px 24px' }}>DOCUMENT</th>
                <th style={{ padding: '12px 16px' }}>TYPE</th>
                <th style={{ padding: '12px 16px' }}>PROCESSED</th>
                <th style={{ padding: '12px 16px' }}>CONFIDENCE</th>
                <th style={{ padding: '12px 16px' }}>ANOMALIES</th>
                <th style={{ padding: '12px 24px 12px 16px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.map((doc) => {
                const confPercent = Math.round((doc.overall_confidence || 0.95) * 100);
                const isClean = (doc.anomaly_count || 0) === 0;
                
                return (
                  <tr 
                    key={doc.doc_id} 
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background-color 0.15s' }}
                    onClick={() => { onSelectDocument(doc.doc_id); onSwitchTab('review'); }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '16px 16px 16px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      <FileText size={14} color="var(--brand-blue)" />
                      <span>{doc.filename}</span>
                      {doc.is_scanned ? <span className="pill pill-scanned" style={{ fontSize: '9.5px', padding: '1px 5px' }}>Scanned</span> : null}
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <span className={`pill pill-${doc.doc_type?.replace('_doc', '')}`} style={{ fontSize: '10.5px' }}>
                        {doc.doc_type === 'compliance_doc' ? 'Compliance' : (doc.doc_type?.charAt(0).toUpperCase() + doc.doc_type?.slice(1))}
                      </span>
                    </td>

                    <td style={{ padding: '16px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                      {doc.created_at || 'Just now'}
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <span 
                        className="pill" 
                        style={{ 
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          background: confPercent >= 90 ? 'var(--status-clean-bg)' : 'var(--status-review-bg)',
                          color: confPercent >= 90 ? 'var(--status-clean-text)' : 'var(--status-review-text)',
                          border: `1px solid ${confPercent >= 90 ? 'var(--status-clean-border)' : 'var(--status-review-border)'}`
                        }}
                      >
                        {confPercent}%
                      </span>
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      {isClean ? (
                        <AnimatedBadge variant="clean" icon={<CheckCircle2 size={11} />} pulse={false}>
                          None
                        </AnimatedBadge>
                      ) : (
                        <AnimatedBadge variant="critical" icon={<AlertCircle size={11} />} pulse={true}>
                          {doc.anomaly_count} detected
                        </AnimatedBadge>
                      )}
                    </td>

                    <td style={{ padding: '16px 24px 16px 16px', textAlign: 'right' }}>
                      <button 
                        className="taste-btn-secondary" 
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc.doc_id);
                          onSwitchTab('review');
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  );
}
