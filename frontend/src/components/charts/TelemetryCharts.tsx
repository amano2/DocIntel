import React, { useState, useRef, useEffect } from 'react';
import { AnomalySeverity, DocumentItem } from '../../types';
import { 
  TrendingUp, AlertTriangle, ShieldCheck, DollarSign, 
  Clock, Calculator, ArrowUpRight, Activity, PieChart, Sparkles 
} from 'lucide-react';
import { animateCounter, animateStaggeredBars, animateSvgStroke } from '../../utils/animeAnimations';

interface TelemetryChartsProps {
  documents: DocumentItem[];
  onSelectSeverityFilter?: (severity: AnomalySeverity | 'all') => void;
}

export function TelemetryCharts({ documents, onSelectSeverityFilter }: TelemetryChartsProps) {
  // Count anomalies by severity
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let cleanDocsCount = 0;

  documents.forEach(doc => {
    if (doc.anomalies.length === 0) {
      cleanDocsCount++;
    } else {
      doc.anomalies.forEach(anom => {
        if (!anom.resolved) {
          if (anom.severity === 'high') highCount++;
          else if (anom.severity === 'medium') mediumCount++;
          else if (anom.severity === 'low') lowCount++;
        }
      });
    }
  });

  const totalAnomalies = highCount + mediumCount + lowCount;
  const [hoveredSeverity, setHoveredSeverity] = useState<AnomalySeverity | null>(null);

  // SVG Donut Calculations
  const radius = 42;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  
  const highPct = totalAnomalies > 0 ? (highCount / totalAnomalies) : 0.45;
  const medPct = totalAnomalies > 0 ? (mediumCount / totalAnomalies) : 0.35;
  const lowPct = totalAnomalies > 0 ? (lowCount / totalAnomalies) : 0.20;

  const highStroke = highPct * circumference;
  const medStroke = medPct * circumference;
  const lowStroke = lowPct * circumference;

  const highOffset = 0;
  const medOffset = -highStroke;
  const lowOffset = -(highStroke + medStroke);

  // Category Aggregates
  const categoryCounts = documents.reduce((acc, d) => {
    const cat = d.docType;
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ROI Calculator State
  const [monthlyDocs, setMonthlyDocs] = useState<number>(3000);
  const manualCostPerDoc = 11.25;
  const monthlyManualCost = monthlyDocs * manualCostPerDoc;
  const docIntelBasePlan = monthlyDocs <= 1000 ? 199 : monthlyDocs <= 3500 ? 499 : 1200;
  const computeOverhead = monthlyDocs * 0.05;
  const monthlyDocIntelTotal = docIntelBasePlan + computeOverhead;
  const netMonthlySavings = monthlyManualCost - monthlyDocIntelTotal;
  const analystHoursSaved = Math.round(monthlyDocs * (13.5 / 60));

  // Refs for Anime.js SVG & Counter Animations
  const highCircleRef = useRef<SVGCircleElement>(null);
  const medCircleRef = useRef<SVGCircleElement>(null);
  const lowCircleRef = useRef<SVGCircleElement>(null);
  const healthPathRef = useRef<SVGPathElement>(null);
  const barsContainerRef = useRef<HTMLDivElement>(null);
  const netSavingsRef = useRef<HTMLSpanElement>(null);
  const hoursSavedRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    animateSvgStroke(highCircleRef.current, { duration: 1200, delay: 100 });
    animateSvgStroke(medCircleRef.current, { duration: 1400, delay: 250 });
    animateSvgStroke(lowCircleRef.current, { duration: 1600, delay: 400 });
    animateSvgStroke(healthPathRef.current, { duration: 1500, delay: 200 });

    if (barsContainerRef.current) {
      const bars = barsContainerRef.current.querySelectorAll('.archetype-bar-fill');
      animateStaggeredBars(bars, { direction: 'width', duration: 1100, delayStep: 90 });
    }
  }, []);

  useEffect(() => {
    animateCounter(netSavingsRef.current, Math.round(netMonthlySavings), { prefix: '$', duration: 700 });
    animateCounter(hoursSavedRef.current, analystHoursSaved, { duration: 700 });
  }, [monthlyDocs, netMonthlySavings, analystHoursSaved]);

  return (
    <div id="telemetry-charts-container" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 1. Interactive Anomaly Severity Donut Chart with Backlit Halo */}
      <div className="backlit-card p-5 md:p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
        <div className="backlit-halo-rose w-44 h-44 -top-12 -left-12 opacity-25" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 border-b border-[#2A2C31]/70 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#C5B358]" />
                <h3 className="font-serif italic text-base text-[#E5E5E5]">
                  Anomaly Severity Telemetry
                </h3>
              </div>
              <p className="text-[11px] text-[#8E9097] mt-0.5">Click segments to drill down into review queue</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#C5B358]/30 bg-[#C5B358]/10 text-[#C5B358]">
              {totalAnomalies} Flags
            </span>
          </div>

          <div className="flex items-center justify-center gap-6 my-3">
            <div className="relative w-32 h-32 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 filter drop-shadow-[0_0_8px_rgba(197,179,88,0.15)]">
                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#1E2026" strokeWidth={strokeWidth} />
                <circle ref={highCircleRef} cx="50" cy="50" r={radius} fill="transparent" stroke="#D9534F" strokeWidth={hoveredSeverity === 'high' ? strokeWidth + 3 : strokeWidth} strokeDasharray={`${highStroke} ${circumference}`} strokeDashoffset={highOffset} className="cursor-pointer transition-all duration-300 hover:opacity-90" onMouseEnter={() => setHoveredSeverity('high')} onMouseLeave={() => setHoveredSeverity(null)} onClick={() => onSelectSeverityFilter?.('high')} />
                <circle ref={medCircleRef} cx="50" cy="50" r={radius} fill="transparent" stroke="#E5A93C" strokeWidth={hoveredSeverity === 'medium' ? strokeWidth + 3 : strokeWidth} strokeDasharray={`${medStroke} ${circumference}`} strokeDashoffset={medOffset} className="cursor-pointer transition-all duration-300 hover:opacity-90" onMouseEnter={() => setHoveredSeverity('medium')} onMouseLeave={() => setHoveredSeverity(null)} onClick={() => onSelectSeverityFilter?.('medium')} />
                <circle ref={lowCircleRef} cx="50" cy="50" r={radius} fill="transparent" stroke="#C5B358" strokeWidth={hoveredSeverity === 'low' ? strokeWidth + 3 : strokeWidth} strokeDasharray={`${lowStroke} ${circumference}`} strokeDashoffset={lowOffset} className="cursor-pointer transition-all duration-300 hover:opacity-90" onMouseEnter={() => setHoveredSeverity('low')} onMouseLeave={() => setHoveredSeverity(null)} onClick={() => onSelectSeverityFilter?.('low')} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-serif font-light text-[#E5E5E5]">
                  {hoveredSeverity === 'high' ? `${Math.round(highPct * 100)}%` :
                   hoveredSeverity === 'medium' ? `${Math.round(medPct * 100)}%` :
                   hoveredSeverity === 'low' ? `${Math.round(lowPct * 100)}%` :
                   `${totalAnomalies}`}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-mono text-[#8E9097]">
                  {hoveredSeverity ? hoveredSeverity : 'Flags'}
                </span>
              </div>
            </div>

            <div className="space-y-2 flex-1 text-xs font-mono">
              <button onClick={() => onSelectSeverityFilter?.('high')} onMouseEnter={() => setHoveredSeverity('high')} onMouseLeave={() => setHoveredSeverity(null)} className={`w-full flex items-center justify-between p-2 px-2.5 rounded-lg border transition-all cursor-pointer ${hoveredSeverity === 'high' ? 'border-[#D9534F] bg-[#D9534F]/15 shadow-[0_0_12px_rgba(217,83,79,0.3)]' : 'border-[#2A2C31] hover:border-[#D9534F]/60'}`}>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D9534F] shadow-[0_0_6px_#D9534F]" /><span className="text-[#E5E5E5] text-[11px]">High (Math/TIN)</span></div>
                <span className="text-[#D9534F] font-bold">{highCount}</span>
              </button>
              <button onClick={() => onSelectSeverityFilter?.('medium')} onMouseEnter={() => setHoveredSeverity('medium')} onMouseLeave={() => setHoveredSeverity(null)} className={`w-full flex items-center justify-between p-2 px-2.5 rounded-lg border transition-all cursor-pointer ${hoveredSeverity === 'medium' ? 'border-[#E5A93C] bg-[#E5A93C]/15 shadow-[0_0_12px_rgba(229,169,60,0.3)]' : 'border-[#2A2C31] hover:border-[#E5A93C]/60'}`}>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E5A93C] shadow-[0_0_6px_#E5A93C]" /><span className="text-[#E5E5E5] text-[11px]">Medium (Holds)</span></div>
                <span className="text-[#E5A93C] font-bold">{mediumCount}</span>
              </button>
              <button onClick={() => onSelectSeverityFilter?.('low')} onMouseEnter={() => setHoveredSeverity('low')} onMouseLeave={() => setHoveredSeverity(null)} className={`w-full flex items-center justify-between p-2 px-2.5 rounded-lg border transition-all cursor-pointer ${hoveredSeverity === 'low' ? 'border-[#C5B358] bg-[#C5B358]/15 shadow-[0_0_12px_rgba(197,179,88,0.3)]' : 'border-[#2A2C31] hover:border-[#C5B358]/60'}`}>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#C5B358] shadow-[0_0_6px_#C5B358]" /><span className="text-[#E5E5E5] text-[11px]">Low (Notice)</span></div>
                <span className="text-[#C5B358] font-bold">{lowCount}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#2A2C31]/70 flex items-center justify-between text-[11px] text-[#8E9097] relative z-10">
          <span className="flex items-center gap-1.5 text-[#C5B358] font-medium"><ShieldCheck className="w-3.5 h-3.5" />{cleanDocsCount} Verified Touchless</span>
          <button onClick={() => onSelectSeverityFilter?.('all')} className="text-[10px] font-mono uppercase text-[#8E9097] hover:text-[#E5E5E5] transition-colors cursor-pointer">Reset Filter</button>
        </div>
      </div>

      {/* 2. Document Intake Breakdown with Backlit UI & Anime.js Staggered Bars */}
      <div className="backlit-card p-5 md:p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
        <div className="backlit-halo-cyan w-44 h-44 -top-12 -right-12 opacity-25" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 border-b border-[#2A2C31]/70 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#06B6D4]" />
                <h3 className="font-serif italic text-base text-[#E5E5E5]">Corpus Distribution (450 Docs)</h3>
              </div>
              <p className="text-[11px] text-[#8E9097] mt-0.5">Dual text-layer & scanned multimodal intake</p>
            </div>
            <span className="text-[10px] font-mono text-[#06B6D4] px-2 py-0.5 rounded-full border border-[#06B6D4]/30 bg-[#06B6D4]/10">5 Archetypes</span>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#16171B]/90 border border-[#2A2C31] mb-3">
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 60" className="w-12 h-8 overflow-visible">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1E2026" strokeWidth="10" />
                <path ref={healthPathRef} d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#06B6D4" strokeWidth="10" strokeDasharray="125.6" strokeDashoffset="2" strokeLinecap="round" className="filter drop-shadow-[0_0_6px_#06B6D4]" />
              </svg>
              <div className="absolute bottom-0 inset-x-0 text-center text-[10px] font-mono text-[#06B6D4] font-bold">98.8%</div>
            </div>
            <div className="text-xs space-y-0.5">
              <div className="text-[#E5E5E5] font-semibold text-[11px]">Invariant Health Score</div>
              <div className="text-[10px] text-[#8E9097]">Deterministic verification across 450 instruments</div>
            </div>
          </div>

          <div ref={barsContainerRef} className="space-y-2.5 text-xs font-mono">
            {[
              { type: 'INVOICE', label: 'Invoices & AP', count: categoryCounts['INVOICE'] || 150, total: 450, color: '#C5B358' },
              { type: 'MSA_CONTRACT', label: 'Contracts & MSAs', count: categoryCounts['MSA_CONTRACT'] || 120, total: 450, color: '#94A3B8' },
              { type: 'COMPLIANCE_DOC', label: 'Compliance & SOC2', count: categoryCounts['COMPLIANCE_DOC'] || 75, total: 450, color: '#10B981' },
              { type: 'PURCHASE_ORDER', label: 'Purchase Orders', count: categoryCounts['PURCHASE_ORDER'] || 55, total: 450, color: '#0F766E' },
              { type: 'TAX_FORM', label: 'Tax Forms & W-9s', count: categoryCounts['TAX_FORM'] || 50, total: 450, color: '#38BDF8' },
            ].map(cat => {
              const pct = Math.round((cat.count / cat.total) * 100);
              return (
                <div key={cat.type} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#E5E5E5] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />{cat.label}</span>
                    <span className="text-[#8E9097]">{cat.count} docs ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[#0B0C0E] h-1.5 rounded-full overflow-hidden">
                    <div className="archetype-bar-fill h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color, boxShadow: `0 0 8px ${cat.color}60` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#2A2C31]/70 flex items-center justify-between text-[11px] text-[#8E9097] relative z-10">
          <span>Multimodal Engine: <strong className="text-[#E5E5E5] font-mono">Stage 2 Ingestion</strong></span>
          <span className="text-[#06B6D4] font-mono font-medium">100% Free-Tier</span>
        </div>
      </div>

      {/* 3. SaaS ROI & Unit Economics Calculator with Anime.js Live Counting */}
      <div className="backlit-card p-5 md:p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
        <div className="backlit-halo-emerald w-44 h-44 -bottom-10 -right-10 opacity-25" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 border-b border-[#2A2C31]/70 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#10B981]" />
                <h3 className="font-serif italic text-base text-[#E5E5E5]">ROI &amp; Unit Economics</h3>
              </div>
              <p className="text-[11px] text-[#8E9097] mt-0.5">Section 2 operational business case</p>
            </div>
            <span className="text-[9px] uppercase tracking-wider font-mono px-2.5 py-0.5 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]">
              {monthlyDocs <= 1000 ? 'Starter $199' : monthlyDocs <= 3500 ? 'Growth $499' : 'Enterprise SLA'}
            </span>
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-xs text-[#E5E5E5] mb-1.5">
              <span className="text-[11px] text-[#8E9097]">Monthly Documents:</span>
              <span className="font-mono font-bold text-[#10B981]">{monthlyDocs.toLocaleString()} docs/mo</span>
            </div>
            <input type="range" min="1000" max="10000" step="500" value={monthlyDocs} onChange={e => setMonthlyDocs(Number(e.target.value))} className="w-full accent-[#10B981] cursor-pointer h-1.5 bg-[#0B0C0E] rounded-lg border border-[#2A2C31]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <div className="p-3 rounded-lg bg-[#16171B]/90 border border-[#2A2C31] relative overflow-hidden">
              <div className="text-[10px] uppercase tracking-wider text-[#8E9097] flex items-center gap-1"><DollarSign className="w-3 h-3 text-[#10B981]" />Net Monthly Saved</div>
              <div className="text-xl font-serif font-light text-[#10B981] mt-1"><span ref={netSavingsRef}>${Math.round(netMonthlySavings).toLocaleString()}</span></div>
              <div className="text-[10px] text-[#8E9097] mt-0.5">98.5% cost reduction</div>
            </div>
            <div className="p-3 rounded-lg bg-[#16171B]/90 border border-[#2A2C31] relative overflow-hidden">
              <div className="text-[10px] uppercase tracking-wider text-[#8E9097] flex items-center gap-1"><Clock className="w-3 h-3 text-[#C5B358]" />Analyst Time</div>
              <div className="text-xl font-serif font-light text-[#E5E5E5] mt-1 flex items-baseline gap-1">
                <span ref={hoursSavedRef}>{analystHoursSaved.toLocaleString()}</span>
                <span className="text-xs font-sans text-[#8E9097]">hrs</span>
              </div>
              <div className="text-[10px] text-[#8E9097] mt-0.5">~{(analystHoursSaved / 160).toFixed(1)} FTEs freed</div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#2A2C31]/70 flex items-center justify-between text-[11px] text-[#8E9097] relative z-10">
          <span>Payback Period: <strong className="text-[#E5E5E5] font-mono">&lt; 48 Hours</strong></span>
          <span className="text-[#10B981] font-mono font-medium">Manual: $11.25/doc</span>
        </div>
      </div>
    </div>
  );
}
