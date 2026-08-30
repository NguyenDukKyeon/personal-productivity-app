'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle,
  Circle,
  Play,
  BookOpen,
  Zap,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAppStore } from '@/lib/store/useAppStore';
import { ForecastCard } from '@/components/courses/ForecastCard';
import { CourseManagerModal } from '@/components/courses/CourseManagerModal';
import { calculateCourseForecast } from '@/lib/algorithms/forecast';
import { formatMinutes, getTodayDateString } from '@/lib/utils';
import { soundEngine } from '@/lib/audio/soundEffects';

export default function RoadmapPage() {
  const router = useRouter();
  const {
    projects,
    topics,
    workItems,
    toggleCompleteWorkItem,
    updateWorkItem,
    startFocusTimer,
    autoScheduleLessons,
  } = useAppStore();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'canonical' | 'projected'>('projected');
  const [isCourseManagerOpen, setIsCourseManagerOpen] = useState(false);
  const [autoScheduleMessage, setAutoScheduleMessage] = useState<string | null>(null);

  const activeProjects = projects.filter((p) => p.category === 'study' || !p.category);

  const forecast = calculateCourseForecast(
    selectedSubjectId,
    projects,
    workItems,
    4.0
  );

  const currentLessons = workItems.filter((i) => {
    if (i.type !== 'lesson' && selectedSubjectId !== 'all') return false;
    if (selectedSubjectId === 'all') return i.type === 'lesson';
    return i.projectId === selectedSubjectId;
  });

  const nextLesson = currentLessons.find((i) => i.status !== 'completed');

  const handleStartFocus = (lessonId: string) => {
    soundEngine?.playBell('start');
    startFocusTimer(lessonId, 'pomodoro', 25);
    router.push('/focus');
  };

  const handlePushToToday = (lessonId: string) => {
    soundEngine?.playPop();
    updateWorkItem(lessonId, {
      scheduledDate: getTodayDateString(),
      status: 'scheduled',
    });
  };

  const handleAutoSchedule = () => {
    const count = autoScheduleLessons(getTodayDateString());
    soundEngine?.playBell('complete');
    setAutoScheduleMessage(`Đã tự động phân bổ ${count} bài học tiếp theo vào lịch 7 ngày tới!`);
    setTimeout(() => setAutoScheduleMessage(null), 3000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Lộ Trình Học Tập & Dự Báo Mốc Hoàn Thành (Learning Roadmap & Forecast)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản trị tiến độ môn học, dự báo ngày học hết bài và tự động xếp bài học vào lịch tuần
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleAutoSchedule}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            title="Tự động phân bổ các bài học tiếp theo vào lịch 7 ngày tới"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tự động phân bổ bài vào tuần</span>
          </button>

          <button
            onClick={() => setIsCourseManagerOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161b26] dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Quản lý Môn học</span>
          </button>
        </div>
      </div>

      {autoScheduleMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4" />
          <span>{autoScheduleMessage}</span>
        </div>
      )}

      {/* Forecast Card (Mốc hoàn thành & What-If Slider) */}
      <ForecastCard selectedProjectId={selectedSubjectId} />

      {/* Next Recommended Lesson Hero Card */}
      {nextLesson && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Bài học tiếp theo cần chinh phục
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{nextLesson.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Thời lượng ước tính: <strong className="font-tabular text-slate-700 dark:text-slate-300">{formatMinutes(nextLesson.estimatedMinutes)}</strong>
              {nextLesson.notes && ` • ${nextLesson.notes}`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {nextLesson.scheduledDate !== getTodayDateString() && (
              <button
                onClick={() => handlePushToToday(nextLesson.id)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#161b26] hover:bg-slate-200 dark:hover:bg-[#202738] border border-slate-200 dark:border-[#1e2538] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                + Đẩy vào Hôm nay
              </button>
            )}

            <button
              onClick={() => handleStartFocus(nextLesson.id)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Bắt đầu Focus ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Subject Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedSubjectId === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#161b26] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1e2538]'
            }`}
          >
            🌟 Tất cả Môn học
          </button>

          {activeProjects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedSubjectId(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                selectedSubjectId === p.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#161b26] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1e2538]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color || '#6366f1' }}
              />
              <span>{p.title}</span>
            </button>
          ))}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-[#161b26] p-1 rounded-xl border border-slate-200 dark:border-[#1e2538] shrink-0">
          <button
            onClick={() => setViewMode('projected')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
              viewMode === 'projected'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lộ trình Dự kiến (Theo ngày)</span>
          </button>

          <button
            onClick={() => setViewMode('canonical')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
              viewMode === 'canonical'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Theo Chương mục (Cấu trúc gốc)</span>
          </button>
        </div>
      </div>

      {/* View Mode 1: Projected Timeline View */}
      {viewMode === 'projected' && (
        <div className="space-y-4">
          {forecast.projectedDays.map((day, dIdx) => (
            <div
              key={day.dateISO}
              className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] shadow-xs space-y-3 transition-colors"
            >
              {/* Day Heading */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e2538]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                    {day.dayLabel}
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-tabular">
                    ({day.lessons.length} bài • {formatMinutes(day.totalMinutes)})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold font-tabular">
                  Ngày #{dIdx + 1}
                </span>
              </div>

              {/* Lessons in this projected day */}
              <div className="space-y-2">
                {day.lessons.map((lesson) => {
                  const isCompleted = lesson.status === 'completed';

                  return (
                    <div
                      key={lesson.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                        isCompleted
                          ? 'bg-slate-50 dark:bg-[#13161f] border-slate-200 dark:border-[#1a1f2c] opacity-60'
                          : 'bg-slate-50 dark:bg-[#161b26] border-slate-200 dark:border-[#1e2538] hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
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
                        <span
                          className={`truncate font-medium ${
                            isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {lesson.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-slate-500 dark:text-slate-400 font-tabular">
                          {formatMinutes(lesson.estimatedMinutes)}
                        </span>
                        {!isCompleted && (
                          <button
                            onClick={() => handleStartFocus(lesson.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white font-semibold transition-colors"
                          >
                            Focus
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {forecast.projectedDays.length === 0 && (
            <div className="p-12 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] text-center text-xs text-slate-500 dark:text-slate-400">
              Không còn bài học nào cần xếp lịch dự kiến. Tất cả bài học đã hoàn thành! 🎉
            </div>
          )}
        </div>
      )}

      {/* View Mode 2: Canonical Topic View */}
      {viewMode === 'canonical' && (
        <div className="space-y-4">
          {projects
            .filter((p) => selectedSubjectId === 'all' || p.id === selectedSubjectId)
            .map((proj) => {
              const projTopics = topics.filter((t) => t.projectId === proj.id);
              const projItems = workItems.filter((i) => i.projectId === proj.id && i.type === 'lesson');

              return (
                <div
                  key={proj.id}
                  className="rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-[#1e2538] p-5 space-y-4 shadow-xs transition-colors"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1e2538]">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: proj.color || '#6366f1' }}
                      />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{proj.title}</h3>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-tabular">
                      {projItems.filter((i) => i.status === 'completed').length}/{projItems.length} bài hoàn thành
                    </span>
                  </div>

                  {/* Topics in project */}
                  <div className="space-y-3">
                    {projTopics.map((topic) => {
                      const topicLessons = projItems.filter((i) => i.topicId === topic.id);

                      return (
                        <div
                          key={topic.id}
                          className="rounded-xl bg-slate-50 dark:bg-[#161b26] border border-slate-200 dark:border-[#1e2538] p-3 space-y-2"
                        >
                          <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                            {topic.title}
                          </h4>

                          <div className="space-y-1.5">
                            {topicLessons.map((lesson) => {
                              const isCompleted = lesson.status === 'completed';

                              return (
                                <div
                                  key={lesson.id}
                                  className="p-2.5 rounded-lg bg-white dark:bg-[#11141d] border border-slate-200 dark:border-transparent flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
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
                                    <span
                                      className={`truncate ${
                                        isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                                      }`}
                                    >
                                      {lesson.title}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-tabular">
                                    {formatMinutes(lesson.estimatedMinutes)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Course Manager Modal */}
      <CourseManagerModal
        isOpen={isCourseManagerOpen}
        onClose={() => setIsCourseManagerOpen(false)}
        initialProjectId={selectedSubjectId !== 'all' ? selectedSubjectId : undefined}
      />
    </div>
  );
}
