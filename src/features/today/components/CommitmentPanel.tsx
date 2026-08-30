'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { TodayViewModel } from '@/features/today/application/today-service';

function formatCommittedAt(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function CommitmentPanel({
  view,
  onCommit,
}: {
  view: TodayViewModel;
  onCommit: () => void;
}) {
  return (
    <Card title="Commitment">
      {view.commitment ? (
        <p className="text-sm font-medium">Committed at {formatCommittedAt(view.commitment.committedAt)}</p>
      ) : (
        <Button onClick={onCommit}>Commit Today</Button>
      )}
      {view.divergence?.hasDivergence ? (
        <div className="mt-3 space-y-1 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-300">Plan changed after commitment</p>
          {view.divergence.capacityChanged ? <p>Capacity changed</p> : null}
          {view.divergence.prioritiesChanged ? <p>Priorities changed</p> : null}
          {view.divergence.timeBlocksChanged ? <p>Schedule changed</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
