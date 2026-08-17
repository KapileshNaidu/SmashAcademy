import {
  ChevronRight,
  LogOut,
  MapPin,
  Trophy,
  UserCog,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';

import { signOutAction } from '@/app/(auth)/actions';
import { PageHeader } from '@/components/shell/top-bar';
import { RankBadge, RoleBadge } from '@/components/status-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, SectionTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/misc';
import { requireApproved } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function MenuPage() {
  const session = await requireApproved();

  let pendingCount = 0;

  // Head coach only — junior coaches no longer review registrations, and RLS
  // hides unplaced students from them, so this count would always be 0 anyway.
  if (session.isHeadCoach) {
    const supabase = await createClient();
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('approval_status', 'pending');

    pendingCount = count ?? 0;
  }

  return (
    <>
      <PageHeader title="Menu" />

      <Card>
        <CardContent className="flex items-center gap-3">
          <Avatar name={session.profile.full_name} className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">
              {session.profile.full_name}
            </p>
            <p className="truncate text-[11px] text-slate-500">{session.email}</p>
            <div className="mt-1.5">
              {session.isStudent ? (
                <RankBadge rank={session.profile.rank} />
              ) : (
                <RoleBadge role={session.profile.role} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionTitle>Account</SectionTitle>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100">
          <MenuLink href="/profile" icon={<UserCog className="size-4" />} label="Edit profile" />
          <MenuLink
            href="/leaderboard"
            icon={<Trophy className="size-4" />}
            label="Leaderboard"
          />
        </ul>
      </Card>

      {session.isHeadCoach ? (
        <>
          <SectionTitle>Coaching</SectionTitle>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              <MenuLink
                href="/approvals"
                icon={<UserCheck className="size-4" />}
                label="Pending approvals"
                badge={pendingCount > 0 ? pendingCount : undefined}
              />
            </ul>
          </Card>
        </>
      ) : null}

      {session.isHeadCoach ? (
        <>
          <SectionTitle>Administration</SectionTitle>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              <MenuLink
                href="/admin/locations"
                icon={<MapPin className="size-4" />}
                label="Manage locations"
              />
              <MenuLink
                href="/admin/coaches"
                icon={<UserPlus className="size-4" />}
                label="Junior coaches"
              />
            </ul>
          </Card>
        </>
      ) : null}

      <form action={signOutAction} className="mt-2">
        <Button type="submit" variant="outline" size="full">
          <LogOut />
          Sign out
        </Button>
      </form>

      <p className="pb-2 text-center text-[10px] text-slate-400">Smash Academy · v1.0</p>
    </>
  );
}

function MenuLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </span>
        <span className="flex-1 text-sm font-medium text-slate-800">{label}</span>
        {badge ? <Badge variant="warning">{badge}</Badge> : null}
        <ChevronRight className="size-4 shrink-0 text-slate-300" />
      </Link>
    </li>
  );
}
