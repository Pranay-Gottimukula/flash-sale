'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  isOpen:     boolean;
  onClose:    () => void;
  title?:     string;
  children:   ReactNode;
  className?: string;
}

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !contentRef.current) return;

    const focusable = Array.from(contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    focusable[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div
        ref={contentRef}
        className={cn(
          'relative z-10 w-full max-w-md rounded-xl border border-border-subtle bg-surface-raised',
          'animate-in fade-in zoom-in-95 duration-150',
          className,
        )}
      >
        <div className="flex items-start justify-between p-5">
          {title && (
            <h2 id="modal-title" className="text-base font-semibold text-text-primary">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-overlay hover:text-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
