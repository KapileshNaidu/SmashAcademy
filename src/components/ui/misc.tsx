import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';

export function Avatar({
  name,
  className,
  ringClassName,
}: {
  name: string;
  className?: string;
  ringClassName?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white ring-2 ring-transparent',
        ringClassName,
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Compact KPI tile. Two or three of these sit in a grid on every dashboard. */
export function StatTile({
  label,
  value,
  sub,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'court' | 'amber' | 'rose' | 'sky';
}) {
  const tones = {
    neutral: 'bg-white text-slate-900',
    court: 'bg-court-50 text-court-900',
    amber: 'bg-amber-50 text-amber-900',
    rose: 'bg-rose-50 text-rose-900',
    sky: 'bg-sky-50 text-sky-900',
  } as const;

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 px-3.5 py-3 shadow-sm shadow-slate-900/[0.03]',
        tones[tone],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60">{label}</p>
        {icon ? <span className="opacity-50">{icon}</span> : null}
      </div>
      <p className="mt-1 text-2xl font-bold leading-tight tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] opacity-60">{sub}</p> : null}
    </div>
  );
}

/** Horizontal meter used for attendance percentage and skill scores. */
export function Meter({
  value,
  max = 100,
  barClassName,
  label,
}: {
  value: number;
  max?: number;
  barClassName?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div
        className={cn('h-full rounded-full bg-court-500 transition-[width]', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
