'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getHandlerTicket,
  submitHandlerProgress,
  submitHandlerResolution,
} from '@/lib/api/handler';
import { HANDLER_ACTIONS } from '@/lib/constants/reviewer';
import type { Ticket } from '@/lib/types/ticket';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { AttachmentList } from '@/components/shared/AttachmentList';
import { TicketTimeline } from '@/components/shared/TicketTimeline';
import { TicketHeader } from '@/components/shared/TicketHeader';
import { DotChip } from '@/components/shared/DotChip';
import { DetailList } from '@/components/shared/DetailList';
import { ResolutionDecisionChip } from '@/components/shared/ResolutionDecisionChip';
import { formatFileSize } from '@/components/shared/FileDropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  Plus,
  Send,
  XCircle,
  FileCheck,
  Paperclip,
  ImageIcon,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ReportDetailModal } from '@/components/shared/ReportDetailModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const PROGRESS_SHOW_LIMIT = 3;

export default function HandlerTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
// Asal daftar untuk breadcrumb "kembali" — lihat `backTarget` di bawah.
const searchParams = useSearchParams();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [showAllProgress, setShowAllProgress] = useState(false);

  /* Detail pelapor & pelanggan ditangani TicketSummary (memiliki modalnya
     sendiri), jadi state + handler di sini tidak dibutuhkan lagi. */
  const resolutionFileInputRef = useRef<HTMLInputElement>(null);

  // Progres pengerjaan
  const [progressNote, setProgressNote] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submittingProgress, setSubmittingProgress] = useState(false);

  // Pengajuan resolusi
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionDetail, setResolutionDetail] = useState('');
  const [resolutionFiles, setResolutionFiles] = useState<File[]>([]);
  const [submittingResolution, setSubmittingResolution] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'progress' | 'resolution' | null>(null);

  useEffect(() => {
    let cancelled = false;

    getHandlerTicket(id)
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

  const submitProgress = async () => {
    if (!ticket || !progressNote.trim()) {
      toast.error('Tuliskan progres pengerjaan terlebih dahulu');
      return;
    }
    setSubmittingProgress(true);
    try {
      await submitHandlerProgress(id, progressNote.trim(), pendingFiles);
      toast.success('Progres pengerjaan tersimpan & terlihat oleh reporter');
      setProgressNote('');
      setPendingFiles([]);
      setProgressOpen(false);
      // Refresh data agar progres baru tampil
      const fresh = await getHandlerTicket(id);
      setTicket(fresh);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan progres.');
    } finally {
      setSubmittingProgress(false);
    }
  };

  const submitResolution = async () => {
    if (!ticket) return;
    if (!resolutionSummary.trim() || !resolutionDetail.trim()) {
      toast.error('Isi ringkasan & detail resolusi terlebih dahulu');
      return;
    }
    setSubmittingResolution(true);
    setResolutionError(null);
    try {
      await submitHandlerResolution(id, {
        summary: resolutionSummary.trim(),
        detail: resolutionDetail.trim(),
      }, resolutionFiles);
      toast.success('Resolusi diajukan & menunggu persetujuan penutupan');
      const fresh = await getHandlerTicket(id);
      setTicket(fresh);
      setResolutionOpen(false);
      setResolutionSummary('');
      setResolutionDetail('');
      setResolutionFiles([]);
      setTimeout(() => router.push('/handler/waiting-for-review'), 1500);
    } catch (error: unknown) {
      setResolutionError(error instanceof Error ? error.message : 'Gagal mengajukan resolusi.');
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleConfirmProgress = async () => {
    await submitProgress();
  };

  const handleConfirmResolution = async () => {
    await submitResolution();
  };

  if (isLoading || !ticket) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          {isLoading ? (
            <Spinner className="size-8 text-muted-foreground/60" />
          ) : (
            <AlertCircle className="size-8 text-muted-foreground/60" />
          )}
          <p className="text-sm font-medium">
            {isLoading ? 'Memuat detail tiket...' : (loadError ?? 'Tiket tidak ditemukan.')}
          </p>
        </div>
      </div>
    );
  }

  // Label/deskripsi diutamakan dari master backend (relasi `action`),
  // fallback ke konstanta FE bila field belum terbawa.
  const handlerActionFallback = HANDLER_ACTIONS.find((a) => a.id === ticket.handlerActionId);
  const handlerAction = ticket.handlerActionId
    ? {
        label: ticket.handlerActionName ?? handlerActionFallback?.label ?? ticket.handlerActionId,
        description: ticket.handlerActionDescription ?? handlerActionFallback?.description ?? '',
      }
    : undefined;
  const progressList = ticket.handlerProgress ?? [];
  const visibleProgress = showAllProgress ? progressList : progressList.slice(0, PROGRESS_SHOW_LIMIT);
  const hiddenCount = progressList.length - PROGRESS_SHOW_LIMIT;

  const resolutions = ticket.resolutions ?? [];
  const pastResolutions = resolutions.filter((r) => r.reviewDecision !== 'PENDING');

  /** Resolusi yang disetujui terakhir — ditampilkan di kartu Status Resolusi saat tiket CLOSED. */
  const approvedResolution = [...resolutions].reverse().find((r) => r.reviewDecision === 'APPROVED');

  /**
   * Handler hanya boleh bekerja saat tiket sedang dikerjakan atau perlu
   * revisi. Dipakai untuk KEDUA aksi (Tambah Progres & Ajukan Resolusi).
   *
   * Sebelumnya "Tambah Progres" hanya mengecek `status !== 'PENDING_REVIEW'`,
   * sehingga tombolnya tetap muncul di tiket CLOSED / REJECTED / PENDING_APPROVAL
   * — invites user untuk mengubah tiket yang sudah selesai.
   */
  const canWork = ticket.status === 'IN_PROGRESS' || ticket.status === 'REWORK_REQUIRED';

  /** Alasan kenapa aksi tidak tersedia — ditampilkan sebagai empty state. */
  const closedActionNote =
    ticket.status === 'CLOSED'
      ? 'Tiket sudah selesai dan ditutup. Tidak ada tindakan yang bisa dilakukan.'
      : ticket.status === 'PENDING_REVIEW'
        ? 'Resolusi sudah diajukan dan sedang menunggu persetujuan approver.'
        : ticket.status === 'REJECTED'
          ? 'Tiket ini ditolak. Tidak ada tindakan yang bisa dilakukan.'
          : null;

  /**
   * Ke daftar mana tombol "kembali" harus pergi.
   *
   * Ada empat daftar handler dan semuanya dilayani route detail yang sama, jadi
   * tanpa penanda asal dari query `?from=` tombol ini selalu melompat ke
   * `need-action` — salah untuk tiga daftar lainnya.
   *
   * Kalau URL dibuka tanpa penanda, ditebak dari status tiket supaya tetap
   * mengarah ke daftar yang paling masuk akal.
   */
  const backTarget = (() => {
    switch (searchParams.get('from')) {
      case 'waiting-review':
        return { href: '/handler/waiting-for-review', label: 'Kembali ke Menunggu Review' };
      case 'rework':
        return { href: '/handler/rework-required', label: 'Kembali ke Perlu Revisi' };
      case 'history':
        return { href: '/handler/history', label: 'Kembali ke Riwayat' };
      case 'need-action':
        return { href: '/handler/need-action', label: 'Kembali ke Perlu Tindakan' };
      default:
        return ticket.status === 'REWORK_REQUIRED'
          ? { href: '/handler/rework-required', label: 'Kembali ke Perlu Revisi' }
          : ticket.status === 'PENDING_REVIEW'
            ? { href: '/handler/waiting-for-review', label: 'Kembali ke Menunggu Review' }
            : ticket.status === 'CLOSED' || ticket.status === 'REJECTED'
              ? { href: '/handler/history', label: 'Kembali ke Riwayat' }
              : { href: '/handler/need-action', label: 'Kembali ke Perlu Tindakan' };
    }
  })();

  return (
    <div className="space-y-6 min-w-0">
      {/* Header halaman — di luar Card supaya judul/badan/aksi tidak menumpuk */}
      <TicketHeader
        ticket={ticket}
        backHref={backTarget.href}
        backLabel={backTarget.label}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
              <FileText data-icon="inline-start" />
              Detail Laporan
            </Button>
            <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
          </>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom kiri (2/3): konteks & riwayat. Data identitas tiket TIDAK
            di sini — semuanya ada di modal "Detail Laporan". */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {(handlerAction || ticket.wansisReportNumber) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Instruksi Penanganan</CardTitle>
                <CardDescription>
                  Aksi yang ditetapkan reviewer/unit untuk tiket ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {handlerAction && (
                  <div className="flex flex-col gap-2 rounded-lg bg-primary/5 p-4">
                    <DotChip dotClass="bg-primary">{handlerAction.label}</DotChip>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {handlerAction.description}
                    </p>
                  </div>
                )}

                {/* Nomor report WANSIS. Halaman handler tidak memakai
                    TicketSummary (data tiket ada di modal "Detail Laporan"),
                    jadi field ini ditaruh di kartu instruksi — di situ konteks
                    "apa yang harus dilakukan handler" sudah ada. */}
                {ticket.wansisReportNumber && (
                  <DetailList
                    items={[
                      {
                        label: 'Nomor Report WANSIS',
                        icon: FileCheck,
                        value: ticket.wansisReportNumber,
                      },
                    ]}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Progres pengerjaan handler */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riwayat Progres</CardTitle>
              <CardDescription>
                Update berkala yang pernah dikirim. Terlihat otomatis oleh reporter.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {progressList.length > 0 ? (
                /* Bentuk visual sama dengan TicketTimeline supaya daftar
                   kronologi di halaman ini terbaca satu pola. */
                <ol className="relative space-y-4 border-l pl-5">
                  {visibleProgress.map((p) => (
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
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
                  <History aria-hidden className="size-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Belum ada progres penanganan</p>
                </div>
              )}

              {progressList.length > PROGRESS_SHOW_LIMIT && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllProgress((v) => !v)}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  {showAllProgress ? (
                    <>
                      <ChevronUp data-icon="inline-start" />
                      Sembunyikan
                    </>
                  ) : (
                    <>
                      <ChevronDown data-icon="inline-start" />
                      Tampilkan {hiddenCount} progres lainnya
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Resolusi</CardTitle>
              <CardDescription>Status penyelesaian tiket saat ini.</CardDescription>
            </CardHeader>
            <CardContent>
                {ticket.status === 'CLOSED' ? (
                  <div className="flex flex-col gap-2 rounded-lg bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 aria-hidden className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Selesai — tiket telah ditutup
                      </span>
                    </div>
                    {approvedResolution ? (
                      <div className="flex flex-col gap-1">
                        <p className="text-sm leading-relaxed text-foreground">
                          {approvedResolution.summary}
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {approvedResolution.detail}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Tidak ada data resolusi yang disetujui untuk tiket ini.
                      </p>
                    )}
                  </div>
                ) : ticket.status === 'REJECTED' ? (
                  <div className="flex flex-col gap-2 rounded-lg bg-destructive/10 p-4">
                    <div className="flex items-center gap-2">
                      <XCircle aria-hidden className="size-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">Ditolak</span>
                    </div>
                    {ticket.rejectionReason && (
                      <p className="text-sm text-muted-foreground">{ticket.rejectionReason}</p>
                    )}
                  </div>
                ) : ticket.status === 'PENDING_REVIEW' && resolutions.length > 0 ? (
                  <div className="flex flex-col gap-2 rounded-lg bg-amber-500/10 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Menunggu Persetujuan
                      </span>
                    </div>
                    {resolutions.slice(0, 1).map((r) => (
                      <div key={r.id} className="flex flex-col gap-1">
                        <p className="text-sm leading-relaxed text-foreground">{r.summary}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{r.detail}</p>
                        {r.attachments && r.attachments.length > 0 && (
                          <AttachmentList items={r.attachments} size="xs" className="mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : ticket.status === 'REWORK_REQUIRED' ? (
                  <div className="flex flex-col gap-2 rounded-lg bg-destructive/10 p-4">
                    <div className="flex items-center gap-2">
                      <XCircle aria-hidden className="size-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">Perlu Perbaikan</span>
                    </div>
                    {ticket.rejectionReason && (
                      <p className="text-sm text-muted-foreground">{ticket.rejectionReason}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                    <Spinner className="size-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Sedang dikerjakan</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Riwayat revisi (resolusi yang sudah diproses approver) */}
            {pastResolutions.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Riwayat Revisi</CardTitle>
                  <CardDescription>Resolusi sebelumnya yang sudah diproses approver.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="relative space-y-4 border-l pl-5">
                    {pastResolutions.map((r) => (
                      <li key={r.id} className="relative">
                        <span
                          className={cn(
                            'absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-card',
                            r.reviewDecision === 'APPROVED' ? 'bg-emerald-500/70' : 'bg-destructive/60',
                          )}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            Resolusi #{r.resolutionNo}
                          </p>
                          <ResolutionDecisionChip decision={r.reviewDecision} />
                        </div>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                          {r.summary}
                        </p>
                        {r.attachments && r.attachments.length > 0 && (
                          <AttachmentList items={r.attachments} size="xs" className="mt-2" />
                        )}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

          <TicketTimeline activities={ticket.activities} />
        </div>

        {/* Kolom kanan (1/3) KHUSUS aksi — satu-satunya tempat handler
            bekerja. Data tiket ada di modal "Detail Laporan" (button di header)
            supaya halaman ini tidak jadi tempat mencari-cari informasi.
            Sticky di lg+: di mobile layout-nya 1 kolom, sticky akan menutupi
            header.
            Wrapper-nya wajib: grid item-nya adalah kolom ini, bukan Card-nya.
            Kalau Card-nya langsung yang sticky, kolom yang sudah di-stretch
            setinggi row akan ikut jadi tinggi dan tidak ada ruang gerak. */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tindakan</CardTitle>
                <CardDescription>
                  Kirim progres berkala, lalu ajukan resolusi saat penanganan selesai.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {progressOpen && canWork && (
                  <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4">
                    <span className="text-sm font-medium text-foreground">
                      Tambah Progres Pengerjaan
                    </span>
                    <Textarea
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                      placeholder="Contoh: Hari ini koordinasi dengan warehouse untuk cek stok barang pengganti..."
                      className="min-h-20"
                      disabled={submittingProgress}
                    />

                    {/* Lampiran bukti pengerjaan (opsional, maks. 5 file) */}
                    <div className="flex flex-col gap-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted">
                        <Paperclip className="size-3.5" />
                        <span>Lampirkan bukti (gambar/PDF, maks. 5 file @5MB)</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf,.doc,.docx,.txt"
                          className="hidden"
                          disabled={submittingProgress || pendingFiles.length >= 5}
                          onChange={(e) => {
                            const picked = Array.from(e.target.files ?? []);
                            setPendingFiles((prev) => {
                              const next = [...prev, ...picked];
                              return next.slice(0, 5);
                            });
                            // reset agar file yang sama bisa dipilih ulang
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {pendingFiles.length > 0 && (
                        <ul className="flex flex-col gap-1">
                          {pendingFiles.map((f, idx) => (
                            <li
                              key={`${f.name}-${idx}`}
                              className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs"
                            >
                              {f.type.startsWith('image/') ? (
                                <ImageIcon aria-hidden className="size-3.5 shrink-0 text-primary" />
                              ) : (
                                <FileText aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                              )}
                              <span className="min-w-0 flex-1 truncate">{f.name}</span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {formatFileSize(f.size)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                aria-label="Hapus lampiran"
                              >
                                <X />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => setConfirmAction('progress')}
                      disabled={submittingProgress || !progressNote.trim()}
                    >
                      {submittingProgress ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <Send data-icon="inline-start" />
                      )}
                      Simpan Progres
                    </Button>
                  </div>
                )}

                {!progressOpen && canWork && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setProgressOpen(true)}
                    disabled={submittingProgress}
                  >
                    <Plus data-icon="inline-start" />
                    Tambah Progres
                  </Button>
                )}

                {canWork && (
                  <Button
                    className="w-full"
                    onClick={() => setResolutionOpen(true)}
                    disabled={submittingProgress}
                  >
                    <Send data-icon="inline-start" />
                    {ticket.status === 'REWORK_REQUIRED'
                      ? 'Ajukan Ulang Resolusi'
                      : 'Ajukan Resolusi'}
                  </Button>
                )}

                {!canWork && closedActionNote && (
                  <p className="text-sm text-muted-foreground">{closedActionNote}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal Detail Laporan — semua data tiket (pelapor, pelanggan, SO,
          sales, deskripsi, klaim, lampiran) ada di sini, bukan di halaman. */}
      <ReportDetailModal ticket={ticket} open={reportOpen} onOpenChange={setReportOpen} />

      {/* Modal Ajukan Resolusi */}
      <Dialog open={resolutionOpen} onOpenChange={setResolutionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Send className="size-4 text-muted-foreground" />
              {ticket.status === 'REWORK_REQUIRED' ? 'Ajukan Ulang Resolusi' : 'Ajukan Resolusi'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {ticket.status === 'REWORK_REQUIRED'
                ? 'Resolusi sebelumnya ditolak. Perbaiki dan ajukan ulang.'
                : 'Isi ketika penanganan sudah selesai untuk diajukan ke approver.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {ticket.status === 'REWORK_REQUIRED' && ticket.rejectionReason && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                <XCircle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <span className="font-semibold">Alasan penolakan: </span>
                  <span>{ticket.rejectionReason}</span>
                </div>
              </div>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel>
                  Ringkasan Solusi
                  <span className="ml-0.5 text-red-500">*</span>
                </FieldLabel>
                <Textarea
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Jelaskan solusi yang telah diberikan secara singkat..."
                  className="min-h-24 text-xs"
                  disabled={submittingResolution}
                />
              </Field>
              <Field>
                <FieldLabel>
                  Detail Pelaksanaan
                  <span className="ml-0.5 text-red-500">*</span>
                </FieldLabel>
                <Textarea
                  value={resolutionDetail}
                  onChange={(e) => setResolutionDetail(e.target.value)}
                  placeholder="Jelaskan detail langkah-langkah yang telah dilakukan..."
                  className="min-h-24 text-xs"
                  disabled={submittingResolution}
                />
              </Field>
            </FieldGroup>

            {/* Lampiran bukti penyelesaian (opsional, maks. 5 file) */}
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted">
                <Paperclip className="size-3.5" />
                <span>Lampirkan bukti penyelesaian (gambar/PDF, maks. 5 file @5MB)</span>
                <input
                  ref={resolutionFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.txt"
                  className="hidden"
                  disabled={submittingResolution || resolutionFiles.length >= 5}
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    setResolutionFiles((prev) => {
                      const next = [...prev, ...picked];
                      return next.slice(0, 5);
                    });
                    e.target.value = '';
                  }}
                />
              </label>
              {resolutionFiles.length > 0 && (
                <ul className="grid grid-cols-2 gap-2">
                  {resolutionFiles.map((f, idx) => (
                    <li
                      key={`${f.name}-${idx}`}
                      className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-[10px]"
                    >
                      {f.type.startsWith('image/') ? (
                        <ImageIcon className="size-3.5 shrink-0 text-primary" />
                      ) : (
                        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="shrink-0 text-[9px] text-muted-foreground">
                        {(f.size / 1024).toFixed(0)}KB
                      </span>
                      <button
                        type="button"
                        onClick={() => setResolutionFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Hapus lampiran"
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {resolutionError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{resolutionError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResolutionOpen(false)}
              disabled={submittingResolution}
            >
              Batal
            </Button>
            <Button
              onClick={() => setConfirmAction('resolution')}
              size="sm"
              disabled={submittingResolution || !resolutionSummary.trim() || !resolutionDetail.trim()}
            >
              {submittingResolution ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Send data-icon="inline-start" />
              )}
              {ticket.status === 'REWORK_REQUIRED' ? 'Ajukan Ulang' : 'Ajukan Resolusi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi sebelum aksi penting (SUBMIT PROGRESS / SUBMIT RESOLUTION) */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        variant="default"
        icon={<Send className="text-primary" />}
        title={confirmAction === 'progress' ? 'Simpan progres pengerjaan?' : 'Ajukan resolusi tiket?'}
        description={
          confirmAction === 'progress'
            ? 'Progres pengerjaan akan disimpan dan terlihat oleh reporter. Lanjutkan?'
            : 'Resolusi akan diajukan dan menunggu persetujuan penutupan. Tiket akan berstatus PENDING_REVIEW. Lanjutkan?'
        }
        confirmLabel="Ya, Lanjutkan"
        loading={submittingProgress || submittingResolution}
        onConfirm={async () => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === 'progress') await handleConfirmProgress();
          else if (action === 'resolution') await handleConfirmResolution();
        }}
      />
    </div>
  );
}
