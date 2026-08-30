import { addDays, format, parseISO } from 'date-fns';
import { WorkItem, Project, Topic, DailyPlan } from '@/types';
import { getTodayDateString } from '@/lib/utils';

export interface WhatIfSimulation {
  dailyHours: number;
  finishDateISO: string;
  daysNeeded: number;
}

export interface ProjectedDay {
  dateISO: string;
  dayLabel: string;
  lessons: WorkItem[];
  totalMinutes: number;
}

export interface ForecastResult {
  projectId: string; // 'all' or specific project ID
  projectTitle: string;
  totalLessons: number;
  completedLessons: number;
  remainingLessons: number;
  totalHours: number;
  completedHours: number;
  remainingHours: number;
  progressPercent: number;
  dailyCapacityHours: number;
  daysNeeded: number;
  finishDateISO: string | null;
  isComplete: boolean;
  confidence: 'high' | 'medium' | 'insufficient';
  projectedDays: ProjectedDay[];
  whatIfSimulations: WhatIfSimulation[];
}

/**
 * Thuật toán tính toán Mốc dự báo hoàn thành môn học & toàn bộ lộ trình
 */
export function calculateCourseForecast(
  projectId: string, // 'all' or project ID
  projects: Project[],
  workItems: WorkItem[],
  dailyCapacityHours: number = 4.0,
  startDateStr: string = getTodayDateString()
): ForecastResult {
  const isAll = projectId === 'all';
  const targetProject = !isAll ? projects.find((p) => p.id === projectId) : null;
  const projectTitle = isAll ? 'Tất cả Môn học & Lộ trình' : targetProject?.title || 'Khóa học';

  // Lọc danh sách bài học
  const items = workItems.filter((i) => {
    if (i.type !== 'lesson' && !isAll) return false;
    if (isAll) return true;
    return i.projectId === projectId;
  });

  const totalLessons = items.length;
  const completedItems = items.filter((i) => i.status === 'completed');
  const remainingItems = items.filter((i) => i.status !== 'completed');

  const completedLessons = completedItems.length;
  const remainingLessons = remainingItems.length;

  const totalMinutes = items.reduce((acc, i) => acc + i.estimatedMinutes, 0);
  const completedMinutes = completedItems.reduce((acc, i) => acc + (i.actualMinutes || i.estimatedMinutes), 0);
  const remainingMinutes = remainingItems.reduce((acc, i) => acc + i.estimatedMinutes, 0);

  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const completedHours = Math.round((completedMinutes / 60) * 10) / 10;
  const remainingHours = Math.round((remainingMinutes / 60) * 10) / 10;

  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isComplete = totalLessons > 0 && remainingLessons === 0;

  // Tính số ngày cần dựa trên công suất
  const capacityMinutesPerDay = Math.max(30, dailyCapacityHours * 60);
  const daysNeeded = Math.ceil(remainingMinutes / capacityMinutesPerDay);

  let finishDateISO: string | null = null;
  const projectedDays: ProjectedDay[] = [];

  if (isComplete) {
    finishDateISO = startDateStr;
  } else if (remainingLessons > 0) {
    let currentDayCursor = parseISO(startDateStr);
    let currentDayMinutes = 0;
    let currentDayLessons: WorkItem[] = [];

    remainingItems.forEach((lesson, index) => {
      // Nếu thêm bài này vượt quá công suất ngày hiện tại và ngày hiện tại đã có bài
      if (currentDayMinutes + lesson.estimatedMinutes > capacityMinutesPerDay && currentDayLessons.length > 0) {
        // Lưu ngày hiện tại
        const dStr = format(currentDayCursor, 'yyyy-MM-dd');
        projectedDays.push({
          dateISO: dStr,
          dayLabel: format(currentDayCursor, 'EEEE, dd/MM'),
          lessons: currentDayLessons,
          totalMinutes: currentDayMinutes,
        });

        // Chuyển sang ngày kế tiếp
        currentDayCursor = addDays(currentDayCursor, 1);
        currentDayMinutes = 0;
        currentDayLessons = [];
      }

      currentDayLessons.push(lesson);
      currentDayMinutes += lesson.estimatedMinutes;

      // Nếu là bài cuối cùng
      if (index === remainingItems.length - 1) {
        const dStr = format(currentDayCursor, 'yyyy-MM-dd');
        projectedDays.push({
          dateISO: dStr,
          dayLabel: format(currentDayCursor, 'EEEE, dd/MM'),
          lessons: currentDayLessons,
          totalMinutes: currentDayMinutes,
        });
        finishDateISO = dStr;
      }
    });
  }

  // Độ tin cậy dự báo
  const confidence: 'high' | 'medium' | 'insufficient' =
    completedLessons >= 5 ? 'high' : completedLessons >= 1 ? 'medium' : 'insufficient';

  // What-If Simulations (cho các mức công suất 1h, 2h, 3h, 4h, 6h, 8h)
  const whatIfHoursList = [1, 2, 3, 4, 6, 8];
  const whatIfSimulations: WhatIfSimulation[] = whatIfHoursList.map((h) => {
    const dNeeded = Math.ceil(remainingMinutes / (h * 60));
    const targetFinish = addDays(parseISO(startDateStr), Math.max(0, dNeeded - 1));
    return {
      dailyHours: h,
      daysNeeded: dNeeded,
      finishDateISO: format(targetFinish, 'yyyy-MM-dd'),
    };
  });

  return {
    projectId,
    projectTitle,
    totalLessons,
    completedLessons,
    remainingLessons,
    totalHours,
    completedHours,
    remainingHours,
    progressPercent,
    dailyCapacityHours,
    daysNeeded,
    finishDateISO,
    isComplete,
    confidence,
    projectedDays,
    whatIfSimulations,
  };
}

/**
 * Thuật toán Tự Động Phân Bổ Bài Học Chưa Học vào Lịch Tuần (Auto-Scheduler)
 */
export function autoScheduleUpcomingLessons(
  workItems: WorkItem[],
  dailyPlans: Record<string, DailyPlan>,
  defaultCapacityHours: number = 4.0,
  startDateStr: string = getTodayDateString(),
  numDays: number = 7
): { updatedItems: WorkItem[]; scheduledCount: number } {
  const uncompletedItems = workItems.filter(
    (i) => i.status !== 'completed' && (!i.scheduledDate || i.status === 'backlog')
  );

  if (uncompletedItems.length === 0) {
    return { updatedItems: workItems, scheduledCount: 0 };
  }

  let scheduledCount = 0;
  const itemsMap = new Map<string, WorkItem>(workItems.map((i) => [i.id, { ...i }]));

  let cursor = parseISO(startDateStr);
  let unplacedQueue = [...uncompletedItems];

  for (let d = 0; d < numDays && unplacedQueue.length > 0; d++) {
    const dStr = format(cursor, 'yyyy-MM-dd');
    const plan = dailyPlans[dStr];
    const capacityHours = plan?.capacityHours ?? defaultCapacityHours;
    const capacityMinutes = capacityHours * 60;

    // Tính số phút đã xếp sẵn vào ngày này
    const existingMinutes = Array.from(itemsMap.values())
      .filter((i) => i.scheduledDate === dStr && i.status !== 'completed')
      .reduce((acc, i) => acc + i.estimatedMinutes, 0);

    let remainingRoom = Math.max(0, capacityMinutes - existingMinutes);

    // Điền bài học vào ngày
    const remainingQueue: WorkItem[] = [];
    for (const item of unplacedQueue) {
      if (remainingRoom >= item.estimatedMinutes) {
        itemsMap.set(item.id, {
          ...item,
          scheduledDate: dStr,
          status: 'scheduled',
          updatedAt: new Date().toISOString(),
        });
        remainingRoom -= item.estimatedMinutes;
        scheduledCount++;
      } else {
        remainingQueue.push(item);
      }
    }

    unplacedQueue = remainingQueue;
    cursor = addDays(cursor, 1);
  }

  return {
    updatedItems: Array.from(itemsMap.values()),
    scheduledCount,
  };
}
