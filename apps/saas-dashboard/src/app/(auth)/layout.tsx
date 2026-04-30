import { type ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* Barely-visible green glow at top — adds depth without decoration */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0"
        style={{
          height: '420px',
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(34,197,94,0.07) 0%, transparent 100%)',
        }}
      />
      {children}
    </div>
  );
}
