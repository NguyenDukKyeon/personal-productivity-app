'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Result } from '@/domain/shared/result';
import type { TodayService, TodayViewModel } from '@/features/today/application/today-service';
import type { WorkItemPriority } from '@/domain/work-items/work-item';

export function useTodayController(service: TodayService, date: string) {
  const [view, setView] = useState<TodayViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    service.getTodayView(date).then((result) => {
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
  }, [date, service]);

  const runMutation = useCallback(
    async <T,>(mutate: () => Promise<Result<T>>): Promise<Result<T>> => {
      const result = await mutate();
      if (!result.ok) {
        setError(result.message);
        return result;
      }
      const reloaded = await service.getTodayView(date);
      if (reloaded.ok) {
        setView(reloaded.value);
        setError(null);
      } else {
        setError(reloaded.message);
      }
      return result;
    },
    [date, service],
  );

  return {
    view,
    isLoading,
    error,
    setDailyCapacity: (minutes: number) => runMutation(() => service.setDailyCapacity(date, minutes)),
    createTask: (input: { title: string; estimatedMinutes: number; priority: WorkItemPriority }) =>
      runMutation(() => service.createTask(input)),
    setDailyPriorities: (workItemIds: string[]) =>
      runMutation(() => service.setDailyPriorities(date, workItemIds)),
    createTimeBlock: (input: { workItemId: string; startMinute: number; endMinute: number }) =>
      runMutation(() => service.createTimeBlock({ ...input, date })),
    updateTimeBlock: (id: string, patch: { startMinute: number; endMinute: number }) =>
      runMutation(() => service.updateTimeBlock(id, patch)),
    deleteTimeBlock: (id: string) => runMutation(() => service.deleteTimeBlock(id)),
    completeTask: (workItemId: string) => runMutation(() => service.completeTask(workItemId)),
    reopenTask: (workItemId: string) => runMutation(() => service.reopenTask(workItemId, date)),
    commitToday: () => runMutation(() => service.commitToday(date)),
  };
}
