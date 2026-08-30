'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ListTodo,
  Plus,
  Play,
  CheckCircle2,
  Circle,
  Trash2,
  Flame,
  Calendar,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatMinutes } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';

export function TimeblockTimeline({ onOpenQuickAdd }: { onOpenQuickAdd: () => void }) {
  const router = useRouter();
  const {
    selectedDate,
    workItems,
    projects,
    toggleCompleteWorkItem,
    deleteWorkItem,
    startFocusTimer,
  } = useAppStore();

  const dayItems = workItems
    .filter((i) => i.scheduledDate === selectedDate)
    .sort((a, b) => {
      // Sort: uncompleted first, then by priority
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      const pOrder = { p1_urgent: 0, p2_high: 1, p3_medium: 2, p4_low: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    });

  const handleToggle = (id: string) => {
    soundEngine?.playPop();
    toggleCompleteWorkItem(id);
  };

  const handleDelete = (id: string) => {
    soundEngine?.playPop();
    deleteWorkItem(id);
  };

  const handleStartFocus = (id: string, mins: number) => {
    soundEngine?.playBell('start');
    startFocusTimer(id, 'pomodoro', Math.min(60, mins || 25));
    router.push('/focus');
  };

  const completedCount = dayItems.filter((i) => i.status === 'completed').length;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
            <ListTodo className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Danh Sách Nhiệm Vụ & Bài Học Trong Ngày
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 dark:bg-[#161b26] text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-[#1e2538]">
                {completedCount}/{dayItems.length} hoàn tất
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thực thi tuần tự từng nhiệm vụ trong phiên tập trung sâu
            </p>
          </div>
        </div>

        <button
          onClick={onOpenQuickAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm mục</span>
        </button>
      </div>

      {/* Item List */}
      <div className="space-y-2">
        {dayItems.map((item) => {
          const isCompleted = item.status === 'completed';
          const project = projects.find((p) => p.id === item.projectId);

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                isCompleted
                  ? 'bg-slate-50/60 dark:bg-[#141822]/60 border-slate-200 dark:border-[#1e2538] opacity-70'
                  : 'bg-white dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] hover:border-indigo-400 dark:hover:border-indigo-500/40 shadow-xs'
              }`}
            >
              {/* Left Checkbox & Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => handleToggle(item.id)}
                  className="text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.title}
                    </p>

                    {/* Priority Badge */}
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                        item.priority === 'p1_urgent'
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
                          : item.priority === 'p2_high'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {item.priority.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1 font-mono font-tabular">
                      <Clock className="w-3 h-3" />
                      {formatMinutes(item.estimatedMinutes)}
                    </span>

                    {project && (
                      <span className="truncate max-w-[140px] text-indigo-600 dark:text-indigo-400 font-medium">
                        • {project.title}
                      </span>
                    )}

                    {item.actualMinutes > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-tabular font-medium">
                        • Thực tế: {formatMinutes(item.actualMinutes)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!isCompleted && (
                  <button
                    onClick={() => handleStartFocus(item.id, item.estimatedMinutes)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-transform active:scale-95"
                    title="Bắt đầu phiên Deep Work cho việc này"
                  >
                    <Flame className="w-3 h-3" />
                    <span>Focus</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                  title="Xóa nhiệm vụ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {dayItems.length === 0 && (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-[#1e2538] rounded-xl bg-slate-50/50 dark:bg-[#161b26]/30">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Chưa có nhiệm vụ hoặc bài học nào được xếp cho ngày này.
            </p>
            <button
              onClick={onOpenQuickAdd}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
            >
              + Thêm nhiệm vụ đầu tiên
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
