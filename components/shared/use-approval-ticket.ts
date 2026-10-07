'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyTicket, decideApproval } from '@/lib/api/tickets';
import type { Ticket } from '@/lib/types/ticket';
import { toast } from 'sonner';

type ApprovalStage = 'INITIAL' | 'FINAL';

interface UseApprovalTicketOptions {
  /** Ticket id dari params halaman */
  id: string;
  /** Tahap persetujuan — menentukan pesan toast & payload `decide` */
  stage: ApprovalStage;
  /** Path kembali ke halaman list setelah keputusan tersimpan */
  backHref: string;
}

/**
 * Logika bersama halaman persetujuan approver: muat tiket, kirim keputusan,
 * dan state alur tolak (form alasan → dialog konfirmasi).
 *
 * Diekstrak dari `ApprovalDetail` saat halaman persetujuan penutupan dibuat
 * fokus (file terpisah): fetch + decide identik, yang beda hanya komposisi
 * layout. Satu hook, dua layout — bukan duplikasi, bukan kondisional.
 */
export function useApprovalTicket({ id, stage, backHref }: UseApprovalTicketOptions) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMyTicket(id)
      .then((data) => {
        if (cancelled) return;
        setTicket(data);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Gagal memuat detail tiket.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const isFinal = stage === 'FINAL';

  const handleApprove = async () => {
    if (!ticket) return;
    setSubmitting(true);
    try {
      await decideApproval(id, { decision: 'APPROVE', stage });
      toast.success(
        isFinal
          ? 'Penutupan tiket disetujui. Tiket telah selesai.'
          : 'Tiket disetujui dan diteruskan ke unit untuk ditindak lanjuti.',
      );
      setTimeout(() => router.push(backHref), 1500);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Gagal memproses persetujuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!ticket) return;
    if (!rejectionReason.trim()) {
      toast.error('Alasan penolakan wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      await decideApproval(id, { decision: 'REJECT', stage, rejection_reason: rejectionReason.trim() });
      toast.success(
        isFinal
          ? 'Resolusi ditolak, tiket dikembalikan ke handler untuk diperbaiki.'
          : 'Tiket ditolak.',
      );
      setTimeout(() => router.push(backHref), 1500);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Gagal memproses penolakan.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    ticket,
    isLoading,
    loadError,
    isFinal,
    chatOpen,
    setChatOpen,
    submitting,
    rejectionReason,
    setRejectionReason,
    showRejectForm,
    setShowRejectForm,
    confirmAction,
    setConfirmAction,
    handleApprove,
    handleReject,
  };
}
