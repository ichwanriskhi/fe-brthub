/**
 * API client untuk manajemen pegawai (admin).
 *
 * Endpoint di bawah `/api/admin` — butuh bearer token + role admin.
 */

import { ASSIGNABLE_APP_ROLES, type AppRole } from '@/lib/types/admin';
import { authenticatedFetch } from './fetch-wrapper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

async function authToken(): Promise<string> {
  const token = typeof window === 'undefined' ? null : localStorage.getItem('brthub_token');
  if (!token) throw new Error('Sesi Anda tidak ditemukan. Silakan masuk kembali.');
  return token;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;
}

export interface EmployeeProfileResponse {
  data: EmployeeProfile[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface EmployeeProfile {
  id: string;
  user_id: string;
  employee_number: string;
  department_id: string | null;
  position_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  /** Role utama (kompatibilitas). */
  role: AppRole;
  /** Semua role aplikasi. */
  roles: AppRole[];
  user: {
    id: string;
    full_name: string;
    email: string | null;
    phone_number: string | null;
    is_active: boolean;
    /** Nama role di DB (admin/reviewer/handler/unit). */
    roles: string[];
  } | null;
  /** Kepemilikan password di Auth Service. Null = tidak diketahui (IdP tak terjangkau). */
  hasPassword: boolean | null;
  department: {
    id: string;
    code: string;
    name: string;
  } | null;
  position: {
    id: string;
    code: string;
    name: string;
    hierarchy_level: number;
  } | null;
}

export interface EmployeeWritePayload {
  full_name: string;
  employee_number: string;
  email?: string | null;
  phone_number?: string | null;
  department_id?: string | null;
  position_id?: string | null;
  status?: 'active' | 'inactive';
  /** Nama role di DB, mis. `admin`, `handler`. Array kosong = staff/reporter. */
  roles: string[];
}

function parseRoleNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item : string(record(item).name)))
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Mapping nama role di DB → AppRole yang dipakai FE.
 * Role DB: admin, reviewer, handler, unit. Tanpa role app → STAFF.
 */
export function mapDbRolesToAppRoles(roles: string[]): AppRole[] {
  const mapped = ASSIGNABLE_APP_ROLES
    .filter((item) => roles.includes(item.dbName))
    .map((item) => item.value);
  return mapped.length > 0 ? mapped : ['STAFF'];
}

export function appRolesToDbNames(roles: AppRole[]): string[] {
  return ASSIGNABLE_APP_ROLES
    .filter((item) => roles.includes(item.value))
    .map((item) => item.dbName);
}

function mapEmployee(e: Record<string, unknown>): EmployeeProfile {
  const rawUser = e.user ? record(e.user) : null;
  const dbRoles = parseRoleNames(rawUser?.roles);
  const appRoles = mapDbRolesToAppRoles(dbRoles);

  return {
    id: string(e.id),
    user_id: string(e.user_id),
    employee_number: string(e.employee_number),
    department_id: e.department_id ? string(e.department_id) : null,
    position_id: e.position_id ? string(e.position_id) : null,
    status: string(e.status) as 'active' | 'inactive',
    created_at: string(e.created_at),
    updated_at: string(e.updated_at),
    user: rawUser
      ? {
          id: string(rawUser.id),
          full_name: string(rawUser.full_name),
          email: rawUser.email ? string(rawUser.email) : null,
          phone_number: rawUser.phone_number ? string(rawUser.phone_number) : null,
          is_active: rawUser.is_active !== false,
          roles: dbRoles,
        }
      : null,
    role: appRoles[0] ?? 'STAFF',
    roles: appRoles,
    hasPassword: typeof e.has_password === 'boolean' ? e.has_password : null,
    department: e.department
      ? {
          id: string(record(e.department).id),
          code: string(record(e.department).code),
          name: string(record(e.department).name),
        }
      : null,
    position: e.position
      ? {
          id: string(record(e.position).id),
          code: string(record(e.position).code),
          name: string(record(e.position).name),
          hierarchy_level: Number(record(e.position).hierarchy_level) || 0,
        }
      : null,
  };
}

async function adminRequest(path: string, init?: RequestInit): Promise<unknown> {
  const response = await authenticatedFetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = record(payload);
    const errors = body.errors as Record<string, string[]> | undefined;
    const firstError = errors ? Object.values(errors).flat()[0] : undefined;
    const err = new Error(firstError || string(body.message, 'Operasi gagal.')) as Error & {
      status: number;
      errors?: Record<string, string[]>;
    };
    err.status = response.status;
    err.errors = errors;
    throw err;
  }

  return payload;
}

/**
 * Ambil daftar pegawai (paginated) untuk admin.
 * Backend: `GET /api/admin/employee-profiles`
 */
export async function getAdminEmployees(params: {
  search?: string;
  status?: 'active' | 'inactive';
  department_id?: string;
  page?: number;
  per_page?: number;
} = {}): Promise<EmployeeProfileResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.department_id) searchParams.set('department_id', params.department_id);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.per_page) searchParams.set('per_page', String(params.per_page));

  const payload = await adminRequest(`/api/admin/employee-profiles?${searchParams.toString()}`);
  const item = record(payload);
  const data = Array.isArray(item.data) ? item.data.map(record) : [];

  return {
    data: data.map(mapEmployee),
    current_page: Number(item.current_page) || 1,
    last_page: Number(item.last_page) || 1,
    per_page: Number(item.per_page) || 20,
    total: Number(item.total) || 0,
  };
}

/** Create pegawai. POST /api/admin/employee-profiles */
export async function createAdminEmployee(payload: EmployeeWritePayload): Promise<EmployeeProfile> {
  const body = await adminRequest('/api/admin/employee-profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapEmployee(record(body));
}

/** Update pegawai + role. PUT /api/admin/employee-profiles/{id} */
export async function updateAdminEmployee(
  id: string,
  payload: EmployeeWritePayload,
): Promise<EmployeeProfile> {
  const body = await adminRequest(`/api/admin/employee-profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapEmployee(record(body));
}

/** Kirim link setup password. POST /api/admin/users/{userId}/setup-password-link */
export async function sendSetupPasswordLink(userId: string, channel?: 'email'): Promise<void> {
  await adminRequest(`/api/admin/users/${userId}/setup-password-link`, {
    method: 'POST',
    body: JSON.stringify(channel ? { channel } : {}),
  });
}

/** Kirim link reset password. POST /api/admin/users/{userId}/reset-password-link */
export async function sendResetPasswordLink(userId: string, channel?: 'email'): Promise<void> {
  await adminRequest(`/api/admin/users/${userId}/reset-password-link`, {
    method: 'POST',
    body: JSON.stringify(channel ? { channel } : {}),
  });
}
