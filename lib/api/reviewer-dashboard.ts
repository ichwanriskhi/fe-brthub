/**
 * API client untuk ringkasan dasbor reviewer.
 *
 * Backend: `GET /api/auth/reviewer/summary` (bearer token + role reviewer).
 * Satu request menggantikan enam request `GET /tickets` dengan filter berbeda
 * (empat di antaranya `per_page=1` hanya untuk mengambil angka `total`).
 *
 * Catatan: `oldest_open` diurutkan `tickets.created_at` di server dan
 * `recent_reviews` diurutkan `review_logs.reviewed_at`. Keduanya disengaja:
 * menyortir ulang di klien hanya memberi hasil dari sampel 100 tiket, sehingga
 * tiket OPEN yang tertua bisa hilang begitu saja.
 */

import { authenticatedFetch } from './fetch-wrapper';
import type { TicketStatus, TicketType } from '@/lib/types/ticket';

export interface ReviewerSummaryKpi {
  /**
   * Tiket berstatus OPEN — sama dengan isi antrean `/reviewer/tinjauan-awal`.
   *
   * `REWORK_REQUIRED` tidak ikut dihitung di sini: status itu muncul saat
   * approver menolak pada tahap penutupan dan tiketnya kembali ke
   * unit/handler, bukan ke antrean reviewer.
   */
  open: number;
  /** Tiket berstatus PENDING_APPROVAL. */
  waiting_approval: number;
  /** Log INITIAL milik reviewer ini sejak awal bulan, semua keputusan. */
  reviewed_this_month: number;
  /** Diteruskan bulan ini dan masih menunggu approval. */
  forwarded_waiting: number;
  /** Decision REJECT pada log INITIAL milik reviewer ini, sepanjang waktu. */
  rejected_by_me: number;
  /** Decision ROUTE milik reviewer ini, sepanjang waktu. */
  routed_total: number;
}

/** Bentuk baris tiket ringkas — bukan `Ticket` penuh. */
export interface ReviewerSummaryTicket {
  id: number;
  ticket_no: string;
  subject: string;
  ticket_type_code: TicketType | null;
  status_code: TicketStatus | null;
  reporter_name: string;
  so_number: string | null;
  created_at: string | null;
  /** Umur dalam hari sejak tiket dibuat. */
  age_days: number;
  /** Hanya pada `recent_reviews` — kapan reviewer meninjaunya. */
  reviewed_at?: string;
}

export interface ReviewerSummary {
  kpi: ReviewerSummaryKpi;
  /** Rata-rata jam dari tiket dibuat sampai ditinjau; `null` bila tanpa sampel. */
  avg_review_hours: number | null;
  review_sample: number;
  oldest_open: ReviewerSummaryTicket[];
  recent_reviews: ReviewerSummaryTicket[];
  generated_at: string;
}

export async function getReviewerSummary(): Promise<ReviewerSummary> {
  const response = await authenticatedFetch('/api/auth/reviewer/summary', {
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

  return payload as ReviewerSummary;
}

/** `status_code` dari server, dengan fallback supaya UI tidak ikut pecah. */
export function toTicketStatus(code: string | null | undefined): TicketStatus {
  return (code ?? 'OPEN') as TicketStatus;
}

/** `ticket_type_code` dari server, dengan fallback yang sama. */
export function toTicketType(code: string | null | undefined): TicketType {
  return (code ?? 'REQUEST') as TicketType;
}
