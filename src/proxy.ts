import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

/**
 * Next.js 16 renamed the `middleware` convention to `proxy` (see
 * node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md). This is
 * the same Supabase SSR session middleware the @supabase/ssr docs describe, just
 * under the current filename and export name.
 *
 * Bonus from the rename: `proxy` runs on the Node runtime rather than Edge, so
 * the profile lookup in updateSession() is a plain Node fetch.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Auth cookies must be
     * refreshed on real navigations, not on every .png the page pulls in.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
