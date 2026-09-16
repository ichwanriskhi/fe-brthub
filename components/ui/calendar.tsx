'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import 'react-day-picker/style.css';

export { type DayPickerProps };

/** Kalender shadcn-style di atas react-day-picker v9 (Base UI stack) */
export function Calendar({
  className,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn('bg-popover text-popover-foreground p-3', className)}
      showOutsideDays={false}
      weekStartsOn={1}
      {...props}
    />
  );
}
