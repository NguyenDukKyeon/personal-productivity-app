import { parseLocalDateKey } from '../shared/local-date';
import { err, ok, type Result } from '../shared/result';

export type HabitCheckInKind = 'full' | 'minimum' | 'skipped';

export interface HabitCheckIn {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD local calendar date
  kind: HabitCheckInKind;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckInDomainInput {
  id?: string;
  habitId: string;
  date: string;
  kind: HabitCheckInKind;
  note?: string;
  nowIso?: string;
}

export interface UpdateCheckInDomainPatch {
  kind?: HabitCheckInKind;
  note?: string;
}

const MAX_NOTE_LENGTH = 280;

export function generateCheckInId(habitId: string, date: string): string {
  return `chk_${habitId}_${date}`;
}

export function createHabitCheckIn(
  input: CreateCheckInDomainInput,
): Result<HabitCheckIn> {
  const habitId = input.habitId.trim();
  if (!habitId) return err('invalid_habit_id', 'Habit ID cannot be empty.');

  const date = input.date.trim();
  if (!parseLocalDateKey(date))
    return err('invalid_date', 'Date must be a valid YYYY-MM-DD calendar date.');

  const note = (input.note ?? '').trim();
  if (note.length > MAX_NOTE_LENGTH)
    return err('note_too_long', `Note cannot exceed ${MAX_NOTE_LENGTH} characters.`);

  const id = input.id?.trim() || generateCheckInId(habitId, date);
  const now = input.nowIso ?? new Date().toISOString();

  return ok({
    id,
    habitId,
    date,
    kind: input.kind,
    note,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateHabitCheckIn(
  checkIn: HabitCheckIn,
  patch: UpdateCheckInDomainPatch,
  nowIso?: string,
): Result<HabitCheckIn> {
  const kind = patch.kind ?? checkIn.kind;
  const note = patch.note !== undefined ? patch.note.trim() : checkIn.note;
  if (note.length > MAX_NOTE_LENGTH)
    return err('note_too_long', `Note cannot exceed ${MAX_NOTE_LENGTH} characters.`);

  const now = nowIso ?? new Date().toISOString();

  return ok({
    ...checkIn,
    kind,
    note,
    updatedAt: now,
  });
}
