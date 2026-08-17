import * as React from 'react';

import { cn } from '@/lib/utils';

const fieldStyles =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-court-500 focus:outline-none focus:ring-2 focus:ring-court-500/30 disabled:bg-slate-50 disabled:text-slate-500';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(fieldStyles, 'min-h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldStyles, 'min-h-20 resize-y', className)} {...props} />;
}

/**
 * Native <select> rather than a custom popover listbox: on iOS and Android this
 * hands off to the OS picker, which is a far better one-thumb experience than
 * any scrollable div — and it comes with keyboard and screen-reader support.
 */
export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          fieldStyles,
          'min-h-11 appearance-none bg-none pr-10',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      className={cn('mb-1.5 block text-xs font-semibold text-slate-700', className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

/** Inline form feedback. `role="alert"` so errors are announced, not just shown. */
export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  if (!children) return null;

  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl px-3 py-2.5 text-xs font-medium',
        tone === 'error'
          ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
          : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
      )}
    >
      {children}
    </p>
  );
}
