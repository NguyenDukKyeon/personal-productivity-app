'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  Plus,
  BookOpen,
  CheckCircle,
  Clock,
  Trash2,
  Sparkles,
  ArrowRight,
  X,
  Target,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatMinutes } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';
import { CourseManagerModal } from '@/components/courses/CourseManagerModal';

export default function ProjectsPage() {
  const {
    projects,
    workItems,
    addProject,
    deleteProject,
    addWorkItem,
    deleteWorkItem,
  } = useAppStore();

  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isCourseManagerOpen, setIsCourseManagerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  // Add Item to active project modal
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDuration, setItemDuration] = useState(60);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectItems = workItems.filter((i) => i.projectId === activeProject?.id);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const p = addProject({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      color: newColor,
      status: 'active',
    });

    soundEngine?.playPop();
    setSelectedProjectId(p.id);
    setNewTitle('');
    setNewDesc('');
    setIsAddProjectOpen(false);
  };

  const handleAddItemToProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !activeProject) return;

    addWorkItem({
      title: itemTitle.trim(),
      type: 'lesson',
      estimatedMinutes: itemDuration,
      priority: 'p2_high',
      status: 'backlog',
      projectId: activeProject.id,
      scheduledDate: null,
    });

    soundEngine?.playPop();
    setItemTitle('');
    setIsAddItemOpen(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderGit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Dự án & Khóa học (Projects & Courses Hub)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý các khóa học, mục tiêu lớn và phân rã thành các bài học có thể xếp lịch dần
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/roadmap"
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-[#161b26] dark:hover:bg-[#202738] border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Xem Dự báo & Lộ trình</span>
          </Link>

          <button
            onClick={() => setIsCourseManagerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161b26] dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Trình Quản lý Môn học</span>
          </button>

          <button
            onClick={() => setIsAddProjectOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Khóa học / Dự án</span>
          </button>
        </div>
      </div>

      {/* Grid: Left (Projects List), Right (Project Detail & Lessons) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Projects Switcher */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
            Danh mục ({projects.length})
          </div>

          <div className="space-y-2">
            {projects.map((project) => {
              const isSelected = project.id === activeProject?.id;
              const items = workItems.filter((i) => i.projectId === project.id);
              const completedCount = items.filter((i) => i.status === 'completed').length;
              const percent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-[#11141d] border-indigo-400 dark:border-indigo-500/40 shadow-xs'
                      : 'bg-white/60 dark:bg-[#11141d]/60 border-slate-200 dark:border-[#1e2538] hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: project.color || '#6366f1' }}
                      />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{project.title}</h4>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-tabular">{percent}%</span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-100 dark:bg-[#161b26] rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-tabular">
                      {completedCount}/{items.length} bài
                    </span>
                    <span className="capitalize">{project.category || 'Môn học'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Project Detail & Work Items */}
        <div className="lg:col-span-8 space-y-4">
          {activeProject ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-6 transition-colors">
              {/* Project Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#1e2538]">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: activeProject.color || '#6366f1' }}
                    />
                    {activeProject.title}
                  </h3>
                  {activeProject.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activeProject.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddItemOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm bài học</span>
                  </button>

                  <button
                    onClick={() => deleteProject(activeProject.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors"
                    title="Xóa dự án này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items in this Project */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>Danh sách bài học ({projectItems.length})</span>
                  <span className="font-tabular">
                    Tổng thời lượng: {formatMinutes(projectItems.reduce((acc, i) => acc + i.estimatedMinutes, 0))}
                  </span>
                </div>

                {projectItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] hover:border-slate-300 dark:hover:border-slate-600 flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-slate-400 dark:text-slate-500 font-mono font-tabular">#{idx + 1}</span>
                      <span
                        className={`truncate font-medium ${
                          item.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-500 dark:text-slate-400 font-mono font-tabular">
                        {formatMinutes(item.estimatedMinutes)}
                      </span>
                      <button
                        onClick={() => deleteWorkItem(item.id)}
                        className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {projectItems.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                    Chưa có bài học nào trong dự án này. Bấm "Thêm bài học" để bắt đầu.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538]">
              Hãy chọn hoặc tạo một dự án mới
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {isAddProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1e2538]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Tạo Dự án / Khóa học mới
              </h3>
              <button
                onClick={() => setIsAddProjectOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên dự án / Môn học
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Khóa học Next.js 15, Ôn thi IELTS 7.5..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô tả / Mục tiêu
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả mục tiêu đầu ra..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Màu sắc nhận diện
                </label>
                <div className="flex gap-2">
                  {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        newColor === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1e2538]">
                <button
                  type="button"
                  onClick={() => setIsAddProjectOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Tạo dự án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1e2538]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Thêm bài học vào {activeProject?.title}
              </h3>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItemToProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên bài học / Nhiệm vụ
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Bài 1 - Giới thiệu Server Actions..."
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thời lượng ước tính (phút)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={itemDuration}
                  onChange={(e) => setItemDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-tabular"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1e2538]">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Thêm bài học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Manager Modal */}
      <CourseManagerModal
        isOpen={isCourseManagerOpen}
        onClose={() => setIsCourseManagerOpen(false)}
        initialProjectId={activeProject?.id}
      />
    </div>
  );
}
