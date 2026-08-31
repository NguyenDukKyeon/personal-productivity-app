import {
  archiveHabit,
  createHabit,
  unarchiveHabit,
  updateHabit,
  type Habit,
} from '@/domain/habits/habit';
import {
  createHabitCheckIn,
  type HabitCheckIn,
  type HabitCheckInKind,
} from '@/domain/habits/habit-check-in';
import { deriveHabitRecoveryState } from '@/domain/habits/habit-recovery';
import {
  isHabitScheduledForDate,
  type HabitSchedule,
} from '@/domain/habits/habit-schedule';
import {
  addHabitToRoutine,
  createRoutine,
  removeHabitFromRoutine,
  updateRoutine,
  type Routine,
} from '@/domain/habits/routine';
import { parseLocalDateKey, toLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';
import type { HabitRepository } from '@/infrastructure/persistence/contracts/habit-repository';

export interface HabitTodayItem {
  habit: Habit;
  isScheduledToday: boolean;
  checkIn: HabitCheckIn | null;
  isRecovery: boolean;
  lastScheduledDate: string | null;
  lastCheckIn: HabitCheckIn | null;
}

export interface HabitsViewModel {
  date: string;
  items: HabitTodayItem[];
  routineGroups: Array<{
    routine: Routine;
    items: HabitTodayItem[];
  }>;
  unassignedItems: HabitTodayItem[];
  archivedHabits: Habit[];
  metricsSummary: {
    totalScheduledToday: number;
    completedToday: number;
    fullToday: number;
    minimumToday: number;
    skippedToday: number;
    pendingToday: number;
    inRecoveryToday: number;
  };
}

export interface CreateHabitInput {
  title: string;
  description?: string;
  cue?: string;
  minimumVersion: string;
  schedule: HabitSchedule;
  routineId?: string | null;
}

export interface UpdateHabitInput {
  title?: string;
  description?: string;
  cue?: string;
  minimumVersion?: string;
  schedule?: HabitSchedule;
  routineId?: string | null;
}

export interface RecordCheckInInput {
  habitId: string;
  date: string;
  kind: HabitCheckInKind;
  note?: string;
}

export interface CreateRoutineInput {
  name: string;
  contextLabel?: string;
  habitIds?: string[];
}

export interface UpdateRoutineInput {
  name?: string;
  contextLabel?: string;
  habitIds?: string[];
}

export interface HabitService {
  getHabitsView(dateKey: string): Promise<Result<HabitsViewModel>>;
  createHabit(input: CreateHabitInput): Promise<Result<Habit>>;
  updateHabit(id: string, patch: UpdateHabitInput): Promise<Result<Habit>>;
  archiveHabit(id: string): Promise<Result<Habit>>;
  unarchiveHabit(id: string): Promise<Result<Habit>>;
  recordCheckIn(input: RecordCheckInInput): Promise<Result<HabitCheckIn>>;
  clearCheckIn(habitId: string, dateKey: string): Promise<Result<void>>;
  getHabitHistory(habitId: string, limitDays?: number): Promise<Result<HabitCheckIn[]>>;
  createRoutine(input: CreateRoutineInput): Promise<Result<Routine>>;
  updateRoutine(id: string, patch: UpdateRoutineInput): Promise<Result<Routine>>;
  deleteRoutine(id: string): Promise<Result<void>>;
}

function shiftDateKey(dateKey: string, offsetDays: number): string {
  const parts = parseLocalDateKey(dateKey);
  if (!parts) return dateKey;
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays));
  return toLocalDateKey(new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
}

export function createHabitService(deps: {
  habitRepository: HabitRepository;
  now: () => Date;
  newId: () => string;
}): HabitService {
  const { habitRepository, now, newId } = deps;

  return {
    async getHabitsView(dateKey: string): Promise<Result<HabitsViewModel>> {
      const allHabitsRes = await habitRepository.listHabits(true);
      if (!allHabitsRes.ok) return allHabitsRes;

      const routinesRes = await habitRepository.listRoutines();
      if (!routinesRes.ok) return routinesRes;

      const startDateKey = shiftDateKey(dateKey, -35);
      const checkInsRes = await habitRepository.listCheckInsInRange(startDateKey, dateKey);
      if (!checkInsRes.ok) return checkInsRes;

      const allCheckIns = checkInsRes.value;
      const todayCheckInsMap = new Map<string, HabitCheckIn>();
      for (const c of allCheckIns) {
        if (c.date === dateKey) {
          todayCheckInsMap.set(c.habitId, c);
        }
      }

      const activeHabits = allHabitsRes.value.filter((h) => h.status === 'active');
      const archivedHabits = allHabitsRes.value.filter((h) => h.status === 'archived');

      let totalScheduledToday = 0;
      let fullToday = 0;
      let minimumToday = 0;
      let skippedToday = 0;
      let inRecoveryToday = 0;

      const items: HabitTodayItem[] = activeHabits.map((habit) => {
        const isScheduledToday = isHabitScheduledForDate(habit.schedule, dateKey);
        const checkIn = todayCheckInsMap.get(habit.id) ?? null;
        const recoveryState = deriveHabitRecoveryState({
          habit,
          currentDateKey: dateKey,
          checkIns: allCheckIns,
          lookbackDays: 30,
        });

        if (isScheduledToday) {
          totalScheduledToday++;
          if (checkIn?.kind === 'full') fullToday++;
          else if (checkIn?.kind === 'minimum') minimumToday++;
          else if (checkIn?.kind === 'skipped') skippedToday++;

          if (recoveryState.isRecovery) {
            inRecoveryToday++;
          }
        }

        return {
          habit,
          isScheduledToday,
          checkIn,
          isRecovery: recoveryState.isRecovery,
          lastScheduledDate: recoveryState.lastScheduledDate,
          lastCheckIn: recoveryState.lastCheckIn,
        };
      });

      const completedToday = fullToday + minimumToday;
      const pendingToday = Math.max(0, totalScheduledToday - (completedToday + skippedToday));

      const itemMap = new Map<string, HabitTodayItem>();
      for (const item of items) {
        itemMap.set(item.habit.id, item);
      }

      const routines = routinesRes.value;
      const assignedHabitIds = new Set<string>();

      const routineGroups = routines.map((routine) => {
        const groupItems: HabitTodayItem[] = [];
        for (const hid of routine.habitIds) {
          const item = itemMap.get(hid);
          if (item) {
            groupItems.push(item);
            assignedHabitIds.add(hid);
          }
        }
        return {
          routine,
          items: groupItems,
        };
      });

      const unassignedItems = items.filter((item) => !assignedHabitIds.has(item.habit.id));

      return ok({
        date: dateKey,
        items,
        routineGroups,
        unassignedItems,
        archivedHabits,
        metricsSummary: {
          totalScheduledToday,
          completedToday,
          fullToday,
          minimumToday,
          skippedToday,
          pendingToday,
          inRecoveryToday,
        },
      });
    },

    async createHabit(input: CreateHabitInput): Promise<Result<Habit>> {
      const id = `habit_${newId()}`;
      const nowIso = now().toISOString();
      const habitRes = createHabit({
        id,
        title: input.title,
        description: input.description,
        cue: input.cue,
        minimumVersion: input.minimumVersion,
        schedule: input.schedule,
        routineId: input.routineId,
        nowIso,
      });
      if (!habitRes.ok) return habitRes;

      const saveRes = await habitRepository.saveHabit(habitRes.value);
      if (!saveRes.ok) return saveRes;

      if (input.routineId) {
        const routineRes = await habitRepository.getRoutine(input.routineId);
        if (routineRes.ok && routineRes.value) {
          const updatedRoutine = addHabitToRoutine(routineRes.value, id, nowIso);
          await habitRepository.saveRoutine(updatedRoutine);
        }
      }

      return ok(habitRes.value);
    },

    async updateHabit(id: string, patch: UpdateHabitInput): Promise<Result<Habit>> {
      const existingRes = await habitRepository.getHabit(id);
      if (!existingRes.ok) return existingRes;
      if (!existingRes.value) {
        return err('habit_not_found', 'Habit not found');
      }

      const nowIso = now().toISOString();
      const previousRoutineId = existingRes.value.routineId;

      const updatedRes = updateHabit(existingRes.value, patch, nowIso);
      if (!updatedRes.ok) return updatedRes;

      const saveRes = await habitRepository.saveHabit(updatedRes.value);
      if (!saveRes.ok) return saveRes;

      // Sync routine membership if changed
      if (patch.routineId !== undefined && patch.routineId !== previousRoutineId) {
        if (previousRoutineId) {
          const oldRoutineRes = await habitRepository.getRoutine(previousRoutineId);
          if (oldRoutineRes.ok && oldRoutineRes.value) {
            const removed = removeHabitFromRoutine(oldRoutineRes.value, id, nowIso);
            await habitRepository.saveRoutine(removed);
          }
        }
        if (patch.routineId) {
          const newRoutineRes = await habitRepository.getRoutine(patch.routineId);
          if (newRoutineRes.ok && newRoutineRes.value) {
            const added = addHabitToRoutine(newRoutineRes.value, id, nowIso);
            await habitRepository.saveRoutine(added);
          }
        }
      }

      return ok(updatedRes.value);
    },

    async archiveHabit(id: string): Promise<Result<Habit>> {
      const existingRes = await habitRepository.getHabit(id);
      if (!existingRes.ok) return existingRes;
      if (!existingRes.value) {
        return err('habit_not_found', 'Habit not found');
      }

      const nowIso = now().toISOString();
      const archived = archiveHabit(existingRes.value, nowIso);
      const saveRes = await habitRepository.saveHabit(archived);
      if (!saveRes.ok) return saveRes;

      return ok(archived);
    },

    async unarchiveHabit(id: string): Promise<Result<Habit>> {
      const existingRes = await habitRepository.getHabit(id);
      if (!existingRes.ok) return existingRes;
      if (!existingRes.value) {
        return err('habit_not_found', 'Habit not found');
      }

      const nowIso = now().toISOString();
      const unarchived = unarchiveHabit(existingRes.value, nowIso);
      const saveRes = await habitRepository.saveHabit(unarchived);
      if (!saveRes.ok) return saveRes;

      return ok(unarchived);
    },

    async recordCheckIn(input: RecordCheckInInput): Promise<Result<HabitCheckIn>> {
      const habitRes = await habitRepository.getHabit(input.habitId);
      if (!habitRes.ok) return habitRes;
      if (!habitRes.value) {
        return err('habit_not_found', 'Habit not found');
      }

      const nowIso = now().toISOString();
      const checkInRes = createHabitCheckIn({
        habitId: input.habitId,
        date: input.date,
        kind: input.kind,
        note: input.note,
        nowIso,
      });
      if (!checkInRes.ok) return checkInRes;

      const saveRes = await habitRepository.saveCheckIn(checkInRes.value);
      if (!saveRes.ok) return saveRes;

      return ok(checkInRes.value);
    },

    async clearCheckIn(habitId: string, dateKey: string): Promise<Result<void>> {
      return habitRepository.deleteCheckIn(habitId, dateKey);
    },

    async getHabitHistory(habitId: string, limitDays = 30): Promise<Result<HabitCheckIn[]>> {
      const listRes = await habitRepository.listCheckInsForHabit(habitId);
      if (!listRes.ok) return listRes;

      const sorted = listRes.value
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limitDays);

      return ok(sorted);
    },

    async createRoutine(input: CreateRoutineInput): Promise<Result<Routine>> {
      const id = `routine_${newId()}`;
      const nowIso = now().toISOString();
      const routineRes = createRoutine({
        id,
        name: input.name,
        contextLabel: input.contextLabel,
        habitIds: input.habitIds,
        nowIso,
      });
      if (!routineRes.ok) return routineRes;

      const saveRes = await habitRepository.saveRoutine(routineRes.value);
      if (!saveRes.ok) return saveRes;

      return ok(routineRes.value);
    },

    async updateRoutine(id: string, patch: UpdateRoutineInput): Promise<Result<Routine>> {
      const existingRes = await habitRepository.getRoutine(id);
      if (!existingRes.ok) return existingRes;
      if (!existingRes.value) {
        return err('routine_not_found', 'Routine not found');
      }

      const nowIso = now().toISOString();
      const updatedRes = updateRoutine(existingRes.value, patch, nowIso);
      if (!updatedRes.ok) return updatedRes;

      const saveRes = await habitRepository.saveRoutine(updatedRes.value);
      if (!saveRes.ok) return saveRes;

      return ok(updatedRes.value);
    },

    async deleteRoutine(id: string): Promise<Result<void>> {
      const habitsRes = await habitRepository.listHabits(true);
      if (habitsRes.ok) {
        const linkedHabits = habitsRes.value.filter((h) => h.routineId === id);
        for (const habit of linkedHabits) {
          const unlinked = updateHabit(habit, { routineId: null }, now().toISOString());
          if (unlinked.ok) {
            await habitRepository.saveHabit(unlinked.value);
          }
        }
      }
      return habitRepository.deleteRoutine(id);
    },
  };
}
