#!/usr/bin/env bash
# RLS + privilege-guard test suite against the throwaway Postgres.
#
# Each case runs in its own transaction as role `authenticated` with
# request.jwt.claim.sub set to the user under test, then rolls back — so cases
# are order-independent and mutating tests leave no residue.
#
# The observed value is emitted as `RESULT=<value>` and grepped out, because psql
# interleaves command tags (BEGIN/UPDATE 1/ROLLBACK) and RLS error text with
# query output on the same stream.

set -uo pipefail

HEAD=11111111-0000-0000-0000-000000000001
JUNIOR=22222222-0000-0000-0000-000000000002
NINA=33333333-0000-0000-0000-000000000003   # student, North (junior's location)
SAM=44444444-0000-0000-0000-000000000004    # student, South (not junior's)
PAT=55555555-0000-0000-0000-000000000005    # student, pending, no location
NORTH=aaaaaaaa-0000-0000-0000-000000000001
SOUTH=bbbbbbbb-0000-0000-0000-000000000002

pass=0; fail=0; failed_labels=()

# run <uuid> <sql>  — <sql> must emit exactly one `select 'RESULT=' || …;`
run() {
  local uid="$1" sql="$2"
  docker exec -i pg-badminton psql -U postgres -qAt -v ON_ERROR_STOP=0 2>&1 <<SQL | grep -o 'RESULT=.*' | tail -1 | cut -d= -f2-
begin;
set local role authenticated;
set local request.jwt.claim.sub = '${uid}';
${sql}
rollback;
SQL
}

check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '  ok   %s\n' "$label"; pass=$((pass+1))
  else
    printf ' FAIL  %s\n         expected %q, got %q\n' "$label" "$expected" "$actual"
    fail=$((fail+1)); failed_labels+=("$label")
  fi
}

echo
echo "── Privilege escalation guard (the student is the attacker) ──"

check "student cannot promote their own rank" "beginner_1" \
  "$(run "$NINA" "update public.profiles set rank='advanced_1' where id='$NINA';
     select 'RESULT=' || rank from public.profiles where id='$NINA';")"

check "student cannot make themselves head coach" "student" \
  "$(run "$NINA" "update public.profiles set role='head_coach' where id='$NINA';
     select 'RESULT=' || role from public.profiles where id='$NINA';")"

check "pending student cannot self-approve" "pending" \
  "$(run "$PAT" "update public.profiles set approval_status='approved' where id='$PAT';
     select 'RESULT=' || approval_status from public.profiles where id='$PAT';")"

check "student cannot move themselves to another location" "$NORTH" \
  "$(run "$NINA" "update public.profiles set location_id='$SOUTH' where id='$NINA';
     select 'RESULT=' || location_id from public.profiles where id='$NINA';")"

check "student CAN edit their own name" "Renamed" \
  "$(run "$NINA" "update public.profiles set full_name='Renamed' where id='$NINA';
     select 'RESULT=' || full_name from public.profiles where id='$NINA';")"

check "student cannot edit another student's name" "Sam South" \
  "$(run "$NINA" "update public.profiles set full_name='Hacked' where id='$SAM';
     reset role; select 'RESULT=' || full_name from public.profiles where id='$SAM';")"

check "junior coach cannot self-promote to head coach" "junior_coach" \
  "$(run "$JUNIOR" "update public.profiles set role='head_coach' where id='$JUNIOR';
     select 'RESULT=' || role from public.profiles where id='$JUNIOR';")"

check "nobody can insert a profile row directly" "blocked" \
  "$(run "$NINA" "do \$\$ begin
       insert into public.profiles (id, role, approval_status)
         values ('99999999-0000-0000-0000-000000000009','head_coach','approved');
       raise notice 'RESULT=inserted';
     exception when others then raise notice 'RESULT=blocked';
     end \$\$;")"

echo
echo "── Read scoping ──"

check "student sees only their own payments" "1" \
  "$(run "$NINA" "select 'RESULT=' || count(*) from public.payments;")"

check "student cannot see a pending registration" "0" \
  "$(run "$NINA" "select 'RESULT=' || count(*) from public.profiles where id='$PAT';")"

check "student sees both approved players on the leaderboard view" "2" \
  "$(run "$NINA" "select 'RESULT=' || count(*) from public.leaderboard;")"

check "leaderboard view exposes no phone column" "0" \
  "$(run "$HEAD" "select 'RESULT=' || count(*) from information_schema.columns
     where table_schema='public' and table_name='leaderboard' and column_name='phone';")"

check "pending student gets an empty leaderboard" "0" \
  "$(run "$PAT" "select 'RESULT=' || count(*) from public.leaderboard;")"

check "junior coach sees their own student" "1" \
  "$(run "$JUNIOR" "select 'RESULT=' || count(*) from public.profiles
     where id = '$NINA';")"

check "junior coach CANNOT see a pending registration" "0" \
  "$(run "$JUNIOR" "select 'RESULT=' || count(*) from public.profiles
     where id = '$PAT';")"

check "junior coach has no authority over an out-of-location student" "false" \
  "$(run "$JUNIOR" "select 'RESULT=' || public.can_manage_student('$SAM');")"

check "junior coach HAS authority over their own student" "true" \
  "$(run "$JUNIOR" "select 'RESULT=' || public.can_manage_student('$NINA');")"

check "junior coach has NO authority over an unplaced applicant" "false" \
  "$(run "$JUNIOR" "select 'RESULT=' || public.can_manage_student('$PAT');")"

check "head coach has authority over an unplaced applicant" "true" \
  "$(run "$HEAD" "select 'RESULT=' || public.can_manage_student('$PAT');")"

check "junior coach cannot read an out-of-location student's profile row" "0" \
  "$(run "$JUNIOR" "select 'RESULT=' || count(*) from public.profiles where id='$SAM';")"

check "student cannot read another student's profile row" "0" \
  "$(run "$NINA" "select 'RESULT=' || count(*) from public.profiles where id='$SAM';")"

check "student cannot read another student's phone via profiles" "0" \
  "$(run "$NINA" "select 'RESULT=' || count(*) from public.profiles
     where id <> '$NINA' and phone is not null;")"

check "junior coach sees only in-scope payments" "1" \
  "$(run "$JUNIOR" "select 'RESULT=' || count(*) from public.payments;")"

check "head coach sees every payment" "2" \
  "$(run "$HEAD" "select 'RESULT=' || count(*) from public.payments;")"

echo
echo "── Coach authority ──"

check "junior coach can promote their own student" "intermediate_3" \
  "$(run "$JUNIOR" "update public.profiles set rank='intermediate_3' where id='$NINA';
     select 'RESULT=' || rank from public.profiles where id='$NINA';")"

check "junior coach cannot promote an out-of-location student" "advanced_2" \
  "$(run "$JUNIOR" "update public.profiles set rank='advanced_1' where id='$SAM';
     reset role; select 'RESULT=' || rank from public.profiles where id='$SAM';")"

check "head coach can promote any student" "advanced_1" \
  "$(run "$HEAD" "update public.profiles set rank='advanced_1' where id='$SAM';
     select 'RESULT=' || rank from public.profiles where id='$SAM';")"

check "junior coach CANNOT approve a registration" "pending" \
  "$(run "$JUNIOR" "update public.profiles
       set approval_status='approved', location_id='$NORTH', rank='beginner_3'
       where id='$PAT';
     reset role; select 'RESULT=' || approval_status from public.profiles where id='$PAT';")"

check "junior coach CANNOT reject a registration" "pending" \
  "$(run "$JUNIOR" "update public.profiles set approval_status='rejected' where id='$PAT';
     reset role; select 'RESULT=' || approval_status from public.profiles where id='$PAT';")"

check "junior coach cannot un-approve their OWN student" "approved" \
  "$(run "$JUNIOR" "update public.profiles set approval_status='rejected' where id='$NINA';
     reset role; select 'RESULT=' || approval_status from public.profiles where id='$NINA';")"

check "head coach can approve and place a registration" "approved|$NORTH" \
  "$(run "$HEAD" "update public.profiles
       set approval_status='approved', location_id='$NORTH', rank='beginner_3'
       where id='$PAT';
     select 'RESULT=' || approval_status || '|' || coalesce(location_id::text,'null')
       from public.profiles where id='$PAT';")"

check "head coach can reject a registration" "rejected" \
  "$(run "$HEAD" "update public.profiles set approval_status='rejected' where id='$PAT';
     select 'RESULT=' || approval_status from public.profiles where id='$PAT';")"

check "junior coach still cannot place a student in another's location" "$NORTH" \
  "$(run "$JUNIOR" "update public.profiles set location_id='$SOUTH' where id='$NINA';
     reset role; select 'RESULT=' || location_id from public.profiles where id='$NINA';")"

echo
echo "── Attendance, matches and fees ──"

check "junior coach can mark attendance at their location" "present" \
  "$(run "$JUNIOR" "insert into public.sessions_attendance
       (student_id, coach_id, location_id, date, status)
       values ('$NINA','$JUNIOR','$NORTH','2026-08-17','present');
     select 'RESULT=' || status from public.sessions_attendance where student_id='$NINA';")"

check "junior coach blocked at another location" "blocked" \
  "$(run "$JUNIOR" "do \$\$ begin
       insert into public.sessions_attendance
         (student_id, coach_id, location_id, date, status)
         values ('$SAM','$JUNIOR','$SOUTH','2026-08-17','present');
       raise notice 'RESULT=inserted';
     exception when others then raise notice 'RESULT=blocked';
     end \$\$;")"

check "match log rejected when recorded_by is spoofed" "blocked" \
  "$(run "$JUNIOR" "do \$\$ begin
       insert into public.match_logs
         (student_id, recorded_by, tournament_name, opponent_name, result)
         values ('$NINA','$HEAD','Spoofed','X','win');
       raise notice 'RESULT=inserted';
     exception when others then raise notice 'RESULT=blocked';
     end \$\$;")"

check "match log accepted when recorded_by is the caller" "1" \
  "$(run "$JUNIOR" "insert into public.match_logs
       (student_id, recorded_by, tournament_name, opponent_name, result)
       values ('$NINA','$JUNIOR','District Open','X','win');
     select 'RESULT=' || count(*) from public.match_logs where tournament_name='District Open';")"

check "student cannot write their own attendance" "blocked" \
  "$(run "$NINA" "do \$\$ begin
       insert into public.sessions_attendance
         (student_id, coach_id, location_id, date, status)
         values ('$NINA','$NINA','$NORTH','2026-08-18','present');
       raise notice 'RESULT=inserted';
     exception when others then raise notice 'RESULT=blocked';
     end \$\$;")"

check "student cannot mark their own fee paid" "pending" \
  "$(run "$NINA" "update public.payments set status='paid' where student_id='$NINA';
     reset role; select 'RESULT=' || status from public.payments where student_id='$NINA';")"

check "junior coach CAN mark their student's fee paid" "paid" \
  "$(run "$JUNIOR" "update public.payments set status='paid' where student_id='$NINA';
     select 'RESULT=' || status from public.payments where student_id='$NINA';")"

check "student cannot delete a location" "2" \
  "$(run "$NINA" "delete from public.locations where id='$NORTH';
     reset role; select 'RESULT=' || count(*) from public.locations
       where id in ('$NORTH','$SOUTH');")"

echo
echo "── The ambiguous-embed bug (PGRST201) ──"

check "two FK paths exist between profiles and locations" "2" \
  "$(run "$HEAD" "select 'RESULT=' || count(*) from information_schema.table_constraints tc
     join information_schema.key_column_usage k on k.constraint_name = tc.constraint_name
     where tc.constraint_type='FOREIGN KEY'
       and ((tc.table_name='profiles' and k.column_name='location_id')
         or (tc.table_name='coach_locations' and k.column_name='location_id'));")"

check "the FK named in LOCATION_EMBED exists" "1" \
  "$(run "$HEAD" "select 'RESULT=' || count(*) from information_schema.table_constraints
     where constraint_name='profiles_location_id_fkey' and constraint_type='FOREIGN KEY';")"

echo
echo "── Ladder ordering ──"

check "rank desc puts the strongest player first" "Sam South" \
  "$(run "$HEAD" "select 'RESULT=' || full_name from public.leaderboard
     order by rank desc, full_name limit 1;")"

check "rank asc puts the weakest player first" "Nina North" \
  "$(run "$HEAD" "select 'RESULT=' || full_name from public.leaderboard
     order by rank asc, full_name limit 1;")"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
if [[ $fail -gt 0 ]]; then printf 'failed: %s\n' "${failed_labels[*]}"; fi
echo
[[ $fail -eq 0 ]]
