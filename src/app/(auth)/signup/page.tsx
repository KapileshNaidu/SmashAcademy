'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

import { signupAction, type AuthState } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FormMessage, Input, Select } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signupAction, {});

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Student registration</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            A coach reviews every registration before you get access.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-3.5">
          {state?.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}
          {state?.notice ? <FormMessage tone="success">{state.notice}</FormMessage> : null}

          <Field label="Full name" htmlFor="full_name">
            <Input
              id="full_name"
              name="full_name"
              autoComplete="name"
              placeholder="Ananya Rao"
              required
            />
          </Field>

          <Field
            label="Phone"
            htmlFor="phone"
            hint="Used for WhatsApp fee reminders from your coach."
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              required
            />
          </Field>

          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="you@example.com"
              required
            />
          </Field>

          <Field label="Password" htmlFor="password" hint="At least 8 characters.">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="••••••••"
              required
            />
          </Field>

          {/*
            Role is fixed to Student and the control is disabled, so the public
            form cannot register a coach. This is presentation only — the real
            enforcement is in the handle_new_user() trigger, which ignores any
            role sent to the signup endpoint.
          */}
          <Field label="Registering as" htmlFor="role">
            <Select id="role" name="role_display" value="student" disabled>
              <option value="student">Student</option>
            </Select>
          </Field>

          <div className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">
            <Info className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
            <p>Coach accounts are created by the head coach from inside the app.</p>
          </div>

          <Button type="submit" size="full" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-court-700 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
