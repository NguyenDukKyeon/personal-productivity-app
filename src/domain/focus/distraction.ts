import { err, ok, type Result } from '@/domain/shared/result';
import { parseTimestampMs } from './focus-timing';
import type { FocusSessionStatus } from './focus-session';

export const DISTRACTION_MAX_LENGTH = 200;

export interface Distraction {
  id: string;
  focusSessionId: string;
  text: string;
  capturedAt: string;
}

export function canCaptureDistraction(status: FocusSessionStatus): boolean {
  return status === 'running' || status === 'paused';
}

export function createDistraction(input: {
  id: string;
  focusSessionId: string;
  text: string;
  capturedAt: string;
}): Result<Distraction> {
  const text = input.text.trim();
  if (!text || text.length > DISTRACTION_MAX_LENGTH || !input.focusSessionId) {
    return err('invalid_distraction', 'Distraction text is required and must stay under 200 characters.');
  }
  if (parseTimestampMs(input.capturedAt) === null) {
    return err('corrupt_record', 'Stored data is invalid and was left untouched.');
  }
  return ok({
    id: input.id,
    focusSessionId: input.focusSessionId,
    text,
    capturedAt: input.capturedAt,
  });
}

export function validateDistraction(distraction: Distraction): Result<void> {
  const created = createDistraction(distraction);
  return created.ok ? ok(undefined) : created;
}
