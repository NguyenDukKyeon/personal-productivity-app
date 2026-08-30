import { err, ok, type Result } from '@/domain/shared/result';

export interface TimeBlock {
  id: string;
  date: string;
  workItemId: string | null;
  habitId: string | null;
  startMinute: number;
  endMinute: number;
  createdAt: string;
  updatedAt: string;
}

export type TimeBlockValidationInput = Pick<TimeBlock, 'workItemId' | 'habitId' | 'startMinute' | 'endMinute'>;

export function validateTimeBlock(input: TimeBlockValidationInput): Result<void> {
  const hasWorkItem = Boolean(input.workItemId);
  const hasHabit = Boolean(input.habitId);
  if (hasWorkItem === hasHabit) {
    return err('invalid_time_block_target', 'A time block must target exactly one work item or habit.');
  }
  if (
    !Number.isInteger(input.startMinute) ||
    !Number.isInteger(input.endMinute) ||
    input.startMinute < 0 ||
    input.endMinute > 1440 ||
    input.startMinute >= input.endMinute
  ) {
    return err('invalid_time_block', 'Time block must stay within one day and end after it starts.');
  }
  return ok(undefined);
}

export function detectOverlaps(blocks: TimeBlock[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.startMinute < b.endMinute && b.startMinute < a.endMinute) {
        pairs.push(a.id < b.id ? [a.id, b.id] : [b.id, a.id]);
      }
    }
  }
  return pairs.sort(([a1, a2], [b1, b2]) => a1.localeCompare(b1) || a2.localeCompare(b2));
}
