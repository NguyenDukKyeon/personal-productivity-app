'use client';

import { useEffect, useState } from 'react';
import { Calendar, Check, History, Sparkles, X } from 'lucide-react';
import type { Habit } from '@/domain/habits/habit';
import type { HabitCheckIn } from '@/domain/habits/habit-check-in';
import { calculateHabitMetrics } from '@/domain/habits/habit-metrics';
import { toLocalDateKey } from '@/domain/shared/local-date';
import type { Result } from '@/domain/shared/result';
import { Button } from '@/components/ui/Button';

interface HabitHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null;
  onGetHistory: (habitId: string) => Promise<Result<HabitCheckIn[]>>;
}

function getPastDateKeys(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dates.push(toLocalDateKey(d));
  }
  return dates;
}

export function HabitHistoryModal({
  isOpen,
  onClose,
  habit,
  onGetHistory,
}: HabitHistoryModalProps) {
  const [history, setHistory] = useState<HabitCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !habit) return;
    setIsLoading(true);
    onGetHistory(habit.id).then((res) => {
      if (res.ok) {
        setHistory(res.value);
      }
      setIsLoading(false);
    });
  }, [isOpen, habit, onGetHistory]);

  if (!isOpen || !habit) return null;

  const past14Days = getPastDateKeys(14);
  const metrics = calculateHabitMetrics({
    habit,
    dateKeys: past14Days,
    checkIns: history,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#1e2538] dark:bg-[#11141d] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e2538]">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {habit.title} History
            </h2>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#1e2538] dark:hover:text-slate-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 14-day Consistency Metrics */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center dark:bg-[#161b26]">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">14-Day Rate</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {metrics.consistencyRate}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Full / Min</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {metrics.fullCount} / {metrics.minimumCount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Recoveries</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.recoveriesCompleted}
            </span>
          </div>
        </div>

        {/* Factual History List */}
        <div className="mt-4 flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
            Recent Check-in Timeline
          </h3>

          {isLoading ? (
            <p className="py-6 text-center text-xs text-slate-400">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No check-in records recorded yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-[#1e2538]">
              {history.map((record) => (
                <div key={record.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-white">{record.date}</span>
                    {record.note && (
                      <span className="text-slate-500 dark:text-slate-400 italic">
                        &quot;{record.note}&quot;
                      </span>
                    )}
                  </div>

                  <div>
                    {record.kind === 'full' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <Check className="h-3 w-3" /> Full
                      </span>
                    )}
                    {record.kind === 'minimum' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <Sparkles className="h-3 w-3 text-amber-600" /> Minimum
                      </span>
                    )}
                    {record.kind === 'skipped' && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-[#1e2538] dark:text-slate-300">
                        Skipped
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end pt-3 border-t border-slate-100 dark:border-[#1e2538]">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
