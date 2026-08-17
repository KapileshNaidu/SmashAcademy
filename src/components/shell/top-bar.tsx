import Link from 'next/link';

import { RankBadge, RoleBadge } from '@/components/status-badges';
import { Avatar } from '@/components/ui/misc';
import type { Profile } from '@/lib/types/database';

export function TopBar({ profile, locationName }: { profile: Profile; locationName?: string | null }) {
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 py-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-court-600 text-sm font-black text-white">
          {/* Shuttlecock stand-in: the app's only piece of branding. */}
          <span aria-hidden="true">🏸</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight text-slate-900">
            {profile.full_name || 'Academy member'}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {profile.role === 'student' ? (
              <RankBadge rank={profile.rank} />
            ) : (
              <RoleBadge role={profile.role} />
            )}
            {locationName ? (
              <span className="truncate text-[11px] text-slate-500">{locationName}</span>
            ) : null}
          </div>
        </div>

        <Link
          href="/menu"
          aria-label="Open menu"
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-court-500"
        >
          <Avatar name={profile.full_name || '?'} className="size-9" />
        </Link>
      </div>
    </header>
  );
}

/** Per-page title block. Sits inside the scroll area, unlike TopBar. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
