'use client';

import { useEffect, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpRight,
  CircleCheckBig,
  Clock,
  Inbox,
  RefreshCw,
  Send,
  Timer,
  XCircle,
} from 'lucide-react';
import {
  getReviewerSummary,
  toTicketStatus,
  toTicketType,
  type ReviewerSummary,
  type ReviewerSummaryTicket,
} from '@/lib/api/reviewer-dashboard';
import { cn } from '@/lib/utils';

const LIST_LIMIT = 5;

/** Format durasi jam jadi satuan yang enak dibaca. */
function formatHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)} jam`;
  return `${(hours / 24).toFixed(1).replace('.', ',')} hari`;
}

const columnHelper = createColumnHelper<DataTableFeatures, ReviewerSummaryTicket>();

const attentionColumns: ColumnDef<DataTableFeatures, ReviewerSummaryTicket>[] =
  columnHelper.columns([
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
          <p className="truncate text-xs text-muted-foreground">
            SO: {row.original.so_number ?? '-'}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor('reporter_name', {
      header: 'Pelapor',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-6 shrink-0">
            <AvatarFallback className="text-[10px]">
              {row.original.reporter_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm">{row.original.reporter_name}</span>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'tipe',
      header: 'Tipe',
      cell: ({ row }) => <TypeBadge ticketType={toTicketType(row.original.ticket_type_code)} />,
    }),
    columnHelper.display({
      id: 'umur',
      header: 'Umur',
      cell: ({ row }) => (
        <span
          className={cn(
            'text-sm whitespace-nowrap',
            row.original.age_days >= 3
              ? 'font-semibold text-destructive'
              : 'text-muted-foreground',
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
            <Link href={`/reviewer/tiket/${row.original.ticket_no}`}>
              Tinjau
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      ),
      enableHiding: false,
    }),
  ]);

const activityColumns: ColumnDef<DataTableFeatures, ReviewerSummaryTicket>[] =
  columnHelper.columns([
    columnHelper.accessor('ticket_no', {
      header: 'ID Tiket',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">{row.original.ticket_no}</span>
      ),
    }),
    columnHelper.accessor('subject', {
      header: 'Subjek',
      cell: ({ row }) => (
        <p className="max-w-[240px] truncate text-sm font-medium">{row.original.subject}</p>
      ),
    }),
    columnHelper.display({
      id: 'tipe',
      header: 'Tipe',
      cell: ({ row }) => <TypeBadge ticketType={toTicketType(row.original.ticket_type_code)} />,
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={toTicketStatus(row.original.status_code)} />,
    }),
    columnHelper.accessor('reviewed_at', {
      header: 'Ditinjau',
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {row.original.reviewed_at
            ? new Date(row.original.reviewed_at).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '-'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'aksi',
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" asChild>
            <Link href={`/reviewer/tiket/${row.original.ticket_no}`}>
              Lihat
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      ),
      enableHiding: false,
    }),
  ]);

export default function ReviewerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReviewerSummary | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [attentionColumnsState, setAttentionColumns] = useState<ColumnVisibilityState>({});
  const [activityColumnsState, setActivityColumns] = useState<ColumnVisibilityState>({});

  // SetState di dalam async IIFE, bukan langsung di badan effect — itu membuat
  // `react-hooks/set-state-in-effect` tetap tenang sekaligus memberi
  // pembatalan supaya state tidak ditulis setelah unmount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getReviewerSummary();
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

  const retry = () => setRetryKey((k) => k + 1);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">Gagal memuat dasbor</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={retry}>
          <RefreshCw data-icon="inline-start" />
          Coba lagi
        </Button>
      </div>
    );
  }

  const kpi = summary?.kpi;
  const oldest = summary?.oldest_open ?? [];
  const recent = summary?.recent_reviews ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Bento — 6 kolom. Tiga kartu sama-sama `sm:col-span-2` supaya totalnya
          tepat 6; sebelumnya 2+1+2 menyisakan satu kolom kosong di kanan. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatisticsCard
          icon={Inbox}
          label="Menunggu Tinjauan"
          value={kpi ? String(kpi.open) : '…'}
          subtitle="Antrean tinjauan awal"
          className="sm:col-span-2"
        />
        <StatisticsCard
          icon={Timer}
          label="Rata-rata Tinjauan"
          value={
            summary?.avg_review_hours !== null && summary?.avg_review_hours !== undefined
              ? formatHours(summary.avg_review_hours)
              : '—'
          }
          subtitle={
            summary && summary.review_sample > 0
              ? `${summary.review_sample} tiket Anda tinjau`
              : 'Belum ada riwayat tinjauan'
          }
          className="sm:col-span-2"
        />
        <StatisticsCard
          icon={Send}
          label="Ditinjau Bulan Ini"
          value={kpi ? String(kpi.reviewed_this_month) : '…'}
          subtitle="Semua keputusan"
          className="sm:col-span-2"
        />
      </div>

      {/* Baris kedua — 3 KPI + 1 kartu status (total 6 kolom). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatisticsCard
          icon={Clock}
          label="Menunggu Approval"
          value={kpi ? String(kpi.waiting_approval) : '…'}
          subtitle="Seluruh tiket, bukan milik Anda"
        />
        <StatisticsCard
          icon={Send}
          label="Diteruskan oleh Anda"
          value={kpi ? String(kpi.routed_total) : '…'}
          subtitle="Sepanjang waktu"
        />
        <StatisticsCard
          icon={XCircle}
          label="Ditolak oleh Anda"
          value={kpi ? String(kpi.rejected_by_me) : '…'}
          subtitle="Sepanjang waktu"
        />

        {/*
          Status tiket milik Anda. Dulu angka "teruskan" dan "masih menunggu"
          berdiri sebagai dua kartu terpisah, sehingga hubungannya (subset)
          tidak terbaca dan keduanya terlihat seperti metrik sebanding.
          Digabung ke satu kartu supaya jelas: dari N yang Anda teruskan,
          berapa yang masih macet di approval.
        */}
        <Card className="sm:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Status Ticket Anda</CardTitle>
            <CardDescription>Dari tiket yang Anda teruskan, berapa yang masih diproses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !summary ? (
              <Skeleton className="h-[68px] w-full rounded-lg" />
            ) : (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-semibold tabular-nums">
                    {kpi?.routed_total ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">Diteruskan</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className={cn(
                      'text-2xl font-semibold tabular-nums',
                      (kpi?.forwarded_waiting ?? 0) > 0 ? 'text-amber-600' : 'text-muted-foreground',
                    )}
                  >
                    {kpi?.forwarded_waiting ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">Masih menunggu</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Antrean tertua */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Perlu Tindakan Segera</CardTitle>
            <CardDescription>
              {LIST_LIMIT} tiket paling lama menunggu tinjauan
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ColumnToggle
              columns={attentionColumns}
              visibility={attentionColumnsState}
              onVisibilityChange={setAttentionColumns}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href="/reviewer/tinjauan-awal">
                Lihat semua
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && oldest.length === 0 ? (
            <TableSkeleton rows={LIST_LIMIT} />
          ) : oldest.length === 0 ? (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleCheckBig />
                </EmptyMedia>
                <EmptyTitle>Tidak ada laporan menunggu</EmptyTitle>
                <EmptyDescription>
                  Semua laporan sudah ditinjau. Lihat Aktivitas Anda untuk riwayat kerja Anda.
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
                {oldest.map((ticket) => (
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
                          <TypeBadge ticketType={toTicketType(ticket.ticket_type_code)} />
                          <StatusBadge status={toTicketStatus(ticket.status_code)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="size-5 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {ticket.reporter_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{ticket.reporter_name}</span>
                        <span className="ml-auto shrink-0">{ticket.age_days} hari</span>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" asChild>
                          <Link href={`/reviewer/tiket/${ticket.ticket_no}`}>
                            Tinjau
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
                  columns={attentionColumns}
                  data={oldest}
                  isPending={loading}
                  showRowNumbers
                  columnVisibility={attentionColumnsState}
                  onColumnVisibilityChange={setAttentionColumns}
                  emptyText="Tidak ada laporan menunggu tinjauan awal."
                  footer={() => null}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Aktivitas — diurut dari review_logs.reviewed_at, bukan tanggal tiket */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Aktivitas Saya</CardTitle>
            <CardDescription>
              {LIST_LIMIT} tiket terakhir yang Anda tinjau
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ColumnToggle
              columns={activityColumns}
              visibility={activityColumnsState}
              onVisibilityChange={setActivityColumns}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href="/reviewer/riwayat">
                Lihat semua
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && recent.length === 0 ? (
            <TableSkeleton rows={LIST_LIMIT} />
          ) : recent.length === 0 ? (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Inbox />
                </EmptyMedia>
                <EmptyTitle>Belum ada aktivitas</EmptyTitle>
                <EmptyDescription>Tiket yang Anda tinjau akan tampil di sini.</EmptyDescription>
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
                {recent.map((ticket) => (
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
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <TypeBadge ticketType={toTicketType(ticket.ticket_type_code)} />
                          <StatusBadge status={toTicketStatus(ticket.status_code)} />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" asChild>
                          <Link href={`/reviewer/tiket/${ticket.ticket_no}`}>
                            Lihat
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
                  columns={activityColumns}
                  data={recent}
                  isPending={loading}
                  showRowNumbers
                  columnVisibility={activityColumnsState}
                  onColumnVisibilityChange={setActivityColumns}
                  emptyText="Belum ada tiket yang Anda tinjau."
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
