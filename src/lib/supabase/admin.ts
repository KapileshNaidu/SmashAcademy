import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/types/database';

/**
 * Service-role client. Bypasses RLS entirely and can reach the Admin Auth API.
 *
 * Only two jobs need it, both of which the head coach triggers from a Server
 * Action that has already re-verified their role against the database:
 *   - creating a junior-coach auth user (`auth.admin.createUser`)
 *   - stamping that new profile with role='junior_coach' + approved
 *
 * Never import this into a Client Component. The `server-only` guard turns a
 * mistaken client import into a build error rather than a leaked secret.
 */
import 'server-only';

export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!secret) {
    throw new Error('SUPABASE_SECRET_KEY is not set — cannot use the admin client.');
  }

  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
