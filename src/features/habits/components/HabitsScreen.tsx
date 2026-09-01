'use client';

import { useState } from 'react';
import {
  Archive,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { Habit } from '@/domain/habits/habit';
import { parseLocalDateKey, toLocalDateKey } from '@/domain/shared/local-date';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type {
  CreateHabitInput,
  HabitService,
  UpdateHabitInput,
} from '../application/habit-service';
import { useHabitController } from '../hooks/useHabitController';
import { HabitFormModal } from './HabitFormModal';
import { HabitHistoryModal } from './HabitHistoryModal';
import { HabitTodayCard } from './HabitTodayCard';
import { RoutineSection } from './RoutineSection';

interface HabitsScreenProps {
  service: HabitService;
  initialDate: string;
}

function shiftDay(dateKey: string, offset: number): string {
  const parts = parseLocalDateKey(dateKey);
  if (!parts) return dateKey;
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset));
  return toLocalDateKey(new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
}

export function HabitsScreen({ service, initialDate }: HabitsScreenProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const controller = useHabitController(service, currentDate);

  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [routineContext, setRoutineContext] = useState('');

  const [historyHabit, setHistoryHabit] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const view = controller.view;
  const allRoutines = view?.routineGroups.map((g) => g.routine) ?? [];

  const handleSaveHabit = async (data: CreateHabitInput | UpdateHabitInput) => {
    if (editingHabit) {
      return controller.updateHabit(editingHabit.id, data);
    }
    return controller.createHabit(data as CreateHabitInput);
  };

  const handleCreateRoutineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName.trim()) return;
    const res = await controller.createRoutine({
      name: routineName.trim(),
      contextLabel: routineContext.trim(),
    });
    if (res.ok) {
      setIsRoutineModalOpen(false);
      setRoutineName('');
      setRoutineContext('');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Habits & Routines
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Build consistency with low-friction targets and quick recovery.
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-9 w-9 p-0"
            onClick={() => setCurrentDate(shiftDay(currentDate, -1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs dark:border-[#1e2538] dark:bg-[#11141d] dark:text-white">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {currentDate}
          </div>

          <Button
            variant="secondary"
            className="h-9 w-9 p-0"
            onClick={() => setCurrentDate(shiftDay(currentDate, 1))}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            className="text-xs text-slate-500"
            onClick={() => setCurrentDate(initialDate)}
          >
            Today
          </Button>
        </div>
      </header>

      {/* Error Alert */}
      {controller.error && (
        <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {controller.error}
        </div>
      )}

      {/* Summary Cards */}
      {view && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-[#1e2538] dark:bg-[#11141d]">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Scheduled Today</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {view.metricsSummary.totalScheduledToday}
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-[#1e2538] dark:bg-[#11141d]">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Completed (Full / Min)</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {view.metricsSummary.completedToday} ({view.metricsSummary.fullToday}/{view.metricsSummary.minimumToday})
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-[#1e2538] dark:bg-[#11141d]">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending</span>
            <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
              {view.metricsSummary.pendingToday}
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-[#1e2538] dark:bg-[#11141d]">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">In Recovery</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {view.metricsSummary.inRecoveryToday}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="text-xs px-3 py-2"
            onClick={() => {
              setEditingHabit(null);
              setIsHabitModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New Habit
          </Button>

          <Button
            variant="secondary"
            className="text-xs px-3 py-2"
            onClick={() => setIsRoutineModalOpen(true)}
          >
            <Layers className="h-4 w-4" /> New Routine
          </Button>
        </div>

        {view && view.archivedHabits.length > 0 && (
          <Button
            variant="ghost"
            className="text-xs text-slate-500"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? 'Hide' : 'Show'} Archived ({view.archivedHabits.length})
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      {controller.isLoading && !view ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading habits and routines...</div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Routine Groups */}
          {view?.routineGroups.map((group) => (
            <RoutineSection
              key={group.routine.id}
              routine={group.routine}
              items={group.items}
              onCheckIn={(habitId, kind, note) =>
                controller.recordCheckIn({ habitId, kind, note })
              }
              onClearCheckIn={(habitId) => controller.clearCheckIn(habitId)}
              onEditHabit={(habit) => {
                setEditingHabit(habit);
                setIsHabitModalOpen(true);
              }}
              onArchiveHabit={(habitId) => controller.archiveHabit(habitId)}
              onViewHistory={(habit) => setHistoryHabit(habit)}
              onDeleteRoutine={(routineId) => controller.deleteRoutine(routineId)}
              onReorderRoutine={(routineId, habitIds) => controller.reorderRoutine(routineId, habitIds)}
            />
          ))}

          {/* Stand-alone / Unassigned Habits */}
          {view && view.unassignedItems.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {view.routineGroups.length > 0 ? 'Individual Habits' : "Today's Habits"}
              </h2>

              <div className="flex flex-col gap-3">
                {view.unassignedItems.map((item) => (
                  <HabitTodayCard
                    key={item.habit.id}
                    item={item}
                    onCheckIn={(habitId, kind, note) =>
                      controller.recordCheckIn({ habitId, kind, note })
                    }
                    onClearCheckIn={(habitId) => controller.clearCheckIn(habitId)}
                    onEdit={(habit) => {
                      setEditingHabit(habit);
                      setIsHabitModalOpen(true);
                    }}
                    onArchive={(habitId) => controller.archiveHabit(habitId)}
                    onViewHistory={(habit) => setHistoryHabit(habit)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {view && view.items.length === 0 && (
            <Card className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-8 w-8 text-indigo-400 mb-2" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No active habits yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Start small. Define a habit with a clear cue and a minimum viable version that takes less than 2 minutes.
              </p>
              <Button
                variant="primary"
                className="mt-4 text-xs"
                onClick={() => {
                  setEditingHabit(null);
                  setIsHabitModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Create Your First Habit
              </Button>
            </Card>
          )}

          {/* Archived Habits Section */}
          {showArchived && view && view.archivedHabits.length > 0 && (
            <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 p-4 dark:border-[#1e2538]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Archived Habits
              </h2>
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-[#1e2538]">
                {view.archivedHabits.map((habit) => (
                  <div key={habit.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {habit.title}
                      </span>
                      <span className="ml-2 text-slate-400">
                        (Min: {habit.minimumVersion})
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      className="text-xs px-2.5 py-1"
                      onClick={() => controller.unarchiveHabit(habit.id)}
                    >
                      <RotateCcw className="h-3 w-3" /> Unarchive
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Habit Create/Edit Modal */}
      <HabitFormModal
        key={isHabitModalOpen ? editingHabit?.id ?? 'create' : 'closed'}
        isOpen={isHabitModalOpen}
        onClose={() => {
          setIsHabitModalOpen(false);
          setEditingHabit(null);
        }}
        onSubmit={handleSaveHabit}
        editingHabit={editingHabit}
        routines={allRoutines}
      />

      {/* Routine Create Modal */}
      {isRoutineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-sm flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#1e2538] dark:bg-[#11141d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Create Routine</h2>
            <form onSubmit={handleCreateRoutineSubmit} className="mt-4 flex flex-col gap-3">
              <Input
                label="Routine Name"
                placeholder="e.g. Morning Startup, Night Reset"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                required
                maxLength={60}
              />
              <Input
                label="Context Label (Optional)"
                placeholder="e.g. 07:00 Wakeup, 21:00 Bedtime"
                value={routineContext}
                onChange={(e) => setRoutineContext(e.target.value)}
                maxLength={60}
              />
              <div className="mt-2 flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#1e2538]">
                <Button
                  variant="ghost"
                  onClick={() => setIsRoutineModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Routine
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      <HabitHistoryModal
        isOpen={historyHabit !== null}
        onClose={() => setHistoryHabit(null)}
        habit={historyHabit}
        onGetHistory={(habitId) => controller.getHabitHistory(habitId)}
      />
    </div>
  );
}
