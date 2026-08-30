export type Priority = 'p1_urgent' | 'p2_high' | 'p3_medium' | 'p4_low';
export type WorkItemType = 'task' | 'lesson' | 'milestone';
export type WorkItemStatus = 'backlog' | 'scheduled' | 'in_progress' | 'completed';

export interface Topic {
  id: string;
  projectId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
}

export interface WorkItem {
  id: string;
  userId?: string;
  projectId?: string | null;
  topicId?: string | null; // Cấp 2: Chương / Chủ đề trong môn học
  title: string;
  notes?: string;
  type: WorkItemType;
  estimatedMinutes: number; // in minutes (e.g. 30, 45, 60, 90, 120)
  actualMinutes: number;
  priority: Priority;
  status: WorkItemStatus;
  scheduledDate?: string | null; // YYYY-MM-DD
  scheduledTimeStart?: string | null; // HH:mm
  orderIndex: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  color: string;
  icon?: string;
  category?: 'study' | 'project' | 'personal'; // Phân loại môn học hay dự án
  targetDailyHours?: number; // Quỹ giờ mục tiêu cho môn học này
  status: 'active' | 'archived' | 'completed';
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type HabitRoutine = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type HabitFrequency = 'daily' | 'specific_days' | 'times_per_week';

export interface Habit {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  routine: HabitRoutine;
  frequencyType: HabitFrequency;
  frequencyDays: number[]; // 1 = Monday, 7 = Sunday
  targetValue: number; // e.g. 1 (times), 20 (pages), 30 (minutes), 2000 (ml)
  targetUnit: string; // 'times' | 'pages' | 'mins' | 'ml'
  color: string;
  icon: string;
  archived: boolean;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  completedValue: number;
  isCompleted: boolean;
  note?: string;
  createdAt: string;
}

export type FocusMode = 'pomodoro' | 'flow' | 'stopwatch';

export interface FocusSession {
  id: string;
  userId?: string;
  workItemId?: string | null;
  durationMinutes: number;
  mode: FocusMode;
  focusRating?: number; // 1 to 5 stars
  distractionNotes: string[];
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface DailyPlan {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  capacityHours: number; // default 6.0
  top3ItemIds: string[]; // up to 3 workItem IDs
  morningIntention?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReflection {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  energyRating: number; // 1 to 5
  focusRating: number; // 1 to 5
  whatWentWell?: string;
  whatDistracted?: string;
  keyTakeaway?: string;
  disciplineScore: number; // 0 to 100 percentage
  createdAt: string;
}

export type GeminiModelType = 'gemini-3.7-flash' | 'gemini-3.5-flash' | 'gemini-2.5-flash';
export type AmbientSoundType = 'none' | 'rain' | 'whitenoise' | 'gamma40hz' | 'waves' | 'cafe';
export type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'ollama';

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  soundEnabled: boolean;
  soundVolume: number; // 0 to 100
  ambientSound: AmbientSoundType;
  ambientVolume: number; // 0 to 100
  defaultCapacityHours: number; // default 6h
  pomodoroWorkMins: number; // default 25
  pomodoroBreakMins: number; // default 5
  pomodoroLongBreakMins: number; // default 15
  pomodoroLongBreakInterval: number; // default 4
  aiProvider: AIProvider;
  aiModel: GeminiModelType | string; // e.g. 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'
  customApiKey?: string;
  customApiEndpoint?: string;
  geminiModel?: GeminiModelType | string;
  geminiApiKey?: string;
}
