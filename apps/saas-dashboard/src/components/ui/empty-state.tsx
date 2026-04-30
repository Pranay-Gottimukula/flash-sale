import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?:        ReactNode;
  title:        string;
  description?: string;
  action?:      ReactNode;
  className?:   string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      {icon && (
        <div className="text-text-tertiary">{icon}</div>
      )}
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && (
        <p className="max-w-xs text-xs text-text-tertiary">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
