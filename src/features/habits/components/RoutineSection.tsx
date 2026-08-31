'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Trash2 } from 'lucide-react';
import type { Habit } from '@/domain/habits/habit';
import type { HabitCheckInKind } from '@/domain/habits/habit-check-in';
import type { Routine } from '@/domain/habits/routine';
import type { HabitTodayItem } from '../application/habit-service';
import { HabitTodayCard } from './HabitTodayCard';

interface RoutineSectionProps {
  routine: Routine;
  items: HabitTodayItem[];
  onCheckIn: (habitId: string, kind: HabitCheckInKind, note?: string) => Promise<unknown> | void;
  onClearCheckIn: (habitId: string) => Promise<unknown> | void;
  onEditHabit: (habit: Habit) => void;
  onArchiveHabit: (habitId: string) => void;
  onViewHistory: (habit: Habit) => void;
  onDeleteRoutine: (routineId: string) => void;
  onMoveHabit: (habitId: string, direction: 'up' | 'down') => void;
}

export function RoutineSection({
  routine,
  items,
  onCheckIn,
  onClearCheckIn,
  onEditHabit,
  onArchiveHabit,
  onViewHistory,
  onDeleteRoutine,
  onMoveHabit,
}: RoutineSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const scheduledItems = items.filter((i) => i.isScheduledToday);
  const completedCount = scheduledItems.filter(
    (i) => i.checkIn && (i.checkIn.kind === 'full' || i.checkIn.kind === 'minimum'),
  ).length;
  const totalScheduledCount = scheduledItems.length;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-[#1e2538] dark:bg-[#11141d]/50">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#1e2538]"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand routine' : 'Collapse routine'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <Layers className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {routine.name}
          </h2>
          {routine.contextLabel && (
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {routine.contextLabel}
            </span>
          )}
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            ({completedCount}/{totalScheduledCount} completed today)
          </span>
        </div>

        <button
          type="button"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          onClick={() => onDeleteRoutine(routine.id)}
          title="Delete Routine"
          aria-label="Delete Routine"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      {!collapsed && (
        <div className="flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">
              No habits in this routine yet. Edit a habit to assign it here.
            </p>
          ) : (
            items.map((item, index) => (
              <div key={item.habit.id} className="flex items-start gap-2">
                <div className="flex flex-col pt-3">
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-[#1e2538] dark:hover:text-slate-200"
                    onClick={() => onMoveHabit(item.habit.id, 'up')}
                    disabled={index === 0}
                    aria-label={`Move ${item.habit.title} up`}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-[#1e2538] dark:hover:text-slate-200"
                    onClick={() => onMoveHabit(item.habit.id, 'down')}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${item.habit.title} down`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <HabitTodayCard
                    item={item}
                    onCheckIn={onCheckIn}
                    onClearCheckIn={onClearCheckIn}
                    onEdit={onEditHabit}
                    onArchive={onArchiveHabit}
                    onViewHistory={onViewHistory}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
