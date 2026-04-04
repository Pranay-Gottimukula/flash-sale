'use client';

import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface FlashSaleKeys {
  publicKey: string;
  secretKey: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

// ── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [status, setStatus] = useState<Status>('idle');
  const [keys, setKeys] = useState<FlashSaleKeys | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleCreateFlashSale() {
    setStatus('loading');
    setKeys(null);
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:4000/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = (await res.json()) as FlashSaleKeys & { message: string };
      setKeys({ publicKey: data.publicKey, secretKey: data.secretKey });
      setStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMsg(msg);
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center px-6 font-sans">
      {/* ── Background glow ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      {/* ── Card ── */}
      <section className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20">
            Flash Sale Engine
          </span>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Event Control Panel
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Provision a new flash sale event and receive your API keys instantly.
          </p>
        </div>

        {/* Action card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-8 shadow-2xl">
          <button
            id="create-flash-sale-btn"
            onClick={handleCreateFlashSale}
            disabled={status === 'loading'}
            className="
              relative w-full py-3.5 rounded-xl font-semibold text-sm
              bg-gradient-to-r from-violet-600 to-indigo-500
              hover:from-violet-500 hover:to-indigo-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 active:scale-[0.98]
              shadow-lg shadow-violet-700/30
              focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#09090b]
            "
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                  />
                </svg>
                Creating Event…
              </span>
            ) : (
              '⚡ Create Flash Sale'
            )}
          </button>

          {/* ── Success: key display ── */}
          {status === 'success' && keys && (
            <div
              id="keys-panel"
              className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                Event created successfully
              </p>

              <KeyField label="Public Key" value={keys.publicKey} id="public-key" />
              <KeyField label="Secret Key" value={keys.secretKey} id="secret-key" secret />
            </div>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <div
              id="error-panel"
              className="mt-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
            >
              <span className="font-medium">Error:</span> {errorMsg}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Keys are ephemeral — store them immediately after creation.
        </p>
      </section>
    </main>
  );
}

// ── KeyField sub-component ────────────────────────────────────────────────────

function KeyField({
  label,
  value,
  id,
  secret = false,
}: {
  label: string;
  value: string;
  id: string;
  secret?: boolean;
}) {
  const [revealed, setRevealed] = useState(!secret);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-lg bg-black/40 border border-white/[0.06] p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {secret && (
            <button
              onClick={() => setRevealed((r) => !r)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {revealed ? 'Hide' : 'Reveal'}
            </button>
          )}
          <button
            id={`copy-${id}`}
            onClick={handleCopy}
            className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors font-medium"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <code
        id={id}
        className="block text-xs font-mono text-zinc-300 break-all leading-5"
      >
        {revealed ? value : '•'.repeat(Math.min(value.length, 40))}
      </code>
    </div>
  );
}
