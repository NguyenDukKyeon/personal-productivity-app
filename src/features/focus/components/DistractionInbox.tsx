'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Distraction } from '@/domain/focus/distraction';
import type { Result } from '@/domain/shared/result';

export function DistractionInbox({
  distractions,
  interruptionCount,
  onCapture,
}: {
  distractions: Distraction[];
  interruptionCount: number;
  onCapture: (text: string) => Promise<Result<unknown>>;
}) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interruptions {interruptionCount}</p>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={async (event) => {
          event.preventDefault();
          if (isSubmitting) return;
          setIsSubmitting(true);
          try {
            const result = await onCapture(text);
            if (result.ok) setText('');
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <Input
          label="Distraction"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="TikTok, reply, idea…"
        />
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          Capture distraction
        </Button>
      </form>
      {distractions.length > 0 ? (
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
          {distractions.map((distraction) => (
            <li key={distraction.id}>{distraction.text}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Capture interruptions without stopping the clock.</p>
      )}
    </div>
  );
}
