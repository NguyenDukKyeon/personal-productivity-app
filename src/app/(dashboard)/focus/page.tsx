'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  CheckCircle,
  Zap,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Volume2,
  Coffee,
  Waves,
  CloudRain,
  Radio,
  Brain,
  ListPlus,
  Coffee as CoffeeBreak,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatMinutes } from '@/lib/utils';
import { soundEngine, AmbientSoundType } from '@/lib/audio/soundEffects';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

export default function FocusPage() {
  const router = useRouter();
  const {
    timer,
    workItems,
    startFocusTimer,
    startBreakTimer,
    pauseFocusTimer,
    resumeFocusTimer,
    stopFocusTimer,
    addBraindumpNote,
    removeBraindumpNote,
    convertBraindumpToTask,
    setTimerWorkItem,
    updateSettings,
    settings,
  } = useAppStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [distractionText, setDistractionText] = useState('');
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [focusRating, setFocusRating] = useState<number>(5);
  const [distractionReason, setDistractionReason] = useState<string>('');

  const activeWorkItem = workItems.find((i) => i.id === timer.workItemId);
  const availableItems = workItems.filter((i) => i.status !== 'completed');

  const handleReturnToDashboard = useCallback(() => {
    router.push('/today');
  }, [router]);

  // Keyboard shortcut listener for ESC to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (!isRatingModalOpen) {
          handleReturnToDashboard();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isRatingModalOpen, handleReturnToDashboard]);

  // Handle timer completion trigger
  useEffect(() => {
    if (timer.remainingSeconds === 0 && timer.sessionStartTime && !isRatingModalOpen && !timer.isBreak) {
      soundEngine?.playBell('complete');
      setIsRatingModalOpen(true);
    } else if (timer.remainingSeconds === 0 && timer.sessionStartTime && timer.isBreak) {
      soundEngine?.playBell('start');
      startFocusTimer(timer.workItemId, 'pomodoro', 25);
    }
  }, [timer.remainingSeconds, timer.sessionStartTime, timer.isBreak, timer.workItemId, isRatingModalOpen, startFocusTimer]);

  const handleTogglePlay = () => {
    if (timer.isRunning) {
      pauseFocusTimer();
    } else {
      soundEngine?.playBell('start');
      resumeFocusTimer();
    }
  };

  const handleReset = () => {
    startFocusTimer(timer.workItemId, timer.mode, timer.totalDurationMins);
  };

  const handleSwitchMode = (mode: 'pomodoro' | 'flow' | 'stopwatch', durationMins: number) => {
    startFocusTimer(timer.workItemId, mode, durationMins);
  };

  const handleSelectAmbient = (type: AmbientSoundType) => {
    updateSettings({ ambientSound: type });
    soundEngine?.playAmbient(type, settings.ambientVolume || 50);
  };

  const handleVolumeChange = (vol: number) => {
    updateSettings({ ambientVolume: vol });
    soundEngine?.setAmbientVolume(vol);
  };

  const handleAddDistraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distractionText.trim()) return;
    addBraindumpNote(distractionText.trim());
    soundEngine?.playPop();
    setDistractionText('');
  };

  const handleConvertToTask = (index: number) => {
    convertBraindumpToTask(index);
    soundEngine?.playPop();
  };

  const handleFinishEarly = () => {
    pauseFocusTimer();
    setIsRatingModalOpen(true);
  };

  const handleConfirmFinishAndReturn = () => {
    stopFocusTimer(focusRating);
    soundEngine?.playBell('complete');
    setIsRatingModalOpen(false);
    router.push('/today');
  };

  const handleConfirmFinishAndBreak = (isLong: boolean = false) => {
    stopFocusTimer(focusRating);
    soundEngine?.playBell('break');
    setIsRatingModalOpen(false);
    startBreakTimer(isLong);
  };

  const handleConfirmFinishAndContinue = () => {
    stopFocusTimer(focusRating);
    soundEngine?.playBell('complete');
    setIsRatingModalOpen(false);
    startFocusTimer(timer.workItemId, timer.mode, timer.totalDurationMins);
  };

  const minutes = Math.floor(timer.remainingSeconds / 60);
  const seconds = timer.remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalSecs = (timer.totalDurationMins || 25) * 60;
  const progressPercent =
    timer.mode === 'flow' || timer.mode === 'stopwatch'
      ? Math.min(100, (timer.elapsedSeconds / 3600) * 100)
      : ((totalSecs - timer.remainingSeconds) / totalSecs) * 100 || 0;

  return (
    <div
      className={`min-h-screen p-6 flex flex-col justify-between max-w-5xl mx-auto space-y-6 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-50 dark:bg-[#090a0f] p-8 max-w-none' : ''
      }`}
    >
      {/* Top Bar: Navigation, Exit button, Focus Task, Ambient Controls, Theme Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1e2538]">
        {/* Left: Exit button & Active Task Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReturnToDashboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#161b26] dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-all active:scale-95 group shrink-0"
            title="Quay lại Today Workstation (Phím Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Trở về Hôm nay</span>
            <kbd className="hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono ml-1">
              Esc
            </kbd>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-[#1e2538] hidden sm:block" />

          {/* Task Info & Quick Selector */}
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
              {timer.isBreak ? '☕ Thời gian nghỉ ngơi:' : 'Mục tiêu phiên tập trung:'}
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs">
                {timer.isBreak
                  ? 'Giải lao, hít thở và uống nước'
                  : activeWorkItem
                  ? activeWorkItem.title
                  : 'Phiên tự do (Chưa ghim task)'}
              </h2>

              {/* Task Switcher dropdown */}
              {!timer.isBreak && (
                <select
                  value={timer.workItemId || ''}
                  onChange={(e) => setTimerWorkItem(e.target.value || null)}
                  className="text-[11px] bg-slate-100 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-indigo-600 dark:text-indigo-400 rounded-lg px-2 py-0.5 focus:outline-none max-w-[140px] truncate"
                >
                  <option value="">-- Đổi task --</option>
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({formatMinutes(item.estimatedMinutes)})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Right: Ambient Sounds Selector, Theme Toggle, Fullscreen */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {/* Ambient Sounds Selector */}
          <div className="flex items-center bg-white dark:bg-[#161b26] p-1 rounded-xl border border-slate-200 dark:border-[#1e2538] text-xs shadow-xs">
            {(
              [
                { key: 'none', label: 'Tắt', icon: Volume2 },
                { key: 'rain', label: 'Mưa', icon: CloudRain },
                { key: 'waves', label: 'Sóng', icon: Waves },
                { key: 'cafe', label: 'Cafe', icon: Coffee },
                { key: 'whitenoise', label: 'Noise', icon: Radio },
                { key: 'gamma40hz', label: '40Hz', icon: Brain },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelectAmbient(item.key)}
                  className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
                    settings.ambientSound === item.key
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          <ThemeToggle />

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#161b26] dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs"
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình (Zen mode)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Center: Circular SVG Timer Display */}
      <div className="flex flex-col items-center justify-center py-6 space-y-6">
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
          {/* Circular SVG Progress */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-slate-200 dark:stroke-[#161b26]"
              strokeWidth="4"
              fill="transparent"
            />
            {/* Active Progress */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="currentColor"
              className={`transition-all duration-1000 ease-linear ${
                timer.isBreak
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : 'text-indigo-600 dark:text-indigo-500'
              }`}
              strokeWidth="5"
              strokeDasharray="276.46"
              strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Digital Display */}
          <div className="absolute flex flex-col items-center text-center space-y-1">
            <span className="text-5xl sm:text-6xl font-bold font-mono text-slate-900 dark:text-white tracking-tight font-tabular">
              {timeFormatted}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {timer.isBreak
                ? 'Đang nghỉ ngơi...'
                : timer.isRunning
                ? 'Đang trong trạng thái Flow...'
                : 'Tạm dừng'}
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePlay}
            className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 ${
              timer.isBreak
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
            title={timer.isRunning ? 'Tạm dừng' : 'Bắt đầu'}
          >
            {timer.isRunning ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={handleReset}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161b26] hover:bg-slate-100 dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all"
            title="Đặt lại phiên"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleFinishEarly}
            className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Kết thúc và lưu lại số phút đã hoàn thành"
          >
            Nghiệm thu phiên
          </button>
        </div>

        {/* Preset Durations */}
        <div className="flex items-center gap-2 pt-2 flex-wrap justify-center">
          {[
            { label: '25m Pomodoro', mode: 'pomodoro' as const, duration: 25 },
            { label: '50m Deep Flow', mode: 'pomodoro' as const, duration: 50 },
            { label: '90m Ultradian', mode: 'pomodoro' as const, duration: 90 },
            { label: 'Đếm tiến (Flow)', mode: 'flow' as const, duration: 0 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleSwitchMode(preset.mode, preset.duration)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                timer.totalDurationMins === preset.duration && timer.mode === preset.mode
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'bg-white dark:bg-[#161b26] hover:bg-slate-100 dark:hover:bg-[#202738] border-slate-200 dark:border-[#1e2538] text-slate-700 dark:text-slate-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom: Distraction Braindump Box */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Sổ xả não chống xao nhãng (Distraction Braindump)
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Ghi nhanh ý nghĩ vụt qua để không phá vỡ dòng tập trung
          </span>
        </div>

        <form onSubmit={handleAddDistraction} className="flex gap-2">
          <input
            type="text"
            placeholder="Ý nghĩ bất chợt xuất hiện (VD: phải trả lời email khách hàng, kiểm tra tin nhắn)..."
            value={distractionText}
            onChange={(e) => setDistractionText(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ghi lại</span>
          </button>
        </form>

        {timer.braindumpNotes.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-[#1e2538]">
            {timer.braindumpNotes.map((note, nIdx) => (
              <div
                key={nIdx}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] flex items-center justify-between text-xs gap-2"
              >
                <span className="text-slate-800 dark:text-slate-200 truncate flex-1">{note}</span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleConvertToTask(nIdx)}
                    className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] flex items-center gap-1 border border-indigo-200 dark:border-indigo-500/30 transition-colors"
                    title="Chuyển thành nhiệm vụ trong danh sách"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span>Tạo Task</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => removeBraindumpNote(nIdx)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Xóa ghi chú này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Rating & Completion Modal */}
      {isRatingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Nghiệm thu phiên Deep Work
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đánh giá mức độ tập trung thực tế của bạn trong phiên làm việc vừa qua:
              </p>
            </div>

            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFocusRating(star)}
                  className={`w-11 h-11 rounded-xl text-xl font-bold border transition-all ${
                    focusRating >= star
                      ? 'bg-amber-100 border-amber-300 text-amber-600 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-400 shadow-xs scale-105'
                      : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-[#161b26] dark:border-[#1e2538] dark:text-slate-600'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            {focusRating <= 3 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 space-y-1.5 text-xs text-amber-900 dark:text-amber-300">
                <span className="font-bold block">Điều gì đã làm bạn xao nhãng?</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Mạng xã hội / Thông báo', 'Mệt mỏi / Buồn ngủ', 'Task quá khó / Chưa rõ ràng', 'Môi trường ồn ào'].map(
                    (r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setDistractionReason(r)}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                          distractionReason === r
                            ? 'bg-amber-600 text-white border-amber-700'
                            : 'bg-white dark:bg-[#161b26] border-amber-200 dark:border-amber-500/30'
                        }`}
                      >
                        {r}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-[#1e2538]">
              <button
                onClick={handleConfirmFinishAndReturn}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Hoàn tất & Trở về Hôm nay</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleConfirmFinishAndBreak(false)}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <CoffeeBreak className="w-3.5 h-3.5" />
                  <span>Nghỉ 5 phút</span>
                </button>

                <button
                  onClick={handleConfirmFinishAndContinue}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161b26] dark:hover:bg-[#202738] text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
                >
                  ⚡ Phiên tiếp theo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
