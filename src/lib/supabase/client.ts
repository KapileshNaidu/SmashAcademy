import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/lib/types/database';
import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase/env';

/** Browser-side client. Reads the session from the cookies middleware keeps fresh. */
export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
  );
}
