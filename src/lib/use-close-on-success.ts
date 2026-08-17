'use client';

import { useState } from 'react';

import type { ActionResult } from '@/lib/action-result';

/**
 * Close a sheet once its Server Action reports success, leaving it open — with
 * the user's typed values intact — when the action reports a validation error.
 *
 * Adjusts state during render rather than from an effect. React re-runs the
 * component immediately without painting the intermediate frame, so there is no
 * cascading-render round trip and no flash of the sheet closing and reopening.
 * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */
export function useCloseOnSuccess(state: ActionResult, close: () => void) {
  const [seen, setSeen] = useState(state);

  if (state !== seen) {
    setSeen(state);
    if (state && 'ok' in state && state.ok) close();
  }
}
