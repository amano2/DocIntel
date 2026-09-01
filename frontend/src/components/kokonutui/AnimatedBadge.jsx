import React from 'react';
import { motion } from 'framer-motion';

/**
 * Kokonut UI Animated Pulse Status Badge
 */
export function AnimatedBadge({ 
  variant = 'clean', 
  children, 
  icon = null,
  pulse = true,
  className = '' 
}) {
  const styles = {
    clean: {
      bg: 'var(--status-clean-bg, rgba(16, 185, 129, 0.15))',
      text: 'var(--status-clean-text, #10b981)',
      border: 'var(--status-clean-border, rgba(16, 185, 129, 0.35))',
      dot: '#10b981'
    },
    review: {
      bg: 'var(--status-review-bg, rgba(245, 158, 11, 0.15))',
      text: 'var(--status-review-text, #f59e0b)',
      border: 'var(--status-review-border, rgba(245, 158, 11, 0.35))',
      dot: '#f59e0b'
    },
    critical: {
      bg: 'var(--status-critical-bg, rgba(239, 68, 68, 0.15))',
      text: 'var(--status-critical-text, #ef4444)',
      border: 'var(--status-critical-border, rgba(239, 68, 68, 0.35))',
      dot: '#ef4444'
    },
    neutral: {
      bg: 'var(--bg-surface-subtle, #141414)',
      text: 'var(--text-secondary, #a1a1aa)',
      border: 'var(--border-subtle, #27272a)',
      dot: '#a1a1aa'
    }
  };

  const current = styles[variant] || styles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 ${className}`}
      style={{
        backgroundColor: current.bg,
        color: current.text,
        borderColor: current.border,
      }}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <motion.span
            animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: current.dot }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: current.dot }}
          />
        </span>
      )}
      {icon}
      <span>{children}</span>
    </span>
  );
}
