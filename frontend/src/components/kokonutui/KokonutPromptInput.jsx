import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, FileSearch, ShieldAlert, DollarSign, Loader2 } from 'lucide-react';

/**
 * Kokonut UI Animated Prompt Input Box
 * Modern AI prompt bar with suggestion chips, focus glow, fully round send button with pop-in animation.
 */
export function KokonutPromptInput({
  onSubmit,
  isLoading = false,
  placeholder = "Ask anything across your invoices, contracts, and compliance docs...",
  suggestions = [
    { label: "Find all unpaid invoices from TechCorp", icon: DollarSign },
    { label: "Which contracts are missing signatures?", icon: ShieldAlert },
    { label: "Summarize BAA compliance obligations", icon: FileSearch }
  ]
}) {
  const [query, setQuery] = useState('');
  const hasText = query.trim().length > 0;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!hasText || isLoading) return;
    onSubmit(query.trim());
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Suggestion Chips */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1 mr-1">
            <Sparkles size={13} className="text-[#f59e0b]" />
            Suggestions:
          </span>
          {suggestions.map((item, idx) => {
            const Icon = item.icon;
            const displayLabel = item.label || item.text;
            const submitText = item.text || item.label;
            return (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setQuery(submitText);
                  onSubmit(submitText);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-surface-subtle)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all cursor-pointer"
              >
                {Icon && <Icon size={12} />}
                <span>{displayLabel}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Main Input Box — pill shaped, generous padding */}
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          borderRadius: '9999px',          /* full pill */
          border: '1.5px solid var(--border-strong)',
          background: 'var(--bg-surface)',
          padding: '6px 6px 6px 20px',     /* left padding for text, right for button */
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          gap: '8px',
        }}
        className="focus-within:!border-[var(--text-primary)] focus-within:shadow-[0_0_0_3px_var(--border-focus)]"
      >
        <textarea
          rows={1}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1,
            resize: 'none',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            lineHeight: '1.5',
            color: 'var(--text-primary)',
            padding: '6px 0',             /* vertical breathing room inside pill */
            fontFamily: 'var(--font-sans)',
          }}
          className="placeholder-[var(--text-muted)]"
        />

        {/* Animated Round Send Button — pops in when text is present */}
        <AnimatePresence mode="wait">
          {hasText ? (
            <motion.button
              key="send-active"
              type="submit"
              disabled={isLoading}
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 20 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              whileHover={{ scale: 1.1, boxShadow: '0 4px 16px rgba(17,24,39,0.35)' }}
              whileTap={{ scale: 0.9, rotate: 15 }}
              style={{
                background: isLoading
                  ? 'rgba(17,24,39,0.7)'
                  : 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',        /* perfectly round */
                width: '38px',
                height: '38px',
                minWidth: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLoading ? 'wait' : 'pointer',
                flexShrink: 0,
                boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Ripple shimmer overlay */}
              <motion.div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 65%)',
                  pointerEvents: 'none',
                }}
              />
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.span
                    key="spinner"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    style={{
                      display: 'block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                ) : (
                  <motion.div
                    key="send-icon"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 4 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Send size={15} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ) : (
            /* Ghost placeholder circle when empty */
            <motion.div
              key="send-ghost"
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 1, opacity: 0.3 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                width: '38px',
                height: '38px',
                minWidth: '38px',
                borderRadius: '50%',
                background: 'var(--bg-surface-subtle)',
                border: '1.5px dashed var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                flexShrink: 0,
                pointerEvents: 'none',
              }}
            >
              <Send size={14} />
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
