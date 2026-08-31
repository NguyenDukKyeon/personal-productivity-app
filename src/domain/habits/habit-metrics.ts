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
  consistencyRate: number; // 0..100 percent of completed historical scheduled days
  recoveriesCompleted: number;
}

/**
 * Historical consistency distinguishes pending from missed:
 * - past scheduled date + no check-in = missed
 * - current asOfDateKey + no check-in = pending (not in the historical
 *   completed denominator — a 14-day rate at 08:00 must not punish today)
 * - after today's completion, today enters the denominator correctly
 */
export function calculateHabitMetrics({
  habit,
  dateKeys,
  checkIns,
  asOfDateKey,
}: {
  habit: Habit;
  dateKeys: string[];
  checkIns: HabitCheckIn[];
  asOfDateKey?: string;
}): HabitMetrics {
  const asOf = asOfDateKey ?? toLocalDateKey(new Date());
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
      if (dateKey < asOf) {
        missedCount++;
      } else if (dateKey === asOf) {
        pendingCount++;
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
  const historicalDenominator = scheduledDays - pendingCount;
  const consistencyRate =
    historicalDenominator <= 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((completedCount / historicalDenominator) * 100)));

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
