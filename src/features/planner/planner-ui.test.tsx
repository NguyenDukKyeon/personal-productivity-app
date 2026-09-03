import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type {
  PlannerDayView,
  PlannerScheduledBlock,
  PlannerView,
} from '@/domain/planner/planner-day';
import type { Project } from '@/domain/projects/project';
import { ok } from '@/domain/shared/result';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import type { PlannerService } from './application/planner-service';
import { PlannerScreen } from './components/PlannerScreen';

const sampleProject: Project = {
  id: 'proj-1',
  title: 'Calculus 101',
  description: '',
  status: 'active',
  targetDate: '2026-10-01',
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
  completedAt: null,
};

const sampleTimeBlock: TimeBlock = {
  id: 'tb-1',
  date: '2026-09-01',
  workItemId: 'w-1',
  habitId: null,
  startMinute: 480,
  endMinute: 540,
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
};

const sampleWorkItem: WorkItem = {
  id: 'w-1',
  projectId: 'proj-1',
  title: 'Limits homework',
  notes: '',
  type: 'task',
  estimatedMinutes: 60,
  actualMinutes: 0,
  priority: 'p1_urgent',
  status: 'scheduled',
  completedAt: null,
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
};

function createSampleDay(params: {
  date: string;
  dayOfWeek: string;
  scheduledMinutes?: number;
  scheduledBlocks?: PlannerScheduledBlock[];
}): PlannerDayView {
  const scheduledBlocks = params.scheduledBlocks ?? [];
  const scheduledMinutes = params.scheduledMinutes ?? 0;
  const capacityMinutes = 480;
  const remainingMinutes = Math.max(0, capacityMinutes - scheduledMinutes);
  return {
    date: params.date,
    dayOfWeek: params.dayOfWeek,
    capacityMinutes,
    hasExplicitCapacity: false,
    scheduledMinutes,
    remainingMinutes,
    overbookedMinutes: 0,
    isOverbooked: false,
    freeCapacityMinutes: remainingMinutes,
    isOverCapacity: false,
    dailyPlan: null,
    timeBlocks: scheduledBlocks.map((b) => b.timeBlock),
    scheduledBlocks,
  };
}

const sampleView: PlannerView = {
  startDate: '2026-09-01',
  daysCount: 7,
  days: [
    createSampleDay({
      date: '2026-09-01',
      dayOfWeek: 'Tue',
      scheduledMinutes: 60,
      scheduledBlocks: [
        {
          timeBlock: sampleTimeBlock,
          workItem: sampleWorkItem,
          durationMinutes: 60,
        },
      ],
    }),
    createSampleDay({ date: '2026-09-02', dayOfWeek: 'Wed' }),
    createSampleDay({ date: '2026-09-03', dayOfWeek: 'Thu' }),
    createSampleDay({ date: '2026-09-04', dayOfWeek: 'Fri' }),
    createSampleDay({ date: '2026-09-05', dayOfWeek: 'Sat' }),
    createSampleDay({ date: '2026-09-06', dayOfWeek: 'Sun' }),
    createSampleDay({ date: '2026-09-07', dayOfWeek: 'Mon' }),
  ],
  backlogItems: [
    {
      id: 'w-backlog-1',
      projectId: 'proj-1',
      title: 'Derivatives practice',
      notes: '',
      type: 'task',
      estimatedMinutes: 90,
      actualMinutes: 0,
      priority: 'p2_high',
      status: 'backlog',
      completedAt: null,
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
  ],
};

function createMockService(overrides: Partial<PlannerService> = {}): PlannerService {
  return {
    getPlannerView: vi.fn().mockResolvedValue(ok(sampleView)),
    listProjects: vi.fn().mockResolvedValue(ok([sampleProject])),
    scheduleWorkItem: vi.fn().mockResolvedValue(ok(sampleTimeBlock)),
    moveTimeBlock: vi.fn().mockResolvedValue(ok(sampleTimeBlock)),
    removeTimeBlock: vi.fn().mockResolvedValue(ok(undefined)),
    setDayCapacity: vi.fn().mockResolvedValue(
      ok({
        id: 'dp-1',
        date: '2026-09-01',
        capacityMinutes: 360,
        morningIntention: '',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      }),
    ),
    ...overrides,
  } as unknown as PlannerService;
}

describe('PlannerScreen UI', () => {
  it('renders 7 days columns and backlog item', async () => {
    const service = createMockService();
    render(<PlannerScreen service={service} initialDate="2026-09-01" />);

    expect(await screen.findByText('Flexible Planner')).toBeDefined();
    expect(await screen.findByText(/Limits homework/)).toBeDefined();
    expect(await screen.findByText(/Derivatives practice/)).toBeDefined();
  });

  it('opens edit capacity modal and saves new capacity', async () => {
    const user = userEvent.setup();
    const service = createMockService();

    render(<PlannerScreen service={service} initialDate="2026-09-01" />);

    const editCapBtns = await screen.findAllByRole('button', { name: /edit capacity/i });
    await user.click(editCapBtns[0]);

    const capInput = screen.getByLabelText(/^daily capacity/i);
    await user.clear(capInput);
    await user.type(capInput, '360');

    const saveBtn = screen.getByRole('button', { name: /save capacity/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(service.setDayCapacity).toHaveBeenCalledWith('2026-09-01', 360, '');
    });
  });

  it('opens schedule work item modal from backlog and schedules item', async () => {
    const user = userEvent.setup();
    const service = createMockService();

    render(<PlannerScreen service={service} initialDate="2026-09-01" />);

    const scheduleBtn = await screen.findByRole('button', { name: /schedule derivatives practice/i });
    await user.click(scheduleBtn);

    const startInput = screen.getByLabelText(/start time/i);
    await user.clear(startInput);
    await user.type(startInput, '09:00');

    const endInput = screen.getByLabelText(/end time/i);
    await user.clear(endInput);
    await user.type(endInput, '10:30');

    const submitBtn = screen.getByRole('button', { name: /confirm schedule/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(service.scheduleWorkItem).toHaveBeenCalledWith(
        expect.objectContaining({
          workItemId: 'w-backlog-1',
          startMinute: 540,
          endMinute: 630,
        }),
      );
    });
  });

  it('opens move time block modal and moves block to target date', async () => {
    const user = userEvent.setup();
    const service = createMockService();

    render(<PlannerScreen service={service} initialDate="2026-09-01" />);

    const moveBtn = await screen.findByRole('button', { name: /move limits homework/i });
    await user.click(moveBtn);

    const dateInput = screen.getByLabelText(/target date/i);
    await user.clear(dateInput);
    await user.type(dateInput, '2026-09-02');

    const submitBtn = screen.getByRole('button', { name: /confirm move/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(service.moveTimeBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          timeBlockId: 'tb-1',
          targetDate: '2026-09-02',
        }),
      );
    });
  });

  it('deletes time block and calls removeTimeBlock', async () => {
    const user = userEvent.setup();
    const service = createMockService();

    render(<PlannerScreen service={service} initialDate="2026-09-01" />);

    const deleteBtn = await screen.findByRole('button', { name: /unschedule limits homework/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(service.removeTimeBlock).toHaveBeenCalledWith('tb-1');
    });
  });
});
