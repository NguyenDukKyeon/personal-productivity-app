import { Habit, HabitLog, WorkItem, DailyPlan, FocusSession } from "@/types";

export interface DayDisciplineMetrics {
  capacityHours: number;
  plannedMinutes: number;
  deepWorkMinutes: number;
  habitsDueCount: number;
  habitsCompletedCount: number;
  top3CompletedCount: number;
  top3TotalCount: number;
  disciplineScore: number; // 0 to 100
  isOverbooked: boolean;
  overbookedMinutes: number;
}

/**
 * Tính toán điểm kỷ luật (Discipline Score) trong ngày
 * Trọng số:
 * - 40% Tỷ lệ thời gian Deep Work so với Quỹ giờ cam kết (capped at 100%)
 * - 35% Tỷ lệ hoàn thành Top 3 nhiệm vụ quan trọng nhất (Most Important Tasks)
 * - 25% Tỷ lệ hoàn thành các Thói quen (Habits) đến hạn trong ngày
 */
export function calculateDailyDisciplineScore(
  date: string,
  plan: DailyPlan | undefined,
  items: WorkItem[],
  habits: Habit[],
  habitLogs: HabitLog[],
  focusSessions: FocusSession[]
): DayDisciplineMetrics {
  const capacityHours = plan?.capacityHours ?? 6;
  const capacityMinutes = capacityHours * 60;

  // Lọc các công việc được xếp vào ngày này
  const dayItems = items.filter(item => item.scheduledDate === date);
  const plannedMinutes = dayItems.reduce((acc, item) => acc + item.estimatedMinutes, 0);

  // Tổng thời gian Deep Work thực tế từ Focus Sessions
  const dayFocus = focusSessions.filter(s => s.startedAt.startsWith(date));
  const deepWorkMinutes = dayFocus.reduce((acc, s) => acc + s.durationMinutes, 0);

  // Top 3 Items
  const top3Ids = plan?.top3ItemIds ?? [];
  const top3Items = dayItems.filter(i => top3Ids.includes(i.id));
  const top3TotalCount = top3Items.length;
  const top3CompletedCount = top3Items.filter(i => i.status === 'completed').length;

  // Thói quen đến hạn trong ngày
  const dayOfWeek = new Date(date).getDay() || 7; // 1 (Mon) to 7 (Sun)
  const dueHabits = habits.filter(h => {
    if (h.archived) return false;
    if (h.frequencyType === 'daily') return true;
    if (h.frequencyType === 'specific_days') return h.frequencyDays.includes(dayOfWeek);
    return true;
  });

  const habitsDueCount = dueHabits.length;
  const completedHabitIds = new Set(
    habitLogs
      .filter(l => l.date === date && l.isCompleted)
      .map(l => l.habitId)
  );
  const habitsCompletedCount = dueHabits.filter(h => completedHabitIds.has(h.id)).length;

  // Thành phần 1: Deep Work vs Capacity (40%)
  const deepWorkRatio = capacityMinutes > 0 ? Math.min(deepWorkMinutes / capacityMinutes, 1) : 1;
  const deepWorkScore = deepWorkRatio * 40;

  // Thành phần 2: Top 3 MITs (35%)
  const top3Ratio = top3TotalCount > 0 ? top3CompletedCount / top3TotalCount : (dayItems.length > 0 ? dayItems.filter(i => i.status === 'completed').length / dayItems.length : 1);
  const top3Score = top3Ratio * 35;

  // Thành phần 3: Habits (25%)
  const habitsRatio = habitsDueCount > 0 ? habitsCompletedCount / habitsDueCount : 1;
  const habitScore = habitsRatio * 25;

  const totalScore = Math.round(deepWorkScore + top3Score + habitScore);

  const isOverbooked = plannedMinutes > capacityMinutes;
  const overbookedMinutes = Math.max(0, plannedMinutes - capacityMinutes);

  return {
    capacityHours,
    plannedMinutes,
    deepWorkMinutes,
    habitsDueCount,
    habitsCompletedCount,
    top3CompletedCount,
    top3TotalCount,
    disciplineScore: Math.min(100, Math.max(0, totalScore)),
    isOverbooked,
    overbookedMinutes,
  };
}

/**
 * Tính Streak và quy tắc "Never Miss Twice"
 */
export function calculateHabitStreak(
  habitId: string,
  logs: HabitLog[],
  todayStr: string
): { currentStreak: number; bestStreak: number; missedYesterday: boolean; isDueToday: boolean } {
  const habitLogs = logs
    .filter(l => l.habitId === habitId && l.isCompleted)
    .map(l => l.date)
    .sort();

  if (habitLogs.length === 0) {
    return { currentStreak: 0, bestStreak: 0, missedYesterday: false, isDueToday: true };
  }

  const logSet = new Set(habitLogs);
  let currentStreak = 0;
  let cursor = new Date(todayStr);

  // Check today completion
  const completedToday = logSet.has(todayStr);
  if (completedToday) {
    currentStreak++;
  }

  // Check backwards
  cursor.setDate(cursor.getDate() - 1);
  const yesterdayStr = cursor.toISOString().split('T')[0];
  const completedYesterday = logSet.has(yesterdayStr);

  let missedYesterday = !completedYesterday && !completedToday;

  while (true) {
    const dStr = cursor.toISOString().split('T')[0];
    if (logSet.has(dStr)) {
      if (!completedToday && cursor.toISOString().split('T')[0] === yesterdayStr) {
        currentStreak++;
      } else if (completedToday) {
        currentStreak++;
      }
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

    return {
    currentStreak,
    bestStreak: Math.max(currentStreak, habitLogs.length),
    missedYesterday,
    isDueToday: true,
  };
}

/**
 * Tính tỷ lệ duy trì thói quen (Consistency Rate) trong N ngày gần nhất (mặc định 30 ngày)
 */
export function calculateHabitConsistencyRate(
  habitId: string,
  logs: HabitLog[],
  days: number = 30
): number {
  const completedLogs = logs.filter(
    (l) => l.habitId === habitId && l.isCompleted
  );
  if (days <= 0) return 0;
  return Math.min(100, Math.round((completedLogs.length / days) * 100));
}
