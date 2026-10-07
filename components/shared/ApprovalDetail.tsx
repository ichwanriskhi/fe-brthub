'use client';

import { useState } from 'react';
import { isDistributionClaim, HANDLER_ACTIONS } from '@/lib/constants/reviewer';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { AttachmentList } from '@/components/shared/AttachmentList';
import { TicketTimeline } from '@/components/shared/TicketTimeline';
import { TicketHeader } from '@/components/shared/TicketHeader';
import { TicketSummary } from '@/components/shared/TicketSummary';
import { DetailList } from '@/components/shared/DetailList';
import { ResolutionDecisionChip } from '@/components/shared/ResolutionDecisionChip';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ResolutionHistoryDialog } from '@/components/shared/ResolutionHistoryDialog';
import { useItemGroupName } from '@/hooks/use-item-groups';
import { useApprovalTicket } from '@/components/shared/use-approval-ticket';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Field, FieldLabel } from '@/components/ui/field';
import { CheckCircle2, XCircle, AlertCircle, Info, History } from 'lucide-react';

interface ApprovalDetailProps {
  /** Ticket id dari params halaman */
  id: string;
  /** Tahap persetujuan: INITIAL (awal) | FINAL (penutupan) */
  stage: 'INITIAL' | 'FINAL';
  /** Path kembali ke halaman list */
  backHref: string;
  /**
   * Mode read-only (halaman riwayat): tombol approve/reject disembunyikan,
   * diganti dengan ringkasan keputusan yang sudah pernah dibuat.
   */
  readOnly?: boolean;
}

const APPROVAL_TYPE_LABEL: Record<string, string> = {
  DIREKSI: 'Direksi',
  GENERAL_MANAGER: 'General Manager',
  OPERATIONAL_MANAGER: 'Operational Manager',
  DIVISION: 'Division (Supervisor)',
};

export function ApprovalDetail({ id, stage, backHref, readOnly = false }: ApprovalDetailProps) {
  // Logika muat + putus dibagi dengan `FinalApprovalDetail` lewat hook —
  // komponen ini hanya komposisi layout lengkap (INITIAL + arsip).
  const {
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
  } = useApprovalTicket({ id, stage, backHref });

  const [historyOpen, setHistoryOpen] = useState(false);
  // productLine menyimpan KODE grup — tampilkan namanya, fallback kode mentah.
  const productLineName = useItemGroupName(ticket?.productLine);

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

  const isClaim = isDistributionClaim(ticket.category);
  const isVehicleCategory = ticket.category === 'Produk & Kendaraan';
  /**
   * Handler sudah mengajukan resolusi (paling baru) — menentukan apakah
   * stage FINAL punya sesuatu yang bisa disetujui/ditolak.
   */
  const hasSubmittedResolution = Boolean(
    ticket.resolutionCycles && ticket.resolutionCycles.length > 0,
  );

  return (
    <div className="space-y-6">
      {/* Header halaman — di luar Card supaya judul/badan/aksi tidak menumpuk */}
      <TicketHeader
        ticket={ticket}
        backHref={backHref}
        backLabel="Kembali"
        actions={
          // Tanpa `readOnly`: pesan approver dipaksa internal oleh backend
          // (`resolveInternalFlag`) dan tidak pernah tampil ke pelapor.
          <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom kiri (2/3): data tiket (read-only) */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <TicketSummary ticket={ticket} showWansis />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Laporan</CardTitle>
              <CardDescription>
                {isFinal
                  ? 'Data tiket & resolusi yang diajukan handler untuk persetujuan penutupan.'
                  : 'Data laporan sebagaimana diajukan pelapor dan diteruskan reviewer.'}
              </CardDescription>
            </CardHeader>
            {/* `flex flex-col gap-6` — CardContent adalah display:block tanpa
                gap, jadi tanpa ini tiap blok berdesain sendiri dan Separator
                terlihat nempel ke konten. */}
            <CardContent className="flex flex-col gap-6">
              <DetailList
                items={[
                  { label: 'Kategori', value: ticket.category },
                  { label: 'Sub Kategori', value: ticket.subcategory || '-' },
                ]}
              />

              <div>
                <p className="mb-2 text-xs text-muted-foreground">Deskripsi</p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{ticket.description}</p>
              </div>

              {isClaim && (ticket.soNumber || ticket.salesName) && (
                <>
                  <Separator />
                  <DetailList
                    items={[
                      { label: 'Nomor SO', value: ticket.soNumber ?? '-' },
                      { label: 'Nama Sales', value: ticket.salesName ?? '-' },
                    ]}
                  />
                </>
              )}

              {isVehicleCategory && (ticket.productLine || ticket.vehicleModel) && (
                <>
                  <Separator />
                  <DetailList
                    items={[
                      { label: 'Lini Produk', value: productLineName || ticket.productLine || '-' },
                      { label: 'Model Kendaraan', value: ticket.vehicleModel ?? '-' },
                    ]}
                  />
                </>
              )}

              {isClaim && ticket.claimedItems && ticket.claimedItems.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Informasi Barang Claim</p>
                    <ClaimItemsTable items={ticket.claimedItems} />
                  </div>
                </>
              )}

              {/* Aksi yang harus dilakukan handler — ditetapkan reviewer */}
              {ticket.handlerActionId && (() => {
                const action = HANDLER_ACTIONS.find((a) => a.id === ticket.handlerActionId);
                if (!action) return null;
                return (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">
                        Aksi yang Harus Dilakukan Handler
                      </p>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm font-medium text-foreground">{action.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Resolusi handler — khusus persetujuan penutupan.
                  Label jujur terhadap status: yang tampil selalu versi aktif
                  (no tertinggi) — "Diajukan" bila masih pending (antrean),
                  "Final" bila sudah diputus (arsip). */}
              {isFinal && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {readOnly ? 'Resolusi Final' : 'Resolusi yang Diajukan Handler'}
                      </p>
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
              )}

              {/* Progres pengerjaan handler — khusus persetujuan penutupan */}
              {isFinal && ticket.handlerProgress && ticket.handlerProgress.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-muted-foreground">Progres Pengerjaan Handler</p>
                    {/* Bentuk visual sama dengan TicketTimeline supaya dua
                        daftar kronologi di halaman ini terbaca satu pola. */}
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

              {ticket.attachments && ticket.attachments.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Lampiran Pelapor</p>
                    <AttachmentList items={ticket.attachments} layout="grid" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <TicketTimeline activities={ticket.activities} />
        </div>

        {/* Kolom kanan (1/3) KHUSUS aksi yang jadi tujuan user membuka halaman
          ini — sticky di lg+ supaya approve/reject tetap terjangkau saat
          kolom kiri panjang. */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isFinal ? 'Persetujuan Penutupan' : 'Persetujuan Tiket'}
                </CardTitle>
              <CardDescription>
                {readOnly
                  ? 'Detail keputusan yang pernah Anda buat untuk tiket ini.'
                  : isFinal
                    ? 'Setujui penutupan tiket bila resolusi handler sudah sesuai, atau tolak untuk mengembalikannya ke handler.'
                    : 'Setujui tiket untuk diteruskan ke unit teknis, atau tolak pengajuannya.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <DetailList
                items={[
                  {
                    label: 'Tujuan Eskalasi',
                    value: ticket.approvalTarget
                      ? (APPROVAL_TYPE_LABEL[ticket.approvalTarget] ?? ticket.approvalTarget)
                      : '-',
                  },
                  {
                    label: 'Unit Tujuan',
                    value: ticket.destinationDepartmentName || ticket.assignedUnit || '-',
                  },
                  { label: 'Prioritas', value: ticket.priority ?? 'Belum ditentukan' },
                ]}
              />

              {showRejectForm && (
                <Field>
                  <FieldLabel>Alasan Penolakan</FieldLabel>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={
                      isFinal
                        ? 'Jelaskan mengapa resolusi handler ditolak, tiket akan dikembalikan ke handler.'
                        : 'Jelaskan mengapa tiket ini ditolak.'
                    }
                    className="min-h-24"
                    disabled={submitting}
                  />
                </Field>
              )}

              {readOnly ? (
                /* ── Mode riwayat: tidak ada aksi, hanya ringkasan keputusan ──
                   Keputusan = chip (satu item), alasan = teks. Bukan blok
                   berwarna, karena warna blok di aplikasi ini berarti "state
                   tiket", bukan "keputusan atas satu pengajuan". */
                <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4">
                  <ResolutionDecisionChip
                    decision={ticket.rejectionReason ? 'REJECTED' : 'APPROVED'}
                  />
                  {ticket.rejectionReason && (
                    <p className="text-sm leading-relaxed text-foreground">
                      {ticket.rejectionReason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Tiket ini sudah pernah Anda proses. Lihat detail data tiket di kolom kiri.
                  </p>
                </div>
              ) : showRejectForm ? (
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
                    {isFinal ? 'Setujui Penutupan' : 'Setujui Tiket'}
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

              {/* Catatan konsekuensi penolakan — hanya relevan selama keputusan
                  masih bisa dibuat. Di arsip (readOnly) tiket sudah CLOSED
                  dan tidak ada yang bisa ditolak lagi, jadi kalimatnya bohong.
                  Untuk stage FINAL aktif, tetap perlu resolusi yang diajukan. */}
              {!readOnly && (!isFinal || hasSubmittedResolution) && (
                <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {isFinal
                      ? 'Menolak penutupan berarti resolusi handler ditolak & tiket dikembalikan ke handler sebagai permintaan perbaikan.'
                      : 'Penolakan tiket memerlukan alasan yang akan diteruskan ke pelapor dan reviewer.'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>

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
        title={confirmAction === 'reject' ? 'Tolak tiket ini?' : isFinal ? 'Setujui penutupan tiket?' : 'Setujui tiket ini?'}
        description={
          confirmAction === 'reject'
            ? isFinal
              ? 'Resolusi handler akan ditolak dan tiket dikembalikan ke handler untuk diperbaiki. Lanjutkan?'
              : 'Tiket akan ditolak dan tidak dapat dibatalkan. Lanjutkan?'
            : isFinal
              ? 'Penutupan tiket disetujui. Tiket akan ditutup dan selesai. Lanjutkan?'
              : 'Tiket akan diteruskan ke unit untuk ditindak lanjuti. Lanjutkan?'
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
