'use client';

import { useEffect, useState } from 'react';
import { getMasterDataAll, type RawPriority, type RawTicketType } from '@/lib/api/master';

/**
 * Opsi prioritas & tipe tiket langsung dari backend (`GET /api/master/all`).
 *
 * Pengganti daftar hardcode (`TICKET_TYPES`, `PRIORITY_OPTIONS` salinan di tiap
 * halaman) yang merupakan sisa fase mock — setiap seed baru wajib diiringi
 * deploy FE bila opsi ditulis di kode. Dengan hook ini rename/tambah/nonaktif
 * dari master data langsung tercermin tanpa deploy.
 *
 * Gagal muat → daftar kosong (dropdown/filter kosong), bukan fallback hardcode
 * yang berbohong. Halaman pemanggil tetap menampilkan error muat datanya
 * sendiri.
 */
export function useMasterOptions() {
  const [priorities, setPriorities] = useState<RawPriority[]>([]);
  const [ticketTypes, setTicketTypes] = useState<RawTicketType[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getMasterDataAll();
        if (cancelled) return;
        setPriorities(data.priorities);
        setTicketTypes(data.ticketTypes);
      } catch {
        // Sengaja diam: halaman sudah toast error-nya sendiri.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { priorities, ticketTypes };
}

/** Opsi filter prioritas — label mengikuti gaya yang sudah ada. */
export function toPriorityFilterOptions(priorities: RawPriority[]): { value: string; label: string }[] {
  return priorities.map((p) => ({ value: p.code, label: `Prioritas ${p.code} (${p.name})` }));
}

/** Opsi filter tipe tiket. */
export function toTicketTypeFilterOptions(
  ticketTypes: RawTicketType[]
): { value: string; label: string }[] {
  return ticketTypes.map((t) => ({ value: t.code, label: t.name }));
}
