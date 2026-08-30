'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { TodayViewModel } from '@/features/today/application/today-service';

export function CapacityPanel({
  view,
  onSave,
}: {
  view: TodayViewModel;
  onSave: (minutes: number) => void;
}) {
  const [minutes, setMinutes] = useState(String(view.plan.capacityMinutes));

  useEffect(() => {
    setMinutes(String(view.plan.capacityMinutes));
  }, [view.plan.capacityMinutes]);

  return (
    <Card title="Capacity">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(Number(minutes));
        }}
      >
        <Input
          label="Daily capacity minutes"
          type="number"
          min={0}
          max={960}
          step={30}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
        />
        <Button type="submit">Save capacity</Button>
      </form>
      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-[#161b26]">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Available</dt>
          <dd className="font-semibold">Available {view.plan.capacityMinutes} min</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-[#161b26]">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Scheduled</dt>
          <dd className="font-semibold">Scheduled {view.scheduledMinutes} min</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-[#161b26]">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Remaining</dt>
          <dd className="font-semibold">Remaining {view.remainingMinutes} min</dd>
        </div>
      </dl>
      {view.isOverbooked ? (
        <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          Overbooked by {Math.abs(view.remainingMinutes)} min
        </p>
      ) : null}
      {view.showHighCapacityCaution ? (
        <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">
          High capacity: protect sleep, meals and recovery.
        </p>
      ) : null}
    </Card>
  );
}
