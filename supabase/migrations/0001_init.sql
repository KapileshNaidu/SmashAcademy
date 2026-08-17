-- =============================================================================
-- Badminton Academy — initial schema, helper functions, triggers and RLS.
--
-- Safe to re-run: types are guarded, tables use IF NOT EXISTS, policies are
-- dropped before being recreated.
--
-- Two things in here are load-bearing and easy to get wrong, so they are called
-- out explicitly:
--
--   1. Every policy that needs to know "who am I?" goes through a SECURITY
--      DEFINER helper instead of sub-selecting profiles inline. A policy ON
--      profiles that SELECTs FROM profiles re-enters RLS and Postgres aborts
--      with "infinite recursion detected in policy". The helpers run as owner,
--      so they read profiles with RLS bypassed and the recursion never starts.
--
--   2. Signup metadata (auth.users.raw_user_meta_data) is fully client
--      controlled — anyone can POST role:"head_coach" to /auth/v1/signup. So
--      handle_new_user() hard-codes role='student'/'pending' and ignores any
--      role in the payload, and guard_profile_update() reverts privileged
--      columns on any UPDATE the caller isn't entitled to make. Roles are only
--      ever granted server-side with the service key.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('head_coach', 'junior_coach', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- Declaration order IS the ranking order: advanced_1 is the highest rank.
-- Postgres compares enums by ordinality, so `order by rank desc` yields the
-- leaderboard top-first with no CASE expression or join table needed.
do $$ begin
  create type public.player_rank as enum (
    'beginner_3', 'beginner_2', 'beginner_1',
    'intermediate_3', 'intermediate_2', 'intermediate_1',
    'advanced_3', 'advanced_2', 'advanced_1'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_status as enum ('present', 'absent', 'excused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('paid', 'pending', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.match_result as enum ('win', 'loss');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.locations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  city_area    text not null default '',
  address      text,
  total_courts integer not null default 1 check (total_courts > 0),
  created_at   timestamptz not null default now()
);

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text not null default '',
  phone           text,
  role            public.user_role not null default 'student',
  approval_status public.approval_status not null default 'pending',
  rank            public.player_rank not null default 'beginner_3',
  location_id     uuid references public.locations (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Junction table: a junior coach may cover several locations, and a location
-- may be staffed by several coaches.
create table if not exists public.coach_locations (
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (coach_id, location_id)
);

-- One row per student per day, so roll call can upsert on conflict instead of
-- reading-then-writing (which would double-insert on a double tap).
create table if not exists public.sessions_attendance (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  coach_id    uuid references public.profiles (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  date        date not null default current_date,
  status      public.attendance_status not null,
  created_at  timestamptz not null default now(),
  unique (student_id, date)
);

create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  amount        numeric(10, 2) not null default 0 check (amount >= 0),
  billing_cycle text not null,
  status        public.payment_status not null default 'pending',
  due_date      date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (student_id, billing_cycle)
);

create table if not exists public.match_logs (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles (id) on delete cascade,
  recorded_by     uuid references public.profiles (id) on delete set null,
  tournament_name text not null default '',
  opponent_name   text not null default '',
  score           text,
  result          public.match_result not null,
  unforced_errors integer not null default 0 check (unforced_errors >= 0),
  coach_notes     text,
  date            date not null default current_date,
  created_at      timestamptz not null default now()
);

create table if not exists public.skill_evaluations (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,
  footwork     smallint not null check (footwork between 1 and 10),
  stamina      smallint not null check (stamina between 1 and 10),
  smash_power  smallint not null check (smash_power between 1 and 10),
  net_control  smallint not null check (net_control between 1 and 10),
  evaluated_at timestamptz not null default now()
);

create index if not exists profiles_role_status_idx    on public.profiles (role, approval_status);
create index if not exists profiles_location_idx       on public.profiles (location_id);
create index if not exists profiles_rank_idx           on public.profiles (rank desc);
create index if not exists coach_locations_loc_idx     on public.coach_locations (location_id);
create index if not exists attendance_student_idx      on public.sessions_attendance (student_id, date desc);
create index if not exists attendance_loc_date_idx     on public.sessions_attendance (location_id, date desc);
create index if not exists payments_student_idx        on public.payments (student_id, due_date desc);
create index if not exists payments_status_idx         on public.payments (status);
create index if not exists match_logs_student_idx      on public.match_logs (student_id, date desc);
create index if not exists skill_evals_student_idx     on public.skill_evaluations (student_id, evaluated_at desc);

-- ---------------------------------------------------------------------------
-- Authorization helpers
--
-- All SECURITY DEFINER (see header note 1). search_path is pinned with pg_temp
-- last so a caller cannot shadow `profiles` with a temp table of their own.
-- ---------------------------------------------------------------------------

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and approval_status = 'approved'
  );
$$;

create or replace function public.is_head_coach()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'head_coach'
      and approval_status = 'approved'
  );
$$;

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('head_coach', 'junior_coach')
      and approval_status = 'approved'
  );
$$;

-- True when the caller may act at `loc`. Head coach covers every location; a
-- junior coach covers only what coach_locations maps them to.
create or replace function public.coach_covers_location(loc uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_head_coach()
      or (
        public.is_coach()
        and loc is not null
        and exists (
          select 1 from public.coach_locations
          where coach_id = auth.uid() and location_id = loc
        )
      );
$$;

-- True when the caller may read/modify this student.
--
-- A junior coach reaches exactly the students at the locations they are mapped
-- to. There is deliberately no "unplaced students are a shared pool" branch:
-- approving registrations is head-coach-only, so a junior coach has no reason to
-- see a pending registration — and since RLS grants whole rows, letting them
-- would expose every applicant's phone number to every coach.
--
-- An unplaced student therefore matches nothing here, and is visible only to the
-- head coach via the is_head_coach() short-circuit.
create or replace function public.can_manage_student(student uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when public.is_head_coach() then true
    when not public.is_coach() then false
    else exists (
      select 1
      from public.profiles p
      where p.id = student
        and p.role = 'student'
        and p.location_id is not null
        and exists (
          select 1 from public.coach_locations cl
          where cl.coach_id = auth.uid()
            and cl.location_id = p.location_id
        )
    )
  end;
$$;

revoke execute on function public.is_approved()                 from public;
revoke execute on function public.is_head_coach()               from public;
revoke execute on function public.is_coach()                    from public;
revoke execute on function public.coach_covers_location(uuid)   from public;
revoke execute on function public.can_manage_student(uuid)      from public;

grant execute on function public.is_approved()               to authenticated;
grant execute on function public.is_head_coach()             to authenticated;
grant execute on function public.is_coach()                  to authenticated;
grant execute on function public.coach_covers_location(uuid) to authenticated;
grant execute on function public.can_manage_student(uuid)    to authenticated;

-- ---------------------------------------------------------------------------
-- Provision a profile for every new auth user.
--
-- role and approval_status are deliberately NOT read from the signup payload
-- (see header note 2) — a public signup is always a pending student. Coaches
-- are minted by the head coach through a server action holding the service key.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, phone, role, approval_status)
  values (
    new.id,
    coalesce(nullif(trim(meta ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(meta ->> 'phone'), ''),
    'student',
    'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Column-level guard on profiles.
--
-- RLS grants access per ROW, not per COLUMN — a student who may update their
-- own row could otherwise set role='head_coach' in the same request. This
-- BEFORE trigger silently restores privileged columns the caller may not touch,
-- so a hostile UPDATE degrades to a no-op instead of an error.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- No JWT means service_role / SQL editor / this migration: let it through.
  if auth.uid() is null then
    return new;
  end if;

  -- role, approval_status, rank and location_id are coach-only fields.
  if (new.role, new.approval_status, new.rank, new.location_id)
     is distinct from (old.role, old.approval_status, old.rank, old.location_id)
     and not public.is_head_coach()
     and not public.can_manage_student(old.id)
  then
    new.role            := old.role;
    new.approval_status := old.approval_status;
    new.rank            := old.rank;
    new.location_id     := old.location_id;
  end if;

  -- Approving or rejecting a registration is the head coach's call alone. A
  -- junior coach keeps every other power over their own students (rank, fees,
  -- attendance, match logs) but cannot move anyone in or out of the academy.
  if new.approval_status is distinct from old.approval_status
     and not public.is_head_coach()
  then
    new.approval_status := old.approval_status;
  end if;

  -- A junior coach may only place a student into a location they cover.
  if new.location_id is distinct from old.location_id
     and new.location_id is not null
     and not public.coach_covers_location(new.location_id)
  then
    new.location_id := old.location_id;
  end if;

  -- Only a head coach may create or remove another head coach.
  if (new.role = 'head_coach') is distinct from (old.role = 'head_coach')
     and not public.is_head_coach()
  then
    new.role := old.role;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.locations           enable row level security;
alter table public.profiles            enable row level security;
alter table public.coach_locations     enable row level security;
alter table public.sessions_attendance enable row level security;
alter table public.payments            enable row level security;
alter table public.match_logs          enable row level security;
alter table public.skill_evaluations   enable row level security;

-- locations -----------------------------------------------------------------
drop policy if exists "locations_select" on public.locations;
create policy "locations_select" on public.locations
  for select to authenticated
  using (public.is_approved());

drop policy if exists "locations_write_head_coach" on public.locations;
create policy "locations_write_head_coach" on public.locations
  for all to authenticated
  using (public.is_head_coach())
  with check (public.is_head_coach());

-- profiles ------------------------------------------------------------------
-- Own row is always readable, even while pending — the approval splash screen
-- needs to poll its own approval_status.
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select to authenticated
  using (id = auth.uid());

/*
 * There is deliberately NO "approved members can read approved members" policy.
 *
 * The obvious way to build a public leaderboard is a policy like
 *   using (is_approved() and approval_status = 'approved')
 * but RLS grants whole ROWS. That policy would hand every student every other
 * student's phone number — which in a youth sports app is a real leak, not a
 * theoretical one. The leaderboard reads the public.leaderboard view below,
 * which exposes only name, rank and location.
 */

-- Coaches see students in their scope, at any approval status.
drop policy if exists "profiles_select_coach_scope" on public.profiles;
create policy "profiles_select_coach_scope" on public.profiles
  for select to authenticated
  using (public.can_manage_student(id));

-- Self-service edits (name, phone). Privileged columns are pinned by the
-- guard trigger above, so this cannot be used to escalate.
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_update_coach_scope" on public.profiles;
create policy "profiles_update_coach_scope" on public.profiles
  for update to authenticated
  using (public.can_manage_student(id))
  with check (public.can_manage_student(id));

drop policy if exists "profiles_update_head_coach" on public.profiles;
create policy "profiles_update_head_coach" on public.profiles
  for update to authenticated
  using (public.is_head_coach())
  with check (public.is_head_coach());

drop policy if exists "profiles_delete_head_coach" on public.profiles;
create policy "profiles_delete_head_coach" on public.profiles
  for delete to authenticated
  using (public.is_head_coach());

-- No INSERT policy on purpose: profiles are created by handle_new_user() and
-- by the service key. A client cannot mint a profile row directly.

-- coach_locations -----------------------------------------------------------
drop policy if exists "coach_locations_select" on public.coach_locations;
create policy "coach_locations_select" on public.coach_locations
  for select to authenticated
  using (public.is_approved());

drop policy if exists "coach_locations_write_head_coach" on public.coach_locations;
create policy "coach_locations_write_head_coach" on public.coach_locations
  for all to authenticated
  using (public.is_head_coach())
  with check (public.is_head_coach());

-- sessions_attendance -------------------------------------------------------
drop policy if exists "attendance_select_self" on public.sessions_attendance;
create policy "attendance_select_self" on public.sessions_attendance
  for select to authenticated
  using (student_id = auth.uid());

drop policy if exists "attendance_select_coach" on public.sessions_attendance;
create policy "attendance_select_coach" on public.sessions_attendance
  for select to authenticated
  using (public.can_manage_student(student_id));

-- coach_covers_location() is null-safe and returns false for a junior coach
-- with a null location, which forces roll call to always name its location.
drop policy if exists "attendance_insert_coach" on public.sessions_attendance;
create policy "attendance_insert_coach" on public.sessions_attendance
  for insert to authenticated
  with check (
    public.can_manage_student(student_id)
    and public.coach_covers_location(location_id)
  );

drop policy if exists "attendance_update_coach" on public.sessions_attendance;
create policy "attendance_update_coach" on public.sessions_attendance
  for update to authenticated
  using (public.can_manage_student(student_id))
  with check (
    public.can_manage_student(student_id)
    and public.coach_covers_location(location_id)
  );

drop policy if exists "attendance_delete_coach" on public.sessions_attendance;
create policy "attendance_delete_coach" on public.sessions_attendance
  for delete to authenticated
  using (public.can_manage_student(student_id));

-- payments ------------------------------------------------------------------
drop policy if exists "payments_select_self" on public.payments;
create policy "payments_select_self" on public.payments
  for select to authenticated
  using (student_id = auth.uid());

drop policy if exists "payments_select_coach" on public.payments;
create policy "payments_select_coach" on public.payments
  for select to authenticated
  using (public.can_manage_student(student_id));

drop policy if exists "payments_write_coach" on public.payments;
create policy "payments_write_coach" on public.payments
  for all to authenticated
  using (public.can_manage_student(student_id))
  with check (public.can_manage_student(student_id));

-- match_logs ----------------------------------------------------------------
drop policy if exists "match_logs_select_self" on public.match_logs;
create policy "match_logs_select_self" on public.match_logs
  for select to authenticated
  using (student_id = auth.uid());

drop policy if exists "match_logs_select_coach" on public.match_logs;
create policy "match_logs_select_coach" on public.match_logs
  for select to authenticated
  using (public.can_manage_student(student_id));

drop policy if exists "match_logs_insert_coach" on public.match_logs;
create policy "match_logs_insert_coach" on public.match_logs
  for insert to authenticated
  with check (
    public.can_manage_student(student_id)
    and recorded_by = auth.uid()
  );

drop policy if exists "match_logs_update_coach" on public.match_logs;
create policy "match_logs_update_coach" on public.match_logs
  for update to authenticated
  using (public.can_manage_student(student_id))
  with check (public.can_manage_student(student_id));

drop policy if exists "match_logs_delete_coach" on public.match_logs;
create policy "match_logs_delete_coach" on public.match_logs
  for delete to authenticated
  using (public.can_manage_student(student_id));

-- skill_evaluations ---------------------------------------------------------
drop policy if exists "skill_evals_select_self" on public.skill_evaluations;
create policy "skill_evals_select_self" on public.skill_evaluations
  for select to authenticated
  using (student_id = auth.uid());

drop policy if exists "skill_evals_select_coach" on public.skill_evaluations;
create policy "skill_evals_select_coach" on public.skill_evaluations
  for select to authenticated
  using (public.can_manage_student(student_id));

drop policy if exists "skill_evals_write_coach" on public.skill_evaluations;
create policy "skill_evals_write_coach" on public.skill_evaluations
  for all to authenticated
  using (public.can_manage_student(student_id))
  with check (public.can_manage_student(student_id));

-- ---------------------------------------------------------------------------
-- Leaderboard view
--
-- The ladder is visible to every approved member, but a member is not entitled
-- to every column of someone else's profile. RLS cannot filter columns, so the
-- projection is the security boundary here: this view exposes name, rank and
-- location and nothing else — no phone, no approval status, no email.
--
-- Left at the default security_invoker = false so it reads profiles as owner
-- (bypassing the row policies that would otherwise hide other students), with
-- `public.is_approved()` in the WHERE clause as the gate. A pending or rejected
-- account gets zero rows.
--
-- The join makes it non-auto-updatable, so it is read-only by construction.
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard as
select
  p.id,
  p.full_name,
  p.rank,
  p.location_id,
  l.name      as location_name,
  l.city_area as location_city_area
from public.profiles p
left join public.locations l on l.id = p.location_id
where p.role = 'student'
  and p.approval_status = 'approved'
  and public.is_approved();

-- ---------------------------------------------------------------------------
-- Grants (RLS still decides which rows; these only open the door)
-- ---------------------------------------------------------------------------
grant select on public.leaderboard to authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Backfill profiles for any auth user that predates the trigger.
insert into public.profiles (id, full_name, role, approval_status)
select u.id,
       coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
       'student',
       'pending'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
