import { Swords } from 'lucide-react';

import { PageHeader } from '@/components/shell/top-bar';
import { ResultBadge } from '@/components/status-badges';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, StatTile } from '@/components/ui/misc';
import { requireApproved } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

/**
 * A student's own match timeline. Coaches reach match history through a
 * student's roster page, where they can also add to it.
 */
export default async function MatchesPage() {
  const session = await requireApproved();
  const supabase = await createClient();

  const { data } = await supabase
    .from('match_logs')
    .select('*')
    .eq('student_id', session.userId)
    .order('date', { ascending: false });

  const matches = data ?? [];
  const wins = matches.filter((match) => match.result === 'win').length;
  const totalErrors = matches.reduce((sum, match) => sum + match.unforced_errors, 0);
  const winRate = matches.length === 0 ? 0 : Math.round((wins / matches.length) * 100);

  return (
    <>
      <PageHeader title="Match history" description="Tournament and ladder results." />

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Played" value={matches.length} />
        <StatTile label="Won" value={wins} tone="court" />
        <StatTile label="Win rate" value={`${winRate}%`} tone={winRate >= 50 ? 'court' : 'amber'} />
      </div>

      {matches.length === 0 ? (
        <EmptyState
          icon={<Swords className="size-5" />}
          title="No matches yet"
          description="Your coach logs tournament and ladder results here."
        />
      ) : (
        <>
          <p className="px-1 text-[11px] text-slate-500">
            {totalErrors} unforced error{totalErrors === 1 ? '' : 's'} across {matches.length}{' '}
            match{matches.length === 1 ? '' : 'es'} — averaging{' '}
            {(totalErrors / matches.length).toFixed(1)} per match.
          </p>

          <Card>
            <CardContent>
              <ol className="relative flex flex-col gap-5 pl-4 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-slate-200">
                {matches.map((match) => (
                  <li key={match.id} className="relative">
                    <span
                      className={`absolute -left-4 top-1.5 size-[7px] rounded-full ring-2 ring-white ${
                        match.result === 'win' ? 'bg-court-500' : 'bg-rose-400'
                      }`}
                    />

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          vs {match.opponent_name}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {match.tournament_name} · {formatDate(match.date)}
                        </p>
                      </div>
                      <ResultBadge result={match.result} />
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {match.score ? (
                        <span className="font-semibold tabular-nums text-slate-700">
                          {match.score}
                        </span>
                      ) : null}
                      <span>{match.unforced_errors} unforced</span>
                    </div>

                    {match.coach_notes ? (
                      <p className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] italic leading-relaxed text-slate-600">
                        {match.coach_notes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
