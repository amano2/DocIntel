import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

/**
 * Kokonut UI Metric / Telemetry Card
 * Perfectly proportioned KPI card with 28px/26px padding,
 * generous vertical spacing between title, big number, and bottom delta pill.
 */
export function MetricCard({
  title,
  value,
  unit = '',
  description = '',
  icon: Icon,
  iconColor = 'var(--text-primary)',
  trend = '+12.4% vs last month',
  trendType = 'positive',
  valueColor = 'var(--text-primary)',
  spotlightColor = 'rgba(255, 255, 255, 0.08)',
}) {
  return (
    <SpotlightCard
      spotlightColor={spotlightColor}
      padding="26px 26px"
      className="group relative flex flex-col justify-between transition-all duration-200"
      style={{ minHeight: '190px' }}
    >
      {/* Top Row: Title & Icon */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          {title}
        </span>
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] transition-transform duration-200 group-hover:scale-105 group-hover:border-[var(--border-strong)]">
            <Icon size={17} style={{ color: iconColor }} />
          </div>
        )}
      </div>

      {/* Middle Row: Big Metric Value with generous vertical breathing room */}
      <div className="my-auto py-2 flex items-baseline">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex items-baseline text-[44px] font-black tracking-tight leading-none tabular-nums"
          style={{ color: valueColor }}
        >
          <span>{value}</span>
          {unit && (
            <span className="ml-1.5 text-2xl font-bold opacity-80" style={{ color: valueColor }}>
              {unit}
            </span>
          )}
        </motion.div>
      </div>

      {/* Bottom Row: Delta Trend Badge & Context Description with ample bottom margin */}
      <div className="flex items-center justify-between gap-3 pt-3 mt-2 border-t border-[var(--border-subtle)]/50">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-semibold border transition-all ${
            trendType === 'positive'
              ? 'bg-[rgba(16,185,129,0.12)] text-[#10b981] border-[rgba(16,185,129,0.25)]'
              : trendType === 'highlight'
              ? 'bg-[rgba(245,158,11,0.12)] text-[#f59e0b] border-[rgba(245,158,11,0.25)]'
              : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
          }`}
        >
          <ArrowUpRight size={13} strokeWidth={2.5} />
          <span>{trend}</span>
        </span>
        {description && (
          <span className="text-[11.5px] font-medium text-[var(--text-muted)] truncate">
            {description}
          </span>
        )}
      </div>
    </SpotlightCard>
  );
}
