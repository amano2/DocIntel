import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, title = null, duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    const newToast = { id, type, message, title };
    setToasts((prev) => [...prev.slice(-3), newToast]); // keep max 4 visible

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (msg, title) => addToast('success', msg, title),
    error: (msg, title) => addToast('error', msg, title, 5500),
    warning: (msg, title) => addToast('warning', msg, title),
    info: (msg, title) => addToast('info', msg, title),
    remove: removeToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Fixed Toast Container */}
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
          maxWidth: '380px',
          width: '100%',
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            let Icon = Info;
            let iconColor = 'var(--brand-blue)';
            let borderColor = 'var(--border-subtle)';
            let bgGlow = 'rgba(59, 130, 246, 0.08)';

            if (t.type === 'success') {
              Icon = CheckCircle2;
              iconColor = '#10b981';
              borderColor = 'rgba(16, 185, 129, 0.3)';
              bgGlow = 'rgba(16, 185, 129, 0.08)';
            } else if (t.type === 'error') {
              Icon = AlertCircle;
              iconColor = '#ef4444';
              borderColor = 'rgba(239, 68, 68, 0.3)';
              bgGlow = 'rgba(239, 68, 68, 0.08)';
            } else if (t.type === 'warning') {
              Icon = AlertTriangle;
              iconColor = '#f59e0b';
              borderColor = 'rgba(245, 158, 11, 0.3)';
              bgGlow = 'rgba(245, 158, 11, 0.08)';
            }

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '12px',
                  border: `1px solid ${borderColor}`,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)',
                  background: `linear-gradient(135deg, ${bgGlow}, var(--bg-surface) 60%)`,
                }}
              >
                <div style={{ marginTop: '2px', flexShrink: 0 }}>
                  <Icon size={18} color={iconColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {t.title && (
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {t.title}
                    </div>
                  )}
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.45', wordBreak: 'break-word' }}>
                    {t.message}
                  </div>
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    marginLeft: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
