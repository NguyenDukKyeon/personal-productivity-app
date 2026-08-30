'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  CalendarDays,
  Flame,
  CheckCircle2,
  BarChart3,
  FolderGit2,
  Settings,
  Compass,
  Moon,
  Sun,
  Search,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { useTheme } from '@/components/shared/ThemeProvider';
import { soundEngine } from '@/lib/audio/soundEffects';
import { parseSmartTaskInput } from '@/lib/parser/smartInputParser';

export function CommandPalette({
  isOpen,
  onClose,
  onOpenQuickAdd,
  onOpenShutdown,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickAdd: () => void;
  onOpenShutdown: () => void;
}) {
  const router = useRouter();
  const { workItems, projects, addWorkItem, startFocusTimer } = useAppStore();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    soundEngine?.playPop();
    onClose();
    router.push(path);
  };

  const handleToggleTheme = () => {
    soundEngine?.playPop();
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    onClose();
  };

  const handleStartQuickFocus = (mins: number) => {
    soundEngine?.playBell('start');
    startFocusTimer(null, 'pomodoro', mins);
    onClose();
    router.push('/focus');
  };

  const handleQuickCreateTask = () => {
    if (!query.trim()) return;
    const parsed = parseSmartTaskInput(query);

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
    onClose();
  };

  // Base navigation commands
  const commands = [
    {
      id: 'nav-today',
      title: 'Đến Today Workstation',
      category: 'Điều hướng',
      icon: Zap,
      action: () => handleNavigate('/today'),
    },
    {
      id: 'nav-planner',
      title: 'Đến Flexible Planner',
      category: 'Điều hướng',
      icon: CalendarDays,
      action: () => handleNavigate('/planner'),
    },
    {
      id: 'nav-roadmap',
      title: 'Đến Lộ trình & Dự báo mốc học',
      category: 'Điều hướng',
      icon: Compass,
      action: () => handleNavigate('/roadmap'),
    },
    {
      id: 'nav-focus',
      title: 'Mở Deep Work Station (Phòng tập trung)',
      category: 'Điều hướng',
      icon: Flame,
      action: () => handleNavigate('/focus'),
    },
    {
      id: 'nav-habits',
      title: 'Đến Atomic Habits & Routines',
      category: 'Điều hướng',
      icon: CheckCircle2,
      action: () => handleNavigate('/habits'),
    },
    {
      id: 'nav-review',
      title: 'Đến Review & AI Coach',
      category: 'Điều hướng',
      icon: BarChart3,
      action: () => handleNavigate('/review'),
    },
    {
      id: 'nav-projects',
      title: 'Đến Dự án & Môn học',
      category: 'Điều hướng',
      icon: FolderGit2,
      action: () => handleNavigate('/projects'),
    },
    {
      id: 'nav-settings',
      title: 'Đến Cài đặt hệ thống & BYOK AI',
      category: 'Điều hướng',
      icon: Settings,
      action: () => handleNavigate('/settings'),
    },
    {
      id: 'act-focus-25',
      title: 'Khởi động phiên Pomodoro 25 phút',
      category: 'Hành động nhanh',
      icon: Flame,
      action: () => handleStartQuickFocus(25),
    },
    {
      id: 'act-focus-50',
      title: 'Khởi động phiên Deep Flow 50 phút',
      category: 'Hành động nhanh',
      icon: Flame,
      action: () => handleStartQuickFocus(50),
    },
    {
      id: 'act-shutdown',
      title: 'Kích hoạt Nghi lễ Đóng ngày (Daily Shutdown)',
      category: 'Hành động nhanh',
      icon: Moon,
      action: () => {
        onClose();
        onOpenShutdown();
      },
    },
    {
      id: 'act-theme',
      title: `Chuyển sang chế độ ${resolvedTheme === 'dark' ? 'Sáng (Light Mode)' : 'Tối (Dark Mode)'}`,
      category: 'Tùy chỉnh',
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      action: handleToggleTheme,
    },
  ];

  // Filter commands by query
  const filteredCommands = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  // Search work items matching query
  const matchingTasks = query.trim()
    ? workItems
        .filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
    : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        filteredCommands[0].action();
      } else if (query.trim()) {
        handleQuickCreateTask();
      }
    }
  };

  const parsedPreview = query.trim() ? parseSmartTaskInput(query) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 transition-colors"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-[#1e2538] flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm lệnh, công việc hoặc gõ cú pháp tạo nhanh (VD: Đọc sách ~45m !p1)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#161b26] text-slate-500 font-mono border border-slate-200 dark:border-[#1e2538]">
            ESC
          </kbd>
        </div>

        {/* Smart Parse Preview if user is typing a task */}
        {parsedPreview && query.trim().length > 3 && (
          <div className="px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-indigo-700 dark:text-indigo-300">Tạo nhanh:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                "{parsedPreview.cleanTitle}"
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                ~{parsedPreview.estimatedMinutes}m
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold uppercase">
                {parsedPreview.priority.replace('_', ' ')}
              </span>
            </div>

            <button
              onClick={handleQuickCreateTask}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shrink-0"
            >
              Enter để thêm
            </button>
          </div>
        )}

        {/* Command & Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {/* Matching Tasks */}
          {matchingTasks.length > 0 && (
            <div className="mb-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1 block">
                Nhiệm vụ khớp từ khóa
              </span>
              {matchingTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    handleNavigate('/today');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161b26] transition-colors"
                >
                  <span className="truncate">{task.title}</span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 font-tabular">
                    {task.estimatedMinutes}m • {task.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Commands */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1 block">
              Lệnh & Thao tác
            </span>
            {filteredCommands.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161b26] transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                    <span>{item.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{item.category}</span>
                </button>
              );
            })}

            {filteredCommands.length === 0 && matchingTasks.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">Enter</kbd> để tạo nhanh nhiệm vụ này
              </div>
            )}
          </div>
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-[#0d1017] border-t border-slate-200 dark:border-[#1e2538] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Gõ ~30m, !p1, #today để gán thuộc tính</span>
          <span>
            <kbd className="font-mono">↵</kbd> chọn • <kbd className="font-mono">esc</kbd> đóng
          </span>
        </div>
      </div>
    </div>
  );
}
