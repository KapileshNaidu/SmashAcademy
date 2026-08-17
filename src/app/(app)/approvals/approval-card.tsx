'use client';

import { Check, Phone, X } from 'lucide-react';
import { useActionState, useState } from 'react';

import { approveStudentAction, rejectStudentAction } from '@/app/(app)/approvals/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer } from '@/components/ui/drawer';
import { Field, FormMessage, Select } from '@/components/ui/input';
import { Avatar, Spinner } from '@/components/ui/misc';
import type { ActionResult } from '@/lib/action-result';
import { RANKS_BY_TIER, rankLabel } from '@/lib/rank';
import type { Location, ProfileWithLocation } from '@/lib/types/database';
import { formatDate } from '@/lib/utils';

/**
 * One pending registration.
 *
 * Approving needs two decisions (location and starting rank), which is too much
 * for an inline row on a phone — so approval opens a sheet, while rejection,
 * needing no input, stays a single tap.
 */
export function ApprovalCard({
  student,
  locations,
}: {
  student: ProfileWithLocation;
  locations: Location[];
}) {
  const [open, setOpen] = useState(false);
  const [approveState, approve, approving] = useActionState<ActionResult, FormData>(
    approveStudentAction,
    {},
  );
  const [rejectState, reject, rejecting] = useActionState<ActionResult, FormData>(
    rejectStudentAction,
    {},
  );

  const error =
    (approveState && 'ok' in approveState && !approveState.ok && approveState.error) ||
    (rejectState && 'ok' in rejectState && !rejectState.ok && rejectState.error) ||
    null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={student.full_name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{student.full_name}</p>
            <p className="truncate text-[11px] text-slate-500">
              Registered {formatDate(student.created_at)}
            </p>
          </div>
        </div>

        {student.phone ? (
          <a
            href={`tel:${student.phone}`}
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600"
          >
            <Phone className="size-3" />
            {student.phone}
          </a>
        ) : null}

        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => setOpen(true)}
            disabled={locations.length === 0 || rejecting}
          >
            <Check />
            Approve
          </Button>

          <form action={reject}>
            <input type="hidden" name="student_id" value={student.id} />
            <Button type="submit" variant="outline" disabled={rejecting || approving}>
              {rejecting ? <Spinner /> : <X />}
              Reject
            </Button>
          </form>
        </div>
      </CardContent>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title={`Approve ${student.full_name}`}
        description="Place them in a location and set a starting rank."
      >
        <form
          action={(formData) => {
            approve(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="student_id" value={student.id} />

          <Field label="Location (batch)" htmlFor={`location-${student.id}`}>
            <Select id={`location-${student.id}`} name="location_id" required defaultValue="">
              <option value="" disabled>
                Choose a location…
              </option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} · {location.city_area}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Starting rank"
            htmlFor={`rank-${student.id}`}
            hint="Most new students start at Beginner 3."
          >
            <Select id={`rank-${student.id}`} name="rank" defaultValue="beginner_3">
              {RANKS_BY_TIER.map((group) => (
                <optgroup key={group.tier} label={group.tierLabel}>
                  {group.ranks.map((rank) => (
                    <option key={rank} value={rank}>
                      {rankLabel(rank)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>

          <Button type="submit" size="full" disabled={approving}>
            {approving ? <Spinner /> : <Check />}
            Approve and place
          </Button>
        </form>
      </Drawer>
    </Card>
  );
}
