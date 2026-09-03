import { useState } from 'react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import type { ProjectMilestone } from '@/domain/projects/project-milestone';

interface MilestoneSectionProps {
  projectId: string;
  milestones: ProjectMilestone[];
  onAddMilestone: (params: {
    projectId: string;
    title: string;
    targetDate?: string | null;
  }) => Promise<unknown>;
  onCompleteMilestone: (id: string) => Promise<unknown>;
}

export function MilestoneSection({
  projectId,
  milestones,
  onAddMilestone,
  onCompleteMilestone,
}: MilestoneSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    await onAddMilestone({
      projectId,
      title: title.trim(),
      targetDate: targetDate.trim() || null,
    });
    setIsSubmitting(false);
    setTitle('');
    setTargetDate('');
    setIsAdding(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-[#1e2538] dark:bg-[#121620]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Milestones & Roadmap
          </h3>
          <p className="text-xs text-slate-500">
            Key checkpoints and deliverables for this project.
          </p>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Milestone
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-[#161b26]">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              maxLength={140}
              placeholder="Milestone title (e.g. Unit 1: Atomic Structure)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-lg px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              Save Milestone
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {milestones.length === 0 ? (
          <p className="text-xs italic text-slate-400">
            No milestones added yet. Add a milestone to organize your roadmap.
          </p>
        ) : (
          milestones.map((ms, index) => {
            const isDone = ms.status === 'completed';
            return (
              <div
                key={ms.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-[#161b26]/50"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => !isDone && onCompleteMilestone(ms.id)}
                    disabled={isDone}
                    aria-label={`Mark milestone ${ms.title} as ${isDone ? 'completed' : 'complete'}`}
                    className="text-slate-400 transition hover:text-emerald-600 disabled:cursor-default"
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        isDone
                          ? 'text-slate-400 line-through'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {index + 1}. {ms.title}
                    </p>
                    {ms.targetDate && (
                      <p className="text-[10px] text-slate-400">
                        Target: {ms.targetDate}
                      </p>
                    )}
                  </div>
                </div>

                {isDone && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    Done
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
