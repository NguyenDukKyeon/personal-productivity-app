'use client';

import { useState } from 'react';
import { Archive, Check, History, MoreVertical, Pencil, RotateCcw, Sparkles } from 'lucide-react';
import type { Habit } from '@/domain/habits/habit';
import type { HabitCheckInKind } from '@/domain/habits/habit-check-in';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { HabitTodayItem } from '../application/habit-service';

interface HabitTodayCardProps {
  item: HabitTodayItem;
  onCheckIn: (habitId: string, kind: HabitCheckInKind, note?: string) => Promise<unknown> | void;
  onClearCheckIn: (habitId: string) => Promise<unknown> | void;
  onEdit: (habit: Habit) => void;
  onArchive: (habitId: string) => void;
  onViewHistory: (habit: Habit) => void;
}

const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

export function HabitTodayCard({
  item,
  onCheckIn,
  onClearCheckIn,
  onEdit,
  onArchive,
  onViewHistory,
}: HabitTodayCardProps) {
  const { habit, checkIn, isScheduledToday, isRecovery, lastScheduledDate } = item;
  const [showSkipInput, setShowSkipInput] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scheduleLabel =
    habit.schedule.kind === 'daily'
      ? 'Daily'
      : habit.schedule.weekdays.map((w) => WEEKDAY_NAMES[w] ?? w).join(', ');

  const handleCheckInAction = async (kind: HabitCheckInKind, note?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCheckIn(habit.id, kind, note);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await onCheckIn(habit.id, 'skipped', skipReason.trim() || undefined);
      // Only close and clear if not an error
      if (res && typeof res === 'object' && 'ok' in res && !(res as { ok: boolean }).ok) {
        // Keep skip reason visible on failure
      } else {
        setShowSkipInput(false);
        setSkipReason('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onClearCheckIn(habit.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      data-testid={`habit-card-${habit.title}`}
      className={cn(
        'relative flex flex-col gap-3 transition-all',
        checkIn?.kind === 'full' && 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20',
        checkIn?.kind === 'minimum' && 'border-amber-200 bg-amber-50/40 dark:border-amber-950 dark:bg-amber-950/20',
        checkIn?.kind === 'skipped' && 'border-slate-200 bg-slate-50/60 opacity-80 dark:border-[#1e2538] dark:bg-[#161b26]/50',
        !isScheduledToday && 'border-slate-200/60 bg-slate-50/30 opacity-75 dark:border-[#1e2538] dark:bg-[#161b26]/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
              {habit.title}
            </h3>
            {habit.cue && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-[#1e2538] dark:text-slate-300">
                📍 {habit.cue}
              </span>
            )}
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-[#1e2538] dark:text-slate-400">
              {scheduleLabel}
            </span>
            {!isScheduledToday && (
              <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-[#1e2538] dark:text-slate-400">
                Not scheduled today
              </span>
            )}
          </div>

          {habit.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {habit.description}
            </p>
          )}
        </div>

        {/* Action Menu Toggle */}
        <div className="relative shrink-0">
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#1e2538] dark:hover:text-slate-200"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Habit options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 flex w-36 flex-col rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-[#1e2538] dark:bg-[#161b26]">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-[#1e2538]"
                onClick={() => {
                  setMenuOpen(false);
                  onViewHistory(habit);
                }}
              >
                <History className="h-3.5 w-3.5" /> View History
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-[#1e2538]"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(habit);
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Habit
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                onClick={() => {
                  setMenuOpen(false);
                  onArchive(habit.id);
                }}
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Minimum Viable Version Box */}
      <div className="flex items-center gap-2 rounded-xl bg-slate-50/80 px-3 py-2 text-xs text-slate-700 dark:bg-[#161b26] dark:text-slate-300">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1 truncate">
          <span className="font-semibold text-slate-900 dark:text-white">Minimum: </span>
          {habit.minimumVersion}
        </div>
      </div>

      {/* Recovery Banner (Only shown on scheduled days) */}
      {isScheduledToday && isRecovery && !checkIn && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <span>⚡ Missed last occurrence {lastScheduledDate ? `on ${lastScheduledDate}` : ''}. Resume today with a small start.</span>
        </div>
      )}

      {/* Check-In Action Row (Only rendered for scheduled days) */}
      {isScheduledToday && (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#1e2538]">
          {!checkIn ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs px-3 py-1.5"
                  onClick={() => handleCheckInAction('full')}
                  disabled={isSubmitting}
                  aria-label={`Full check-in for ${habit.title}`}
                >
                  <Check className="h-3.5 w-3.5" /> Full
                </Button>

                <Button
                  variant="secondary"
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-200 text-xs px-3 py-1.5"
                  onClick={() => handleCheckInAction('minimum')}
                  disabled={isSubmitting}
                  aria-label={`Minimum check-in for ${habit.title}`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Minimum
                </Button>
              </div>

              <Button
                variant="ghost"
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                onClick={() => setShowSkipInput(!showSkipInput)}
                disabled={isSubmitting}
              >
                Skip
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                {checkIn.kind === 'full' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5" /> Full Done
                  </span>
                )}
                {checkIn.kind === 'minimum' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Minimum Done
                  </span>
                )}
                {checkIn.kind === 'skipped' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-[#1e2538] dark:text-slate-300">
                    Skipped {checkIn.note ? `(${checkIn.note})` : ''}
                  </span>
                )}
              </div>

              <Button
                variant="ghost"
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={handleClear}
                disabled={isSubmitting}
                aria-label={`Undo check-in for ${habit.title}`}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Undo
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Skip reason popdown */}
      {isScheduledToday && showSkipInput && (
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-[#1e2538]">
          <input
            type="text"
            placeholder="Optional skip reason (e.g. traveling, resting)"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            disabled={isSubmitting}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-indigo-400 dark:border-[#1e2538] dark:bg-[#161b26] dark:text-white"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              className="text-xs px-2 py-1"
              onClick={() => setShowSkipInput(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              className="text-xs px-3 py-1"
              onClick={handleSkipSubmit}
              disabled={isSubmitting}
            >
              Confirm Skip
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
