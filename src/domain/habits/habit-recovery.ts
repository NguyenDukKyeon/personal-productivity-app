import { shiftLocalDateKey } from '../shared/local-date';
import { isHabitScheduledOnDate, type Habit } from './habit';
import type { HabitCheckIn } from './habit-check-in';

export interface HabitRecoveryState {
  isRecovery: boolean;
  lastScheduledDate: string | null;
  lastCheckIn: HabitCheckIn | null;
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

    if (isHabitScheduledOnDate(habit, candidateDate)) {
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
