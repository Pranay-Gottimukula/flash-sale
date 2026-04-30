import { type ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 overflow-auto">
        <div className="mx-auto max-w-[1200px] px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
