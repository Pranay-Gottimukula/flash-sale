import { AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ErrorBannerProps {
  message:    string;
  onRetry?:   () => void;
  className?: string;
}

export function ErrorBanner({ message, onRetry, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400',
        className,
      )}
    >
      <AlertCircle size={15} className="shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-red-400 transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
        >
          <RotateCcw size={13} />
          Retry
        </button>
      )}
    </div>
  );
}
