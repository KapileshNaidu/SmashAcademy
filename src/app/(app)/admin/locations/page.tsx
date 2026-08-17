import { ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/shell/top-bar';
import { EmptyState } from '@/components/ui/misc';
import { requireHeadCoach } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

import { LocationList } from './location-list';

export default async function LocationsPage() {
  await requireHeadCoach();
  const supabase = await createClient();

  const [locationsResult, profilesResult] = await Promise.all([
    supabase.from('locations').select('*').order('name'),
    supabase.from('profiles').select('location_id'),
  ]);

  const locations = locationsResult.data ?? [];

  // Occupancy per location, so the head coach can see what a delete would strand.
  const counts = new Map<string, number>();
  for (const profile of profilesResult.data ?? []) {
    if (profile.location_id) {
      counts.set(profile.location_id, (counts.get(profile.location_id) ?? 0) + 1);
    }
  }

  return (
    <>
      <Link
        href="/menu"
        className="-mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500"
      >
        <ArrowLeft className="size-3.5" /> Menu
      </Link>

      <PageHeader title="Locations" description="Hubs, city areas and court counts." />

      <LocationList
        locations={locations}
        memberCounts={Object.fromEntries(counts)}
      />

      {locations.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-5" />}
          title="No locations yet"
          description="Add your first hub to start assigning coaches and students."
        />
      ) : null}
    </>
  );
}
