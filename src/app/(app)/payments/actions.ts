'use server';

import { revalidatePath } from 'next/cache';

import { canManageStudent, requireCoach } from '@/lib/auth';
import { fail, NOT_PERMITTED, ok, type ActionResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';
import type { PaymentStatus } from '@/lib/types/database';

const STATUSES: PaymentStatus[] = ['paid', 'pending', 'overdue'];

/** Manual status toggle — there is no payment gateway, coaches mark fees by hand. */
export async function setPaymentStatusAction(formData: FormData): Promise<ActionResult> {
  await requireCoach();

  const paymentId = String(formData.get('payment_id') ?? '');
  const status = String(formData.get('status') ?? '') as PaymentStatus;

  if (!paymentId) return fail('No payment selected.');
  if (!STATUSES.includes(status)) return fail('Invalid payment status.');

  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('payments')
    .update({ status })
    .eq('id', paymentId)
    .select('status')
    .maybeSingle();

  if (error) return fail(error.message);
  if (updated?.status !== status) return fail(NOT_PERMITTED);

  revalidatePath('/payments');
  revalidatePath('/dashboard');

  return ok();
}

export async function createPaymentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCoach();

  const studentId = String(formData.get('student_id') ?? '');
  const amount = Number(formData.get('amount') ?? 0);
  const billingCycle = String(formData.get('billing_cycle') ?? '').trim();
  const dueDate = String(formData.get('due_date') ?? '');
  const status = String(formData.get('status') ?? 'pending') as PaymentStatus;

  if (!studentId) return fail('Pick a student.');
  if (!Number.isFinite(amount) || amount <= 0) return fail('Enter an amount above zero.');
  if (!billingCycle) return fail('Name the billing cycle, e.g. "October 2026".');
  if (!dueDate) return fail('Pick a due date.');
  if (!STATUSES.includes(status)) return fail('Invalid payment status.');

  const supabase = await createClient();

  const { data: student } = await supabase
    .from('profiles')
    .select('id, role, location_id')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) return fail('Student not found.');
  if (!canManageStudent(session, student)) return fail(NOT_PERMITTED);

  /*
   * (student_id, billing_cycle) is unique, so re-raising an invoice for the same
   * month updates the existing one instead of failing with a duplicate-key error
   * the coach can do nothing about.
   */
  const { error } = await supabase.from('payments').upsert(
    {
      student_id: studentId,
      amount,
      billing_cycle: billingCycle,
      due_date: dueDate,
      status,
    },
    { onConflict: 'student_id,billing_cycle' },
  );

  if (error) return fail(error.message);

  revalidatePath('/payments');
  revalidatePath('/dashboard');

  return ok(`Invoice saved for ${billingCycle}.`);
}
