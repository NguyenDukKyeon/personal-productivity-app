import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Habit } from '@/domain/habits/habit';
import { err, ok } from '@/domain/shared/result';
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
    scheduleRevisions: [
      {
        effectiveFromDate: '2026-08-31',
        schedule: { kind: 'daily' },
      },
    ],
    activeIntervals: [
      {
        startDate: '2026-08-31',
        endDate: null,
      },
    ],
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function sampleItem(overrides: Partial<HabitTodayItem> = {}): HabitTodayItem {
  return {
    habit: sampleHabit(),
    routineId: null,
    routineName: null,
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
    scheduledTodayItems: [sampleItem()],
    unscheduledTodayItems: [],
    routineGroups: [],
    unassignedItems: [sampleItem()],
    unassignedScheduledItems: [sampleItem()],
    unassignedUnscheduledItems: [],
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
  const currentView = sampleView();
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
    reorderRoutine: vi.fn(() => Promise.resolve(ok(undefined))),
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

  it('displays recovery message when habit is in recovery mode on scheduled day', async () => {
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

  it('5. FIX HABIT FORM: reload -> click Edit existing Habit shows persisted values; switching from Habit A to B shows Habit B', async () => {
    const user = userEvent.setup();
    const habitA = sampleHabit({
      id: 'h_a',
      title: 'Habit A Math',
      cue: '10am',
      minimumVersion: '1 integral',
    });
    const habitB = sampleHabit({
      id: 'h_b',
      title: 'Habit B English',
      cue: '8pm',
      minimumVersion: '1 page',
    });

    const itemA = sampleItem({ habit: habitA });
    const itemB = sampleItem({ habit: habitB });

    const service = createFakeService({
      getHabitsView: vi.fn(() =>
        Promise.resolve(
          ok(
            sampleView({
              items: [itemA, itemB],
              unassignedItems: [itemA, itemB],
            }),
          ),
        ),
      ),
    });

    render(<HabitsScreen service={service} initialDate={DATE} />);

    // Click options menu on Habit A
    const optionsButtons = await screen.findAllByRole('button', { name: /Habit options/i });
    await user.click(optionsButtons[0]);

    // Click Edit Habit
    const editButtons = await screen.findAllByRole('button', { name: /Edit Habit/i });
    await user.click(editButtons[0]);

    expect(await screen.findByRole('heading', { name: /Edit Habit/i })).toBeDefined();
    const titleInput = screen.getByLabelText(/Habit Title/i) as HTMLInputElement;
    const cueInput = screen.getByLabelText(/Cue \/ Context/i) as HTMLInputElement;
    const minInput = screen.getByLabelText(/Minimum Viable Version/i) as HTMLInputElement;

    expect(titleInput.value).toBe('Habit A Math');
    expect(cueInput.value).toBe('10am');
    expect(minInput.value).toBe('1 integral');

    // Close modal
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);

    // Open options menu on Habit B
    const optionsButtonsAfter = await screen.findAllByRole('button', { name: /Habit options/i });
    await user.click(optionsButtonsAfter[1]);

    const editButtonsB = await screen.findAllByRole('button', { name: /Edit Habit/i });
    await user.click(editButtonsB[0]);

    // Fields show Habit B, NEVER Habit A
    const titleInputB = screen.getByLabelText(/Habit Title/i) as HTMLInputElement;
    const cueInputB = screen.getByLabelText(/Cue \/ Context/i) as HTMLInputElement;
    const minInputB = screen.getByLabelText(/Minimum Viable Version/i) as HTMLInputElement;

    expect(titleInputB.value).toBe('Habit B English');
    expect(cueInputB.value).toBe('8pm');
    expect(minInputB.value).toBe('1 page');
  });

  it('5. FIX SKIP INPUT: keeps typed reason on persistence failure, clears and closes on success', async () => {
    const user = userEvent.setup();
    let failCheckIn = true;
    const service = createFakeService({
      recordCheckIn: vi.fn(() => {
        if (failCheckIn) {
          return Promise.resolve(err('persistence_write_failed', 'Failed to record check-in.'));
        }
        return Promise.resolve(
          ok({
            id: 'chk_1',
            habitId: 'h_read',
            date: DATE,
            kind: 'skipped' as const,
            note: 'Traveling',
            createdAt: NOW,
            updatedAt: NOW,
          }),
        );
      }),
    });

    render(<HabitsScreen service={service} initialDate={DATE} />);

    const skipBtn = await screen.findByRole('button', { name: /Skip/i });
    await user.click(skipBtn);

    const skipInput = screen.getByPlaceholderText(/Optional skip reason/i) as HTMLInputElement;
    await user.type(skipInput, 'Traveling');

    const confirmBtn = screen.getByRole('button', { name: /Confirm Skip/i });
    await user.click(confirmBtn);

    // On failure: skip input remains visible with typed text preserved
    expect(screen.getByPlaceholderText(/Optional skip reason/i)).toBeDefined();
    expect(skipInput.value).toBe('Traveling');

    // Now succeed:
    failCheckIn = false;
    await user.click(confirmBtn);

    // On success: skip input closes
    expect(screen.queryByPlaceholderText(/Optional skip reason/i)).toBeNull();
  });

  it('3. FIX TODAY / CHECK-IN ELIGIBILITY: does not present unscheduled habit with Today check-in execution buttons', async () => {
    const unscheduledItem = sampleItem({
      isScheduledToday: false,
    });
    const service = createFakeService({
      getHabitsView: vi.fn(() =>
        Promise.resolve(
          ok(
            sampleView({
              items: [unscheduledItem],
              scheduledTodayItems: [],
              unscheduledTodayItems: [unscheduledItem],
              unassignedItems: [unscheduledItem],
            }),
          ),
        ),
      ),
    });

    render(<HabitsScreen service={service} initialDate={DATE} />);

    expect(await screen.findByText('Not scheduled today')).toBeDefined();
    // Full/Minimum/Skip checkin buttons must NOT be present
    expect(screen.queryByRole('button', { name: /Full check-in/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Minimum check-in/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Skip$/i })).toBeNull();
  });
});
