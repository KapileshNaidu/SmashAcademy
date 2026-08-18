import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database, UserRole } from '@/lib/types/database';
import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase/env';

/** Reachable without a session. */
const PUBLIC_ROUTES = ['/login', '/signup', '/auth'];

/** Head-coach only. Approving registrations admits people to the academy. */
const HEAD_COACH_ROUTES = ['/admin', '/approvals'];

/** Any coach. */
const COACH_ROUTES = ['/attendance', '/roster'];

function matches(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Refresh the Supabase session cookie and gate routes by role.
 *
 * The cookie dance below is fussy on purpose: `getUser()` may rotate the auth
 * token, and the rotated cookie has to land on BOTH the request (so the
 * downstream render sees it) and the response (so the browser stores it). That
 * is why the response is rebuilt inside setAll rather than mutated afterwards.
 *
 * Anything that returns early with a redirect must copy the refreshed cookies
 * across, or the very next request arrives with a stale token and the user
 * bounces between /login and /dashboard.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = matches(pathname, PUBLIC_ROUTES);

  /** Preserve cookies set during this request when short-circuiting. */
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';

    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }

    return redirect;
  };

  if (!user) {
    return isPublic ? response : redirectTo('/login');
  }

  // Signed in. One lightweight read decides everything below; RLS lets a user
  // read their own row regardless of approval state.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, approval_status')
    .eq('id', user.id)
    .maybeSingle();

  // The row is created by an auth trigger. If it is missing the account is in a
  // broken state — sign out rather than loop on redirects.
  if (!profile) {
    await supabase.auth.signOut();
    return redirectTo('/login');
  }

  const approved = profile.approval_status === 'approved';
  const role = profile.role as UserRole;

  if (isPublic) {
    return redirectTo(approved ? '/dashboard' : '/pending');
  }

  if (!approved) {
    return pathname === '/pending' ? response : redirectTo('/pending');
  }

  // Approved users have no reason to sit on the waiting screen.
  if (pathname === '/pending') {
    return redirectTo('/dashboard');
  }

  if (matches(pathname, HEAD_COACH_ROUTES) && role !== 'head_coach') {
    return redirectTo('/dashboard');
  }

  if (matches(pathname, COACH_ROUTES) && role === 'student') {
    return redirectTo('/dashboard');
  }

  return response;
}
