'use server';

import { revalidatePath } from 'next/cache';

import { requireApproved } from '@/lib/auth';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { createClient } from '@/lib/supabase/server';

/**
 * Self-service edit of name and phone.
 *
 * Only these two columns are sent. Even if a caller forged role or rank into the
 * payload, guard_profile_update() would restore the old values — this is the
 * convenience layer, not the security boundary.
 */
export async function updateOwnProfileAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireApproved();

  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();

  if (!fullName) return fail('Your name cannot be blank.');

  const digits = phone.replace(/\D/g, '');
  if (phone && digits.length < 10) return fail('Enter a valid phone number.');

  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone: phone || null })
    .eq('id', session.userId);

  if (error) return fail(error.message);

  revalidatePath('/profile');
  revalidatePath('/menu');
  revalidatePath('/dashboard');
  revalidatePath('/leaderboard');

  return ok('Profile updated.');
}
