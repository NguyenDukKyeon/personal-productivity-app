import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  WorkItem,
  Project,
  Topic,
  Habit,
  HabitLog,
  FocusSession,
  DailyPlan,
  DailyReflection,
  AppSettings,
  FocusMode,
} from '@/types';
import { getTodayDateString } from '@/lib/utils';
import { autoScheduleUpcomingLessons } from '@/lib/algorithms/forecast';

interface ActiveTimerState {
  workItemId: string | null;
  mode: FocusMode;
  isRunning: boolean;
  isPaused: boolean;
  totalDurationMins: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  currentCycle: number;
  isBreak: boolean;
  braindumpNotes: string[];
  sessionStartTime: string | null;
}

interface AppState {
  // Data entities
  workItems: WorkItem[];
  projects: Project[];
  topics: Topic[];
  habits: Habit[];
  habitLogs: HabitLog[];
  focusSessions: FocusSession[];
  dailyPlans: Record<string, DailyPlan>; // Keyed by YYYY-MM-DD
  dailyReflections: Record<string, DailyReflection>; // Keyed by YYYY-MM-DD
  reviewCompletions: Record<string, string>; // Keyed by review:${lessonId}:${date} -> ISO completion timestamp
  settings: AppSettings;

  // Active Focus Timer
  timer: ActiveTimerState;

  // Selected date for viewing
  selectedDate: string; // YYYY-MM-DD

  // Actions - Navigation & Date
  setSelectedDate: (date: string) => void;

  // Actions - Work Items & Lessons & Reviews
  addWorkItem: (item: Omit<WorkItem, 'id' | 'createdAt' | 'updatedAt' | 'actualMinutes' | 'orderIndex'>) => WorkItem;
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => void;
  deleteWorkItem: (id: string) => void;
  toggleCompleteWorkItem: (id: string) => void;
  toggleReviewCompletion: (lessonId: string, dateStr: string) => void;
  reorderWorkItems: (items: WorkItem[]) => void;
  bulkAddLessons: (projectId: string, topicId: string | null, lessons: { title: string; estimatedMinutes: number }[]) => number;
  autoScheduleLessons: (startDateStr?: string) => number;

  // Actions - Projects & Courses
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Actions - Topics & Chapters
  addTopic: (topic: Omit<Topic, 'id' | 'createdAt' | 'orderIndex'>) => Topic;
  updateTopic: (id: string, updates: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;

  // Actions - Habits
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'archived'>) => Habit;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitLog: (habitId: string, date: string, completedValue?: number, note?: string) => void;
  setHabitProgressValue: (habitId: string, date: string, value: number) => void;

  // Actions - Daily Plan & Capacity
  setDailyCapacity: (date: string, hours: number) => void;
  setDailyTop3: (date: string, itemIds: string[]) => void;
  setMorningIntention: (date: string, intention: string) => void;

  // Actions - Focus Timer
  startFocusTimer: (workItemId?: string | null, mode?: FocusMode, durationMins?: number) => void;
  startBreakTimer: (isLongBreak?: boolean) => void;
  pauseFocusTimer: () => void;
  resumeFocusTimer: () => void;
  tickTimer: () => void;
  addBraindumpNote: (note: string) => void;
  removeBraindumpNote: (index: number) => void;
  convertBraindumpToTask: (index: number) => void;
  setTimerWorkItem: (workItemId: string | null) => void;
  stopFocusTimer: (focusRating?: number) => FocusSession | null;

  // Actions - Reflection
  saveDailyReflection: (reflection: Omit<DailyReflection, 'id' | 'createdAt'>) => void;

  // Actions - Settings
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Actions - Data Migration / Import
  importLegacyData: (data: { courses?: unknown[]; lessons?: unknown[]; subjects?: unknown[]; settings?: unknown }) => number;
  resetToDefaults: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  soundEnabled: true,
  soundVolume: 75,
  ambientSound: 'none',
  ambientVolume: 50,
  defaultCapacityHours: 6.0,
  pomodoroWorkMins: 25,
  pomodoroBreakMins: 5,
  pomodoroLongBreakMins: 15,
  pomodoroLongBreakInterval: 4,
  aiProvider: 'gemini',
  aiModel: 'gemini-3.7-flash',
};

const initialTimerState: ActiveTimerState = {
  workItemId: null,
  mode: 'pomodoro',
  isRunning: false,
  isPaused: false,
  totalDurationMins: 25,
  remainingSeconds: 25 * 60,
  elapsedSeconds: 0,
  currentCycle: 1,
  isBreak: false,
  braindumpNotes: [],
  sessionStartTime: null,
};

// Initial starter seed data with 3 levels: Course -> Topics -> Lessons
const initialProjects: Project[] = [
  {
    id: 'proj-1',
    title: 'Lập trình Fullstack Next.js 15 & System Architecture',
    description: 'Lộ trình từ cơ bản đến nâng cao: React 19, App Router, Supabase, Performance',
    color: '#6366f1',
    icon: 'GraduationCap',
    category: 'study',
    targetDailyHours: 2.0,
    status: 'active',
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    title: 'Ôn Luyện Tiếng Anh IELTS 7.5+',
    description: 'Chiến thuật Reading Passage 1-3 và Cấu trúc Writing Task 2',
    color: '#10b981',
    icon: 'BookOpen',
    category: 'study',
    targetDailyHours: 1.5,
    status: 'active',
    orderIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialTopics: Topic[] = [
  {
    id: 'topic-1',
    projectId: 'proj-1',
    title: 'Chương 1: Kiến trúc React 19 & Server Components',
    orderIndex: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'topic-2',
    projectId: 'proj-1',
    title: 'Chương 2: Next.js 15 App Router & Server Actions',
    orderIndex: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'topic-3',
    projectId: 'proj-2',
    title: 'Chương 1: Reading Strategies & Skimming Mastery',
    orderIndex: 0,
    createdAt: new Date().toISOString(),
  },
];

const initialHabits: Habit[] = [
  {
    id: 'habit-1',
    name: 'Lập kế hoạch đầu ngày (Morning Plan)',
    routine: 'morning',
    frequencyType: 'daily',
    frequencyDays: [1, 2, 3, 4, 5, 6, 7],
    targetValue: 1,
    targetUnit: 'times',
    color: '#f59e0b',
    icon: 'Sun',
    archived: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'habit-2',
    name: 'Đọc sách phát triển bản thân (20 trang)',
    routine: 'morning',
    frequencyType: 'daily',
    frequencyDays: [1, 2, 3, 4, 5, 6, 7],
    targetValue: 20,
    targetUnit: 'pages',
    color: '#8b5cf6',
    icon: 'BookOpen',
    archived: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'habit-3',
    name: 'Deep Work ít nhất 2 phiên Pomodoro',
    routine: 'afternoon',
    frequencyType: 'daily',
    frequencyDays: [1, 2, 3, 4, 5, 6, 7],
    targetValue: 2,
    targetUnit: 'times',
    color: '#ec4899',
    icon: 'Flame',
    archived: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'habit-4',
    name: 'Nghiệm thu cuối ngày (Daily Shutdown)',
    routine: 'evening',
    frequencyType: 'daily',
    frequencyDays: [1, 2, 3, 4, 5, 6, 7],
    targetValue: 1,
    targetUnit: 'times',
    color: '#3b82f6',
    icon: 'Moon',
    archived: false,
    createdAt: new Date().toISOString(),
  },
];

const today = getTodayDateString();

const initialWorkItems: WorkItem[] = [
  {
    id: 'lesson-1',
    projectId: 'proj-1',
    topicId: 'topic-1',
    title: 'Bài 1: Tổng quan React 19 Actions & useOptimistic',
    notes: 'Hiểu cơ chế state optimistic và luồng bất đồng bộ',
    type: 'lesson',
    estimatedMinutes: 60,
    actualMinutes: 60,
    priority: 'p1_urgent',
    status: 'completed',
    scheduledDate: today,
    scheduledTimeStart: '08:30',
    orderIndex: 0,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lesson-2',
    projectId: 'proj-1',
    topicId: 'topic-1',
    title: 'Bài 2: Server Components vs Client Components ranh giới render',
    notes: 'Tránh import server code vào client bundle',
    type: 'lesson',
    estimatedMinutes: 60,
    actualMinutes: 0,
    priority: 'p2_high',
    status: 'scheduled',
    scheduledDate: today,
    scheduledTimeStart: '10:30',
    orderIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lesson-3',
    projectId: 'proj-1',
    topicId: 'topic-2',
    title: 'Bài 3: Server Actions & Route Handlers với Zod Validation',
    notes: 'Xử lý mutation an toàn phía server',
    type: 'lesson',
    estimatedMinutes: 90,
    actualMinutes: 0,
    priority: 'p2_high',
    status: 'backlog',
    scheduledDate: null,
    orderIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lesson-4',
    projectId: 'proj-1',
    topicId: 'topic-2',
    title: 'Bài 4: Cache Component & Incremental Static Regeneration',
    notes: 'Tối ưu tốc độ tải trang < 50ms',
    type: 'lesson',
    estimatedMinutes: 60,
    actualMinutes: 0,
    priority: 'p3_medium',
    status: 'backlog',
    scheduledDate: null,
    orderIndex: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lesson-5',
    projectId: 'proj-2',
    topicId: 'topic-3',
    title: 'Bài 1: Kỹ thuật Skimming & Scanning Passage 1',
    notes: 'Luyện tập dạng câu hỏi True/False/Not Given',
    type: 'lesson',
    estimatedMinutes: 45,
    actualMinutes: 0,
    priority: 'p3_medium',
    status: 'scheduled',
    scheduledDate: today,
    scheduledTimeStart: '14:00',
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lesson-6',
    projectId: 'proj-2',
    topicId: 'topic-3',
    title: 'Bài 2: Giải đề Cam 19 Test 1 Reading Passage 2',
    notes: 'Matching Headings & Summary Completion',
    type: 'lesson',
    estimatedMinutes: 60,
    actualMinutes: 0,
    priority: 'p3_medium',
    status: 'backlog',
    scheduledDate: null,
    orderIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      workItems: initialWorkItems,
      projects: initialProjects,
      topics: initialTopics,
      habits: initialHabits,
      habitLogs: [],
      focusSessions: [],
      dailyPlans: {
        [today]: {
          id: `plan-${today}`,
          date: today,
          capacityHours: 6.0,
          top3ItemIds: ['lesson-1', 'lesson-2', 'lesson-5'],
          morningIntention: 'Nắm vững ranh giới Server/Client Components và luyện tập Passage 1 Tiếng Anh.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      dailyReflections: {},
      reviewCompletions: {},
      settings: defaultSettings,
      timer: initialTimerState,
      selectedDate: today,

      setSelectedDate: (date) => set({ selectedDate: date }),

      addWorkItem: (itemData) => {
        const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newItem: WorkItem = {
          ...itemData,
          id,
          actualMinutes: 0,
          orderIndex: get().workItems.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ workItems: [newItem, ...state.workItems] }));
        return newItem;
      },

      updateWorkItem: (id, updates) => {
        set((state) => ({
          workItems: state.workItems.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
          ),
        }));
      },

      deleteWorkItem: (id) => {
        set((state) => ({
          workItems: state.workItems.filter((item) => item.id !== id),
        }));
      },

      toggleCompleteWorkItem: (id) => {
        set((state) => ({
          workItems: state.workItems.map((item) => {
            if (item.id !== id) return item;
            const isCompleted = item.status === 'completed';
            return {
              ...item,
              status: isCompleted ? 'scheduled' : 'completed',
              completedAt: isCompleted ? null : new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      toggleReviewCompletion: (lessonId, dateStr) => {
        const taskId = `review:${lessonId}:${dateStr}`;
        set((state) => {
          const current = state.reviewCompletions || {};
          const isDone = Boolean(current[taskId]);
          const updated = { ...current };
          if (isDone) {
            delete updated[taskId];
          } else {
            updated[taskId] = new Date().toISOString();
          }
          return { reviewCompletions: updated };
        });
      },

      reorderWorkItems: (items) => {
        set({ workItems: items });
      },

      bulkAddLessons: (projectId, topicId, lessons) => {
        const newItems: WorkItem[] = lessons.map((l, idx) => ({
          id: `lesson-${Date.now()}-${idx}`,
          projectId,
          topicId,
          title: l.title,
          type: 'lesson',
          estimatedMinutes: l.estimatedMinutes || 60,
          actualMinutes: 0,
          priority: 'p3_medium',
          status: 'backlog',
          scheduledDate: null,
          orderIndex: get().workItems.length + idx,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        set((state) => ({ workItems: [...state.workItems, ...newItems] }));
        return newItems.length;
      },

      autoScheduleLessons: (startDateStr = getTodayDateString()) => {
        const { workItems, dailyPlans, settings } = get();
        const { updatedItems, scheduledCount } = autoScheduleUpcomingLessons(
          workItems,
          dailyPlans,
          settings.defaultCapacityHours,
          startDateStr,
          7
        );

        set({ workItems: updatedItems });
        return scheduledCount;
      },

      addProject: (projData) => {
        const id = `proj-${Date.now()}`;
        const newProj: Project = {
          ...projData,
          id,
          orderIndex: get().projects.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ projects: [...state.projects, newProj] }));
        return newProj;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          topics: state.topics.filter((t) => t.projectId !== id),
          workItems: state.workItems.filter((i) => i.projectId !== id),
        }));
      },

      addTopic: (topicData) => {
        const id = `topic-${Date.now()}`;
        const newTopic: Topic = {
          ...topicData,
          id,
          orderIndex: get().topics.filter((t) => t.projectId === topicData.projectId).length,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ topics: [...state.topics, newTopic] }));
        return newTopic;
      },

      updateTopic: (id, updates) => {
        set((state) => ({
          topics: state.topics.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteTopic: (id) => {
        set((state) => ({
          topics: state.topics.filter((t) => t.id !== id),
          workItems: state.workItems.map((i) => (i.topicId === id ? { ...i, topicId: null } : i)),
        }));
      },

      addHabit: (habitData) => {
        const id = `habit-${Date.now()}`;
        const newHabit: Habit = {
          ...habitData,
          id,
          archived: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ habits: [...state.habits, newHabit] }));
        return newHabit;
      },

      updateHabit: (id, updates) => {
        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        }));
      },

      deleteHabit: (id) => {
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
          habitLogs: state.habitLogs.filter((l) => l.habitId !== id),
        }));
      },

      toggleHabitLog: (habitId, date, completedValue = 1, note) => {
        set((state) => {
          const existingLogIndex = state.habitLogs.findIndex(
            (l) => l.habitId === habitId && l.date === date
          );

          if (existingLogIndex >= 0) {
            const existing = state.habitLogs[existingLogIndex];
            const updatedLogs = [...state.habitLogs];
            updatedLogs[existingLogIndex] = {
              ...existing,
              isCompleted: !existing.isCompleted,
              completedValue: !existing.isCompleted ? completedValue : 0,
              note: note ?? existing.note,
            };
            return { habitLogs: updatedLogs };
          } else {
            const newLog: HabitLog = {
              id: `hlog-${Date.now()}`,
              habitId,
              date,
              completedValue,
              isCompleted: true,
              note,
              createdAt: new Date().toISOString(),
            };
            return { habitLogs: [...state.habitLogs, newLog] };
          }
        });
      },

      setHabitProgressValue: (habitId, date, value) => {
        set((state) => {
          const habit = state.habits.find((h) => h.id === habitId);
          const target = habit?.targetValue || 1;
          const isCompleted = value >= target;

          const existingLogIndex = state.habitLogs.findIndex(
            (l) => l.habitId === habitId && l.date === date
          );

          if (existingLogIndex >= 0) {
            const existing = state.habitLogs[existingLogIndex];
            const updatedLogs = [...state.habitLogs];
            updatedLogs[existingLogIndex] = {
              ...existing,
              completedValue: value,
              isCompleted,
            };
            return { habitLogs: updatedLogs };
          } else {
            const newLog: HabitLog = {
              id: `hlog-${Date.now()}`,
              habitId,
              date,
              completedValue: value,
              isCompleted,
              createdAt: new Date().toISOString(),
            };
            return { habitLogs: [...state.habitLogs, newLog] };
          }
        });
      },

      setDailyCapacity: (date, hours) => {
        set((state) => {
          const currentPlan = state.dailyPlans[date] || {
            id: `plan-${date}`,
            date,
            capacityHours: hours,
            top3ItemIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return {
            dailyPlans: {
              ...state.dailyPlans,
              [date]: { ...currentPlan, capacityHours: hours, updatedAt: new Date().toISOString() },
            },
          };
        });
      },

      setDailyTop3: (date, itemIds) => {
        set((state) => {
          const currentPlan = state.dailyPlans[date] || {
            id: `plan-${date}`,
            date,
            capacityHours: state.settings.defaultCapacityHours,
            top3ItemIds: itemIds.slice(0, 3),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return {
            dailyPlans: {
              ...state.dailyPlans,
              [date]: { ...currentPlan, top3ItemIds: itemIds.slice(0, 3), updatedAt: new Date().toISOString() },
            },
          };
        });
      },

      setMorningIntention: (date, intention) => {
        set((state) => {
          const currentPlan = state.dailyPlans[date] || {
            id: `plan-${date}`,
            date,
            capacityHours: state.settings.defaultCapacityHours,
            top3ItemIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return {
            dailyPlans: {
              ...state.dailyPlans,
              [date]: { ...currentPlan, morningIntention: intention, updatedAt: new Date().toISOString() },
            },
          };
        });
      },

      startFocusTimer: (workItemId = null, mode = 'pomodoro', durationMins = 25) => {
        set({
          timer: {
            workItemId,
            mode,
            isRunning: true,
            isPaused: false,
            totalDurationMins: durationMins,
            remainingSeconds: durationMins * 60,
            elapsedSeconds: 0,
            currentCycle: 1,
            isBreak: false,
            braindumpNotes: [],
            sessionStartTime: new Date().toISOString(),
          },
        });
      },

      startBreakTimer: (isLongBreak = false) => {
        const { settings, timer } = get();
        const breakMins = isLongBreak
          ? (settings.pomodoroLongBreakMins || 15)
          : (settings.pomodoroBreakMins || 5);

        set({
          timer: {
            ...timer,
            isBreak: true,
            isRunning: true,
            isPaused: false,
            totalDurationMins: breakMins,
            remainingSeconds: breakMins * 60,
            elapsedSeconds: 0,
            sessionStartTime: new Date().toISOString(),
          },
        });
      },

      pauseFocusTimer: () => {
        set((state) => ({
          timer: { ...state.timer, isRunning: false, isPaused: true },
        }));
      },

      resumeFocusTimer: () => {
        set((state) => ({
          timer: { ...state.timer, isRunning: true, isPaused: false },
        }));
      },

      tickTimer: () => {
        set((state) => {
          if (!state.timer.isRunning) return state;

          if (state.timer.mode === 'flow' || state.timer.mode === 'stopwatch') {
            return {
              timer: {
                ...state.timer,
                elapsedSeconds: state.timer.elapsedSeconds + 1,
                remainingSeconds: state.timer.remainingSeconds + 1,
              },
            };
          }

          if (state.timer.remainingSeconds <= 1) {
            return {
              timer: {
                ...state.timer,
                remainingSeconds: 0,
                elapsedSeconds: state.timer.elapsedSeconds + 1,
                isRunning: false,
                isPaused: false,
              },
            };
          }

          return {
            timer: {
              ...state.timer,
              remainingSeconds: state.timer.remainingSeconds - 1,
              elapsedSeconds: state.timer.elapsedSeconds + 1,
            },
          };
        });
      },

      addBraindumpNote: (note) => {
        set((state) => ({
          timer: {
            ...state.timer,
            braindumpNotes: [...state.timer.braindumpNotes, note],
          },
        }));
      },

      removeBraindumpNote: (index) => {
        set((state) => ({
          timer: {
            ...state.timer,
            braindumpNotes: state.timer.braindumpNotes.filter((_, i) => i !== index),
          },
        }));
      },

      convertBraindumpToTask: (index) => {
        const { timer, addWorkItem, selectedDate } = get();
        const note = timer.braindumpNotes[index];
        if (!note) return;

        addWorkItem({
          title: note,
          type: 'task',
          estimatedMinutes: 30,
          priority: 'p3_medium',
          status: 'backlog',
          scheduledDate: selectedDate,
        });

        get().removeBraindumpNote(index);
      },

      setTimerWorkItem: (workItemId) => {
        set((state) => ({
          timer: {
            ...state.timer,
            workItemId,
          },
        }));
      },

      stopFocusTimer: (focusRating = 5) => {
        const { timer, workItems } = get();
        if (!timer.sessionStartTime) return null;

        const durationMinutes = Math.max(1, Math.round(timer.elapsedSeconds / 60));
        const newSession: FocusSession = {
          id: `session-${Date.now()}`,
          workItemId: timer.workItemId,
          durationMinutes,
          mode: timer.mode,
          focusRating,
          distractionNotes: timer.braindumpNotes,
          startedAt: timer.sessionStartTime,
          endedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        if (timer.workItemId) {
          const item = workItems.find((i) => i.id === timer.workItemId);
          if (item) {
            get().updateWorkItem(timer.workItemId, {
              actualMinutes: (item.actualMinutes || 0) + durationMinutes,
            });
          }
        }

        set((state) => ({
          focusSessions: [newSession, ...state.focusSessions],
          timer: initialTimerState,
        }));

        return newSession;
      },

      saveDailyReflection: (reflectionData) => {
        const id = `refl-${reflectionData.date}`;
        const newReflection: DailyReflection = {
          ...reflectionData,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          dailyReflections: {
            ...state.dailyReflections,
            [reflectionData.date]: newReflection,
          },
        }));
      },

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      importLegacyData: (legacyData) => {
        let importedCount = 0;
        try {
          // Legacy smart-planner supported subjects with milestones and lessons
          const subjects = (legacyData.subjects || legacyData.courses || []) as any[];
          const flatLessons = (legacyData.lessons || []) as any[];

          const newProjects: Project[] = [];
          const newTopics: Topic[] = [];
          const newWorkItems: WorkItem[] = [];

          subjects.forEach((subj: any, sIdx: number) => {
            const projId = `proj-legacy-${subj.id || sIdx}`;
            newProjects.push({
              id: projId,
              title: subj.name || subj.title || `Môn học ${sIdx + 1}`,
              description: subj.description || 'Import từ Smart Planner cũ',
              color: subj.color || '#6366f1',
              category: 'study',
              targetDailyHours: subj.dailyHours || 2.0,
              status: 'active',
              orderIndex: sIdx,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            // If subject has milestones/topics
            if (Array.isArray(subj.milestones)) {
              subj.milestones.forEach((ms: any, mIdx: number) => {
                const topicId = `topic-legacy-${ms.id || `${sIdx}-${mIdx}`}`;
                newTopics.push({
                  id: topicId,
                  projectId: projId,
                  title: ms.title || ms.name || `Chương ${mIdx + 1}`,
                  orderIndex: mIdx,
                  createdAt: new Date().toISOString(),
                });

                if (Array.isArray(ms.lessons)) {
                  ms.lessons.forEach((l: any, lIdx: number) => {
                    newWorkItems.push({
                      id: `lesson-legacy-${l.id || `${sIdx}-${mIdx}-${lIdx}`}`,
                      projectId: projId,
                      topicId,
                      title: l.name || l.title || `Bài ${lIdx + 1}`,
                      notes: l.notes || '',
                      type: 'lesson',
                      estimatedMinutes: Math.round((l.durationHours || l.duration || 1) * 60),
                      actualMinutes: Math.round((l.studiedHours || 0) * 60),
                      priority: l.priority === 'urgent' ? 'p1_urgent' : 'p3_medium',
                      status: l.completed ? 'completed' : l.scheduledDate ? 'scheduled' : 'backlog',
                      scheduledDate: l.scheduledDate || null,
                      orderIndex: lIdx,
                      completedAt: l.completed ? new Date().toISOString() : null,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    importedCount++;
                  });
                }
              });
            }
          });

          // Handle standalone flat lessons
          flatLessons.forEach((l: any, index: number) => {
            const courseId = l.courseId || l.subjectId ? `proj-legacy-${l.courseId || l.subjectId}` : null;
            newWorkItems.push({
              id: `item-legacy-${l.id || index}`,
              projectId: courseId,
              topicId: null,
              title: l.title || l.name || `Bài học ${index + 1}`,
              notes: l.notes || '',
              type: 'lesson',
              estimatedMinutes: Math.round((l.durationHours || l.duration || 1) * 60),
              actualMinutes: Math.round((l.studiedHours || 0) * 60),
              priority: l.priority === 'urgent' ? 'p1_urgent' : 'p3_medium',
              status: l.completed ? 'completed' : l.scheduledDate ? 'scheduled' : 'backlog',
              scheduledDate: l.scheduledDate || null,
              orderIndex: index,
              completedAt: l.completed ? new Date().toISOString() : null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            importedCount++;
          });

          set((state) => ({
            projects: [...state.projects, ...newProjects],
            topics: [...state.topics, ...newTopics],
            workItems: [...state.workItems, ...newWorkItems],
          }));
        } catch {
          // Parse error
        }
        return importedCount;
      },

      resetToDefaults: () => {
        set({
          workItems: initialWorkItems,
          projects: initialProjects,
          topics: initialTopics,
          habits: initialHabits,
          habitLogs: [],
          focusSessions: [],
          dailyPlans: {},
          dailyReflections: {},
          settings: defaultSettings,
          timer: initialTimerState,
        });
      },
    }),
    {
      name: 'smart-planner-storage-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
