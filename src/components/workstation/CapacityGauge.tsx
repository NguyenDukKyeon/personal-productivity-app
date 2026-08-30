'use client';

import React, { useState } from 'react';
import { Clock, AlertTriangle, Sliders, Zap, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { calculateDailyDisciplineScore } from '@/lib/algorithms/productivity';
import { formatMinutes } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';

export function CapacityGauge() {
  const {
    selectedDate,
    dailyPlans,
    workItems,
    habits,
    habitLogs,
    focusSessions,
    setDailyCapacity,
  } = useAppStore();

  const [isEditing, setIsEditing] = useState(false);
  const plan = dailyPlans[selectedDate];
  const metrics = calculateDailyDisciplineScore(
    selectedDate,
    plan,
    workItems,
    habits,
    habitLogs,
    focusSessions
  );

  const capacityMinutes = metrics.capacityHours * 60;
  const plannedPercent = Math.min(100, Math.round((metrics.plannedMinutes / capacityMinutes) * 100)) || 0;
  const deepWorkPercent = Math.min(100, Math.round((metrics.deepWorkMinutes / capacityMinutes) * 100)) || 0;

  const handleCapacityChange = (newHours: number) => {
    const clamped = Math.max(0.5, Math.min(16, newHours));
    setDailyCapacity(selectedDate, clamped);
    soundEngine?.playPop();
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quỹ thời gian khả dụng (Daily Capacity)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Giới hạn thời gian làm việc để rèn kỷ luật và chống kiệt sức</p>
          </div>
        </div>

        {/* Capacity edit trigger & Presets */}
        <div className="flex items-center gap-1.5">
          {[4, 6, 8].map((h) => (
            <button
              key={h}
              onClick={() => handleCapacityChange(h)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                metrics.capacityHours === h
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#161b26] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1e2538]'
              }`}
            >
              {h}h
            </button>
          ))}

          {isEditing ? (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#161b26] px-2 py-1 rounded-lg border border-indigo-500">
              <input
                type="number"
                min="0.5"
                max="16"
                step="0.5"
                value={metrics.capacityHours}
                onChange={(e) => handleCapacityChange(parseFloat(e.target.value) || 6)}
                className="w-10 bg-transparent text-xs font-bold text-slate-900 dark:text-white text-center focus:outline-none font-tabular"
              />
              <button
                onClick={() => setIsEditing(false)}
                className="p-0.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                title="Lưu"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#161b26] hover:bg-slate-200 dark:hover:bg-[#1e2538] border border-slate-200 dark:border-[#1e2538] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Tùy chỉnh số giờ"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538]">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Dung lượng ngày
          </span>
          <span className="text-base font-bold font-mono text-slate-900 dark:text-white font-tabular">
            {metrics.capacityHours}h 00m
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538]">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Đã lên lịch
          </span>
          <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 font-tabular">
            {formatMinutes(metrics.plannedMinutes)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538]">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Deep Work thực tế
          </span>
          <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 font-tabular">
            {formatMinutes(metrics.deepWorkMinutes)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538]">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Dung lượng còn trống
          </span>
          <span className="text-base font-bold font-mono text-slate-700 dark:text-slate-300 font-tabular">
            {capacityMinutes > metrics.plannedMinutes ? formatMinutes(capacityMinutes - metrics.plannedMinutes) : '0m'}
          </span>
        </div>
      </div>

      {/* Capacity Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-slate-100 dark:bg-[#161b26] rounded-full overflow-hidden flex border border-slate-200 dark:border-[#1e2538]">
          {/* Deep Work logged (Emerald) */}
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${deepWorkPercent}%` }}
            title={`Đã tập trung sâu: ${deepWorkPercent}%`}
          />
          {/* Planned Tasks (Indigo) */}
          <div
            className={`h-full transition-all duration-500 ${
              metrics.isOverbooked ? 'bg-red-500' : 'bg-indigo-500 dark:bg-indigo-400'
            }`}
            style={{ width: `${Math.max(0, plannedPercent - deepWorkPercent)}%` }}
            title={`Kế hoạch còn lại: ${Math.max(0, plannedPercent - deepWorkPercent)}%`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Đã Deep Work ({deepWorkPercent}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Đã lên lịch ({plannedPercent}%)
            </span>
          </div>

          <span className="font-mono font-bold font-tabular">
            {plannedPercent}% capacity
          </span>
        </div>
      </div>

      {/* Overbooking Alert banner */}
      {metrics.isOverbooked && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 flex items-center justify-between text-xs text-red-700 dark:text-red-400 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="font-semibold">
              Cảnh báo quá tải ({formatMinutes(metrics.overbookedMinutes)}): Bạn đang xếp việc vượt quá giới hạn thể lực và thời gian trong ngày!
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-500/20 px-2 py-0.5 rounded text-red-800 dark:text-red-300">
            Overbooked
          </span>
        </div>
      )}
    </div>
  );
}
