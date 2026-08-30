'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { TodayViewModel } from '@/features/today/application/today-service';

export function TaskList({
  view,
  onAddPriority,
  onComplete,
  onReopen,
}: {
  view: TodayViewModel;
  onAddPriority: (workItemId: string) => void;
  onComplete: (workItemId: string) => void;
  onReopen: (workItemId: string) => void;
}) {
  const top3Ids = new Set(view.priorities.map((priority) => priority.item.id));
  const top3Full = view.priorities.length >= 3;

  return (
    <Card title="Tasks">
      {view.workItems.length === 0 ? (
        <p className="text-sm text-slate-500">Capture the first task for today.</p>
      ) : (
        <ul className="space-y-2">
          {view.workItems.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-[#1e2538]"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-slate-500">
                  {item.estimatedMinutes} min · {item.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!top3Ids.has(item.id) ? (
                  <Button
                    variant="secondary"
                    disabled={top3Full}
                    onClick={() => onAddPriority(item.id)}
                  >
                    Add {item.title} to Top 3
                  </Button>
                ) : null}
                {item.status === 'completed' ? (
                  <Button variant="secondary" onClick={() => onReopen(item.id)}>
                    Reopen {item.title}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => onComplete(item.id)}>
                    Complete {item.title}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
