import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Project } from '@/domain/projects/project';
import { err, ok } from '@/domain/shared/result';
import type { ProjectDetail, ProjectService } from './application/project-service';
import { ProjectsScreen } from './components/ProjectsScreen';

const sampleProject: Project = {
  id: 'proj-1',
  title: 'Grade 11 Chemistry',
  description: 'First semester coursework',
  status: 'active',
  targetDate: '2026-10-15',
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
  completedAt: null,
};

const sampleDetail: ProjectDetail = {
  project: sampleProject,
  milestones: [
    {
      id: 'ms-1',
      projectId: 'proj-1',
      title: 'Chapter 1: Atomic Theory',
      targetDate: '2026-09-15',
      order: 0,
      status: 'active',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
      completedAt: null,
    },
  ],
  workItems: [
    {
      id: 'w-1',
      projectId: 'proj-1',
      title: 'Read section 1.1',
      notes: '',
      type: 'task',
      estimatedMinutes: 60,
      actualMinutes: 0,
      priority: 'p1_urgent',
      status: 'backlog',
      completedAt: null,
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
  ],
  progress: {
    projectId: 'proj-1',
    totalWorkItems: 1,
    completedWorkItems: 0,
    completionRate: 0,
    remainingEstimatedMinutes: 60,
    actualFocusedMinutes: 0,
    scheduledMinutes: 0,
    unscheduledEstimatedMinutes: 60,
  },
  forecast: {
    projectId: 'proj-1',
    totalWorkItems: 1,
    completedWorkItems: 0,
    remainingEstimatedMinutes: 60,
    scheduledMinutesWithinHorizon: 0,
    unscheduledEstimatedMinutes: 60,
    projectedCompletionDate: '2026-09-01',
    targetDate: '2026-10-15',
    status: 'on_track',
  },
};

function createMockService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    listProjects: vi.fn().mockResolvedValue(ok([sampleProject])),
    getProject: vi.fn().mockResolvedValue(ok(sampleProject)),
    createProject: vi.fn().mockResolvedValue(ok(sampleProject)),
    updateProject: vi.fn().mockResolvedValue(ok(sampleProject)),
    completeProject: vi.fn().mockResolvedValue(ok({ ...sampleProject, status: 'completed' })),
    archiveProject: vi.fn().mockResolvedValue(ok({ ...sampleProject, status: 'archived' })),
    unarchiveProject: vi.fn().mockResolvedValue(ok({ ...sampleProject, status: 'active' })),
    getProjectDetail: vi.fn().mockResolvedValue(ok(sampleDetail)),
    createMilestone: vi.fn().mockResolvedValue(ok(sampleDetail.milestones[0])),
    updateMilestone: vi.fn().mockResolvedValue(ok(sampleDetail.milestones[0])),
    completeMilestone: vi.fn().mockResolvedValue(ok({ ...sampleDetail.milestones[0], status: 'completed' })),
    reorderMilestones: vi.fn().mockResolvedValue(ok(sampleDetail.milestones)),
    deleteMilestone: vi.fn().mockResolvedValue(ok(undefined)),
    createWorkItemForProject: vi.fn().mockResolvedValue(ok(sampleDetail.workItems[0])),
    assignWorkItemToProject: vi.fn().mockResolvedValue(ok(sampleDetail.workItems[0])),
    removeWorkItemFromProject: vi.fn().mockResolvedValue(ok({ ...sampleDetail.workItems[0], projectId: null })),
    ...overrides,
  } as unknown as ProjectService;
}

describe('ProjectsScreen UI', () => {
  it('renders project list and header', async () => {
    const service = createMockService();
    render(<ProjectsScreen service={service} />);

    expect(await screen.findByText('Projects & Roadmaps')).toBeDefined();
    expect(await screen.findByText('Grade 11 Chemistry')).toBeDefined();
    expect(screen.getByText('First semester coursework')).toBeDefined();
  });

  it('opens new project modal, enters title, and saves project', async () => {
    const user = userEvent.setup();
    const service = createMockService({
      createProject: vi.fn().mockResolvedValue(
        ok({
          id: 'proj-2',
          title: 'Physics Mechanics',
          description: 'Newtonian physics',
          status: 'active',
          targetDate: '2026-11-01',
          createdAt: '2026-09-01T08:00:00.000Z',
          updatedAt: '2026-09-01T08:00:00.000Z',
          completedAt: null,
        }),
      ),
    });

    render(<ProjectsScreen service={service} />);

    const newBtn = await screen.findByRole('button', { name: /new project/i });
    await user.click(newBtn);

    const titleInput = screen.getByLabelText(/project title/i) as HTMLInputElement;
    await user.type(titleInput, 'Physics Mechanics');

    const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    await user.type(descInput, 'Newtonian physics');

    const targetDateInput = screen.getByLabelText(/target date/i) as HTMLInputElement;
    await user.type(targetDateInput, '2026-11-01');

    const submitBtn = screen.getByRole('button', { name: /create project/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(service.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Physics Mechanics',
          description: 'Newtonian physics',
          targetDate: '2026-11-01',
        }),
      );
    });
  });

  it('preserves form input values when project creation fails', async () => {
    const user = userEvent.setup();
    const service = createMockService({
      createProject: vi.fn().mockResolvedValue(err('persistence_write_failed', 'Failed to save project')),
    });

    render(<ProjectsScreen service={service} />);

    const newBtn = await screen.findByRole('button', { name: /new project/i });
    await user.click(newBtn);

    const titleInput = screen.getByLabelText(/project title/i) as HTMLInputElement;
    await user.type(titleInput, 'Failed Project');

    const submitBtn = screen.getByRole('button', { name: /create project/i });
    await user.click(submitBtn);

    const errorAlerts = await screen.findAllByText(/failed to save project/i);
    expect(errorAlerts.length).toBeGreaterThanOrEqual(1);
    expect(titleInput.value).toBe('Failed Project');
  });

  it('opens project detail view and displays milestones and forecast card', async () => {
    const user = userEvent.setup();
    const service = createMockService();

    render(<ProjectsScreen service={service} />);

    const card = await screen.findByText('Grade 11 Chemistry');
    await user.click(card);

    expect(await screen.findByText(/Chapter 1: Atomic Theory/)).toBeDefined();
    expect(await screen.findByText(/Read section 1.1/)).toBeDefined();
    expect(await screen.findByText(/on track/i)).toBeDefined();
  });

  it('allows adding a new milestone inside project detail', async () => {
    const user = userEvent.setup();
    const service = createMockService();

    render(<ProjectsScreen service={service} />);

    const card = await screen.findByText('Grade 11 Chemistry');
    await user.click(card);

    const addMsBtn = await screen.findByRole('button', { name: /add milestone/i });
    await user.click(addMsBtn);

    const titleInput = screen.getByPlaceholderText(/milestone title/i);
    await user.type(titleInput, 'Chapter 2: Chemical Bonds');

    const saveBtn = screen.getByRole('button', { name: /save milestone/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(service.createMilestone).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          title: 'Chapter 2: Chemical Bonds',
        }),
      );
    });
  });

  it('allows switching between Active and Archived tabs', async () => {
    const user = userEvent.setup();
    const service = createMockService({
      listProjects: vi.fn().mockImplementation((includeArchived) => {
        if (includeArchived) {
          return Promise.resolve(
            ok([
              sampleProject,
              {
                id: 'proj-arch',
                title: 'Old History Project',
                description: '',
                status: 'archived',
                targetDate: null,
                createdAt: '2026-08-01T08:00:00.000Z',
                updatedAt: '2026-08-15T08:00:00.000Z',
                completedAt: null,
              },
            ]),
          );
        }
        return Promise.resolve(ok([sampleProject]));
      }),
    });

    render(<ProjectsScreen service={service} />);

    expect(await screen.findByText('Grade 11 Chemistry')).toBeDefined();

    const archivedTab = screen.getByRole('tab', { name: /archived/i });
    await user.click(archivedTab);

    expect(await screen.findByText('Old History Project')).toBeDefined();
  });
});
