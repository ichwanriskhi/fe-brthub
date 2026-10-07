'use client';

import { useEffect, useState } from 'react';
import { getItemGroups, itemGroupName, type SapItemGroup } from '@/lib/api/sap';

/**
 * Daftar Item Group WANSIS (cache modul di `getItemGroups`).
 * Dipakai display yang menyimpan kode grup (lini produk kendaraan).
 */
export function useItemGroups(): SapItemGroup[] {
  const [groups, setGroups] = useState<SapItemGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await getItemGroups();
      if (!cancelled) setGroups(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return groups;
}

/**
 * Nama grup dari kodenya; fallback kode mentah bila tak dikenal (prinsip
 * pass-through — jangan tampilkan kosong untuk data yang ada).
 */
export function useItemGroupName(code?: string | null): string {
  const groups = useItemGroups();
  if (!code) return '';
  return itemGroupName(groups, code);
}
