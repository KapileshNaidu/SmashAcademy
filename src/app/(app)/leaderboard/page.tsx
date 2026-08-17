import { Trophy } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/shell/top-bar';
import { RankBadge } from '@/components/status-badges';
import { Card } from '@/components/ui/card';
import { Avatar, EmptyState } from '@/components/ui/misc';
import { requireApproved } from '@/lib/auth';
import { rankMeta, RANKS_BY_TIER, TIER_STYLES } from '@/lib/rank';
import { createClient } from '@/lib/supabase/server';
import type { LeaderboardEntry } from '@/lib/types/database';
import { cn } from '@/lib/utils';

export default async function LeaderboardPage() {
  const session = await requireApproved();
  const supabase = await createClient();

  /*
   * Reads the `leaderboard` view, not `profiles`. The view projects only name,
   * rank and location, so making the ladder visible to everyone does not also
   * make every student's phone number visible to everyone. It gates itself on
   * is_approved(), so an unapproved account simply gets no rows.
   *
   * Ordering happens in Postgres: player_rank is an enum, so `rank desc` sorts
   * by declaration order (advanced_1 first) with no client-side mapping.
   */
  const { data } = await supabase
    .from('leaderboard')
    .select('*')
    .order('rank', { ascending: false })
    .order('full_name', { ascending: true });

  const players = (data as LeaderboardEntry[] | null) ?? [];

  // Standard competition ranking: players on the same rank share a position, and
  // the next distinct rank skips ahead (1, 2, 2, 4). Built with a plain loop
  // reading the previous row rather than mutating captured variables in a map.
  const rows: { player: LeaderboardEntry; position: number }[] = [];

  for (const [index, player] of players.entries()) {
    const previous = rows[rows.length - 1];

    rows.push({
      player,
      position: previous?.player.rank === player.rank ? previous.position : index + 1,
    });
  }

  const tierCounts = RANKS_BY_TIER.map((group) => ({
    ...group,
    count: players.filter((player) => player.rank.startsWith(group.tier)).length,
  }));

  return (
    <>
      <PageHeader title="Leaderboard" description="Every approved player, strongest rank first." />

      <div className="grid grid-cols-3 gap-2">
        {tierCounts.map((group) => (
          <div
            key={group.tier}
            className={cn(
              'rounded-xl px-2.5 py-2 text-center ring-1 ring-inset',
              TIER_STYLES[group.tier].badge,
            )}
          >
            <p className="text-lg font-bold leading-none tabular-nums">{group.count}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">
              {group.tierLabel}
            </p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-5" />}
          title="No ranked players yet"
          description="Students appear here once a coach approves them."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {rows.map(({ player, position }) => {
              const meta = rankMeta(player.rank);
              const isSelf = player.id === session.userId;

              // Only link where the coach actually has authority — /roster/[id]
              // 404s otherwise, and a dead link is worse than plain text.
              const canOpen =
                session.isHeadCoach ||
                (session.isCoach &&
                  player.location_id !== null &&
                  session.coachLocationIds.includes(player.location_id));

              const row = (
                <div className={cn('flex items-center gap-3 px-4 py-3', isSelf && 'bg-court-50/70')}>
                  <span
                    className={cn(
                      'w-6 shrink-0 text-center text-sm font-bold tabular-nums',
                      position <= 3 ? 'text-amber-600' : 'text-slate-400',
                    )}
                  >
                    {position}
                  </span>

                  <Avatar
                    name={player.full_name}
                    className="size-9"
                    ringClassName={isSelf ? 'ring-court-500' : undefined}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {player.full_name}
                      {isSelf ? (
                        <span className="ml-1.5 text-[10px] font-bold uppercase text-court-700">
                          You
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {player.location_name ?? 'Unassigned'}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <RankBadge rank={player.rank} />
                    <span className="text-[10px] font-semibold text-slate-400">
                      Tier {meta.value}/9
                    </span>
                  </div>
                </div>
              );

              return (
                <li key={player.id}>
                  {canOpen ? (
                    <Link href={`/roster/${player.id}`} className="block active:bg-slate-50">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
