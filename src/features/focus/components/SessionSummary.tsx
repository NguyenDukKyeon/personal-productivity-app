'use client';

import { Card } from '@/components/ui/Card';
import type { Distraction } from '@/domain/focus/distraction';
import type { FocusSession } from '@/domain/focus/focus-session';
import { formatFocusClock } from './FocusTimer';

export function SessionSummary({
  session,
  interruptionCount,
  distractions,
}: {
  session: FocusSession;
  interruptionCount: number;
  distractions: Distraction[];
}) {
  return (
    <Card title="Last session">
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium">
          {session.status === 'abandoned' ? 'Abandoned' : 'Completed'} · Focused {formatFocusClock(session.focusedDurationMs ?? 0)}
        </p>
        {session.plannedDurationMinutes != null ? (
          <p className="text-slate-500">Planned {session.plannedDurationMinutes} min</p>
        ) : (
          <p className="text-slate-500">Flow session</p>
        )}
        <p className="text-slate-500">Interruptions {interruptionCount}</p>
        {session.note ? <p>{session.note}</p> : null}
        {session.qualityRating ? <p className="text-slate-500">Quality {session.qualityRating}/5</p> : null}
        {distractions.length > 0 ? (
          <ul className="space-y-1 text-slate-600 dark:text-slate-300">
            {distractions.map((distraction) => (
              <li key={distraction.id}>{distraction.text}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
