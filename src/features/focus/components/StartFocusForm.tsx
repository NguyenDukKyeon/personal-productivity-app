'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { FocusMode } from '@/domain/focus/focus-session';
import type { Result } from '@/domain/shared/result';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import type { StartSessionInput } from '@/features/focus/application/focus-service';

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function StartFocusForm({
  workItems,
  todayTimeBlocks,
  initialWorkItemId,
  initialTimeBlockId,
  onStart,
}: {
  workItems: WorkItem[];
  todayTimeBlocks: TimeBlock[];
  initialWorkItemId: string | null;
  initialTimeBlockId: string | null;
  onStart: (input: StartSessionInput) => Promise<Result<unknown>>;
}) {
  const [workItemId, setWorkItemId] = useState(initialWorkItemId ?? '');
  const [timeBlockId, setTimeBlockId] = useState(initialTimeBlockId ?? '');
  const [mode, setMode] = useState<FocusMode>('countdown');
  const [plannedMinutes, setPlannedMinutes] = useState('50');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const blocksForTask = useMemo(
    () =>
      todayTimeBlocks
        .filter((block) => (workItemId ? block.workItemId === workItemId : false))
        .sort((a, b) => a.startMinute - b.startMinute),
    [todayTimeBlocks, workItemId],
  );

  const selectedTimeBlockId = blocksForTask.some((block) => block.id === timeBlockId) ? timeBlockId : '';

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
          await onStart({
            workItemId: workItemId || null,
            timeBlockId: selectedTimeBlockId || null,
            mode,
            plannedDurationMinutes: mode === 'countdown' ? Number(plannedMinutes) : null,
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <Select label="Focus task" value={workItemId} onChange={(event) => setWorkItemId(event.target.value)}>
        <option value="">No task</option>
        {workItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </Select>
      <Select
        label="Time block"
        value={selectedTimeBlockId}
        onChange={(event) => setTimeBlockId(event.target.value)}
      >
        <option value="">No time block</option>
        {blocksForTask.map((block) => (
          <option key={block.id} value={block.id}>
            {minutesToTime(block.startMinute)}–{minutesToTime(block.endMinute)}
          </option>
        ))}
      </Select>
      <Select label="Focus mode" value={mode} onChange={(event) => setMode(event.target.value as FocusMode)}>
        <option value="countdown">Countdown</option>
        <option value="flow">Flow</option>
      </Select>
      {mode === 'countdown' ? (
        <Input
          label="Planned minutes"
          type="number"
          min={1}
          step={1}
          value={plannedMinutes}
          onChange={(event) => setPlannedMinutes(event.target.value)}
        />
      ) : (
        <p className="self-end text-sm text-slate-500">Open-ended focus. Remaining time is hidden.</p>
      )}
      <div className="md:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          Start focus
        </Button>
      </div>
    </form>
  );
}
