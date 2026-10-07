'use client';

import * as React from 'react';
import type { RawCategory } from '@/lib/api/master';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '@/components/shared/ChartCard';
import {
  autoAgg,
  buildPeriods,
  getPeriodKey,
  getRangeOption,
  getStartDate,
  parseChartDate,
  type RangeKey,
} from '@/components/shared/chart-range';

/* ── Warna chart ──────────────────────────────────── */
const CHART_COLORS = [
  'oklch(0.585 0.237 27.3)',  // merah BRT
  'oklch(0.62 0.19 260)',     // biru
  'oklch(0.7 0.15 150)',      // hijau
  'oklch(0.75 0.15 80)',      // kuning/oranye
  'oklch(0.55 0.2 320)',      // ungu
  'oklch(0.65 0.18 200)',     // cyan
  'oklch(0.78 0.13 30)',      // oranye
  'oklch(0.5 0.18 160)',      // teal gelap
];

/* ── Custom Tooltip ───────────────────────────────── */
interface TPayload {
  name: string;
  value: number;
  fill: string;
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value > 0);
  if (!rows.length) return null;
  return (
    <div className="min-w-[10rem] rounded-lg border bg-background p-3 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      {rows.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.fill }} />
          <span className="flex-1 text-muted-foreground">{p.name}</span>
          <span className="font-mono font-medium tabular-nums text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── CategoryTrendChart ───────────────────────────── */
export interface CategoryTrendChartProps {
  /**
   * Agregat harian dari server (`dashboard-summary` → `trends.categories`),
   * bukan daftar tiket.
   *
   * Dulu komponen ini menerima `Ticket[]` lalu menghitung sendiri, yang
   * memaksa frontend menarik sampel terpotong (maks 200 tiket) — grafiknya
   * kurang menghitung tanpa itu sadanya. Backend sudah menghitung agregatnya,
   * jadi sekarang komponen hanya menjumlahkan baris yang sudah dihitung.
   */
  series: Array<{ date: string; category_id: number | null; count: number }>;
  /** Master kategori (`getMasterDataAll()`) untuk nama & warna legend. */
  categories: RawCategory[];
}

export function CategoryTrendChart({ series, categories }: CategoryTrendChartProps) {
  const [range, setRange] = React.useState<RangeKey>('90d');

  const now = new Date();
  const startDate = getStartDate(range);
  const agg = autoAgg(range);

  // warna stabil per kategori (urut master data)
  const colorMap: Record<string, string> = {};
  categories.forEach((c, i) => {
    colorMap[c.id] = CHART_COLORS[i % CHART_COLORS.length];
  });

  // hanya baris dalam range yang dipakai
  const rows = series.filter((row) => {
    const d = parseChartDate(row.date);
    return !Number.isNaN(d.getTime()) && d >= startDate && d <= now;
  });

  const catIds = Array.from(
    new Set(
      rows
        .map((row) => row.category_id)
        .filter((id): id is number => id !== null)
        .map(String),
    ),
  );

  const periods = buildPeriods(startDate, now, agg);

  // Buckets per periode diisi sekali dari agregat harian, lalu chartData hanya
  // memetakan label → nilai. Versi lama menyaring ulang seluruh daftar tiket
  // untuk setiap (periode × kategori).
  const buckets = new Map<string, Map<string, number>>();
  const totalsByCat = new Map<string, number>();

  for (const row of rows) {
    if (row.category_id === null) continue;
    const key = String(row.category_id);
    totalsByCat.set(key, (totalsByCat.get(key) ?? 0) + row.count);

    const label = getPeriodKey(parseChartDate(row.date), agg);
    let bucket = buckets.get(label);
    if (!bucket) {
      bucket = new Map<string, number>();
      buckets.set(label, bucket);
    }
    bucket.set(key, (bucket.get(key) ?? 0) + row.count);
  }

  const chartData = periods.map((label) => {
    const bucket = buckets.get(label);
    const row: Record<string, string | number> = { label };
    catIds.forEach((catId) => {
      row[catId] = bucket?.get(catId) ?? 0;
    });
    return row;
  });

  const totalTickets = rows.reduce((sum, row) => sum + row.count, 0);
  const catTotals = catIds
    .map((id) => ({
      id,
      name: categories.find((c) => c.id === id)?.name ?? id,
      color: colorMap[id] ?? CHART_COLORS[0],
      total: totalsByCat.get(id) ?? 0,
    }))
    .sort((a, b) => b.total - a.total);

  const rangeOption = getRangeOption(range);

  return (
    <ChartCard
      title="Tren Kategori Masalah"
      description={`${totalTickets} tiket ${rangeOption.phrase}`}
      range={range}
      onRangeChange={setRange}
    >
      {totalTickets === 0 ? (
        <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
          Tidak ada data tiket {rangeOption.phrase}
        </div>
      ) : (
        <>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                {catIds.map((catId) => (
                  <Bar
                    key={catId}
                    dataKey={catId}
                    name={categories.find((c) => c.id === catId)?.name ?? catId}
                    stackId="a"
                    fill={colorMap[catId] ?? CHART_COLORS[0]}
                    radius={0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-2 pt-3">
            {catTotals.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-xs">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-muted-foreground">
                  {c.total} ({totalTickets > 0 ? ((c.total / totalTickets) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
}