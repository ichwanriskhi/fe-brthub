'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { decideApproval } from '@/lib/api/tickets';
import type { Ticket } from '@/lib/types/ticket';
import { toast } from 'sonner';

type DecidableStage = 'INITIAL' | 'FINAL';

/** Batas `rejection_reason` di backend: `max:2000`. */
const REASON_MAX = 2000;

interface QuickApprovalDecisionOptions {
  stage: DecidableStage;
  /** Dipanggil setelah keputusan berhasil tersimpan — pemanggil memuat ulang daftar. */
  onSuccess: () => void;
}

/**
 * Aksi cepat approve / reject langsung dari tabel antrean.
 *
 * Kenapa reject tidak bisa sekali-klik: `ApprovalController` mewajibkan
 * `rejection_reason` saat `decision=REJECT` (`required_if`), jadi tombol yang
 * langsung mengirim akan selalu ditolak 422 — persis di aksi yang paling butuh
 * alasan. Karena itu approve dan reject sama-sama lewat konfirmasi, hanya
 * reject yang dialognya menambah textarea.
 *
 * `decidingId` hanya berisi satu id supaya tombol baris lain tetap aktif —
 * disable semuanya akan mematikan seluruh tabel saat satu request berjalan.
 */
export function useQuickApprovalDecision({ stage, onSuccess }: QuickApprovalDecisionOptions) {
  const isFinal = stage === 'FINAL';

  const [approveTarget, setApproveTarget] = useState<Ticket | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Ticket | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const closeReject = () => {
    setRejectTarget(null);
    setReason('');
  };

  const send = async (ticket: Ticket, decision: 'APPROVE' | 'REJECT', rejectionReason?: string) => {
    setSubmitting(true);
    try {
      await decideApproval(ticket.id, {
        decision,
        stage,
        ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
      });
      toast.success(
        decision === 'APPROVE'
          ? isFinal
            ? 'Penutupan tiket disetujui. Tiket telah selesai.'
            : 'Tiket disetujui dan diteruskan ke unit untuk ditindaklanjuti.'
          : isFinal
            ? 'Resolusi ditolak, tiket dikembalikan ke handler.'
            : 'Tiket ditolak.',
      );
      setApproveTarget(null);
      closeReject();
      onSuccess();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Gagal memproses persetujuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const trimReason = reason.trim();
  const reasonTooLong = trimReason.length > REASON_MAX;

  return {
    /** ID tiket yang sedang dikirim, atau null. */
    decidingId: submitting ? (approveTarget?.id ?? rejectTarget?.id ?? null) : null,

    /** Dipasang di `onDecide` kolom aksi tabel. */
    request: (ticket: Ticket, decision: 'APPROVE' | 'REJECT') => {
      if (decision === 'APPROVE') setApproveTarget(ticket);
      else {
        setReason('');
        setRejectTarget(ticket);
      }
    },

    /** Dialog approve (konfirmasi) + dialog reject (konfirmasi + alasan). */
    dialogs: (
      <>
        <ConfirmDialog
          open={approveTarget !== null}
          onOpenChange={(open) => {
            if (!open && !submitting) setApproveTarget(null);
          }}
          title="Setujui tiket ini?"
          description={
            approveTarget
              ? `${approveTarget.id} — ${
                  isFinal
                    ? 'tiket akan ditandai selesai.'
                    : 'tiket diteruskan ke unit untuk ditindaklanjuti.'
                }`
              : undefined
          }
          icon={<HelpCircle className="text-primary" />}
          confirmLabel="Ya, Setujui"
          loading={submitting}
          onConfirm={() => approveTarget && send(approveTarget, 'APPROVE')}
        />

        <Dialog
          open={rejectTarget !== null}
          onOpenChange={(open) => {
            if (!open && !submitting) closeReject();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <X className="text-destructive" />
                Tolak tiket ini?
              </DialogTitle>
              <DialogDescription>
                {rejectTarget
                  ? `${rejectTarget.id} — ${
                      isFinal
                        ? 'resolusi ditolak dan tiket dikembalikan ke handler untuk direvisi.'
                        : 'tiket ditolak dan tidak diteruskan ke unit.'
                    }`
                  : undefined}
              </DialogDescription>
            </DialogHeader>

            <Field>
              <FieldLabel>Alasan Penolakan</FieldLabel>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  isFinal
                    ? 'Jelaskan mengapa resolusi handler ditolak, tiket akan dikembalikan ke handler.'
                    : 'Jelaskan mengapa tiket ini ditolak.'
                }
                className="min-h-24"
                disabled={submitting}
                aria-invalid={reasonTooLong || undefined}
              />
              <FieldDescription>
                <span className="flex items-center justify-between gap-2">
                  <span>
                    Wajib diisi. {trimReason.length}/{REASON_MAX}
                  </span>
                  {reasonTooLong && <span className="text-destructive">Melebihi batas.</span>}
                </span>
              </FieldDescription>
            </Field>

            <DialogFooter>
              <Button variant="outline" onClick={closeReject} disabled={submitting}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectTarget && send(rejectTarget, 'REJECT', trimReason)}
                disabled={submitting || !trimReason || reasonTooLong}
              >
                {submitting ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <X data-icon="inline-start" />
                )}
                Ya, Tolak
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    ),
  };
}