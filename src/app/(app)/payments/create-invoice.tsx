'use client';

import { Plus } from 'lucide-react';
import { useActionState, useState } from 'react';

import { createPaymentAction } from '@/app/(app)/payments/actions';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { Field, FormMessage, Input, Select } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import type { ActionResult } from '@/lib/action-result';
import { useCloseOnSuccess } from '@/lib/use-close-on-success';
import type { ProfileWithLocation } from '@/lib/types/database';
import { billingCycleLabel, todayISO } from '@/lib/utils';

export function CreateInvoice({ students }: { students: ProfileWithLocation[] }) {
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useActionState<ActionResult, FormData>(createPaymentAction, {});

  useCloseOnSuccess(state, () => setOpen(false));

  // Default the due date to the 5th of the current month — the academy's cutoff.
  const dueDefault = `${todayISO().slice(0, 8)}05`;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={students.length === 0}>
        <Plus />
        Invoice
      </Button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Raise an invoice"
        description="Re-using a billing cycle updates that student's existing invoice."
      >
        <form action={submit} className="flex flex-col gap-3.5">
          {state && 'ok' in state && !state.ok ? (
            <FormMessage tone="error">{state.error}</FormMessage>
          ) : null}

          <Field label="Student" htmlFor="student_id">
            <Select id="student_id" name="student_id" required defaultValue="">
              <option value="" disabled>
                Choose a student…
              </option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹)" htmlFor="amount">
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min={1}
                step="1"
                placeholder="2500"
                required
              />
            </Field>

            <Field label="Due date" htmlFor="due_date">
              <Input id="due_date" name="due_date" type="date" defaultValue={dueDefault} required />
            </Field>
          </div>

          <Field label="Billing cycle" htmlFor="billing_cycle">
            <Input
              id="billing_cycle"
              name="billing_cycle"
              defaultValue={billingCycleLabel()}
              placeholder="October 2026"
              required
            />
          </Field>

          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue="pending">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </Select>
          </Field>

          <Button type="submit" size="full" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? 'Saving…' : 'Save invoice'}
          </Button>
        </form>
      </Drawer>
    </>
  );
}
