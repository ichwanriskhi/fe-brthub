'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CLAIM_ITEM_ROLE_LABELS, type TicketItemClaim } from '@/lib/types/ticket';
import type { SubcategoryClaimConfig } from '@/lib/constants/claim';

interface NormalizedClaimRow {
  id: string;
  hasSecondColumn: boolean;
  role1?: string;
  itemCode1?: string;
  itemName1?: string;
  role2?: string;
  itemCode2?: string;
  itemName2?: string;
  qty: number;
  reason?: string;
  deliveredItem?: string;
  replacementItem?: string;
  partName?: string;
  partNumber?: string;
}

interface ColumnDef {
  key: string;
  label: string;
  role: string;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
}

function normalizeRow(item: TicketItemClaim, index: number): NormalizedClaimRow {
  const raw = item as unknown as Record<string, unknown>;
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const s = str(raw[k]);
      if (s) return s;
    }
    return '';
  };
  const role1 = pick('role1', 'role_1') || undefined;
  const role2 = pick('role2', 'role_2') || undefined;
  const itemCode1 = pick('itemCode1', 'item_code1', 'code1') || undefined;
  const itemName1 = pick('itemName1', 'item_name1', 'name1') || undefined;
  const itemCode2 = pick('itemCode2', 'item_code2', 'code2') || undefined;
  const itemName2 = pick('itemName2', 'item_name2', 'name2') || undefined;
  const flag = raw.hasSecondColumn ?? raw.has_second_column ?? raw.hasSecond;
  const hasSecondColumn =
    typeof flag === 'boolean'
      ? flag
      : typeof flag === 'string'
        ? ['1', 'true', 'ya', 'yes'].includes(flag.trim().toLowerCase())
        : Boolean(role2 || itemCode2 || itemName2);
  const qtyNum = Number(raw.quantity ?? raw.qty ?? 1);
  return {
    id: str(raw.id) || `claim-${index}`,
    hasSecondColumn,
    role1,
    itemCode1,
    itemName1,
    role2: hasSecondColumn ? role2 : undefined,
    itemCode2: hasSecondColumn ? itemCode2 : undefined,
    itemName2: hasSecondColumn ? itemName2 : undefined,
    qty: qtyNum > 0 ? qtyNum : 1,
    reason: pick('reason', 'issueDescription', 'issue_description') || undefined,
    deliveredItem: pick('deliveredItem', 'delivered_item') || undefined,
    replacementItem: pick('replacementItem', 'replacement_item') || undefined,
    partName: pick('partName', 'part_name') || undefined,
    partNumber: pick('partNumber', 'part_number') || undefined,
  };
}

function capitalizeWord(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function prettyRole(role: string): string {
  const known = (CLAIM_ITEM_ROLE_LABELS as Record<string, string>)[role];
  if (known) return known;
  const words = role.split('_').join(' ').split('-').join(' ');
  return words.split(' ').map(capitalizeWord).join(' ');
}

/**
 * Label kolom: pakai label subkategori (mis. "Barang yang dikembalikan") bila
 * konfigurasi subkategori tersedia, agar konsisten dengan editor reviewer &
 * halaman report/new. Fallback: label generik dari role.
 */
function labelForRole(role: string, claimConfig?: SubcategoryClaimConfig | null): string {
  if (claimConfig) {
    if (role === claimConfig.role1) return claimConfig.role1Label;
    if (claimConfig.role2 && role === claimConfig.role2) {
      return claimConfig.role2Label ?? prettyRole(role);
    }
  }
  return prettyRole(role);
}

function getColumns(
  rows: NormalizedClaimRow[],
  claimConfig?: SubcategoryClaimConfig | null,
): ColumnDef[] {
  const ordered: string[] = [];
  for (const row of rows) {
    if (row.role1 && !ordered.includes(row.role1)) ordered.push(row.role1);
    if (row.hasSecondColumn && row.role2 && !ordered.includes(row.role2)) {
      ordered.push(row.role2);
    }
  }
  if (ordered.length > 0) {
    return ordered.map((role) => ({ key: role, label: labelForRole(role, claimConfig), role }));
  }
  const hasDelivered = rows.some((r) => r.deliveredItem || r.partName);
  const hasReplacement = rows.some((r) => r.replacementItem);
  if (hasDelivered && hasReplacement) {
    return [
      { key: 'delivered_item', label: CLAIM_ITEM_ROLE_LABELS.delivered_item, role: 'delivered_item' },
      { key: 'replacement_item', label: CLAIM_ITEM_ROLE_LABELS.replacement_item, role: 'replacement_item' },
    ];
  }
  if (hasDelivered || hasReplacement) {
    const onlyReplacement = !hasDelivered && hasReplacement;
    return [
      {
        key: 'barang',
        label: onlyReplacement ? CLAIM_ITEM_ROLE_LABELS.replacement_item : CLAIM_ITEM_ROLE_LABELS.delivered_item,
        role: 'barang',
      },
    ];
  }
  return [{ key: 'barang', label: 'Barang', role: 'barang' }];
}

function getCellValue(row: NormalizedClaimRow, column: ColumnDef): { code: string; name: string } | null {
  const role = column.role;
  if (row.role1 === role) {
    return { code: row.itemCode1 ?? '', name: row.itemName1 ?? '' };
  }
  if (row.hasSecondColumn && row.role2 === role) {
    return { code: row.itemCode2 ?? '', name: row.itemName2 ?? '' };
  }
  if (role === 'delivered_item') {
    const name = row.deliveredItem ?? row.partName;
    if (!name && !row.partNumber) return null;
    return { code: row.partNumber ?? '', name: name ?? '' };
  }
  if (role === 'replacement_item') {
    const name = row.replacementItem ?? row.partName;
    if (!name && !row.partNumber) return null;
    return { code: row.partNumber ?? '', name: name ?? '' };
  }
  if (role === 'barang') {
    const name = row.deliveredItem ?? row.replacementItem ?? row.partName;
    if (!name && !row.partNumber) return null;
    return { code: row.partNumber ?? '', name: name ?? '' };
  }
  return null;
}

export function ClaimItemsTable({
  items,
  claimConfig,
}: {
  items: TicketItemClaim[];
  /** Konfigurasi kolom subkategori (opsional) untuk label kolom yang dinamis. */
  claimConfig?: SubcategoryClaimConfig | null;
}) {
  const rows = (items ?? []).map((item, i) => normalizeRow(item, i));

  if (!rows.length) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        Tidak ada data barang klaim
      </div>
    );
  }

  const columns = getColumns(rows, claimConfig);

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="bg-muted/50 px-4 py-2 w-10">#</TableHead>
            {columns.map((col) => (
              <TableHead key={col.key} className="bg-muted/50 px-4 py-2">
                {col.label}
              </TableHead>
            ))}
            <TableHead className="bg-muted/50 px-4 py-2 w-14 text-center">Qty</TableHead>
            <TableHead className="bg-muted/50 px-4 py-2">Alasan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={row.id}>
              <TableCell className="px-4 py-2 font-mono text-xs text-muted-foreground align-top">
                {i + 1}
              </TableCell>
              {columns.map((col) => {
                const cell = getCellValue(row, col);
                const hasValue = cell && (cell.code.trim() || cell.name.trim());
                return (
                  <TableCell key={col.key} className="px-4 py-2 align-top">
                    {hasValue && cell ? (
                      <div className="space-y-0.5">
                        {cell.code.trim() && (
                          <p className="font-mono text-[11px] text-muted-foreground">{cell.code}</p>
                        )}
                        {cell.name.trim() && (
                          <p className="text-xs md:text-sm font-medium whitespace-pre-line">
                            {cell.name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">-</p>
                    )}
                  </TableCell>
                );
              })}
              <TableCell className="px-4 py-2 align-top text-center text-sm font-semibold">
                {row.qty}
              </TableCell>
              <TableCell className="px-4 py-2 align-top text-xs text-muted-foreground whitespace-pre-line">
                {row.reason ?? '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}