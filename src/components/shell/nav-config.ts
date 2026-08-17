import type { UserRole } from '@/lib/types/database';

export type NavIcon =
  | 'home'
  | 'users'
  | 'clipboard'
  | 'wallet'
  | 'menu'
  | 'trophy'
  | 'swords';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

/**
 * Bottom-nav destinations per role, capped at five — past that, targets get too
 * narrow to hit reliably with a thumb. Lower-traffic destinations (approvals,
 * admin, leaderboard for coaches) live behind the Menu tab instead.
 */
const COACH_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/roster', label: 'Roster', icon: 'users' },
  { href: '/attendance', label: 'Roll Call', icon: 'clipboard' },
  { href: '/payments', label: 'Fees', icon: 'wallet' },
  { href: '/menu', label: 'Menu', icon: 'menu' },
];

const STUDENT_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/leaderboard', label: 'Ranks', icon: 'trophy' },
  { href: '/matches', label: 'Matches', icon: 'swords' },
  { href: '/payments', label: 'Fees', icon: 'wallet' },
  { href: '/menu', label: 'Menu', icon: 'menu' },
];

export function navForRole(role: UserRole): NavItem[] {
  return role === 'student' ? STUDENT_NAV : COACH_NAV;
}
