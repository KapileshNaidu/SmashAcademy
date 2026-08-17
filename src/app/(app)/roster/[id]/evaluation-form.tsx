'use client';

import { Target } from 'lucide-react';
import { useActionState, useState } from 'react';

import { saveEvaluationAction } from '@/app/(app)/roster/actions';
import { SKILL_KEYS, SKILL_LABELS } from '@/components/skill-radar';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { FormMessage } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import type { ActionResult } from '@/lib/action-result';
import { useCloseOnSuccess } from '@/lib/use-close-on-success';
import type { SkillEvaluation } from '@/lib/types/database';

const DEFAULT_SCORE = 5;

/**
 * Score the four technical skills 1-10.
 *
 * Range sliders rather than number inputs: a coach doing this courtside is
 * dragging with a thumb, not typing. The live value beside each label keeps the
 * exact number visible, which a slider alone would hide.
 */
export function EvaluationForm({
  studentId,
  latest,
}: {
  studentId: string;
  latest: SkillEvaluation | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useActionState<ActionResult, FormData>(
    saveEvaluationAction,
    {},
  );

  // Seed from the previous assessment — evaluations usually nudge, not reset.
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(SKILL_KEYS.map((key) => [key, latest?.[key] ?? DEFAULT_SCORE])),
  );

  useCloseOnSuccess(state, () => setOpen(false));

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Target />
        {latest ? 'New assessment' : 'Evaluate'}
      </Button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Skill evaluation"
        description="Rate each area from 1 to 10."
      >
        <form action={submit} className="flex flex-col gap-5">
          <input type="hidden" name="student_id" value={studentId} />

          {state && 'ok' in state && !state.ok ? (
            <FormMessage tone="error">{state.error}</FormMessage>
          ) : null}

          {SKILL_KEYS.map((key) => (
            <div key={key}>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor={key} className="text-xs font-semibold text-slate-700">
                  {SKILL_LABELS[key]}
                </label>
                <span className="text-sm font-bold tabular-nums text-court-700">
                  {scores[key]}
                  <span className="text-[11px] font-medium text-slate-400">/10</span>
                </span>
              </div>

              <input
                id={key}
                name={key}
                type="range"
                min={1}
                max={10}
                step={1}
                value={scores[key]}
                onChange={(event) =>
                  setScores((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-court-600"
              />

              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>Developing</span>
                <span>Elite</span>
              </div>
            </div>
          ))}

          <Button type="submit" size="full" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? 'Saving…' : 'Save evaluation'}
          </Button>
        </form>
      </Drawer>
    </>
  );
}
