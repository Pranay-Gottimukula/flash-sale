'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap, LayoutGrid, BookOpen, Settings,
  LogOut, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { label: 'Events',   href: '/dashboard',          icon: LayoutGrid },
  { label: 'Docs',     href: '/dashboard/docs',     icon: BookOpen   },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings   },
] as const;

export function Sidebar() {
  const pathname         = usePathname();
  const { user, logout } = useAuth();

  // Default false (expanded) avoids hydration mismatch; localStorage is read after mount.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('sidebar-collapsed') === 'true') setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col',
        'border-r border-border-subtle bg-surface',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center gap-2.5 border-b border-border-subtle',
          collapsed ? 'justify-center' : 'px-4',
        )}
      >
        <Zap size={18} className="shrink-0 text-accent" fill="currentColor" />
        {!collapsed && (
          <span className="text-base font-bold tracking-tight text-text-primary">
            FlashEngine
          </span>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto py-3">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <div key={href} className="group relative px-2">
              {/* Left active bar — sits at x=0 of the px-2 container, which is the sidebar's inner edge */}
              {isActive && (
                <span className="pointer-events-none absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-accent" />
              )}

              <Link
                href={href}
                className={cn(
                  'flex h-9 items-center rounded-lg px-2.5 text-sm font-medium',
                  'transition-colors duration-150',
                  collapsed ? 'justify-center' : 'gap-3',
                  isActive
                    ? 'bg-accent-muted text-accent'
                    : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary',
                )}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>

              {/* Tooltip — only rendered when collapsed, shown on group hover */}
              {collapsed && (
                <span
                  className={cn(
                    'pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2',
                    'invisible opacity-0 transition-opacity duration-150',
                    'group-hover:visible group-hover:opacity-100',
                    'whitespace-nowrap rounded-md border border-border',
                    'bg-surface-overlay px-2.5 py-1 text-xs font-medium text-text-primary',
                  )}
                >
                  {label}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Bottom ───────────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-1 border-t border-border-subtle p-2">
        {/* User section */}
        {collapsed ? (
          <div className="flex justify-center py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent">
              {initial}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent">
              {initial}
            </div>
            <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">
              {user?.email}
            </span>
            <button
              onClick={logout}
              aria-label="Sign out"
              className="shrink-0 rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-overlay hover:text-text-secondary"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-8 w-full items-center justify-center rounded-lg text-text-tertiary transition-colors duration-150 hover:bg-surface-overlay hover:text-text-secondary"
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
