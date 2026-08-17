import {
  ChevronRight,
  ClipboardList,
  MapPin,
  TriangleAlert,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/shell/top-bar';
import { Card, CardContent, SectionTitle } from '@/components/ui/card';
import { StatTile } from '@/components/ui/misc';
import type { SessionContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, todayISO } from '@/lib/utils';

export async function CoachDashboard({ session }: { session: SessionContext }) {
  const supabase = await createClient();
  const today = todayISO();

  /*
   * Counted with head:true so Postgres returns the tally without shipping rows.
   * RLS already limits each of these to the caller's scope, so no extra location
   * filter is needed for correctness — only for the roll-call query, which is
   * genuinely about "today, here".
   */
  const [pending, students, todaysRollCall, unpaid] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('approval_status', 'pending'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('approval_status', 'approved'),
    supabase.from('sessions_attendance').select('status').eq('date', today),
    supabase.from('payments').select('amount, status').neq('status', 'paid'),
  ]);

  const pendingCount = pending.count ?? 0;
  const studentCount = students.count ?? 0;
  const markedToday = todaysRollCall.data?.length ?? 0;
  const presentToday = todaysRollCall.data?.filter((row) => row.status === 'present').length ?? 0;
  const outstanding = unpaid.data ?? [];
  const outstandingTotal = outstanding.reduce((sum, row) => sum + Number(row.amount), 0);
  const overdueCount = outstanding.filter((row) => row.status === 'overdue').length;

  return (
    <>
      <PageHeader
        title={session.isHeadCoach ? 'Academy overview' : 'Your squad'}
        description={
          session.isHeadCoach
            ? 'Every location, every student.'
            : `Coaching at ${session.coachLocationIds.length} location${session.coachLocationIds.length === 1 ? '' : 's'}.`
        }
      />

      {/* Approvals lead the page: a student is locked out until the head coach acts. */}
      {session.isHeadCoach && pendingCount > 0 ? (
        <Link href="/approvals" className="block">
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <TriangleAlert className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-900">
                  {pendingCount} registration{pendingCount === 1 ? '' : 's'} waiting
                </p>
                <p className="text-[11px] text-amber-800">
                  They stay locked out until approved.
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-amber-700" />
            </CardContent>
          </Card>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Students"
          value={studentCount}
          sub="approved"
          icon={<Users className="size-4" />}
        />
        <StatTile
          label="Today"
          value={markedToday === 0 ? '—' : `${presentToday}/${markedToday}`}
          sub={markedToday === 0 ? 'roll call not started' : 'present today'}
          icon={<ClipboardList className="size-4" />}
          tone={markedToday === 0 ? 'amber' : 'court'}
        />
        <StatTile
          label="Outstanding"
          value={formatCurrency(outstandingTotal)}
          sub={`${outstanding.length} unpaid`}
          icon={<Wallet className="size-4" />}
          tone={outstanding.length > 0 ? 'amber' : 'neutral'}
        />
        <StatTile
          label="Overdue"
          value={overdueCount}
          sub={overdueCount > 0 ? 'needs a nudge' : 'all clear'}
          icon={<TriangleAlert className="size-4" />}
          tone={overdueCount > 0 ? 'rose' : 'neutral'}
        />
      </div>

      <SectionTitle>Quick actions</SectionTitle>

      <div className="flex flex-col gap-2">
        <QuickAction
          href="/attendance"
          icon={<ClipboardList className="size-4" />}
          title="Take roll call"
          detail="Mark present, absent or excused for today."
        />
        <QuickAction
          href="/roster"
          icon={<Users className="size-4" />}
          title="Student roster"
          detail="Ranks, match logs and evaluations."
        />
        <QuickAction
          href="/payments"
          icon={<Wallet className="size-4" />}
          title="Fees & reminders"
          detail="Mark paid or send a WhatsApp nudge."
        />
        {session.isHeadCoach ? (
          <>
            <QuickAction
              href="/admin/coaches"
              icon={<UserPlus className="size-4" />}
              title="Onboard a junior coach"
              detail="Create an account and map locations."
            />
            <QuickAction
              href="/admin/locations"
              icon={<MapPin className="size-4" />}
              title="Manage locations"
              detail="Hubs, city areas and court counts."
            />
          </>
        ) : null}
      </div>
    </>
  );
}

function QuickAction({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition active:scale-[0.99]">
        <CardContent className="flex items-center gap-3 py-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-court-50 text-court-700">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="truncate text-[11px] text-slate-500">{detail}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-slate-300" />
        </CardContent>
      </Card>
    </Link>
  );
}
