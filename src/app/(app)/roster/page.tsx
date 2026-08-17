import { ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/shell/top-bar';
import { RankBadge } from '@/components/status-badges';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, EmptyState } from '@/components/ui/misc';
import { requireCoach } from '@/lib/auth';
import { fetchManagedStudents } from '@/lib/queries';
import { pluralize } from '@/lib/utils';

export default async function RosterPage() {
  const session = await requireCoach();
  const students = await fetchManagedStudents(session, { approvalStatus: 'approved' });

  // Group by location so a head coach with several hubs can scan by court.
  const groups = new Map<string, { label: string; students: typeof students }>();

  for (const student of students) {
    const key = student.location?.id ?? 'unassigned';
    const label = student.location
      ? `${student.location.name} · ${student.location.city_area}`
      : 'Unassigned';

    if (!groups.has(key)) groups.set(key, { label, students: [] });
    groups.get(key)!.students.push(student);
  }

  return (
    <>
      <PageHeader
        title="Roster"
        description={`${pluralize(students.length, 'approved student')} in your scope.`}
      />

      {students.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No students yet"
          description="Approve a registration to build your roster."
        />
      ) : (
        [...groups.entries()].map(([key, group]) => (
          <section key={key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
                {group.label}
              </h2>
              <Badge>{group.students.length}</Badge>
            </div>

            <Card className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {group.students.map((student) => (
                  <li key={student.id}>
                    <Link
                      href={`/roster/${student.id}`}
                      className="flex items-center gap-3 px-4 py-3 active:bg-slate-50"
                    >
                      <Avatar name={student.full_name} className="size-9" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {student.full_name}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {student.phone ?? 'No phone on file'}
                        </p>
                      </div>
                      <RankBadge rank={student.rank} />
                      <ChevronRight className="size-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))
      )}
    </>
  );
}
