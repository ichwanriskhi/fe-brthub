import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { ChevronRight } from 'lucide-react';
import type { Ticket } from '@/lib/types/ticket';

interface TicketCardListProps {
  tickets: Ticket[];
  /** Label tombol aksi, mis. "Verifikasi" / "Konfirmasi" / "Detail" */
  actionLabel: string;
  /** Base href tanpa id, mis. "/reviewer/tiket" (untuk detail) */
  hrefBase: string;
  /** Baris meta tambahan (unit, tanggal, dll) — opsional */
  meta?: (ticket: Ticket) => { label: string; value: string } | null;
}

/**
 * Daftar tiket versi card — hanya tampil di mobile (< md).
 * Pasangan responsif dari tabel queue di desktop.
 */
export function TicketCardList({ tickets, actionLabel, hrefBase, meta }: TicketCardListProps) {
  if (tickets.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {tickets.map((ticket) => {
        const metaRow = meta?.(ticket);
        return (
          <Card key={ticket.id} className="gap-3 py-4">
            <CardContent className="px-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                  <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.subject}</p>
                  {ticket.soNumber && (
                    <p className="text-xs text-muted-foreground truncate">SO: {ticket.soNumber}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <TypeBadge ticketType={ticket.ticketType} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">{ticket.customerData?.name ?? ticket.reporterName}</span>
                {metaRow && (
                  <span className="shrink-0 text-right">
                    {metaRow.label}: <span className="font-medium text-foreground">{metaRow.value}</span>
                  </span>
                )}
              </div>

              <Button size="sm" className="w-full justify-between" asChild>
                <Link href={`${hrefBase}/${ticket.id}`}>
                  <span>{actionLabel}</span>
                  <ChevronRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
