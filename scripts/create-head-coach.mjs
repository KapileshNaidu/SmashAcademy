#!/usr/bin/env node
/**
 * Bootstrap the first head coach.
 *
 * Chicken-and-egg: junior coaches are created from inside the app by a head
 * coach, and the signup form only ever produces pending students — so the very
 * first privileged account has to be minted out-of-band. This script does it
 * with the service key.
 *
 *   node scripts/create-head-coach.mjs --email head@academy.com \
 *        --password 'a-strong-password' --name 'Priya Menon' [--phone 9876543210]
 *
 * Re-running with the same email promotes the existing account instead of
 * failing, which makes it safe to use as a repair tool.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

// Read .env.local directly — this runs outside Next.js, which is what loads it.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  (await readFile(join(root, '.env.local'), 'utf8'))
    .split('\n')
    .filter((line) => line.trim() && !line.trimStart().startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const email = arg('email');
const password = arg('password');
const name = arg('name') ?? 'Head Coach';
const phone = arg('phone') ?? null;

if (!email || !password) {
  console.error(
    'Usage: node scripts/create-head-coach.mjs --email <email> --password <password> [--name "Full Name"] [--phone <number>]',
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// email_confirm skips the verification mail — this account is created by whoever
// already holds the service key, so there is nothing left to prove.
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: name, phone },
});

let userId = data?.user?.id;

if (error) {
  if (!error.message.toLowerCase().includes('already')) {
    console.error(`Could not create the account: ${error.message}`);
    process.exit(1);
  }

  console.log('An account with that email already exists — promoting it instead.');

  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error(`Could not look up the existing account: ${listError.message}`);
    process.exit(1);
  }

  userId = list.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id;
}

if (!userId) {
  console.error('Could not resolve the user id.');
  process.exit(1);
}

// handle_new_user() has already inserted a pending student row; stamp the role.
const { error: profileError } = await supabase.from('profiles').upsert({
  id: userId,
  full_name: name,
  phone,
  role: 'head_coach',
  approval_status: 'approved',
});

if (profileError) {
  console.error(`Account exists but the profile update failed: ${profileError.message}`);
  process.exit(1);
}

console.log(`\nHead coach ready.\n  email: ${email}\n  id:    ${userId}\n\nSign in at /login.\n`);
