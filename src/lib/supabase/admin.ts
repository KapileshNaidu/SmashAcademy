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
import { supabaseSecretKey, supabaseUrl } from '@/lib/supabase/env';

export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
