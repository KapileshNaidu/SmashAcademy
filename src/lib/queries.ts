import 'server-only';

import type { SessionContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { AttendanceStatus, ProfileWithLocation } from '@/lib/types/database';

export interface AttendanceSummary {
  present: number;
  absent: number;
  excused: number;
  total: number;
  /** present / (present + absent). Excused sessions are removed from the denominator. */
  percentage: number;
}

export function summarizeAttendance(rows: { status: AttendanceStatus }[]): AttendanceSummary {
  const present = rows.filter((row) => row.status === 'present').length;
  const absent = rows.filter((row) => row.status === 'absent').length;
  const excused = rows.filter((row) => row.status === 'excused').length;

  // An excused absence is not a missed session the student is accountable for,
  // so it is excluded from the ratio rather than counted as attended.
  const assessable = present + absent;

  return {
    present,
    absent,
    excused,
    total: rows.length,
    percentage: assessable === 0 ? 0 : Math.round((present / assessable) * 100),
  };
}

/**
 * How to embed a student's location.
 *
 * The FK hint is not optional. There are TWO relationship paths between
 * `profiles` and `locations` — the direct `profiles.location_id` FK, and the
 * many-to-many through `coach_locations` — so a bare `locations(...)` embed is
 * ambiguous. PostgREST refuses to guess and fails the whole request with
 * PGRST201 / HTTP 300, which reads as "no students" at the UI. Naming the
 * constraint picks the direct FK.
 */
export const LOCATION_EMBED = 'location:locations!profiles_location_id_fkey(id, name, city_area)';

/**
 * Students the caller may act on.
 *
 * RLS would filter this anyway, but scoping the query by location keeps a junior
 * coach's roster small and makes the intent explicit at the call site.
 */
export async function fetchManagedStudents(
  session: SessionContext,
  options: { approvalStatus?: 'approved' | 'pending' | 'rejected' } = {},
): Promise<ProfileWithLocation[]> {
  const supabase = await createClient();

  let query = supabase.from('profiles').select(`*, ${LOCATION_EMBED}`).eq('role', 'student');

  if (options.approvalStatus) {
    query = query.eq('approval_status', options.approvalStatus);
  }

  // A junior coach sees only their mapped locations. Unplaced students are not a
  // shared pool: only the head coach reviews registrations, and an unplaced
  // student has no location to match, so this yields nothing for an unmapped coach.
  if (!session.isHeadCoach) {
    if (session.coachLocationIds.length === 0) return [];

    query = query.in('location_id', session.coachLocationIds);
  }

  const { data, error } = await query.order('full_name');

  // Swallowing this is how the PGRST201 embed ambiguity above hid for so long:
  // a failed request and a genuinely empty roster both rendered as "nothing here".
  if (error) {
    throw new Error(`fetchManagedStudents failed: ${error.message} (${error.code})`);
  }

  return (data as ProfileWithLocation[] | null) ?? [];
}

export async function fetchLocations() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('locations').select('*').order('name');

  if (error) throw new Error(`fetchLocations failed: ${error.message} (${error.code})`);

  return data ?? [];
}
