'use client';

import React, { useState } from 'react';
import {
  Moon,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Zap,
  BatteryCharging,
  Calendar,
  X,
  Smile,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatMinutes, getTodayDateString } from '@/lib/utils';
import { calculateDailyDisciplineScore } from '@/lib/algorithms/productivity';
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
    updateWorkItem,
    setDailyCapacity,
  } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [energyRating, setEnergyRating] = useState<number>(4);
  const [focusRating, setFocusRating] = useState<number>(4);
  const [whatWentWell, setWhatWentWell] = useState<string>('');
  const [whatDistracted, setWhatDistracted] = useState<string>('');
  const [keyTakeaway, setKeyTakeaway] = useState<string>('');

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
  const uncompletedItems = dayItems.filter((i) => i.status !== 'completed');

  const handleFinish = () => {
    saveDailyReflection({
      date: selectedDate,
      energyRating,
      focusRating,
      whatWentWell: whatWentWell.trim() || undefined,
      whatDistracted: whatDistracted.trim() || undefined,
      keyTakeaway: keyTakeaway.trim() || undefined,
      disciplineScore: metrics.disciplineScore,
    });

    soundEngine?.playBell('complete');
    onClose();
  };

  const handleRescheduleTomorrow = (id: string) => {
    const today = new Date(selectedDate);
    today.setDate(today.getDate() + 1);
    const tomorrowStr = today.toISOString().split('T')[0];
    updateWorkItem(id, { scheduledDate: tomorrowStr });
  };

  const handlePushToBacklog = (id: string) => {
    updateWorkItem(id, { scheduledDate: null, status: 'backlog' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#11141d] rounded-2xl border border-[#1e2538] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1e2538] flex items-center justify-between bg-gradient-to-r from-indigo-950/30 to-purple-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Daily Shutdown Ritual (2 Phút)</h3>
              <p className="text-xs text-slate-400">
                Bước {step}/3: {step === 1 ? 'Nghiệm thu công việc' : step === 2 ? 'Đánh giá & Phản tư' : 'Hoàn tất & Chuẩn bị ngày mai'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1e2538] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Review Work & Reschedule */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-[#161b26] border border-[#1e2538] flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Chỉ số kỷ luật hôm nay:</span>
                <div className="text-2xl font-bold text-emerald-400">{metrics.disciplineScore}%</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Deep Work đạt được:</span>
                <div className="text-lg font-bold text-white">{formatMinutes(metrics.deepWorkMinutes)}</div>
              </div>
            </div>

            {uncompletedItems.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Các việc chưa hoàn thành ({uncompletedItems.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {uncompletedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#161b26] border border-[#1e2538] flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-medium text-slate-300 truncate flex-1">
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleRescheduleTomorrow(item.id)}
                          className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold transition-colors"
                        >
                          Chuyển sang mai
                        </button>
                        <button
                          onClick={() => handlePushToBacklog(item.id)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] transition-colors"
                        >
                          Về Backlog
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-950/15 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">Xuất sắc! Bạn đã dọn sạch toàn bộ việc hôm nay.</h4>
                <p className="text-xs text-slate-400 mt-1">Không còn việc tồn đọng gây gánh nặng tâm lý.</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-[#1e2538]">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
              >
                <span>Tiếp tục phản tư</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Reflection & Ratings */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            {/* Rating Stars */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#161b26] border border-[#1e2538] space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
                  Mức năng lượng ngày hôm nay
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEnergyRating(star)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition-all ${
                        energyRating >= star
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-[#11141d] text-slate-500 border border-[#1e2538]'
                      }`}
                    >
                      {star}★
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#161b26] border border-[#1e2538] space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  Mức độ tập trung & kỷ luật
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFocusRating(star)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition-all ${
                        focusRating >= star
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-[#11141d] text-slate-500 border border-[#1e2538]'
                      }`}
                    >
                      {star}★
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Questions */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Điều gì đã làm bạn hài lòng và hiệu quả nhất hôm nay?
                </label>
                <input
                  type="text"
                  placeholder="VD: Giữ được 2 tiếng deep work buổi sáng không nhìn điện thoại..."
                  value={whatWentWell}
                  onChange={(e) => setWhatWentWell(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#161b26] border border-[#1e2538] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Điều gì gây xao nhãng hoặc làm bạn chậm tiến độ?
                </label>
                <input
                  type="text"
                  placeholder="VD: Lướt mạng xã hội lúc 14h, ước lượng thời gian task 1 quá ngắn..."
                  value={whatDistracted}
                  onChange={(e) => setWhatDistracted(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#161b26] border border-[#1e2538] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#1e2538]">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Quay lại
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
              >
                <span>Bước cuối: Chốt ngày</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete & Tomorrow Prep */}
        {step === 3 && (
          <div className="p-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/30 animate-bounce">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white">Bạn đã hoàn tất ngày làm việc!</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Kỷ luật là làm những việc cần làm ngay cả khi không có cảm xúc. Bây giờ là thời gian nghỉ ngơi trọn vẹn để phục hồi năng lượng.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#161b26] border border-[#1e2538] max-w-sm mx-auto text-left">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Điểm kỷ luật chốt ngày:</span>
                <strong className="text-emerald-400 font-bold text-sm">{metrics.disciplineScore}%</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tổng Deep Work ghi nhận:</span>
                <strong className="text-white font-bold">{formatMinutes(metrics.deepWorkMinutes)}</strong>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#1e2538]">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Quay lại
              </button>
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
              >
                Chính thức Đóng ngày (Shutdown)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
