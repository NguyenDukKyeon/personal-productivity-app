'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Layers,
  X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';
import { formatMinutes } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';

interface CourseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProjectId?: string;
}

export function CourseManagerModal({ isOpen, onClose, initialProjectId }: CourseManagerModalProps) {
  const {
    projects,
    topics,
    workItems,
    addTopic,
    deleteTopic,
    addWorkItem,
    deleteWorkItem,
    toggleCompleteWorkItem,
    bulkAddLessons,
  } = useAppStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || projects[0]?.id || ''
  );

  // New topic state
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');

  // Bulk add lessons state
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkTopicId, setBulkTopicId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [defaultDuration, setDefaultDuration] = useState(60);

  // Single add lesson state
  const [isAddSingleLessonOpen, setIsAddSingleLessonOpen] = useState(false);
  const [singleTopicId, setSingleTopicId] = useState<string | null>(null);
  const [singleLessonTitle, setSingleLessonTitle] = useState('');
  const [singleLessonDuration, setSingleLessonDuration] = useState(60);

  if (!isOpen) return null;

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectTopics = topics.filter((t) => t.projectId === activeProject?.id);
  const projectItems = workItems.filter((i) => i.projectId === activeProject?.id);

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || !activeProject) return;

    addTopic({
      projectId: activeProject.id,
      title: topicTitle.trim(),
    });

    soundEngine?.playPop();
    setTopicTitle('');
    setIsAddTopicOpen(false);
  };

  const handleBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim() || !activeProject) return;

    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const lessonsToAdd = lines.map((line) => ({
      title: line,
      estimatedMinutes: defaultDuration,
    }));

    bulkAddLessons(activeProject.id, bulkTopicId, lessonsToAdd);
    soundEngine?.playBell('complete');
    setBulkText('');
    setIsBulkAddOpen(false);
  };

  const handleAddSingleLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleLessonTitle.trim() || !activeProject) return;

    addWorkItem({
      projectId: activeProject.id,
      topicId: singleTopicId,
      title: singleLessonTitle.trim(),
      type: 'lesson',
      estimatedMinutes: singleLessonDuration,
      priority: 'p2_high',
      status: 'backlog',
      scheduledDate: null,
    });

    soundEngine?.playPop();
    setSingleLessonTitle('');
    setIsAddSingleLessonOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2538] flex items-center justify-between bg-slate-50 dark:bg-[#0d1017]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Trình Quản Lý Môn Học & Chương Mục (Course & Lesson Manager)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quản lý cây 3 cấp: Môn học → Chương/Chủ đề → Bài học & thời lượng
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

        {/* Content Layout: Left (Course Switcher), Right (Chapters & Lessons) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Course Sidebar */}
          <div className="w-64 border-r border-slate-200 dark:border-[#1e2538] bg-slate-50/50 dark:bg-[#0d1017]/50 p-4 space-y-3 shrink-0 overflow-y-auto">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              Môn học ({projects.length})
            </div>

            <div className="space-y-1.5">
              {projects.map((proj) => {
                const count = workItems.filter((i) => i.projectId === proj.id).length;
                const isSelected = proj.id === activeProject?.id;

                return (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161b26] hover:text-slate-900 dark:hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: proj.color || '#6366f1' }}
                      />
                      <span className="truncate">{proj.title}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 font-tabular">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Topic & Lessons Workspace */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {activeProject ? (
              <>
                {/* Active Course Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#1e2538]">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: activeProject.color || '#6366f1' }}
                      />
                      {activeProject.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-tabular">
                      {projectTopics.length} chương • {projectItems.length} bài học • Tổng thời lượng:{' '}
                      {formatMinutes(projectItems.reduce((acc, i) => acc + i.estimatedMinutes, 0))}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAddTopicOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161b26] dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Thêm Chương</span>
                    </button>

                    <button
                      onClick={() => {
                        setBulkTopicId(projectTopics[0]?.id || null);
                        setIsBulkAddOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Nhập hàng loạt bài</span>
                    </button>
                  </div>
                </div>

                {/* Topics Accordions */}
                <div className="space-y-4">
                  {projectTopics.map((topic) => {
                    const topicLessons = projectItems.filter((i) => i.topicId === topic.id);
                    const doneCount = topicLessons.filter((i) => i.status === 'completed').length;

                    return (
                      <div
                        key={topic.id}
                        className="rounded-2xl bg-white dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] overflow-hidden shadow-xs"
                      >
                        {/* Topic Header */}
                        <div className="p-3.5 bg-slate-50 dark:bg-[#1a202c]/60 flex items-center justify-between border-b border-slate-200 dark:border-[#1e2538]">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                              {topic.title}
                            </h4>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal font-tabular">
                              ({doneCount}/{topicLessons.length} bài)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setSingleTopicId(topic.id);
                                setIsAddSingleLessonOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white dark:bg-[#11141d] dark:text-slate-300 dark:hover:text-white text-[11px] font-semibold transition-colors"
                            >
                              + Thêm bài
                            </button>

                            <button
                              onClick={() => deleteTopic(topic.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                              title="Xóa chương"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Lessons List in Topic */}
                        <div className="divide-y divide-slate-100 dark:divide-[#1e2538]/50 p-2 space-y-1">
                          {topicLessons.map((lesson, lIdx) => {
                            const isCompleted = lesson.status === 'completed';

                            return (
                              <div
                                key={lesson.id}
                                className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#11141d]/50 flex items-center justify-between gap-3 text-xs transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <button
                                    onClick={() => {
                                      soundEngine?.playPop();
                                      toggleCompleteWorkItem(lesson.id);
                                    }}
                                    className="text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 shrink-0"
                                  >
                                    {isCompleted ? (
                                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Circle className="w-4 h-4" />
                                    )}
                                  </button>

                                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 font-tabular">
                                    #{lIdx + 1}
                                  </span>

                                  <span
                                    className={`truncate font-medium ${
                                      isCompleted
                                        ? 'line-through text-slate-400 dark:text-slate-500'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    {lesson.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-tabular">
                                    {formatMinutes(lesson.estimatedMinutes)}
                                  </span>

                                  <button
                                    onClick={() => deleteWorkItem(lesson.id)}
                                    className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {topicLessons.length === 0 && (
                            <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                              Chưa có bài học nào trong chương này.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Add Topic Modal */}
        {isAddTopicOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] p-5 space-y-3 shadow-2xl">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Thêm Chương / Chủ đề mới</h4>
              <input
                type="text"
                autoFocus
                placeholder="VD: Chương 2 - Lập trình Bất đồng bộ..."
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsAddTopicOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateTopic}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                >
                  Thêm Chương
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Add Lessons Modal */}
        {isBulkAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e2538]">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Nhập danh sách bài học hàng loạt
                </h4>
                <button
                  onClick={() => setIsBulkAddOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chương đích:
                </label>
                <select
                  value={bulkTopicId || ''}
                  onChange={(e) => setBulkTopicId(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">-- Không phân chương --</option>
                  {projectTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thời lượng mặc định cho mỗi bài (phút):
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(Number(e.target.value) || 60)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none font-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dán danh sách bài học (Mỗi dòng một bài):
                </label>
                <textarea
                  rows={6}
                  placeholder={`Bài 1: Giới thiệu kiến trúc tổng quan\nBài 2: Thiết lập môi trường và cấu hình\nBài 3: Xử lý tương tác Server Actions\nBài 4: Tối ưu hiệu năng và Caching`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkAddOpen(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleBulkAdd}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Xác nhận Nhập bài
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single Add Lesson Modal */}
        {isAddSingleLessonOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-[#1e2538] p-5 space-y-3 shadow-2xl">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Thêm bài học</h4>
              <input
                type="text"
                autoFocus
                placeholder="Tên bài học..."
                value={singleLessonTitle}
                onChange={(e) => setSingleLessonTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Thời lượng (phút):
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={singleLessonDuration}
                  onChange={(e) => setSingleLessonDuration(Number(e.target.value) || 60)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] text-xs text-slate-900 dark:text-white focus:outline-none font-tabular"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsAddSingleLessonOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddSingleLesson}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                >
                  Thêm bài
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
