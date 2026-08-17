'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Bottom action sheet — the mobile-native stand-in for a modal.
 *
 * Radix Dialog does the unglamorous parts (focus trap, escape, scroll lock,
 * aria wiring); the styling turns it into a sheet that rises from the bottom
 * edge and is capped at 85vh so a long form scrolls inside the sheet rather
 * than pushing the page.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            'animate-drawer-in fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88vh] w-full max-w-lg flex-col',
            'rounded-t-3xl bg-white shadow-2xl focus:outline-none',
          )}
        >
          {/* Grab handle: signals "this sheet is dismissible" without a label. */}
          <div className="flex justify-center pt-3">
            <div className="h-1.5 w-10 rounded-full bg-slate-300" />
          </div>

          <div className="flex items-start justify-between gap-3 px-5 pt-3">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-bold text-slate-900">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-xs text-slate-500">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mt-1 -mr-1.5 grid size-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer ? (
            <div className="pb-safe border-t border-slate-100 px-5 py-3">
              <div className="flex gap-2">{footer}</div>
            </div>
          ) : (
            <div className="pb-safe" />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const DrawerClose = Dialog.Close;
