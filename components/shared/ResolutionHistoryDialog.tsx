'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResolutionDecisionChip } from '@/components/shared/ResolutionDecisionChip';
import { AttachmentList } from '@/components/shared/AttachmentList';
import type { ResolutionCycle } from '@/lib/types/ticket';

interface ResolutionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Semua siklus resolusi (urut naik) — yang non-aktif adalah riwayatnya. */
  cycles: ResolutionCycle[];
}

/**
 * Riwayat perbaikan resolusi handler: semua versi yang pernah diajukan
 * beserta status review dan catatan approver per versi.
 *
 * Dipakai halaman approver (penutupan + arsip). Reporter sengaja tidak
 * memakainya: reporter melihat hasil approved, bukan prosesnya.
 */
export function ResolutionHistoryDialog({ open, onOpenChange, cycles }: ResolutionHistoryDialogProps) {
  // Terbaru dulu — yang relevan dengan keputusan ada di atas.
  const ordered = [...cycles].sort((a, b) => b.cycleNumber - a.cycleNumber);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Riwayat Perbaikan Resolusi</DialogTitle>
          <DialogDescription>
            {cycles.length === 0
              ? 'Belum ada resolusi yang diajukan.'
              : `${cycles.length} versi pernah diajukan handler.`}
          </DialogDescription>
        </DialogHeader>

        {ordered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Belum ada resolusi yang diajukan.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l pl-5">
            {ordered.map((cycle) => (
              <li key={cycle.id} className="relative">
                <span className="absolute -left-[25px] top-1 size-2.5 rounded-full bg-primary ring-4 ring-card" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Resolusi #{cycle.cycleNumber}
                  </p>
                  <ResolutionDecisionChip decision={cycle.reviewDecision ?? 'PENDING'} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{cycle.timestamp}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{cycle.summary}</p>
                {cycle.detail && (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {cycle.detail}
                  </p>
                )}
                {/* Catatan hanya bila ditolak: APPROVED tidak punya notes
                    (backend hanya menulis saat REJECT), PENDING belum diputus.
                    Menampilkannya di dua kasus itu berarti memajang teks
                    handler berlabel approver — bug yang baru diperbaiki. */}
                {cycle.reviewDecision === 'REJECTED' && cycle.reviewerNote && (
                  <p className="mt-1.5 rounded-lg bg-muted/50 p-2 text-xs leading-relaxed text-foreground">
                    <span className="font-medium">Catatan approver: </span>
                    {cycle.reviewerNote}
                  </p>
                )}
                {cycle.attachments && cycle.attachments.length > 0 && (
                  <AttachmentList items={cycle.attachments} size="xs" className="mt-2" />
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
