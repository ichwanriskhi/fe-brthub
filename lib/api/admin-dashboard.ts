/**
 * API client untuk ringkasan dasbor admin (Phase 2).
 *
 * Backend: `GET /api/admin/dashboard-summary` (bearer token + role admin).
 * Satu request berisi KPI, funnel status, workload departemen, tren 90 hari,
 * dan 5 tiket OPEN tertua. Bila endpoint gagal (mis. build lama tanpa route),
 * caller melakukan fallback ke count-only request (Phase 1).
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

export interface AdminDashboardSummary {
  kpi: AdminDashboardKpi;
  funnel: AdminDashboardFunnelRow[];
  workload: AdminDashboardWorkloadRow[];
  trends: {
    days: number;
    categories: Array<{ date: string; category_id: number | null; count: number }>;
    products: Array<{ date: string; product_id: number; count: number }>;
  };
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
