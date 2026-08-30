import { err, ok, type Result } from '@/domain/shared/result';
import { elapsedFocusMs, openRunningMs, parseTimestampMs } from './focus-timing';

export type FocusSessionStatus = 'running' | 'paused' | 'completed' | 'abandoned';
export type FocusMode = 'countdown' | 'flow';
export type FocusQuality = 1 | 2 | 3 | 4 | 5;

export interface FocusSession {
  id: string;
  workItemId: string | null;
  timeBlockId: string | null;
  status: FocusSessionStatus;
  mode: FocusMode;
  plannedDurationMinutes: number | null;
  startedAt: string;
  runningSince: string | null;
  endedAt: string | null;
  accumulatedFocusMs: number;
  focusedDurationMs: number | null;
  startLatencyMinutes: number | null;
  note: string;
  qualityRating: FocusQuality | null;
  createdAt: string;
  updatedAt: string;
}

const QUALITY_VALUES: FocusQuality[] = [1, 2, 3, 4, 5];

export function validatePlannedDuration(
  mode: FocusMode,
  plannedDurationMinutes: number | null,
): Result<void> {
  if (mode === 'countdown') {
    if (!Number.isInteger(plannedDurationMinutes) || (plannedDurationMinutes ?? 0) <= 0) {
      return err('invalid_planned_duration', 'Countdown focus needs a positive planned duration.');
    }
    return ok(undefined);
  }
  if (plannedDurationMinutes !== null) {
    return err('invalid_planned_duration', 'Flow focus cannot have a planned duration.');
  }
  return ok(undefined);
}

export function createRunningFocusSession(input: {
  id: string;
  nowIso: string;
  workItemId: string | null;
  timeBlockId: string | null;
  mode: FocusMode;
  plannedDurationMinutes: number | null;
  startLatencyMinutes: number | null;
}): Result<FocusSession> {
  const planned = validatePlannedDuration(input.mode, input.plannedDurationMinutes);
  if (!planned.ok) return planned;
  if (parseTimestampMs(input.nowIso) === null) {
    return err('invalid_transition', 'Focus clock is invalid.');
  }

  const session: FocusSession = {
    id: input.id,
    workItemId: input.workItemId,
    timeBlockId: input.timeBlockId,
    status: 'running',
    mode: input.mode,
    plannedDurationMinutes: input.plannedDurationMinutes,
    startedAt: input.nowIso,
    runningSince: input.nowIso,
    endedAt: null,
    accumulatedFocusMs: 0,
    focusedDurationMs: null,
    startLatencyMinutes: input.startLatencyMinutes,
    note: '',
    qualityRating: null,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
  const valid = validateFocusSession(session);
  if (!valid.ok) return valid;
  return ok(session);
}

export function pauseFocusSession(session: FocusSession, nowIso: string): Result<FocusSession> {
  if (session.status !== 'running') {
    return err('invalid_transition', 'Only a running session can be paused.');
  }
  const nowMs = parseTimestampMs(nowIso);
  if (nowMs === null) {
    return err('invalid_transition', 'Focus clock is invalid.');
  }
  return ok({
    ...session,
    status: 'paused',
    accumulatedFocusMs: session.accumulatedFocusMs + openRunningMs(session, nowMs),
    runningSince: null,
    updatedAt: nowIso,
  });
}

export function resumeFocusSession(session: FocusSession, nowIso: string): Result<FocusSession> {
  if (session.status !== 'paused') {
    return err('invalid_transition', 'Only a paused session can be resumed.');
  }
  if (parseTimestampMs(nowIso) === null) {
    return err('invalid_transition', 'Focus clock is invalid.');
  }
  return ok({
    ...session,
    status: 'running',
    runningSince: nowIso,
    updatedAt: nowIso,
  });
}

export function completeFocusSession(
  session: FocusSession,
  nowIso: string,
  extras: { note?: string; qualityRating?: FocusQuality | null } = {},
): Result<FocusSession> {
  if (extras.qualityRating != null && !QUALITY_VALUES.includes(extras.qualityRating)) {
    return err('invalid_transition', 'Quality rating must be between 1 and 5.');
  }
  return finalize(session, nowIso, 'completed', {
    note: extras.note?.trim() ?? session.note,
    qualityRating: extras.qualityRating ?? session.qualityRating,
  });
}

export function abandonFocusSession(session: FocusSession, nowIso: string): Result<FocusSession> {
  return finalize(session, nowIso, 'abandoned', {
    note: session.note,
    qualityRating: session.qualityRating,
  });
}

export function localMinuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function computeStartLatencyMinutes(timeBlockStartMinute: number, startedAt: Date): number {
  return localMinuteOfDay(startedAt) - timeBlockStartMinute;
}

export function validateFocusSession(session: FocusSession): Result<void> {
  const planned = validatePlannedDuration(session.mode, session.plannedDurationMinutes);
  if (!planned.ok) return planned;

  if (!Number.isInteger(session.accumulatedFocusMs) || session.accumulatedFocusMs < 0) {
    return err('corrupt_record', 'Stored data is invalid and was left untouched.');
  }

  const startedAt = parseTimestampMs(session.startedAt);
  if (startedAt === null) {
    return err('corrupt_record', 'Stored data is invalid and was left untouched.');
  }

  if (session.status === 'running') {
    if (!session.runningSince || parseTimestampMs(session.runningSince) === null) {
      return err('corrupt_record', 'Stored data is invalid and was left untouched.');
    }
    if (session.endedAt !== null || session.focusedDurationMs !== null) {
      return err('corrupt_record', 'Stored data is invalid and was left untouched.');
    }
  }

  if (session.status === 'paused') {
    if (session.runningSince !== null || session.endedAt !== null || session.focusedDurationMs !== null) {
      return err('corrupt_record', 'Stored data is invalid and was left untouched.');
    }
  }

  if (session.status === 'completed' || session.status === 'abandoned') {
    const endedAt = session.endedAt ? parseTimestampMs(session.endedAt) : null;
    if (
      session.runningSince !== null ||
      endedAt === null ||
      endedAt < startedAt ||
      session.focusedDurationMs == null ||
      !Number.isInteger(session.focusedDurationMs) ||
      session.focusedDurationMs < 0
    ) {
      return err('corrupt_record', 'Stored data is invalid and was left untouched.');
    }
  }

  if (session.qualityRating != null && !QUALITY_VALUES.includes(session.qualityRating)) {
    return err('corrupt_record', 'Stored data is invalid and was left untouched.');
  }

  return ok(undefined);
}

function finalize(
  session: FocusSession,
  nowIso: string,
  status: 'completed' | 'abandoned',
  extras: { note: string; qualityRating: FocusQuality | null },
): Result<FocusSession> {
  if (session.status !== 'running' && session.status !== 'paused') {
    return err('invalid_transition', 'A finished session cannot change again.');
  }
  const nowMs = parseTimestampMs(nowIso);
  if (nowMs === null) {
    return err('invalid_transition', 'Focus clock is invalid.');
  }
  return ok({
    ...session,
    status,
    runningSince: null,
    endedAt: nowIso,
    focusedDurationMs: elapsedFocusMs(session, nowMs),
    note: extras.note,
    qualityRating: extras.qualityRating,
    updatedAt: nowIso,
  });
}
