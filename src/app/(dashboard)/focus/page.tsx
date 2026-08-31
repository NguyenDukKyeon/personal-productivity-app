'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getGuestFocusService } from '@/features/focus/application/client-focus-service';
import type { FocusService } from '@/features/focus/application/focus-service';
import { FocusScreen } from '@/features/focus/components/FocusScreen';

function FocusPageInner() {
  const searchParams = useSearchParams();
  const [service, setService] = useState<FocusService | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGuestFocusService()
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
    return <p className="p-6 text-sm text-slate-500">Loading focus…</p>;
  }

  return (
    <FocusScreen
      service={service}
      initialWorkItemId={searchParams.get('workItemId')}
      initialTimeBlockId={searchParams.get('timeBlockId')}
    />
  );
}

export default function FocusPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading focus…</p>}>
      <FocusPageInner />
    </Suspense>
  );
}
