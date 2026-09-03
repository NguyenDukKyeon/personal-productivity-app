import type { ProjectForecast } from '@/domain/planner/planner-forecast';

interface ProjectForecastCardProps {
  forecast: ProjectForecast;
}

export function ProjectForecastCard({ forecast }: ProjectForecastCardProps) {
  const getStatusBadge = () => {
    switch (forecast.status) {
      case 'on_track':
        return (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            On Track
          </span>
        );
      case 'at_risk':
        return (
          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
            At Risk
          </span>
        );
      case 'insufficient_data':
      default:
        return (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
            Insufficient Data
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-[#1e2538] dark:bg-[#121620]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Schedule Forecast
          </h3>
          <p className="text-xs text-slate-500">
            Deterministic simulation based on current planned capacity and estimates.
          </p>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#161b26]">
          <p className="text-[11px] font-medium text-slate-500">Remaining Work</p>
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {forecast.remainingEstimatedMinutes}m
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#161b26]">
          <p className="text-[11px] font-medium text-slate-500">Scheduled Ahead</p>
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {forecast.scheduledMinutesWithinHorizon}m
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#161b26]">
          <p className="text-[11px] font-medium text-slate-500">Unscheduled Est.</p>
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {forecast.unscheduledEstimatedMinutes}m
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#161b26]">
          <p className="text-[11px] font-medium text-slate-500">Projected Finish</p>
          <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">
            {forecast.projectedCompletionDate || '—'}
          </p>
        </div>
      </div>

      {forecast.riskReason && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="font-bold">Planning note:</span> {forecast.riskReason}
        </div>
      )}
    </div>
  );
}
