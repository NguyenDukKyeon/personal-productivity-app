'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Plus,
  Inbox,
  CheckCircle,
  Circle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import { addDays, format, startOfWeek, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatMinutes, getTodayDateString } from '@/lib/utils';
import { QuickAddModal } from '@/components/shared/QuickAddModal';
import { soundEngine } from '@/lib/audio/soundEffects';

export default function FlexiblePlannerPage() {
  const router = useRouter();
  const {
    workItems,
    dailyPlans,
    settings,
    updateWorkItem,
    toggleCompleteWorkItem,
    startFocusTimer,
  } = useAppStore();

  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [targetDateForAdd, setTargetDateForAdd] = useState<string>(getTodayDateString());

  // Generate 7 days of the selected view week (Monday to Sunday)
  const baseDate = addDays(new Date(), currentWeekOffset * 7);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const todayStr = getTodayDateString();

  // Backlog items
  const backlogItems = workItems.filter((i) => !i.scheduledDate && i.status !== 'completed');

  const handleMoveToDay = (itemId: string, dateStr: string) => {
    soundEngine?.playPop();
    updateWorkItem(itemId, { scheduledDate: dateStr, status: 'scheduled' });
  };

  const handleMoveToBacklog = (itemId: string) => {
    soundEngine?.playPop();
    updateWorkItem(itemId, { scheduledDate: null, status: 'backlog' });
  };

  const handleMoveToTomorrow = (itemId: string, currentDateStr: string) => {
    const nextDayStr = format(addDays(new Date(currentDateStr), 1), 'yyyy-MM-dd');
    handleMoveToDay(itemId, nextDayStr);
  };

  const handleToggleComplete = (id: string) => {
    soundEngine?.playPop();
    toggleCompleteWorkItem(id);
  };

  const handleStartFocus = (itemId: string, mins: number) => {
    soundEngine?.playBell('start');
    startFocusTimer(itemId, 'pomodoro', Math.min(60, mins || 25));
    router.push('/focus');
  };

  const handleOpenAddForDay = (dateStr: string) => {
    setTargetDateForAdd(dateStr);
    setIsQuickAddOpen(true);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header & Week Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Lập Lịch Linh Hoạt (Flexible Multi-Day Planner)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Phân bổ khối lượng bài học & nhiệm vụ trải đều 7 ngày theo quota quỹ giờ cam kết
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Week Navigation Controls */}
          <div className="flex items-center bg-white dark:bg-[#11141d] rounded-xl border border-slate-200 dark:border-[#1e2538] p-0.5 shadow-xs">
            <button
              onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#161b26] transition-colors"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentWeekOffset(0)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                currentWeekOffset === 0
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161b26]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tuần này</span>
            </button>

            <button
              onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#161b26] transition-colors"
              title="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => handleOpenAddForDay(todayStr)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mục mới</span>
          </button>
        </div>
      </div>

      {/* Flexible Board Grid: 1 Backlog Column + 7 Day Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8 gap-4 items-start">
        {/* Backlog Column */}
        <div className="rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] p-3.5 space-y-3 shadow-xs transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e2538]">
            <div className="flex items-center gap-1.5">
              <Inbox className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Backlog / Chờ</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#161b26] text-slate-600 dark:text-slate-400 font-semibold font-tabular font-mono border border-slate-200 dark:border-[#1e2538]">
              {backlogItems.length}
            </span>
          </div>

          <div className="space-y-2 min-h-[350px]">
            {backlogItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all text-xs space-y-2 group"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">{item.title}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-mono font-tabular">
                    {formatMinutes(item.estimatedMinutes)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-[#1e2538]">
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleMoveToDay(item.id, e.target.value);
                    }}
                    defaultValue=""
                    className="w-full text-[10px] bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] rounded-lg text-indigo-600 dark:text-indigo-400 px-2 py-1 focus:outline-none font-medium"
                  >
                    <option value="" disabled>
                      → Xếp vào ngày...
                    </option>
                    {weekDays.map((d) => {
                      const dStr = format(d, 'yyyy-MM-dd');
                      return (
                        <option key={dStr} value={dStr}>
                          {format(d, 'EEEE (dd/MM)', { locale: vi })}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            ))}

            {backlogItems.length === 0 && (
              <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
                Không có mục tồn đọng
              </div>
            )}
          </div>
        </div>

        {/* 7 Days Columns */}
        {weekDays.map((dayDate) => {
          const dateStr = format(dayDate, 'yyyy-MM-dd');
          const isCurrentToday = dateStr === todayStr;
          const plan = dailyPlans[dateStr];
          const capacityHours = plan?.capacityHours ?? settings.defaultCapacityHours ?? 6;
          const capacityMinutes = capacityHours * 60;

          const dayItems = workItems.filter((i) => i.scheduledDate === dateStr);
          const plannedMins = dayItems.reduce((acc, i) => acc + i.estimatedMinutes, 0);
          const isOverbooked = plannedMins > capacityMinutes;
          const usagePercent = capacityMinutes > 0 ? Math.min(100, Math.round((plannedMins / capacityMinutes) * 100)) : 0;

          return (
            <div
              key={dateStr}
              className={`rounded-2xl border p-3.5 space-y-3 transition-all ${
                isCurrentToday
                  ? 'bg-white dark:bg-[#11141d] border-indigo-400 dark:border-indigo-500/40 shadow-xs'
                  : 'bg-white dark:bg-[#11141d] border-slate-200 dark:border-[#1e2538]'
              }`}
            >
              {/* Day Header */}
              <div className="pb-2 border-b border-slate-200 dark:border-[#1e2538] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold capitalize ${
                        isCurrentToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {format(dayDate, 'EEEE', { locale: vi })}
                    </span>
                    {isCurrentToday && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-bold uppercase">
                        Hôm nay
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-tabular font-mono">
                    {format(dayDate, 'dd/MM')}
                  </span>
                </div>

                {/* Capacity progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-tabular font-mono">
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatMinutes(plannedMins)} / {capacityHours}h
                    </span>
                    {isOverbooked ? (
                      <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        +{formatMinutes(plannedMins - capacityMinutes)}
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {usagePercent}%
                      </span>
                    )}
                  </div>

                  <div className="h-1 w-full bg-slate-100 dark:bg-[#161b26] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverbooked
                          ? 'bg-red-500'
                          : usagePercent > 80
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, usagePercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Day Items List */}
              <div className="space-y-2 min-h-[350px]">
                {dayItems.map((item) => {
                  const isCompleted = item.status === 'completed';

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border transition-all text-xs space-y-1.5 ${
                        isCompleted
                          ? 'bg-slate-50/60 dark:bg-[#141822]/60 border-slate-200 dark:border-[#1e2538] opacity-75'
                          : 'bg-slate-50 dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] hover:border-indigo-400 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => handleToggleComplete(item.id)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
                          ) : (
                            <Circle className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <span
                            className={`font-semibold block truncate ${
                              isCompleted
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.title}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono font-tabular mt-0.5">
                            <span>{formatMinutes(item.estimatedMinutes)}</span>
                            {item.scheduledTimeStart && <span>• @{item.scheduledTimeStart}</span>}
                          </div>
                        </div>

                        {!isCompleted && (
                          <button
                            onClick={() => handleStartFocus(item.id, item.estimatedMinutes)}
                            className="p-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-transform active:scale-95 shrink-0"
                            title="Focus ngay"
                          >
                            <Flame className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Micro day transfer actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-[#1e2538]/60 text-[10px]">
                        <button
                          onClick={() => handleMoveToTomorrow(item.id, dateStr)}
                          className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-medium"
                          title="Chuyển sang ngày tiếp theo"
                        >
                          +1 ngày →
                        </button>

                        <button
                          onClick={() => handleMoveToBacklog(item.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Đưa về Backlog"
                        >
                          Về Backlog
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => handleOpenAddForDay(dateStr)}
                  className="w-full py-1.5 rounded-xl border border-dashed border-slate-200 dark:border-[#1e2538] hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        defaultDate={targetDateForAdd}
      />
    </div>
  );
}
