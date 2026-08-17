'use client';

import {
  ClipboardList,
  House,
  Menu as MenuIcon,
  Swords,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { navForRole, type NavIcon } from '@/components/shell/nav-config';
import type { UserRole } from '@/lib/types/database';
import { cn } from '@/lib/utils';

const ICONS: Record<NavIcon, typeof House> = {
  home: House,
  users: Users,
  clipboard: ClipboardList,
  wallet: Wallet,
  menu: MenuIcon,
  trophy: Trophy,
  swords: Swords,
};

export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = navForRole(role);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/85 backdrop-blur-xl"
    >
      <div className="pb-safe mx-auto flex w-full max-w-lg items-stretch">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          // Prefix match so /roster/<id> keeps the Roster tab lit.
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition',
                active ? 'text-court-700' : 'text-slate-400 active:text-slate-600',
              )}
            >
              <span
                className={cn(
                  'grid size-8 place-items-center rounded-xl transition',
                  active && 'bg-court-50',
                )}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
