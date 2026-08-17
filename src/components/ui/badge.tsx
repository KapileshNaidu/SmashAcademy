import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * High-contrast status chip. Every variant pairs a 100-level tint with an
 * 800-level foreground so the label stays legible in gym lighting, and each
 * carries a ring so the chip reads as a chip even when colour is unavailable.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
        success: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
        warning: 'bg-amber-100 text-amber-900 ring-amber-600/30',
        danger: 'bg-rose-100 text-rose-800 ring-rose-600/20',
        info: 'bg-sky-100 text-sky-800 ring-sky-600/20',
        violet: 'bg-violet-100 text-violet-800 ring-violet-600/20',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'sm' },
  },
);

export interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { badgeVariants };
