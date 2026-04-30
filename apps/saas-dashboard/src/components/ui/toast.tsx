'use client';

import {
  createContext, useCallback, useContext, useEffect,
  useState, type ReactNode,
} from 'react';
import { Check, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error';

interface ToastItem {
  id:      string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ── Single toast ──────────────────────────────────────────────────────────────

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), 3000);
    return () => clearTimeout(t);
  }, [item.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'animate-page-in flex min-w-[240px] max-w-sm items-center gap-3',
        'rounded-lg border px-4 py-3 text-sm shadow-xl',
        item.variant === 'success'
          ? 'border-green-500/20 bg-[#0d1a0f] text-green-400'
          : 'border-red-500/20   bg-[#1a0d0d] text-red-400',
      )}
    >
      {item.variant === 'success'
        ? <Check    size={15} className="shrink-0" />
        : <XCircle  size={15} className="shrink-0" />
      }
      <span className="flex-1">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 opacity-50 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current focus-visible:opacity-100"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = 'success') => {
    setToasts(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, message, variant },
    ]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(item => (
          <Toast key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
