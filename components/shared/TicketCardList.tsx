import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { ChevronRight } from 'lucide-react';
import type { Ticket } from '@/lib/types/ticket';

interface TicketCardListProps {
  tickets: Ticket[];
  /** Label tombol aksi, mis. "Verifikasi" / "Konfirmasi" / "Detail" */
  actionLabel: string;
  /** Base href tanpa id, mis. "/reviewer/tiket" (untuk detail) */
  hrefBase: string;
  /**
   * Query string yang ditempel ke link detail, mis. `"?from=riwayat"`.
   *
   * Beberapa halaman list menunjuk ke route detail yang sama (mis.
   * `/reviewer/tiket`) padahal ia berasal dari daftar berbeda. Tanpa penanda,
   * halaman detail tidak tahu asal pengguna dan breadcrumb-nya selalu ke satu
   * daftar yang sama.
   */
  linkQuery?: string;
  /** Baris meta tambahan (unit, tanggal, dll) — opsional */
  meta?: (ticket: Ticket) => { label: string; value: string } | null;
  /** Redupkan kartu — dipakai saat data sedang dimuat ulang. */
  isPending?: boolean;
  /**
   * Tombol tambahan di kiri tombol aksi utama — cermin kolom Aksi pada tabel
   * desktop, supaya kartu mobile tidak kehilangan pintasan yang ada di tabel.
   * Hasil `null` berarti tiket ini tidak punya aksi tambahan.
   */
  extraActions?: (ticket: Ticket) => ReactNode;
}

/**
 * Daftar tiket versi card — hanya tampil di mobile (< md).
 * Bentuknya menyusul card versi mobile di tabel admin: kartu datar dengan
 * `rounded-lg border`, tombol aksi kecil di kanan bawah.
 */
export function TicketCardList({
  tickets,
  actionLabel,
  hrefBase,
  linkQuery = '',
  meta,
  isPending,
  extraActions,
}: TicketCardListProps) {
  if (tickets.length === 0) {
    return null;
  }

  return (
    <div
      className={
        isPending
          ? 'flex flex-col gap-3 px-4 pb-4 transition-opacity md:hidden'
          : 'flex flex-col gap-3 px-4 pb-4 md:hidden'
      }
      style={isPending ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
    >
      {tickets.map((ticket) => {
        const metaRow = meta?.(ticket);
        const extra = extraActions?.(ticket);
        return (
          <div key={ticket.id} className="rounded-lg border bg-card py-4">
            <div className="space-y-2 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                  <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.subject}</p>
                  {ticket.soNumber && (
                    <p className="truncate text-xs text-muted-foreground">SO: {ticket.soNumber}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <TypeBadge ticketType={ticket.ticketType} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">{ticket.reporterName}</span>
                {metaRow && (
                  <span className="shrink-0 text-right">
                    {metaRow.label}: <span className="font-medium text-foreground">{metaRow.value}</span>
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2">
                {extra}
                <Button size="sm" asChild>
                  <Link href={`${hrefBase}/${ticket.id}${linkQuery}`}>
                    {actionLabel}
                    <ChevronRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}