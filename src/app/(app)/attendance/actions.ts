'use server';

import { revalidatePath } from 'next/cache';

import { requireCoach } from '@/lib/auth';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';
import type { AttendanceStatus } from '@/lib/types/database';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'excused'];

/**
 * Record one student's attendance for one date.
 *
 * Upserts on the (student_id, date) unique index, so a coach tapping
 * Present → Absent → Present updates a single row instead of stacking three.
 */
export async function markAttendanceAction(formData: FormData): Promise<ActionResult> {
  const session = await requireCoach();

  const studentId = String(formData.get('student_id') ?? '');
  const locationId = String(formData.get('location_id') ?? '');
  const date = String(formData.get('date') ?? '');
  const status = String(formData.get('status') ?? '') as AttendanceStatus;

  if (!studentId || !locationId || !date) return fail('Missing roll-call details.');
  if (!STATUSES.includes(status)) return fail('Invalid attendance status.');

  if (!session.isHeadCoach && !session.coachLocationIds.includes(locationId)) {
    return fail('You do not coach at that location.');
  }

  const supabase = await createClient();

  const { error } = await supabase.from('sessions_attendance').upsert(
    {
      student_id: studentId,
      coach_id: session.userId,
      location_id: locationId,
      date,
      status,
    },
    { onConflict: 'student_id,date' },
  );

  if (error) return fail(error.message);

  revalidatePath('/attendance');
  revalidatePath('/dashboard');
  revalidatePath(`/roster/${studentId}`);

  return ok();
}
