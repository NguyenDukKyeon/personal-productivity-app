import { parseLocalDateKey } from '../shared/local-date';
import { err, ok, type Result } from '../shared/result';

export type HabitCheckInKind = 'full' | 'minimum' | 'skipped';

export interface HabitCheckIn {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD local calendar date
  kind: HabitCheckInKind;
  note: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
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

function isValidIsoString(val: string): boolean {
  if (typeof val !== 'string' || !val) return false;
  const d = new Date(val);
  return !Number.isNaN(d.getTime()) && val.includes('T');
}

export function generateCheckInId(habitId: string, date: string): string {
  return `chk_${habitId}_${date}`;
}

export function validateCheckInPreWrite(checkIn: HabitCheckIn): Result<void> {
  const habitId = (checkIn.habitId ?? '').trim();
  if (!habitId) return err('invalid_habit_id', 'Habit ID cannot be empty.');

  const date = (checkIn.date ?? '').trim();
  if (!parseLocalDateKey(date)) {
    return err('invalid_date', 'Date must be a valid YYYY-MM-DD calendar date.');
  }

  const expectedId = generateCheckInId(habitId, date);
  if (checkIn.id !== expectedId) {
    return err('invalid_check_in_id', `Check-in ID must match deterministic format "${expectedId}".`);
  }

  if (checkIn.kind !== 'full' && checkIn.kind !== 'minimum' && checkIn.kind !== 'skipped') {
    return err('invalid_kind', 'Check-in kind must be full, minimum, or skipped.');
  }

  const note = checkIn.note ?? '';
  if (note.length > MAX_NOTE_LENGTH) {
    return err('note_too_long', `Note cannot exceed ${MAX_NOTE_LENGTH} characters.`);
  }

  if (!isValidIsoString(checkIn.createdAt)) {
    return err('invalid_created_at', 'CheckIn createdAt must be a valid ISO 8601 timestamp.');
  }
  if (!isValidIsoString(checkIn.updatedAt)) {
    return err('invalid_updated_at', 'CheckIn updatedAt must be a valid ISO 8601 timestamp.');
  }
  if (new Date(checkIn.updatedAt).getTime() < new Date(checkIn.createdAt).getTime()) {
    return err('updated_at_before_created_at', 'CheckIn updatedAt cannot precede createdAt.');
  }

  return ok(undefined);
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

  const checkIn: HabitCheckIn = {
    id,
    habitId,
    date,
    kind: input.kind,
    note,
    createdAt: now,
    updatedAt: now,
  };

  const validation = validateCheckInPreWrite(checkIn);
  if (!validation.ok) {
    return validation;
  }

  return ok(checkIn);
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

  const updated: HabitCheckIn = {
    ...checkIn,
    kind,
    note,
    updatedAt: now,
  };

  const validation = validateCheckInPreWrite(updated);
  if (!validation.ok) {
    return validation;
  }

  return ok(updated);
}
