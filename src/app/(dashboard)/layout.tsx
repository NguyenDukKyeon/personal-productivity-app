'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/shared/Sidebar';
import { Header } from '@/components/shared/Header';
import { GlobalFocusOverlay } from '@/components/shared/GlobalFocusOverlay';
import { QuickAddModal } from '@/components/shared/QuickAddModal';
import { DailyShutdownModal } from '@/components/shared/DailyShutdownModal';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { useAppStore } from '@/lib/store/useAppStore';
import { soundEngine } from '@/lib/audio/soundEffects';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { timer, tickTimer } = useAppStore();

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isShutdownOpen, setIsShutdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Timer Runner
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timer.isRunning) {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning, tickTimer]);

  // Audio cue when timer reaches 0
  useEffect(() => {
    if (timer.isRunning && timer.remainingSeconds === 0) {
      soundEngine?.playBell('complete');
    }
  }, [timer.remainingSeconds, timer.isRunning]);

  const isFocusPage = pathname === '/focus';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* App Sidebar */}
      {!isFocusPage && <Sidebar />}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden min-w-0">
        {!isFocusPage && (
          <Header
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onOpenShutdown={() => setIsShutdownOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />
        )}

        <main className="flex-1 overflow-y-auto min-w-0 relative">
          {children}
        </main>
      </div>

      {/* Global Bottom Mini Focus Overlay (hidden on full-screen focus page) */}
      {!isFocusPage && <GlobalFocusOverlay />}

      {/* Global Modals */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenShutdown={() => setIsShutdownOpen(true)}
      />

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />

      <DailyShutdownModal
        isOpen={isShutdownOpen}
        onClose={() => setIsShutdownOpen(false)}
      />
    </div>
  );
}
