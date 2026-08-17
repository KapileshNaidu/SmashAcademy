import { Check, CircleDot, Clock, Minus, ShieldCheck, TrendingUp, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { rankMeta, TIER_STYLES } from '@/lib/rank';
import { cn } from '@/lib/utils';
import type {
  ApprovalStatus,
  AttendanceStatus,
  MatchResult,
  PaymentStatus,
  PlayerRank,
  UserRole,
} from '@/lib/types/database';

/**
 * Every status in the app renders through one of these, so a "pending" payment
 * and a "pending" approval can never drift into different colours on different
 * screens.
 */

export function RankBadge({
  rank,
  className,
  showTier = true,
}: {
  rank: PlayerRank;
  className?: string;
  showTier?: boolean;
}) {
  const meta = rankMeta(rank);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset',
        TIER_STYLES[meta.tier].badge,
        className,
      )}
    >
      <TrendingUp className="size-3" />
      {showTier ? meta.label : meta.level}
    </span>
  );
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  if (status === 'approved') {
    return (
      <Badge variant="success">
        <Check className="size-3" /> Approved
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <Badge variant="danger">
        <X className="size-3" /> Rejected
      </Badge>
    );
  }

  return (
    <Badge variant="warning">
      <Clock className="size-3" /> Pending
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  if (status === 'paid') {
    return (
      <Badge variant="success">
        <Check className="size-3" /> Paid
      </Badge>
    );
  }

  if (status === 'overdue') {
    return (
      <Badge variant="danger">
        <Clock className="size-3" /> Overdue
      </Badge>
    );
  }

  return (
    <Badge variant="warning">
      <CircleDot className="size-3" /> Pending
    </Badge>
  );
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  if (status === 'present') {
    return (
      <Badge variant="success">
        <Check className="size-3" /> Present
      </Badge>
    );
  }

  if (status === 'excused') {
    return (
      <Badge variant="info">
        <Minus className="size-3" /> Excused
      </Badge>
    );
  }

  return (
    <Badge variant="danger">
      <X className="size-3" /> Absent
    </Badge>
  );
}

export function ResultBadge({ result }: { result: MatchResult }) {
  return result === 'win' ? (
    <Badge variant="success">Win</Badge>
  ) : (
    <Badge variant="danger">Loss</Badge>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  if (role === 'head_coach') {
    return (
      <Badge variant="violet">
        <ShieldCheck className="size-3" /> Head Coach
      </Badge>
    );
  }

  if (role === 'junior_coach') {
    return (
      <Badge variant="info">
        <ShieldCheck className="size-3" /> Junior Coach
      </Badge>
    );
  }

  return <Badge variant="neutral">Student</Badge>;
}
