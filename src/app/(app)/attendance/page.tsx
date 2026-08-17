import { ClipboardList, MapPin } from 'lucide-react';

import { PageHeader } from '@/components/shell/top-bar';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/misc';
import { requireCoach } from '@/lib/auth';
import { fetchLocations, fetchManagedStudents } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { todayISO } from '@/lib/utils';

import { RollCall } from './roll-call';
import { RollCallFilters } from './roll-call-filters';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; date?: string }>;
}) {
  const params = await searchParams;
  const session = await requireCoach();

  const [locations, students] = await Promise.all([
    fetchLocations(),
    fetchManagedStudents(session, { approvalStatus: 'approved' }),
  ]);

  // Head coach may take roll call anywhere; a junior coach only where they teach.
  const available = session.isHeadCoach
    ? locations
    : locations.filter((location) => session.coachLocationIds.includes(location.id));

  const date = params.date || todayISO();
  const locationId =
    params.location && available.some((location) => location.id === params.location)
      ? params.location
      : (available[0]?.id ?? null);

  const roster = students.filter((student) => student.location_id === locationId);

  // Existing marks for this date, so the sheet opens showing what's already set.
  let existing: Record<string, 'present' | 'absent' | 'excused'> = {};

  if (locationId && roster.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('sessions_attendance')
      .select('student_id, status')
      .eq('date', date)
      .in(
        'student_id',
        roster.map((student) => student.id),
      );

    existing = Object.fromEntries((data ?? []).map((row) => [row.student_id, row.status]));
  }

  return (
    <>
      <PageHeader title="Roll call" description="Mark today's session in one pass." />

      {available.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-5" />}
          title="No locations assigned"
          description="Ask the head coach to map you to a location before taking roll call."
        />
      ) : (
        <>
          <Card>
            <CardContent>
              <RollCallFilters locations={available} locationId={locationId} date={date} />
            </CardContent>
          </Card>

          {roster.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="No students here yet"
              description="Approve registrations into this location to build the session list."
            />
          ) : (
            <RollCall
              students={roster}
              locationId={locationId!}
              date={date}
              initialStatuses={existing}
            />
          )}
        </>
      )}
    </>
  );
}
