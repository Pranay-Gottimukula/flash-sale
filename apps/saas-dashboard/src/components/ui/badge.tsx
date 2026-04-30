import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'info';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-500/10  text-green-400',
  warning: 'bg-yellow-500/10 text-yellow-400',
  error:   'bg-red-500/10    text-red-400',
  neutral: 'bg-white/5       text-text-secondary',
  info:    'bg-blue-500/10   text-blue-400',
};

interface BadgeProps {
  variant?:   BadgeVariant;
  children:   ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
