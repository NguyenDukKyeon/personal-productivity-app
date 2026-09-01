import { useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  ListTodo,
  Plus,
} from 'lucide-react';
import type { WorkItemPriority } from '@/domain/work-items/work-item';
import type { ProjectDetail as ProjectDetailData } from '../application/project-service';
import { MilestoneSection } from './MilestoneSection';
import { ProjectForecastCard } from './ProjectForecastCard';

interface ProjectDetailProps {
  detail: ProjectDetailData;
  onBack: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onComplete: () => void;
  onAddMilestone: (params: {
    projectId: string;
    title: string;
    targetDate?: string | null;
  }) => Promise<unknown>;
  onCompleteMilestone: (id: string) => Promise<unknown>;
  onCreateWorkItem: (params: {
    projectId: string;
    title: string;
    estimatedMinutes?: number;
    priority?: WorkItemPriority;
  }) => Promise<unknown>;
}

export function ProjectDetail({
  detail,
  onBack,
  onEdit,
  onArchive,
  onComplete,
  onAddMilestone,
  onCompleteMilestone,
  onCreateWorkItem,
}: ProjectDetailProps) {
  const { project, milestones, workItems, progress, forecast } = detail;

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskMinutes, setTaskMinutes] = useState('45');
  const [taskPriority, setTaskPriority] = useState<WorkItemPriority>('p2_high');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsSubmittingTask(true);
    await onCreateWorkItem({
      projectId: project.id,
      title: taskTitle.trim(),
      estimatedMinutes: Number(taskMinutes) || 30,
      priority: taskPriority,
    });
    setIsSubmittingTask(false);
    setTaskTitle('');
    setIsAddingTask(false);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>
          {project.status === 'active' && (
            <>
              <button
                type="button"
                onClick={onComplete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete Project
              </button>
              <button
                type="button"
                onClick={onArchive}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
            </>
          )}
        </div>
      </div>

      {/* Project Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-[#1e2538] dark:bg-[#121620]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                project.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : project.status === 'archived'
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
              }`}
            >
              {project.status.toUpperCase()}
            </span>
            {project.targetDate && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                Target: {project.targetDate}
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            {project.title}
          </h1>
          {project.description && (
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {project.description}
            </p>
          )}
        </div>

        {/* Progress counters */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#161b26]">
            <p className="text-[11px] font-medium text-slate-500">Tasks Completed</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {progress.completedWorkItems} / {progress.totalWorkItems}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#161b26]">
            <p className="text-[11px] font-medium text-slate-500">Remaining Estimate</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {progress.remainingEstimatedMinutes}m
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#161b26]">
            <p className="text-[11px] font-medium text-slate-500">Focused Actual</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {progress.actualFocusedMinutes}m
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-[#161b26]">
            <p className="text-[11px] font-medium text-slate-500">Scheduled Ahead</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {progress.scheduledMinutes}m
            </p>
          </div>
        </div>
      </div>

      {/* Forecast Card */}
      <ProjectForecastCard forecast={forecast} />

      {/* Milestones & Roadmap */}
      <MilestoneSection
        projectId={project.id}
        milestones={milestones}
        onAddMilestone={onAddMilestone}
        onCompleteMilestone={onCompleteMilestone}
      />

      {/* Work Items / Tasks under this project */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-[#1e2538] dark:bg-[#121620]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Project Tasks
            </h3>
            <p className="text-xs text-slate-500">
              Work items actionable in Backlog, Planner, and Today workstation.
            </p>
          </div>
          {!isAddingTask && (
            <button
              type="button"
              onClick={() => setIsAddingTask(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </button>
          )}
        </div>

        {isAddingTask && (
          <form
            onSubmit={handleAddTask}
            className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-[#161b26]"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                required
                maxLength={140}
                placeholder="Task title (e.g. Solve limit worksheet)"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:col-span-2"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={taskMinutes}
                  onChange={(e) => setTaskMinutes(e.target.value)}
                  placeholder="Minutes"
                  className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as WorkItemPriority)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="p1_urgent">P1 Urgent</option>
                  <option value="p2_high">P2 High</option>
                  <option value="p3_medium">P3 Medium</option>
                  <option value="p4_low">P4 Low</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="rounded-lg px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingTask}
                className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
              >
                Save Task
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {workItems.length === 0 ? (
            <p className="text-xs italic text-slate-400">
              No tasks created under this project yet.
            </p>
          ) : (
            workItems.map((item) => {
              const isDone = item.status === 'completed';
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-[#161b26]/50"
                >
                  <div className="flex items-center gap-3">
                    <ListTodo className="h-4 w-4 text-slate-400" />
                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          isDone
                            ? 'text-slate-400 line-through'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {item.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          Est: {item.estimatedMinutes}m · Act: {item.actualMinutes}m
                        </span>
                        <span>·</span>
                        <span className="font-bold uppercase">{item.priority.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isDone
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : item.status === 'scheduled'
                          ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
