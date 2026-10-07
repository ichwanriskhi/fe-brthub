import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DotChipProps extends React.ComponentProps<typeof Badge> {
  /** Kelas warna untuk titik penanda — satu-satunya pembeda warna pada chip. */
  dotClass?: string;
  /** Render sebagai `<button>` (untuk chip yang bisa diklik, mis. "+N"). */
  interactive?: boolean;
}

/**
 * Chip netral dengan titik berwarna: label minimal untuk badge role/prioritas.
 * Warna dipindahkan ke titik supaya badge tidak lagi jadi satu-satunya pembeda
 * di tabel yang sudah padat. Set `interactive` agar jadi tombol yang bisa
 * memicu popover.
 */
export function DotChip({
  dotClass,
  interactive = false,
  className,
  children,
  render,
  ...props
}: DotChipProps) {
  return (
    <Badge
      variant="ghost"
      render={render ?? (interactive ? <button type="button" /> : undefined)}
      className={cn(
        'h-4 gap-1 rounded-md border-0 bg-muted/60 px-1.5 text-[11px] font-medium text-muted-foreground',
        interactive && 'cursor-pointer hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    >
      {dotClass && (
        <span
          data-icon="inline-start"
          aria-hidden
          className={cn('size-1.5 shrink-0 rounded-full', dotClass)}
        />
      )}
      {children}
    </Badge>
  );
}