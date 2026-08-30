'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { TodayViewModel } from '@/features/today/application/today-service';

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function TimeBlockList({
  view,
  onCreate,
  onUpdate,
  onDelete,
}: {
  view: TodayViewModel;
  onCreate: (input: { workItemId: string; startMinute: number; endMinute: number }) => void;
  onUpdate: (id: string, patch: { startMinute: number; endMinute: number }) => void;
  onDelete: (id: string) => void;
}) {
  const itemsById = useMemo(
    () => new Map(view.workItems.map((item) => [item.id, item])),
    [view.workItems],
  );
  const defaultTaskId = view.workItems[0]?.id ?? '';
  const [workItemId, setWorkItemId] = useState(defaultTaskId);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [edits, setEdits] = useState<Record<string, { start: string; end: string }>>({});

  const selectedWorkItemId = view.workItems.some((item) => item.id === workItemId)
    ? workItemId
    : defaultTaskId;

  return (
    <Card title="Time blocks">
      <form
        className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_8rem_8rem_auto] md:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (!selectedWorkItemId) return;
          onCreate({
            workItemId: selectedWorkItemId,
            startMinute: timeToMinutes(start),
            endMinute: timeToMinutes(end),
          });
        }}
      >
        <Select
          label="Time block task"
          value={selectedWorkItemId}
          onChange={(event) => setWorkItemId(event.target.value)}
        >
          {view.workItems.length === 0 ? <option value="">No tasks yet</option> : null}
          {view.workItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </Select>
        <Input
          label="Time block start"
          type="time"
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
        <Input
          label="Time block end"
          type="time"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
        />
        <Button type="submit" disabled={!selectedWorkItemId}>
          Add time block
        </Button>
      </form>

      {view.overlapPairs.length > 0 ? (
        <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">
          Overlapping blocks are allowed, but they compete for the same time.
        </p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {view.timeBlocks.map((block) => {
          const item = block.workItemId ? itemsById.get(block.workItemId) : undefined;
          if (block.workItemId && !item) {
            return null;
          }
          const title = item?.title;
          if (!title) {
            return null;
          }
          const edit = edits[block.id] ?? {
            start: minutesToTime(block.startMinute),
            end: minutesToTime(block.endMinute),
          };
          return (
            <li
              key={block.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-[#1e2538]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {title}{' '}
                  <span className="text-slate-500">
                    {minutesToTime(block.startMinute)}–{minutesToTime(block.endMinute)}
                  </span>
                </p>
                <Button variant="danger" onClick={() => onDelete(block.id)}>
                  Delete time block {title}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_8rem_auto] sm:items-end">
                <Input
                  label={`Start for ${title}`}
                  type="time"
                  value={edit.start}
                  onChange={(event) =>
                    setEdits((current) => ({
                      ...current,
                      [block.id]: { ...edit, start: event.target.value },
                    }))
                  }
                />
                <Input
                  label={`End for ${title}`}
                  type="time"
                  value={edit.end}
                  onChange={(event) =>
                    setEdits((current) => ({
                      ...current,
                      [block.id]: { ...edit, end: event.target.value },
                    }))
                  }
                />
                <Button
                  variant="secondary"
                  onClick={() =>
                    onUpdate(block.id, {
                      startMinute: timeToMinutes(edit.start),
                      endMinute: timeToMinutes(edit.end),
                    })
                  }
                >
                  Edit time block {title}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
