import { beforeEach, describe, expect, it } from 'vitest';
import type { Habit } from '@/domain/habits/habit';
import type { HabitCheckIn } from '@/domain/habits/habit-check-in';
import type { Routine } from '@/domain/habits/routine';
import { ok, type Result } from '@/domain/shared/result';
import type { HabitRepository } from '@/infrastructure/persistence/contracts/habit-repository';
import { createHabitService, type HabitService } from './habit-service';

class InMemoryHabitRepository implements HabitRepository {
  habits = new Map<string, Habit>();
  checkIns = new Map<string, HabitCheckIn>(); // key: habitId#date
  routines = new Map<string, Routine>();

  async getHabit(id: string): Promise<Result<Habit | null>> {
    return ok(this.habits.get(id) ?? null);
  }

  async listHabits(includeArchived = false): Promise<Result<Habit[]>> {
    const list = Array.from(this.habits.values());
    if (includeArchived) return ok(list);
    return ok(list.filter((h) => h.status === 'active'));
  }

  async saveHabit(habit: Habit): Promise<Result<void>> {
    this.habits.set(habit.id, habit);
    return ok(undefined);
  }

  async getCheckIn(habitId: string, dateKey: string): Promise<Result<HabitCheckIn | null>> {
    return ok(this.checkIns.get(`${habitId}#${dateKey}`) ?? null);
  }

  async listCheckInsForHabit(habitId: string): Promise<Result<HabitCheckIn[]>> {
    const list = Array.from(this.checkIns.values()).filter((c) => c.habitId === habitId);
    return ok(list);
  }

  async listCheckInsForDate(dateKey: string): Promise<Result<HabitCheckIn[]>> {
    const list = Array.from(this.checkIns.values()).filter((c) => c.date === dateKey);
    return ok(list);
  }

  async listCheckInsInRange(startDateKey: string, endDateKey: string): Promise<Result<HabitCheckIn[]>> {
    const list = Array.from(this.checkIns.values()).filter(
      (c) => c.date >= startDateKey && c.date <= endDateKey,
    );
    return ok(list);
  }

  async saveCheckIn(checkIn: HabitCheckIn): Promise<Result<void>> {
    this.checkIns.set(`${checkIn.habitId}#${checkIn.date}`, checkIn);
    return ok(undefined);
  }

  async deleteCheckIn(habitId: string, dateKey: string): Promise<Result<void>> {
    this.checkIns.delete(`${habitId}#${dateKey}`);
    return ok(undefined);
  }

  async getRoutine(id: string): Promise<Result<Routine | null>> {
    return ok(this.routines.get(id) ?? null);
  }

  async listRoutines(): Promise<Result<Routine[]>> {
    return ok(Array.from(this.routines.values()));
  }

  async saveRoutine(routine: Routine): Promise<Result<void>> {
    this.routines.set(routine.id, routine);
    return ok(undefined);
  }

  async deleteRoutine(id: string): Promise<Result<void>> {
    this.routines.delete(id);
    return ok(undefined);
  }
}

describe('HabitService application service', () => {
  let repo: InMemoryHabitRepository;
  let service: HabitService;
  let fixedNow: Date;

  beforeEach(() => {
    repo = new InMemoryHabitRepository();
    fixedNow = new Date('2026-08-31T07:00:00.000Z');
    let idCounter = 1;
    service = createHabitService({
      habitRepository: repo,
      now: () => fixedNow,
      newId: () => `id_${idCounter++}`,
    });
  });

  it('creates habit and retrieves it in getHabitsView for today', async () => {
    const habitRes = await service.createHabit({
      title: 'Read English',
      cue: 'After breakfast',
      minimumVersion: 'Read 1 paragraph',
      schedule: { kind: 'daily' },
    });

    expect(habitRes.ok).toBe(true);
    if (!habitRes.ok) return;

    const viewRes = await service.getHabitsView('2026-08-31');
    expect(viewRes.ok).toBe(true);
    if (!viewRes.ok) return;

    expect(viewRes.value.items.length).toBe(1);
    expect(viewRes.value.items[0].habit.title).toBe('Read English');
    expect(viewRes.value.items[0].isScheduledToday).toBe(true);
    expect(viewRes.value.items[0].checkIn).toBe(null);
    expect(viewRes.value.metricsSummary.totalScheduledToday).toBe(1);
    expect(viewRes.value.metricsSummary.pendingToday).toBe(1);
  });

  it('records Full and Minimum check-ins and updates summary metrics truthfully', async () => {
    const h1 = await service.createHabit({
      title: 'Math',
      minimumVersion: '1 problem',
      schedule: { kind: 'daily' },
    });
    const h2 = await service.createHabit({
      title: 'English',
      minimumVersion: '1 page',
      schedule: { kind: 'daily' },
    });
    if (!h1.ok || !h2.ok) throw new Error('Habit creation failed');

    // Full checkin for Math
    const check1 = await service.recordCheckIn({
      habitId: h1.value.id,
      date: '2026-08-31',
      kind: 'full',
    });
    expect(check1.ok).toBe(true);

    // Minimum checkin for English
    const check2 = await service.recordCheckIn({
      habitId: h2.value.id,
      date: '2026-08-31',
      kind: 'minimum',
    });
    expect(check2.ok).toBe(true);

    const viewRes = await service.getHabitsView('2026-08-31');
    expect(viewRes.ok).toBe(true);
    if (!viewRes.ok) return;

    expect(viewRes.value.metricsSummary.completedToday).toBe(2);
    expect(viewRes.value.metricsSummary.fullToday).toBe(1);
    expect(viewRes.value.metricsSummary.minimumToday).toBe(1);
    expect(viewRes.value.metricsSummary.pendingToday).toBe(0);
  });

  it('detects recovery state when a scheduled habit was missed on the previous scheduled day', async () => {
    const h1 = await service.createHabit({
      title: 'Workout',
      minimumVersion: '5 pushups',
      schedule: { kind: 'daily' },
    });
    if (!h1.ok) throw new Error('Create failed');

    // Day 2026-08-30 had NO check-in recorded.
    // When viewing 2026-08-31:
    const viewRes = await service.getHabitsView('2026-08-31');
    expect(viewRes.ok).toBe(true);
    if (!viewRes.ok) return;

    const item = viewRes.value.items.find((i) => i.habit.id === h1.value.id);
    expect(item).toBeDefined();
    expect(item?.isRecovery).toBe(true);
    expect(item?.lastScheduledDate).toBe('2026-08-30');
    expect(viewRes.value.metricsSummary.inRecoveryToday).toBe(1);
  });

  it('groups habits by routines and preserves unassigned habits', async () => {
    const routineRes = await service.createRoutine({
      name: 'Morning Routine',
      contextLabel: '07:30',
    });
    if (!routineRes.ok) throw new Error('Routine create failed');

    const h1 = await service.createHabit({
      title: 'Hydrate',
      minimumVersion: '1 glass',
      schedule: { kind: 'daily' },
      routineId: routineRes.value.id,
    });
    const h2 = await service.createHabit({
      title: 'Read Book',
      minimumVersion: '1 page',
      schedule: { kind: 'daily' },
    });
    if (!h1.ok || !h2.ok) throw new Error('Habit create failed');

    const viewRes = await service.getHabitsView('2026-08-31');
    expect(viewRes.ok).toBe(true);
    if (!viewRes.ok) return;

    expect(viewRes.value.routineGroups.length).toBe(1);
    expect(viewRes.value.routineGroups[0].routine.name).toBe('Morning Routine');
    expect(viewRes.value.routineGroups[0].items.length).toBe(1);
    expect(viewRes.value.routineGroups[0].items[0].habit.id).toBe(h1.value.id);

    expect(viewRes.value.unassignedItems.length).toBe(1);
    expect(viewRes.value.unassignedItems[0].habit.id).toBe(h2.value.id);
  });

  it('soft archives a habit so it disappears from active view but retains history', async () => {
    const h = await service.createHabit({
      title: 'Meditation',
      minimumVersion: '1 breath',
      schedule: { kind: 'daily' },
    });
    if (!h.ok) throw new Error('Create failed');

    await service.recordCheckIn({
      habitId: h.value.id,
      date: '2026-08-30',
      kind: 'full',
    });

    const archiveRes = await service.archiveHabit(h.value.id);
    expect(archiveRes.ok).toBe(true);

    const viewRes = await service.getHabitsView('2026-08-31');
    expect(viewRes.ok).toBe(true);
    if (!viewRes.ok) return;

    // Excluded from active items
    expect(viewRes.value.items.length).toBe(0);
    // Preserved in archivedHabits
    expect(viewRes.value.archivedHabits.length).toBe(1);
    expect(viewRes.value.archivedHabits[0].id).toBe(h.value.id);

    // History is still queryable
    const historyRes = await service.getHabitHistory(h.value.id);
    expect(historyRes.ok).toBe(true);
    if (historyRes.ok) {
      expect(historyRes.value.length).toBe(1);
      expect(historyRes.value[0].kind).toBe('full');
    }
  });
});
