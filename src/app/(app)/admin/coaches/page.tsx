import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/shell/top-bar';
import { requireHeadCoach } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

import { CoachList } from './coach-list';

export default async function CoachesPage() {
  await requireHeadCoach();
  const supabase = await createClient();

  const [coachesResult, locationsResult, mappingsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .in('role', ['junior_coach', 'head_coach'])
      .order('full_name'),
    supabase.from('locations').select('*').order('name'),
    supabase.from('coach_locations').select('coach_id, location_id'),
  ]);

  const mappings = new Map<string, string[]>();
  for (const row of mappingsResult.data ?? []) {
    mappings.set(row.coach_id, [...(mappings.get(row.coach_id) ?? []), row.location_id]);
  }

  return (
    <>
      <Link
        href="/menu"
        className="-mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500"
      >
        <ArrowLeft className="size-3.5" /> Menu
      </Link>

      <PageHeader
        title="Coaches"
        description="Create junior-coach accounts and map them to locations."
      />

      <CoachList
        coaches={coachesResult.data ?? []}
        locations={locationsResult.data ?? []}
        coachLocations={Object.fromEntries(mappings)}
      />
    </>
  );
}
