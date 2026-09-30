import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from 'cn';

/**
 * Ambil daftar Sales Order dari SAP monitor-list-v2 dan flatten ke satu list.
 *
 * Dipanggil lewat rewrite Next.js (`/api/sap/*`) — request server-to-server,
 * jadi CORS SAP tidak berlaku dan IP internal tidak ter-expose di browser.
 */
export interface SoOrder {
  soNumber: string;
  slpName: string;
  cardName?: string;
  topItemName?: string;
  totalItems?: number;
}

const SAP_API_URL =
  process.env.NEXT_PUBLIC_SAP_API_URL || '/api/sap/order/monitor-list-v2';

let cache: SoOrder[] | null = null;
let inflight: Promise<SoOrder[]> | null = null;

export async function fetchSoOrders(): Promise<SoOrder[]> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch(SAP_API_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`SAP API error: ${res.status}`);
    const json = await res.json();

    const out: SoOrder[] = [];
    const groups = json?.groups ?? {};
    for (const key of Object.keys(groups)) {
      const orders = groups[key]?.orders ?? [];
      for (const o of orders) {
        if (o == null || o.SoNumber == null) continue;
        out.push({
          soNumber: String(o.SoNumber),
          slpName: o.SlpName ?? '',
          cardName: o.CardName,
          topItemName: o.topItemName,
          totalItems: o.totalItems,
        });
      }
    }
    cache = out;
    return out;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

interface SoComboboxProps {
  value: string;
  onValueChange: (soNumber: string, salesName: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Maks item yang ditampilkan saat filter (performance). */
  maxShown?: number;
}

export function SoCombobox({
  value,
  onValueChange,
  disabled,
  placeholder = 'Cari nomor SO...',
  maxShown = 100,
}: SoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<SoOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSoOrders()
      .then((data) => {
        if (!cancelled) {
          setOrders(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal memuat data SO');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.soNumber.toLowerCase().includes(q) ||
        o.slpName.toLowerCase().includes(q) ||
        (o.cardName ?? '').toLowerCase().includes(q),
    );
  }, [orders, query]);

  const selected = useMemo(() => orders.find((o) => o.soNumber === value) ?? null, [orders, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {selected ? `${selected.soNumber}` : placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="min-w-[--anchor-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik nomor SO atau nama sales..."
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            aria-label="Cari nomor SO"
          />
          {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {error ? (
            <p className="px-3 py-6 text-center text-sm text-destructive">{error}</p>
          ) : !loading && filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {orders.length === 0 ? 'Data SO tidak tersedia.' : 'SO tidak ditemukan.'}
            </p>
          ) : (
            filtered.slice(0, maxShown).map((o) => (
              <button
                key={o.soNumber}
                type="button"
                onClick={() => {
                  onValueChange(o.soNumber, o.slpName);
                  setQuery('');
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent',
                  value === o.soNumber && 'bg-accent',
                )}
              >
                <Check
                  className={cn('size-4 shrink-0', value === o.soNumber ? 'opacity-100' : 'opacity-0')}
                />
                <span className="flex-1 truncate">
                  <span className="font-mono font-medium">{o.soNumber}</span>
                  <span className="text-muted-foreground"> - {o.slpName}</span>
                  {o.cardName ? (
                    <span className="block truncate text-xs text-muted-foreground">{o.cardName}</span>
                  ) : null}
                </span>
              </button>
            ))
          )}
        </div>
        {filtered.length > maxShown && (
          <div className="border-t px-3 py-1.5 text-center text-xs text-muted-foreground">
            Menampilkan {maxShown} dari {filtered.length} — persempit pencarian
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
