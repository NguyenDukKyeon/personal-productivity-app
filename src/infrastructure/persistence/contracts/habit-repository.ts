import type { Habit } from '@/domain/habits/habit';
import type { HabitCheckIn } from '@/domain/habits/habit-check-in';
import type { Routine } from '@/domain/habits/routine';
import type { Result } from '@/domain/shared/result';

export interface HabitRepository {
  getHabit(id: string): Promise<Result<Habit | null>>;
  listHabits(includeArchived?: boolean): Promise<Result<Habit[]>>;
  saveHabit(habit: Habit): Promise<Result<void>>;

  getCheckIn(habitId: string, dateKey: string): Promise<Result<HabitCheckIn | null>>;
  listCheckInsForHabit(habitId: string): Promise<Result<HabitCheckIn[]>>;
  listCheckInsForDate(dateKey: string): Promise<Result<HabitCheckIn[]>>;
  listCheckInsInRange(startDateKey: string, endDateKey: string): Promise<Result<HabitCheckIn[]>>;
  saveCheckIn(checkIn: HabitCheckIn): Promise<Result<void>>;
  deleteCheckIn(habitId: string, dateKey: string): Promise<Result<void>>;

  getRoutine(id: string): Promise<Result<Routine | null>>;
  listRoutines(): Promise<Result<Routine[]>>;
  saveRoutine(routine: Routine): Promise<Result<void>>;
  deleteRoutine(id: string): Promise<Result<void>>;

  assignHabitToRoutine(habitId: string, routineId: string): Promise<Result<void>>;
  removeHabitFromRoutine(habitId: string): Promise<Result<void>>;
  reorderRoutineHabits(routineId: string, habitIds: string[]): Promise<Result<void>>;
}
