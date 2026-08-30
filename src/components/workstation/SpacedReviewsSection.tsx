'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain,
  CheckCircle2,
  Circle,
  Flame,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { getDueReviewItems, calculateReviewBudget } from '@/lib/algorithms/spacedRepetition';
import { soundEngine } from '@/lib/audio/soundEffects';

export function SpacedReviewsSection() {
  const router = useRouter();
  const {
    workItems,
    projects,
    selectedDate,
    dailyPlans,
    settings,
    reviewCompletions,
    toggleReviewCompletion,
    startFocusTimer,
  } = useAppStore();

  const plan = dailyPlans[selectedDate];
  const capacityHours = plan?.capacityHours ?? settings.defaultCapacityHours ?? 6;
  const reviewBudgetMins = calculateReviewBudget(capacityHours);

  const dueReviews = getDueReviewItems(
    workItems,
    projects,
    selectedDate,
    reviewCompletions || {}
  );

  const handleToggle = (lessonId: string) => {
    soundEngine?.playPop();
    toggleReviewCompletion(lessonId, selectedDate);
  };

  const handleStartReviewFocus = (lessonId: string) => {
    soundEngine?.playBell('start');
    startFocusTimer(lessonId, 'pomodoro', 15);
    router.push('/focus');
  };

  const completedCount = dueReviews.filter((r) => r.isCompleted).length;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bài Ôn Tập Ngắt Quãng (Spaced Repetition)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-500/30">
                {dueReviews.length} bài
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quy luật Ebbinghaus: Ôn lại sau 1 ngày, 3 ngày, 7 ngày, 14 ngày, 30 ngày để chuyển vào trí nhớ dài hạn
            </p>
          </div>
        </div>

        {/* Review Budget */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-tabular self-end sm:self-auto">
          <span>Ngân sách:</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {completedCount * 15}m / {reviewBudgetMins}m
          </span>
        </div>
      </div>

      {/* Due Reviews List */}
      <div className="space-y-2">
        {dueReviews.map((item) => {
          return (
            <div
              key={item.taskId}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                item.isCompleted
                  ? 'bg-slate-50/60 dark:bg-[#141822]/60 border-slate-200 dark:border-[#1e2538] opacity-75'
                  : 'bg-white dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] hover:border-purple-400 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  onClick={() => handleToggle(item.lessonId)}
                  className="text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                >
                  {item.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold truncate ${
                        item.isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.lessonTitle}
                    </span>

                    {item.projectTitle && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                        • {item.projectTitle}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono font-tabular mt-0.5">
                    <span>Hoàn thành: {item.completedDateFormatted}</span>
                    <span>• {item.estimatedMinutes}m ôn tập</span>
                  </div>
                </div>
              </div>

              {/* Stage Badge & Focus launcher */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold font-mono ${
                    item.intervalStage === 'overdue'
                      ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400 border border-red-200 dark:border-red-500/30 animate-pulse'
                      : item.intervalStage === 1
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                      : item.intervalStage === 3
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                      : item.intervalStage === 7
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                  }`}
                >
                  {item.intervalLabel}
                </span>

                {!item.isCompleted && (
                  <button
                    onClick={() => handleStartReviewFocus(item.lessonId)}
                    className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                    title="Bắt đầu phiên ôn tập 15 phút"
                  >
                    <Flame className="w-3 h-3" />
                    <span>Ôn 15m</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {dueReviews.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center gap-1">
            <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 mb-0.5" />
            <span>Hôm nay không có bài học nào đến hạn ôn tập.</span>
            <span className="text-[11px] opacity-75">
              Khi bạn hoàn thành các bài học mới, hệ thống sẽ tự động nhắc bạn ôn lại sau 1, 3, 7, 14, 30 ngày!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
