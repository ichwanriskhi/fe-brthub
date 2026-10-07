/**
 * API client untuk ringkasan dasbor admin.
 *
 * Backend: `GET /api/admin/dashboard-summary` (bearer token + role admin).
 * Satu request berisi KPI, funnel status, workload departemen, tren harian
 * per kategori & produk, lama penyelesaian, status WANSIS, dan 5 tiket OPEN
 * tertua.
 *
 * Catatan: `trends` mengirim agregat harian dari server, jadi chart
 * tidak perlu menarik sampel tiket terpotong. Bila endpoint gagal (mis. build
 * lama tanpa route), caller melakukan fallback ke count-only request (Phase 1).
 */

import { authenticatedFetch } from './fetch-wrapper';
import type { TicketPriority, TicketType } from '@/lib/types/ticket';

export interface AdminDashboardKpi {
  /** Tiket non-terminal & belum closed. */
  active: number;
  /** OPEN + REWORK_REQUIRED. */
  need_attention: number;
  pending_review: number;
  in_progress: number;
  closed: number;
  rejected: number;
  employees: number;
  customers: number;
}

export interface AdminDashboardFunnelRow {
  id: number;
  code: string;
  name: string;
  is_terminal: boolean;
  count: number;
}

export interface AdminDashboardWorkloadRow {
  department_id: number | null;
  department: string;
  count: number;
}

export interface AdminDashboardOldestOpen {
  id: number;
  ticket_no: string;
  subject: string;
  ticket_type_code: TicketType | null;
  priority_code: TicketPriority | null;
  created_at: string | null;
  age_days: number;
}

/** Lama penyelesaian tiket yang baru tertutup, dalam jam. */
export interface AdminDashboardDuration {
  /** Jendela pengamatan, dalam hari. */
  days: number;
  /** Berapa tiket yang masuk hitungan. */
  sample: number;
  /** Rata-rata jam; `null` kalau tidak ada sampel. */
  avg_hours: number | null;
  /** Persentil 50 & 90 — lebih tahan terhadap satu tiket yang sangat lama. */
  p50_hours: number | null;
  p90_hours: number | null;
}

/** Status pengiriman laporan ke WANSIS. */
export interface AdminDashboardWansis {
  sent: number;
  failed: number;
  queued: number;
}

export interface AdminDashboardSummary {
  kpi: AdminDashboardKpi;
  funnel: AdminDashboardFunnelRow[];
  workload: AdminDashboardWorkloadRow[];
  trends: {
    days: number;
    categories: Array<{ date: string; category_id: number | null; count: number }>;
    products: Array<{ date: string; group_code: string; count: number }>;
  };
  duration: AdminDashboardDuration;
  wansis: AdminDashboardWansis;
  oldest_open: AdminDashboardOldestOpen[];
  generated_at: string;
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const response = await authenticatedFetch('/api/admin/dashboard-summary', {
    headers: { Accept: 'application/json' },
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (payload as { message?: unknown } | null)?.message;
    throw new Error(
      typeof message === 'string' && message
        ? message
        : `Gagal memuat ringkasan dasbor (HTTP ${response.status}).`,
    );
  }

  return payload as AdminDashboardSummary;
}
