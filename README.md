# Smash Academy

Mobile-first badminton academy management: attendance, rank ladder, fee tracking
with WhatsApp reminders, match logs and skill evaluations.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Auth + Postgres + RLS) ·
Recharts · Lucide.

## Roles

| Role | Can do |
| --- | --- |
| `head_coach` | Everything, at every location. Creates junior coaches and locations. |
| `junior_coach` | Roll call, ranks, fees, match logs — **only at the locations they are mapped to**. Cannot approve registrations. |
| `student` | Their own dashboard, match history, fees, and the leaderboard. |

## Setup

### 1. Install

```bash
npm install
```

`.env.local` is already filled in for the `zkhyesmbhyaphmyvneov` project.

### 2. Apply the schema

The publishable and secret API keys only reach PostgREST — they cannot run DDL.
Applying migrations needs a **personal access token** (`sbp_…`) from
[supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens):

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx npm run db:migrate
```

Then confirm tables, RLS, policies, helper functions and triggers all landed:

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx npm run db:verify
```

No token? Paste `supabase/migrations/0001_init.sql` (then `0002_seed_locations.sql`)
into the Supabase SQL Editor instead. Both files are safe to re-run.

### 3. Create the first head coach

Junior coaches are created from inside the app by a head coach, and public signup
only ever produces pending students — so the first privileged account is minted
out-of-band with the service key:

```bash
npm run db:head-coach -- --email head@academy.com --password 'change-me-please' --name 'Priya Menon'
```

### 4. Run

```bash
npm run dev
```

## How the pieces fit

### Auth and onboarding

1. A student self-registers at `/signup`. The form only offers "Student", and the
   role selector is disabled.
2. `handle_new_user()` creates their profile as `student` / `pending`.
3. Until a coach approves them, every route redirects to `/pending`, which polls
   its own status and unlocks the moment approval lands.
4. The **head coach** approves from `/approvals`, assigning a **location** and a
   **starting rank** — the schema has no `batches` table, so a student's batch is
   their (location, rank) pair.

### The two security rules that matter

**Signup metadata is client-controlled.** Anyone can POST
`role: "head_coach"` to `/auth/v1/signup`. So `handle_new_user()` hard-codes
`role='student'`, `approval_status='pending'` and ignores any role in the
payload. Privileged roles are only ever granted server-side, by
`createJuniorCoachAction` (service key, behind `requireHeadCoach()`) or the
bootstrap script.

**RLS grants rows, not columns.** A student may update their own profile row, so
without a second guard they could set their own rank to `advanced_1`. The
`guard_profile_update()` trigger restores `role`, `approval_status`, `rank` and
`location_id` whenever the caller isn't entitled to change them.

That trigger reverts *silently* rather than raising, so a hostile write is a
no-op rather than an error. The consequence for app code: **a 200 does not mean
the write applied.** Every action touching those columns reads the row back and
compares before reporting success.

### Why the RLS helpers are `SECURITY DEFINER`

A policy on `profiles` that sub-selects `profiles` re-enters RLS, and Postgres
aborts with `infinite recursion detected in policy`. `is_head_coach()`,
`can_manage_student()` and friends run as owner, so they read `profiles` with RLS
bypassed and the recursion never starts.

### The leaderboard is a view, not a policy

The obvious way to build a public ladder is an RLS policy like
`using (is_approved() and approval_status = 'approved')`. But **RLS grants whole
rows** — that policy hands every student every other student's phone number.

So there is no blanket read policy on `profiles`. The ladder reads
`public.leaderboard`, a view projecting only name, rank and location, gated on
`is_approved()`. The projection is the security boundary. Adding a column to that
view widens who can read it, so treat it as a security change.

### Only the head coach admits people

Approving or rejecting a registration is head-coach-only, enforced at three
depths: the `/approvals` route in `proxy.ts`, `requireHeadCoach()` in the server
action, and `guard_profile_update()` in Postgres, which reverts `approval_status`
for anyone else even on a hand-rolled POST straight at PostgREST.

A junior coach keeps every other power over the students at their own locations —
rank, fees, attendance, match logs, evaluations.

`can_manage_student()` therefore has **no** "unplaced students are a shared pool"
branch. A pending applicant has no location, so they match nothing for a junior
coach and are visible only to the head coach. That is a privacy decision as much
as an authorization one: RLS grants whole rows, so the alternative would show
every applicant's phone number to every coach in the academy.

### Never embed `locations` without the FK hint

There are two relationship paths from `profiles` to `locations` — the direct
`profiles.location_id` FK, and the many-to-many through `coach_locations`. A bare
`locations(...)` embed is ambiguous, and PostgREST fails the whole request with
`PGRST201` / HTTP 300 rather than picking one.

Use the `LOCATION_EMBED` constant in `lib/queries.ts`, which names the constraint.
This failed silently for a while because the query helpers did `data ?? []`, so a
rejected request and an empty roster both rendered as "nothing here" — they now
throw instead.

## Testing the security model

`supabase/tests/` holds a 45-case suite that runs the migration against a
throwaway Postgres and exercises the policies as impersonated users — a student
trying to promote themselves, a junior coach reaching into another location, a
spoofed `recorded_by`, and so on. Needs Docker:

```bash
docker run -d --name pg-badminton -e POSTGRES_PASSWORD=pw -p 55432:5432 postgres:17-alpine
for f in supabase/tests/00_supabase_stub.sql supabase/migrations/*.sql \
         supabase/tests/10_fixtures.sql; do
  docker exec -i pg-badminton psql -U postgres -q -v ON_ERROR_STOP=1 < "$f"
done
./supabase/tests/rls-test.sh
```

`00_supabase_stub.sql` stands in for the bits of Supabase the migration touches
(`auth.users`, `auth.uid()`, the three roles), with `auth.uid()` reading a GUC so
tests can impersonate any user.

## Layout

```
src/
├── proxy.ts                     Session refresh + role-based route gating
├── lib/
│   ├── supabase/{client,server,admin,middleware}.ts
│   ├── types/database.ts        Row/Insert/Update types for every table
│   ├── auth.ts                  getSessionContext, require* guards
│   ├── rank.ts                  The 9-step ladder, tiers and badge styles
│   └── queries.ts               Shared server-side reads
├── components/
│   ├── ui/                      Button, Card, Badge, Drawer, Segmented, …
│   ├── shell/                   Top bar + sticky bottom nav
│   ├── status-badges.tsx        Every status chip in the app
│   └── skill-radar.tsx          Recharts radar
└── app/
    ├── (auth)/{login,signup}    Public
    ├── pending/                 Waiting-for-approval splash
    └── (app)/                   Authenticated shell
        ├── dashboard/           Role-routed: coach vs student
        ├── leaderboard/ roster/ attendance/ payments/ matches/
        ├── approvals/ menu/ profile/
        └── admin/{locations,coaches}   Head coach only
```

## Notes

- **`proxy.ts`, not `middleware.ts`** — Next.js 16 renamed the convention. Same
  Supabase SSR session handling; it now runs on the Node runtime rather than Edge.
- **Native `<select>`** is used throughout instead of a custom listbox, so mobile
  browsers hand off to the OS picker.
- **Email confirmation is currently ON** for this Supabase project, so a new
  student must click the link in their inbox before signing in. Turn it off under
  Authentication → Providers → Email → "Confirm email" for frictionless testing.
- **No payment gateway**, by design — fee status is a manual `paid`/`pending`/
  `overdue` toggle, and reminders are `wa.me` deep links that open WhatsApp with a
  pre-filled message rather than sending anything automatically.
