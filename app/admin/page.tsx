'use client';

import * as React from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleCheck,
  Clock,
  Hammer,
  RefreshCw,
  Timer,
  Users,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { CategoryTrendChart } from '@/components/shared/CategoryTrendChart';
import { ProductTrendChart } from '@/components/shared/ProductTrendChart';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/shared/DataTable';
import { ColumnToggle } from '@/components/shared/ColumnToggle';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import type { DataTableFeatures } from '@/components/shared/data-table-features';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminCustomers } from '@/lib/api/admin-customers';
import {
  getAdminDashboardSummary,
  type AdminDashboardDuration,
  type AdminDashboardOldestOpen,
  type AdminDashboardWansis,
  type AdminDashboardWorkloadRow,
} from '@/lib/api/admin-dashboard';
import { getAdminEmployees } from '@/lib/api/admin-employees';
import { getAdminTicketHistory } from '@/lib/api/admin-ticket-history';
import { getAdminTicketMonitoring } from '@/lib/api/admin-ticket-monitoring';
import { getMasterDataAll, type RawCategory } from '@/lib/api/master';
import { getItemGroups, type SapItemGroup } from '@/lib/api/sap';
import type { Ticket, TicketStatus } from '@/lib/types/ticket';

interface DashboardStats {
  /** Semua tiket non-terminal (OPEN + PENDING_APPROVAL + IN_PROGRESS + PENDING_REVIEW + REWORK_REQUIRED). */
  active: number;
  /** OPEN + REWORK_REQUIRED — perlu ditindaklanjuti handler/unit. */
  attention: number;
  /** Menunggu review reviewer. */
  pendingReview: number;
  /** Sedang dikerjakan handler. */
  inProgress: number;
  /** CLOSED */
  closed: number;
  /** REJECTED */
  rejected: number;
  /** Total pegawai terdaftar. */
  employees: number;
  /** Total pelanggan teridentifikasi. */
  customers: number;
}

interface MasterForCharts {
  categories: RawCategory[];
}

/** Baris agregat harian dari `dashboard-summary` → `trends`. */
type CategoryTrendSeries = { date: string; category_id: number | null; count: number };
type ProductTrendSeries = { date: string; group_code: string; count: number };

/**
 * Format durasi jam jadi satuan yang enak dibaca: "9 jam" di bawah sehari,
 * "2,4 hari" di atasnya.
 */
function formatHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)} jam`;
  return `${(hours / 24).toFixed(1).replace('.', ',')} hari`;
}

/** Baris tabel "Perlu Perhatian" — bentuk minimal dari tiket OPEN terlama. */
interface AttentionTicket {
  /** Untuk link detail: ticket_no (mis. BRT-2026-0913-001). */
  id: string;
  subject: string;
  ticketType: string | null;
  status: TicketStatus;
  createdAt: string;
}

function toAttentionFromTicket(t: Ticket): AttentionTicket {
  return {
    id: t.id,
    subject: t.subject,
    ticketType: t.ticketType,
    status: t.status,
    createdAt: t.createdAt,
  };
}

function toAttentionFromSummary(row: AdminDashboardOldestOpen): AttentionTicket {
  return {
    id: row.ticket_no || String(row.id),
    subject: row.subject,
    // Backend mengirim kode status; OPEN karena difilter di BE.
    status: 'OPEN',
    ticketType: row.ticket_type_code ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

const CHART_FETCH_LIMIT = 100; // batas per_page backend
const ATTENTION_LIMIT = 5;

function fmt(value: number): string {
  return value.toLocaleString('id-ID');
}

function ageInDays(createdAt: string): number {
  const time = new Date(createdAt).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

const attentionColumnHelper = createColumnHelper<DataTableFeatures, AttentionTicket>();

const attentionColumns: ColumnDef<DataTableFeatures, AttentionTicket>[] =
  attentionColumnHelper.columns([
    attentionColumnHelper.accessor('id', {
      header: 'Tiket',
      cell: ({ row }) => (
        <div className="max-w-[280px] space-y-0.5">
          <p className="font-mono text-xs whitespace-nowrap">{row.original.id}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.subject}</p>
        </div>
      ),
    }),
    attentionColumnHelper.display({
      id: 'tipe',
      header: 'Tipe',
      cell: ({ row }) => <TypeBadge ticketType={row.original.ticketType} />,
    }),
    attentionColumnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    }),
    attentionColumnHelper.accessor('createdAt', {
      header: 'Masuk',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.original.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    }),
    attentionColumnHelper.display({
      id: 'umur',
      header: 'Umur',
      cell: ({ row }) => {
        const days = ageInDays(row.original.createdAt);
        return (
          <span
            className={cn(
              'text-sm whitespace-nowrap',
              days >= 3 ? 'font-semibold text-red-600' : 'text-muted-foreground',
            )}
          >
            {days} hari
          </span>
        );
      },
    }),
    attentionColumnHelper.display({
      id: 'aksi',
      header: () => <div className="w-8" />,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/ticket/monitoring/${row.original.id}`} aria-label="Buka tiket">
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      ),
      enableHiding: false,
    }),
  ]);

export default function AdminDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [attentionTickets, setAttentionTickets] = React.useState<AttentionTicket[]>([]);
  const [duration, setDuration] = React.useState<AdminDashboardDuration | null>(null);
  const [wansis, setWansis] = React.useState<AdminDashboardWansis | null>(null);
  const [workload, setWorkload] = React.useState<AdminDashboardWorkloadRow[]>([]);
  const [trends, setTrends] = React.useState<{
    categories: CategoryTrendSeries[];
    products: ProductTrendSeries[];
  }>({
    categories: [],
    products: [],
  });
  const [master, setMaster] = React.useState<MasterForCharts | null>(null);
  const [itemGroupsState, setItemGroupsState] = React.useState<SapItemGroup[]>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});

  const loadDashboard = React.useCallback(async () => {
    try {
      // Ringkasan admin — satu request untuk KPI, workload, tren, durasi, WANSIS.
      // Bila endpoint gagal, fallback ke jalur count-only (Phase 1).
      const summaryPromise = getAdminDashboardSummary().catch(() => null);

      // Master tetap dibutuhkan untuk nama & warna legend chart. Tren TIDAK
      // lagi butuh tiket: backend sudah mengirim agregat hariannya.
      const [masterRes, summary] = await Promise.all([getMasterDataAll(), summaryPromise]);

      let nextStats: DashboardStats;
      let nextAttention: AttentionTicket[];
      let nextDuration: AdminDashboardDuration;
      let nextWansis: AdminDashboardWansis;
      let nextWorkload: AdminDashboardWorkloadRow[];
      let nextTrends: { categories: CategoryTrendSeries[]; products: ProductTrendSeries[] };

      if (summary) {
        nextStats = {
          active: summary.kpi.active,
          attention: summary.kpi.need_attention,
          pendingReview: summary.kpi.pending_review,
          inProgress: summary.kpi.in_progress,
          closed: summary.kpi.closed,
          rejected: summary.kpi.rejected,
          employees: summary.kpi.employees,
          customers: summary.kpi.customers,
        };
        nextAttention = summary.oldest_open.map(toAttentionFromSummary);
        nextDuration = summary.duration;
        nextWansis = summary.wansis;
        nextWorkload = summary.workload;
        nextTrends = {
          categories: summary.trends.categories,
          products: summary.trends.products,
        };
      } else {
        // Fallback Phase 1: count-only request per status (murah, per_page=1).
        const [
          activeRes,
          attentionRes,
          pendingReviewRes,
          inProgressRes,
          closedRes,
          rejectedRes,
          employeesRes,
          customersRes,
          oldestOpenRes,
        ] = await Promise.all([
          getAdminTicketMonitoring({ per_page: 1 }),
          getAdminTicketMonitoring({ statuses: ['OPEN', 'REWORK_REQUIRED'], per_page: 1 }),
          getAdminTicketMonitoring({ status: 'PENDING_REVIEW', per_page: 1 }),
          getAdminTicketMonitoring({ status: 'IN_PROGRESS', per_page: 1 }),
          getAdminTicketHistory({ status: 'CLOSED', per_page: 1 }),
          getAdminTicketHistory({ status: 'REJECTED', per_page: 1 }),
          getAdminEmployees({ per_page: 1 }),
          getAdminCustomers({ per_page: 1 }),
          // Backend selalu urut `latest()`; OPEN terlama diambil client-side
          // dari sample OPEN terbaru (100) — cukup sebagai perkiraan.
          getAdminTicketMonitoring({ status: 'OPEN', per_page: CHART_FETCH_LIMIT }),
        ]);

        nextStats = {
          active: activeRes.total,
          attention: attentionRes.total,
          pendingReview: pendingReviewRes.total,
          inProgress: inProgressRes.total,
          closed: closedRes.total,
          rejected: rejectedRes.total,
          employees: employeesRes.total,
          customers: customersRes.summary.total_customers,
        };
        nextAttention = [...oldestOpenRes.data]
          .sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
          .slice(0, ATTENTION_LIMIT)
          .map(toAttentionFromTicket);

        // Jalur lama tidak punya duration/wansis/workload/tren dari server.
        // Nol & kosong lebih jujur daripada menebak: kartu terkait akan
        // menampilkan "tidak tersedia" alih-alih angka yang terlihat meyakinkan.
        nextDuration = { days: 30, sample: 0, avg_hours: null, p50_hours: null, p90_hours: null };
        nextWansis = { sent: 0, failed: 0, queued: 0 };
        nextWorkload = [];
        nextTrends = { categories: [], products: [] };
      }

      setStats(nextStats);
      setAttentionTickets(nextAttention);
      setDuration(nextDuration);
      setWansis(nextWansis);
      setWorkload(nextWorkload);
      setTrends(nextTrends);
      setMaster({ categories: masterRes.categories });
      setItemGroupsState(await getItemGroups());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat dasbor.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      await loadDashboard();
    })();
  }, [loadDashboard]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-10 text-destructive" />
        <div>
          <p className="text-lg font-semibold">Gagal memuat dasbor</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button
          onClick={() => {
            setLoading(true);
            setError(null);
            void loadDashboard();
          }}
        >
          <RefreshCw className="mr-2 size-4" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bento — 6 kolom, tiap kartu punya lebar sendiri sesuai isinya.
          Kartu lebar untuk daftar, angka biasa tetap selebar 1 kolom. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Baris 1 — hero + metrik kunci */}
        {loading || !stats ? (
          <>
            <Skeleton className="h-[104px] rounded-xl sm:col-span-2" />
            <Skeleton className="h-[104px] rounded-xl" />
            <Skeleton className="h-[104px] rounded-xl" />
            <Skeleton className="h-[104px] rounded-xl sm:col-span-2" />
          </>
        ) : (
          <>
            <StatisticsCard
              icon={Activity}
              label="Tiket Aktif"
              value={fmt(stats.active)}
              subtitle="Non-terminal (open & proses)"
              className="sm:col-span-2"
            />
            <StatisticsCard
              icon={AlertTriangle}
              label="Perlu Perhatian"
              value={fmt(stats.attention)}
              subtitle="Open + rework"
            />
            <StatisticsCard
              icon={Timer}
              label="Rata-rata Penyelesaian"
              value={
                duration?.avg_hours !== null && duration?.avg_hours !== undefined
                  ? formatHours(duration.avg_hours)
                  : '—'
              }
              subtitle={
                duration && duration.sample > 0
                  ? `${duration.sample} tiket tertutup 30 hari`
                  : 'Belum ada tiket tertutup'
              }
            />
            <StatisticsCard
              icon={Users}
              label="Pegawai"
              value={fmt(stats.employees)}
              subtitle="Total pegawai"
              className="sm:col-span-2"
            />
          </>
        )}
      </div>

      {/* Baris 2 — beban kerja & status pengiriman */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Workload per departemen — kartu bento besar, karena daftar yang
            tumbuh ke bawah dan paling sering jadi rujukan "departemen mana
            yang menumpuk". */}
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Beban per Departemen</CardTitle>
            <CardDescription>
              Tiket dengan assignment aktif per unit
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && workload.length === 0 ? (
              <Skeleton className="h-[168px] w-full rounded-lg" />
            ) : workload.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada assignment aktif.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {workload.slice(0, 6).map((row) => {
                  const max = workload[0]?.count ?? 1;
                  return (
                    <li key={row.department_id ?? 'none'} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm">{row.department}</span>
                      <div className="hidden h-1.5 w-40 shrink-0 overflow-hidden rounded-full bg-muted sm:block">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
                        {row.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Status pengiriman WANSIS */}
        <Card className="sm:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Laporan WANSIS</CardTitle>
            <CardDescription>Status pengiriman ke WANSIS</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !wansis ? (
              <Skeleton className="h-[168px] w-full rounded-lg" />
            ) : (
              <div className="grid grid-cols-3 gap-3 text-center">
                {(
                  [
                    { label: 'Terkirim', value: wansis?.sent ?? 0, tone: 'text-emerald-600' },
                    { label: 'Antre', value: wansis?.queued ?? 0, tone: 'text-muted-foreground' },
                    { label: 'Gagal', value: wansis?.failed ?? 0, tone: 'text-destructive' },
                  ] as const
                ).map((item) => (
                  <div key={item.label} className="flex flex-col gap-1">
                    <span className={cn('text-2xl font-semibold tabular-nums', item.tone)}>
                      {item.value}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Baris 3 — angka sisa */}
      {!loading && stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
          <StatisticsCard
            icon={Clock}
            label="Menunggu Review"
            value={fmt(stats.pendingReview)}
            subtitle="Antrean reviewer"
          />
          <StatisticsCard
            icon={Hammer}
            label="Sedang Dikerjakan"
            value={fmt(stats.inProgress)}
            subtitle="Dikerjakan handler"
          />
          <StatisticsCard
            icon={CheckCircle2}
            label="Tiket Selesai"
            value={fmt(stats.closed)}
            subtitle="Status CLOSED"
          />
          <StatisticsCard
            icon={XCircle}
            label="Tiket Ditolak"
            value={fmt(stats.rejected)}
            subtitle="Status REJECTED"
          />
          <StatisticsCard
            icon={UsersRound}
            label="Pelanggan"
            value={fmt(stats.customers)}
            subtitle="Pelanggan teridentifikasi"
          />
          {/* Persentil penyelesaian — companion kartu rata-rata, memberi
              gambaran sebaran tanpa harus membuka laporan. */}
          <Card className="flex flex-col justify-center p-4">
            <p className="text-xs text-muted-foreground">Penyelesaian (p50 / p90)</p>
            <p className="mt-1 text-sm font-medium tabular-nums">
              {duration && duration.p50_hours !== null && duration.p90_hours !== null
                ? `${formatHours(duration.p50_hours)} / ${formatHours(duration.p90_hours)}`
                : '—'}
            </p>
          </Card>
        </div>
      )}

      {/* Perlu Perhatian — tiket OPEN paling lama */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Perlu Perhatian</CardTitle>
            <CardDescription>
              {ATTENTION_LIMIT} tiket paling lama menunggu tindakan
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ColumnToggle
              columns={attentionColumns}
              visibility={columnVisibility}
              onVisibilityChange={setColumnVisibility}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/ticket/monitoring">
                Lihat Monitoring
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && attentionTickets.length === 0 ? (
            <TableSkeleton rows={ATTENTION_LIMIT} />
          ) : attentionTickets.length === 0 ? (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleCheck />
                </EmptyMedia>
                <EmptyTitle>Tidak ada tiket OPEN</EmptyTitle>
                <EmptyDescription>
                  Semua tiket sudah tertangani.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <DataTable
                  columns={attentionColumns}
                  data={attentionTickets}
                  isPending={loading}
                  showRowNumbers
                  columnVisibility={columnVisibility}
                  onColumnVisibilityChange={setColumnVisibility}
                  empty={
                    <Empty className="border-0 py-12">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <CircleCheck />
                        </EmptyMedia>
                        <EmptyTitle>Tidak ada tiket OPEN</EmptyTitle>
                        <EmptyDescription>
                          Semua tiket sudah tertangani.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  }
                  // Daftar tetap 5 baris; paginasi bawaan di-nonaktifkan.
                  footer={() => null}
                />
              </div>

              {/* Mobile */}
              <div className="space-y-3 md:hidden">
                {attentionTickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/ticket/monitoring/${t.id}`}
                    className="block rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{t.id}</p>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {t.subject}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <TypeBadge ticketType={t.ticketType} />
                      <span className="text-muted-foreground">
                        Masuk {ageInDays(t.createdAt)} hari
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Chart tren — satu chart per baris, atas bawah */}
      <div className="grid gap-6">
        {loading || !master ? (
          <>
            <Skeleton className="h-[380px] rounded-xl" />
            <Skeleton className="h-[380px] rounded-xl" />
          </>
        ) : (
          <>
            <CategoryTrendChart series={trends.categories} categories={master.categories} />
            <ProductTrendChart series={trends.products} groups={itemGroupsState} />
          </>
        )}
      </div>
    </div>
  );
}
