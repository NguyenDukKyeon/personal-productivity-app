import type { Distraction } from '@/domain/focus/distraction';
import type { FocusSession } from '@/domain/focus/focus-session';
import type { Result } from '@/domain/shared/result';
import type { WorkItem } from '@/domain/work-items/work-item';

export interface FocusRepository {
  getSession(id: string): Promise<Result<FocusSession | null>>;
  listSessions(): Promise<Result<FocusSession[]>>;
  listSessionsForWorkItem(workItemId: string): Promise<Result<FocusSession[]>>;
  getActiveSession(): Promise<Result<FocusSession | null>>;
  startSessionIfNoneActive(session: FocusSession): Promise<Result<FocusSession>>;
  saveSession(session: FocusSession): Promise<Result<void>>;
  completeSessionWithWorkItem(session: FocusSession, workItem: WorkItem): Promise<Result<void>>;
  listDistractions(focusSessionId: string): Promise<Result<Distraction[]>>;
  saveDistraction(distraction: Distraction): Promise<Result<void>>;
}
