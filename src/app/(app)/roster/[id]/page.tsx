import { ArrowLeft, MessageCircle, Phone, Swords, Target } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/shell/top-bar';
import { SkillRadar, SkillScores } from '@/components/skill-radar';
import { PaymentBadge, RankBadge, ResultBadge } from '@/components/status-badges';
import { Card, CardContent, CardHeader, CardTitle, SectionTitle } from '@/components/ui/card';
import { Avatar, EmptyState, Meter, StatTile } from '@/components/ui/misc';
import { canManageStudent, requireCoach } from '@/lib/auth';
import { LOCATION_EMBED, summarizeAttendance } from '@/lib/queries';
import { rankMeta, TIER_STYLES } from '@/lib/rank';
import { createClient } from '@/lib/supabase/server';
import type { ProfileWithLocation } from '@/lib/types/database';
import { formatCurrency, formatDate, formatDateShort, toWhatsAppNumber } from '@/lib/utils';

import { EvaluationForm } from './evaluation-form';
import { MatchLogForm } from './match-log-form';
import { RankControl } from './rank-control';

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireCoach();
  const supabase = await createClient();

  // LOCATION_EMBED, not a bare locations(...) embed — see its definition for why
  // the FK hint is required here.
  const { data: student } = await supabase
    .from('profiles')
    .select(`*, ${LOCATION_EMBED}`)
    .eq('id', id)
    .maybeSingle<ProfileWithLocation>();

  if (!student) notFound();

  // RLS already hides out-of-scope students; this turns a would-be empty page
  // into an honest 404 and keeps the write controls off-screen.
  if (!canManageStudent(session, student)) notFound();

  const [attendanceResult, matchesResult, paymentsResult, evaluationResult] = await Promise.all([
    supabase.from('sessions_attendance').select('status, date').eq('student_id', id),
    supabase
      .from('match_logs')
      .select('*')
      .eq('student_id', id)
      .order('date', { ascending: false })
      .limit(10),
    supabase
      .from('payments')
      .select('*')
      .eq('student_id', id)
      .order('due_date', { ascending: false })
      .limit(3),
    supabase
      .from('skill_evaluations')
      .select('*')
      .eq('student_id', id)
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const attendance = summarizeAttendance(attendanceResult.data ?? []);
  const matches = matchesResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const evaluation = evaluationResult.data;
  const meta = rankMeta(student.rank);
  const wins = matches.filter((match) => match.result === 'win').length;
  const whatsappNumber = toWhatsAppNumber(student.phone);

  return (
    <>
      <Link
        href="/roster"
        className="-mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500"
      >
        <ArrowLeft className="size-3.5" /> Roster
      </Link>

      <PageHeader title={student.full_name} description={student.location?.name ?? 'Unassigned'} />

      <Card className={`ring-1 ${TIER_STYLES[meta.tier].ring}`}>
        <CardContent className="flex items-center gap-3">
          <Avatar name={student.full_name} className="size-12" />
          <div className="min-w-0 flex-1">
            <RankBadge rank={student.rank} />
            <p className="mt-1 text-[11px] text-slate-500">
              Joined {formatDate(student.created_at)}
            </p>
          </div>
        </CardContent>

        {student.phone ? (
          <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
            <a
              href={`tel:${student.phone}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 py-2 text-xs font-semibold text-slate-700"
            >
              <Phone className="size-3.5" /> Call
            </a>
            {whatsappNumber ? (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 py-2 text-xs font-semibold text-slate-700"
              >
                <MessageCircle className="size-3.5" /> WhatsApp
              </a>
            ) : null}
          </div>
        ) : null}
      </Card>

      <RankControl studentId={student.id} currentRank={student.rank} />

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Sessions" value={attendance.present} sub={`of ${attendance.total}`} tone="court" />
        <StatTile
          label="Attendance"
          value={`${attendance.percentage}%`}
          sub={`${attendance.absent} absent`}
          tone={attendance.percentage >= 75 ? 'court' : 'amber'}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2">
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

      <SectionTitle action={<MatchLogForm studentId={student.id} studentName={student.full_name} />}>
        Match history
      </SectionTitle>

      {matches.length === 0 ? (
        <EmptyState
          icon={<Swords className="size-5" />}
          title="No matches logged"
          description="Record a tournament or ladder result to start the timeline."
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3 py-3">
            <p className="text-[11px] text-slate-500">
              {wins}W · {matches.length - wins}L across the last {matches.length}.
            </p>

            {/* Timeline: a rail with a node per match, newest at the top. */}
            <ol className="relative flex flex-col gap-4 pl-4 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-slate-200">
              {matches.map((match) => (
                <li key={match.id} className="relative">
                  <span
                    className={`absolute -left-4 top-1.5 size-[7px] rounded-full ring-2 ring-white ${
                      match.result === 'win' ? 'bg-court-500' : 'bg-rose-400'
                    }`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        vs {match.opponent_name}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {match.tournament_name} · {formatDateShort(match.date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {match.score ? (
                        <span className="text-[11px] font-semibold tabular-nums text-slate-600">
                          {match.score}
                        </span>
                      ) : null}
                      <ResultBadge result={match.result} />
                    </div>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-500">
                    {match.unforced_errors} unforced error{match.unforced_errors === 1 ? '' : 's'}
                  </p>

                  {match.coach_notes ? (
                    <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] italic text-slate-600">
                      {match.coach_notes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <SectionTitle action={<EvaluationForm studentId={student.id} latest={evaluation} />}>
        Skill evaluation
      </SectionTitle>

      {evaluation ? (
        <Card>
          <CardHeader>
            <CardTitle>Assessed {formatDate(evaluation.evaluated_at)}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-2">
            <SkillRadar evaluation={evaluation} />
            <SkillScores evaluation={evaluation} />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<Target className="size-5" />}
          title="Not evaluated yet"
          description="Score footwork, stamina, smash power and net control from 1 to 10."
        />
      )}

      <SectionTitle>Fees</SectionTitle>

      {payments.length === 0 ? (
        <EmptyState icon={<Target className="size-5" />} title="No invoices raised" />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {payment.billing_cycle} · due {formatDateShort(payment.due_date)}
                  </p>
                </div>
                <PaymentBadge status={payment.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
