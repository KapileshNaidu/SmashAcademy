'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { Field, Input, Select } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import type { Location } from '@/lib/types/database';

/**
 * Location and date live in the URL rather than component state, so a coach can
 * refresh, share, or come back to the exact session they were marking — and so
 * the server does the filtering instead of shipping every location's roster.
 */
export function RollCallFilters({
  locations,
  locationId,
  date,
}: {
  locations: Location[];
  locationId: string | null;
  date: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (key: 'location' | 'date', value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);

    startTransition(() => router.replace(`/attendance?${params}`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-3">
      <Field label="Location" htmlFor="location">
        <Select
          id="location"
          value={locationId ?? ''}
          onChange={(event) => update('location', event.target.value)}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name} · {location.city_area}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Date" htmlFor="date">
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(event) => update('date', event.target.value)}
        />
      </Field>

      {pending ? (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Spinner className="size-3" /> Loading session…
        </p>
      ) : null}
    </div>
  );
}
