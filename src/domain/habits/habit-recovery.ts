import { parseLocalDateKey, toLocalDateKey } from '../shared/local-date';
import type { Habit } from './habit';
import type { HabitCheckIn } from './habit-check-in';
import { isHabitScheduledForDate } from './habit-schedule';

export interface HabitRecoveryState {
  isRecovery: boolean;
  lastScheduledDate: string | null;
  lastCheckIn: HabitCheckIn | null;
}

function shiftLocalDateKey(dateKey: string, offsetDays: number): string | null {
  const parts = parseLocalDateKey(dateKey);
  if (!parts) return null;
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays));
  return toLocalDateKey(new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
}

export function deriveHabitRecoveryState({
  habit,
  currentDateKey,
  checkIns,
  lookbackDays = 30,
}: {
  habit: Habit;
  currentDateKey: string;
  checkIns: HabitCheckIn[];
  lookbackDays?: number;
}): HabitRecoveryState {
  const checkInMap = new Map<string, HabitCheckIn>();
  for (const c of checkIns) {
    if (c.habitId === habit.id) {
      checkInMap.set(c.date, c);
    }
  }

  for (let offset = -1; offset >= -lookbackDays; offset--) {
    const candidateDate = shiftLocalDateKey(currentDateKey, offset);
    if (!candidateDate) continue;

    if (isHabitScheduledForDate(habit.schedule, candidateDate)) {
      const lastCheckIn = checkInMap.get(candidateDate) ?? null;
      const isRecovery = !lastCheckIn || lastCheckIn.kind === 'skipped';
      return {
        isRecovery,
        lastScheduledDate: candidateDate,
        lastCheckIn,
      };
    }
  }

  return {
    isRecovery: false,
    lastScheduledDate: null,
    lastCheckIn: null,
  };
}
