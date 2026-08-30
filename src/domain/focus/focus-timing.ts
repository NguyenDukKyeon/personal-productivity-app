export interface FocusTimingInput {
  status: 'running' | 'paused' | 'completed' | 'abandoned';
  mode: 'countdown' | 'flow';
  plannedDurationMinutes: number | null;
  runningSince: string | null;
  accumulatedFocusMs: number;
  focusedDurationMs: number | null;
}

export function parseTimestampMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function openRunningMs(
  session: Pick<FocusTimingInput, 'status' | 'runningSince'>,
  nowMs: number,
): number {
  if (session.status !== 'running' || !session.runningSince || !Number.isFinite(nowMs)) {
    return 0;
  }
  const started = parseTimestampMs(session.runningSince);
  if (started === null) return 0;
  return Math.max(0, nowMs - started);
}

export function elapsedFocusMs(session: FocusTimingInput, nowMs: number): number {
  if (session.focusedDurationMs != null) {
    return Number.isFinite(session.focusedDurationMs) && session.focusedDurationMs >= 0
      ? session.focusedDurationMs
      : 0;
  }
  const accumulated =
    Number.isFinite(session.accumulatedFocusMs) && session.accumulatedFocusMs > 0
      ? session.accumulatedFocusMs
      : 0;
  return accumulated + openRunningMs(session, nowMs);
}

export function remainingFocusMs(session: FocusTimingInput, nowMs: number): number | null {
  if (session.mode !== 'countdown' || session.plannedDurationMinutes == null) return null;
  if (!Number.isInteger(session.plannedDurationMinutes) || session.plannedDurationMinutes <= 0) {
    return null;
  }
  return Math.max(0, session.plannedDurationMinutes * 60_000 - elapsedFocusMs(session, nowMs));
}

export function actualMinutesFromCompletedSessions(
  sessions: Array<{ status: string; focusedDurationMs: number | null }>,
): number {
  const totalMs = sessions.reduce((sum, session) => {
    if (session.status !== 'completed' || session.focusedDurationMs == null) return sum;
    if (!Number.isFinite(session.focusedDurationMs) || session.focusedDurationMs < 0) return sum;
    return sum + session.focusedDurationMs;
  }, 0);
  return Math.floor(totalMs / 60_000);
}
