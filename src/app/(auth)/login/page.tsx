'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { loginAction, type AuthState } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FormMessage, Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Sign in</h2>
          <p className="mt-0.5 text-xs text-slate-500">Coaches and students use the same login.</p>
        </div>

        <form action={formAction} className="flex flex-col gap-3.5">
          {state?.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}

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

          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </Field>

          <Button type="submit" size="full" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          New student?{' '}
          <Link href="/signup" className="font-semibold text-court-700 underline-offset-2 hover:underline">
            Register here
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
