'use client';

import { useState, type ReactNode } from 'react';
import { Menu, X, Zap } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090a0f] dark:text-slate-100">
      <Sidebar className="hidden md:flex" />

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar className="relative z-50 h-full shadow-xl" />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden dark:border-[#1e2538] dark:bg-[#0d1017]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Zap className="h-3.5 w-3.5 fill-current" />
            </div>
            <span className="text-sm font-bold">Smart Planner</span>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 dark:text-slate-300"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
