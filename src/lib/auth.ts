import 'server-only';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/lib/types/database';

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Profile;
  /** Locations this account may act at. Empty for students; every location for the head coach. */
  coachLocationIds: string[];
  isHeadCoach: boolean;
  isJuniorCoach: boolean;
  isCoach: boolean;
  isStudent: boolean;
}

/**
 * Resolve the caller once per request.
 *
 * Middleware already gates routes, but every page and action re-checks here.
 * Middleware protects navigation; this protects data. A Server Action reached
 * by a hand-rolled POST never passes through the matcher, so authorization that
 * lives only in middleware is authorization that can be skipped.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const isHeadCoach = profile.role === 'head_coach';
  const isJuniorCoach = profile.role === 'junior_coach';

  let coachLocationIds: string[] = [];

  if (isHeadCoach) {
    // The head coach is not enumerated in coach_locations; they cover everything.
    const { data: locations } = await supabase.from('locations').select('id');
    coachLocationIds = locations?.map((row) => row.id) ?? [];
  } else if (isJuniorCoach) {
    const { data: mappings } = await supabase
      .from('coach_locations')
      .select('location_id')
      .eq('coach_id', user.id);
    coachLocationIds = mappings?.map((row) => row.location_id) ?? [];
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    coachLocationIds,
    isHeadCoach,
    isJuniorCoach,
    isCoach: isHeadCoach || isJuniorCoach,
    isStudent: profile.role === 'student',
  };
}

/** Any signed-in, approved account. Sends everyone else where they belong. */
export async function requireApproved(): Promise<SessionContext> {
  const session = await getSessionContext();

  if (!session) redirect('/login');
  if (session.profile.approval_status !== 'approved') redirect('/pending');

  return session;
}

export async function requireCoach(): Promise<SessionContext> {
  const session = await requireApproved();
  if (!session.isCoach) redirect('/dashboard');

  return session;
}

export async function requireHeadCoach(): Promise<SessionContext> {
  const session = await requireApproved();
  if (!session.isHeadCoach) redirect('/dashboard');

  return session;
}

/**
 * Authorization check for a single student, mirroring the SQL
 * `can_manage_student()` helper so the UI can hide what RLS would reject.
 */
export function canManageStudent(
  session: SessionContext,
  student: Pick<Profile, 'role' | 'location_id'>,
): boolean {
  if (session.isHeadCoach) return true;
  if (!session.isCoach) return false;
  if (student.role !== 'student') return false;

  // No intake-pool branch, matching the SQL: an unplaced student is a pending
  // registration, and only the head coach (short-circuited above) handles those.
  if (!student.location_id) return false;

  return session.coachLocationIds.includes(student.location_id);
}

export const ROLE_LABEL: Record<UserRole, string> = {
  head_coach: 'Head Coach',
  junior_coach: 'Junior Coach',
  student: 'Student',
};
