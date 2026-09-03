import { useState } from 'react';
import { CalendarPlus, Clock, Filter, ListTodo } from 'lucide-react';
import type { Project } from '@/domain/projects/project';
import type { WorkItem } from '@/domain/work-items/work-item';

interface PlannerBacklogProps {
  backlogItems: WorkItem[];
  projects: Project[];
  onScheduleItem: (item: WorkItem) => void;
}

export function PlannerBacklog({
  backlogItems,
  projects,
  onScheduleItem,
}: PlannerBacklogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const filteredItems = backlogItems.filter((item) => {
    if (selectedProjectId === 'all') return true;
    if (selectedProjectId === 'unassigned') return item.projectId === null;
    return item.projectId === selectedProjectId;
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-[#1e2538] dark:bg-[#121620]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Unscheduled Backlog
          </h3>
          <p className="text-xs text-slate-500">
            Work items waiting to be placed into your schedule.
          </p>
        </div>

        {/* Project Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All Projects</option>
            <option value="unassigned">Unassigned Tasks</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs italic text-slate-400">
              No unscheduled backlog items match the current filter.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const project = item.projectId ? projectMap.get(item.projectId) : null;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-slate-300 dark:border-slate-800 dark:bg-[#161b26] dark:hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <ListTodo className="h-4 w-4 text-slate-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      {project && (
                        <span className="rounded-md bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {project.title}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {item.estimatedMinutes}m est.
                      </span>
                      <span>·</span>
                      <span className="font-bold uppercase">
                        {item.priority.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onScheduleItem(item)}
                  aria-label={`Schedule ${item.title}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 shadow-2xs hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Schedule
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
