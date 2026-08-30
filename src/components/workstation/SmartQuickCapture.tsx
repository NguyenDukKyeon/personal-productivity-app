'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Sparkles, Clock, AlertCircle, Hash, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { parseSmartTaskInput } from '@/lib/parser/smartInputParser';
import { soundEngine } from '@/lib/audio/soundEffects';

export function SmartQuickCapture() {
  const { selectedDate, projects, addWorkItem } = useAppStore();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keydown shortcut 'n' to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'n' || e.key === 'N') &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const parsed = input.trim() ? parseSmartTaskInput(input, selectedDate) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !parsed) return;

    let matchedProjectId: string | undefined = undefined;
    if (parsed.projectQuery) {
      const match = projects.find((p) =>
        p.title.toLowerCase().includes(parsed.projectQuery!.toLowerCase())
      );
      if (match) matchedProjectId = match.id;
    }

    addWorkItem({
      title: parsed.cleanTitle,
      type: parsed.type,
      estimatedMinutes: parsed.estimatedMinutes,
      priority: parsed.priority,
      status: parsed.scheduledDate ? 'scheduled' : 'backlog',
      scheduledDate: parsed.scheduledDate,
      scheduledTimeStart: parsed.scheduledTimeStart || undefined,
      projectId: matchedProjectId,
    });

    soundEngine?.playPop();
    setInput('');
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-2.5 transition-colors">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Nhập nhanh nhiệm vụ kèm cú pháp: ~45m (thời gian), !p1 (ưu tiên), @09:00 (giờ), /tên-dự-án..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 font-mono hidden sm:inline-block">
            N
          </kbd>
        </div>

        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm</span>
        </button>
      </form>

      {/* Live Natural Language Parsing Chips */}
      {parsed && input.trim().length > 2 && (
        <div className="flex items-center gap-2 flex-wrap text-[11px] animate-in fade-in duration-150">
          <span className="text-slate-400 font-medium">Tự động nhận diện:</span>

          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] font-semibold text-slate-800 dark:text-slate-200">
            "{parsed.cleanTitle}"
          </span>

          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
            <Clock className="w-3 h-3" />
            {parsed.estimatedMinutes}m
          </span>

          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold uppercase">
            <AlertCircle className="w-3 h-3" />
            {parsed.priority.replace('_', ' ')}
          </span>

          {parsed.scheduledTimeStart && (
            <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-mono font-bold">
              @{parsed.scheduledTimeStart}
            </span>
          )}

          {parsed.projectQuery && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
              #{parsed.projectQuery}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
