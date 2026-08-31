'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HabitCheckInKind } from '@/domain/habits/habit-check-in';
import type { Result } from '@/domain/shared/result';
import type {
  CreateHabitInput,
  CreateRoutineInput,
  HabitsViewModel,
  HabitService,
  UpdateHabitInput,
  UpdateRoutineInput,
} from '@/features/habits/application/habit-service';

export function useHabitController(service: HabitService, date: string) {
  const [view, setView] = useState<HabitsViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    service.getHabitsView(date).then((result) => {
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
      const reloaded = await service.getHabitsView(date);
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
    createHabit: (input: CreateHabitInput) => runMutation(() => service.createHabit(input)),
    updateHabit: (id: string, patch: UpdateHabitInput) =>
      runMutation(() => service.updateHabit(id, patch)),
    archiveHabit: (id: string) => runMutation(() => service.archiveHabit(id)),
    unarchiveHabit: (id: string) => runMutation(() => service.unarchiveHabit(id)),
    recordCheckIn: (input: { habitId: string; kind: HabitCheckInKind; note?: string }) =>
      runMutation(() => service.recordCheckIn({ ...input, date })),
    clearCheckIn: (habitId: string) => runMutation(() => service.clearCheckIn(habitId, date)),
    createRoutine: (input: CreateRoutineInput) => runMutation(() => service.createRoutine(input)),
    updateRoutine: (id: string, patch: UpdateRoutineInput) =>
      runMutation(() => service.updateRoutine(id, patch)),
    deleteRoutine: (id: string) => runMutation(() => service.deleteRoutine(id)),
    reorderRoutine: (id: string, habitIds: string[]) =>
      runMutation(() => service.reorderRoutine(id, habitIds)),
    getHabitHistory: (habitId: string) => service.getHabitHistory(habitId),
  };
}
