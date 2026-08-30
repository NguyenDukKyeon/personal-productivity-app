'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Sparkles,
  Flame,
  Zap,
  Bot,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAppStore } from '@/lib/store/useAppStore';
import { calculateDailyDisciplineScore } from '@/lib/algorithms/productivity';
import { formatMinutes } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';

export default function ReviewPage() {
  const {
    dailyPlans,
    workItems,
    habits,
    habitLogs,
    focusSessions,
    settings,
    addWorkItem,
  } = useAppStore();

  const [aiCoachAdvice, setAiCoachAdvice] = useState<string | null>(null);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);

  // Decompose task state
  const [taskPrompt, setTaskPrompt] = useState('');
  const [decomposedSteps, setDecomposedSteps] = useState<
    Array<{ title: string; estimatedMinutes: number }>
  >([]);
  const [isLoadingDecompose, setIsLoadingDecompose] = useState(false);

  // Calculate past 7 days data
  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dStr = format(d, 'yyyy-MM-dd');
    const plan = dailyPlans[dStr];
    const metrics = calculateDailyDisciplineScore(
      dStr,
      plan,
      workItems,
      habits,
      habitLogs,
      focusSessions
    );
    return {
      date: dStr,
      dayLabel: format(d, 'EEE', { locale: vi }),
      ...metrics,
    };
  });

  const totalDeepWork7Days = past7Days.reduce((acc, d) => acc + d.deepWorkMinutes, 0);
  const avgDiscipline7Days = Math.round(
    past7Days.reduce((acc, d) => acc + d.disciplineScore, 0) / 7
  );

  // Trigger Gemini AI Coach
  const handleAskCoach = async () => {
    setIsLoadingCoach(true);
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyData: past7Days,
          userApiKey: settings.geminiApiKey,
          model: settings.geminiModel,
        }),
      });
      const data = await res.json();
      setAiCoachAdvice(data.advice);
      soundEngine?.playBell('complete');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCoach(false);
    }
  };

  // Trigger Gemini Task Decomposer
  const handleDecompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPrompt.trim()) return;

    setIsLoadingDecompose(true);
    try {
      const res = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskGoal: taskPrompt.trim(),
          userApiKey: settings.geminiApiKey,
          model: settings.geminiModel,
        }),
      });
      const data = await res.json();
      setDecomposedSteps(data.subtasks || data.steps || []);
      soundEngine?.playBell('complete');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDecompose(false);
    }
  };

  const handleAddStepToBacklog = (step: { title: string; estimatedMinutes: number }) => {
    addWorkItem({
      title: step.title,
      type: 'task',
      estimatedMinutes: step.estimatedMinutes,
      priority: 'p2_high',
      status: 'backlog',
      scheduledDate: null,
    });
    soundEngine?.playPop();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Phân Tích Hiệu Suất & Gemini AI Coach
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Theo dõi số liệu thực tế 7 ngày, nhận đề xuất tối ưu kỷ luật và bẻ nhỏ mục tiêu phức tạp
        </p>
      </div>

      {/* 7-Day Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng Deep Work 7 ngày</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-tabular">
            {Math.floor(totalDeepWork7Days / 60)}h {totalDeepWork7Days % 60}m
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-tabular">
            Trung bình {Math.round(totalDeepWork7Days / 7)} phút / ngày
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Điểm Kỷ luật Trung bình</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-tabular">
            {avgDiscipline7Days}%
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-tabular">
            {avgDiscipline7Days >= 80 ? '🔥 Rất xuất sắc' : 'Đang duy trì ổn định'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mô hình AI kích hoạt</span>
            <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-300 truncate">
            {settings.geminiModel || 'gemini-3.7-flash'}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {settings.geminiApiKey ? 'BYOK Key Active' : 'Chế độ Local Engine'}
          </p>
        </div>
      </div>

      {/* 7-Day Visual Performance Chart */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Biểu đồ Deep Work & Điểm kỷ luật 7 ngày</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Đơn vị: Phút Deep Work</span>
        </div>

        <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2">
          {past7Days.map((d) => {
            const maxMins = 360; // 6 hours scale
            const barHeightPercent = Math.min(100, Math.max(8, (d.deepWorkMinutes / maxMins) * 100));

            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity font-tabular">
                  {d.deepWorkMinutes}m ({d.disciplineScore}%)
                </div>
                <div className="w-full bg-slate-100 dark:bg-[#161b26] rounded-xl overflow-hidden h-full flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-purple-600 rounded-xl transition-all group-hover:brightness-125"
                    style={{ height: `${barHeightPercent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 capitalize">
                  {d.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gemini AI Coach & Smart Decomposer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gemini AI Coach Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Gemini Productivity Coach</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Phân tích thói quen và tối ưu lịch trình</p>
              </div>
            </div>

            <button
              onClick={handleAskCoach}
              disabled={isLoadingCoach}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {isLoadingCoach ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isLoadingCoach ? 'Đang phân tích...' : 'Nhận tư vấn AI'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-700 dark:text-slate-300 leading-relaxed min-h-[140px] flex items-center justify-center">
            {aiCoachAdvice ? (
              <div className="whitespace-pre-line">{aiCoachAdvice}</div>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 text-center">
                Bấm "Nhận tư vấn AI" để Gemini tổng hợp dữ liệu 7 ngày và đưa ra lời khuyên dành riêng cho bạn.
              </span>
            )}
          </div>
        </div>

        {/* Smart Task Decomposer Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bẻ nhỏ nhiệm vụ (Task Decomposer)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Phân rã mục tiêu lớn thành các bước vi mô dễ thực hiện</p>
            </div>
          </div>

          <form onSubmit={handleDecompose} className="flex gap-2">
            <input
              type="text"
              placeholder="VD: Viết luận văn tốt nghiệp, Chuẩn bị bài thuyết trình..."
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isLoadingDecompose}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              {isLoadingDecompose ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              <span>Bẻ nhỏ</span>
            </button>
          </form>

          {/* Decomposed Steps List */}
          {decomposedSteps.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#1e2538]">
              {decomposedSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold font-tabular">#{idx + 1}</span>
                    <span className="text-slate-800 dark:text-slate-200 truncate font-medium">{step.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-500 dark:text-slate-400 font-mono font-tabular">
                      {formatMinutes(step.estimatedMinutes)}
                    </span>
                    <button
                      onClick={() => handleAddStepToBacklog(step)}
                      className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-[#11141d] dark:text-indigo-400 transition-colors"
                      title="Thêm vào Backlog"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
