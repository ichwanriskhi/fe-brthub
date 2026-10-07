'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Lebar kolom (persentase) — kira-kira meniru `DataTable` supaya tidak ada
 * layout shift saat data asli menggantikan skeleton.
 */
const COLUMN_WIDTHS = [
  'w-10', // No
  'w-56', // kolom utama (nama / subjek)
  'w-28', // kolom pendek (status / tipe)
  'w-20', // kolom sangat pendek
  'w-16', // aksi / ikon
];

/**
 * Placeholder tabel untuk muatan pertama: header + 8 baris.
 * Hanya dipakai saat data belum pernah termuat — untuk pergantian halaman
 * atau filter, tabel tetap terlihat dengan `isPending` (opacity).
 */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-md border">
      {/* Header */}
      <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
        {COLUMN_WIDTHS.map((w, i) => (
          <Skeleton key={i} className={`h-4 shrink-0 ${w}`} />
        ))}
      </div>

      {/* Body */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b px-4 py-4 last:border-0"
        >
          {COLUMN_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-4 shrink-0 ${w}`} />
          ))}
        </div>
      ))}
    </div>
  );
}