import type { Ticket } from '@/lib/types/ticket';

/**
 * Label nama yang ditampilkan di kolom "Pelapor" tabel tiket.
 *
 * Pelapor ≠ pelanggan. Pelapor adalah pegawai/customer yang membuat laporan;
 * pelanggan adalah pihak yang dilaporkan (hanya bila laporan atas nama
 * customer — `is_report_for_customer`). Jadi kolom ini selalu memakai nama
 * pelapor, bukan nama customer.
 */
export function reporterDisplay(ticket: Ticket): string {
  return ticket.reporterName || '-';
}

/**
 * Nama pelanggan, hanya bila laporan ini atas nama customer. Mengembalikan
 * null bila tiket tidak ada customer (mis. pelapor melaporkan untuk dirinya
 * sendiri) — pemanggil boleh menyembunyikan baris ini.
 */
export function customerDisplayName(ticket: Ticket): string | null {
  if (!ticket.isReportForCustomer) return null;
  return ticket.customerData?.name ?? null;
}

/**
 * Inisial untuk avatar — memakai nama pelapor (bukan customer).
 */
export function reporterInitials(ticket: Ticket): string {
  const name = ticket.reporterName || '?';
  return name.slice(0, 2).toUpperCase();
}
