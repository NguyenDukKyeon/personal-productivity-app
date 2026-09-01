import { useEffect, useState } from 'react';
import type { Project } from '@/domain/projects/project';
import type { Result } from '@/domain/shared/result';

interface ProjectFormModalProps {
  isOpen: boolean;
  project?: Project | null;
  onClose: () => void;
  onSubmit: (params: {
    title: string;
    description?: string;
    targetDate?: string | null;
  }) => Promise<Result<unknown>>;
}

export function ProjectFormModal({
  isOpen,
  project,
  onClose,
  onSubmit,
}: ProjectFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setDescription(project.description || '');
      setTargetDate(project.targetDate || '');
    } else {
      setTitle('');
      setDescription('');
      setTargetDate('');
    }
    setErrorMessage(null);
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Project title is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      targetDate: targetDate.trim() || null,
    });

    setIsSubmitting(false);
    if (!res.ok) {
      setErrorMessage(res.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-[#121620]">
        <h2 id="project-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
          {project ? 'Edit Project' : 'New Project'}
        </h2>

        {errorMessage && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="project-title"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Project Title
            </label>
            <input
              id="project-title"
              type="text"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grade 11 Chemistry Semester 1"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="project-desc"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Description
            </label>
            <textarea
              id="project-desc"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outcomes, goals, or important context..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="project-target-date"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Target Date (Optional)
            </label>
            <input
              id="project-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : project
                  ? 'Update Project'
                  : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
