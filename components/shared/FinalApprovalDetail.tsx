'use client';

import { useState } from 'react';
import { HANDLER_ACTIONS } from '@/lib/constants/reviewer';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { AttachmentList } from '@/components/shared/AttachmentList';
import { TicketHeader } from '@/components/shared/TicketHeader';
import { DetailList } from '@/components/shared/DetailList';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ReportDetailModal } from '@/components/shared/ReportDetailModal';
import { ResolutionHistoryDialog } from '@/components/shared/ResolutionHistoryDialog';
import { useApprovalTicket } from '@/components/shared/use-approval-ticket';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Field, FieldLabel } from '@/components/ui/field';
import { CheckCircle2, XCircle, AlertCircle, Info, FileText, History } from 'lucide-react';

interface FinalApprovalDetailProps {
  /** Ticket id dari params halaman */
  id: string;
  /** Path kembali ke halaman list */
  backHref: string;
}

/**
 * Halaman persetujuan penutupan yang fokus: approver menilai kerja handler,
 * bukan membaca ulang laporan.
 *
 * Kolom kiri hanya berisi tiga blok yang dinilai — aksi yang diminta,
 * resolusi yang diajukan, dan progres pengerjaan. Detail tiket (pelapor,
 * laporan, klaim, lampiran) pindah ke modal "Detail Laporan" di header,
 * mengikuti pola halaman handler. Timeline dan atribut routing (Tujuan
 * Eskalasi, Unit Tujuan, Prioritas) sengaja tidak ada di sini: routing sudah
 * settled sejak persetujuan awal, dan riwayat lengkap tetap tersedia di
 * halaman arsip (`ApprovalDetail` mode read-only).
 *
 * Logika muat + putus dibagi dengan `ApprovalDetail` lewat
 * `useApprovalTicket` — file ini hanya komposisi layout.
 */
export function FinalApprovalDetail({ id, backHref }: FinalApprovalDetailProps) {
  const {
    ticket,
    isLoading,
    loadError,
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
  } = useApprovalTicket({ id, stage: 'FINAL', backHref });

  const [reportOpen, setReportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (isLoading || !ticket) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {isLoading ? 'Memuat detail tiket…' : loadError ?? 'Tiket tidak ditemukan.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Handler sudah mengajukan resolusi — menentukan apakah ada sesuatu yang
   * bisa disetujui/ditolak.
   */
  const hasSubmittedResolution = Boolean(
    ticket.resolutionCycles && ticket.resolutionCycles.length > 0,
  );

  // Nama aksi dari API; konstanta statis hanya fallback bila kosong.
  const fallbackAction = ticket.handlerActionId
    ? HANDLER_ACTIONS.find((a) => a.id === ticket.handlerActionId)
    : undefined;
  const actionLabel = ticket.handlerActionName ?? fallbackAction?.label;
  const actionDescription = ticket.handlerActionDescription ?? fallbackAction?.description;

  return (
    <div className="space-y-6">
      {/* Header halaman — di luar Card supaya judul/badan/aksi tidak menumpuk */}
      <TicketHeader
        ticket={ticket}
        backHref={backHref}
        backLabel="Kembali"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
              <FileText data-icon="inline-start" />
              Detail Laporan
            </Button>
            {/* Tanpa `readOnly`: pesan approver dipaksa internal oleh backend
                (`resolveInternalFlag`) dan tidak pernah tampil ke pelapor. */}
            <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
          </>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom kiri (2/3): yang dinilai — aksi, resolusi, progres */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Penilaian Resolusi</CardTitle>
              <CardDescription>
                Aksi yang diminta, resolusi yang diajukan handler, dan progres pengerjaannya.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Aksi yang harus dilakukan handler - ditetapkan reviewer */}
              {actionLabel && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Aksi yang Harus Dilakukan Handler
                  </p>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm font-medium text-foreground">{actionLabel}</p>
                    {actionDescription && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{actionDescription}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Resolusi handler */}
              <>
                <Separator />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Resolusi yang Diajukan Handler</p>
                    {(ticket.resolutionCycles?.length ?? 0) > 1 && (
                      <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                        <History data-icon="inline-start" />
                        Lihat Riwayat
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-4 rounded-lg bg-muted/50 p-4">
                    <DetailList
                      items={[{ label: 'Handler', value: ticket.handlerName ?? '-' }]}
                      columns={1}
                    />
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Ringkasan Resolusi</p>
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {ticket.resolutionSummary ?? 'Belum ada ringkasan resolusi.'}
                      </p>
                    </div>
                    {ticket.resolutionDetail && (
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Detail Resolusi</p>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {ticket.resolutionDetail}
                        </p>
                      </div>
                    )}
                    {ticket.resolutionAttachments && ticket.resolutionAttachments.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-muted-foreground">Lampiran Resolusi</p>
                        <AttachmentList items={ticket.resolutionAttachments} layout="grid" />
                      </div>
                    )}
                  </div>
                </div>
              </>

              {/* Progres pengerjaan handler */}
              {ticket.handlerProgress && ticket.handlerProgress.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-muted-foreground">Progres Pengerjaan Handler</p>
                    <ol className="relative space-y-4 border-l pl-5">
                      {ticket.handlerProgress.map((p) => (
                        <li key={p.id} className="relative">
                          <span className="absolute -left-[25px] top-1 size-2.5 rounded-full bg-primary ring-4 ring-card" />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {p.actorName ?? ticket.handlerName ?? 'Handler'}
                            </p>
                            <p className="text-xs text-muted-foreground">{p.timestamp}</p>
                          </div>
                          <p className="mt-0.5 text-sm leading-relaxed text-foreground">{p.note}</p>
                          {p.attachments?.length ? (
                            <AttachmentList items={p.attachments} size="xs" className="mt-2" />
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan (1/3) KHUSUS aksi — tanpa atribut routing (Tujuan
            Eskalasi, Unit Tujuan, Prioritas): routing settled sejak
            persetujuan awal dan bukan yang dinilai di sini. */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Persetujuan Penutupan</CardTitle>
                <CardDescription>
                  Setujui penutupan tiket bila resolusi handler sudah sesuai, atau tolak
                  untuk mengembalikannya ke handler.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {showRejectForm && (
                  <Field>
                    <FieldLabel>Alasan Penolakan</FieldLabel>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Jelaskan mengapa resolusi handler ditolak, tiket akan dikembalikan ke handler."
                      className="min-h-24"
                      disabled={submitting}
                    />
                  </Field>
                )}

                {showRejectForm ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => setConfirmAction('reject')}
                      disabled={submitting}
                      variant="destructive"
                      className="w-full"
                    >
                      {submitting ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <XCircle data-icon="inline-start" />
                      )}
                      Konfirmasi Tolak
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectionReason('');
                      }}
                      disabled={submitting}
                    >
                      Batal
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full"
                      onClick={() => setConfirmAction('approve')}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <CheckCircle2 data-icon="inline-start" />
                      )}
                      Setujui Penutupan
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => setShowRejectForm(true)}
                      disabled={submitting}
                      variant="destructive"
                    >
                      <XCircle data-icon="inline-start" />
                      Tolak
                    </Button>
                  </div>
                )}

                {/* Catatan ini hanya relevan kalau handler benar-benar sudah
                    mengajukan resolusi — kalau belum, tidak ada yang bisa
                    "ditolak", jadi kalimatnya tidak berlaku. */}
                {hasSubmittedResolution && (
                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Menolak penutupan berarti resolusi handler ditolak & tiket dikembalikan
                      ke handler sebagai permintaan perbaikan.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal Detail Laporan — data tiket lengkap (pelapor, laporan, klaim,
          lampiran) ada di sini, bukan di halaman. */}
      <ReportDetailModal ticket={ticket} open={reportOpen} onOpenChange={setReportOpen} />

      {/* Riwayat perbaikan resolusi — versi-versi sebelumnya + status review
          dan catatan approver per versi. */}
      <ResolutionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        cycles={ticket.resolutionCycles ?? []}
      />

      {/* Konfirmasi sebelum aksi penting (APPROVE / REJECT) */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        variant={confirmAction === 'reject' ? 'destructive' : 'default'}
        icon={
          confirmAction === 'reject' ? (
            <AlertCircle className="text-destructive" />
          ) : (
            <CheckCircle2 className="text-primary" />
          )
        }
        title={confirmAction === 'reject' ? 'Tolak tiket ini?' : 'Setujui penutupan tiket?'}
        description={
          confirmAction === 'reject'
            ? 'Resolusi handler akan ditolak dan tiket dikembalikan ke handler untuk diperbaiki. Lanjutkan?'
            : 'Penutupan tiket disetujui. Tiket akan ditutup dan selesai. Lanjutkan?'
        }
        confirmLabel={confirmAction === 'reject' ? 'Ya, Tolak' : 'Ya, Setujui'}
        loading={submitting}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === 'approve') void handleApprove();
          else if (action === 'reject') void handleReject();
        }}
      />
    </div>
  );
}
