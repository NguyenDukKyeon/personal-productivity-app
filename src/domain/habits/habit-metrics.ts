import { toLocalDateKey } from '../shared/local-date';
import { isHabitScheduledOnDate, type Habit } from './habit';
import type { HabitCheckIn } from './habit-check-in';
import { deriveHabitRecoveryState } from './habit-recovery';

export interface HabitMetrics {
  scheduledDays: number;
  fullCount: number;
  minimumCount: number;
  skippedCount: number;
  missedCount: number;
  pendingCount: number;
  consistencyRate: number; // 0..100 percent
  recoveriesCompleted: number;
}

export function calculateHabitMetrics({
  habit,
  dateKeys,
  checkIns,
  currentDateKey,
}: {
  habit: Habit;
  dateKeys: string[];
  checkIns: HabitCheckIn[];
  currentDateKey?: string;
}): HabitMetrics {
  const checkInMap = new Map<string, HabitCheckIn>();
  for (const c of checkIns) {
    if (c.habitId === habit.id) {
      checkInMap.set(c.date, c);
    }
  }

  const todayKey =
    currentDateKey ??
    (dateKeys.length > 0 ? dateKeys[dateKeys.length - 1] : toLocalDateKey(new Date()));

  let scheduledDays = 0;
  let fullCount = 0;
  let minimumCount = 0;
  let skippedCount = 0;
  let missedCount = 0;
  let pendingCount = 0;
  let recoveriesCompleted = 0;

  for (const dateKey of dateKeys) {
    if (!isHabitScheduledOnDate(habit, dateKey)) {
      continue;
    }

    scheduledDays++;
    const checkIn = checkInMap.get(dateKey);

    if (!checkIn) {
      if (dateKey >= todayKey) {
        pendingCount++;
      } else {
        missedCount++;
      }
      continue;
    }

    if (checkIn.kind === 'full') {
      fullCount++;
    } else if (checkIn.kind === 'minimum') {
      minimumCount++;
    } else if (checkIn.kind === 'skipped') {
      skippedCount++;
    }

    // Check if this completion was a recovery from a missed prior scheduled day
    if (checkIn.kind === 'full' || checkIn.kind === 'minimum') {
      const priorState = deriveHabitRecoveryState({
        habit,
        currentDateKey: dateKey,
        checkIns,
        lookbackDays: 30,
      });
      if (priorState.isRecovery) {
        recoveriesCompleted++;
      }
    }
  }

  const completedCount = fullCount + minimumCount;
  const evaluatedScheduledDays = scheduledDays - pendingCount;
  const consistencyRate =
    evaluatedScheduledDays === 0
      ? (scheduledDays > 0 ? 100 : 0)
      : Math.max(0, Math.min(100, Math.round((completedCount / evaluatedScheduledDays) * 100)));

  return {
    scheduledDays,
    fullCount,
    minimumCount,
    skippedCount,
    missedCount,
    pendingCount,
    consistencyRate,
    recoveriesCompleted,
  };
}
