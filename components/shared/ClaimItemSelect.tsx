'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SapOrderItem, SapMasterItem, SapMasterItemsResponse } from '@/lib/api/sap';

interface ClaimItemSelectProps {
  /** Daftar barang dari detail SO (SAP) atau Master Item SAP. */
  items: SapOrderItem[] | SapMasterItem[];
  /** Kode barang terpilih (state form). */
  value: string;
  /** Dipanggil dengan (kode, nama) barang terpilih. */
  onValueChange: (code: string, name: string) => void;
  /** Sedang memuat data SAP untuk SO yang dipilih. */
  loading?: boolean;
  /** SO belum dipilih — dropdown dinonaktifkan. */
  disabled?: boolean;
  error?: string | null;
  placeholder?: string;
  id?: string;
  className?: string;
  /** Mode: 'so' (dari SO) atau 'master' (dari Master Item SAP untuk wrongItemCode). */
  mode?: 'so' | 'master';
  /** Callback untuk search master items (hanya untuk mode 'master'). */
  onSearch?: (query: string, page: number) => Promise<SapMasterItemsResponse>;
  /** Nama barang terpilih (fallback label bila kode tak ada di items — mis. mode master). */
  selectedName?: string;
  /**
   * Tampilkan nama barang di tombol trigger (default true: `KODE · nama`).
   * Set `false` bila halaman sudah menampilkan nama barang di baris terpisah
   * di bawah field (mis. baris klaim report/new & editor klaim reviewer) agar
   * nama tidak tampil dua kali.
   */
  showNameInTrigger?: boolean;
}

/**
 * Pemilih barang klaim: dropdown dari item yang terkait dengan nomor SO
 * atau dari Master Item SAP (untuk wrongItemCode).
 *
 * Menampilkan kode + nama barang; pencarian mencocokkan keduanya (case-insensitive).
 */
export function ClaimItemSelect({
  items,
  value,
  onValueChange,
  loading = false,
  disabled = false,
  error = null,
  placeholder = 'Pilih barang…',
  id,
  className,
  mode = 'so',
  onSearch,
  selectedName,
  showNameInTrigger = true,
}: ClaimItemSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SapMasterItem[]>([]);
  const [searching, setSearching] = useState(false);
  // Hasil pencarian memenuhi 50 teratas (upstream tanpa pagination untuk `q`)
  // → tampilkan footer "Menampilkan N hasil pertama".
  const [truncated, setTruncated] = useState(false);
  // Error pencarian (jaringan/auth) untuk ditampilkan di dropdown.
  const [searchError, setSearchError] = useState<string | null>(null);
  // Debounce timer + penanda urutan respons: ketikan cepat tidak boleh
  // menimpa hasil dengan data basi dari request sebelumnya.
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  // Bersihkan timer debounce saat komponen dilepas.
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Label terpilih: cari di items, lalu di hasil search master (agar pilihan
  // mode="master" dengan items={[]} tidak kembali ke placeholder), terakhir
  // fallback ke kode + selectedName agar kode tetap tampil.
  const selected = useMemo(() => {
    if (!value) return null;
    const fromItems = items.find((item) => item.code === value) ?? null;
    if (fromItems) return fromItems;
    const fromSearch = searchResults.find((item) => item.code === value) ?? null;
    if (fromSearch) return fromSearch;
    return { code: value, name: selectedName ?? '' };
  }, [items, searchResults, value, selectedName]);

  // Filter logic: use search results for master mode, otherwise filter local items
  const filtered = useMemo(() => {
    if (mode === 'master' && query.trim()) {
      return searchResults;
    }
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q),
    );
  }, [items, query, searchResults, mode]);

  const isDisabled = disabled || loading;

  // Handle search for master items (debounced + guarded terhadap respons basi)
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (mode !== 'master' || !value.trim()) {
      // Kosong / mode SO: filter lokal saja — batalkan juga pencarian tertunda.
      searchSeqRef.current += 1;
      setSearching(false);
      setSearchResults([]);
      setTruncated(false);
      setSearchError(null);
      return;
    }
    // Debounce ~300 ms agar API tidak dipanggil di setiap ketikan.
    searchTimerRef.current = setTimeout(() => {
      void runMasterSearch(value.trim());
    }, 500);
  };

  const runMasterSearch = async (q: string) => {
    if (!onSearch) return;
    // Guard urutan: respons dari ketikan sebelumnya harus dibuang.
    const seq = ++searchSeqRef.current;
    setSearching(true);
    try {
      const res = await onSearch(q, 1);
      if (seq !== searchSeqRef.current) return;
      setSearchResults(res.items ?? []);
      // Upstream hanya mengembalikan 50 hasil teratas (tanpa pagination) →
      // beri tahu pengguna bila hasil kena batas itu.
      setTruncated(Boolean(res.truncated));
      setSearchError(res.error ?? null);
    } catch {
      // `searchSapMasterItems` sudah menangkap errornya sendiri (kirim `error`);
      // cabang ini hanya untuk onSearch alternatif yang melempar exception.
      if (seq !== searchSeqRef.current) return;
      setSearchResults([]);
      setTruncated(false);
      setSearchError('Gagal mencari Master SAP. Silakan coba lagi.');
    } finally {
      if (seq === searchSeqRef.current) setSearching(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            className={cn('w-full justify-between font-normal', className)}
            disabled={isDisabled}
          >
            <span className={cn('truncate text-left', !selected && 'text-muted-foreground')}>
              {loading || searching ? (
                'Memuat barang...'
              ) : selected ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="truncate font-mono text-xs font-medium"
                    title={showNameInTrigger ? undefined : selected.name || selected.code}
                  >
                    {selected.code}
                  </span>
                  {showNameInTrigger && selected.name ? (
                    <span className="truncate text-[11px] text-muted-foreground" title={selected.name}>
                      · {selected.name}
                    </span>
                  ) : null}
                </span>
              ) : (
                placeholder
              )}
            </span>
            {loading || searching ? (
              <Loader2 className="size-4 shrink-0 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            )}
          </Button>
        }
      />
      <PopoverContent className="min-w-[--anchor-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={mode === 'master' ? 'Cari kode atau nama barang …' : 'Cari kode atau nama barang…'}
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            aria-label="Cari barang"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {error ? (
            <p className="px-3 py-6 text-center text-sm text-destructive">{error}</p>
          ) : searchError ? (
            <p className="px-3 py-6 text-center text-sm text-destructive">{searchError}</p>
          ) : !loading && !searching && items.length === 0 && mode === 'so' ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {disabled
                ? 'Pilih nomor SO terlebih dahulu.'
                : 'Tidak ada barang pada SO ini.'}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {searching
                ? 'Mencari…'
                : mode === 'master' && !query.trim()
                  ? 'Ketik minimal 1 karakter untuk mencari …'
                  : 'Barang tidak ditemukan.'}
            </p>
          ) : (
            <>
              {filtered.map((item, index) => (
                <button
                  key={`${item.code}-${index}`}
                  type="button"
                  onClick={() => {
                    onValueChange(item.code, item.name);
                    setQuery('');
                    // Pertahankan item terpilih di cache agar label tombol tidak
                    // kembali ke placeholder (mode master memakai items={[]}).
                    setSearchResults((prev) => {
                      if (prev.some((p) => p.code === item.code)) return prev;
                      return [item, ...prev];
                    });
                    setTruncated(false);
                    setSearchError(null);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent',
                    value === item.code && 'bg-accent',
                  )}
                >
                  <Check
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      value === item.code ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-mono text-xs font-medium">
                      {item.code}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.name}
                    </span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
        {mode === 'master' && truncated && !!query.trim() && searchResults.length > 0 && (
          <div className="border-t px-3 py-1.5 text-center text-xs text-muted-foreground">
            Menampilkan {searchResults.length} hasil pertama — persempit pencarian Anda.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
