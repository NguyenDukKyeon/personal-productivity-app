'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { FocusQuality, FocusSession } from '@/domain/focus/focus-session';
import type { Result } from '@/domain/shared/result';

export function FocusControls({
  session,
  onPause,
  onResume,
  onFinish,
  onAbandon,
}: {
  session: FocusSession;
  onPause: () => Promise<Result<unknown>>;
  onResume: () => Promise<Result<unknown>>;
  onFinish: (extras: { note?: string; qualityRating?: FocusQuality | null }) => Promise<Result<unknown>>;
  onAbandon: () => Promise<Result<unknown>>;
}) {
  const [note, setNote] = useState(session.note);
  const [quality, setQuality] = useState(session.qualityRating ? String(session.qualityRating) : '');
  const [isBusy, setIsBusy] = useState(false);

  async function run(action: () => Promise<Result<unknown>>) {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await action();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {session.status === 'running' ? (
          <Button variant="secondary" disabled={isBusy} onClick={() => run(onPause)}>
            Pause
          </Button>
        ) : (
          <Button disabled={isBusy} onClick={() => run(onResume)}>
            Resume
          </Button>
        )}
        <Button
          disabled={isBusy}
          onClick={() =>
            run(() =>
              onFinish({
                note,
                qualityRating: quality ? (Number(quality) as FocusQuality) : null,
              }),
            )
          }
        >
          Finish
        </Button>
        <Button variant="danger" disabled={isBusy} onClick={() => run(onAbandon)}>
          Abandon session
        </Button>
      </div>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="session-note">
        <span>Session note</span>
        <textarea
          id="session-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none ring-indigo-500 focus:border-indigo-400 focus:ring-2 dark:border-[#1e2538] dark:bg-[#161b26] dark:text-white"
        />
      </label>
      <Select label="Quality rating" value={quality} onChange={(event) => setQuality(event.target.value)}>
        <option value="">Skip</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </Select>
    </div>
  );
}
