'use client';

import { useEffect, useState } from 'react';
import { toLocalDateKey } from '@/domain/shared/local-date';
import type { TodayService } from '@/features/today/application/today-service';
import { getGuestTodayService } from '@/features/today/application/client-today-service';
import { TodayScreen } from '@/features/today/components/TodayScreen';

export default function TodayPage() {
  const [service, setService] = useState<TodayService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayKey] = useState(() => toLocalDateKey(new Date()));

  useEffect(() => {
    let cancelled = false;
    getGuestTodayService()
      .then((value) => {
        if (!cancelled) setService(value);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Failed to open guest storage.');
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
    return <p className="p-6 text-sm text-slate-500">Loading today…</p>;
  }

  return <TodayScreen service={service} date={todayKey} />;
}
