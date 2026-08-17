'use server';

import { revalidatePath } from 'next/cache';

import { requireHeadCoach } from '@/lib/auth';
import { isValidRank } from '@/lib/rank';
import { fail, NOT_PERMITTED, ok, type ActionResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';

/**
 * Approve a self-registered student: flip them to `approved` and place them in a
 * location and starting rank.
 *
 * The spec calls this "assign to location and batch"; the schema has no batches,
 * so a student's batch is their (location, rank) pair — location decides which
 * coaches can see them, rank decides which group they train with.
 *
 * Head coach only, enforced three deep: this guard, the `/approvals` route, and
 * guard_profile_update() in Postgres, which reverts approval_status for anyone
 * else even on a hand-rolled POST straight at PostgREST.
 */
export async function approveStudentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireHeadCoach();

  const studentId = String(formData.get('student_id') ?? '');
  const locationId = String(formData.get('location_id') ?? '');
  const rank = String(formData.get('rank') ?? 'beginner_3');

  if (!studentId) return fail('No student selected.');
  if (!locationId) return fail('Pick a location for this student.');
  if (!isValidRank(rank)) return fail('Pick a valid starting rank.');

  const supabase = await createClient();

  const { data: student, error: readError } = await supabase
    .from('profiles')
    .select('id, role, location_id, approval_status')
    .eq('id', studentId)
    .maybeSingle();

  if (readError || !student) return fail('That student is no longer available.');
  if (student.role !== 'student') return fail('Only student accounts go through approval.');

  /*
   * Read the row back rather than trusting a 200. guard_profile_update() reverts
   * privileged columns silently when the caller is not entitled to change them,
   * so "no error" does not mean "it applied".
   */
  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ approval_status: 'approved', location_id: locationId, rank })
    .eq('id', studentId)
    .select('approval_status, location_id, rank')
    .maybeSingle();

  if (error) return fail(error.message);
  if (!updated || updated.approval_status !== 'approved' || updated.location_id !== locationId) {
    return fail(NOT_PERMITTED);
  }

  revalidatePath('/approvals');
  revalidatePath('/roster');
  revalidatePath('/dashboard');
  revalidatePath('/leaderboard');

  return ok('Student approved.');
}

export async function rejectStudentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireHeadCoach();
  const studentId = String(formData.get('student_id') ?? '');

  if (!studentId) return fail('No student selected.');

  const supabase = await createClient();

  const { data: student } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) return fail('That student is no longer available.');
  if (student.role !== 'student') return fail('Only student accounts go through approval.');

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ approval_status: 'rejected' })
    .eq('id', studentId)
    .select('approval_status')
    .maybeSingle();

  if (error) return fail(error.message);
  if (updated?.approval_status !== 'rejected') return fail(NOT_PERMITTED);

  revalidatePath('/approvals');
  revalidatePath('/dashboard');

  return ok('Registration rejected.');
}
