'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Result } from '@/domain/shared/result';
import type { FocusQuality } from '@/domain/focus/focus-session';
import type { FocusService, FocusViewModel, StartSessionInput } from '@/features/focus/application/focus-service';

export function useFocusController(service: FocusService) {
  const [view, setView] = useState<FocusViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    service.getFocusView().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setView(result.value);
        setError(null);
      } else {
        setError(result.message);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [service]);

  const runMutation = useCallback(
    async <T,>(mutate: () => Promise<Result<T>>): Promise<Result<T>> => {
      const result = await mutate();
      if (!result.ok) {
        setError(result.message);
        return result;
      }
      const reloaded = await service.getFocusView();
      if (reloaded.ok) {
        setView(reloaded.value);
        setError(null);
      } else {
        setError(reloaded.message);
      }
      return result;
    },
    [service],
  );

  return {
    view,
    isLoading,
    error,
    startSession: (input: StartSessionInput) => runMutation(() => service.startSession(input)),
    pauseSession: (id: string) => runMutation(() => service.pauseSession(id)),
    resumeSession: (id: string) => runMutation(() => service.resumeSession(id)),
    finishSession: (id: string, extras: { note?: string; qualityRating?: FocusQuality | null }) =>
      runMutation(() => service.finishSession(id, extras)),
    abandonSession: (id: string, extras?: { note?: string; qualityRating?: FocusQuality | null }) =>
      runMutation(() => service.abandonSession(id, extras)),
    captureDistraction: (id: string, text: string) => runMutation(() => service.captureDistraction(id, text)),
  };
}
