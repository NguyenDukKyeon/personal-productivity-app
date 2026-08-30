'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, Play, Pause, Square, Maximize2 } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { soundEngine } from '@/lib/audio/soundEffects';

export function GlobalFocusOverlay() {
  const { timer, workItems, pauseFocusTimer, resumeFocusTimer, stopFocusTimer } = useAppStore();

  if (!timer.sessionStartTime) return null;

  const activeItem = workItems.find((i) => i.id === timer.workItemId);
  const minutes = Math.floor(timer.remainingSeconds / 60);
  const seconds = timer.remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleTogglePlay = () => {
    if (timer.isRunning) {
      pauseFocusTimer();
    } else {
      resumeFocusTimer();
    }
  };

  const handleStop = () => {
    soundEngine?.playBell('break');
    stopFocusTimer(5);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/90 dark:bg-[#11141d]/90 backdrop-blur-xl border border-indigo-200 dark:border-indigo-500/30 shadow-2xl shadow-indigo-500/10 animate-in fade-in slide-in-from-bottom-4 duration-300 transition-colors">
      {/* Icon & Status */}
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center">
          <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-pulse" />
        </div>
        {timer.isRunning && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white dark:ring-[#11141d] animate-ping" />
        )}
      </div>

      {/* Info & Timer */}
      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[160px]">
          {activeItem ? activeItem.title : 'Phiên tập trung tự do'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono font-bold text-slate-900 dark:text-white tracking-wider font-tabular">
            {timeFormatted}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
            {timer.mode === 'pomodoro' ? 'Pomodoro' : 'Flow'}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-[#1e2538]">
        <button
          onClick={handleTogglePlay}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          title={timer.isRunning ? 'Tạm dừng' : 'Tiếp tục'}
        >
          {timer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        <button
          onClick={handleStop}
          className="p-2 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-500/20 dark:text-slate-300 dark:hover:text-red-400 transition-colors"
          title="Kết thúc phiên"
        >
          <Square className="w-4 h-4" />
        </button>

        <Link
          href="/focus"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white transition-colors"
          title="Mở toàn màn hình"
        >
          <Maximize2 className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
