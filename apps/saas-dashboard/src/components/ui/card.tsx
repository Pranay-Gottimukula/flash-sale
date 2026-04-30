import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  children:     ReactNode;
  header?:      ReactNode;
  interactive?: boolean;
  padding?:     boolean;
  className?:   string;
}

export function Card({ children, header, interactive = false, padding = true, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border-subtle bg-surface-raised',
        interactive && 'cursor-pointer transition-colors duration-150 hover:border-border',
        className,
      )}
    >
      {header && (
        <div className="border-b border-border-subtle px-5 py-4">{header}</div>
      )}
      <div className={cn(padding && 'p-5')}>{children}</div>
    </div>
  );
}
