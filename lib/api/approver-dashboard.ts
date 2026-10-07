/**
 * API client untuk ringkasan dasbor approver.
 *
 * Backend: `GET /api/auth/approver/summary` (bearer token).
 * Satu request menggantikan tiga request `GET /approvals` dengan stage berbeda.
 *
 * Kenapa tidak pakai `GET /approvals?stage=…` untuk KPI: `per_page` default-nya
 * 20 dan urutannya `latest()`, jadi `data.length` adalah jumlah baris di halaman
 * pertama yang **paling baru** — bukan total antrean.
 */

import { authenticatedFetch } from './fetch-wrapper';
import type { TicketPriority, TicketType } from '@/lib/types/ticket';

export interface ApproverSummaryKpi {
  /** Tiket menunggu persetujuan awal (`PENDING_APPROVAL`) yang boleh diputuskan Anda. */
  initial_pending: number;
  /** Tiket menunggu persetujuan penutupan (`PENDING_REVIEW`). */
  final_pending: number;
  total_pending: number;
  /** Keputusan `APPROVE` milik Anda sejak awal bulan berjalan. */
  approved_this_month: number;
  /** Keputusan `REJECT` milik Anda sejak awal bulan berjalan. */
  rejected_this_month: number;
}

export type ApprovalStageFlag = 'INITIAL' | 'FINAL';

/** Baris antrean — bukan `Ticket` penuh, karena yang dipakai hanya kolom ringkas. */
export interface ApproverSummaryTicket {
  /** Tahap persetujuan: `INITIAL` atau `FINAL`. */
  stage: ApprovalStageFlag;
  ticket_no: string;
  subject: string;
  ticket_type_code: TicketType | null;
  priority_code: TicketPriority | null;
  reporter_name: string;
  so_number: string | null;
  created_at: string | null;
  /** Umur dalam hari sejak tiket dibuat — dasar pengurutan "paling lama". */
  age_days: number;
}

export interface ApproverSummary {
  kpi: ApproverSummaryKpi;
  /** Gabungan kedua tahap, sudah terurut dari yang tertua. */
  oldest_pending: ApproverSummaryTicket[];
  /** Rata-rata jam dari tiket dibuat sampai Anda memutuskan; `null` bila tanpa sampel. */
  avg_decision_hours: number | null;
  decision_sample: number;
  /** Persetujuan vs penolakan per tahap, sepanjang waktu. */
  by_stage: {
    initial: { approve: number; reject: number };
    final: { approve: number; reject: number };
  };
  month_start: string;
  generated_at: string;
}

export async function getApproverSummary(): Promise<ApproverSummary> {
  const response = await authenticatedFetch('/api/auth/approver/summary', {
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

  return payload as ApproverSummary;
}

/** Path detail sesuai tahap — `INITIAL` ke antrean tiket, `FINAL` ke penutupan. */
export function approvalHref(ticket: ApproverSummaryTicket): string {
  return ticket.stage === 'FINAL'
    ? `/approver/persetujuan-penutupan/${ticket.ticket_no}`
    : `/approver/persetujuan-tiket/${ticket.ticket_no}`;
}
