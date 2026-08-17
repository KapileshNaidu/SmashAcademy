import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/shell/top-bar';
import { ApprovalBadge, RankBadge, RoleBadge } from '@/components/status-badges';
import { Card, CardContent } from '@/components/ui/card';
import { requireApproved } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

import { ProfileForm } from './profile-form';

export default async function ProfilePage() {
  const session = await requireApproved();

  let locationName: string | null = null;

  if (session.profile.location_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('locations')
      .select('name, city_area')
      .eq('id', session.profile.location_id)
      .maybeSingle();

    locationName = data ? `${data.name} · ${data.city_area}` : null;
  }

  return (
    <>
      <Link
        href="/menu"
        className="-mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500"
      >
        <ArrowLeft className="size-3.5" /> Menu
      </Link>

      <PageHeader title="Edit profile" description="Name and phone are yours to change." />

      <ProfileForm profile={session.profile} email={session.email} />

      <Card>
        <CardContent className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Set by your coach
          </p>

          <Row label="Role">
            <RoleBadge role={session.profile.role} />
          </Row>

          {session.isStudent ? (
            <Row label="Rank">
              <RankBadge rank={session.profile.rank} />
            </Row>
          ) : null}

          <Row label="Status">
            <ApprovalBadge status={session.profile.approval_status} />
          </Row>

          <Row label="Location">
            <span className="text-xs text-slate-700">{locationName ?? 'Unassigned'}</span>
          </Row>

          <Row label="Member since">
            <span className="text-xs text-slate-700">{formatDate(session.profile.created_at)}</span>
          </Row>
        </CardContent>
      </Card>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500">{label}</span>
      {children}
    </div>
  );
}
