'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverArrow = PopoverPrimitive.Arrow;

function PopoverContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  ...props
}: PopoverPrimitive.Popup.Props &
  Partial<PopoverPrimitive.Positioner.Props>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner side={side} sideOffset={sideOffset} align={align} className="z-50">
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={
            'bg-popover text-popover-foreground origin-(--transform-origin) rounded-lg border shadow-md outline-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-in-0 data-closed:zoom-out-95 ' +
            (className ?? '')
          }
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverArrow };
