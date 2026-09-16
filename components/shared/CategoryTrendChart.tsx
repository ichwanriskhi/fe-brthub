'use client';

import * as React from 'react';
import {
  format,
  subMonths,
  subDays,
  subYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { MOCK_CATEGORIES } from '@/lib/mock/admin';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const COLOR_MAP: Record<string, string> = {};
MOCK_CATEGORIES.forEach((c, i) => {
  COLOR_MAP[c.id] = CHART_COLORS[i % CHART_COLORS.length];
});

/* ── Utils ────────────────────────────────────────── */
type RangeKey = '7d' | '30d' | '90d' | '6m' | '1y';
type AggKey   = 'day' | 'week' | 'month' | 'year';

const TIME_RANGES: { value: RangeKey; label: string }[] = [
  { value: '7d',  label: '7 Hari Terakhir'  },
  { value: '30d', label: '30 Hari Terakhir' },
  { value: '90d', label: '90 Hari Terakhir' },
  { value: '6m',  label: '6 Bulan Terakhir' },
  { value: '1y',  label: '1 Tahun Terakhir' },
];

const AGGREGATIONS: { value: AggKey; label: string }[] = [
  { value: 'day',   label: 'Per Hari'   },
  { value: 'week',  label: 'Per Minggu' },
  { value: 'month', label: 'Per Bulan'  },
  { value: 'year',  label: 'Per Tahun'  },
];

function getStartDate(range: RangeKey): Date {
  const now = new Date();
  switch (range) {
    case '7d':  return subDays(now, 7);
    case '30d': return subDays(now, 30);
    case '90d': return subDays(now, 90);
    case '6m':  return subMonths(now, 6);
    case '1y':  return subYears(now, 1);
  }
}

function getPeriodKey(d: Date, agg: AggKey): string {
  switch (agg) {
    case 'day':   return format(d, 'dd MMM', { locale: localeId });
    case 'week':  return `${format(startOfWeek(d, { weekStartsOn: 1 }), 'dd MMM', { locale: localeId })}`;
    case 'month': return format(d, 'MMM yy', { locale: localeId });
    case 'year':  return format(d, 'yyyy');
  }
}

function buildPeriods(start: Date, end: Date, agg: AggKey): string[] {
  switch (agg) {
    case 'day': {
      const ms = 24 * 60 * 60 * 1000;
      const days = Math.ceil((end.getTime() - start.getTime()) / ms);
      return Array.from({ length: days + 1 }, (_, i) =>
        getPeriodKey(new Date(start.getTime() + i * ms), 'day')
      );
    }
    case 'week':
      return eachWeekOfInterval(
        { start: startOfWeek(start, { weekStartsOn: 1 }), end },
        { weekStartsOn: 1 }
      ).map(d => getPeriodKey(d, 'week'));
    case 'month':
      return eachMonthOfInterval({ start: startOfMonth(start), end })
        .map(d => getPeriodKey(d, 'month'));
    case 'year':
      return eachYearOfInterval({ start: startOfYear(start), end })
        .map(d => getPeriodKey(d, 'year'));
  }
}

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
  const rows = payload.filter(p => p.value > 0);
  if (!rows.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs min-w-[10rem]">
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {rows.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="size-2.5 rounded-full shrink-0" style={{ background: p.fill }} />
          <span className="flex-1 text-muted-foreground">{p.name}</span>
          <span className="font-mono font-medium text-foreground tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── CategoryTrendChart ───────────────────────────── */
export function CategoryTrendChart() {
  const [range, setRange]   = React.useState<RangeKey>('90d');
  const [agg, setAgg]       = React.useState<AggKey>('week');

  const now       = new Date();
  const startDate = getStartDate(range);

  // filter tiket dalam range
  const tickets = MOCK_TICKETS.filter(t => {
    const d = new Date(t.createdAt);
    return d >= startDate && d <= now;
  });

  // kategori yang muncul (utama saja, bukan sub)
  const catIds = Array.from(new Set(
    tickets.map(t => t.categoryId).filter(Boolean)
  )) as string[];

  // bangun periodes
  const periods = buildPeriods(startDate, now, agg);

  // build chartData: [{label, catId1: count, catId2: count, ...}]
  const chartData = periods.map(label => {
    const row: Record<string, string | number> = { label };
    catIds.forEach(catId => {
      row[catId] = tickets.filter(t => {
        if (t.categoryId !== catId) return false;
        const key = getPeriodKey(new Date(t.createdAt), agg);
        return key === label;
      }).length;
    });
    return row;
  });

  const totalTickets = tickets.length;
  const catTotals = catIds.map(id => ({
    id,
    name: MOCK_CATEGORIES.find(c => c.id === id)?.name ?? id,
    color: COLOR_MAP[id] ?? CHART_COLORS[0],
    total: tickets.filter(t => t.categoryId === id).length,
  })).sort((a, b) => b.total - a.total);

  return (
    <Card className="p-0 gap-0">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-5 py-4">
        <div>
          <CardTitle className="text-base">Tren Kategori Masalah</CardTitle>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={range} onValueChange={(v) => setRange((v ?? '90d') as RangeKey)}>
            <SelectTrigger className="h-8 text-xs w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(r => (
                <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agg} onValueChange={(v) => setAgg((v ?? 'week') as AggKey)}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGGREGATIONS.map(a => (
                <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-2 sm:px-4">
        {totalTickets === 0 ? (
          <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
            Tidak ada data tiket di periode ini
          </div>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
                barCategoryGap="30%"
              >
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
                {catIds.map(catId => (
                  <Bar
                    key={catId}
                    dataKey={catId}
                    name={MOCK_CATEGORIES.find(c => c.id === catId)?.name ?? catId}
                    stackId="a"
                    fill={COLOR_MAP[catId] ?? CHART_COLORS[0]}
                    radius={0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {totalTickets > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 px-2">
            {catTotals.map(c => (
              <div key={c.id} className="flex items-center gap-1.5 text-xs">
                <span className="size-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="text-foreground font-medium">{c.name}</span>
                <span className="text-muted-foreground">
                  {c.total} ({totalTickets > 0 ? ((c.total / totalTickets) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
