'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Hammer,
  RefreshCw,
  Users,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { CategoryTrendChart } from '@/components/shared/CategoryTrendChart';
import { ProductTrendChart } from '@/components/shared/ProductTrendChart';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminCustomers } from '@/lib/api/admin-customers';
import {
  getAdminDashboardSummary,
  type AdminDashboardOldestOpen,
} from '@/lib/api/admin-dashboard';
import { getAdminEmployees } from '@/lib/api/admin-employees';
import { getAdminTicketHistory } from '@/lib/api/admin-ticket-history';
import { getAdminTicketMonitoring } from '@/lib/api/admin-ticket-monitoring';
import { getMasterDataAll, type RawCategory, type RawProduct } from '@/lib/api/master';
import type { Ticket, TicketStatus, TicketType } from '@/lib/types/ticket';

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
  products: RawProduct[];
}

/** Baris tabel "Perlu Perhatian" — bentuk minimal dari tiket OPEN terlama. */
interface AttentionTicket {
  /** Untuk link detail: ticket_no (mis. BRT-2026-0913-001). */
  id: string;
  subject: string;
  ticketType: TicketType;
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
    ticketType: row.ticket_type_code ?? 'REQUEST',
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

export default function AdminDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [attentionTickets, setAttentionTickets] = React.useState<AttentionTicket[]>([]);
  const [chartTickets, setChartTickets] = React.useState<Ticket[]>([]);
  const [master, setMaster] = React.useState<MasterForCharts | null>(null);

  const loadDashboard = React.useCallback(async () => {
    try {
      // Ringkasan admin (Phase 2) — bila endpoint gagal, fallback ke Phase 1.
      const summaryPromise = getAdminDashboardSummary().catch(() => null);

      // Data chart + master selalu dibutuhkan, apa pun jalur KPI-nya.
      const [chartActiveRes, chartDoneRes, masterRes, summary] = await Promise.all([
        getAdminTicketMonitoring({ per_page: CHART_FETCH_LIMIT }),
        getAdminTicketHistory({ per_page: CHART_FETCH_LIMIT }),
        getMasterDataAll(),
        summaryPromise,
      ]);

      let nextStats: DashboardStats;
      let nextAttention: AttentionTicket[];

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
      }

      setStats(nextStats);
      setAttentionTickets(nextAttention);
      setChartTickets([...chartActiveRes.data, ...chartDoneRes.data]);
      setMaster({ categories: masterRes.categories, products: masterRes.products });
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

      {/* KPI */}
      {loading || !stats ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatisticsCard
            icon={Activity}
            label="Tiket Aktif"
            value={fmt(stats.active)}
            subtitle="Non-terminal (open & proses)"
          />
          <StatisticsCard
            icon={AlertTriangle}
            label="Perlu Perhatian"
            value={fmt(stats.attention)}
            subtitle="Open + rework"
          />
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
            icon={Users}
            label="Pegawai"
            value={fmt(stats.employees)}
            subtitle="Total pegawai terdaftar"
          />
          <StatisticsCard
            icon={UsersRound}
            label="Pelanggan"
            value={fmt(stats.customers)}
            subtitle="Pelanggan teridentifikasi"
          />
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
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/ticket/monitoring">
              Lihat Monitoring
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: ATTENTION_LIMIT }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : attentionTickets.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Tidak ada tiket OPEN — semua sudah tertangani
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Tiket</th>
                      <th className="pb-2 font-medium">Tipe</th>
                      <th className="pb-2 font-medium">Masuk</th>
                      <th className="pb-2 font-medium">Umur</th>
                      <th className="w-8 pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {attentionTickets.map((t) => {
                      const days = ageInDays(t.createdAt);
                      return (
                        <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3">
                            <p className="font-medium">{t.id}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {t.subject}
                            </p>
                          </td>
                          <td className="py-3">
                            <TypeBadge ticketType={t.ticketType} />
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {new Date(t.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3">
                            <span
                              className={
                                days >= 3
                                  ? 'text-sm font-semibold text-red-600'
                                  : 'text-sm text-muted-foreground'
                              }
                            >
                              {days} hari
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/ticket/monitoring/${t.id}`} aria-label="Buka tiket">
                                <ArrowRight className="size-4" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

      {/* Chart tren */}
      <div className="grid gap-6 xl:grid-cols-2">
        {loading || !master ? (
          <>
            <Skeleton className="h-[380px] rounded-xl" />
            <Skeleton className="h-[380px] rounded-xl" />
          </>
        ) : (
          <>
            <CategoryTrendChart tickets={chartTickets} categories={master.categories} />
            <ProductTrendChart tickets={chartTickets} products={master.products} />
          </>
        )}
      </div>
    </div>
  );
}
