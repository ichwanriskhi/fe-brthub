'use client';

import * as React from 'react';
import type { SapItemGroup } from '@/lib/api/sap';
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

/* ── ProductTrendChart ────────────────────────────── */
export interface ProductTrendChartProps {
  /**
   * Agregat harian dari server (`dashboard-summary` → `trends.products`).
   * Backend sudah menyaring tiket tanpa grup, jadi `group_code` selalu ada.
   */
  series: Array<{ date: string; group_code: string; count: number }>;
  /** Item Group WANSIS untuk nama & warna legend (kode → nama). */
  groups: SapItemGroup[];
}

export function ProductTrendChart({ series, groups }: ProductTrendChartProps) {
  const [range, setRange] = React.useState<RangeKey>('90d');

  const now = new Date();
  const startDate = getStartDate(range);
  const agg = autoAgg(range);

  // warna stabil per grup (urut master grup)
  const colorMap: Record<string, string> = {};
  groups.forEach((g, i) => {
    if (g.code) colorMap[g.code] = CHART_COLORS[i % CHART_COLORS.length];
  });

  const rows = series.filter((row) => {
    const d = parseChartDate(row.date);
    return !Number.isNaN(d.getTime()) && d >= startDate && d <= now;
  });

  const groupCodes = Array.from(new Set(rows.map((row) => String(row.group_code))));

  const periods = buildPeriods(startDate, now, agg);

  const buckets = new Map<string, Map<string, number>>();
  const totalsByGroup = new Map<string, number>();

  for (const row of rows) {
    const key = String(row.group_code);
    totalsByGroup.set(key, (totalsByGroup.get(key) ?? 0) + row.count);

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
    groupCodes.forEach((code) => {
      row[code] = bucket?.get(code) ?? 0;
    });
    return row;
  });

  const totalTickets = rows.reduce((sum, row) => sum + row.count, 0);
  const groupTotals = groupCodes
    .map((code) => {
      // Nama dari master grup; fallback kode mentah bila tak dikenal.
      const name = groups.find((g) => g.code === code)?.name ?? code;
      return {
        id: code,
        name,
        color: colorMap[code] ?? CHART_COLORS[0],
        total: totalsByGroup.get(code) ?? 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const rangeOption = getRangeOption(range);

  return (
    <ChartCard
      title="Tren Lini Produk Bermasalah"
      description={`${totalTickets} tiket ${rangeOption.phrase}`}
      range={range}
      onRangeChange={setRange}
    >
      {totalTickets === 0 ? (
        <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
          Tidak ada data produk {rangeOption.phrase}
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
                {groupCodes.map((code) => {
                  const name = groups.find((g) => g.code === code)?.name ?? code;
                  return (
                    <Bar
                      key={code}
                      dataKey={code}
                      name={name}
                      stackId="a"
                      fill={colorMap[code] ?? CHART_COLORS[0]}
                      radius={0}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-2 pt-3">
            {groupTotals.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 text-xs">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="text-muted-foreground">
                  {p.total} ({totalTickets > 0 ? ((p.total / totalTickets) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
}