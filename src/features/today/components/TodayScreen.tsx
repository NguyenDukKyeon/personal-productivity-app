'use client';

import type { TodayService } from '@/features/today/application/today-service';
import { useTodayController } from '@/features/today/hooks/useTodayController';
import { CapacityPanel } from './CapacityPanel';
import { CommitmentPanel } from './CommitmentPanel';
import { PriorityList } from './PriorityList';
import { QuickCaptureForm } from './QuickCaptureForm';
import { TaskList } from './TaskList';
import { TimeBlockList } from './TimeBlockList';

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function TodayScreen({ service, date }: { service: TodayService; date: string }) {
  const controller = useTodayController(service, date);

  if (controller.isLoading && !controller.view) {
    return <p className="p-6 text-sm text-slate-500">Loading today…</p>;
  }

  if (!controller.view) {
    return (
      <p className="p-6 text-sm text-red-600 dark:text-red-400">
        {controller.error ?? 'Unable to load today.'}
      </p>
    );
  }

  const view = controller.view;
  const status = view.commitment
    ? view.divergence?.hasDivergence
      ? 'Committed with later edits'
      : 'Committed'
    : 'Not committed';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500">Today workstation</p>
        <h1 className="text-2xl font-semibold tracking-tight">{formatDateLabel(date)}</h1>
        <p className="text-sm text-slate-500">{status}</p>
      </header>

      {controller.error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {controller.error}
        </p>
      ) : null}

      <CapacityPanel view={view} onSave={controller.setDailyCapacity} />
      <QuickCaptureForm onCreate={controller.createTask} />
      <PriorityList view={view} onReorder={controller.setDailyPriorities} />
      <TaskList
        view={view}
        onAddPriority={(workItemId) =>
          controller.setDailyPriorities([...view.priorities.map((priority) => priority.item.id), workItemId])
        }
        onComplete={controller.completeTask}
        onReopen={controller.reopenTask}
      />
      <TimeBlockList
        view={view}
        onCreate={controller.createTimeBlock}
        onUpdate={controller.updateTimeBlock}
        onDelete={controller.deleteTimeBlock}
      />
      <CommitmentPanel view={view} onCommit={controller.commitToday} />
    </div>
  );
}
