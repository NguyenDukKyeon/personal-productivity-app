import type { PlannerScheduledBlock, PlannerView } from '@/domain/planner/planner-day';
import { toLocalDateKey } from '@/domain/shared/local-date';
import { PlannerDayCard } from './PlannerDayCard';

interface PlannerWeekProps {
  plannerView: PlannerView;
  onEditCapacity: (date: string, capacityMinutes: number) => void;
  onMoveBlock: (block: PlannerScheduledBlock) => void;
  onRemoveBlock: (timeBlockId: string) => void;
  onScheduleIntoDay: (date: string) => void;
}

export function PlannerWeek({
  plannerView,
  onEditCapacity,
  onMoveBlock,
  onRemoveBlock,
  onScheduleIntoDay,
}: PlannerWeekProps) {
  const todayKey = toLocalDateKey(new Date());

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {plannerView.days.map((day) => (
        <PlannerDayCard
          key={day.date}
          day={day}
          isToday={day.date === todayKey}
          onEditCapacity={onEditCapacity}
          onMoveBlock={onMoveBlock}
          onRemoveBlock={onRemoveBlock}
          onScheduleIntoDay={onScheduleIntoDay}
        />
      ))}
    </div>
  );
}
