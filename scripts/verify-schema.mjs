#!/usr/bin/env node
/**
 * Post-migration check: confirms tables, RLS, policies, helper functions and
 * triggers all exist, and that the rank enum is in the right order.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/verify-schema.mjs
 *
 * Checks the properties the app actually depends on rather than just "did the
 * migration return 200" — a policy that silently failed to create is exactly the
 * kind of thing that looks fine until a student can read another student's fees.
 */

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'zkhyesmbhyaphmyvneov';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is not set.');
  process.exit(1);
}

async function query(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    },
  );

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

const EXPECTED_TABLES = [
  'coach_locations',
  'locations',
  'match_logs',
  'payments',
  'profiles',
  'sessions_attendance',
  'skill_evaluations',
];

const EXPECTED_FUNCTIONS = [
  'can_manage_student',
  'coach_covers_location',
  'guard_profile_update',
  'handle_new_user',
  'is_approved',
  'is_coach',
  'is_head_coach',
];

let failures = 0;

function check(label, passed, detail = '') {
  console.log(`${passed ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

// Tables + RLS ---------------------------------------------------------------
const tables = await query(`
  select tablename, rowsecurity
  from pg_tables
  where schemaname = 'public'
  order by tablename;
`);

console.log('\nTables and RLS');
for (const name of EXPECTED_TABLES) {
  const row = tables.find((table) => table.tablename === name);
  check(name, Boolean(row) && row.rowsecurity === true, row ? 'RLS enabled' : 'missing');
}

// Policies -------------------------------------------------------------------
const policies = await query(`
  select tablename, count(*)::int as policy_count
  from pg_policies
  where schemaname = 'public'
  group by tablename
  order by tablename;
`);

console.log('\nRLS policies');
for (const name of EXPECTED_TABLES) {
  const row = policies.find((policy) => policy.tablename === name);
  check(name, Boolean(row) && row.policy_count > 0, row ? `${row.policy_count} policies` : 'none');
}

// Helper functions -----------------------------------------------------------
const functions = await query(`
  select p.proname, p.prosecdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
  order by p.proname;
`);

console.log('\nHelper functions (all must be SECURITY DEFINER)');
for (const name of EXPECTED_FUNCTIONS) {
  const row = functions.find((fn) => fn.proname === name);
  check(name, Boolean(row) && row.prosecdef === true, row ? 'security definer' : 'missing');
}

// Triggers -------------------------------------------------------------------
const triggers = await query(`
  select t.tgname, c.relname
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  where not t.tgisinternal
    and t.tgname in ('on_auth_user_created', 'guard_profile_update');
`);

console.log('\nTriggers');
check(
  'on_auth_user_created on auth.users',
  triggers.some((trigger) => trigger.tgname === 'on_auth_user_created' && trigger.relname === 'users'),
);
check(
  'guard_profile_update on public.profiles',
  triggers.some(
    (trigger) => trigger.tgname === 'guard_profile_update' && trigger.relname === 'profiles',
  ),
);

// Rank enum ordering ---------------------------------------------------------
const ranks = await query(`
  select e.enumlabel
  from pg_enum e
  join pg_type t on t.oid = e.enumtypid
  where t.typname = 'player_rank'
  order by e.enumsortorder;
`);

const order = ranks.map((rank) => rank.enumlabel);
const expected = [
  'beginner_3',
  'beginner_2',
  'beginner_1',
  'intermediate_3',
  'intermediate_2',
  'intermediate_1',
  'advanced_3',
  'advanced_2',
  'advanced_1',
];

console.log('\nRank ladder (order decides leaderboard sorting)');
check('player_rank order', JSON.stringify(order) === JSON.stringify(expected), order.join(' < '));

console.log(
  failures === 0
    ? '\nSchema verified — everything the app relies on is in place.\n'
    : `\n${failures} check(s) failed.\n`,
);

process.exit(failures === 0 ? 0 : 1);
