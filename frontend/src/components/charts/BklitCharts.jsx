import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

/**
 * Bklit-inspired Anomaly Severity Donut Chart
 * - Safe inner radius (56px) + stacked 2-line category labels so text NEVER overflows
 * - Dynamic cursor-adjacent hover tooltip with automatic collision handling
 */
export function BklitAnomalyDonutChart({ data = {}, totalAnomalies = 19, filter = 'all' }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const rawData = [
    { name: 'High Severity', shortName: 'High', key: 'high', value: data.high || 17, fill: '#ef4444' },
    { name: 'Medium Severity', shortName: 'Medium', key: 'medium', value: data.medium || 2, fill: '#f59e0b' },
    { name: 'Low Severity', shortName: 'Low', key: 'low', value: data.low || 0, fill: '#10b981' },
  ].filter(d => d.value > 0);

  const displayData = rawData.length > 0 ? rawData : [
    { name: 'High Severity', shortName: 'High', key: 'high', value: 17, fill: '#ef4444' },
    { name: 'Medium Severity', shortName: 'Medium', key: 'medium', value: 2, fill: '#f59e0b' },
  ];

  const activeItem = activeIndex !== null ? displayData[activeIndex] : null;

  return (
    <div className="relative w-full h-[185px] px-4 py-1 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={<CustomBklitTooltip />}
            cursor={false}
            offset={12}
            wrapperStyle={{ pointerEvents: 'none', zIndex: 100 }}
          />
          <Pie
            data={displayData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={78}
            paddingAngle={4}
            strokeWidth={0}
            isAnimationActive={true}
            animationDuration={400}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {displayData.map((entry, index) => {
              const isFaded = filter === 'high' && entry.key !== 'high';
              const isHovered = activeIndex === index;
              return (
                <Cell
                  key={`donut-cell-${index}`}
                  fill={entry.fill}
                  opacity={isFaded ? 0.35 : 1}
                  style={{
                    filter: isHovered ? 'brightness(1.15) drop-shadow(0 0 8px rgba(255,255,255,0.25))' : 'none',
                    transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                    transformOrigin: 'center center',
                    transition: 'all 0.2s ease-out',
                    cursor: 'pointer'
                  }}
                />
              );
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Interactive Center Value Badge (Strict 2-Line Stack so text never exceeds inner hole) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
        <span 
          className="text-2xl font-black tracking-tight leading-none mb-1 tabular-nums"
          style={{ color: activeItem ? activeItem.fill : 'var(--text-primary)' }}
        >
          {activeItem ? activeItem.value : totalAnomalies}
        </span>
        <div className="flex flex-col items-center text-center max-w-[80px] leading-tight">
          {activeItem ? (
            <>
              <span className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: activeItem.fill }}>
                {activeItem.shortName}
              </span>
              <span className="text-[8.5px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-80">
                Severity
              </span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                Total
              </span>
              <span className="text-[8.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Flags
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Bklit-inspired Vertical Bar Chart for Status Breakdown by Document Type
 * Formatted with generous bottom padding (35px) and left axis margin (20px).
 */
export function BklitTypeBreakdownChart({ breakdown = {} }) {
  const chartData = [
    {
      type: 'Invoices',
      Clean: breakdown?.invoice?.clean ?? 2,
      Review: breakdown?.invoice?.needs_review ?? 0,
      Critical: breakdown?.invoice?.critical ?? 10,
    },
    {
      type: 'Contracts',
      Clean: breakdown?.contract?.clean ?? 5,
      Review: breakdown?.contract?.needs_review ?? 0,
      Critical: breakdown?.contract?.critical ?? 5,
    },
    {
      type: 'Compliance',
      Clean: breakdown?.compliance_doc?.clean ?? 0,
      Review: breakdown?.compliance_doc?.needs_review ?? 2,
      Critical: breakdown?.compliance_doc?.critical ?? 0,
    },
  ];

  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 15, right: 25, left: 15, bottom: 35 }}
          barSize={46}
          maxBarSize={52}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border-subtle, #27272a)"
            opacity={0.5}
          />
          <XAxis
            dataKey="type"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-secondary, #a1a1aa)', fontSize: 12, fontWeight: 600 }}
            dy={12}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted, #71717a)', fontSize: 11 }}
            allowDecimals={false}
            dx={-8}
          />
          <Tooltip
            content={<CustomBklitTooltip isBar />}
            cursor={false}
            position={{ y: 0 }}
          />
          <Bar
            dataKey="Clean"
            stackId="stack"
            fill="#10b981"
            radius={[0, 0, 0, 0]}
            isAnimationActive={true}
          />
          <Bar
            dataKey="Review"
            stackId="stack"
            fill="#f59e0b"
            radius={[0, 0, 0, 0]}
            isAnimationActive={true}
          />
          <Bar
            dataKey="Critical"
            stackId="stack"
            fill="#ef4444"
            radius={[5, 5, 0, 0]}
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Bklit-inspired 7-Day Ingestion & AI Extraction Velocity Area Chart
 * Formatted with 30px right margin buffer and 20px left margin for y-axis ticks.
 */
export function BklitActivityAreaChart() {
  const activityData = [
    { day: 'Mon', Ingested: 18, Clean: 15 },
    { day: 'Tue', Ingested: 24, Clean: 20 },
    { day: 'Wed', Ingested: 32, Clean: 28 },
    { day: 'Thu', Ingested: 29, Clean: 25 },
    { day: 'Fri', Ingested: 41, Clean: 35 },
    { day: 'Sat', Ingested: 14, Clean: 13 },
    { day: 'Sun', Ingested: 22, Clean: 20 },
  ];

  return (
    <div className="w-full h-[205px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={activityData}
          margin={{ top: 15, right: 30, left: 20, bottom: 25 }}
        >
          <defs>
            <linearGradient id="ingestGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="cleanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border-subtle, #27272a)"
            opacity={0.4}
          />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted, #71717a)', fontSize: 11.5 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted, #71717a)', fontSize: 11 }}
            dx={-8}
          />
          <Tooltip content={<CustomBklitTooltip />} cursor={false} />
          <Area
            type="monotone"
            dataKey="Ingested"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#ingestGrad)"
          />
          <Area
            type="monotone"
            dataKey="Clean"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#cleanGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Bklit Semi-Circular Gauge for Document Quality & Health Index
 * Formatted with balanced top padding and bottom spacing.
 */
export function BklitHealthGauge({ score = 94 }) {
  const gaugeData = [
    { value: score, fill: '#10b981' },
    { value: 100 - score, fill: 'var(--border-subtle, #27272a)' },
  ];

  return (
    <div className="relative w-full h-[150px] my-1 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={gaugeData}
            dataKey="value"
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius={54}
            outerRadius={76}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={true}
            animationDuration={800}
          >
            <Cell fill={gaugeData[0].fill} />
            <Cell fill={gaugeData[1].fill} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-[44%] flex flex-col items-center justify-center">
        <span className="text-3xl font-black tracking-tight text-[var(--text-primary)] tabular-nums">
          {score}%
        </span>
        <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase">
          Clean Pass Rate
        </span>
      </div>
    </div>
  );
}

/**
 * Clean, High-Contrast Floating Tooltip with Dynamic Adjacent Positioning
 */
function CustomBklitTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface, #ffffff)',
        color: 'var(--text-primary, #0f172a)',
        border: '1px solid var(--border-strong, #3f3f46)',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        minWidth: '120px',
        pointerEvents: 'none'
      }}
    >
      {label && (
        <p
          style={{
            fontSize: '12px',
            fontWeight: '700',
            color: 'var(--text-primary, #0f172a)',
            marginBottom: '4px',
            borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
            paddingBottom: '3px',
          }}
        >
          {label}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px' }}>
        {payload.map((entry, idx) => (
          <div
            key={`tooltip-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: entry.color || entry.fill || entry.payload.fill,
                }}
              />
              <span style={{ color: 'var(--text-secondary, #a1a1aa)', fontWeight: '500' }}>
                {entry.name || entry.dataKey}:
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>
              {entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
