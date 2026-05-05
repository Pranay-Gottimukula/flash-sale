'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Zap } from 'lucide-react';
import { api }           from '@/lib/api';
import { relativeTime, toErrorMessage } from '@/lib/utils';
import { useToast }      from '@/components/ui/toast';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button }        from '@/components/ui/button';
import { Card }          from '@/components/ui/card';
import { Modal }         from '@/components/ui/modal';
import { Spinner }       from '@/components/ui/spinner';
import { ErrorBanner }   from '@/components/ui/error-banner';
import { CopyableField } from '@/components/ui/copyable-field';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'ENDED';

interface EventTimeline {
  created:       string | null;
  activated:     string | null;
  firstWinner:   string | null;
  stockDepleted: string | null;
  lastRelease:   string | null;
  ended:         string | null;
}

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
  timeline?:                  EventTimeline;
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
  PAUSED:  'warning',
  ENDED:   'error',
};

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, total, isLive,
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
      <div className="flex flex-col gap-2.5 p-4">
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
  label, count, total, colorClass,
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

// ── Timeline ──────────────────────────────────────────────────────────────────

function TimelineSection({ timeline, status }: { timeline: EventTimeline; status: EventStatus }) {
  const points: { label: string; ts: string | null }[] = [
    { label: 'Created',        ts: timeline.created },
    { label: 'Activated',      ts: timeline.activated },
    { label: 'First Winner',   ts: timeline.firstWinner },
    { label: 'Stock Depleted', ts: timeline.stockDepleted },
    { label: 'Last Release',   ts: timeline.lastRelease },
    { label: 'Ended',          ts: timeline.ended },
  ];

  const visible = points.filter(p => p.ts !== null);
  if (visible.length === 0) return null;

  const lastIdx = visible.length - 1;

  function fmtTs(ts: string) {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  const isCurrentStage = (label: string) => {
    if (status === 'ACTIVE'  && label === 'Activated')      return true;
    if (status === 'ENDED'   && label === 'Ended')          return true;
    return false;
  };

  return (
    <Card header={<p className="text-sm font-semibold text-text-primary">Event Timeline</p>}>
      <div className="space-y-0">
        {visible.map(({ label, ts }, i) => {
          const active = isCurrentStage(label);
          return (
            <div key={label} className="flex gap-4">
              {/* Dot + line column */}
              <div className="flex flex-col items-center">
                <div className={[
                  'relative z-10 mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full',
                  active ? 'bg-accent' : 'bg-surface-overlay border border-border',
                ].join(' ')}>
                  {active && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-50" />
                  )}
                </div>
                {i < lastIdx && (
                  <div className="mt-1 w-px flex-1 bg-border-subtle" style={{ minHeight: 24 }} />
                )}
              </div>
              {/* Content */}
              <div className={i < lastIdx ? 'pb-5' : ''}>
                <p className={`text-sm font-medium ${active ? 'text-accent' : 'text-text-primary'}`}>
                  {label}
                </p>
                <p className="text-xs text-text-tertiary">{fmtTs(ts!)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const toast = useToast();

  const [event,         setEvent]         = useState<EventDetail | null>(null);
  const [stats,         setStats]         = useState<StatsResponse | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState('');
  const [showEndModal,  setShowEndModal]  = useState(false);

  const fetchEvent = useCallback(
    () => api.get<EventDetail>(`/api/admin/events/${id}`),
    [id],
  );
  const fetchStats = useCallback(
    () => api.get<StatsResponse>(`/api/admin/events/${id}/stats`),
    [id],
  );

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([fetchEvent(), fetchStats()])
      .then(([ev, st]) => { setEvent(ev); setStats(st); })
      .catch(err => setLoadError(toErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [fetchEvent, fetchStats]);

  useEffect(() => { load(); }, [load]);

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
      toast.success('Event activated — queue is now open');
    } catch (err) {
      setActionError(toErrorMessage(err));
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
      toast.success('Event ended — queue is closed');
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDuplicate() {
    setActionError('');
    setActionLoading(true);
    try {
      const { id: newId } = await api.post<{ id: string }>(`/api/admin/events/${id}/duplicate`);
      toast.success('Event duplicated');
      router.push(`/dashboard/events/${newId}`);
    } catch (err) {
      setActionError(toErrorMessage(err));
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

  if (loadError) {
    return (
      <div className="py-8">
        <ErrorBanner message={loadError} onRetry={load} />
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
  const showTimeline     = (event.status === 'ACTIVE' || event.status === 'ENDED') && event.timeline;

  return (
    <div className="animate-page-in">
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
          {event.status === 'PAUSED' && (
            <span className="text-sm font-medium text-yellow-400">
              Event paused by admin
            </span>
          )}
          {event.status === 'ENDED' && (
            <span className="text-sm text-text-tertiary">
              Ended {relativeTime(event.createdAt)}
            </span>
          )}
          <Button
            variant="secondary"
            loading={actionLoading}
            onClick={handleDuplicate}
          >
            <Copy size={14} />
            Duplicate
          </Button>
        </div>
      </div>

      {actionError && (
        <ErrorBanner message={actionError} className="mb-6" />
      )}

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Stock Remaining"
          value={live?.stockRemaining ?? null}
          total={event.stockCount}
          isLive={isActive}
        />
        <StatCard label="Queue Depth" value={live?.queueDepth  ?? null} isLive={isActive} />
        <StatCard label="Winners"     value={funnel?.won        ?? null} isLive={isActive} />
        <StatCard label="Verified"    value={funnel?.verified  ?? null} isLive={isActive} />
      </div>

      <div className="space-y-5">
        {/* ── Timeline ────────────────────────────────────────────────────── */}
        {showTimeline && (
          <TimelineSection timeline={event.timeline!} status={event.status} />
        )}

        {/* ── Integration Keys ────────────────────────────────────────────── */}
        <Card header={<p className="text-sm font-semibold text-text-primary">Integration Keys</p>}>
          <div className="space-y-5">
            <CopyableField label="Public Key"       value={event.publicKey} />
            <CopyableField label="RSA Public Key"   value={event.rsaPublicKey} multiline />
            <CopyableField
              label="Signing Secret"
              value={event.signingSecret}
              masked
              warning="Store this securely. Used for release route HMAC."
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
          <Card header={<p className="text-sm font-semibold text-text-primary">Event Funnel</p>}>
            <div className="space-y-6">
              <div className="space-y-3">
                <FunnelBar label="Queued"   count={funnel.queued}   total={funnel.totalRequests} colorClass="bg-blue-500"   />
                <FunnelBar label="Won"      count={funnel.won}      total={funnel.totalRequests} colorClass="bg-green-600"  />
                <FunnelBar label="Verified" count={funnel.verified} total={funnel.totalRequests} colorClass="bg-accent"     />
                <FunnelBar label="Sold Out" count={funnel.soldOut}  total={funnel.totalRequests} colorClass="bg-red-500"    />
                <FunnelBar label="Released" count={funnel.released} total={funnel.totalRequests} colorClass="bg-yellow-500" />
              </div>

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

      {/* ── Back link ───────────────────────────────────────────────────────── */}
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-text-tertiary transition-colors hover:text-text-secondary"
        >
          <ArrowLeft size={14} />
          Back to events
        </Link>
      </div>

      {/* ── End Event modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={showEndModal}
        onClose={() => { if (!actionLoading) setShowEndModal(false); }}
        title="End Event"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to end{' '}
            <span className="font-medium text-text-primary">{event.name}</span>?
            {' '}This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowEndModal(false)}
              disabled={actionLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleEnd} loading={actionLoading} className="flex-1">
              End Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
