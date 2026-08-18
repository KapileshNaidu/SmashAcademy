import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase/env';

import type { Database } from '@/lib/types/database';

/**
 * Server client for Server Components, Server Actions and Route Handlers.
 * Always create a fresh one per request — never hoist this into a module const,
 * or one user's session leaks into another's render.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. Middleware already refreshed
            // the session for this request, so dropping the write is safe.
          }
        },
      },
    },
  );
}
