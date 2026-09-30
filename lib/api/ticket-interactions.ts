import type { TicketChatMessage } from '@/lib/types/ticket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

async function authToken(): Promise<string> {
  if (typeof window === 'undefined') return '';
  const token = localStorage.getItem('brthub_token') || localStorage.getItem('auth_token');
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

/** Bentuk pesan dari backend (TicketInteractionController). */
export interface InteractionPayload {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  sender_name: string;
  sender_role: string;
  is_internal: boolean;
  is_deleted: boolean;
  message: string;
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

function toChatMessage(value: unknown): TicketChatMessage {
  const item = record(value);
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
    canDelete: Boolean(item.can_delete),
  };
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const token = await authToken();
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...options.headers },
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(string(record(payload).message, 'Gagal memuat percakapan tiket.'));
  }

  return payload as T;
}

/**
 * Ambil daftar pesan sebuah tiket.
 *
 * Backend sudah memfilter pesan internal sesuai peran: reporter hanya
 * menerima pesan publik, staf internal & approver menerima semuanya.
 */
export async function getTicketInteractions(ticketId: string): Promise<TicketChatMessage[]> {
  const payload = await request<{ data?: InteractionPayload[] }>(
    `${API_URL}/api/auth/tickets/${encodeURIComponent(ticketId)}/interactions`,
    { method: 'GET' },
  );

  const items = Array.isArray(payload.data) ? payload.data : [];
  return items.map(toChatMessage);
}

/**
 * Kirim pesan baru.
 *
 * `isInternalOnly` hanya berlaku untuk reviewer & handler. Backend memaksa
 * pesan approver/unit/admin menjadi internal dan pesan reporter menjadi
 * publik, jadi flag klien bersifat indikatif.
 */
export async function sendTicketInteraction(
  ticketId: string,
  message: string,
  isInternalOnly = false,
): Promise<TicketChatMessage> {
  const payload = await request<{ data?: InteractionPayload }>(
    `${API_URL}/api/auth/tickets/${encodeURIComponent(ticketId)}/interactions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message, is_internal: isInternalOnly }),
    },
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
