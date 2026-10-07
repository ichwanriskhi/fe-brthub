/**
 * API client untuk ringkasan dasbor handler.
 *
 * Backend: `GET /api/auth/handler/summary` (bearer token).
 * Satu request menggantikan empat request `GET /handler/tickets` dengan filter
 * status berbeda.
 *
 * Kenapa tidak pakai `GET /handler/tickets` untuk KPI: `per_page` default-nya 20
 * dan urutannya `latest()`, jadi `data.length` adalah jumlah baris di halaman
 * pertama yang **paling baru** — bukan total antrean.
 */

import { authenticatedFetch } from './fetch-wrapper';
import type { TicketPriority, TicketStatus, TicketType } from '@/lib/types/ticket';

export interface HandlerSummaryKpi {
  /** `IN_PROGRESS` tanpa resolusi pending — benar-benar perlu dikerjakan. */
  need_action: number;
  /** `PENDING_REVIEW` — resolusi sudah diajukan, menunggu approver. */
  waiting_review: number;
  /** `REWORK_REQUIRED` — resolusi ditolak, kembali ke handler. */
  rework: number;
  /** `CLOSED` + `REJECTED`. */
  history: number;
  /** Total entri progres yang pernah ditulis handler ini. */
  progress_count: number;
  /** Total resolusi yang pernah diajukan handler ini. */
  resolutions_submitted: number;
  /** Tiket yang resolusinya pernah ditolak approver. */
  reworked_tickets: number;
  /** Persentase resolusi yang ditolak; `null` belum pernah mengajukan. */
  rework_rate: number | null;
}

/** Baris antrean ringkas — bukan `Ticket` penuh. */
export interface HandlerSummaryTicket {
  ticket_no: string;
  subject: string;
  ticket_type_code: TicketType | null;
  priority_code: TicketPriority | null;
  status_code: TicketStatus | null;
  so_number: string | null;
  created_at: string | null;
  age_days: number;
}

/**
 * Satu baris aktivitas.
 *
 * `ticket_no` wajib ada: versi lama tidak membawanya, sehingga UI hanya
 * menampilkan teks polos "Tiket" berwarna seperti tautan padahal tidak ada data
 * apa pun di belakangnya.
 */
export interface HandlerActivity {
  kind: 'progress' | 'resolution';
  label: string;
  ticket_no: string;
  note: string;
  at: string;
  /** Hanya untuk `kind: 'resolution'`. */
  resolution_no?: number;
}

export interface HandlerSummary {
  kpi: HandlerSummaryKpi;
  /** Tiket paling lama yang perlu tindakan, urut dari server. */
  oldest_need_action: HandlerSummaryTicket[];
  /** Rata-rata jam dari assignment dibuat sampai resolusi diajukan. */
  avg_resolution_hours: number | null;
  resolution_sample: number;
  recent_activity: HandlerActivity[];
  generated_at: string;
}

export async function getHandlerSummary(): Promise<HandlerSummary> {
  const response = await authenticatedFetch('/api/auth/handler/summary', {
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

  return payload as HandlerSummary;
}
