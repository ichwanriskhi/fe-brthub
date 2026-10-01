/**
 * API client untuk manajemen pelanggan (admin).
 *
 * Endpoint di bawah `/api/admin` — butuh bearer token + role admin.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
import { authenticatedFetch } from './fetch-wrapper';

export interface AdminCustomer {
  id: number;
  code: string;
  user_id: number;
  is_active: boolean;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  tickets: {
    total: number;
    active: number;
    resolved: number;
  };
}

export interface AdminCustomersResponse {
  data: AdminCustomer[];
  summary: {
    total_customers: number;
    customers_with_tickets: number;
    total_tickets: number;
    active_tickets: number;
    resolved_tickets: number;
  };
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface GetAdminCustomersParams {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  per_page?: number;
  page?: number;
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

  return res.json();
}

export async function getAdminCustomers(
  params: GetAdminCustomersParams = {}
): Promise<AdminCustomersResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.per_page) searchParams.set('per_page', String(params.per_page));
  if (params.page) searchParams.set('page', String(params.page));

  return adminFetch<AdminCustomersResponse>(`/api/admin/customers?${searchParams.toString()}`);
}

// Helper untuk transform ke bentuk yang dipakai UI (mirip MOCK_CUSTOMERS)
export interface CustomerEntry {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  tickets: {
    total: number;
    active: number;
    resolved: number;
  };
}

export function toCustomerEntry(raw: AdminCustomer): CustomerEntry {
  return {
    id: String(raw.id),
    code: raw.code,
    name: raw.name ?? 'Tanpa nama',
    email: raw.email,
    phone: raw.phone ?? '-',
    address: raw.address,
    isActive: raw.is_active,
    createdAt: raw.created_at,
    tickets: raw.tickets,
  };
}

export function toSummary(raw: AdminCustomersResponse['summary']) {
  return {
    totalCustomers: raw.total_customers,
    customersWithTickets: raw.customers_with_tickets,
    totalTickets: raw.total_tickets,
    activeTickets: raw.active_tickets,
    resolvedTickets: raw.resolved_tickets,
  };
}