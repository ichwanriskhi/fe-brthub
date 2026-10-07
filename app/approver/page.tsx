'use client';

import { useEffect, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import {
  getApproverSummary,
  approvalHref,
  type ApproverSummary,
  type ApproverSummaryTicket,
} from '@/lib/api/approver-dashboard';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { PriorityBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/shared/DataTable';
import type { DataTableFeatures } from '@/components/shared/data-table-features';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { ColumnToggle } from '@/components/shared/ColumnToggle';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  CircleCheckBig,
  ClipboardCheck,
  RefreshCw,
  Timer,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Format durasi jam jadi satuan yang enak dibaca. */
function formatHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)} jam`;
  return `${(hours / 24).toFixed(1).replace('.', ',')} hari`;
}

const columnHelper = createColumnHelper<DataTableFeatures, ApproverSummaryTicket>();

const columns: ColumnDef<DataTableFeatures, ApproverSummaryTicket>[] = columnHelper.columns([
  columnHelper.accessor('ticket_no', {
    header: 'ID Tiket',
    cell: ({ row }) => (
      <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
        {row.original.ticket_no}
      </span>
    ),
  }),
  columnHelper.accessor('subject', {
    header: 'Subjek',
    cell: ({ row }) => (
      <div className="max-w-[260px] space-y-0.5">
        <p className="truncate text-sm font-medium" title={row.original.subject}>
          {row.original.subject}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          SO: {row.original.so_number ?? '-'}
        </p>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'tahap',
    header: 'Tahap',
    cell: ({ row }) => (
      <span className="text-xs font-medium text-muted-foreground">
        {row.original.stage === 'FINAL' ? 'Penutupan' : 'Awal'}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'tipe',
    header: 'Tipe',
    cell: ({ row }) => <TypeBadge ticketType={row.original.ticket_type_code} />,
  }),
  columnHelper.display({
    id: 'prioritas',
    header: 'Prioritas',
    cell: ({ row }) => <PriorityBadge priority={row.original.priority_code} />,
  }),
  columnHelper.display({
    id: 'umur',
    header: 'Menunggu',
    cell: ({ row }) => (
      <span
        className={cn(
          'text-sm whitespace-nowrap tabular-nums',
          row.original.age_days >= 3 ? 'font-semibold text-destructive' : 'text-muted-foreground',
        )}
      >
        {row.original.age_days} hari
      </span>
    ),
  }),
  columnHelper.display({
    id: 'aksi',
    header: () => <div className="text-right">Aksi</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <Button size="sm" asChild>
          <Link href={approvalHref(row.original)}>
            Tinjau
            <ChevronRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    ),
    enableHiding: false,
  }),
]);

export default function ApproverDashboardPage() {
  const [summary, setSummary] = useState<ApproverSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  // SetState di dalam async IIFE — bukan langsung di badan effect — supaya
  // `react-hooks/set-state-in-effect` tetap tenang dan state tidak ditulis
  // setelah unmount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getApproverSummary();
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Gagal memuat dasbor.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-10 text-destructive" />
        <div>
          <p className="text-lg font-semibold">Gagal memuat dasbor</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRetryKey((k) => k + 1)}>
          <RefreshCw data-icon="inline-start" />
          Coba lagi
        </Button>
      </div>
    );
  }

  const kpi = summary?.kpi;
  const pending = summary?.oldest_pending ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Bento — 6 kolom, tiga kartu selebar 2 kolom. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatisticsCard
          icon={ClipboardCheck}
          label="Persetujuan Awal"
          value={kpi ? String(kpi.initial_pending) : '…'}
          subtitle="Menunggu tujuan penanganan"
          className="sm:col-span-2"
        />
        <StatisticsCard
          icon={CheckSquare}
          label="Persetujuan Penutupan"
          value={kpi ? String(kpi.final_pending) : '…'}
          subtitle="Menunggu hasil penanganan"
          className="sm:col-span-2"
        />
        <StatisticsCard
          icon={Timer}
          label="Rata-rata Keputusan"
          value={
            summary?.avg_decision_hours !== null && summary?.avg_decision_hours !== undefined
              ? formatHours(summary.avg_decision_hours)
              : '—'
          }
          subtitle={
            summary && summary.decision_sample > 0
              ? `${summary.decision_sample} keputusan Anda`
              : 'Belum ada keputusan'
          }
          className="sm:col-span-2"
        />
      </div>

      {/* Baris kedua — hasil bulan ini + breakdown per tahap (total 6 kolom). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatisticsCard
          icon={CheckCircle2}
          label="Disetujui Bulan Ini"
          value={kpi ? String(kpi.approved_this_month) : '…'}
          subtitle="Keputusan Anda"
        />
        <StatisticsCard
          icon={XCircle}
          label="Ditolak Bulan Ini"
          value={kpi ? String(kpi.rejected_this_month) : '…'}
          subtitle="Keputusan Anda"
        />

        <Card className="sm:col-span-2 xl:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Keputusan per Tahap</CardTitle>
            <CardDescription>Persetujuan vs penolakan, sepanjang waktu</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !summary ? (
              <Skeleton className="h-[68px] w-full rounded-lg" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    {
                      label: 'Persetujuan Awal',
                      approve: summary?.by_stage.initial.approve ?? 0,
                      reject: summary?.by_stage.initial.reject ?? 0,
                    },
                    {
                      label: 'Persetujuan Penutupan',
                      approve: summary?.by_stage.final.approve ?? 0,
                      reject: summary?.by_stage.final.reject ?? 0,
                    },
                  ] as const
                ).map((stage) => (
                  <div key={stage.label} className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-semibold tabular-nums">{stage.approve}</span>
                      <span className="text-xs text-muted-foreground">disetujui</span>
                      <span className="ml-auto text-2xl font-semibold tabular-nums text-destructive">
                        {stage.reject}
                      </span>
                      <span className="text-xs text-muted-foreground">ditolak</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Antrean tertua — sudah diurutkan dari server, gabungan kedua tahap. */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Perlu Persetujuan Segera</CardTitle>
            <CardDescription>Tiket paling lama menunggu keputusan Anda</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ColumnToggle
              columns={columns}
              visibility={columnVisibility}
              onVisibilityChange={setColumnVisibility}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href="/approver/persetujuan-tiket">
                Lihat semua
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && pending.length === 0 ? (
            <TableSkeleton rows={5} />
          ) : pending.length === 0 ? (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleCheckBig />
                </EmptyMedia>
                <EmptyTitle>Antrean bersih</EmptyTitle>
                <EmptyDescription>
                  Semua tiket yang memerlukan persetujuan Anda sudah diproses.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {/* Mobile — tanpa ini seluruh antrean tidak terlihat di layar kecil.
                  Tanpa `px-*`: `CardContent` sudah memberi padding kiri-kanan, jadi
                  menambahkannya di sini akan jadi 32px. Jarak bawah juga dari
                  `py-(--card-spacing)` milik `Card`. */}
              <div
                className={cn(
                  'space-y-3 transition-opacity md:hidden',
                  loading && 'pointer-events-none opacity-50',
                )}
              >
                {pending.map((ticket) => (
                  <div key={`${ticket.stage}-${ticket.ticket_no}`} className="rounded-lg border bg-card py-4">
                    <div className="space-y-2 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-mono text-xs text-muted-foreground">
                            {ticket.ticket_no}
                          </p>
                          <p className="line-clamp-2 text-sm font-medium leading-snug">
                            {ticket.subject}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            SO: {ticket.so_number ?? '-'}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <PriorityBadge priority={ticket.priority_code} />
                          <TypeBadge ticketType={ticket.ticket_type_code} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="size-5 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {ticket.reporter_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{ticket.reporter_name}</span>
                        <span className="ml-auto shrink-0">
                          {ticket.stage === 'FINAL' ? 'Penutupan' : 'Awal'} · {ticket.age_days} hari
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" asChild>
                          <Link href={approvalHref(ticket)}>
                            Tinjau
                            <ChevronRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={pending}
                  isPending={loading}
                  showRowNumbers
                  columnVisibility={columnVisibility}
                  onColumnVisibilityChange={setColumnVisibility}
                  emptyText="Semua tiket yang memerlukan persetujuan Anda sudah diproses."
                  footer={() => null}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
