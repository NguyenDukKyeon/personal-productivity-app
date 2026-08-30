'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Result } from '@/domain/shared/result';
import type { WorkItem, WorkItemPriority } from '@/domain/work-items/work-item';

export function QuickCaptureForm({
  onCreate,
}: {
  onCreate: (input: {
    title: string;
    estimatedMinutes: number;
    priority: WorkItemPriority;
  }) => Promise<Result<WorkItem>>;
}) {
  const [title, setTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('60');
  const [priority, setPriority] = useState<WorkItemPriority>('p2_high');
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Card title="Quick capture">
      <form
        className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_8rem_11rem_auto] md:items-end"
        onSubmit={async (event) => {
          event.preventDefault();
          if (isSubmitting) return;
          setIsSubmitting(true);
          try {
            const result = await onCreate({
              title,
              estimatedMinutes: Number(estimatedMinutes),
              priority,
            });
            if (result.ok) {
              setTitle('');
            }
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <Input
          label="Task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to get done?"
        />
        <Input
          label="Estimated minutes"
          type="number"
          min={1}
          step={1}
          value={estimatedMinutes}
          onChange={(event) => setEstimatedMinutes(event.target.value)}
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as WorkItemPriority)}
        >
          <option value="p1_urgent">Urgent</option>
          <option value="p2_high">High</option>
          <option value="p3_medium">Medium</option>
          <option value="p4_low">Low</option>
        </Select>
        <Button type="submit" disabled={isSubmitting}>
          Add task
        </Button>
      </form>
    </Card>
  );
}
