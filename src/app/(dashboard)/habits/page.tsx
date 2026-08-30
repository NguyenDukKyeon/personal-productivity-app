'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Flame,
  ShieldAlert,
  Calendar,
  Sparkles,
  Trash2,
  X,
  Check,
  Sun,
  Sunset,
  Moon,
  Zap,
  TrendingUp,
  Award,
  Edit2,
  Minus,
  BookOpen,
  Activity,
  Droplet,
} from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAppStore } from '@/lib/store/useAppStore';
import { Habit, HabitRoutine } from '@/types';
import { calculateHabitStreak, calculateHabitConsistencyRate } from '@/lib/algorithms/productivity';
import { getTodayDateString } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';

export default function HabitsPage() {
  const {
    habits,
    habitLogs,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabitLog,
    setHabitProgressValue,
  } = useAppStore();

  const [activeRoutineFilter, setActiveRoutineFilter] = useState<'all' | HabitRoutine>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [routine, setRoutine] = useState<HabitRoutine>('morning');
  const [targetValue, setTargetValue] = useState(1);
  const [targetUnit, setTargetUnit] = useState<'times' | 'pages' | 'mins' | 'ml'>('times');
  const [color, setColor] = useState('#6366f1');

  const todayStr = getTodayDateString();
  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    return format(d, 'yyyy-MM-dd');
  });

  const activeHabits = habits.filter((h) => !h.archived);
  const filteredHabits =
    activeRoutineFilter === 'all'
      ? activeHabits
      : activeHabits.filter((h) => h.routine === activeRoutineFilter);

  // Calculate high-level stats
  const totalLogsPast7Days = habitLogs.filter((l) => past7Days.includes(l.date) && l.isCompleted).length;
  const maxPossibleLogsPast7Days = activeHabits.length * 7;
  const overallConsistencyRate =
    maxPossibleLogsPast7Days > 0
      ? Math.round((totalLogsPast7Days / maxPossibleLogsPast7Days) * 100)
      : 0;

  const streaks = activeHabits.map((h) => calculateHabitStreak(h.id, habitLogs, todayStr));
  const maxCurrentStreak = streaks.reduce((max, s) => Math.max(max, s.currentStreak), 0);
  const urgentCount = activeHabits.filter((h) => {
    const streak = calculateHabitStreak(h.id, habitLogs, todayStr);
    const completedToday = habitLogs.some(
      (l) => l.habitId === h.id && l.date === todayStr && l.isCompleted
    );
    return streak.missedYesterday && !completedToday;
  }).length;

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingHabit) {
      updateHabit(editingHabit.id, {
        name: name.trim(),
        routine,
        targetValue,
        targetUnit,
        color,
      });
    } else {
      addHabit({
        name: name.trim(),
        routine,
        frequencyType: 'daily',
        frequencyDays: [1, 2, 3, 4, 5, 6, 7],
        targetValue,
        targetUnit,
        color,
        icon: 'check',
      });
    }

    soundEngine?.playPop();
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setRoutine('morning');
    setTargetValue(1);
    setTargetUnit('times');
    setColor('#6366f1');
    setEditingHabit(null);
    setIsAddOpen(false);
  };

  const handleOpenEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setName(habit.name);
    setRoutine(habit.routine);
    setTargetValue(habit.targetValue || 1);
    setTargetUnit((habit.targetUnit as 'times' | 'pages' | 'mins' | 'ml') || 'times');
    setColor(habit.color || '#6366f1');
    setIsAddOpen(true);
  };

  const handleToggle = (habitId: string, dateStr: string) => {
    soundEngine?.playPop();
    toggleHabitLog(habitId, dateStr);
  };

  const handleIncrementProgress = (habit: Habit, dateStr: string, delta: number) => {
    const log = habitLogs.find((l) => l.habitId === habit.id && l.date === dateStr);
    const currentVal = log?.completedValue || 0;
    const newVal = Math.max(0, currentVal + delta);
    soundEngine?.playPop();
    setHabitProgressValue(habit.id, dateStr, newVal);
  };

  const getLog = (habitId: string, dateStr: string) => {
    return habitLogs.find((l) => l.habitId === habitId && l.date === dateStr);
  };

  const templates = [
    { name: 'Đọc 20 trang sách phát triển bản thân', routine: 'morning' as const, val: 20, unit: 'pages' as const, color: '#8b5cf6' },
    { name: 'Thiền chánh niệm 10 phút', routine: 'morning' as const, val: 10, unit: 'mins' as const, color: '#10b981' },
    { name: 'Deep Work ít nhất 2 phiên Pomodoro', routine: 'afternoon' as const, val: 2, unit: 'times' as const, color: '#f59e0b' },
    { name: 'Uống đủ 2000ml nước lọc', routine: 'anytime' as const, val: 2000, unit: 'ml' as const, color: '#3b82f6' },
    { name: 'Nghiệm thu cuối ngày (Daily Shutdown)', routine: 'evening' as const, val: 1, unit: 'times' as const, color: '#6366f1' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Rèn Luyện Thói Quen (Atomic Habits & Routines)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Xây dựng chuỗi kỷ luật bền bỉ • Triết lý "Never Miss Twice" (Không bao giờ bỏ lỡ 2 ngày liên tiếp)
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm thói quen mới</span>
        </button>
      </div>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tỷ lệ kỷ luật 7 ngày</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono font-tabular">
            {overallConsistencyRate}%
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-[#161b26] rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: `${overallConsistencyRate}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Streak dài nhất</span>
            <Flame className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-xl font-bold text-orange-600 dark:text-orange-400 font-mono font-tabular">
            {maxCurrentStreak} ngày
          </div>
          <p className="text-[10px] text-slate-400">Chuỗi liên tục hiện tại</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Thói quen duy trì</span>
            <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono font-tabular">
            {activeHabits.length} mục
          </div>
          <p className="text-[10px] text-slate-400 font-tabular">Đang theo dõi đều đặn</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Never Miss Twice</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono font-tabular">
            {urgentCount} mục
          </div>
          <p className="text-[10px] text-slate-400">Cần làm hôm nay để giữ chuỗi</p>
        </div>
      </div>

      {/* Routine Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'Tất cả Routines', icon: Sparkles },
          { key: 'morning', label: 'Routin Sáng', icon: Sun },
          { key: 'afternoon', label: 'Routin Chiều', icon: Sunset },
          { key: 'evening', label: 'Routin Tối', icon: Moon },
          { key: 'anytime', label: 'Linh hoạt', icon: Zap },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isSelected = activeRoutineFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveRoutineFilter(tab.key as 'all' | HabitRoutine)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#11141d] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1e2538]'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 7-Day Consistency Matrix */}
      <div className="rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1e2538]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ma trận theo dõi 7 ngày & tiến độ định lượng
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-tabular font-mono">
            {filteredHabits.length} thói quen
          </span>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1e2538]">
                <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400">Thói quen & Mục tiêu</th>
                <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400 text-center">Routine</th>
                {past7Days.map((dStr, idx) => {
                  const isToday = dStr === todayStr;
                  return (
                    <th
                      key={dStr}
                      className={`pb-3 font-semibold text-center ${
                        isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <div>{idx === 6 ? 'Hôm nay' : format(new Date(dStr), 'EEE', { locale: vi })}</div>
                      <div className="text-[10px] opacity-75 font-tabular font-mono">{format(new Date(dStr), 'dd/MM')}</div>
                    </th>
                  );
                })}
                <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400 text-center">Streak</th>
                <th className="pb-3 font-semibold text-slate-500 dark:text-slate-400 text-center">Độ kiên định</th>
                <th className="pb-3 text-right"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-[#1e2538]/50">
              {filteredHabits.map((habit) => {
                const streak = calculateHabitStreak(habit.id, habitLogs, todayStr);
                const consistencyRate = calculateHabitConsistencyRate(habit.id, habitLogs, 30);
                const isQuantitative = habit.targetUnit && habit.targetUnit !== 'times' && habit.targetValue > 1;

                return (
                  <tr key={habit.id} className="hover:bg-slate-50 dark:hover:bg-[#161b26]/50 transition-colors">
                    {/* Habit Name & Target */}
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: habit.color || '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <span className="block font-semibold truncate text-slate-900 dark:text-white">
                            {habit.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-tabular">
                            Mục tiêu: {habit.targetValue} {habit.targetUnit || 'lần'}/ngày
                          </span>
                        </div>

                        {streak.missedYesterday && !habitLogs.some((l) => l.habitId === habit.id && l.date === todayStr && l.isCompleted) && (
                          <span
                            className="p-0.5 rounded text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 shrink-0"
                            title="Quy tắc Never Miss Twice: Cần hoàn thành hôm nay!"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Routine Badge */}
                    <td className="py-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#161b26] text-slate-600 dark:text-slate-400 capitalize font-medium border border-slate-200 dark:border-[#1e2538]">
                        {habit.routine}
                      </span>
                    </td>

                    {/* 7 Days Cells */}
                    {past7Days.map((dStr) => {
                      const log = getLog(habit.id, dStr);
                      const done = log?.isCompleted || false;
                      const progressVal = log?.completedValue || 0;

                      if (isQuantitative) {
                        return (
                          <td key={dStr} className="py-3 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <div
                                onClick={() => handleToggle(habit.id, dStr)}
                                className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold cursor-pointer transition-all ${
                                  done
                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                                    : progressVal > 0
                                    ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'
                                    : 'bg-slate-100 dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] text-slate-400 hover:border-indigo-400'
                                }`}
                                title={`Tiến độ: ${progressVal}/${habit.targetValue} ${habit.targetUnit}`}
                              >
                                {progressVal}/{habit.targetValue}
                              </div>

                              {/* Micro +/- controls for today */}
                              {dStr === todayStr && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleIncrementProgress(habit, dStr, -1)}
                                    className="p-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={() => handleIncrementProgress(habit, dStr, 1)}
                                    className="p-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={dStr} className="py-3 text-center">
                          <button
                            onClick={() => handleToggle(habit.id, dStr)}
                            className={`w-6 h-6 rounded-lg border inline-flex items-center justify-center transition-all ${
                              done
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-[#161b26] border-slate-300 dark:border-[#1e2538] text-transparent hover:border-indigo-400'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </td>
                      );
                    })}

                    {/* Streak Counter */}
                    <td className="py-3 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 font-bold font-mono font-tabular">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>{streak.currentStreak}d</span>
                      </div>
                    </td>

                    {/* 30-Day Consistency */}
                    <td className="py-3 text-center">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 font-tabular">
                        {consistencyRate}%
                      </span>
                    </td>

                    {/* Actions: Edit / Delete */}
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(habit)}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Sửa thói quen"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Xóa thói quen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredHabits.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-slate-400">
                    Chưa có thói quen nào trong danh mục này. Hãy bấm "Thêm thói quen mới"!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Habit Modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={resetForm}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1e2538]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{editingHabit ? 'Chỉnh sửa Thói quen' : 'Tạo Thói quen Nguyên tử mới'}</span>
              </h3>
              <button onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Atomic Habit Suggestions */}
            {!editingHabit && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Gợi ý thói quen nguyên tử mẫu (1-Click)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => {
                        setName(tpl.name);
                        setRoutine(tpl.routine);
                        setTargetValue(tpl.val);
                        setTargetUnit(tpl.unit);
                        setColor(tpl.color);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 hover:bg-indigo-50 dark:bg-[#161b26] dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-slate-700 dark:text-slate-300 font-medium transition-colors"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên thói quen</label>
                <input
                  type="text"
                  placeholder="VD: Đọc sách 20 trang, Thiền 10 phút, Chạy bộ..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              {/* Routine Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Khung thời gian (Routine)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'morning', label: 'Sáng', icon: Sun },
                    { key: 'afternoon', label: 'Chiều', icon: Sunset },
                    { key: 'evening', label: 'Tối', icon: Moon },
                    { key: 'anytime', label: 'Linh hoạt', icon: Zap },
                  ].map((r) => {
                    const RIcon = r.icon;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRoutine(r.key as HabitRoutine)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                          routine === r.key
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <RIcon className="w-3.5 h-3.5" />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantitative Target */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mục tiêu mỗi ngày</label>
                  <input
                    type="number"
                    min="1"
                    value={targetValue}
                    onChange={(e) => setTargetValue(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Đơn vị đo lường</label>
                  <select
                    value={targetUnit}
                    onChange={(e) => setTargetUnit(e.target.value as 'times' | 'pages' | 'mins' | 'ml')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="times">Lần (hoàn thành có/không)</option>
                    <option value="pages">Trang (Sách/Tài liệu)</option>
                    <option value="mins">Phút (Thiền/Tập luyện)</option>
                    <option value="ml">ml (Uống nước)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1e2538]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#161b26]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                >
                  {editingHabit ? 'Lưu thay đổi' : 'Tạo thói quen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
