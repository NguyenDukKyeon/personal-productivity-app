import { useEffect, useState } from 'react';
import type { Result } from '@/domain/shared/result';
import type { WorkItem } from '@/domain/work-items/work-item';

interface ScheduleWorkItemModalProps {
  isOpen: boolean;
  workItem: WorkItem | null;
  defaultDate: string;
  onClose: () => void;
  onSchedule: (params: {
    workItemId: string;
    date: string;
    startMinute: number;
    endMinute: number;
  }) => Promise<Result<unknown>>;
}

function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function ScheduleWorkItemModal({
  isOpen,
  workItem,
  defaultDate,
  onClose,
  onSchedule,
}: ScheduleWorkItemModalProps) {
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (workItem) {
      setDate(defaultDate);
      setStartTime('09:00');
      const duration = workItem.estimatedMinutes || 60;
      setEndTime(minutesToTimeString(540 + duration)); // 540 = 09:00
      setErrorMessage(null);
    }
  }, [workItem, defaultDate]);

  if (!isOpen || !workItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startMinute = timeStringToMinutes(startTime);
    const endMinute = timeStringToMinutes(endTime);

    if (endMinute <= startMinute) {
      setErrorMessage('End time must be after start time.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await onSchedule({
      workItemId: workItem.id,
      date,
      startMinute,
      endMinute,
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
      aria-labelledby="schedule-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#121620]">
        <h2 id="schedule-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
          Schedule Work Item
        </h2>
        <p className="mt-1 text-xs text-slate-500 line-clamp-1 font-semibold">
          {workItem.title} ({workItem.estimatedMinutes}m estimated)
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="schedule-date"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Date
            </label>
            <input
              id="schedule-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="schedule-start-time"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Start Time
              </label>
              <input
                id="schedule-start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="schedule-end-time"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                End Time
              </label>
              <input
                id="schedule-end-time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
