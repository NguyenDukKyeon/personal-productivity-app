'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  CalendarDays,
  Flame,
  CheckCircle2,
  BarChart3,
  FolderGit2,
  Settings,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/useAppStore';

const navItems = [
  {
    name: 'Today Workstation',
    href: '/today',
    icon: Zap,
    keyHint: '1',
  },
  {
    name: 'Flexible Planner',
    href: '/planner',
    icon: CalendarDays,
    keyHint: '2',
  },
  {
    name: 'Lộ trình & Dự báo',
    href: '/roadmap',
    icon: Compass,
    badge: 'Forecast',
    keyHint: '3',
  },
  {
    name: 'Deep Work Station',
    href: '/focus',
    icon: Flame,
    keyHint: '4',
  },
  {
    name: 'Atomic Habits',
    href: '/habits',
    icon: CheckCircle2,
    keyHint: '5',
  },
  {
    name: 'Review & AI Coach',
    href: '/review',
    icon: BarChart3,
    badge: 'AI',
    keyHint: '6',
  },
  {
    name: 'Dự án & Môn học',
    href: '/projects',
    icon: FolderGit2,
    keyHint: '7',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { timer } = useAppStore();

  return (
    <aside className="w-64 h-screen bg-white dark:bg-[#0d1017] border-r border-slate-200 dark:border-[#1e2538] flex flex-col justify-between shrink-0 z-30 select-none transition-colors">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-[#1e2538]">
          <Link href="/today" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                Smart Planner
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#161b26] text-slate-700 dark:text-slate-300 font-mono font-bold border border-slate-200 dark:border-[#1e2538]">
                  OS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Personal Productivity</p>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Trạm làm việc
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/today' && pathname.startsWith(item.href));
            const Icon = item.icon;
            const isFocusActive = item.href === '/focus' && timer.isRunning;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group',
                  isActive
                    ? 'bg-slate-100 dark:bg-[#161b26] text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#121620]'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 dark:bg-indigo-500 rounded-r-full" />
                )}

                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                    )}
                  />
                  <span>{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isFocusActive && (
                    <span className="flex h-2 w-2 relative" title="Timer đang chạy">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                  )}

                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Settings & Build */}
      <div className="p-3 border-t border-slate-200 dark:border-[#1e2538] space-y-1">
        <Link
          href="/settings"
          className={cn(
            'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
            pathname === '/settings'
              ? 'bg-slate-100 dark:bg-[#161b26] text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#121620]'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span>Cài đặt & Tích hợp AI</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">BYOK</span>
        </Link>

        {/* Status indicator */}
        <div className="px-3 py-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Local Engine Active</span>
          </div>
          <span className="font-mono text-[10px]">v2.0</span>
        </div>
      </div>
    </aside>
  );
}
