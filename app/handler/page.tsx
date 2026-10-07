'use client';

import { useEffect, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import {
  getHandlerSummary,
  type HandlerActivity,
  type HandlerSummary,
  type HandlerSummaryTicket,
} from '@/lib/api/handler-dashboard';
import { PriorityBadge, StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
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
import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleCheckBig, Clock, Inbox, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/** Berapa aktivitas terbaru yang ditampilkan di kartu aktivitas. */
const ACTIVITY_LIMIT = 5;

/** Format durasi jam jadi satuan yang enak dibaca. */
function formatHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)} jam`;
  return `${(hours / 24).toFixed(1).replace('.', ',')} hari`;
}

/** Timestamp ISO → "3 Okt, 05.14". Versi lama menampilkan string ISO mentah. */
function formatMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const columnHelper = createColumnHelper<DataTableFeatures, HandlerSummaryTicket>();

const urgentColumns: ColumnDef<DataTableFeatures, HandlerSummaryTicket>[] = columnHelper.columns([
  columnHelper.accessor('ticket_no', {
    header: 'ID Tiket',
    cell: ({ row }) => (
      <span className="font-mono text-xs whitespace-nowrap">{row.original.ticket_no}</span>
    ),
  }),
  columnHelper.accessor('subject', {
    header: 'Subjek',
    cell: ({ row }) => (
      <div className="max-w-[240px] space-y-0.5">
        <p className="truncate text-sm font-medium">{row.original.subject}</p>
        <p className="truncate text-xs text-muted-foreground">SO: {row.original.so_number ?? '-'}</p>
      </div>
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
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status_code ?? 'IN_PROGRESS'} />,
  }),
  columnHelper.display({
    id: 'umur',
    header: 'Umur',
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
          <Link href={`/handler/ticket/${row.original.ticket_no}`}>
            Detail
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    ),
    enableHiding: false,
  }),
]);

export default function HandlerDashboardPage() {
  const [summary, setSummary] = useState<HandlerSummary | null>(null);
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
        const data = await getHandlerSummary();
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Gagal memuat dashboard handler.';
          setError(message);
          toast.error(message);
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
  const queue = summary?.oldest_need_action ?? [];
  const activity = summary?.recent_activity ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Empat KPI antrean — grid 4 kolom, bukan 6, karena jumlahnya genap. */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatisticsCard
          icon={Inbox}
          label="Perlu Tindakan"
          value={kpi ? String(kpi.need_action) : '…'}
          subtitle="Belum ada resolusi"
        />
        <StatisticsCard
          icon={Clock}
          label="Menunggu Review"
          value={kpi ? String(kpi.waiting_review) : '…'}
          subtitle="Resolusi diajukan"
        />
        <StatisticsCard
          icon={RotateCcw}
          label="Perlu Revisi"
          value={kpi ? String(kpi.rework) : '…'}
          subtitle="Resolusi ditolak approver"
        />
        <StatisticsCard
          icon={CheckCircle2}
          label="Selesai"
          value={kpi ? String(kpi.history) : '…'}
          subtitle="Disetujui / ditutup"
        />
      </div>

      {/* Bento — antrean lebar, kolom kanan untuk hasil kerja + aktivitas. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-6">
        <Card className="xl:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Perlu Tindakan Segera</CardTitle>
              <CardDescription>Tiket paling lama menunggu Anda</CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ColumnToggle
                columns={urgentColumns}
                visibility={columnVisibility}
                onVisibilityChange={setColumnVisibility}
              />
              <Button variant="outline" size="sm" asChild>
                <Link href="/handler/need-action">
                  Lihat semua
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && queue.length === 0 ? (
              <TableSkeleton rows={5} />
            ) : queue.length === 0 ? (
              <Empty className="border-0 py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CircleCheckBig />
                  </EmptyMedia>
                  <EmptyTitle>Tidak ada tiket yang perlu ditindaklanjuti</EmptyTitle>
                  <EmptyDescription>
                    Semua tiket yang ditugaskan kepada Anda sudah dikerjakan.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <div
                  className={cn(
                    // Tanpa `px-*`: `CardContent` sudah memberi padding kiri-kanan.
                    'space-y-3 transition-opacity md:hidden',
                    loading && 'pointer-events-none opacity-50',
                  )}
                >
                  {queue.map((ticket) => (
                    <div key={ticket.ticket_no} className="rounded-lg border bg-card py-4">
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
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            Menunggu {ticket.age_days} hari
                          </span>
                          <Button size="sm" asChild>
                            <Link href={`/handler/ticket/${ticket.ticket_no}`}>
                              Detail
                              <ArrowUpRight data-icon="inline-end" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <DataTable
                    columns={urgentColumns}
                    data={queue}
                    isPending={loading}
                    showRowNumbers
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                    emptyText="Tidak ada tiket yang perlu ditindaklanjuti saat ini."
                    footer={() => null}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Hasil kerja — metrik yang sebelumnya tidak ada sama sekali. */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hasil Kerja Anda</CardTitle>
              <CardDescription>Sepanjang waktu</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && !summary ? (
                <Skeleton className="h-[92px] w-full rounded-lg" />
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  {(
                    [
                      { label: 'Entri progres', value: String(kpi?.progress_count ?? 0) },
                      { label: 'Resolusi diajukan', value: String(kpi?.resolutions_submitted ?? 0) },
                      {
                        label: 'Rasio rework',
                        value:
                          kpi?.rework_rate !== null && kpi?.rework_rate !== undefined
                            ? `${kpi.rework_rate.toFixed(1).replace('.', ',')}%`
                            : '—',
                        tone:
                          (kpi?.rework_rate ?? 0) > 50
                            ? 'text-destructive'
                            : (kpi?.rework_rate ?? 0) > 0
                              ? 'text-amber-600'
                              : 'text-foreground',
                      },
                      {
                        label: 'Rata-rata penyelesaian',
                        value:
                          summary?.avg_resolution_hours !== null &&
                          summary?.avg_resolution_hours !== undefined
                            ? formatHours(summary.avg_resolution_hours)
                            : '—',
                      },
                    ] as const
                  ).map((item) => (
                    <div key={item.label} className="flex flex-col gap-0.5">
                      <span
                        className={cn(
                          'text-xl font-semibold tabular-nums',
                          'tone' in item ? item.tone : 'text-foreground',
                        )}
                      >
                        {item.value}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/*
            Aktivitas terbaru. Dipertahankan, tapi tidak lagi full width — dipindah
            ke kolom kanan supaya bertumpuk dengan hasil kerja. Nomor tiketnya
            kini tautan sungguhan; versi lama kehilangan field itu dan hanya
            menampilkan teks polos "Tiket" tanpa data di belakangnya.
          */}
          <Card className="flex min-h-0 flex-col">
            <CardHeader>
              <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
              <CardDescription>Progres & resolusi terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && activity.length === 0 ? (
                <Skeleton className="h-[200px] w-full rounded-lg" />
              ) : activity.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada aktivitas
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {activity.slice(0, ACTIVITY_LIMIT).map((item: HandlerActivity) => (
                    <li key={`${item.kind}-${item.ticket_no}-${item.at}`} className="flex gap-2.5">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug">
                          <Link
                            href={`/handler/ticket/${item.ticket_no}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {item.ticket_no}
                          </Link>{' '}
                          <span className="text-muted-foreground">{item.label}</span>
                          {item.kind === 'resolution' && item.resolution_no ? (
                            <span className="text-muted-foreground"> #{item.resolution_no}</span>
                          ) : null}
                        </p>
                        {item.note ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {item.note}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatMoment(item.at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
