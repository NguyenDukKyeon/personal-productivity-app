'use client';

import React from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Plus,
  Moon,
  Zap,
  Search,
} from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAppStore } from '@/lib/store/useAppStore';
import { getTodayDateString } from '@/lib/utils';
import { calculateDailyDisciplineScore } from '@/lib/algorithms/productivity';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

interface HeaderProps {
  onOpenQuickAdd?: () => void;
  onOpenShutdown?: () => void;
  onOpenCommandPalette?: () => void;
}

export function Header({ onOpenQuickAdd, onOpenShutdown, onOpenCommandPalette }: HeaderProps) {
  const {
    selectedDate,
    setSelectedDate,
    dailyPlans,
    workItems,
    habits,
    habitLogs,
    focusSessions,
  } = useAppStore();

  const todayStr = getTodayDateString();
  const isToday = selectedDate === todayStr;

  const parsedDate = selectedDate ? parseISO(selectedDate) : new Date();
  const dateFormatted = format(parsedDate, 'EEEE, dd/MM/yyyy', { locale: vi });

  // Calculate live discipline metrics
  const plan = dailyPlans[selectedDate];
  const metrics = calculateDailyDisciplineScore(
    selectedDate,
    plan,
    workItems,
    habits,
    habitLogs,
    focusSessions
  );

  const handlePrevDay = () => {
    const prev = subDays(parsedDate, 1);
    setSelectedDate(format(prev, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const next = addDays(parsedDate, 1);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  const handleTodayClick = () => {
    setSelectedDate(todayStr);
  };

  return (
    <header className="h-16 px-6 bg-white/80 dark:bg-[#0d1017]/80 backdrop-blur-md border-b border-slate-200 dark:border-[#1e2538] flex items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Date Navigation & Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-slate-100 dark:bg-[#161b26] rounded-xl border border-slate-200 dark:border-[#1e2538] p-0.5">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-[#202738] transition-colors"
            title="Ngày trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleTodayClick}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              isToday
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#202738]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Hôm nay</span>
          </button>

          <button
            onClick={handleNextDay}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-[#202738] transition-colors"
            title="Ngày sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize hidden sm:block">
          {dateFormatted}
        </div>
      </div>

      {/* Center: Command Palette Trigger Bar */}
      {onOpenCommandPalette && (
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-[#161b26] dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-400 dark:text-slate-500 transition-colors w-64 justify-between"
        >
          <div className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px] truncate">Tìm kiếm hoặc lệnh...</span>
          </div>
          <kbd className="text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-[#0d1017] text-slate-500 font-mono border border-slate-200 dark:border-[#1e2538]">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Right Stats & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Live Discipline Score Pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538]"
          title="Chỉ số kỷ luật trong ngày (Dựa trên Deep Work, Top 3 và Habits)"
        >
          <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Discipline:</span>
            <span
              className={`text-xs font-bold font-tabular ${
                metrics.disciplineScore >= 80
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : metrics.disciplineScore >= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {metrics.disciplineScore}%
            </span>
          </div>
        </div>

        {/* Deep Work logged today */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538]">
          <Flame className="w-4 h-4 text-orange-500 dark:text-orange-400" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Deep Work:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-tabular">
              {Math.floor(metrics.deepWorkMinutes / 60)}h {metrics.deepWorkMinutes % 60}m
            </span>
          </div>
        </div>

        {/* Daily Shutdown Button */}
        {onOpenShutdown && (
          <button
            onClick={onOpenShutdown}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#161b26] hover:bg-slate-200 dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] transition-colors"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Daily Shutdown</span>
          </button>
        )}

        {/* Light / Dark Mode Toggle */}
        <ThemeToggle />

        {/* Quick Add Task Button */}
        {onOpenQuickAdd && (
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm nhiệm vụ</span>
          </button>
        )}
      </div>
    </header>
  );
}
