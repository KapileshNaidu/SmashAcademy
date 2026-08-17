'use client';

import { LogOut, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { signOutAction } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';

const POLL_INTERVAL_MS = 20_000;

/**
 * Re-checks approval status without the student having to reload.
 *
 * router.refresh() re-runs the server render, and middleware forwards the user
 * to /dashboard as soon as their row flips to approved — so a coach's approval
 * lands on the student's phone within one poll cycle. Polling stops while the
 * tab is hidden; a backgrounded phone should not keep hitting the database.
 */
export function PendingActions({ email }: { email: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const check = () => {
    startTransition(() => {
      router.refresh();
      setCheckedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="flex flex-col gap-2.5">
      <Button variant="outline" size="full" onClick={check} disabled={isPending}>
        <RefreshCw className={isPending ? 'animate-spin' : undefined} />
        {isPending ? 'Checking…' : 'Check status'}
      </Button>

      <form action={signOutAction}>
        <Button type="submit" variant="ghost" size="full">
          <LogOut />
          Sign out
        </Button>
      </form>

      <p className="text-center text-[11px] text-slate-400">
        {checkedAt ? `Last checked at ${checkedAt}` : `Signed in as ${email ?? 'this device'}`}
      </p>
    </div>
  );
}
