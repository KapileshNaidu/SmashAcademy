'use client';

import { MessageCircle } from 'lucide-react';
import { useState } from 'react';

import { setPaymentStatusAction } from '@/app/(app)/payments/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormMessage } from '@/components/ui/input';
import { Segmented, type SegmentedOption } from '@/components/ui/segmented';
import { Avatar } from '@/components/ui/misc';
import type { Payment, PaymentStatus, ProfileWithLocation } from '@/lib/types/database';
import { formatCurrency, formatDate, toWhatsAppNumber } from '@/lib/utils';

const OPTIONS: SegmentedOption<PaymentStatus>[] = [
  { value: 'paid', label: 'Paid', activeClassName: 'bg-emerald-500 text-white' },
  { value: 'pending', label: 'Pending', activeClassName: 'bg-amber-500 text-white' },
  { value: 'overdue', label: 'Overdue', activeClassName: 'bg-rose-500 text-white' },
];

export function PaymentRow({
  payment,
  student,
}: {
  payment: Payment;
  student: ProfileWithLocation;
}) {
  const [status, setStatus] = useState<PaymentStatus>(payment.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: PaymentStatus) => {
    const previous = status;

    setStatus(next);
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set('payment_id', payment.id);
    formData.set('status', next);

    const result = await setPaymentStatusAction(formData);
    setSaving(false);

    if (result && 'ok' in result && !result.ok) {
      setStatus(previous);
      setError(result.error);
    }
  };

  /*
   * WhatsApp deep link. wa.me needs a bare international number with no +, and
   * the message must be URI-encoded or everything after the first & is dropped.
   * Only offered for unpaid invoices — nobody should be chased for a cleared fee.
   */
  const whatsappNumber = toWhatsAppNumber(student.phone);
  const reminderText = `Hi ${student.full_name.split(' ')[0]}, your badminton coaching fee of ${formatCurrency(payment.amount)} for ${payment.billing_cycle} is ${status}. Please complete the payment soon. Thank you!`;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(reminderText)}`
    : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={student.full_name} className="size-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{student.full_name}</p>
            <p className="truncate text-[11px] text-slate-500">
              {payment.billing_cycle} · due {formatDate(payment.due_date)}
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
            {formatCurrency(payment.amount)}
          </p>
        </div>

        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <Segmented
          name={`Payment status for ${student.full_name}`}
          options={OPTIONS}
          value={status}
          onChange={change}
          disabled={saving}
          size="sm"
        />

        {status !== 'paid' ? (
          whatsappHref ? (
            <Button asChild variant="outline" size="sm" className="w-full">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                Send WhatsApp reminder
              </a>
            </Button>
          ) : (
            <p className="text-center text-[11px] text-slate-400">
              No valid phone number on file for a reminder.
            </p>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
