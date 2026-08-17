import { CircleCheck, Hourglass, ShieldAlert } from 'lucide-react';
import { redirect } from 'next/navigation';

import { PendingActions } from '@/app/pending/pending-actions';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionContext } from '@/lib/auth';

/**
 * Holding screen for a self-registered student whose profile is still `pending`
 * (or was `rejected`). Middleware pins unapproved accounts here; this page never
 * renders for an approved user.
 */
export default async function PendingPage() {
  const session = await getSessionContext();

  if (!session) redirect('/login');
  if (session.profile.approval_status === 'approved') redirect('/dashboard');

  const rejected = session.profile.approval_status === 'rejected';

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="pt-safe mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <Card className="overflow-hidden">
          <div
            className={
              rejected
                ? 'flex flex-col items-center gap-3 bg-rose-50 px-6 py-9 text-center'
                : 'flex flex-col items-center gap-3 bg-amber-50 px-6 py-9 text-center'
            }
          >
            <div
              className={
                rejected
                  ? 'grid size-16 place-items-center rounded-full bg-rose-100 text-rose-600'
                  : 'grid size-16 place-items-center rounded-full bg-amber-100 text-amber-600'
              }
            >
              {rejected ? (
                <ShieldAlert className="size-7" />
              ) : (
                <Hourglass className="size-7 animate-pulse" />
              )}
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {rejected ? 'Registration not approved' : 'Waiting for coach approval'}
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {rejected
                  ? 'A coach reviewed your registration and did not approve it. Speak to the academy front desk if you think this is a mistake.'
                  : `Thanks for registering, ${session.profile.full_name.split(' ')[0]}. A coach will review your details and assign you to a batch — this page unlocks the moment they do.`}
              </p>
            </div>
          </div>

          <CardContent className="flex flex-col gap-4">
            {!rejected ? (
              <ol className="flex flex-col gap-3">
                <Step done label="Account created" detail="Your registration reached the academy." />
                <Step
                  current
                  label="Coach review"
                  detail="A coach assigns your location and starting rank."
                />
                <Step label="Full access" detail="Attendance, ranks, fees and match logs." />
              </ol>
            ) : null}

            <PendingActions email={session.email} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Step({
  label,
  detail,
  done,
  current,
}: {
  label: string;
  detail: string;
  done?: boolean;
  current?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5">
        {done ? (
          <CircleCheck className="size-5 text-court-600" />
        ) : (
          <span
            className={
              current
                ? 'grid size-5 place-items-center rounded-full border-2 border-amber-500'
                : 'grid size-5 place-items-center rounded-full border-2 border-slate-300'
            }
          >
            {current ? <span className="size-2 rounded-full bg-amber-500" /> : null}
          </span>
        )}
      </div>
      <div>
        <p
          className={
            done || current
              ? 'text-xs font-semibold text-slate-900'
              : 'text-xs font-semibold text-slate-400'
          }
        >
          {label}
        </p>
        <p className="text-[11px] text-slate-500">{detail}</p>
      </div>
    </li>
  );
}
