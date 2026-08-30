'use client';

import { Card } from '@/components/ui/Card';
import type { FocusService } from '@/features/focus/application/focus-service';
import { useFocusController } from '@/features/focus/hooks/useFocusController';
import { DistractionInbox } from './DistractionInbox';
import { FocusControls } from './FocusControls';
import { FocusTimer } from './FocusTimer';
import { SessionSummary } from './SessionSummary';
import { StartFocusForm } from './StartFocusForm';

export function FocusScreen({
  service,
  initialWorkItemId,
  initialTimeBlockId,
}: {
  service: FocusService;
  initialWorkItemId: string | null;
  initialTimeBlockId: string | null;
}) {
  const controller = useFocusController(service);

  if (controller.isLoading && !controller.view) {
    return <p className="p-6 text-sm text-slate-500">Loading focus…</p>;
  }

  if (!controller.view) {
    return (
      <p className="p-6 text-sm text-red-600 dark:text-red-400" role="alert">
        {controller.error ?? 'Unable to load focus.'}
      </p>
    );
  }

  const view = controller.view;
  const active = view.activeSession;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500">Execution evidence</p>
        <h1 className="text-2xl font-semibold tracking-tight">Focus Station</h1>
        <p className="text-sm text-slate-500">
          Scheduled time stays on Today. This page records what actually got focused attention.
        </p>
      </header>

      {controller.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {controller.error}
        </p>
      ) : null}

      {active ? (
        <Card title={view.workItem?.title ?? 'Open focus'}>
          <FocusTimer session={active} />
          <div className="mt-4 flex flex-col gap-4">
            <FocusControls
              session={active}
              onPause={() => controller.pauseSession(active.id)}
              onResume={() => controller.resumeSession(active.id)}
              onFinish={(extras) => controller.finishSession(active.id, extras)}
              onAbandon={() => controller.abandonSession(active.id)}
            />
            <DistractionInbox
              distractions={view.distractions}
              interruptionCount={view.interruptionCount}
              onCapture={(text) => controller.captureDistraction(active.id, text)}
            />
          </div>
        </Card>
      ) : (
        <Card title="Start a session">
          <StartFocusForm
            workItems={view.workItems}
            todayTimeBlocks={view.todayTimeBlocks}
            initialWorkItemId={initialWorkItemId}
            initialTimeBlockId={initialTimeBlockId}
            onStart={controller.startSession}
          />
        </Card>
      )}

      {!active && view.lastFinalizedSession ? (
        <SessionSummary
          session={view.lastFinalizedSession}
          interruptionCount={view.interruptionCount}
          distractions={view.distractions}
        />
      ) : null}
    </div>
  );
}
