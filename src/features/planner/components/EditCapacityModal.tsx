import { useState } from 'react';
import type { Result } from '@/domain/shared/result';

interface EditCapacityModalProps {
  isOpen: boolean;
  date: string | null;
  initialCapacityMinutes: number;
  onClose: () => void;
  onSave: (date: string, capacityMinutes: number) => Promise<Result<unknown>>;
}

export function EditCapacityModal({
  isOpen,
  date,
  initialCapacityMinutes,
  onClose,
  onSave,
}: EditCapacityModalProps) {
  const [capacity, setCapacity] = useState(initialCapacityMinutes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !date) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await onSave(date, Number(capacity));
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
      aria-labelledby="capacity-modal-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-[#121620]">
        <h2 id="capacity-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
          Edit Daily Capacity ({date})
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Target available focus time for this day (in minutes, 0–960).
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
              htmlFor="daily-capacity"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Daily Capacity (Minutes)
            </label>
            <input
              id="daily-capacity"
              type="number"
              min={0}
              max={960}
              step={30}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Equivalent to {(capacity / 60).toFixed(1)} hours.
            </p>
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
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Capacity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
