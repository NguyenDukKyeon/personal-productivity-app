'use client';

import React, { useState } from 'react';
import {
  Moon,
  CheckCircle,
  Circle,
  ArrowRight,
  Sparkles,
  Calendar,
  X,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { calculateDailyDisciplineScore } from '@/lib/algorithms/productivity';
import { getTodayDateString } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';

interface DailyShutdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyShutdownModal({ isOpen, onClose }: DailyShutdownModalProps) {
  const {
    selectedDate,
    dailyPlans,
    workItems,
    habits,
    habitLogs,
    focusSessions,
    saveDailyReflection,
  } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [winsText, setWinsText] = useState('');
  const [frictionText, setFrictionText] = useState('');
  const [tomorrowFocus, setTomorrowFocus] = useState('');

  if (!isOpen) return null;

  const plan = dailyPlans[selectedDate];
  const metrics = calculateDailyDisciplineScore(
    selectedDate,
    plan,
    workItems,
    habits,
    habitLogs,
    focusSessions
  );

  const dayItems = workItems.filter((i) => i.scheduledDate === selectedDate);
  const completedCount = dayItems.filter((i) => i.status === 'completed').length;

  const handleFinishShutdown = () => {
    saveDailyReflection({
      date: selectedDate,
      energyRating: 4,
      focusRating: 4,
      whatWentWell: winsText.trim() || 'Hoàn thành các mục tiêu trọng tâm trong ngày.',
      whatDistracted: frictionText.trim() || undefined,
      keyTakeaway: tomorrowFocus.trim() || undefined,
      disciplineScore: metrics.disciplineScore,
    });

    soundEngine?.playBell('complete');
    onClose();
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2538] flex items-center justify-between bg-slate-50 dark:bg-[#0d1017]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
              <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Nghi Lễ Đóng Ngày (Daily Shutdown Ritual)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                2 phút tĩnh tâm để ngắt kết nối công việc và tái tạo năng lượng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1e2538] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progression */}
        <div className="px-6 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  step === s
                    ? 'w-12 bg-indigo-600'
                    : step > s
                    ? 'w-6 bg-emerald-500'
                    : 'w-6 bg-slate-200 dark:bg-[#161b26]'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-tabular">
            Bước {step}/3
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  Bước 1: Nghiệm thu kết quả thực tế
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Dữ liệu năng suất ngày hôm nay của bạn:
                </h4>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538]">
                <div className="text-center space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Deep Work</span>
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400 font-tabular">
                    {Math.floor(metrics.deepWorkMinutes / 60)}h {metrics.deepWorkMinutes % 60}m
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Nhiệm vụ xong</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white font-tabular">
                    {completedCount}/{dayItems.length}
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Điểm kỷ luật</span>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-tabular">
                    {metrics.disciplineScore}%
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tất cả các nhiệm vụ chưa hoàn thành sẽ được giữ nguyên an toàn trong hệ thống để chuyển sang ngày mai hoặc đưa về Backlog.
              </p>

              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
              >
                <span>Tiếp tục bước 2</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  Bước 2: Nhật ký đúc rút (Quick Reflection)
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ghi nhận 1 chiến thắng & 1 điểm cần cải thiện:
                </h4>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  🌟 Điểm bạn cảm thấy hài lòng nhất hôm nay (Win):
                </label>
                <input
                  type="text"
                  placeholder="VD: Giữ được 2 giờ Deep Work liên tục không chạm điện thoại..."
                  value={winsText}
                  onChange={(e) => setWinsText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ⚡ Điểm gây xao nhãng hoặc cần tối ưu hơn (Friction):
                </label>
                <input
                  type="text"
                  placeholder="VD: Dành hơi nhiều thời gian lướt mạng buổi chiều..."
                  value={frictionText}
                  onChange={(e) => setFrictionText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#161b26] text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30"
                >
                  <span>Tiếp tục bước 3</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  Bước 3: Chuẩn bị tâm thế ngày mai
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Định hướng công việc cho ngày mai:
                </h4>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  🎯 1 việc quan trọng nhất bạn muốn chinh phục vào ngày mai:
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú ngắn gọn mục tiêu đầu ngày mai để khi thức dậy có thể bắt tay làm ngay..."
                  value={tomorrowFocus}
                  onChange={(e) => setTomorrowFocus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Shutdown Complete:</strong> Công việc hôm nay kết thúc tại đây. Hãy nghỉ ngơi trọn vẹn để ngày mai tràn đầy năng lượng!
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#161b26] text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleFinishShutdown}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Hoàn tất Đóng ngày (Shutdown)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
