'use client';

import { DotChip } from '@/components/shared/DotChip';

/**
 * Status keputusan approver atas satu pengajuan resolusi handler.
 *
 * Ditempatkan di satu file agar label + warna tidak berbeda antar halaman —
 * sebelumnya ada 4 perlakuan untuk konsep yang sama: label "Menunggu"
 * vs "Menunggu Persetujuan" vs "Tiket Disetujui", dengan maupun tanpa ikon.
 *
 * Pemisahan pola yang disengaja di seluruh aplikasi:
 * - blok berwarna besar  → status STATE tiket (lihat kartu "Status Resolusi"
 *   di handler & "Resolusi Diajukan" di admin)
 * - chip                → keputusan atas SATU item (chip ini)
 */
export type ResolutionDecision = 'PENDING' | 'APPROVED' | 'REJECTED' | string;

const DECISION_CHIP: Record<string, { label: string; dotClass: string }> = {
  PENDING: { label: 'Menunggu Persetujuan', dotClass: 'bg-amber-500/70' },
  APPROVED: { label: 'Disetujui', dotClass: 'bg-emerald-500/70' },
  REJECTED: { label: 'Ditolak', dotClass: 'bg-destructive/70' },
};

export function resolutionDecisionChip(decision: ResolutionDecision) {
  return (
    DECISION_CHIP[decision] ?? {
      // Nilai di luar peta = data tak dikenal; tampil apa adanya, jangan
      // dipaksa jadi salah satu dari tiga state di atas.
      label: decision || 'Tidak diketahui',
      dotClass: 'bg-muted-foreground/40',
    }
  );
}

export function ResolutionDecisionChip({ decision }: { decision: ResolutionDecision }) {
  const { label, dotClass } = resolutionDecisionChip(decision);
  return <DotChip dotClass={dotClass}>{label}</DotChip>;
}