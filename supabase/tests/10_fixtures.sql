-- Fixtures. Runs as superuser, so RLS is bypassed and guard_profile_update()
-- short-circuits on a null auth.uid() — exactly how the real service key behaves.

insert into public.locations (id, name, city_area, total_courts) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'North Hub', 'Indiranagar', 4),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'South Hub', 'Jayanagar',   6);

-- The auth trigger turns each of these into a pending student profile.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-0000-0000-0000-000000000001', 'head@a.com',    '{"full_name":"Head Coach"}'),
  ('22222222-0000-0000-0000-000000000002', 'junior@a.com',  '{"full_name":"Junior Coach"}'),
  ('33333333-0000-0000-0000-000000000003', 'north@a.com',   '{"full_name":"Nina North"}'),
  ('44444444-0000-0000-0000-000000000004', 'south@a.com',   '{"full_name":"Sam South"}'),
  ('55555555-0000-0000-0000-000000000005', 'pending@a.com', '{"full_name":"Pat Pending"}');

update public.profiles set role = 'head_coach', approval_status = 'approved'
  where id = '11111111-0000-0000-0000-000000000001';

update public.profiles
  set role = 'junior_coach', approval_status = 'approved',
      location_id = 'aaaaaaaa-0000-0000-0000-000000000001'
  where id = '22222222-0000-0000-0000-000000000002';

insert into public.coach_locations (coach_id, location_id) values
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001');

-- Nina is at North (the junior coach's location), Sam is at South (not theirs).
update public.profiles
  set approval_status = 'approved', location_id = 'aaaaaaaa-0000-0000-0000-000000000001',
      rank = 'beginner_1', phone = '9876543210'
  where id = '33333333-0000-0000-0000-000000000003';

update public.profiles
  set approval_status = 'approved', location_id = 'bbbbbbbb-0000-0000-0000-000000000002',
      rank = 'advanced_2'
  where id = '44444444-0000-0000-0000-000000000004';

-- Pat stays pending with no location: the shared intake pool.

insert into public.payments (student_id, amount, billing_cycle, due_date, status) values
  ('33333333-0000-0000-0000-000000000003', 2500, 'August 2026', '2026-08-05', 'pending'),
  ('44444444-0000-0000-0000-000000000004', 3000, 'August 2026', '2026-08-05', 'overdue');
