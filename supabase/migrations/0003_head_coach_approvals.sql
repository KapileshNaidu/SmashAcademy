-- ---------------------------------------------------------------------------
-- 0003 — Approving registrations becomes head-coach-only.
--
-- Both function bodies below are identical to the ones now in 0001_init.sql;
-- this file exists so a database already running 0001 can be brought forward
-- without a rebuild. Applying 0001 fresh makes this a harmless no-op.
--
-- Two changes:
--
--   1. can_manage_student() loses its "unplaced students are a shared intake
--      pool" branch. That branch existed so any coach could work the approval
--      queue. Now that only the head coach approves, a junior coach has no
--      reason to see a pending registration — and because RLS grants whole
--      ROWS, leaving it would expose every applicant's phone number to every
--      coach in the academy.
--
--   2. guard_profile_update() pins approval_status to the head coach. A junior
--      coach keeps rank, fees, attendance and match logs for their own
--      students, but cannot admit or reject anyone.
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

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

  -- Approving or rejecting a registration is the head coach's call alone.
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
