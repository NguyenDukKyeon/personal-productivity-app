import {
  canCaptureDistraction,
  createDistraction,
  type Distraction,
} from '@/domain/focus/distraction';
import {
  abandonFocusSession,
  completeFocusSession,
  computeStartLatencyMinutes,
  createRunningFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  type FocusMode,
  type FocusQuality,
  type FocusSession,
} from '@/domain/focus/focus-session';
import {
  actualMinutesFromCompletedSessions,
  elapsedFocusMs,
  remainingFocusMs,
} from '@/domain/focus/focus-timing';
import { toLocalDateKey } from '@/domain/shared/local-date';
import { err, ok, type Result } from '@/domain/shared/result';
import type { TimeBlock } from '@/domain/time-blocks/time-block';
import type { WorkItem } from '@/domain/work-items/work-item';
import type { FocusRepository } from '@/infrastructure/persistence/contracts/focus-repository';
import type { TodayRepository } from '@/infrastructure/persistence/contracts/today-repository';

export interface FocusViewModel {
  activeSession: FocusSession | null;
  elapsedMs: number;
  remainingMs: number | null;
  workItem: WorkItem | null;
  timeBlock: TimeBlock | null;
  distractions: Distraction[];
  interruptionCount: number;
  lastFinalizedSession: FocusSession | null;
  workItems: WorkItem[];
  todayTimeBlocks: TimeBlock[];
}

export interface StartSessionInput {
  workItemId: string | null;
  timeBlockId: string | null;
  mode: FocusMode;
  plannedDurationMinutes: number | null;
}

export interface FocusService {
  getFocusView(): Promise<Result<FocusViewModel>>;
  startSession(input: StartSessionInput): Promise<Result<FocusSession>>;
  pauseSession(id: string): Promise<Result<FocusSession>>;
  resumeSession(id: string): Promise<Result<FocusSession>>;
  finishSession(
    id: string,
    extras: { note?: string; qualityRating?: FocusQuality | null },
  ): Promise<Result<FocusSession>>;
  abandonSession(
    id: string,
    extras?: { note?: string; qualityRating?: FocusQuality | null },
  ): Promise<Result<FocusSession>>;
  captureDistraction(id: string, text: string): Promise<Result<Distraction>>;
  listCompletedSessions(): Promise<Result<FocusSession[]>>;
}

export function createFocusService(deps: {
  focusRepository: FocusRepository;
  todayRepository: TodayRepository;
  now: () => Date;
  newId: () => string;
}): FocusService {
  const { focusRepository, todayRepository, now, newId } = deps;

  function nowIso(): string {
    return now().toISOString();
  }

  async function requireSession(id: string): Promise<Result<FocusSession>> {
    const result = await focusRepository.getSession(id);
    if (!result.ok) return result;
    if (!result.value) return err('unknown_entity', 'Focus session was not found.');
    return ok(result.value);
  }

  async function persistSession(session: FocusSession): Promise<Result<FocusSession>> {
    const saved = await focusRepository.saveSession(session);
    if (!saved.ok) return saved;
    return ok(session);
  }

  const service: FocusService = {
    async getFocusView() {
      const activeResult = await focusRepository.getActiveSession();
      if (!activeResult.ok) return activeResult;

      const workItemsResult = await todayRepository.listWorkItems();
      if (!workItemsResult.ok) return workItemsResult;

      const todayBlocksResult = await todayRepository.listTimeBlocks(toLocalDateKey(now()));
      if (!todayBlocksResult.ok) return todayBlocksResult;

      const sessionsResult = await focusRepository.listSessions();
      if (!sessionsResult.ok) return sessionsResult;

      const activeSession = activeResult.value;
      const nowMs = now().getTime();
      const lastFinalizedSession =
        sessionsResult.value
          .filter((session) => session.status === 'completed' || session.status === 'abandoned')
          .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))[0] ?? null;

      const evidenceSession = activeSession ?? lastFinalizedSession;
      let distractions: Distraction[] = [];
      let workItem: WorkItem | null = null;
      let timeBlock: TimeBlock | null = null;

      if (evidenceSession) {
        const distractionResult = await focusRepository.listDistractions(evidenceSession.id);
        if (!distractionResult.ok) return distractionResult;
        distractions = distractionResult.value;

        if (evidenceSession.workItemId) {
          const itemResult = await todayRepository.getWorkItem(evidenceSession.workItemId);
          if (!itemResult.ok) return itemResult;
          workItem = itemResult.value;
        }
        if (evidenceSession.timeBlockId) {
          const blockResult = await todayRepository.getTimeBlock(evidenceSession.timeBlockId);
          if (!blockResult.ok) return blockResult;
          timeBlock = blockResult.value;
        }
      }

      return ok({
        activeSession,
        elapsedMs: activeSession ? elapsedFocusMs(activeSession, nowMs) : 0,
        remainingMs: activeSession ? remainingFocusMs(activeSession, nowMs) : null,
        workItem,
        timeBlock,
        distractions,
        interruptionCount: distractions.length,
        lastFinalizedSession,
        workItems: workItemsResult.value,
        todayTimeBlocks: todayBlocksResult.value,
      });
    },

    async startSession(input) {
      const startedAt = now();
      const startedAtIso = startedAt.toISOString();

      let effectiveWorkItemId = input.workItemId;
      let startLatencyMinutes: number | null = null;

      if (input.timeBlockId) {
        const block = await todayRepository.getTimeBlock(input.timeBlockId);
        if (!block.ok) return block;
        if (!block.value) return err('unknown_entity', 'Time block was not found.');
        if (input.workItemId && block.value.workItemId && block.value.workItemId !== input.workItemId) {
          return err('unknown_entity', 'Time block does not belong to that work item.');
        }
        if (!effectiveWorkItemId && block.value.workItemId) {
          effectiveWorkItemId = block.value.workItemId;
        }
        startLatencyMinutes = computeStartLatencyMinutes(block.value.startMinute, startedAt);
      }

      if (effectiveWorkItemId) {
        const item = await todayRepository.getWorkItem(effectiveWorkItemId);
        if (!item.ok) return item;
        if (!item.value) return err('unknown_entity', 'Work item was not found.');
      }

      const created = createRunningFocusSession({
        id: newId(),
        nowIso: startedAtIso,
        workItemId: effectiveWorkItemId,
        timeBlockId: input.timeBlockId,
        mode: input.mode,
        plannedDurationMinutes: input.plannedDurationMinutes,
        startLatencyMinutes,
      });
      if (!created.ok) return created;
      return focusRepository.startSessionIfNoneActive(created.value);
    },

    async pauseSession(id) {
      const session = await requireSession(id);
      if (!session.ok) return session;
      const next = pauseFocusSession(session.value, nowIso());
      if (!next.ok) return next;
      return persistSession(next.value);
    },

    async resumeSession(id) {
      const session = await requireSession(id);
      if (!session.ok) return session;
      const next = resumeFocusSession(session.value, nowIso());
      if (!next.ok) return next;
      return persistSession(next.value);
    },

    async finishSession(id, extras) {
      const session = await requireSession(id);
      if (!session.ok) return session;
      const completed = completeFocusSession(session.value, nowIso(), extras);
      if (!completed.ok) return completed;

      if (!completed.value.workItemId) {
        return persistSession(completed.value);
      }

      const itemResult = await todayRepository.getWorkItem(completed.value.workItemId);
      if (!itemResult.ok) return itemResult;
      if (!itemResult.value) {
        return persistSession(completed.value);
      }

      const existing = await focusRepository.listSessionsForWorkItem(completed.value.workItemId);
      if (!existing.ok) return existing;
      const sessions = [
        ...existing.value.filter((row) => row.id !== completed.value.id),
        completed.value,
      ];
      const actualMinutes = actualMinutesFromCompletedSessions(sessions);
      const workItem: WorkItem = {
        ...itemResult.value,
        actualMinutes,
        updatedAt: nowIso(),
      };
      const written = await focusRepository.completeSessionWithWorkItem(completed.value, workItem);
      if (!written.ok) return written;
      return ok(completed.value);
    },

    async abandonSession(id, extras) {
      const session = await requireSession(id);
      if (!session.ok) return session;
      const abandoned = abandonFocusSession(session.value, nowIso(), extras);
      if (!abandoned.ok) return abandoned;
      return persistSession(abandoned.value);
    },

    async captureDistraction(id, text) {
      const session = await requireSession(id);
      if (!session.ok) return session;
      if (!canCaptureDistraction(session.value.status)) {
        return err('invalid_transition', 'Distractions can only be captured during an active session.');
      }
      const created = createDistraction({
        id: newId(),
        focusSessionId: session.value.id,
        text,
        capturedAt: nowIso(),
      });
      if (!created.ok) return created;
      const saved = await focusRepository.saveDistraction(created.value);
      if (!saved.ok) return saved;
      return ok(created.value);
    },

    async listCompletedSessions() {
      const sessions = await focusRepository.listSessions();
      if (!sessions.ok) return sessions;
      return ok(
        sessions.value
          .filter((session) => session.status === 'completed')
          .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? '')),
      );
    },
  };

  return service;
}
