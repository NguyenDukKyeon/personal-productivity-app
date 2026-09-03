import { useCallback, useEffect, useState } from 'react';
import type { PlannerScheduledBlock, PlannerView } from '@/domain/planner/planner-day';
import type { Project } from '@/domain/projects/project';
import { shiftLocalDateKey, toLocalDateKey } from '@/domain/shared/local-date';
import type { WorkItem } from '@/domain/work-items/work-item';
import type { PlannerService } from '../application/planner-service';

export function usePlannerController(service: PlannerService, initialDate?: string) {
  const [startDate, setStartDate] = useState(
    initialDate ?? toLocalDateKey(new Date()),
  );
  const [plannerView, setPlannerView] = useState<PlannerView | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [editingCapacityDate, setEditingCapacityDate] = useState<string | null>(null);
  const [currentCapacityMinutes, setCurrentCapacityMinutes] = useState<number>(480);

  const [schedulingWorkItem, setSchedulingWorkItem] = useState<WorkItem | null>(null);
  const [defaultScheduleDate, setDefaultScheduleDate] = useState<string>(startDate);

  const [movingScheduledBlock, setMovingScheduledBlock] = useState<PlannerScheduledBlock | null>(null);

  const loadPlanner = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [viewRes, projRes] = await Promise.all([
      service.getPlannerView(startDate, 7),
      service.listProjects(),
    ]);

    if (!viewRes.ok) {
      setError(viewRes.message);
      setIsLoading(false);
      return;
    }

    setPlannerView(viewRes.value);
    if (projRes.ok) {
      setProjects(projRes.value);
    }
    setIsLoading(false);
  }, [service, startDate]);

  useEffect(() => {
    loadPlanner();
  }, [loadPlanner]);

  const handlePreviousWeek = () => {
    const prev = shiftLocalDateKey(startDate, -7);
    if (prev) setStartDate(prev);
  };

  const handleNextWeek = () => {
    const next = shiftLocalDateKey(startDate, 7);
    if (next) setStartDate(next);
  };

  const handleToday = () => {
    setStartDate(toLocalDateKey(new Date()));
  };

  const handleSetCapacity = async (date: string, capacityMinutes: number, intention = '') => {
    setError(null);
    const res = await service.setDayCapacity(date, capacityMinutes, intention);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    await loadPlanner();
    setEditingCapacityDate(null);
    return res;
  };

  const handleScheduleWorkItem = async (params: {
    workItemId: string;
    date: string;
    startMinute: number;
    endMinute: number;
  }) => {
    setError(null);
    const res = await service.scheduleWorkItem(params);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    await loadPlanner();
    setSchedulingWorkItem(null);
    return res;
  };

  const handleMoveTimeBlock = async (params: {
    timeBlockId: string;
    targetDate: string;
    startMinute: number;
    endMinute: number;
  }) => {
    setError(null);
    const res = await service.moveTimeBlock(params);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    await loadPlanner();
    setMovingScheduledBlock(null);
    return res;
  };

  const handleRemoveTimeBlock = async (timeBlockId: string) => {
    setError(null);
    const res = await service.removeTimeBlock(timeBlockId);
    if (!res.ok) {
      setError(res.message);
      return res;
    }
    await loadPlanner();
    return res;
  };

  return {
    startDate,
    plannerView,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading,
    error,
    editingCapacityDate,
    setEditingCapacityDate,
    currentCapacityMinutes,
    setCurrentCapacityMinutes,
    schedulingWorkItem,
    setSchedulingWorkItem,
    defaultScheduleDate,
    setDefaultScheduleDate,
    movingScheduledBlock,
    setMovingScheduledBlock,
    handlePreviousWeek,
    handleNextWeek,
    handleToday,
    handleSetCapacity,
    handleScheduleWorkItem,
    handleMoveTimeBlock,
    handleRemoveTimeBlock,
    loadPlanner,
  };
}
