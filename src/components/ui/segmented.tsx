'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  /** Tailwind classes applied only while this segment is selected. */
  activeClassName?: string;
}

/**
 * iOS-style segmented control, used for the attendance roll call
 * (Present / Absent / Excused) and other 2-3 way choices.
 *
 * Rendered as a radiogroup rather than buttons so arrow keys work and assistive
 * tech announces the selected state, which a row of <button>s would not.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
  name,
  size = 'md',
  className,
}: {
  options: SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  name?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn('flex w-full gap-1 rounded-xl bg-slate-100 p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg font-semibold transition',
              size === 'sm' ? 'min-h-8 px-2 text-[11px]' : 'min-h-10 px-2.5 text-xs',
              'disabled:opacity-50',
              selected
                ? cn('bg-white text-slate-900 shadow-sm', option.activeClassName)
                : 'text-slate-500 active:bg-white/60',
            )}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Scrollable pill tabs for switching views on a narrow screen. */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map((tab) => {
        const selected = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            aria-current={selected ? 'page' : undefined}
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition',
              selected
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200',
            )}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] font-bold',
                  selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
