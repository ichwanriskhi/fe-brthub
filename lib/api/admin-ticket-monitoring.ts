/**
 * API client untuk monitoring tiket (admin) — pakai endpoint `GET /api/auth/tickets`
 * dengan filter status non-terminal (kecuali CLOSED/REJECTED).
 */

import { toHandlerTicket } from '@/lib/api/handler';
import { toTicket } from '@/lib/api/tickets';
import type { Ticket } from '@/lib/types/ticket';
import { authenticatedFetch } from './fetch-wrapper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export interface AdminTicketMonitoringParams {
  search?: string;
  status?: 'OPEN' | 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'REWORK_REQUIRED';
  /**
   * Gabungkan beberapa status non-terminal dalam satu request
   * (`status_codes[]=…`) — mis. OPEN + REWORK_REQUIRED untuk "Perlu Perhatian".
   * Diabaikan bila `status` di-set (mutually exclusive).
   */
  statuses?: Array<'OPEN' | 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'REWORK_REQUIRED'>;
  priority?: 'A' | 'B' | 'C';
  ticketType?: 'REQUEST' | 'INCIDENT' | 'COMPLAINT' | 'INQUIRY';
  categoryId?: string;
  handlerId?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  per_page?: number;
  page?: number;
}

export interface AdminTicketMonitoringResponse {
  data: Ticket[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('brthub_token');
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

export async function getAdminTicketMonitoring(
  params: AdminTicketMonitoringParams = {},
): Promise<AdminTicketMonitoringResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status_code', params.status);
  if (params.statuses && params.statuses.length > 0 && !params.status) {
    params.statuses.forEach((code) => searchParams.append('status_codes[]', code));
  }
  if (params.priority) searchParams.set('priority_code', params.priority);
  if (params.ticketType) searchParams.set('ticket_type_code', params.ticketType);
  if (params.categoryId) searchParams.set('category_id', params.categoryId);
  if (params.handlerId) searchParams.set('handler_id', params.handlerId);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  if (params.per_page) searchParams.set('per_page', String(params.per_page));
  if (params.page) searchParams.set('page', String(params.page));

  // Default untuk monitoring: semua status non-terminal
  if (!params.status && !(params.statuses && params.statuses.length > 0)) {
    searchParams.append('status_codes[]', 'OPEN');
    searchParams.append('status_codes[]', 'PENDING_APPROVAL');
    searchParams.append('status_codes[]', 'IN_PROGRESS');
    searchParams.append('status_codes[]', 'PENDING_REVIEW');
    searchParams.append('status_codes[]', 'REWORK_REQUIRED');
  }

  const raw = await adminFetch<Record<string, unknown>>(
    `/api/auth/tickets?${searchParams.toString()}`,
  );

  const items = Array.isArray(raw.data) ? (raw.data as unknown[]) : [];

  return {
    ...(raw as unknown as AdminTicketMonitoringResponse),
    data: items.map(toTicket),
  };
}

export async function getAdminTicketDetail(id: string): Promise<Ticket> {
  const res = await authenticatedFetch(`/api/auth/tickets/${encodeURIComponent(id)}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  // Gunakan toHandlerTicket agar handler_progress, resolutions, assignments ter-parse
  return toHandlerTicket(raw.data ?? raw);
}