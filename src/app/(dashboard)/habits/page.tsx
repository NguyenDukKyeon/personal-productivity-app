'use client';

import { Suspense, useEffect, useState } from 'react';
import { toLocalDateKey } from '@/domain/shared/local-date';
import { getGuestHabitService } from '@/features/habits/application/client-habit-service';
import type { HabitService } from '@/features/habits/application/habit-service';
import { HabitsScreen } from '@/features/habits/components/HabitsScreen';

function HabitsPageInner() {
  const [service, setService] = useState<HabitService | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGuestHabitService()
      .then((value) => {
        if (!cancelled) setService(value);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Failed to open habit storage.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="p-6 text-sm text-red-600 dark:text-red-400" role="alert">
        {error}
      </p>
    );
  }

  if (!service) {
    return <p className="p-6 text-sm text-slate-500">Loading habits…</p>;
  }

  const initialDate = toLocalDateKey(new Date());

  return <HabitsScreen service={service} initialDate={initialDate} />;
}

export default function HabitsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading habits…</p>}>
      <HabitsPageInner />
    </Suspense>
  );
}
