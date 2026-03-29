import { AppException } from '../exceptions/app.exception';

export type Result<T, E extends AppException = AppException> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

/** Construct a successful Result. */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/** Construct a failed Result. */
export function err<E extends AppException>(error: E): Result<never, E> {
  return { success: false, error };
}
