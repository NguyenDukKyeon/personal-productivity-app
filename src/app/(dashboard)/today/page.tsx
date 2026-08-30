'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Edit3, Check } from 'lucide-react';
import { CapacityGauge } from '@/components/workstation/CapacityGauge';
import { Top3Section } from '@/components/workstation/Top3Section';
import { InteractiveTimeblock } from '@/components/workstation/InteractiveTimeblock';
import { HabitChecklist } from '@/components/workstation/HabitChecklist';
import { SmartQuickCapture } from '@/components/workstation/SmartQuickCapture';
import { SpacedReviewsSection } from '@/components/workstation/SpacedReviewsSection';
import { QuickAddModal } from '@/components/shared/QuickAddModal';
import { useAppStore } from '@/lib/store/useAppStore';
import { soundEngine } from '@/lib/audio/soundEffects';

export default function TodayPage() {
  const router = useRouter();
  const {
    selectedDate,
    dailyPlans,
    setMorningIntention,
  } = useAppStore();

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDefaultTime, setQuickAddDefaultTime] = useState<string | undefined>(undefined);
  const [isEditingIntention, setIsEditingIntention] = useState(false);
  const [intentionInput, setIntentionInput] = useState('');

  const plan = dailyPlans[selectedDate];
  const intention = plan?.morningIntention || 'Tập trung vào 3 việc quan trọng nhất, duy trì trạng thái Flow và hoàn thành đúng cam kết.';

  const handleSaveIntention = () => {
    if (intentionInput.trim()) {
      setMorningIntention(selectedDate, intentionInput.trim());
      soundEngine?.playPop();
    }
    setIsEditingIntention(false);
  };

  const handleOpenAddWithTime = (timeSlot?: string) => {
    setQuickAddDefaultTime(timeSlot);
    setIsQuickAddOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Morning Intention & Mindset Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs flex items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>

          {isEditingIntention ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={intentionInput}
                onChange={(e) => setIntentionInput(e.target.value)}
                placeholder="Nhập tâm thế / cam kết trọng tâm của ngày hôm nay..."
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-indigo-400 dark:border-indigo-500/40 text-xs text-slate-900 dark:text-white focus:outline-none font-medium"
                autoFocus
              />
              <button
                onClick={handleSaveIntention}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu</span>
              </button>
            </div>
          ) : (
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">
                Tâm thế đầu ngày (Morning Intention)
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium italic truncate">
                "{intention}"
              </p>
            </div>
          )}
        </div>

        {!isEditingIntention && (
          <button
            onClick={() => {
              setIntentionInput(intention);
              setIsEditingIntention(true);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2538] transition-colors shrink-0"
            title="Chỉnh sửa cam kết đầu ngày"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Smart Natural Language Quick Capture Bar */}
      <SmartQuickCapture />

      {/* Capacity Quota & Overbooking Alert */}
      <CapacityGauge />

      {/* Top 3 "Eat The Frog" Priority MITs */}
      <Top3Section />

      {/* Spaced Repetition Reviews Section (Bài Ôn Tập Ngắt Quãng Ebbinghaus) */}
      <SpacedReviewsSection />

      {/* Two Column Execution Grid: Interactive Timeblock & Habit Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <InteractiveTimeblock onOpenQuickAdd={handleOpenAddWithTime} />
        </div>

        <div className="lg:col-span-5">
          <HabitChecklist />
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        defaultDate={selectedDate}
      />
    </div>
  );
}
