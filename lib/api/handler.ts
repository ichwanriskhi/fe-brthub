import { toTicket } from '@/lib/api/tickets';
import type { Ticket, TicketAttachment } from '@/lib/types/ticket';

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

/** Status tiket yang sudah dinormalisasi dari respons backend */
export type HandlerTicketStatus = 'NEED_ACTION' | 'WAITING_REVIEW' | 'REWORK' | 'HISTORY';

export interface HandlerListResult {
  data: Ticket[];
  total: number;
  currentPage: number;
  lastPage: number;
}

export interface HandlerProgressEntry {
  id: string;
  note: string;
  timestamp: string;
  actorName?: string;
  attachments: TicketAttachment[];
}

export interface HandlerResolution {
  id: string;
  resolutionNo: number;
  summary: string;
  detail: string;
  submittedAt: string;
  reviewDecision: 'PENDING' | 'APPROVED' | 'REJECTED';
  attachments?: TicketAttachment[];
}

/**
 * Normalisasi 1 tiket dari respons backend (HandlerController::index / show).
 *
 * `toTicket` di lib/api/tickets.ts dipakai untuk pola reviewer/approver;
 * handler punya field tambahan (handler_progress, resolutions) yang tidak
 * ada di situ, jadi normalisasi dilakukan di sini.
 */
export function toHandlerTicket(value: unknown): Ticket {
  // Normalisasi field umum lewat toTicket (category, status, priority,
  // reporterName, customerData, dst. jadi bentuk yang dipakai FE). Field
  // khusus handler dilapis di atasnya.
  const base = toTicket(value);
  const item = record(value);

  // backend mengirim handler_progress terpisah (bukan relasi eloquent biasa)
  const progress = Array.isArray(item.handler_progress) ? item.handler_progress : [];
  base.handlerProgress = progress.map((p): HandlerProgressEntry => {
    const row = record(p);
    const atts = Array.isArray(row.attachments) ? row.attachments : [];
    return {
      id: string(row.id),
      note: string(row.note),
      timestamp: string(row.created_at, string(row.submitted_at)),
      actorName: string(record(row.actor).full_name) || undefined,
      attachments: atts.map((a): TicketAttachment => {
        const att = record(a);
        return {
          id: string(att.id),
          name: string(att.file_name),
          url: string(att.url),
          type: string(att.mime_type),
          size: string(att.file_size),
        };
      }),
    };
  });

  const resolutions = Array.isArray(item.resolutions) ? item.resolutions : [];
  base.resolutions = resolutions
    .map((r): HandlerResolution => {
      const row = record(r);
      const atts = Array.isArray(row.attachments) ? row.attachments : [];
      return {
        id: string(row.id),
        resolutionNo: Number(row.resolution_no) || 1,
        summary: string(row.summary),
        detail: string(row.detail),
        submittedAt: string(row.submitted_at),
        reviewDecision:
          string(row.review_decision).toUpperCase() === 'APPROVED'
            ? 'APPROVED'
            : string(row.review_decision).toUpperCase() === 'REJECTED'
              ? 'REJECTED'
              : 'PENDING',
        attachments: atts.map((a): TicketAttachment => {
          const att = record(a);
          return {
            id: string(att.id),
            name: string(att.file_name),
            url: string(att.url),
            type: string(att.mime_type),
            size: string(att.file_size),
          };
        }),
      };
    })
    .sort((a, b) => b.resolutionNo - a.resolutionNo);

  // handler assignment aktif → nama handler
  const assignments = Array.isArray(item.assignments) ? item.assignments.map(record) : [];
  const handlerAssignment = assignments.find(
    (a) => string(a.assignment_type) === 'HANDLER' && a.is_active !== false,
  );
  if (handlerAssignment) {
    const assignedTo = record(handlerAssignment.assigned_to_employee ?? handlerAssignment.assignedToEmployee);
    // Nama ada di relasi user, bukan di employee_profile langsung.
    base.handlerName = string(record(assignedTo.user).full_name) || undefined;
  }

  // Simpan assignment handler untuk halaman unit (riwayat penugasan)
  base.handlerAssignments = assignments
    .filter((a) => string(a.assignment_type) === 'HANDLER')
    .map((a) => {
      const to = record(a.assigned_to_employee ?? a.assignedToEmployee);
      const by = record(a.assigned_by_employee ?? a.assignedByEmployee);
      return {
        id: string(a.id),
        handlerName: string(record(to.user).full_name) || undefined,
        assignedByName: string(record(by.user).full_name) || undefined,
        assignedAt: string(a.assigned_at),
        isActive: a.is_active !== false,
      };
    });

  return base;
}

function responseItems(payload: unknown): unknown[] {
  const body = record(payload);
  if (Array.isArray(body.data)) return body.data;
  const nested = record(body.data);
  return Array.isArray(nested.data) ? nested.data : [];
}

function pageMeta(payload: unknown): { total: number; currentPage: number; lastPage: number } {
  const body = record(payload);
  const source = Array.isArray(body.data) ? body : record(body.data);
  return {
    total: Number(source.total) || 0,
    currentPage: Number(source.current_page) || 1,
    lastPage: Number(source.last_page) || 1,
  };
}

/** Daftar tiket handler yang sedang login, per kelompok status. */
export async function getHandlerTickets(
  status: HandlerTicketStatus,
  page = 1,
): Promise<HandlerListResult> {
  const token = await authToken();
  const response = await fetch(
    `${API_URL}/api/auth/handler/tickets?status=${status}&page=${page}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      string(record(payload).message, 'Gagal memuat daftar tiket handler.'),
    );
  }

  const data = responseItems(payload).map(toHandlerTicket);
  const meta = pageMeta(payload);

  return { data, ...meta };
}

/** Detail tiket handler (data lengkap + progres + resolusi). */
export async function getHandlerTicket(ticketId: string): Promise<Ticket> {
  const token = await authToken();
  const response = await fetch(
    `${API_URL}/api/auth/handler/tickets/${encodeURIComponent(ticketId)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      string(record(payload).message, 'Gagal memuat detail tiket handler.'),
    );
  }

  return toHandlerTicket(record(payload).data || payload);
}

/** Catat progres pengerjaan (terlihat oleh reporter). */
export async function submitHandlerProgress(
  ticketId: string,
  note: string,
  attachments: File[] = [],
): Promise<void> {
  const token = await authToken();

  // multipart/form-data agar bisa membawa file. Jangan set Content-Type
  // secara manual — biarkan browser menentukan boundary-nya.
  const form = new FormData();
  form.append('note', note);
  attachments.forEach((file) => form.append('attachments[]', file));

  const response = await fetch(
    `${API_URL}/api/auth/handler/tickets/${encodeURIComponent(ticketId)}/progress`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: form,
    },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(string(record(payload).message, 'Gagal menyimpan progres pengerjaan.'));
  }
}

/** Submit resolusi — pengajuan penutupan tiket. */
export async function submitHandlerResolution(
  ticketId: string,
  payload: { summary: string; detail: string },
  attachments: File[] = [],
): Promise<void> {
  const token = await authToken();

  // multipart/form-data agar bisa membawa file. Jangan set Content-Type
  // secara manual — biarkan browser menentukan boundary-nya.
  const form = new FormData();
  form.append('summary', payload.summary);
  form.append('detail', payload.detail);
  attachments.forEach((file) => form.append('attachments[]', file));

  const response = await fetch(
    `${API_URL}/api/auth/handler/tickets/${encodeURIComponent(ticketId)}/resolution`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: form,
    },
  );
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(string(record(body).message, 'Gagal mengajukan resolusi.'));
  }
}

// ─── Unit Teknis ──────────────────────────────────────────────────────────────

export interface UnitEmployee {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  department_id: string;
  position_name: string | null;
}

/**
 * Daftar pegawai untuk dropdown assign handler.
 *
 * @param departmentId Batasi ke departemen tertentu (departemen tujuan tiket).
 * @param role          Batasi ke pegawai dengan role tertentu (mis. 'handler').
 */
export async function getUnitEmployees(
  departmentId?: string,
  role = 'handler',
): Promise<UnitEmployee[]> {
  const params = new URLSearchParams();
  if (departmentId) params.set('department_id', departmentId);
  if (role) params.set('role', role);

  const url = `${API_URL}/api/master/employees${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(string(record(payload).message, 'Gagal memuat daftar pegawai.'));
  }

  const list = Array.isArray(payload) ? payload : [];
  return list.map((e): UnitEmployee => {
    const row = record(e);
    return {
      id: string(row.id),
      full_name: string(row.full_name),
      email: string(row.email) || null,
      phone_number: string(row.phone_number) || null,
      department_id: string(row.department_id),
      position_name: string(row.position_name) || null,
    };
  });
}

/** Antrean tiket unit (IN_PROGRESS, sudah diterima departemen ini). */
export async function getUnitTickets(page = 1): Promise<HandlerListResult> {
  const token = await authToken();
  const response = await fetch(
    `${API_URL}/api/auth/unit/tickets?page=${page}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(string(record(payload).message, 'Gagal memuat antrean unit.'));
  }

  const data = responseItems(payload).map(toHandlerTicket);
  const meta = pageMeta(payload);

  return { data, ...meta };
}

/**
 * Detail tiket di halaman unit (data tiket + assignment untuk riwayat handler).
 */
export async function getUnitTicket(ticketId: string): Promise<Ticket> {
  const token = await authToken();
  const response = await fetch(
    `${API_URL}/api/auth/unit/tickets/${encodeURIComponent(ticketId)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(string(record(payload).message, 'Gagal memuat detail tiket unit.'));
  }

  return toHandlerTicket(record(payload).data || payload);
}

/**
 * Riwayat penugasan unit ini — semua tiket yang assignment UNIT-nya menunjuk
 * departemen pegawai yang login (tidak peduli status tiket saat ini).
 */
export async function getUnitHistory(page = 1): Promise<HandlerListResult> {
  const token = await authToken();
  const response = await fetch(
    `${API_URL}/api/auth/unit/tickets/history?page=${page}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(string(record(payload).message, 'Gagal memuat riwayat penugasan.'));
  }

  const data = responseItems(payload).map(toHandlerTicket);
  const meta = pageMeta(payload);

  return { data, ...meta };
}

/** Assign handler ke tiket (dipilih oleh unit). */
export async function assignHandler(
  ticketId: string,
  employeeId: string,
): Promise<void> {
  const token = await authToken();
  const response = await fetch(
    `${API_URL}/api/auth/unit/tickets/${encodeURIComponent(ticketId)}/assign-handler`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId }),
    },
  );
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(string(record(body).message, 'Gagal menugaskan handler.'));
  }
}
