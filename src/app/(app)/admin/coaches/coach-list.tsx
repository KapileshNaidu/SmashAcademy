'use client';

import { MapPin, ShieldCheck, UserPlus } from 'lucide-react';
import { useActionState, useState } from 'react';

import { createJuniorCoachAction, updateCoachLocationsAction } from '@/app/(app)/admin/actions';
import { RoleBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer } from '@/components/ui/drawer';
import { Field, FormMessage, Input } from '@/components/ui/input';
import { Avatar, EmptyState, Spinner } from '@/components/ui/misc';
import type { ActionResult } from '@/lib/action-result';
import { useCloseOnSuccess } from '@/lib/use-close-on-success';
import type { Location, Profile } from '@/lib/types/database';

export function CoachList({
  coaches,
  locations,
  coachLocations,
}: {
  coaches: Profile[];
  locations: Location[];
  coachLocations: Record<string, string[]>;
}) {
  const [creating, setCreating] = useState(false);
  const [remapping, setRemapping] = useState<Profile | null>(null);

  const [createState, create, saving] = useActionState<ActionResult, FormData>(
    createJuniorCoachAction,
    {},
  );
  const [remapState, remap, remapping_] = useActionState<ActionResult, FormData>(
    updateCoachLocationsAction,
    {},
  );

  useCloseOnSuccess(createState, () => setCreating(false));
  useCloseOnSuccess(remapState, () => setRemapping(null));

  const locationName = (id: string) => locations.find((location) => location.id === id)?.name ?? id;

  return (
    <>
      <Button size="full" onClick={() => setCreating(true)} disabled={locations.length === 0}>
        <UserPlus />
        Onboard junior coach
      </Button>

      {locations.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
          Create a location first — every coach must be mapped to at least one.
        </p>
      ) : null}

      {createState && 'ok' in createState && createState.ok && createState.message ? (
        <FormMessage tone="success">{createState.message}</FormMessage>
      ) : null}

      {coaches.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="size-5" />} title="No coaches yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {coaches.map((coach) => {
            const mapped = coachLocations[coach.id] ?? [];
            const isHead = coach.role === 'head_coach';

            return (
              <Card key={coach.id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={coach.full_name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {coach.full_name}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {coach.phone ?? 'No phone on file'}
                      </p>
                    </div>
                    <RoleBadge role={coach.role} />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {isHead ? (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                        All locations
                      </span>
                    ) : mapped.length === 0 ? (
                      <span className="text-[11px] text-amber-700">No locations mapped</span>
                    ) : (
                      mapped.map((id) => (
                        <span
                          key={id}
                          className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          <MapPin className="size-3" />
                          {locationName(id)}
                        </span>
                      ))
                    )}
                  </div>

                  {!isHead ? (
                    <Button variant="outline" size="sm" onClick={() => setRemapping(coach)}>
                      <MapPin />
                      Change locations
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create ------------------------------------------------------------ */}
      <Drawer
        open={creating}
        onOpenChange={setCreating}
        title="Onboard a junior coach"
        description="They can sign in immediately with the temporary password you set."
      >
        <form action={create} className="flex flex-col gap-3.5">
          {createState && 'ok' in createState && !createState.ok ? (
            <FormMessage tone="error">{createState.error}</FormMessage>
          ) : null}

          <Field label="Full name" htmlFor="coach_name">
            <Input id="coach_name" name="full_name" placeholder="Vikram Iyer" required />
          </Field>

          <Field label="Email" htmlFor="coach_email">
            <Input
              id="coach_email"
              name="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              placeholder="vikram@academy.com"
              required
            />
          </Field>

          <Field label="Phone" htmlFor="coach_phone">
            <Input id="coach_phone" name="phone" type="tel" inputMode="tel" placeholder="98765 43210" />
          </Field>

          <Field
            label="Temporary password"
            htmlFor="coach_password"
            hint="Share it with the coach and ask them to change it after signing in."
          >
            <Input
              id="coach_password"
              name="password"
              type="text"
              minLength={8}
              placeholder="At least 8 characters"
              required
            />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-slate-700">Locations</legend>
            <div className="flex flex-col gap-1.5">
              {locations.map((location) => (
                <label
                  key={location.id}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3"
                >
                  <input
                    type="checkbox"
                    name="location_ids"
                    value={location.id}
                    className="size-4 accent-court-600"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">
                    {location.name}
                    <span className="ml-1 text-slate-400">· {location.city_area}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit" size="full" disabled={saving}>
            {saving ? <Spinner /> : <UserPlus />}
            {saving ? 'Creating account…' : 'Create coach account'}
          </Button>
        </form>
      </Drawer>

      {/* Remap ------------------------------------------------------------- */}
      <Drawer
        open={remapping !== null}
        onOpenChange={(open) => !open && setRemapping(null)}
        title={remapping ? `${remapping.full_name}'s locations` : 'Locations'}
        description="They can only take roll call and place students where they are mapped."
      >
        {remapping ? (
          <form action={remap} className="flex flex-col gap-3.5">
            <input type="hidden" name="coach_id" value={remapping.id} />

            {remapState && 'ok' in remapState && !remapState.ok ? (
              <FormMessage tone="error">{remapState.error}</FormMessage>
            ) : null}

            <div className="flex flex-col gap-1.5">
              {locations.map((location) => (
                <label
                  key={location.id}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3"
                >
                  <input
                    type="checkbox"
                    name="location_ids"
                    value={location.id}
                    defaultChecked={(coachLocations[remapping.id] ?? []).includes(location.id)}
                    className="size-4 accent-court-600"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">
                    {location.name}
                    <span className="ml-1 text-slate-400">· {location.city_area}</span>
                  </span>
                </label>
              ))}
            </div>

            <Button type="submit" size="full" disabled={remapping_}>
              {remapping_ ? <Spinner /> : null}
              Save locations
            </Button>
          </form>
        ) : null}
      </Drawer>
    </>
  );
}
