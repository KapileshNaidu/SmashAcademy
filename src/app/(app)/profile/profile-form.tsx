'use client';

import { useActionState } from 'react';

import { updateOwnProfileAction } from '@/app/(app)/profile/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FormMessage, Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import type { ActionResult } from '@/lib/action-result';
import type { Profile } from '@/lib/types/database';

export function ProfileForm({ profile, email }: { profile: Profile; email: string | null }) {
  const [state, submit, pending] = useActionState<ActionResult, FormData>(
    updateOwnProfileAction,
    {},
  );

  return (
    <Card>
      <CardContent>
        <form action={submit} className="flex flex-col gap-3.5">
          {state && 'ok' in state && !state.ok ? (
            <FormMessage tone="error">{state.error}</FormMessage>
          ) : null}
          {state && 'ok' in state && state.ok && state.message ? (
            <FormMessage tone="success">{state.message}</FormMessage>
          ) : null}

          <Field label="Full name" htmlFor="full_name">
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name}
              autoComplete="name"
              required
            />
          </Field>

          <Field
            label="Phone"
            htmlFor="phone"
            hint="Your coach uses this for WhatsApp fee reminders."
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={profile.phone ?? ''}
              placeholder="98765 43210"
            />
          </Field>

          {/* Email changes go through Supabase Auth's own verification flow, so
              it is shown here read-only rather than faked as editable. */}
          <Field label="Email" htmlFor="email" hint="Contact the head coach to change this.">
            <Input id="email" value={email ?? ''} disabled readOnly />
          </Field>

          <Button type="submit" size="full" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
