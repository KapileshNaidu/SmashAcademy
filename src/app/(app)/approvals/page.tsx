import { UserCheck } from 'lucide-react';

import { PageHeader } from '@/components/shell/top-bar';
import { EmptyState } from '@/components/ui/misc';
import { requireHeadCoach } from '@/lib/auth';
import { fetchLocations, fetchManagedStudents } from '@/lib/queries';

import { ApprovalCard } from './approval-card';

export default async function ApprovalsPage() {
  // Head coach only: approving a registration admits someone to the academy, and
  // that call does not belong to a junior coach.
  const session = await requireHeadCoach();

  const [pending, assignable] = await Promise.all([
    fetchManagedStudents(session, { approvalStatus: 'pending' }),
    fetchLocations(),
  ]);

  return (
    <>
      <PageHeader
        title="Pending approvals"
        description="Self-registered students waiting to be placed in a batch."
      />

      {pending.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="size-5" />}
          title="Nothing to review"
          description="New student registrations land here for approval."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((student) => (
            <ApprovalCard key={student.id} student={student} locations={assignable} />
          ))}
        </div>
      )}

      {assignable.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
          No locations exist yet, so there is nowhere to place a student. Create one under Admin →
          Locations first.
        </p>
      ) : null}
    </>
  );
}
