import { cn } from '@/lib/cn';

type SpinnerSize = 'sm' | 'md' | 'lg';

const px: Record<SpinnerSize, number> = { sm: 16, md: 24, lg: 32 };

interface SpinnerProps {
  size?:      SpinnerSize;
  color?:     string;
  className?: string;
}

export function Spinner({ size = 'md', color, className }: SpinnerProps) {
  const dim = px[size];
  return (
    <svg
      className={cn('animate-spin shrink-0', className)}
      style={{ width: dim, height: dim, color: color ?? 'currentColor' }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
