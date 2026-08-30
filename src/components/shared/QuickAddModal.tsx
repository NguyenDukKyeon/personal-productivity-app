'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Calendar,
  Clock,
  Tag,
  BookOpen,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { Priority, WorkItemType } from '@/types';
import { getTodayDateString } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export function QuickAddModal({ isOpen, onClose, defaultDate }: QuickAddModalProps) {
  const { addWorkItem, projects, selectedDate } = useAppStore();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<WorkItemType>('task');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [priority, setPriority] = useState<Priority>('p2_high');
  const [projectId, setProjectId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>(
    defaultDate || selectedDate || getTodayDateString()
  );
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addWorkItem({
      title: title.trim(),
      type,
      estimatedMinutes: Number(estimatedMinutes) || 30,
      priority,
      projectId: projectId || undefined,
      scheduledDate: scheduledDate || null,
      notes: notes.trim() || undefined,
      status: scheduledDate ? 'scheduled' : 'backlog',
    });

    soundEngine?.playPop();
    setTitle('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2538] flex items-center justify-between bg-slate-50 dark:bg-[#0d1017]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Thêm công việc / Bài học mới
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1e2538] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên nhiệm vụ / Bài học:
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="VD: Viết dàn ý tiểu luận, Ôn tập từ vựng Unit 4..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Type & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Loại mục:
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WorkItemType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="task">📝 Nhiệm vụ (Task)</option>
                <option value="lesson">📖 Bài học (Lesson)</option>
                <option value="milestone">🎯 Cột mốc (Milestone)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Thời lượng ước tính (phút):
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 30)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none font-tabular"
              />
            </div>
          </div>

          {/* Priority & Project */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Độ ưu tiên:
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="p1_urgent">🔥 P1 - Khẩn cấp (Phải làm ngay)</option>
                <option value="p2_high">⚡ P2 - Ưu tiên cao</option>
                <option value="p3_medium">🔷 P3 - Bình thường</option>
                <option value="p4_low">☕ P4 - Thong thả</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Thuộc Dự án / Môn học:
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="">-- Không thuộc dự án --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ngày lập lịch (Để trống nếu đưa vào Backlog):
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none font-tabular"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ghi chú thêm:
            </label>
            <textarea
              rows={2}
              placeholder="Ghi chú chi tiết, tài liệu tham khảo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1e2538]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
            >
              Tạo nhiệm vụ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
