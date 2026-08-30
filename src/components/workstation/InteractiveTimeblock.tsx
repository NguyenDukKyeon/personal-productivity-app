'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Play,
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  LayoutGrid,
  List,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { WorkItem } from '@/types';
import { formatMinutes, getTodayDateString } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';

interface InteractiveTimeblockProps {
  onOpenQuickAdd: (defaultTime?: string) => void;
}

export function InteractiveTimeblock({ onOpenQuickAdd }: InteractiveTimeblockProps) {
  const router = useRouter();
  const {
    selectedDate,
    workItems,
    projects,
    toggleCompleteWorkItem,
    deleteWorkItem,
    updateWorkItem,
    startFocusTimer,
  } = useAppStore();

  const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');

  // Filter day items
  const dayItems = workItems.filter((i) => i.scheduledDate === selectedDate);

  // Timeblock slots: 06:00 to 22:00
  const startHour = 6;
  const endHour = 22;
  const hours = Array.from({ length: endHour - startHour + 1 }).map((_, i) => startHour + i);

  const handleStartFocus = (id: string, mins: number) => {
    soundEngine?.playBell('start');
    startFocusTimer(id, 'pomodoro', Math.min(60, mins || 25));
    router.push('/focus');
  };

  const handleToggle = (id: string) => {
    soundEngine?.playPop();
    toggleCompleteWorkItem(id);
  };

  const handleDelete = (id: string) => {
    soundEngine?.playPop();
    deleteWorkItem(id);
  };

  const handleAssignTime = (id: string, timeStr: string) => {
    soundEngine?.playPop();
    updateWorkItem(id, { scheduledTimeStart: timeStr });
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
      {/* Header & View Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Khung Giờ Lịch Trình (Timeblock Timeline)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 dark:bg-[#161b26] text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-[#1e2538]">
                {dayItems.length} mục
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Khóa chặt từng khung giờ để bảo vệ sự tập trung cao độ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-[#161b26] p-1 rounded-xl border border-slate-200 dark:border-[#1e2538]">
            <button
              onClick={() => setViewStyle('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewStyle === 'grid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Chế độ Lưới thời gian (Hour-by-hour grid)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewStyle('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewStyle === 'list'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Chế độ Danh sách (List view)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => onOpenQuickAdd()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm mục</span>
          </button>
        </div>
      </div>

      {/* Grid Mode: Hour by hour */}
      {viewStyle === 'grid' && (
        <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
          {hours.map((hour) => {
            const timeKey = `${String(hour).padStart(2, '0')}:00`;
            const matchingItems = dayItems.filter((item) => {
              if (!item.scheduledTimeStart) return false;
              const itemHour = parseInt(item.scheduledTimeStart.split(':')[0], 10);
              return itemHour === hour;
            });

            return (
              <div
                key={hour}
                className="flex items-start gap-3 py-1.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#161b26]/50 transition-colors group"
              >
                {/* Hour Label */}
                <div className="w-12 text-right text-xs font-mono font-bold text-slate-400 dark:text-slate-500 shrink-0 pt-1 font-tabular">
                  {timeKey}
                </div>

                {/* Slot Content */}
                <div className="flex-1 min-w-0 space-y-1.5 border-l-2 border-slate-200 dark:border-[#1e2538] pl-3">
                  {matchingItems.map((item) => {
                    const isCompleted = item.status === 'completed';
                    const project = projects.find((p) => p.id === item.projectId);

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                          isCompleted
                            ? 'bg-slate-50/70 dark:bg-[#141822]/60 border-slate-200 dark:border-[#1e2538] opacity-70'
                            : 'bg-white dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] hover:border-indigo-400 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
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
                            <span
                              className={`text-xs font-semibold block truncate ${
                                isCompleted
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.title}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono font-tabular">
                              <span>@{item.scheduledTimeStart}</span>
                              <span>• {formatMinutes(item.estimatedMinutes)}</span>
                              {project && <span className="text-indigo-600 dark:text-indigo-400">• {project.title}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!isCompleted && (
                            <button
                              onClick={() => handleStartFocus(item.id, item.estimatedMinutes)}
                              className="p-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-transform active:scale-95"
                              title="Bắt đầu Focus"
                            >
                              <Flame className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                            title="Xóa"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {matchingItems.length === 0 && (
                    <button
                      onClick={() => onOpenQuickAdd(timeKey)}
                      className="w-full text-left py-1 text-[11px] text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 group/btn"
                    >
                      <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">
                        + Xếp việc vào {timeKey}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List Mode */}
      {viewStyle === 'list' && (
        <div className="space-y-2">
          {dayItems.map((item) => {
            const isCompleted = item.status === 'completed';
            const project = projects.find((p) => p.id === item.projectId);

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-slate-50/70 dark:bg-[#141822]/60 border-slate-200 dark:border-[#1e2538] opacity-70'
                    : 'bg-white dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] hover:border-indigo-400 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                    <span
                      className={`text-xs font-semibold block truncate ${
                        isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono font-tabular mt-0.5">
                      <span>{formatMinutes(item.estimatedMinutes)}</span>
                      {item.scheduledTimeStart && <span>• @{item.scheduledTimeStart}</span>}
                      {project && <span className="text-indigo-600 dark:text-indigo-400">• {project.title}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isCompleted && (
                    <button
                      onClick={() => handleStartFocus(item.id, item.estimatedMinutes)}
                      className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                    >
                      <Flame className="w-3 h-3" />
                      <span>Focus</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {dayItems.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              Chưa có nhiệm vụ nào trong ngày. Bấm "Thêm mục" hoặc nhấn Cmd+K để tạo nhanh!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
