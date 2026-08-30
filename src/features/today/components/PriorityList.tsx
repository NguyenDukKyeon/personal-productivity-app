'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { TodayViewModel } from '@/features/today/application/today-service';

export function PriorityList({
  view,
  onReorder,
}: {
  view: TodayViewModel;
  onReorder: (workItemIds: string[]) => void;
}) {
  const ids = view.priorities.map((priority) => priority.item.id);

  return (
    <Card title="Top 3">
      {view.priorities.length === 0 ? (
        <p className="text-sm text-slate-500">Choose up to three priorities from the task list.</p>
      ) : (
        <ol className="space-y-2">
          {view.priorities.map((priority, index) => (
            <li
              key={priority.item.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-[#1e2538]"
            >
              <div>
                <span className="mr-2 text-xs font-bold uppercase tracking-widest text-indigo-500">
                  Rank {priority.rank}
                </span>
                <span className="font-medium">{priority.item.title}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...ids];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    onReorder(next);
                  }}
                >
                  Move {priority.item.title} up
                </Button>
                <Button
                  variant="secondary"
                  disabled={index === ids.length - 1}
                  onClick={() => {
                    const next = [...ids];
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                    onReorder(next);
                  }}
                >
                  Move {priority.item.title} down
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => onReorder(ids.filter((id) => id !== priority.item.id))}
                >
                  Remove {priority.item.title} from Top 3
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
