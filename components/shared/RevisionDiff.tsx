'use client';

import type { TicketRevision } from '@/lib/types/ticket';

/* ── Label manusiawi untuk field teknis ─────────────────────────── */
const FIELD_LABELS: Record<string, string> = {
  subject: 'Subjek',
  description: 'Deskripsi',
  category_id: 'Kategori',
  ticket_type_id: 'Tipe Tiket',
  priority_id: 'Prioritas',
  product_id: 'Produk',
  vehicle_model: 'Model Kendaraan',
  so_number: 'Nomor SO',
  sales_name: 'Nama Sales',
  customer_id: 'Customer',
  claimed_items: 'Item Klaim',
  vehicle_detail: 'Detail Kendaraan',
  sales_detail: 'Detail Penjualan',
};

export function fieldLabel(field: string): string {
  const direct = FIELD_LABELS[field];
  if (direct) return direct;
  return field
    .replace(/_id$/, '')
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/* ── Normalisasi nilai untuk perbandingan semantik ────────────────
 * Menyamakan: number vs numeric-string ("4" ≡ 4), key kosong ("" /
 * null / undefined) vs key yang hilang, urutan key objek, urutan item
 * array (diurut by id), dan alias qty/quantity pada claimed items.
 */
function isEmptyLike(value: unknown): boolean {
  if (value === '' || value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Kunci pembeda item klaim agar urutan tidak memengaruhi perbandingan. */
function claimKey(item: Record<string, unknown>): string {
  for (const k of ['id', 'itemCode1', 'itemName1', 'itemCode2', 'itemName2']) {
    const v = item[k];
    if (typeof v === 'string' && v !== '') return `${k}:${v}`;
  }
  return JSON.stringify(item);
}

export function normalizeRevisionValue(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const items = (value as unknown[]).map((v) =>
      v !== null && typeof v === 'object' && !Array.isArray(v)
        ? normalizeClaimItem(v as Record<string, unknown>)
        : normalizeRevisionValue(v),
    );
    items.sort((a, b) => {
      const ka =
        typeof a === 'object' && a !== null
          ? claimKey(a as Record<string, unknown>)
          : JSON.stringify(a);
      const kb =
        typeof b === 'object' && b !== null
          ? claimKey(b as Record<string, unknown>)
          : JSON.stringify(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    return items;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    const src = value as Record<string, unknown>;
    for (const key of Object.keys(src).sort()) {
      const v = normalizeRevisionValue(src[key]);
      if (!isEmptyLike(v)) out[key] = v;
    }
    return out;
  }
  return value;
}

function normalizeClaimItem(item: Record<string, unknown>): Record<string, unknown> {
  // Samakan alias qty/quantity: quantity menang bila keduanya ada.
  const rawQty = item.quantity ?? item.qty;
  // Samakan juga alias reason/issueDescription (satu makna, dua nama key).
  const rawReason = item.reason ?? item.issueDescription;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(item).sort()) {
    if (key === 'qty' && 'quantity' in item) continue;
    if (key === 'issueDescription' && 'reason' in item) continue;
    if (key === 'quantity' || key === 'qty') {
      const q = rawQty === '' || rawQty === null || rawQty === undefined ? undefined : rawQty;
      if (!isEmptyLike(q)) out.quantity = normalizeRevisionValue(q);
      continue;
    }
    if (key === 'reason' || key === 'issueDescription') {
      const r = typeof rawReason === 'string' ? rawReason.trim() : rawReason;
      if (!isEmptyLike(r)) out.reason = normalizeRevisionValue(r);
      continue;
    }
    const v = normalizeRevisionValue(item[key]);
    if (!isEmptyLike(v)) out[key] = v;
  }
  return out;
}

/** true bila old & new sama secara makna (setelah normalisasi). */
export function isNoOpChange(oldValue: unknown, newValue: unknown): boolean {
  return JSON.stringify(normalizeRevisionValue(oldValue)) === JSON.stringify(normalizeRevisionValue(newValue));
}

export interface RevisionDiffEntry {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/** Ringkasan satu item klaim: "Nama barang (kode) ×qty — alasan". */
function formatClaimItem(item: unknown): string {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    return formatScalar(item);
  }
  const r = item as Record<string, unknown>;
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'string' && v.trim() !== '') return v.trim();
      if (typeof v === 'number') return String(v);
    }
    return '';
  };
  const name = pick('itemName1', 'itemName2', 'partName', 'name');
  const code = pick('itemCode1', 'itemCode2', 'partNumber', 'code');
  const qty = pick('quantity', 'qty');
  const reason = pick('reason', 'issueDescription');
  const head = [name || 'Item', code ? `(${code})` : null].filter(Boolean).join(' ');
  const tail = [qty ? `×${qty}` : null, reason ? `— ${reason}` : null].filter(Boolean).join(' ');
  return tail ? `${head} ${tail}` : head;
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Nilai tampilan untuk satu sisi diff. Mengembalikan { text } untuk skalar
 * atau { lines } untuk array (dirender sebagai daftar).
 */
function formatDiffValue(field: string, value: unknown): { text?: string; lines?: string[] } {
  if (field === 'claimed_items' && Array.isArray(value)) {
    const lines = (value as unknown[]).map(formatClaimItem).filter((s) => s && s !== '-');
    if (lines.length > 0) return { lines };
    return { text: '-' };
  }
  return { text: formatScalar(value) };
}

/**
 * Daftar perubahan revisi yang manusiawi: label field ramah, nilai ID
 * diterjemahkan bila memungkinkan, array objek diringkas per baris.
 */
export function RevisionDiff({ changes }: { changes: TicketRevision['changes'] }) {
  const entries = visibleRevisionChanges(changes);

  if (entries.length === 0) {
    return (
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Tidak ada perubahan pada revisi ini.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      {entries.map(({ field, oldValue, newValue }) => {
        const oldFmt = formatDiffValue(field, oldValue);
        const newFmt = formatDiffValue(field, newValue);
        return (
          <div key={field} className="text-xs">
            <span className="font-semibold text-foreground">{fieldLabel(field)}</span>
            <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
              <div className="rounded-md bg-destructive/5 px-2 py-1 text-destructive/80">
                {oldFmt.lines ? (
                  <ul className="list-inside list-disc space-y-0.5">
                    {oldFmt.lines.map((line, i) => (
                      <li key={i} className="line-through">{line}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="line-through">{oldFmt.text}</span>
                )}
              </div>
              <span aria-hidden className="pt-1 text-muted-foreground">→</span>
              <div className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-400">
                {newFmt.lines ? (
                  <ul className="list-inside list-disc space-y-0.5">
                    {newFmt.lines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <span>{newFmt.text}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


/** Ambil hanya entri yang benar-benar berubah (saring no-op seperti 4 → "4"). */
export function visibleRevisionChanges(changes: TicketRevision['changes']): RevisionDiffEntry[] {
  return Object.entries(changes)
    .map(([field, diff]) => {
      const d = diff as { old?: unknown; new?: unknown };
      return { field, oldValue: d.old, newValue: d.new };
    })
    .filter((e) => !isNoOpChange(e.oldValue, e.newValue));
}
