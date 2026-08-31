import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Habit } from '@/domain/habits/habit';
import type { HabitCheckIn } from '@/domain/habits/habit-check-in';
import type { Routine } from '@/domain/habits/routine';
import { err, ok, type Result } from '@/domain/shared/result';
import type {
  HabitsViewModel,
  HabitService,
  HabitTodayItem,
} from './application/habit-service';
import { HabitsScreen } from './components/HabitsScreen';

const DATE = '2026-08-31';
const NOW = '2026-08-31T07:00:00.000Z';

function sampleHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h_read',
    title: 'Read English',
    description: 'Read novel',
    cue: 'After breakfast',
    minimumVersion: 'Read 1 paragraph',
    schedule: { kind: 'daily' },
    routineId: null,
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function sampleItem(overrides: Partial<HabitTodayItem> = {}): HabitTodayItem {
  return {
    habit: sampleHabit(),
    isScheduledToday: true,
    checkIn: null,
    isRecovery: false,
    lastScheduledDate: '2026-08-30',
    lastCheckIn: null,
    ...overrides,
  };
}

function sampleView(overrides: Partial<HabitsViewModel> = {}): HabitsViewModel {
  return {
    date: DATE,
    items: [sampleItem()],
    routineGroups: [],
    unassignedItems: [sampleItem()],
    archivedHabits: [],
    metricsSummary: {
      totalScheduledToday: 1,
      completedToday: 0,
      fullToday: 0,
      minimumToday: 0,
      skippedToday: 0,
      pendingToday: 1,
      inRecoveryToday: 0,
    },
    ...overrides,
  };
}

function createFakeService(overrides: Partial<HabitService> = {}): HabitService {
  let currentView = sampleView();
  return {
    getHabitsView: vi.fn(() => Promise.resolve(ok(currentView))),
    createHabit: vi.fn((input) => {
      const h = sampleHabit({ id: 'h_new', ...input });
      return Promise.resolve(ok(h));
    }),
    updateHabit: vi.fn((id, patch) => {
      const h = sampleHabit({ id, ...patch });
      return Promise.resolve(ok(h));
    }),
    archiveHabit: vi.fn((id) => Promise.resolve(ok(sampleHabit({ id, status: 'archived' })))),
    unarchiveHabit: vi.fn((id) => Promise.resolve(ok(sampleHabit({ id, status: 'active' })))),
    recordCheckIn: vi.fn((input) =>
      Promise.resolve(
        ok({
          id: `chk_${input.habitId}_${input.date}`,
          habitId: input.habitId,
          date: input.date,
          kind: input.kind,
          note: input.note ?? '',
          createdAt: NOW,
          updatedAt: NOW,
        }),
      ),
    ),
    clearCheckIn: vi.fn(() => Promise.resolve(ok(undefined))),
    getHabitHistory: vi.fn(() => Promise.resolve(ok([]))),
    createRoutine: vi.fn((input) =>
      Promise.resolve(
        ok({
          id: 'r_new',
          name: input.name,
          contextLabel: input.contextLabel ?? '',
          habitIds: input.habitIds ?? [],
          createdAt: NOW,
          updatedAt: NOW,
        }),
      ),
    ),
    updateRoutine: vi.fn((id, patch) =>
      Promise.resolve(
        ok({
          id,
          name: patch.name ?? 'Routine',
          contextLabel: patch.contextLabel ?? '',
          habitIds: patch.habitIds ?? [],
          createdAt: NOW,
          updatedAt: NOW,
        }),
      ),
    ),
    deleteRoutine: vi.fn(() => Promise.resolve(ok(undefined))),
    ...overrides,
  };
}

describe('HabitsScreen UI Component', () => {
  it('renders habits scheduled today with cue and minimum viable version', async () => {
    const service = createFakeService();
    render(<HabitsScreen service={service} initialDate={DATE} />);

    expect(await screen.findByText('Read English')).toBeDefined();
    expect(screen.getByText('📍 After breakfast')).toBeDefined();
    expect(screen.getByText(/Read 1 paragraph/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Full check-in for Read English/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Minimum check-in for Read English/i })).toBeDefined();
  });

  it('submits Full check-in when clicking Full button', async () => {
    const user = userEvent.setup();
    const service = createFakeService();
    render(<HabitsScreen service={service} initialDate={DATE} />);

    const fullBtn = await screen.findByRole('button', { name: /Full check-in for Read English/i });
    await user.click(fullBtn);

    expect(service.recordCheckIn).toHaveBeenCalledWith({
      habitId: 'h_read',
      date: DATE,
      kind: 'full',
      note: undefined,
    });
  });

  it('submits Minimum check-in when clicking Minimum button', async () => {
    const user = userEvent.setup();
    const service = createFakeService();
    render(<HabitsScreen service={service} initialDate={DATE} />);

    const minBtn = await screen.findByRole('button', { name: /Minimum check-in for Read English/i });
    await user.click(minBtn);

    expect(service.recordCheckIn).toHaveBeenCalledWith({
      habitId: 'h_read',
      date: DATE,
      kind: 'minimum',
      note: undefined,
    });
  });

  it('displays recovery message when habit is in recovery mode', async () => {
    const recoveryItem = sampleItem({
      isRecovery: true,
      lastScheduledDate: '2026-08-30',
    });
    const service = createFakeService({
      getHabitsView: vi.fn(() =>
        Promise.resolve(
          ok(
            sampleView({
              items: [recoveryItem],
              unassignedItems: [recoveryItem],
              metricsSummary: {
                totalScheduledToday: 1,
                completedToday: 0,
                fullToday: 0,
                minimumToday: 0,
                skippedToday: 0,
                pendingToday: 1,
                inRecoveryToday: 1,
              },
            }),
          ),
        ),
      ),
    });

    render(<HabitsScreen service={service} initialDate={DATE} />);

    expect(await screen.findByText(/Missed last occurrence on 2026-08-30/i)).toBeDefined();
  });

  it('opens Create Habit modal and submits new habit', async () => {
    const user = userEvent.setup();
    const service = createFakeService();
    render(<HabitsScreen service={service} initialDate={DATE} />);

    const newHabitBtn = await screen.findByRole('button', { name: /New Habit/i });
    await user.click(newHabitBtn);

    expect(await screen.findByRole('heading', { name: /Create Habit/i })).toBeDefined();

    await user.type(screen.getByLabelText(/Habit Title/i), 'Drink Water');
    await user.type(screen.getByLabelText(/Cue \/ Context/i), 'After waking up');
    await user.type(screen.getByLabelText(/Minimum Viable Version/i), '1 glass');

    const saveBtn = screen.getByRole('button', { name: /Save Habit/i });
    await user.click(saveBtn);

    expect(service.createHabit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Drink Water',
        cue: 'After waking up',
        minimumVersion: '1 glass',
        schedule: { kind: 'daily' },
      }),
    );
  });

  it('preserves form input when createHabit returns an error', async () => {
    const user = userEvent.setup();
    const service = createFakeService({
      createHabit: vi.fn(() => Promise.resolve(err('persistence_write_failed', 'Failed to save habit.'))),
    });

    render(<HabitsScreen service={service} initialDate={DATE} />);

    const newHabitBtn = await screen.findByRole('button', { name: /New Habit/i });
    await user.click(newHabitBtn);

    await user.type(screen.getByLabelText(/Habit Title/i), 'Workout');
    await user.type(screen.getByLabelText(/Minimum Viable Version/i), '5 pushups');

    const saveBtn = screen.getByRole('button', { name: /Save Habit/i });
    await user.click(saveBtn);

    // Form modal remains open and preserves entered text
    const errorElements = await screen.findAllByText('Failed to save habit.');
    expect(errorElements.length).toBeGreaterThanOrEqual(1);

    const titleInput = screen.getByLabelText(/Habit Title/i) as HTMLInputElement;
    const minInput = screen.getByLabelText(/Minimum Viable Version/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Workout');
    expect(minInput.value).toBe('5 pushups');
  });
});
