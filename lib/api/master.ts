/**
 * API client untuk master data (departemen, posisi, kategori, produk).
 *
 * Semua endpoint di bawah prefix `/api/auth/master` — diproteksi middleware
 * `auth.authservice` (bearer token dari Auth Service), kecuali disebut lain.
 */

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

function number(value: unknown): number {
  return typeof value === 'number' ? value : Number(value) || 0;
}

/** Bentuk mentah satu baris kategori dari backend. */
export interface RawCategory {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

/** Bentuk mentah satu baris departemen dari backend. */
export interface RawDepartment {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Bentuk mentah satu baris posisi dari backend. */
export interface RawPosition {
  id: string;
  departmentId: string | null;
  code: string;
  name: string;
  hierarchyLevel: number;
  isActive: boolean;
}

/** Bentuk mentah satu baris produk dari backend. */
export interface RawProduct {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

/** Master aksi handler (RETURN_AND_REPLACE, REPLACE_ONLY, ...). */
export interface RawAction {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

/** Mapping kategori → aksi, termasuk flag rekomendasi per subkategori. */
export interface RawCategoryAction {
  categoryId: string;
  actionId: string;
  isRecommended: boolean;
}

export interface MasterDataAll {
  categories: RawCategory[];
  departments: RawDepartment[];
  positions: RawPosition[];
  products: RawProduct[];
  /** Master aksi handler (tabel `actions`) — sumber kebenaran label & opsi. */
  actions: RawAction[];
  /** Matrix kategori × aksi (tabel `category_actions`) + flag rekomendasi. */
  categoryActions: RawCategoryAction[];
}

/**
 * Ambil seluruh master data sekaligus.
 * Backend: `GET /api/master/all?include_inactive=1` (public — admin butuh
 * melihat data nonaktif juga, bukan hanya yang aktif).
 */
export async function getMasterDataAll(): Promise<MasterDataAll> {
  const token = await authToken();
  const response = await fetch(`${API_URL}/api/master/all?include_inactive=1`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(string(record(payload).message, 'Gagal memuat master data.'));
  }

  const item = record(payload);

  const arr = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? value.map(record) : [];

  return {
    categories: arr(item.raw_categories).map((c) => ({
      id: string(c.id),
      parentId: c.parent_category_id ? string(c.parent_category_id) : null,
      code: string(c.code),
      name: string(c.name),
      description: c.description ? string(c.description) : null,
      isActive: c.is_active !== false,
    })),
    departments: arr(item.departments).map((d) => ({
      id: string(d.id),
      code: string(d.code),
      name: string(d.name),
      description: d.description ? string(d.description) : null,
      sortOrder: number(d.sort_order),
      isActive: d.is_active !== false,
    })),
    positions: arr(item.positions).map((p) => ({
      id: string(p.id),
      departmentId: p.department_id ? string(p.department_id) : null,
      code: string(p.code),
      name: string(p.name),
      hierarchyLevel: number(p.hierarchy_level),
      isActive: p.is_active !== false,
    })),
    products: arr(item.products).map((p) => ({
      id: string(p.id),
      code: string(p.code),
      name: string(p.name),
      description: p.description ? string(p.description) : null,
      isActive: p.is_active !== false,
    })),
    actions: arr(item.actions).map((a) => ({
      id: string(a.id),
      code: string(a.code),
      name: string(a.name),
      description: a.description ? string(a.description) : null,
    })),
    categoryActions: arr(item.category_actions).map((ca) => ({
      categoryId: string(ca.category_id),
      actionId: string(ca.action_id),
      isRecommended: ca.is_recommended === true || ca.is_recommended === 1,
    })),
  };
}

/** Payload untuk create/update master data. */
export interface CreateMasterDataPayload {
  name: string;
  code: string;
  isActive: boolean;
  description?: string | null;
  parentCategoryId?: string | null;
  sortOrder?: number;
  departmentId?: string;
  hierarchyLevel?: number;
}

function optionalId(value: string | null | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Ubah payload FE (camelCase) ke kolom yang divalidasi backend (snake_case). */
function toBackendPayload(payload: CreateMasterDataPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: payload.name,
    code: payload.code,
    is_active: payload.isActive,
  };

  if (payload.description !== undefined) {
    body.description = payload.description || null;
  }
  if (payload.parentCategoryId !== undefined) {
    body.parent_category_id = optionalId(payload.parentCategoryId);
  }
  if (payload.sortOrder !== undefined) {
    body.sort_order = payload.sortOrder;
  }
  if (payload.departmentId !== undefined) {
    body.department_id = optionalId(payload.departmentId);
  }
  if (payload.hierarchyLevel !== undefined) {
    body.hierarchy_level = payload.hierarchyLevel;
  }

  return body;
}

/** Response error terstruktur dari backend. */
export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

/** Helper: request terautentikasi ke endpoint admin master. */
async function adminMasterRequest<T>(
  type: string,
  method: 'POST' | 'PUT' | 'DELETE',
  id?: string,
  body?: CreateMasterDataPayload
): Promise<T> {
  const token = await authToken();
  const url = `${API_URL}/api/admin/master/${type}${id ? `/${id}` : ''}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(toBackendPayload(body)) : undefined,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const msg = string(record(payload).message, 'Operasi gagal.');
    const err = new Error(msg) as Error & { status: number; errors?: ApiErrorResponse['errors'] };
    err.status = response.status;
    err.errors = record(payload).errors as ApiErrorResponse['errors'];
    throw err;
  }

  if (method === 'DELETE' && response.status === 204) {
    return undefined as T;
  }

  return payload as T;
}

/** Create master data. POST /api/admin/master/{type} */
export async function createMasterData(
  type: 'category' | 'department' | 'position' | 'product',
  payload: CreateMasterDataPayload
): Promise<{ id: string; [key: string]: unknown }> {
  return adminMasterRequest(type, 'POST', undefined, payload);
}

/** Update master data. PUT /api/admin/master/{type}/{id} */
export async function updateMasterData(
  type: 'category' | 'department' | 'position' | 'product',
  id: string,
  payload: CreateMasterDataPayload
): Promise<{ id: string; [key: string]: unknown }> {
  return adminMasterRequest(type, 'PUT', id, payload);
}

/** Delete master data. DELETE /api/admin/master/{type}/{id} */
export async function deleteMasterData(
  type: 'category' | 'department' | 'position' | 'product',
  id: string
): Promise<void> {
  await adminMasterRequest(type, 'DELETE', id);
}
