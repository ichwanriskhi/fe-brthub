/**
 * API client untuk riwayat tiket (admin) — pakai endpoint `GET /api/auth/tickets`
 * dengan filter `status_codes[]=CLOSED&status_codes[]=REJECTED`.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

import { toTicket } from '@/lib/api/tickets';
import type { Ticket } from '@/lib/types/ticket';

export interface AdminTicketHistoryParams {
  search?: string;
  status?: 'CLOSED' | 'REJECTED';
  priority?: 'A' | 'B' | 'C';
  ticketType?: 'REQUEST' | 'INCIDENT' | 'COMPLAINT' | 'INQUIRY';
  categoryId?: string;
  handlerId?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  per_page?: number;
  page?: number;
  withSummary?: boolean;
}

export interface AdminTicketHistoryResponse {
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
  const token = getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

  return res.json();
}

export async function getAdminTicketHistory(
  params: AdminTicketHistoryParams = {}
): Promise<AdminTicketHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status_code', params.status);
  if (params.priority) searchParams.set('priority_code', params.priority);
  if (params.ticketType) searchParams.set('ticket_type_code', params.ticketType);
  if (params.categoryId) searchParams.set('category_id', params.categoryId);
  if (params.handlerId) searchParams.set('handler_id', params.handlerId);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  if (params.per_page) searchParams.set('per_page', String(params.per_page));
  if (params.page) searchParams.set('page', String(params.page));
  if (params.withSummary) searchParams.set('with_summary', '1');

  // Default untuk riwayat: CLOSED + REJECTED (kalau status tidak diset eksplisit)
  if (!params.status) {
    searchParams.append('status_codes[]', 'CLOSED');
    searchParams.append('status_codes[]', 'REJECTED');
  }

  const raw = await adminFetch<Record<string, unknown>>(
    `/api/auth/tickets?${searchParams.toString()}`,
  );

  const items = Array.isArray(raw.data) ? (raw.data as unknown[]) : [];

  return {
    ...(raw as unknown as AdminTicketHistoryResponse),
    data: items.map(toTicket),
  };
}
