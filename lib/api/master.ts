/**
 * API client untuk master data (departemen, posisi, kategori, produk).
 *
 * Semua endpoint di bawah prefix `/api/auth/master` — diproteksi middleware
 * `auth.authservice` (bearer token dari Auth Service), kecuali disebut lain.
 */

import { authenticatedFetch } from './fetch-wrapper';

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

/** Master prioritas (A/B/C) - hanya yang aktif (backend memfilter `is_active`). */
export interface RawPriority {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

/** Master tipe tiket (REQUEST/INCIDENT/...) — hanya yang aktif. */
export interface RawTicketType {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

/** Master aksi handler (RETURN_AND_REPLACE, REPLACE_ONLY, ...). */
export interface RawAction {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
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
  /** Prioritas aktif untuk dropdown & filter - sumber kebenaran, bukan hardcode. */
  priorities: RawPriority[];
  /** Tipe tiket aktif untuk dropdown & filter. */
  ticketTypes: RawTicketType[];
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
  const response = await authenticatedFetch(`/api/master/all?include_inactive=1`, {
    headers: { Accept: 'application/json' },
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
    priorities: arr(item.priorities).map((p) => ({
      id: string(p.id),
      code: string(p.code),
      name: string(p.name),
      sortOrder: number(p.sort_order),
      isActive: p.is_active !== false,
    })),
    ticketTypes: arr(item.ticketTypes).map((t) => ({
      id: string(t.id),
      code: string(t.code),
      name: string(t.name),
      isActive: t.is_active !== false,
    })),
    actions: arr(item.actions).map((a) => ({
      id: string(a.id),
      code: string(a.code),
      name: string(a.name),
      description: a.description ? string(a.description) : null,
      isActive: a.is_active !== false,
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
  // Lewat wrapper: 401 memicu refresh + retry otomatis. Pola lama (fetch
  // manual + Bearer manual) gagal tanpa kesempatan refresh.
  const response = await authenticatedFetch(`/api/admin/master/${type}${id ? `/${id}` : ''}`, {
    method,
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

/** Tipe master yang bisa di-CRUD lewat endpoint admin generik. */
export type MasterDataCrudType =
  | 'category'
  | 'department'
  | 'position'
  | 'action'
  | 'priority'
  | 'ticket_type';

/** Create master data. POST /api/admin/master/{type} */
export async function createMasterData(
  type: MasterDataCrudType,
  payload: CreateMasterDataPayload
): Promise<{ id: string; [key: string]: unknown }> {
  return adminMasterRequest(type, 'POST', undefined, payload);
}

/** Update master data. PUT /api/admin/master/{type}/{id} */
export async function updateMasterData(
  type: MasterDataCrudType,
  id: string,
  payload: CreateMasterDataPayload
): Promise<{ id: string; [key: string]: unknown }> {
  return adminMasterRequest(type, 'PUT', id, payload);
}

/** Delete master data. DELETE /api/admin/master/{type}/{id} */
export async function deleteMasterData(type: MasterDataCrudType, id: string): Promise<void> {
  await adminMasterRequest(type, 'DELETE', id);
}

/** Satu baris mapping kategori → aksi (dengan info aksi untuk editor matriks). */
export interface CategoryActionRow {
  categoryId: string;
  actionId: string;
  isRecommended: boolean;
  action?: { id: string; code: string; name: string; isActive?: boolean };
}

/** Helper: request ke endpoint matriks kategori-aksi (payload bebas, bukan CRUD generik). */
async function categoryActionRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  // Lewat wrapper: 401 memicu refresh + retry otomatis.
  const response = await authenticatedFetch(`/api/admin/master/category-actions${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const msg = string(record(payload).message, 'Operasi gagal.');
    const err = new Error(msg) as Error & { status: number; errors?: ApiErrorResponse['errors'] };
    err.status = response.status;
    err.errors = record(payload).errors as ApiErrorResponse['errors'];
    throw err;
  }

  if (method === 'DELETE') {
    return undefined as T;
  }

  return payload as T;
}

function toCategoryActionRow(value: unknown): CategoryActionRow {
  const row = record(value);
  const action = record(row.action);
  return {
    categoryId: string(row.category_id),
    actionId: string(row.action_id),
    isRecommended: row.is_recommended === true || row.is_recommended === 1,
    action: action.id
      ? {
          id: string(action.id),
          code: string(action.code),
          name: string(action.name),
          isActive: action.is_active !== false,
        }
      : undefined,
  };
}

/** Daftar mapping, opsional disaring per kategori. GET /api/admin/master/category-actions */
export async function getCategoryActions(categoryId?: string): Promise<CategoryActionRow[]> {
  const query = categoryId ? `?category_id=${encodeURIComponent(categoryId)}` : '';
  const payload = await categoryActionRequest<unknown>('GET', query);
  return (Array.isArray(payload) ? payload : []).map(toCategoryActionRow);
}

/** Pasang aksi ke kategori. POST /api/admin/master/category-actions */
export async function attachCategoryAction(
  categoryId: string,
  actionId: string,
  isRecommended = false
): Promise<CategoryActionRow> {
  const payload = await categoryActionRequest<unknown>('POST', '', {
    category_id: Number(categoryId),
    action_id: Number(actionId),
    is_recommended: isRecommended,
  });
  return toCategoryActionRow(payload);
}

/** Ubah flag rekomendasi. PUT /api/admin/master/category-actions/{category}/{action} */
export async function updateCategoryAction(
  categoryId: string,
  actionId: string,
  isRecommended: boolean
): Promise<CategoryActionRow> {
  const payload = await categoryActionRequest<unknown>(
    'PUT',
    `/${encodeURIComponent(categoryId)}/${encodeURIComponent(actionId)}`,
    { is_recommended: isRecommended }
  );
  return toCategoryActionRow(payload);
}

/** Lepas aksi dari kategori. DELETE /api/admin/master/category-actions/{category}/{action} */
export async function detachCategoryAction(categoryId: string, actionId: string): Promise<void> {
  await categoryActionRequest<void>(
    'DELETE',
    `/${encodeURIComponent(categoryId)}/${encodeURIComponent(actionId)}`
  );
}
