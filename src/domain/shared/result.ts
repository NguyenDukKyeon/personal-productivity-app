export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err(code: string, message: string): Result<never> {
  return { ok: false, code, message };
}
