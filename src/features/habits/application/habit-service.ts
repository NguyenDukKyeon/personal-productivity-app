import {
  archiveHabit,
  createHabit,
  isHabitActiveOnDate,
  isHabitScheduledOnDate,
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
import { type HabitSchedule } from '@/domain/habits/habit-schedule';
import {
  createRoutine,
  updateRoutine,
  type Routine,
} from '@/domain/habits/routine';
import { parseLocalDateKey, toLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';
import type { HabitRepository } from '@/infrastructure/persistence/contracts/habit-repository';

export interface HabitTodayItem {
  habit: Habit;
  routineId: string | null;
  routineName: string | null;
  isScheduledToday: boolean;
  checkIn: HabitCheckIn | null;
  isRecovery: boolean;
  lastScheduledDate: string | null;
  lastCheckIn: HabitCheckIn | null;
}

export interface HabitsViewModel {
  date: string;
  items: HabitTodayItem[]; // All active habits
  scheduledTodayItems: HabitTodayItem[]; // Active AND scheduled today
  unscheduledTodayItems: HabitTodayItem[]; // Active but not scheduled today
  routineGroups: Array<{
    routine: Routine;
    items: HabitTodayItem[];
    scheduledItems: HabitTodayItem[];
    unscheduledItems: HabitTodayItem[];
  }>;
  unassignedItems: HabitTodayItem[];
  unassignedScheduledItems: HabitTodayItem[];
  unassignedUnscheduledItems: HabitTodayItem[];
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
}

export interface UpdateRoutineInput {
  name?: string;
  contextLabel?: string;
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
  reorderRoutine(id: string, habitIds: string[]): Promise<Result<void>>;
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
      const routines = routinesRes.value;

      // Build habit -> routine mapping from canonical Routine.habitIds
      const habitRoutineMap = new Map<string, { id: string; name: string }>();
      for (const r of routines) {
        for (const hid of r.habitIds) {
          habitRoutineMap.set(hid, { id: r.id, name: r.name });
        }
      }

      let totalScheduledToday = 0;
      let fullToday = 0;
      let minimumToday = 0;
      let skippedToday = 0;
      let inRecoveryToday = 0;

      const items: HabitTodayItem[] = activeHabits.map((habit) => {
        const isScheduledToday = isHabitScheduledOnDate(habit, dateKey);
        const checkIn = todayCheckInsMap.get(habit.id) ?? null;
        const routineInfo = habitRoutineMap.get(habit.id) ?? null;

        // Recovery prompts must ONLY appear on scheduled occurrences
        let isRecovery = false;
        let lastScheduledDate: string | null = null;
        let lastCheckIn: HabitCheckIn | null = null;

        if (isScheduledToday) {
          totalScheduledToday++;
          if (checkIn?.kind === 'full') fullToday++;
          else if (checkIn?.kind === 'minimum') minimumToday++;
          else if (checkIn?.kind === 'skipped') skippedToday++;

          const recoveryState = deriveHabitRecoveryState({
            habit,
            currentDateKey: dateKey,
            checkIns: allCheckIns,
            lookbackDays: 30,
          });

          isRecovery = recoveryState.isRecovery;
          lastScheduledDate = recoveryState.lastScheduledDate;
          lastCheckIn = recoveryState.lastCheckIn;

          if (isRecovery) {
            inRecoveryToday++;
          }
        }

        return {
          habit,
          routineId: routineInfo?.id ?? null,
          routineName: routineInfo?.name ?? null,
          isScheduledToday,
          checkIn,
          isRecovery,
          lastScheduledDate,
          lastCheckIn,
        };
      });

      const scheduledTodayItems = items.filter((i) => i.isScheduledToday);
      const unscheduledTodayItems = items.filter((i) => !i.isScheduledToday);

      const completedToday = fullToday + minimumToday;
      const pendingToday = Math.max(0, totalScheduledToday - (completedToday + skippedToday));

      const itemMap = new Map<string, HabitTodayItem>();
      for (const item of items) {
        itemMap.set(item.habit.id, item);
      }

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
          scheduledItems: groupItems.filter((i) => i.isScheduledToday),
          unscheduledItems: groupItems.filter((i) => !i.isScheduledToday),
        };
      });

      const unassignedItems = items.filter((item) => !assignedHabitIds.has(item.habit.id));
      const unassignedScheduledItems = unassignedItems.filter((i) => i.isScheduledToday);
      const unassignedUnscheduledItems = unassignedItems.filter((i) => !i.isScheduledToday);

      return ok({
        date: dateKey,
        items,
        scheduledTodayItems,
        unscheduledTodayItems,
        routineGroups,
        unassignedItems,
        unassignedScheduledItems,
        unassignedUnscheduledItems,
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
        nowIso,
      });
      if (!habitRes.ok) return habitRes;

      const saveRes = await habitRepository.createHabitWithRoutine(
        habitRes.value,
        input.routineId ?? null,
      );
      if (!saveRes.ok) return saveRes;

      return ok(habitRes.value);
    },

    async updateHabit(id: string, patch: UpdateHabitInput): Promise<Result<Habit>> {
      const existingRes = await habitRepository.getHabit(id);
      if (!existingRes.ok) return existingRes;
      if (!existingRes.value) {
        return err('habit_not_found', 'Habit not found.');
      }

      const nowIso = now().toISOString();

      const updatedRes = updateHabit(existingRes.value, patch, nowIso);
      if (!updatedRes.ok) return updatedRes;

      const saveRes = await habitRepository.updateHabitWithRoutine(
        existingRes.value,
        updatedRes.value,
        patch.routineId,
      );
      if (!saveRes.ok) return saveRes;

      return ok(updatedRes.value);
    },

    async archiveHabit(id: string): Promise<Result<Habit>> {
      const existingRes = await habitRepository.getHabit(id);
      if (!existingRes.ok) return existingRes;
      if (!existingRes.value) {
        return err('habit_not_found', 'Habit not found.');
      }

      const nowIso = now().toISOString();
      const archivedRes = archiveHabit(existingRes.value, nowIso);
      if (!archivedRes.ok) return archivedRes;
      const saveRes = await habitRepository.saveHabit(archivedRes.value);
      if (!saveRes.ok) return saveRes;

      return ok(archivedRes.value);
    },

    async unarchiveHabit(id: string): Promise<Result<Habit>> {
      const existingRes = await habitRepository.getHabit(id);
      if (!existingRes.ok) return existingRes;
      if (!existingRes.value) {
        return err('habit_not_found', 'Habit not found.');
      }

      const nowIso = now().toISOString();
      const unarchivedRes = unarchiveHabit(existingRes.value, nowIso);
      if (!unarchivedRes.ok) return unarchivedRes;
      const saveRes = await habitRepository.saveHabit(unarchivedRes.value);
      if (!saveRes.ok) return saveRes;

      return ok(unarchivedRes.value);
    },

    async recordCheckIn(input: RecordCheckInInput): Promise<Result<HabitCheckIn>> {
      const todayKey = toLocalDateKey(now());

      // 1. Reject future dates
      if (input.date > todayKey) {
        return err('future_check_in_not_allowed', 'Check-ins for future dates are not allowed.');
      }

      // 2. Reject unknown habit
      const habitRes = await habitRepository.getHabit(input.habitId);
      if (!habitRes.ok) return habitRes;
      if (!habitRes.value) {
        return err('habit_not_found', 'Habit not found.');
      }
      const habit = habitRes.value;

      // 3. Reject inactive / outside lifecycle habit
      if (!isHabitActiveOnDate(habit, input.date)) {
        return err('habit_inactive', `Habit is not active on ${input.date}.`);
      }

      // 4. Reject unscheduled dates
      if (!isHabitScheduledOnDate(habit, input.date)) {
        return err('habit_not_scheduled', `Habit is not scheduled on ${input.date}.`);
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
        return err('routine_not_found', 'Routine not found.');
      }

      const nowIso = now().toISOString();
      const updatedRes = updateRoutine(existingRes.value, patch, nowIso);
      if (!updatedRes.ok) return updatedRes;

      const saveRes = await habitRepository.saveRoutine(updatedRes.value);
      if (!saveRes.ok) return saveRes;

      return ok(updatedRes.value);
    },

    async reorderRoutine(id: string, habitIds: string[]): Promise<Result<void>> {
      return habitRepository.reorderRoutineHabits(id, habitIds);
    },

    async deleteRoutine(id: string): Promise<Result<void>> {
      return habitRepository.deleteRoutine(id);
    },
  };
}
