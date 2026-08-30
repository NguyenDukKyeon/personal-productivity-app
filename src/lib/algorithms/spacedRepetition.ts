import { WorkItem, Project } from '@/types';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import { getTodayDateString } from '@/lib/utils';

export const SPACED_INTERVALS = [1, 3, 7, 14, 30] as const;

export interface DueReviewItem {
  taskId: string;
  lessonId: string;
  lessonTitle: string;
  projectId?: string | null;
  projectTitle?: string;
  projectColor?: string;
  completedAtISO: string;
  completedDateFormatted: string;
  ageDays: number;
  intervalStage: 1 | 3 | 7 | 14 | 30 | 'overdue';
  intervalLabel: string;
  estimatedMinutes: number; // default 15 mins
  isCompleted: boolean;
}

export function generateReviewTaskId(lessonId: string, dateStr: string): string {
  return `review:${lessonId}:${dateStr}`;
}

/**
 * Thuật toán tính toán danh sách bài ôn tập ngắt quãng (Spaced Repetition Ebbinghaus)
 * Các mốc ôn tập: 1 ngày, 3 ngày, 7 ngày, 14 ngày, 30 ngày sau khi hoàn thành bài học
 */
export function getDueReviewItems(
  workItems: WorkItem[],
  projects: Project[],
  currentDateStr: string = getTodayDateString(),
  reviewCompletions: Record<string, string> = {}
): DueReviewItem[] {
  const currentDate = parseISO(currentDateStr);
  const completedLessons = workItems.filter(
    (item) => item.type === 'lesson' && item.status === 'completed' && (item.completedAt || item.scheduledDate)
  );

  const dueItems: DueReviewItem[] = [];

  for (const lesson of completedLessons) {
    const completedDateStr = lesson.completedAt
      ? lesson.completedAt.split('T')[0]
      : lesson.scheduledDate!;

    const completedDate = parseISO(completedDateStr);
    const ageDays = differenceInCalendarDays(currentDate, completedDate);

    // Only process past completed lessons
    if (ageDays <= 0) continue;

    // Check if age matches interval 1, 3, 7, 14, 30 or is an overdue due stage
    let intervalStage: 1 | 3 | 7 | 14 | 30 | 'overdue' | null = null;
    let intervalLabel = '';

    if (ageDays === 1) {
      intervalStage = 1;
      intervalLabel = 'Ôn lần 1 (Sau 24h)';
    } else if (ageDays === 3) {
      intervalStage = 3;
      intervalLabel = 'Ôn lần 2 (Sau 3 ngày)';
    } else if (ageDays === 7) {
      intervalStage = 7;
      intervalLabel = 'Ôn lần 3 (Sau 1 tuần)';
    } else if (ageDays === 14) {
      intervalStage = 14;
      intervalLabel = 'Ôn lần 4 (Sau 2 tuần)';
    } else if (ageDays === 30) {
      intervalStage = 30;
      intervalLabel = 'Ôn lần 5 (Sau 1 tháng)';
    } else if (ageDays > 1 && ageDays < 3) {
      // Overdue for stage 1
      intervalStage = 'overdue';
      intervalLabel = `Quá hạn ôn 1d (+${ageDays - 1}d)`;
    } else if (ageDays > 3 && ageDays < 7) {
      // Overdue for stage 3
      intervalStage = 'overdue';
      intervalLabel = `Quá hạn ôn 3d (+${ageDays - 3}d)`;
    }

    if (intervalStage !== null) {
      const taskId = generateReviewTaskId(lesson.id, currentDateStr);
      const project = projects.find((p) => p.id === lesson.projectId);
      const isCompleted = Boolean(reviewCompletions[taskId]);

      dueItems.push({
        taskId,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        projectId: lesson.projectId,
        projectTitle: project?.title,
        projectColor: project?.color,
        completedAtISO: lesson.completedAt || `${lesson.scheduledDate}T00:00:00.000Z`,
        completedDateFormatted: format(completedDate, 'dd/MM/yyyy'),
        ageDays,
        intervalStage,
        intervalLabel,
        estimatedMinutes: 15,
        isCompleted,
      });
    }
  }

  // Sort: Overdue first, then by ageDays ascending
  dueItems.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return a.ageDays - b.ageDays;
  });

  return dueItems;
}

/**
 * Tính toán ngân sách thời gian dành cho bài ôn trong ngày (mặc định tối đa 20% dung lượng hoặc 60 phút)
 */
export function calculateReviewBudget(
  capacityHours: number,
  reviewShareMax: number = 0.2,
  reviewCapMinutes: number = 60
): number {
  const quotaMinutes = Math.max(0, Math.round(capacityHours * 60));
  return Math.min(reviewCapMinutes, Math.round(quotaMinutes * reviewShareMax));
}
