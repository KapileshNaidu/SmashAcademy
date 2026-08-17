'use server';

import { revalidatePath } from 'next/cache';

import { requireHeadCoach } from '@/lib/auth';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// --- Locations ------------------------------------------------------------

export async function saveLocationAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireHeadCoach();

  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const cityArea = String(formData.get('city_area') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();
  const totalCourts = Number(formData.get('total_courts') ?? 0);

  if (!name) return fail('Name the location, e.g. "North Hub - Court 1-4".');
  if (!cityArea) return fail('Enter the city area, e.g. "Indiranagar".');
  if (!Number.isInteger(totalCourts) || totalCourts < 1) {
    return fail('Court count must be a whole number of 1 or more.');
  }

  const supabase = await createClient();
  const values = { name, city_area: cityArea, address: address || null, total_courts: totalCourts };

  const { error } = id
    ? await supabase.from('locations').update(values).eq('id', id)
    : await supabase.from('locations').insert(values);

  if (error) return fail(error.message);

  revalidatePath('/admin/locations');
  revalidatePath('/attendance');
  revalidatePath('/roster');

  return ok(id ? 'Location updated.' : 'Location created.');
}

export async function deleteLocationAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireHeadCoach();

  const id = String(formData.get('id') ?? '');
  if (!id) return fail('No location selected.');

  const supabase = await createClient();

  /*
   * Refuse rather than cascade. profiles.location_id is ON DELETE SET NULL, so
   * deleting a busy location would quietly return every student to the
   * unassigned intake pool — a destructive surprise dressed up as a tidy-up.
   */
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('location_id', id);

  if (count && count > 0) {
    return fail(
      `${count} ${count === 1 ? 'person is' : 'people are'} still assigned here. Move them first.`,
    );
  }

  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) return fail(error.message);

  revalidatePath('/admin/locations');

  return ok('Location deleted.');
}

// --- Junior coaches -------------------------------------------------------

/**
 * Create a junior-coach account and map it to locations.
 *
 * This is the only place a privileged role is ever granted, and it runs with the
 * service key on the server after requireHeadCoach() has re-verified the caller
 * against the database. The public signup path cannot reach it.
 */
export async function createJuniorCoachAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireHeadCoach();

  const fullName = String(formData.get('full_name') ?? '').trim();
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const locationIds = formData.getAll('location_ids').map(String).filter(Boolean);

  if (!fullName) return fail("Enter the coach's full name.");
  if (!email) return fail('Enter an email address.');
  if (password.length < 8) return fail('Set a temporary password of at least 8 characters.');
  if (locationIds.length === 0) return fail('Map the coach to at least one location.');

  const admin = createAdminClient();

  // email_confirm: true — the head coach vouches for the address, so the coach
  // can sign in immediately instead of waiting on a confirmation mail.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (error) {
    return fail(
      error.message.toLowerCase().includes('already')
        ? 'An account with that email already exists.'
        : error.message,
    );
  }

  const userId = data.user?.id;
  if (!userId) return fail('The account was not created. Try again.');

  /*
   * handle_new_user() has already inserted this profile as a pending student
   * (it ignores signup metadata by design). Upsert stamps the real role — and
   * upsert rather than update so a partially-created account from an earlier
   * failed attempt still converges.
   */
  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    phone: phone || null,
    role: 'junior_coach',
    approval_status: 'approved',
    location_id: locationIds[0],
  });

  if (profileError) return fail(profileError.message);

  const { error: mappingError } = await admin
    .from('coach_locations')
    .upsert(locationIds.map((locationId) => ({ coach_id: userId, location_id: locationId })));

  if (mappingError) return fail(mappingError.message);

  revalidatePath('/admin/coaches');
  revalidatePath('/dashboard');

  return ok(`${fullName} can now sign in with ${email}.`);
}

export async function updateCoachLocationsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireHeadCoach();

  const coachId = String(formData.get('coach_id') ?? '');
  const locationIds = formData.getAll('location_ids').map(String).filter(Boolean);

  if (!coachId) return fail('No coach selected.');
  if (locationIds.length === 0) return fail('A coach needs at least one location.');

  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from('coach_locations')
    .delete()
    .eq('coach_id', coachId);

  if (deleteError) return fail(deleteError.message);

  const { error } = await supabase
    .from('coach_locations')
    .insert(locationIds.map((locationId) => ({ coach_id: coachId, location_id: locationId })));

  if (error) return fail(error.message);

  // Keep the coach's headline location pointing at somewhere they still cover.
  await supabase.from('profiles').update({ location_id: locationIds[0] }).eq('id', coachId);

  revalidatePath('/admin/coaches');

  return ok('Locations updated.');
}
