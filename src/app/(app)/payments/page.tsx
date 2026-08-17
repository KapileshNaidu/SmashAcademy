import { Wallet } from 'lucide-react';

import { PageHeader } from '@/components/shell/top-bar';
import { PaymentBadge } from '@/components/status-badges';
import { Card } from '@/components/ui/card';
import { EmptyState, StatTile } from '@/components/ui/misc';
import { requireApproved } from '@/lib/auth';
import { fetchManagedStudents } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import type { Payment } from '@/lib/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';

import { CreateInvoice } from './create-invoice';
import { PaymentRow } from './payment-row';

export default async function PaymentsPage() {
  const session = await requireApproved();
  const supabase = await createClient();

  if (!session.isCoach) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', session.userId)
      .order('due_date', { ascending: false });

    return <StudentPayments payments={data ?? []} />;
  }

  const [students, paymentsResult] = await Promise.all([
    fetchManagedStudents(session, { approvalStatus: 'approved' }),
    supabase.from('payments').select('*').order('due_date', { ascending: false }),
  ]);

  const payments = paymentsResult.data ?? [];
  const byStudent = new Map(students.map((student) => [student.id, student]));

  // RLS already scopes this, but a junior coach's roster query is the narrower
  // source of truth for *whose* invoices to show alongside a phone number.
  const visible = payments.filter((payment) => byStudent.has(payment.student_id));

  const outstanding = visible.filter((payment) => payment.status !== 'paid');
  const outstandingTotal = outstanding.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const collected = visible
    .filter((payment) => payment.status === 'paid')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <>
      <PageHeader
        title="Fees"
        description="Mark payments by hand and nudge on WhatsApp."
        action={<CreateInvoice students={students} />}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Outstanding"
          value={formatCurrency(outstandingTotal)}
          sub={`${outstanding.length} unpaid`}
          tone={outstanding.length > 0 ? 'amber' : 'neutral'}
        />
        <StatTile label="Collected" value={formatCurrency(collected)} sub="marked paid" tone="court" />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-5" />}
          title="No invoices yet"
          description="Raise one for a student to start tracking fees."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              student={byStudent.get(payment.student_id)!}
            />
          ))}
        </div>
      )}
    </>
  );
}

function StudentPayments({ payments }: { payments: Payment[] }) {
  const outstanding = payments
    .filter((payment) => payment.status !== 'paid')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <>
      <PageHeader title="My fees" description="Coaching fee status by billing cycle." />

      <StatTile
        label="Outstanding"
        value={formatCurrency(outstanding)}
        sub={outstanding > 0 ? 'please clear with your coach' : 'nothing due'}
        tone={outstanding > 0 ? 'amber' : 'court'}
      />

      {payments.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-5" />}
          title="No invoices yet"
          description="Fee records raised by your coach appear here."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {payment.billing_cycle} · due {formatDate(payment.due_date)}
                  </p>
                </div>
                <PaymentBadge status={payment.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
