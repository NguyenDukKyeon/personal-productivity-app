import {
  AlertTriangle,
  Clock,
  Edit2,
  MoveRight,
  Plus,
  Trash2,
} from 'lucide-react';
import type { PlannerDay, PlannerScheduledBlock } from '@/domain/planner/planner-day';

interface PlannerDayCardProps {
  day: PlannerDay;
  isToday?: boolean;
  onEditCapacity: (date: string, capacityMinutes: number) => void;
  onMoveBlock: (block: PlannerScheduledBlock) => void;
  onRemoveBlock: (timeBlockId: string) => void;
  onScheduleIntoDay: (date: string) => void;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDayHeader(dateStr: string): { weekday: string; dateFormatted: string } {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
    const dateFormatted = dateObj.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    return { weekday, dateFormatted };
  } catch {
    return { weekday: '', dateFormatted: dateStr };
  }
}

export function PlannerDayCard({
  day,
  isToday = false,
  onEditCapacity,
  onMoveBlock,
  onRemoveBlock,
  onScheduleIntoDay,
}: PlannerDayCardProps) {
  const { weekday, dateFormatted } = formatDayHeader(day.date);

  const isOver = day.isOverCapacity ?? day.isOverbooked ?? false;
  const scheduledBlocks =
    day.scheduledBlocks ??
    day.timeBlocks?.map((b) => ({
      timeBlock: b,
      workItem: null,
      durationMinutes: b.endMinute - b.startMinute,
    })) ??
    [];

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white shadow-2xs transition dark:bg-[#121620] ${
        isToday
          ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 dark:border-indigo-500/60'
          : 'border-slate-200 dark:border-[#1e2538]'
      }`}
    >
      {/* Header */}
      <div className="border-b border-slate-100 p-3.5 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {weekday}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {dateFormatted}
              </span>
              {isToday && (
                <span className="rounded-full bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Today
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {day.scheduledMinutes}m / {day.capacityMinutes}m planned
            </p>
          </div>

          <button
            type="button"
            onClick={() => onEditCapacity(day.date, day.capacityMinutes)}
            aria-label={`Edit capacity for ${day.date}`}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Capacity Bar */}
        <div className="mt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                isOver
                  ? 'bg-rose-500'
                  : 'bg-indigo-600 dark:bg-indigo-500'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  day.capacityMinutes > 0
                    ? Math.round((day.scheduledMinutes / day.capacityMinutes) * 100)
                    : 0,
                )}%`,
              }}
            />
          </div>
          {isOver && (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-3 w-3" />
              Over planned capacity
            </p>
          )}
        </div>
      </div>

      {/* Scheduled TimeBlocks */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {scheduledBlocks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-6 text-center">
            <p className="text-[11px] italic text-slate-400">No scheduled blocks</p>
          </div>
        ) : (
          scheduledBlocks.map((block) => {
            const title = block.workItem?.title || 'Habit block';
            const startTimeStr = formatMinutes(block.timeBlock.startMinute);
            const endTimeStr = formatMinutes(block.timeBlock.endMinute);

            return (
              <div
                key={block.timeBlock.id}
                className="group relative rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 transition hover:border-slate-300 dark:border-slate-800 dark:bg-[#161b26] dark:hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {startTimeStr} – {endTimeStr} ({block.durationMinutes}m)
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onMoveBlock(block)}
                      aria-label={`Move ${title}`}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 hover:text-indigo-600 dark:hover:bg-slate-700"
                    >
                      <MoveRight className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBlock(block.timeBlock.id)}
                      aria-label={`Unschedule ${title}`}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 hover:text-rose-600 dark:hover:bg-slate-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Slot Button */}
      <div className="border-t border-slate-100 p-2 text-center dark:border-slate-800">
        <button
          type="button"
          onClick={() => onScheduleIntoDay(day.date)}
          className="inline-flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Plus className="h-3 w-3" />
          Schedule Work
        </button>
      </div>
    </div>
  );
}
