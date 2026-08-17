'use server';

import { revalidatePath } from 'next/cache';

import { canManageStudent, requireCoach } from '@/lib/auth';
import { isValidRank } from '@/lib/rank';
import { fail, NOT_PERMITTED, ok, type ActionResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';
import { todayISO } from '@/lib/utils';

/**
 * Load the student and confirm the caller is entitled to act on them.
 *
 * Returns an explicitly discriminated union rather than leaning on inference:
 * `ok` gives every call site a single, unambiguous check before it reaches for
 * `session`/`supabase`/`student`.
 */
type StudentAuth =
  | { ok: false; error: string }
  | {
      ok: true;
      session: Awaited<ReturnType<typeof requireCoach>>;
      supabase: Awaited<ReturnType<typeof createClient>>;
      student: { id: string; full_name: string };
    };

async function authorizeStudent(studentId: string): Promise<StudentAuth> {
  const session = await requireCoach();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from('profiles')
    .select('id, role, location_id, full_name, rank')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) return { ok: false, error: 'Student not found.' };
  if (!canManageStudent(session, student)) return { ok: false, error: NOT_PERMITTED };

  return { ok: true, session, supabase, student };
}

/** Promote or demote a student. Head coach anywhere; junior coach at their own locations. */
export async function setRankAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const studentId = String(formData.get('student_id') ?? '');
  const rank = String(formData.get('rank') ?? '');

  if (!studentId) return fail('No student selected.');
  if (!isValidRank(rank)) return fail('Pick a valid rank.');

  const auth = await authorizeStudent(studentId);
  if (!auth.ok) return fail(auth.error);

  const { data: updated, error } = await auth.supabase
    .from('profiles')
    .update({ rank })
    .eq('id', studentId)
    .select('rank')
    .maybeSingle();

  if (error) return fail(error.message);
  if (updated?.rank !== rank) return fail(NOT_PERMITTED);

  revalidatePath('/leaderboard');
  revalidatePath('/roster');
  revalidatePath(`/roster/${studentId}`);
  revalidatePath('/dashboard');

  return ok(`Rank updated for ${auth.student.full_name}.`);
}

export async function logMatchAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const studentId = String(formData.get('student_id') ?? '');
  const tournamentName = String(formData.get('tournament_name') ?? '').trim();
  const opponentName = String(formData.get('opponent_name') ?? '').trim();
  const score = String(formData.get('score') ?? '').trim();
  const result = String(formData.get('result') ?? '');
  const unforcedErrors = Number(formData.get('unforced_errors') ?? 0);
  const coachNotes = String(formData.get('coach_notes') ?? '').trim();
  const date = String(formData.get('date') ?? '') || todayISO();

  if (!studentId) return fail('No student selected.');
  if (!tournamentName) return fail('Name the tournament or ladder match.');
  if (!opponentName) return fail('Enter the opponent.');
  if (result !== 'win' && result !== 'loss') return fail('Record the result as a win or a loss.');
  if (!Number.isFinite(unforcedErrors) || unforcedErrors < 0) {
    return fail('Unforced errors must be zero or more.');
  }

  const auth = await authorizeStudent(studentId);
  if (!auth.ok) return fail(auth.error);

  // recorded_by must equal auth.uid() — the match_logs insert policy checks it.
  const { error } = await auth.supabase.from('match_logs').insert({
    student_id: studentId,
    recorded_by: auth.session.userId,
    tournament_name: tournamentName,
    opponent_name: opponentName,
    score: score || null,
    result,
    unforced_errors: Math.floor(unforcedErrors),
    coach_notes: coachNotes || null,
    date,
  });

  if (error) return fail(error.message);

  revalidatePath(`/roster/${studentId}`);
  revalidatePath('/matches');

  return ok('Match logged.');
}

export async function saveEvaluationAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const studentId = String(formData.get('student_id') ?? '');

  const scores = {
    footwork: Number(formData.get('footwork') ?? 0),
    stamina: Number(formData.get('stamina') ?? 0),
    smash_power: Number(formData.get('smash_power') ?? 0),
    net_control: Number(formData.get('net_control') ?? 0),
  };

  if (!studentId) return fail('No student selected.');

  for (const [key, value] of Object.entries(scores)) {
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      return fail(`${key.replace('_', ' ')} must be a whole number from 1 to 10.`);
    }
  }

  const auth = await authorizeStudent(studentId);
  if (!auth.ok) return fail(auth.error);

  const { error } = await auth.supabase
    .from('skill_evaluations')
    .insert({ student_id: studentId, ...scores });

  if (error) return fail(error.message);

  revalidatePath(`/roster/${studentId}`);
  revalidatePath('/dashboard');

  return ok('Evaluation saved.');
}
