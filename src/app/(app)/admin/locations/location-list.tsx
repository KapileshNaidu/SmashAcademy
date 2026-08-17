'use client';

import { MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useActionState, useState } from 'react';

import { deleteLocationAction, saveLocationAction } from '@/app/(app)/admin/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer } from '@/components/ui/drawer';
import { Field, FormMessage, Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import type { ActionResult } from '@/lib/action-result';
import { useCloseOnSuccess } from '@/lib/use-close-on-success';
import type { Location } from '@/lib/types/database';
import { pluralize } from '@/lib/utils';

export function LocationList({
  locations,
  memberCounts,
}: {
  locations: Location[];
  memberCounts: Record<string, number>;
}) {
  // null = sheet closed, {} = creating, Location = editing that row.
  const [editing, setEditing] = useState<Location | Record<string, never> | null>(null);
  const [saveState, save, saving] = useActionState<ActionResult, FormData>(saveLocationAction, {});
  const [deleteState, remove, deleting] = useActionState<ActionResult, FormData>(
    deleteLocationAction,
    {},
  );

  useCloseOnSuccess(saveState, () => setEditing(null));

  const current = editing && 'id' in editing ? (editing as Location) : null;

  return (
    <>
      <Button size="full" onClick={() => setEditing({})}>
        <Plus />
        Add location
      </Button>

      {deleteState && 'ok' in deleteState && !deleteState.ok ? (
        <FormMessage tone="error">{deleteState.error}</FormMessage>
      ) : null}

      <div className="flex flex-col gap-3">
        {locations.map((location) => {
          const members = memberCounts[location.id] ?? 0;

          return (
            <Card key={location.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-court-50 text-court-700">
                    <MapPin className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{location.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{location.city_area}</p>
                    {location.address ? (
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">
                        {location.address}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {pluralize(location.total_courts, 'court')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {pluralize(members, 'member')}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditing(location)}
                  >
                    <Pencil />
                    Edit
                  </Button>

                  <form action={remove}>
                    <input type="hidden" name="id" value={location.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={deleting || members > 0}
                      // Disabled while occupied: deleting would set every member's
                      // location_id to null and silently empty the roster.
                      title={
                        members > 0 ? 'Move the people assigned here first' : 'Delete location'
                      }
                      className="text-rose-600"
                    >
                      {deleting ? <Spinner /> : <Trash2 />}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Drawer
        open={editing !== null}
        onOpenChange={(open) => setEditing(open ? (editing ?? {}) : null)}
        title={current ? 'Edit location' : 'Add location'}
        description="Students and coaches are mapped to these."
      >
        <form action={save} className="flex flex-col gap-3.5">
          {current ? <input type="hidden" name="id" value={current.id} /> : null}

          {saveState && 'ok' in saveState && !saveState.ok ? (
            <FormMessage tone="error">{saveState.error}</FormMessage>
          ) : null}

          <Field label="Name" htmlFor="name" hint='e.g. "North Hub - Court 1-4"'>
            <Input
              id="name"
              name="name"
              defaultValue={current?.name ?? ''}
              placeholder="North Hub - Court 1-4"
              required
            />
          </Field>

          <Field label="City area" htmlFor="city_area">
            <Input
              id="city_area"
              name="city_area"
              defaultValue={current?.city_area ?? ''}
              placeholder="Indiranagar"
              required
            />
          </Field>

          <Field label="Address" htmlFor="address">
            <Input
              id="address"
              name="address"
              defaultValue={current?.address ?? ''}
              placeholder="100 Feet Road, Bengaluru"
            />
          </Field>

          <Field label="Total courts" htmlFor="total_courts">
            <Input
              id="total_courts"
              name="total_courts"
              type="number"
              inputMode="numeric"
              min={1}
              defaultValue={current?.total_courts ?? 4}
              required
            />
          </Field>

          <Button type="submit" size="full" disabled={saving}>
            {saving ? <Spinner /> : null}
            {saving ? 'Saving…' : current ? 'Save changes' : 'Create location'}
          </Button>
        </form>
      </Drawer>
    </>
  );
}
