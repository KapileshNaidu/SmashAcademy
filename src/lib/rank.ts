import type { PlayerRank } from '@/lib/types/database';

/**
 * Single source of truth for the ranking ladder.
 *
 * RANK_ORDER is index-significant: position in this array IS the rank's
 * strength, and it mirrors the Postgres enum's declaration order so
 * `order('rank', { ascending: false })` server-side and `rankValue()`
 * client-side always agree.
 */
export const RANK_ORDER: readonly PlayerRank[] = [
  'beginner_3',
  'beginner_2',
  'beginner_1',
  'intermediate_3',
  'intermediate_2',
  'intermediate_1',
  'advanced_3',
  'advanced_2',
  'advanced_1',
] as const;

export type RankTier = 'beginner' | 'intermediate' | 'advanced';

export interface RankMeta {
  rank: PlayerRank;
  label: string;
  tier: RankTier;
  tierLabel: string;
  /** 1 = highest within the tier, matching the academy's "Beginner 1 beats Beginner 3". */
  level: 1 | 2 | 3;
  /** 1-9, higher is stronger. */
  value: number;
}

const TIER_LABEL: Record<RankTier, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function rankMeta(rank: PlayerRank): RankMeta {
  const [tier, level] = rank.split('_') as [RankTier, string];

  return {
    rank,
    tier,
    tierLabel: TIER_LABEL[tier],
    level: Number(level) as 1 | 2 | 3,
    label: `${TIER_LABEL[tier]} ${level}`,
    value: RANK_ORDER.indexOf(rank) + 1,
  };
}

export function rankLabel(rank: PlayerRank): string {
  return rankMeta(rank).label;
}

export function rankValue(rank: PlayerRank): number {
  return RANK_ORDER.indexOf(rank) + 1;
}

/** Highest first — the order the leaderboard renders in. */
export function compareRankDesc(a: PlayerRank, b: PlayerRank): number {
  return rankValue(b) - rankValue(a);
}

export function nextRank(rank: PlayerRank): PlayerRank | null {
  return RANK_ORDER[RANK_ORDER.indexOf(rank) + 1] ?? null;
}

export function previousRank(rank: PlayerRank): PlayerRank | null {
  const index = RANK_ORDER.indexOf(rank);
  return index > 0 ? RANK_ORDER[index - 1] : null;
}

export function isValidRank(value: unknown): value is PlayerRank {
  return typeof value === 'string' && RANK_ORDER.includes(value as PlayerRank);
}

/**
 * Tier styling. Tailwind needs literal class strings at build time, so these are
 * written out rather than composed from the tier name.
 */
export const TIER_STYLES: Record<RankTier, { badge: string; ring: string; bar: string; text: string }> = {
  beginner: {
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
    ring: 'ring-emerald-500/30',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  intermediate: {
    badge: 'bg-sky-100 text-sky-800 ring-sky-600/20',
    ring: 'ring-sky-500/30',
    bar: 'bg-sky-500',
    text: 'text-sky-700',
  },
  advanced: {
    badge: 'bg-amber-100 text-amber-900 ring-amber-600/30',
    ring: 'ring-amber-500/40',
    bar: 'bg-amber-500',
    text: 'text-amber-700',
  },
};

/** Grouped for the promote/demote picker, tier by tier, weakest tier first. */
export const RANKS_BY_TIER: { tier: RankTier; tierLabel: string; ranks: PlayerRank[] }[] = (
  ['beginner', 'intermediate', 'advanced'] as RankTier[]
).map((tier) => ({
  tier,
  tierLabel: TIER_LABEL[tier],
  ranks: RANK_ORDER.filter((rank) => rank.startsWith(tier)),
}));
