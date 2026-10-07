'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DetailItem {
  label: string;
  value: React.ReactNode;
  /**
   * Ikon kecil di sebelah label. Ikon hanya dipakai di baris metadata ini —
   * judul Card dibiarkan polos supaya tidak jadi tempatUMPULAN ikon yang
   * maknanya tumpang tindih.
   */
  icon?: LucideIcon;
  /** Nilai selebar satu baris penuh — untuk konten panjang. */
  full?: boolean;
}

const COLUMN_CLASS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
} as const;

/**
 * Daftar label/nilai seragam untuk halaman detail.
 *
 * Menggantikan pola lama `grid-cols-2` + `<span className="block text-muted-foreground">`
 * yang ditulis manual di tiap halaman sehingga ukuran label/nilai berbeda-beda.
 * Aturan di sini: label muted kecil, nilai `text-sm font-medium` di atasnya.
 */
export function DetailList({
  items,
  columns = 2,
  className,
}: {
  items: DetailItem[];
  columns?: keyof typeof COLUMN_CLASS;
  className?: string;
}) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', COLUMN_CLASS[columns], className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={`${item.label}-${index}`}
            className={cn('min-w-0', item.full && 'sm:col-span-full')}
          >
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" /> : null}
              {item.label}
            </dt>
            <dd className="mt-1 text-sm font-medium break-words text-foreground">{item.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}