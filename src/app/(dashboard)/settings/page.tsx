'use client';

import React, { useState } from 'react';
import {
  Settings,
  Bot,
  Key,
  Database,
  Download,
  Upload,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useTheme } from '@/components/shared/ThemeProvider';
import { useAppStore } from '@/lib/store/useAppStore';
import { GeminiModelType } from '@/types';
import { soundEngine } from '@/lib/audio/soundEffects';

export default function SettingsPage() {
  const { settings, updateSettings, importLegacyData } = useAppStore();
  const { theme, setTheme } = useTheme();

  const [model, setModel] = useState<GeminiModelType>(settings.geminiModel as GeminiModelType || 'gemini-3.7-flash');
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [capacity, setCapacity] = useState(settings.defaultCapacityHours || 6);

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      geminiModel: model,
      aiModel: model,
      geminiApiKey: apiKey.trim() || undefined,
      customApiKey: apiKey.trim() || undefined,
      defaultCapacityHours: Number(capacity) || 6,
    });
    soundEngine?.playBell('complete');
    setSaveStatus('Đã lưu cấu hình thành công!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleExportJson = () => {
    const fullState = localStorage.getItem('smart-planner-storage-v2');
    if (!fullState) return;

    const blob = new Blob([fullState], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    soundEngine?.playPop();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawJson = event.target?.result as string;
        const parsed = JSON.parse(rawJson);
        const count = importLegacyData(parsed);
        soundEngine?.playBell('complete');
        setImportStatus(`Đã nhập thành công ${count} mục từ file dữ liệu cũ!`);
        setTimeout(() => setImportStatus(null), 5000);
      } catch (err) {
        setImportStatus('Lỗi: File JSON không đúng định dạng!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Cài Đặt Hệ Thống & Tích Hợp AI
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Tùy biến giao diện Sáng / Tối, chọn mô hình Gemini, quản lý BYOK API Key và sao lưu dữ liệu
        </p>
      </div>

      {saveStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Theme Customizer Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-[#1e2538]">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
            <Sun className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Giao Diện & Chế Độ Màu (Appearance)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Chọn chế độ hiển thị phù hợp với mắt và môi trường làm việc</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'light', label: 'Chế độ Sáng (Light)', icon: Sun, desc: 'Sắc nét, thanh lịch, làm việc ban ngày' },
            { key: 'dark', label: 'Chế độ Tối (Dark)', icon: Moon, desc: 'Obsidian huyền bí, êm dịu ban đêm' },
            { key: 'system', label: 'Theo hệ thống (Auto)', icon: Laptop, desc: 'Tự động đồng bộ theo hệ điều hành' },
          ].map((item) => {
            const isSelected = theme === item.key;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  soundEngine?.playPop();
                  setTheme(item.key as 'light' | 'dark' | 'system');
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Engine & Gemini Model Selector */}
      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-6 transition-colors">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-[#1e2538]">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cấu Hình Gemini AI Provider</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Chọn mô hình Gemini tối ưu cho tốc độ và tư vấn kỷ luật</p>
          </div>
        </div>

        {/* Model Selection Radios */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Chọn phiên bản mô hình Gemini:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'gemini-3.7-flash',
                name: 'Gemini 3.7 Flash',
                badge: 'Khuyên dùng',
                desc: 'Mô hình thế hệ mới nhất, suy luận logic sâu sắc và siêu tốc độ.',
              },
              {
                id: 'gemini-3.5-flash',
                name: 'Gemini 3.5 Flash',
                badge: 'Tối ưu',
                desc: 'Phản hồi nhanh, tối ưu cho phân tích thói quen và bẻ nhỏ task.',
              },
              {
                id: 'gemini-2.5-flash',
                name: 'Gemini 2.5 Flash',
                badge: 'Tiết kiệm',
                desc: 'Phiên bản gọn nhẹ, đáp ứng các tác vụ cơ bản.',
              },
            ].map((m) => {
              const isSelected = model === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setModel(m.id as GeminiModelType)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-600/15 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-500/30">
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bring Your Own Key (BYOK) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Khóa Gemini API (BYOK - Bring Your Own Key):
          </label>
          <div className="relative">
            <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="password"
              placeholder="AIzaSy... (Để trống nếu dùng API mặc định của hệ thống)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Khóa API của bạn được mã hóa và lưu trữ an toàn trong trình duyệt cục bộ, không bao giờ chia sẻ ra ngoài.
          </p>
        </div>

        {/* Capacity Default */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Quỹ thời gian làm việc mặc định hàng ngày (giờ):
          </label>
          <input
            type="number"
            min="1"
            max="16"
            step="0.5"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-48 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none font-tabular"
          />
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-[#1e2538]">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
          >
            Lưu tất cả thay đổi
          </button>
        </div>
      </form>

      {/* Migration & Data Management */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-[#1e2538]">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sao Lưu & Chuyển Đổi Dữ Liệu</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Xuất sao lưu hoặc nhập dữ liệu từ Smart Planner cũ</p>
          </div>
        </div>

        {importStatus && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{importStatus}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJson}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161b26] dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Xuất sao lưu toàn bộ (JSON)</span>
          </button>

          <label className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161b26] dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Nhập file sao lưu (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
