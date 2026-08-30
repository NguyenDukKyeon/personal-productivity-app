'use client';

import { useEffect, useState } from 'react';
import type { FocusSession } from '@/domain/focus/focus-session';
import { elapsedFocusMs, remainingFocusMs } from '@/domain/focus/focus-timing';

export function formatFocusClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export function FocusTimer({ session }: { session: FocusSession }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (session.status !== 'running') return undefined;
    const timer = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [session.id, session.status, session.runningSince]);

  const elapsed = elapsedFocusMs(session, nowMs);
  const remaining = remainingFocusMs(session, nowMs);

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p
        aria-label="Elapsed focus time"
        className="font-tabular text-6xl font-semibold tracking-tight text-slate-900 sm:text-7xl dark:text-white"
      >
        {formatFocusClock(elapsed)}
      </p>
      {remaining != null ? (
        <p aria-label="Remaining focus time" className="font-tabular text-sm font-medium text-slate-500">
          Remaining {formatFocusClock(remaining)}
        </p>
      ) : (
        <p className="text-sm font-medium text-slate-500">Flow mode</p>
      )}
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500">
        {session.status === 'paused' ? 'Paused' : 'Running'}
      </p>
    </div>
  );
}
