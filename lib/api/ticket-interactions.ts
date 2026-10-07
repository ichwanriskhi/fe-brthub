import type { TicketChatAttachment, TicketChatMessage } from '@/lib/types/ticket';
import { authenticatedFetch } from './fetch-wrapper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;
}

/** Bentuk pesan dari backend (TicketInteractionController). */
export interface InteractionAttachmentPayload {
  id: string;
  name: string;
  size: string;
  mime_type: string;
  url: string;
}

/** Bentuk pesan dari backend (TicketInteractionController). */
export interface InteractionPayload {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  sender_name: string;
  sender_role: string;
  is_internal: boolean;
  is_ticket_reporter?: boolean;
  is_deleted: boolean;
  message: string;
  attachments?: InteractionAttachmentPayload[];
  created_at: string | null;
  can_delete: boolean;
}

/** Format timestamp backend → "26 Sep 2026, 09.15" (id-ID). */
function formatTimestamp(value: unknown): string {
  const raw = string(value);
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toChatAttachment(value: unknown): TicketChatAttachment {
  const item = record(value);
  return {
    id: string(item.id),
    name: string(item.name, string(item.file_name)),
    // Backend mengirim `size` sebagai byte mentah string; pemformatannya ke
    // manusia dilakukan `AttachmentList` (`normalizeSize`).
    size: string(item.size),
    // `type` harus MIME penuh (`image/png`), bukan `'image'`: `AttachmentList`
    // menentukannya lewat `type.startsWith('image/')` dan `isPreviewable`.
    type: string(item.mime_type, string(item.type)),
    url: string(item.url),
  };
}

function toChatMessage(value: unknown): TicketChatMessage {
  const item = record(value);
  const attachments = Array.isArray(item.attachments) ? item.attachments : [];
  return {
    id: string(item.id),
    ticketId: string(item.ticket_id),
    senderUserId: string(item.sender_user_id),
    senderName: string(item.sender_name, 'Pengguna'),
    senderRole: string(item.sender_role),
    message: string(item.message),
    timestamp: formatTimestamp(item.created_at),
    isInternalOnly: Boolean(item.is_internal),
    isDeleted: Boolean(item.is_deleted),
    isTicketReporter: Boolean(item.is_ticket_reporter),
    canDelete: Boolean(item.can_delete),
    attachments: attachments.length > 0 ? attachments.map(toChatAttachment) : undefined,
  };
}

/**
 * Pesan error dari respons Laravel.
 *
 * Validasi file (ukuran, tipe) Returning 422 dengan `errors`, sementara
 * `message`-nya generik ("The attachments.0 field must be a file of type...").
 * Karena itu pesan per-field ikut dikembalikan agar user tahu berkas mana
 * yang ditolak dan kenapa.
 */
function errorMessage(payload: unknown, fallback: string): string {
  const body = record(payload);
  const errors = record(body.errors);
  const firstError = Array.isArray(errors) ? string(errors[0]) : '';
  for (const value of Object.values(errors)) {
    const candidate = Array.isArray(value) ? string(value[0]) : '';
    if (candidate) return candidate;
  }
  return string(body.message, firstError || fallback);
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const response = await authenticatedFetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...options.headers },
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(errorMessage(payload, 'Gagal memuat percakapan tiket.'));
  }

  return payload as T;
}

/**
 * Permukaan pemanggil.
 *
 * - `staff`    — portal staf (default)
 * - `reporter` — portal pelapor: tampilan pelanggan, hanya pesan publik
 *
 * Penanda ini dikirim karena kedua portal memakai token yang sama sehingga
 * backend tidak bisa membedakannya sendiri. Sifatnya monoton — hanya mengurangi
 * yang terlihat — sehingga tidak bisa dipakai untuk mendapat akses tambahan.
 */
export type ChatSurface = 'staff' | 'reporter';

/**
 * Ambil daftar pesan sebuah tiket.
 *
 * Backend memfilter pesan internal sesuai peran dan permukaan pemanggil:
 * portal pelapor selalu hanya menerima pesan publik, staf internal & approver
 * pada portal staf menerima semuanya.
 */
export async function getTicketInteractions(
  ticketId: string,
  surface: ChatSurface = 'staff',
): Promise<TicketChatMessage[]> {
  const query = surface === 'reporter' ? '?surface=reporter' : '';
  const payload = await request<{ data?: InteractionPayload[] }>(
    `${API_URL}/api/auth/tickets/${encodeURIComponent(ticketId)}/interactions${query}`,
    { method: 'GET' },
  );

  const items = Array.isArray(payload.data) ? payload.data : [];
  return items.map(toChatMessage);
}

/**
 * Kirim pesan baru, dengan lampiran opsional.
 *
 * `isInternalOnly` hanya berlaku untuk reviewer & handler di portal staf.
 * Backend memaksa pesan approver/unit/admin menjadi internal, pesan pelapor
 * menjadi publik, dan di portal pelapor `is_internal` diabaikan total —
 * jadi flag klien bersifat indikatif, bukan otoritatif.
 *
 * Ada lampiran → body `FormData`. `Content-Type` sengaja tidak di-set manual:
 * `authenticatedFetch` sudah melewatkannya untuk body `FormData` dan browser
 * yang harus menambahkan `boundary`.
 */
export async function sendTicketInteraction(
  ticketId: string,
  message: string,
  isInternalOnly = false,
  attachments: File[] = [],
  surface: ChatSurface = 'staff',
): Promise<TicketChatMessage> {
  const form = new FormData();
  form.append('content', message);
  form.append('is_internal', isInternalOnly ? '1' : '0');
  if (surface === 'reporter') {
    form.append('surface', 'reporter');
  }
  attachments.forEach((file) => form.append('attachments[]', file));

  const payload = await request<{ data?: InteractionPayload }>(
    `${API_URL}/api/auth/tickets/${encodeURIComponent(ticketId)}/interactions`,
    { method: 'POST', body: form },
  );

  return toChatMessage(record(payload).data);
}

/** Hapus (soft delete) pesan. */
export async function deleteTicketInteraction(ticketId: string, messageId: string): Promise<void> {
  await request(
    `${API_URL}/api/auth/tickets/${encodeURIComponent(ticketId)}/interactions/${encodeURIComponent(messageId)}`,
    { method: 'DELETE' },
  );
}
