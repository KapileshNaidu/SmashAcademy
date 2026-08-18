/**
 * Validated access to the Supabase environment variables.
 *
 * These used to be read as `process.env.FOO!`. The `!` is a lie the compiler
 * believes: a missing variable becomes `undefined` at runtime, `createServerClient`
 * throws deep inside the SDK, and because that happens in `proxy.ts` — which runs
 * on every request — the whole site returns a bare "Internal Server Error" with
 * nothing naming the cause. That is exactly what a first Vercel deploy looks like,
 * since `.env.local` is gitignored and never reaches the host.
 *
 * So read them through here instead: same failure, but it says which variable is
 * missing and where to set it.
 */

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. ` +
        `Set it locally in .env.local, and on Vercel under ` +
        `Settings → Environment Variables (then redeploy — env changes do not ` +
        `apply to an existing build).`,
    );
  }

  return value;
}

/** Project URL and publishable key. Safe to expose; RLS is what guards the data. */
export function supabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL');
}

export function supabasePublishableKey(): string {
  return required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}

/** Service-role key. Server-only — it bypasses RLS entirely. */
export function supabaseSecretKey(): string {
  return required('SUPABASE_SECRET_KEY');
}
