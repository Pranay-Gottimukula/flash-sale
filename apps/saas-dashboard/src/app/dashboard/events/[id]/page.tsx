'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Zap } from 'lucide-react';
import { api }           from '@/lib/api';
import { relativeTime }  from '@/lib/utils';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button }        from '@/components/ui/button';
import { Card }          from '@/components/ui/card';
import { Modal }         from '@/components/ui/modal';
import { Spinner }       from '@/components/ui/spinner';
import { CopyableField } from '@/components/ui/copyable-field';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventStatus = 'PENDING' | 'ACTIVE' | 'ENDED';

interface EventDetail {
  id:                         string;
  name:                       string;
  status:                     EventStatus;
  stockCount:                 number;
  rateLimit:                  number;
  oversubscriptionMultiplier: number;
  publicKey:                  string;
  rsaPublicKey:               string;
  signingSecret:              string;
  createdAt:                  string;
  integrationSnippet:         string;
}

interface StatsResponse {
  live: {
    stockRemaining: number | null;
    queueDepth:     number;
    admitted:       number | null;
    queueCap:       number | null;
  };
  funnel: {
    totalRequests: number;
    queued:        number;
    instantWins:   number;
    soldOut:       number;
    rateLimited:   number;
    won:           number;
    released:      number;
    verified:      number;
  };
  rates: {
    conversionRate: number;
    releaseRate:    number;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<EventStatus, BadgeVariant> = {
  PENDING: 'neutral',
  ACTIVE:  'success',
  ENDED:   'error',
};

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  total,
  isLive,
}: {
  label:   string;
  value:   number | null;
  total?:  number;
  isLive?: boolean;
}) {
  const display = value === null ? '—' : value.toLocaleString();
  const pct     = value !== null && total ? Math.min((value / total) * 100, 100) : null;

  return (
    <Card padding={false}>
      <div className="p-4 flex flex-col gap-2.5">
        <p
          className="text-2xl font-bold tabular-nums text-text-primary"
          style={isLive ? { animation: 'stat-pulse 3s ease-in-out infinite' } : undefined}
        >
          {display}
        </p>
        {pct !== null && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-overlay">
            <div
              className="h-full rounded-full bg-accent/50 transition-[width] duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <p className="text-xs text-text-secondary">{label}</p>
      </div>
    </Card>
  );
}

// ── FunnelBar ─────────────────────────────────────────────────────────────────

function FunnelBar({
  label,
  count,
  total,
  colorClass,
}: {
  label:      string;
  count:      number;
  total:      number;
  colorClass: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-text-secondary">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-overlay">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-xs text-text-primary">
        {count.toLocaleString()}
      </span>
      <span className="w-12 shrink-0 text-right text-xs text-text-tertiary">
        {total > 0 ? `${pct.toFixed(1)}%` : '—'}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [event,         setEvent]         = useState<EventDetail | null>(null);
  const [stats,         setStats]         = useState<StatsResponse | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEndModal,  setShowEndModal]  = useState(false);
  const [actionError,   setActionError]   = useState('');

  const fetchEvent = useCallback(
    () => api.get<EventDetail>(`/api/admin/events/${id}`),
    [id],
  );
  const fetchStats = useCallback(
    () => api.get<StatsResponse>(`/api/admin/events/${id}/stats`),
    [id],
  );

  // Initial load
  useEffect(() => {
    Promise.all([fetchEvent(), fetchStats()])
      .then(([ev, st]) => { setEvent(ev); setStats(st); })
      .finally(() => setLoading(false));
  }, [fetchEvent, fetchStats]);

  // Auto-refresh stats every 5 s when ACTIVE
  useEffect(() => {
    if (event?.status !== 'ACTIVE') return;
    const timer = setInterval(() => {
      fetchStats().then(setStats).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [event?.status, fetchStats]);

  async function handleActivate() {
    setActionError('');
    setActionLoading(true);
    try {
      await api.put(`/api/admin/events/${id}/activate`);
      const [ev, st] = await Promise.all([fetchEvent(), fetchStats()]);
      setEvent(ev);
      setStats(st);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to activate event.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEnd() {
    setShowEndModal(false);
    setActionError('');
    setActionLoading(true);
    try {
      await api.put(`/api/admin/events/${id}/end`);
      const [ev, st] = await Promise.all([fetchEvent(), fetchStats()]);
      setEvent(ev);
      setStats(st);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to end event.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-secondary">
        Event not found.
      </div>
    );
  }

  const { live, funnel } = stats ?? { live: null, funnel: null };
  const isActive         = event.status === 'ACTIVE';

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between border-b border-border-subtle pb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-text-primary">{event.name}</h1>
          <Badge variant={STATUS_VARIANT[event.status]}>
            {event.status.charAt(0) + event.status.slice(1).toLowerCase()}
          </Badge>
        </div>

        <div className="ml-4 flex shrink-0 items-center gap-2">
          {event.status === 'PENDING' && (
            <Button loading={actionLoading} onClick={handleActivate}>
              <Zap size={15} fill="currentColor" />
              Activate Event
            </Button>
          )}
          {event.status === 'ACTIVE' && (
            <Button
              variant="danger"
              loading={actionLoading}
              onClick={() => setShowEndModal(true)}
            >
              End Event
            </Button>
          )}
          {event.status === 'ENDED' && (
            <span className="text-sm text-text-tertiary">
              Ended {relativeTime(event.createdAt)}
            </span>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={15} className="shrink-0" />
          {actionError}
        </div>
      )}

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Stock Remaining"
          value={live?.stockRemaining ?? null}
          total={event.stockCount}
          isLive={isActive}
        />
        <StatCard
          label="Queue Depth"
          value={live?.queueDepth ?? null}
          isLive={isActive}
        />
        <StatCard
          label="Total Winners"
          value={funnel?.won ?? null}
          isLive={isActive}
        />
        <StatCard
          label="Verified"
          value={funnel?.verified ?? null}
          isLive={isActive}
        />
      </div>

      <div className="space-y-5">
        {/* ── Integration Keys ────────────────────────────────────────────── */}
        <Card header={
          <p className="text-sm font-semibold text-text-primary">Integration Keys</p>
        }>
          <div className="space-y-5">
            <CopyableField
              label="Public Key"
              value={event.publicKey}
            />
            <CopyableField
              label="RSA Public Key"
              value={event.rsaPublicKey}
              multiline
            />
            <CopyableField
              label="Signing Secret"
              value={event.signingSecret}
              masked
              warning="This secret is shown once. Store it securely."
            />
            <CopyableField
              label="Integration Snippet"
              value={event.integrationSnippet.trim()}
              multiline
            />
          </div>
        </Card>

        {/* ── Event Funnel ─────────────────────────────────────────────────── */}
        {funnel && (
          <Card header={
            <p className="text-sm font-semibold text-text-primary">Event Funnel</p>
          }>
            <div className="space-y-6">
              {/* Bar chart */}
              <div className="space-y-3">
                <FunnelBar
                  label="Queued"
                  count={funnel.queued}
                  total={funnel.totalRequests}
                  colorClass="bg-blue-500"
                />
                <FunnelBar
                  label="Won"
                  count={funnel.won}
                  total={funnel.totalRequests}
                  colorClass="bg-green-600"
                />
                <FunnelBar
                  label="Verified"
                  count={funnel.verified}
                  total={funnel.totalRequests}
                  colorClass="bg-accent"
                />
                <FunnelBar
                  label="Sold Out"
                  count={funnel.soldOut}
                  total={funnel.totalRequests}
                  colorClass="bg-red-500"
                />
                <FunnelBar
                  label="Released"
                  count={funnel.released}
                  total={funnel.totalRequests}
                  colorClass="bg-yellow-500"
                />
              </div>

              {/* Activity table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="pb-2 text-left font-medium text-text-tertiary">Metric</th>
                    <th className="pb-2 text-right font-medium text-text-tertiary">Count</th>
                    <th className="pb-2 text-right font-medium text-text-tertiary">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Total Requests', count: funnel.totalRequests },
                    { label: 'Queued',         count: funnel.queued },
                    { label: 'Instant Wins',   count: funnel.instantWins },
                    { label: 'Sold Out',       count: funnel.soldOut },
                    { label: 'Rate Limited',   count: funnel.rateLimited },
                    { label: 'Won',            count: funnel.won },
                    { label: 'Released',       count: funnel.released },
                    { label: 'Verified',       count: funnel.verified },
                  ].map(({ label, count }) => (
                    <tr key={label} className="border-b border-border-subtle/50 last:border-0">
                      <td className="py-2 text-text-secondary">{label}</td>
                      <td className="py-2 text-right font-mono text-text-primary">
                        {count.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-text-tertiary">
                        {funnel.totalRequests > 0
                          ? `${((count / funnel.totalRequests) * 100).toFixed(1)}%`
                          : '—'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* ── End Event confirmation modal ────────────────────────────────────── */}
      <Modal
        isOpen={showEndModal}
        onClose={() => { if (!actionLoading) setShowEndModal(false); }}
        title="End Event"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will immediately close the queue and mark the event as ended.
            All users still in queue will be dropped.{' '}
            <span className="text-text-primary font-medium">This cannot be undone.</span>
          </p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleEnd} className="flex-1">
              End Event
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowEndModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
