import { Priority, WorkItemType } from '@/types';
import { getTodayDateString } from '@/lib/utils';
import { addDays, format } from 'date-fns';

export interface ParsedTaskInput {
  cleanTitle: string;
  estimatedMinutes: number;
  priority: Priority;
  scheduledTimeStart: string | null;
  scheduledDate: string | null;
  projectQuery: string | null;
  type: WorkItemType;
  tags: string[];
}

/**
 * Smart Natural Language Input Parser
 * Supports:
 * - Duration: ~30m, ~45m, ~1h, ~1.5h, ~90m, ~2h
 * - Priority: !p1, !p2, !p3, !p4, !urgent, !high, !medium, !low
 * - Start Time: @08:30, @9:00, @14:15, @2pm, @10am
 * - Date: #today, #tomorrow, #nextweek, #mon, #tue, #2026-08-31
 * - Project: /project-name or +project-name
 * - Type: :lesson, :task, :milestone
 */
export function parseSmartTaskInput(rawInput: string, defaultDate: string = getTodayDateString()): ParsedTaskInput {
  let text = rawInput.trim();
  let estimatedMinutes = 30;
  let priority: Priority = 'p3_medium';
  let scheduledTimeStart: string | null = null;
  let scheduledDate: string | null = defaultDate;
  let projectQuery: string | null = null;
  let type: WorkItemType = 'task';
  const tags: string[] = [];

  // 1. Extract Duration (~30m, ~1.5h, ~90)
  const durationMatch = text.match(/~(\d+(\.\d+)?)(m|h|min|mins|hour|hours)?/i);
  if (durationMatch) {
    const val = parseFloat(durationMatch[1]);
    const unit = (durationMatch[3] || 'm').toLowerCase();
    if (unit.startsWith('h')) {
      estimatedMinutes = Math.round(val * 60);
    } else {
      estimatedMinutes = Math.round(val);
    }
    text = text.replace(durationMatch[0], '');
  }

  // 2. Extract Priority (!p1, !p2, !p3, !p4, !urgent, !high)
  const priorityMatch = text.match(/!(p[1-4]|urgent|high|med|medium|low)/i);
  if (priorityMatch) {
    const pStr = priorityMatch[1].toLowerCase();
    if (pStr === 'p1' || pStr === 'urgent') priority = 'p1_urgent';
    else if (pStr === 'p2' || pStr === 'high') priority = 'p2_high';
    else if (pStr === 'p3' || pStr === 'med' || pStr === 'medium') priority = 'p3_medium';
    else if (pStr === 'p4' || pStr === 'low') priority = 'p4_low';
    text = text.replace(priorityMatch[0], '');
  }

  // 3. Extract Scheduled Start Time (@08:30, @9:00, @14:00, @2pm)
  const timeMatch = text.match(/@(\d{1,2})(:(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    const ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : null;

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    scheduledTimeStart = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    text = text.replace(timeMatch[0], '');
  }

  // 4. Extract Date (#today, #tomorrow, #backlog, #yyyy-mm-dd)
  const dateMatch = text.match(/#(today|tomorrow|tom|backlog|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    const dStr = dateMatch[1].toLowerCase();
    if (dStr === 'today') {
      scheduledDate = getTodayDateString();
    } else if (dStr === 'tomorrow' || dStr === 'tom') {
      scheduledDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    } else if (dStr === 'backlog') {
      scheduledDate = null;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      scheduledDate = dStr;
    }
    text = text.replace(dateMatch[0], '');
  }

  // 5. Extract Project (/projectName or +projectName)
  const projectMatch = text.match(/(\/|\+)([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF-]+)/);
  if (projectMatch) {
    projectQuery = projectMatch[2].trim();
    text = text.replace(projectMatch[0], '');
  }

  // 6. Extract Type (:lesson, :task, :milestone)
  const typeMatch = text.match(/:(lesson|task|milestone)/i);
  if (typeMatch) {
    type = typeMatch[1].toLowerCase() as WorkItemType;
    text = text.replace(typeMatch[0], '');
  }

  // Clean title
  const cleanTitle = text.replace(/\s+/g, ' ').trim() || 'Nhiệm vụ mới';

  return {
    cleanTitle,
    estimatedMinutes,
    priority,
    scheduledTimeStart,
    scheduledDate,
    projectQuery,
    type,
    tags,
  };
}
