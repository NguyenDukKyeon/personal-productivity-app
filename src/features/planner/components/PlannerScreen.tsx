'use client';

import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import type { PlannerService } from '../application/planner-service';
import { usePlannerController } from '../hooks/usePlannerController';
import { EditCapacityModal } from './EditCapacityModal';
import { MoveTimeBlockModal } from './MoveTimeBlockModal';
import { PlannerBacklog } from './PlannerBacklog';
import { PlannerWeek } from './PlannerWeek';
import { ScheduleWorkItemModal } from './ScheduleWorkItemModal';

interface PlannerScreenProps {
  service: PlannerService;
  initialDate?: string;
}

export function PlannerScreen({ service, initialDate }: PlannerScreenProps) {
  const {
    startDate,
    plannerView,
    projects,
    isLoading,
    error,
    editingCapacityDate,
    setEditingCapacityDate,
    currentCapacityMinutes,
    setCurrentCapacityMinutes,
    schedulingWorkItem,
    setSchedulingWorkItem,
    defaultScheduleDate,
    setDefaultScheduleDate,
    movingScheduledBlock,
    setMovingScheduledBlock,
    handlePreviousWeek,
    handleNextWeek,
    handleToday,
    handleSetCapacity,
    handleScheduleWorkItem,
    handleMoveTimeBlock,
    handleRemoveTimeBlock,
    loadPlanner,
  } = usePlannerController(service, initialDate);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Flexible Planner
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Multi-day rolling schedule with dynamic capacity and overlap protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={handlePreviousWeek}
              aria-label="Previous week"
              className="rounded-l-xl p-1.5 text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Week of {startDate}
            </span>
            <button
              type="button"
              onClick={handleNextWeek}
              aria-label="Next week"
              className="rounded-r-xl p-1.5 text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={loadPlanner}
            aria-label="Refresh planner"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
        >
          {error}
        </div>
      )}

      {/* Main Content */}
      {isLoading && !plannerView ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading planner view...</div>
      ) : plannerView ? (
        <div className="space-y-6">
          <PlannerWeek
            plannerView={plannerView}
            onEditCapacity={(date, cap) => {
              setCurrentCapacityMinutes(cap);
              setEditingCapacityDate(date);
            }}
            onMoveBlock={(block) => setMovingScheduledBlock(block)}
            onRemoveBlock={(id) => handleRemoveTimeBlock(id)}
            onScheduleIntoDay={(date) => {
              setDefaultScheduleDate(date);
              if (plannerView.backlogItems.length > 0) {
                setSchedulingWorkItem(plannerView.backlogItems[0]);
              }
            }}
          />

          <PlannerBacklog
            backlogItems={plannerView.backlogItems}
            projects={projects}
            onScheduleItem={(item) => {
              setDefaultScheduleDate(startDate);
              setSchedulingWorkItem(item);
            }}
          />
        </div>
      ) : null}

      {/* Modals */}
      <EditCapacityModal
        isOpen={Boolean(editingCapacityDate)}
        date={editingCapacityDate}
        initialCapacityMinutes={currentCapacityMinutes}
        onClose={() => setEditingCapacityDate(null)}
        onSave={(date, cap) => handleSetCapacity(date, cap)}
      />

      <ScheduleWorkItemModal
        isOpen={Boolean(schedulingWorkItem)}
        workItem={schedulingWorkItem}
        defaultDate={defaultScheduleDate}
        onClose={() => setSchedulingWorkItem(null)}
        onSchedule={handleScheduleWorkItem}
      />

      <MoveTimeBlockModal
        isOpen={Boolean(movingScheduledBlock)}
        scheduledBlock={movingScheduledBlock}
        onClose={() => setMovingScheduledBlock(null)}
        onMove={handleMoveTimeBlock}
      />
    </div>
  );
}
