/** Shared shape for every Server Action, so forms can render feedback uniformly. */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }
  | Record<string, never>;

export const ok = (message?: string): ActionResult => ({ ok: true, message });
export const fail = (error: string): ActionResult => ({ ok: false, error });

/**
 * Standard failure text for a write that RLS or the profiles guard trigger
 * refused.
 *
 * guard_profile_update() reverts privileged columns instead of raising, so a
 * rejected write comes back as HTTP 200 with unchanged data. Every action that
 * touches those columns reads the row back and calls this when the value it
 * asked for is not the value that landed.
 */
export const NOT_PERMITTED =
  'That change was rejected — you may not have permission for this student or location.';
