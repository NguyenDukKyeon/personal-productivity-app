'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  Play,
  Plus,
  Trash2,
  Target,
  Sparkles,
  Flame,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatMinutes } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';
import confetti from 'canvas-confetti';

export function Top3Section() {
  const router = useRouter();
  const {
    selectedDate,
    dailyPlans,
    workItems,
    setDailyTop3,
    toggleCompleteWorkItem,
    startFocusTimer,
  } = useAppStore();

  const [isSelecting, setIsSelecting] = useState(false);

  const plan = dailyPlans[selectedDate];
  const top3Ids = plan?.top3ItemIds || [];

  // Filter day items
  const dayItems = workItems.filter(
    (i) => i.scheduledDate === selectedDate || top3Ids.includes(i.id)
  );

  const top3Items = top3Ids
    .map((id) => workItems.find((item) => item.id === id))
    .filter(Boolean);

  const availableItems = dayItems.filter((i) => !top3Ids.includes(i.id));

  const handleToggleTop3Complete = (id: string) => {
    soundEngine?.playPop();
    toggleCompleteWorkItem(id);

    // Check if this completion finishes all 3
    const item = workItems.find((i) => i.id === id);
    if (item && item.status !== 'completed') {
      const remainingUncompleted = top3Items.filter(
        (i) => i && i.id !== id && i.status !== 'completed'
      );
      if (remainingUncompleted.length === 0 && top3Items.length > 0) {
        soundEngine?.playBell('complete');
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      }
    }
  };

  const handleAddTop3Item = (id: string) => {
    if (top3Ids.length >= 3) return;
    soundEngine?.playPop();
    setDailyTop3(selectedDate, [...top3Ids, id]);
    setIsSelecting(false);
  };

  const handleRemoveTop3Item = (id: string) => {
    soundEngine?.playPop();
    setDailyTop3(
      selectedDate,
      top3Ids.filter((tId) => tId !== id)
    );
  };

  const handleStartFocus = (id: string, estimatedMins: number) => {
    soundEngine?.playBell('start');
    startFocusTimer(id, 'pomodoro', Math.min(60, estimatedMins || 25));
    router.push('/focus');
  };

  const completedTop3Count = top3Items.filter((i) => i?.status === 'completed').length;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center">
            <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top 3 Ưu Tiên Sống Còn (Eat The Frog)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 dark:bg-[#161b26] text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-[#1e2538]">
                {completedTop3Count}/{top3Items.length} hoàn thành
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              3 nhiệm vụ quan trọng nhất tạo ra 80% kết quả của ngày hôm nay
            </p>
          </div>
        </div>

        {top3Ids.length < 3 && !isSelecting && (
          <button
            onClick={() => setIsSelecting(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ghim mục #{top3Ids.length + 1}</span>
          </button>
        )}
      </div>

      {/* Top 3 Cards Stack */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((slotIdx) => {
          const item = top3Items[slotIdx];
          const isCompleted = item?.status === 'completed';

          if (item) {
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 group ${
                  isCompleted
                    ? 'bg-slate-50/70 dark:bg-[#141822]/60 border-slate-200 dark:border-[#1e2538] opacity-75'
                    : 'bg-white dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] hover:border-indigo-400 dark:hover:border-indigo-500/40 shadow-xs'
                }`}
              >
                {/* Card Top: Slot Badge & Action */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center border ${
                        slotIdx === 0
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
                          : slotIdx === 1
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
                      }`}
                    >
                      #{slotIdx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-tabular">
                      {formatMinutes(item.estimatedMinutes)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveTop3Item(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                    title="Bỏ ghim khỏi Top 3"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card Middle: Title */}
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => handleToggleTop3Complete(item.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                  <p
                    className={`text-xs font-semibold leading-snug line-clamp-2 ${
                      isCompleted
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {item.title}
                  </p>
                </div>

                {/* Card Bottom: Focus action */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#1e2538] flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {item.actualMinutes > 0 ? `Đã làm: ${formatMinutes(item.actualMinutes)}` : 'Chưa bắt đầu'}
                  </span>

                  {!isCompleted && (
                    <button
                      onClick={() => handleStartFocus(item.id, item.estimatedMinutes)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-xs transition-transform active:scale-95"
                    >
                      <Flame className="w-3 h-3" />
                      <span>Focus</span>
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Empty Slot
          return (
            <div
              key={slotIdx}
              onClick={() => setIsSelecting(true)}
              className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-[#1e2538] hover:border-indigo-400 dark:hover:border-indigo-500/40 bg-slate-50/50 dark:bg-[#161b26]/30 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer min-h-[120px] transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#1c2230] text-slate-400 dark:text-slate-500 flex items-center justify-center text-xs font-mono font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                #{slotIdx + 1}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-white">
                Ghim mục ưu tiên #{slotIdx + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* Task Selector Modal / Drawer when picking a task for Top 3 */}
      {isSelecting && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chọn công việc để đưa vào Top 3:
            </span>
            <button
              onClick={() => setIsSelecting(false)}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              Đóng
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {availableItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAddTop3Item(item.id)}
                className="p-2.5 rounded-lg bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] hover:border-indigo-500 text-left text-xs flex items-center justify-between gap-2 transition-colors"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {item.title}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-tabular shrink-0">
                  {formatMinutes(item.estimatedMinutes)}
                </span>
              </button>
            ))}

            {availableItems.length === 0 && (
              <span className="text-xs text-slate-400 col-span-2 py-3 text-center">
                Không còn nhiệm vụ nào trong ngày. Hãy thêm nhiệm vụ mới trước!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
