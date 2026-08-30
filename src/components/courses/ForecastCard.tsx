'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Sliders,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAppStore } from '@/lib/store/useAppStore';
import { calculateCourseForecast } from '@/lib/algorithms/forecast';

interface ForecastCardProps {
  selectedProjectId?: string; // 'all' or project ID
}

export function ForecastCard({ selectedProjectId = 'all' }: ForecastCardProps) {
  const { projects, workItems, settings } = useAppStore();

  const [simulatedDailyHours, setSimulatedDailyHours] = useState<number>(settings.defaultCapacityHours || 4);

  const forecast = calculateCourseForecast(
    selectedProjectId,
    projects,
    workItems,
    simulatedDailyHours
  );

  const finishDateFormatted = forecast.finishDateISO
    ? format(parseISO(forecast.finishDateISO), 'EEEE, dd/MM/yyyy', { locale: vi })
    : 'Chưa xác định';

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-5 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#1e2538]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              Dự báo mốc học hết bài (Forecast Milestones)
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                  forecast.confidence === 'high'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                    : forecast.confidence === 'medium'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
              >
                {forecast.confidence === 'high' ? 'Độ tin cậy cao' : forecast.confidence === 'medium' ? 'Độ tin cậy vừa' : 'Ước tính sơ bộ'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thuật toán tính toán ngày hoàn thành dựa trên số bài học còn lại và quỹ giờ học mỗi ngày
            </p>
          </div>
        </div>

        {/* Milestone Date Badge */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-left sm:text-right shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
            {forecast.isComplete ? 'Trạng thái:' : 'Mốc dự kiến hoàn thành:'}
          </span>
          <div className="text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400 capitalize flex items-center gap-1.5 sm:justify-end">
            <Calendar className="w-4 h-4" />
            <span>{forecast.isComplete ? 'Đã hoàn thành tất cả! 🎉' : finishDateFormatted}</span>
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tiến độ bài học</span>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-tabular font-mono">
            {forecast.completedLessons}/{forecast.totalLessons}{' '}
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold font-mono">({forecast.progressPercent}%)</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 dark:bg-[#11141d] rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: `${forecast.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Số bài còn lại</span>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-tabular font-mono">
            {forecast.remainingLessons} bài
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Cần xử lý tiếp</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tổng giờ học còn lại</span>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-tabular font-mono">
            {forecast.remainingHours} giờ
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-tabular">~{Math.round(forecast.remainingHours * 60)} phút</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Số ngày thực học</span>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-tabular font-mono">
            ~{forecast.daysNeeded} ngày
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-tabular font-mono">với {simulatedDailyHours}h / ngày</p>
        </div>
      </div>

      {/* What-If Simulator Slider Box */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Mô Phỏng "What-If": Giả sử mỗi ngày bạn học {simulatedDailyHours} giờ?
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-[#11141d] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#1e2538] font-tabular">
            {simulatedDailyHours} giờ / ngày
          </span>
        </div>

        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={simulatedDailyHours}
          onChange={(e) => setSimulatedDailyHours(parseFloat(e.target.value))}
          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
        />

        <div className="flex justify-between text-[10px] text-slate-400 font-mono font-tabular">
          <span>0.5h (Học nhàn)</span>
          <span>2.0h</span>
          <span>4.0h (Tiêu chuẩn)</span>
          <span>6.0h</span>
          <span>8.0h (Cày cuốc)</span>
          <span>10.0h</span>
        </div>
      </div>
    </div>
  );
}
