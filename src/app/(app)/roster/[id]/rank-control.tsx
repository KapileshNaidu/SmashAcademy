'use client';

import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { startTransition, useActionState, useState } from 'react';

import { setRankAction } from '@/app/(app)/roster/actions';
import { RankBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer } from '@/components/ui/drawer';
import { Field, FormMessage, Select } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import type { ActionResult } from '@/lib/action-result';
import { nextRank, previousRank, rankLabel, RANKS_BY_TIER } from '@/lib/rank';
import type { PlayerRank } from '@/lib/types/database';

/**
 * Rank promotion control.
 *
 * Promote/demote by one step are the two moves a coach makes almost every time,
 * so they are one tap each; the full ladder is behind "Set rank" for the
 * occasional jump. The server re-checks authority either way — this component
 * only decides what is worth showing.
 */
export function RankControl({
  studentId,
  currentRank,
}: {
  studentId: string;
  currentRank: PlayerRank;
}) {
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useActionState<ActionResult, FormData>(setRankAction, {});

  const promoted = nextRank(currentRank);
  const demoted = previousRank(currentRank);

  const quickChange = (rank: PlayerRank) => {
    const formData = new FormData();
    formData.set('student_id', studentId);
    formData.set('rank', rank);

    // Promote/demote fire from onClick rather than a form submit, so the
    // transition has to be opened by hand — without it React warns and `pending`
    // never flips, leaving the buttons with no spinner while the write is inflight.
    startTransition(() => submit(formData));
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Rank
            </p>
            <div className="mt-1">
              <RankBadge rank={currentRank} />
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={pending}>
            <TrendingUp />
            Set rank
          </Button>
        </div>

        {state && 'ok' in state && !state.ok ? (
          <FormMessage tone="error">{state.error}</FormMessage>
        ) : null}
        {state && 'ok' in state && state.ok && state.message ? (
          <FormMessage tone="success">{state.message}</FormMessage>
        ) : null}

        <div className="flex gap-2">
          <Button
            variant="subtle"
            className="flex-1"
            disabled={!promoted || pending}
            onClick={() => promoted && quickChange(promoted)}
          >
            {pending ? <Spinner /> : <ChevronUp />}
            {promoted ? `Promote to ${rankLabel(promoted)}` : 'Top rank'}
          </Button>

          <Button
            variant="outline"
            size="icon"
            aria-label={demoted ? `Demote to ${rankLabel(demoted)}` : 'Already at lowest rank'}
            disabled={!demoted || pending}
            onClick={() => demoted && quickChange(demoted)}
          >
            <ChevronDown />
          </Button>
        </div>
      </CardContent>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Set rank"
        description="Move this student anywhere on the ladder."
      >
        <form
          action={(formData) => {
            submit(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="student_id" value={studentId} />

          <Field label="Rank" htmlFor="rank-picker">
            <Select id="rank-picker" name="rank" defaultValue={currentRank}>
              {RANKS_BY_TIER.map((group) => (
                <optgroup key={group.tier} label={group.tierLabel}>
                  {group.ranks.map((rank) => (
                    <option key={rank} value={rank}>
                      {rankLabel(rank)}
                      {rank === currentRank ? ' (current)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>

          <Button type="submit" size="full" disabled={pending}>
            {pending ? <Spinner /> : null}
            Save rank
          </Button>
        </form>
      </Drawer>
    </Card>
  );
}
