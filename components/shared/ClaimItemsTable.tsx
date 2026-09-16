'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TicketItemClaim } from '@/lib/types/ticket';

/**
 * Tabel barang klaim distribusi — struktur field sama dengan sistem lain:
 * Barang dikirim vs barang pengganti + qty + alasan + status terima/kirim balik.
 */
export function ClaimItemsTable({ items }: { items: TicketItemClaim[] }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="bg-muted/50 px-4 py-2 w-10">#</TableHead>
            <TableHead className="bg-muted/50 px-4 py-2">Barang Dikirim</TableHead>
            <TableHead className="bg-muted/50 px-4 py-2">Barang Pengganti</TableHead>
            <TableHead className="bg-muted/50 px-4 py-2 w-14 text-center">Qty</TableHead>
            <TableHead className="bg-muted/50 px-4 py-2">Alasan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => (
            <TableRow key={item.id}>
              <TableCell className="px-4 py-2 font-mono text-xs text-muted-foreground align-top">{i + 1}</TableCell>
              <TableCell className="px-4 py-2 align-top">
                <p className="text-xs md:text-sm font-medium whitespace-pre-line">{item.deliveredItem ?? item.partName}</p>
              </TableCell>
              <TableCell className="px-4 py-2 align-top">
                <p className="text-xs md:text-sm whitespace-pre-line">{item.replacementItem ?? item.partName}</p>
              </TableCell>
              <TableCell className="px-4 py-2 align-top text-center text-sm font-semibold">{item.quantity}</TableCell>
              <TableCell className="px-4 py-2 align-top text-xs text-muted-foreground whitespace-pre-line">
                {item.issueDescription ?? '-'}
              </TableCell>

            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
