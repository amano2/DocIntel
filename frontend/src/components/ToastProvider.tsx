import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration: number = 4000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastItem = { id, type, title, message, duration };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast viewport overlay */}
      <div 
        id="toast-viewport-container" 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full px-4"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-4 border shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-[#141518] border-[#C5B358] text-[#E5E5E5]'
                : toast.type === 'error'
                ? 'bg-[#141518] border-[#D9534F] text-[#E5E5E5]'
                : toast.type === 'warning'
                ? 'bg-[#141518] border-[#C5B358]/60 text-[#E5E5E5]'
                : 'bg-[#141518] border-[#2A2C31] text-[#E5E5E5]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#C5B358]" />}
              {toast.type === 'error' && <XCircle className="w-4 h-4 text-[#D9534F]" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#C5B358]" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-[#8E9097]" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-serif italic text-sm text-[#E5E5E5] leading-snug">{toast.title}</h4>
              {toast.message && (
                <p className="text-xs text-[#8E9097] mt-1 leading-relaxed font-sans">{toast.message}</p>
              )}
            </div>

            <button
              id={`dismiss-toast-${toast.id}`}
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-[#8E9097] hover:text-[#E5E5E5] transition-colors p-1 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
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
