import type { Habit } from './habit';
import type { HabitCheckIn } from './habit-check-in';
import { deriveHabitRecoveryState } from './habit-recovery';
import { isHabitScheduledForDate } from './habit-schedule';

export interface HabitMetrics {
  scheduledDays: number;
  fullCount: number;
  minimumCount: number;
  skippedCount: number;
  missedCount: number;
  consistencyRate: number; // 0..100 percent
  recoveriesCompleted: number;
}

export function calculateHabitMetrics({
  habit,
  dateKeys,
  checkIns,
}: {
  habit: Habit;
  dateKeys: string[];
  checkIns: HabitCheckIn[];
}): HabitMetrics {
  const checkInMap = new Map<string, HabitCheckIn>();
  for (const c of checkIns) {
    if (c.habitId === habit.id) {
      checkInMap.set(c.date, c);
    }
  }

  let scheduledDays = 0;
  let fullCount = 0;
  let minimumCount = 0;
  let skippedCount = 0;
  let recoveriesCompleted = 0;

  for (const dateKey of dateKeys) {
    if (!isHabitScheduledForDate(habit.schedule, dateKey)) {
      continue;
    }

    scheduledDays++;
    const checkIn = checkInMap.get(dateKey);

    if (!checkIn) {
      // Missed opportunity (no check-in)
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
  const missedCount = scheduledDays - (completedCount + skippedCount);
  const consistencyRate =
    scheduledDays === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((completedCount / scheduledDays) * 100)));

  return {
    scheduledDays,
    fullCount,
    minimumCount,
    skippedCount,
    missedCount,
    consistencyRate,
    recoveriesCompleted,
  };
}
