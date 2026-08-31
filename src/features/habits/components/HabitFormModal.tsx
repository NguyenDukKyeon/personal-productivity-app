'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Habit } from '@/domain/habits/habit';
import type { HabitSchedule, WeekdayNumber } from '@/domain/habits/habit-schedule';
import type { Routine } from '@/domain/habits/routine';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CreateHabitInput, UpdateHabitInput } from '../application/habit-service';

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateHabitInput | UpdateHabitInput) => Promise<unknown>;
  editingHabit?: Habit | null;
  routines: Routine[];
}

const WEEKDAYS: Array<{ id: WeekdayNumber; label: string }> = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
];

export function HabitFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingHabit,
  routines,
}: HabitFormModalProps) {
  const [title, setTitle] = useState(editingHabit?.title ?? '');
  const [cue, setCue] = useState(editingHabit?.cue ?? '');
  const [minimumVersion, setMinimumVersion] = useState(editingHabit?.minimumVersion ?? '');
  const [description, setDescription] = useState(editingHabit?.description ?? '');
  const [scheduleKind, setScheduleKind] = useState<'daily' | 'weekdays'>(
    editingHabit?.schedule.kind ?? 'daily',
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<WeekdayNumber[]>(
    editingHabit?.schedule.kind === 'weekdays' ? editingHabit.schedule.weekdays : [1, 2, 3, 4, 5],
  );
  const [routineId, setRoutineId] = useState<string>(editingHabit?.routineId ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleWeekday = (day: WeekdayNumber) => {
    if (selectedWeekdays.includes(day)) {
      if (selectedWeekdays.length > 1) {
        setSelectedWeekdays(selectedWeekdays.filter((d) => d !== day));
      }
    } else {
      setSelectedWeekdays([...selectedWeekdays, day].sort((a, b) => a - b));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Habit title is required.');
      return;
    }
    if (!minimumVersion.trim()) {
      setErrorMessage('Minimum viable version is required.');
      return;
    }

    const schedule: HabitSchedule =
      scheduleKind === 'daily'
        ? { kind: 'daily' }
        : { kind: 'weekdays', weekdays: selectedWeekdays };

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: CreateHabitInput = {
      title: title.trim(),
      cue: cue.trim(),
      minimumVersion: minimumVersion.trim(),
      description: description.trim(),
      schedule,
      routineId: routineId ? routineId : null,
    };

    const res = await onSubmit(payload);
    setIsSubmitting(false);

    if (res && typeof res === 'object' && 'ok' in res && !(res as { ok: boolean }).ok) {
      setErrorMessage(
        (res as { message?: string }).message ?? 'Failed to save habit.',
      );
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#1e2538] dark:bg-[#11141d] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e2538]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {editingHabit ? 'Edit Habit' : 'Create Habit'}
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#1e2538] dark:hover:text-slate-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Input
            label="Habit Title"
            id="habit-title"
            placeholder="e.g. Read 20 minutes"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />

          <Input
            label="Cue / Context (When or where does this happen?)"
            id="habit-cue"
            placeholder="e.g. After breakfast, Right after school"
            value={cue}
            onChange={(e) => setCue(e.target.value)}
            maxLength={120}
          />

          <Input
            label="Minimum Viable Version (Low friction fallback)"
            id="habit-minimum"
            placeholder="e.g. Read 1 paragraph, 1 pushup"
            value={minimumVersion}
            onChange={(e) => setMinimumVersion(e.target.value)}
            required
            maxLength={160}
          />

          <div className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <label htmlFor="habit-description">Description (Optional)</label>
            <textarea
              id="habit-description"
              rows={2}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-900 outline-none ring-indigo-500 focus:border-indigo-400 focus:ring-2 dark:border-[#1e2538] dark:bg-[#161b26] dark:text-white"
              placeholder="Why this habit matters or extra instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Schedule Recurrence
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                <input
                  type="radio"
                  name="scheduleKind"
                  checked={scheduleKind === 'daily'}
                  onChange={() => setScheduleKind('daily')}
                />
                Daily (Every day)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                <input
                  type="radio"
                  name="scheduleKind"
                  checked={scheduleKind === 'weekdays'}
                  onChange={() => setScheduleKind('weekdays')}
                />
                Specific Weekdays
              </label>
            </div>

            {scheduleKind === 'weekdays' && (
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const selected = selectedWeekdays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWeekday(day.id)}
                      className={`h-8 w-11 rounded-lg text-xs font-semibold transition-colors ${
                        selected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#161b26] dark:text-slate-300'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Select
            label="Assign to Routine (Optional)"
            id="habit-routine"
            value={routineId}
            onChange={(e) => setRoutineId(e.target.value)}
          >
            <option value="">None (Stand-alone)</option>
            {routines.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.contextLabel ? `(${r.contextLabel})` : ''}
              </option>
            ))}
          </Select>

          <div className="mt-2 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#1e2538]">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {editingHabit ? 'Save Changes' : 'Save Habit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
