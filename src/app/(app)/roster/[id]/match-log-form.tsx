'use client';

import { Plus } from 'lucide-react';
import { useActionState, useState } from 'react';

import { logMatchAction } from '@/app/(app)/roster/actions';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { Field, FormMessage, Input, Select, Textarea } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import type { ActionResult } from '@/lib/action-result';
import { useCloseOnSuccess } from '@/lib/use-close-on-success';
import { todayISO } from '@/lib/utils';

export function MatchLogForm({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useActionState<ActionResult, FormData>(logMatchAction, {});

  // Close only on success, so a validation error keeps the typed values on screen.
  useCloseOnSuccess(state, () => setOpen(false));

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Log match
      </Button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Log a match"
        description={`Tournament or ladder result for ${studentName}.`}
      >
        <form action={submit} className="flex flex-col gap-3.5">
          <input type="hidden" name="student_id" value={studentId} />

          {state && 'ok' in state && !state.ok ? (
            <FormMessage tone="error">{state.error}</FormMessage>
          ) : null}

          <Field label="Tournament / event" htmlFor="tournament_name">
            <Input
              id="tournament_name"
              name="tournament_name"
              placeholder="District Open 2026"
              required
            />
          </Field>

          <Field label="Opponent" htmlFor="opponent_name">
            <Input id="opponent_name" name="opponent_name" placeholder="R. Sharma" required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Score" htmlFor="score" hint="e.g. 21-18, 19-21, 21-15">
              <Input id="score" name="score" placeholder="21-18, 21-15" />
            </Field>

            <Field label="Result" htmlFor="result">
              <Select id="result" name="result" defaultValue="win">
                <option value="win">Win</option>
                <option value="loss">Loss</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unforced errors" htmlFor="unforced_errors">
              <Input
                id="unforced_errors"
                name="unforced_errors"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={0}
              />
            </Field>

            <Field label="Date" htmlFor="date">
              <Input id="date" name="date" type="date" defaultValue={todayISO()} required />
            </Field>
          </div>

          <Field label="Technical notes" htmlFor="coach_notes">
            <Textarea
              id="coach_notes"
              name="coach_notes"
              rows={3}
              placeholder="Backhand clear kept landing short under pressure."
            />
          </Field>

          <Button type="submit" size="full" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? 'Saving…' : 'Save match log'}
          </Button>
        </form>
      </Drawer>
    </>
  );
}
