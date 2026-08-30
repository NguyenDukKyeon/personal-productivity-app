'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Flame,
  ArrowRight,
  Sun,
  Sunset,
  Moon,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { calculateHabitStreak } from '@/lib/algorithms/productivity';
import { soundEngine } from '@/lib/audio/soundEffects';

export function HabitChecklist() {
  const {
    selectedDate,
    habits,
    habitLogs,
    toggleHabitLog,
  } = useAppStore();

  const handleToggle = (habitId: string) => {
    soundEngine?.playPop();
    toggleHabitLog(habitId, selectedDate);
  };

  const activeHabits = habits.filter((h) => !h.archived);

  // Group by routine
  const routines = [
    { key: 'morning', label: 'Routin Sáng', icon: Sun },
    { key: 'afternoon', label: 'Routin Chiều', icon: Sunset },
    { key: 'evening', label: 'Routin Tối', icon: Moon },
    { key: 'anytime', label: 'Linh hoạt', icon: Zap },
  ];

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Kỷ Luật Thói Quen (Atomic Habits)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quy tắc "Never Miss Twice" — Không bao giờ bỏ lỡ 2 ngày liên tiếp
            </p>
          </div>
        </div>

        <Link
          href="/habits"
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <span>Ma trận streak</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Routine Sections */}
      <div className="space-y-3">
        {routines.map((routine) => {
          const routineHabits = activeHabits.filter((h) => h.routine === routine.key);
          if (routineHabits.length === 0) return null;

          const RoutineIcon = routine.icon;

          return (
            <div key={routine.key} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <RoutineIcon className="w-3 h-3" />
                <span>{routine.label}</span>
              </div>

              <div className="space-y-1.5">
                {routineHabits.map((habit) => {
                  const log = habitLogs.find(
                    (l) => l.habitId === habit.id && l.date === selectedDate
                  );
                  const isCompleted = log?.isCompleted || false;
                  const streak = calculateHabitStreak(habit.id, habitLogs, selectedDate);
                  const showNeverMissTwice = streak.missedYesterday && !isCompleted;

                  return (
                    <div
                      key={habit.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCompleted
                          ? 'bg-slate-50/60 dark:bg-[#141822]/60 border-slate-200 dark:border-[#1e2538] opacity-75'
                          : 'bg-white dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] hover:border-emerald-400 dark:hover:border-emerald-500/40 shadow-xs'
                      }`}
                    >
                      <button
                        onClick={() => handleToggle(habit.id)}
                        className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <span
                            className={`text-xs font-semibold block truncate ${
                              isCompleted
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {habit.name}
                          </span>
                        </div>
                      </button>

                      {/* Right Indicators */}
                      <div className="flex items-center gap-2 shrink-0">
                        {showNeverMissTwice && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            <span>Cần làm hôm nay!</span>
                          </span>
                        )}

                        <div
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#11141d] text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1e2538]"
                          title={`Chuỗi streak: ${streak.currentStreak} ngày liên tiếp`}
                        >
                          <Flame className="w-3 h-3 text-orange-500" />
                          <span className="font-tabular">{streak.currentStreak}d</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {activeHabits.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            Chưa có thói quen nào. Hãy vào trang Atomic Habits để thiết lập!
          </div>
        )}
      </div>
    </div>
  );
}
