import { BottomNav } from '@/components/shell/bottom-nav';
import { TopBar } from '@/components/shell/top-bar';
import { requireApproved } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * The authenticated shell: a phone-width column that stays centred on desktop.
 *
 * requireApproved() runs here so every page in this group inherits the gate —
 * middleware has already redirected unapproved users, but this is the check that
 * actually protects the data, since middleware can be bypassed by a direct
 * Server Action POST.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireApproved();

  let locationName: string | null = null;

  if (session.profile.location_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('locations')
      .select('name')
      .eq('id', session.profile.location_id)
      .maybeSingle();

    locationName = data?.name ?? null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <TopBar profile={session.profile} locationName={locationName} />

      {/* pb-nav clears the fixed bottom bar so the last card is never trapped. */}
      <main className="mx-auto w-full max-w-lg px-4 pb-[calc(var(--spacing-nav)+1.5rem)] pt-4">
        <div className="animate-rise-in flex flex-col gap-4">{children}</div>
      </main>

      <BottomNav role={session.profile.role} />
    </div>
  );
}
