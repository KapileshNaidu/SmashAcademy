import { Activity, CalendarDays, ChevronRight, Percent, Swords, Target, Wallet } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/shell/top-bar';
import { SkillRadar, SkillScores } from '@/components/skill-radar';
import { PaymentBadge, ResultBadge } from '@/components/status-badges';
import { Card, CardContent, CardHeader, CardTitle, SectionTitle } from '@/components/ui/card';
import { EmptyState, Meter, StatTile } from '@/components/ui/misc';
import type { SessionContext } from '@/lib/auth';
import { summarizeAttendance } from '@/lib/queries';
import { nextRank, rankMeta, TIER_STYLES } from '@/lib/rank';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDateShort, pluralize } from '@/lib/utils';

export async function StudentDashboard({ session }: { session: SessionContext }) {
  const supabase = await createClient();
  const studentId = session.userId;

  // One round-trip per panel, issued together — these do not depend on each other.
  const [attendanceResult, matchesResult, paymentsResult, evaluationResult] = await Promise.all([
    supabase.from('sessions_attendance').select('status, date').eq('student_id', studentId),
    supabase
      .from('match_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
      .limit(3),
    supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('due_date', { ascending: false })
      .limit(1),
    supabase
      .from('skill_evaluations')
      .select('*')
      .eq('student_id', studentId)
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const attendance = summarizeAttendance(attendanceResult.data ?? []);
  const matches = matchesResult.data ?? [];
  const latestPayment = paymentsResult.data?.[0] ?? null;
  const evaluation = evaluationResult.data;

  const meta = rankMeta(session.profile.rank);
  const promotion = nextRank(session.profile.rank);
  const wins = matches.filter((match) => match.result === 'win').length;

  return (
    <>
      <PageHeader
        title={`Hi, ${session.profile.full_name.split(' ')[0] || 'player'}`}
        description="Your training at a glance."
      />

      {/* Rank hero — the number a student checks first. */}
      <Card className={`overflow-hidden ring-1 ${TIER_STYLES[meta.tier].ring}`}>
        <CardContent className="flex items-center gap-4">
          <div
            className={`grid size-16 shrink-0 place-items-center rounded-2xl ${TIER_STYLES[meta.tier].badge}`}
          >
            <span className="text-xl font-black">{meta.level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Current rank
            </p>
            <p className="text-lg font-bold leading-tight text-slate-900">{meta.label}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {promotion
                ? `Next up: ${rankMeta(promotion).label}`
                : 'Top of the ladder — nothing above this.'}
            </p>
          </div>
        </CardContent>
        <div className="h-1.5 w-full bg-slate-100">
          <div
            className={`h-full ${TIER_STYLES[meta.tier].bar}`}
            style={{ width: `${(meta.value / 9) * 100}%` }}
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Sessions"
          value={attendance.present}
          sub={`of ${pluralize(attendance.total, 'logged session')}`}
          icon={<CalendarDays className="size-4" />}
          tone="court"
        />
        <StatTile
          label="Attendance"
          value={`${attendance.percentage}%`}
          sub={attendance.excused > 0 ? `${attendance.excused} excused` : 'present vs absent'}
          icon={<Percent className="size-4" />}
          tone={attendance.percentage >= 75 ? 'court' : 'amber'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance rate</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-0">
          <Meter
            value={attendance.percentage}
            label="Attendance percentage"
            barClassName={attendance.percentage >= 75 ? 'bg-court-500' : 'bg-amber-500'}
          />
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>{attendance.present} present</span>
            <span>{attendance.absent} absent</span>
            <span>{attendance.excused} excused</span>
          </div>
        </CardContent>
      </Card>

      <SectionTitle
        action={
          <Link
            href="/matches"
            className="flex items-center text-[11px] font-semibold text-court-700"
          >
            All matches <ChevronRight className="size-3.5" />
          </Link>
        }
      >
        Recent matches
      </SectionTitle>

      {matches.length === 0 ? (
        <EmptyState
          icon={<Swords className="size-5" />}
          title="No matches logged yet"
          description="Your coach records tournament and ladder results here."
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3 py-3">
            <p className="text-[11px] text-slate-500">
              {wins} of {matches.length} won in your latest outings.
            </p>
            <ul className="flex flex-col divide-y divide-slate-100">
              {matches.map((match) => (
                <li key={match.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      vs {match.opponent_name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {match.tournament_name} · {formatDateShort(match.date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {match.score ? (
                      <span className="text-[11px] font-semibold tabular-nums text-slate-600">
                        {match.score}
                      </span>
                    ) : null}
                    <ResultBadge result={match.result} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <SectionTitle>Skill assessment</SectionTitle>

      {evaluation ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <SkillRadar evaluation={evaluation} />
            <SkillScores evaluation={evaluation} />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<Target className="size-5" />}
          title="No evaluation yet"
          description="Your coach scores footwork, stamina, smash and net control after an assessment."
        />
      )}

      <SectionTitle
        action={
          <Link
            href="/payments"
            className="flex items-center text-[11px] font-semibold text-court-700"
          >
            All fees <ChevronRight className="size-3.5" />
          </Link>
        }
      >
        Fees
      </SectionTitle>

      {latestPayment ? (
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <Wallet className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">
                {formatCurrency(latestPayment.amount)}
              </p>
              <p className="text-[11px] text-slate-500">{latestPayment.billing_cycle}</p>
            </div>
            <PaymentBadge status={latestPayment.status} />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<Activity className="size-5" />}
          title="No invoices yet"
          description="Fee records raised by your coach appear here."
        />
      )}
    </>
  );
}
