'use client';

import { use, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getHandlerTicket,
  submitHandlerProgress,
  submitHandlerResolution,
} from '@/lib/api/handler';
import { HANDLER_ACTIONS } from '@/lib/constants/reviewer';
import type { Ticket } from '@/lib/types/ticket';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { TicketTimeline } from '@/components/shared/TicketTimeline';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  History,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Truck,
  User,
  XCircle,
  AlertCircle,
  Paperclip,
  ImageIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ReportDetailModal } from '@/components/shared/ReportDetailModal';
import { UserDetailModal, type UserDetailData } from '@/components/shared/UserDetailModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const PROGRESS_SHOW_LIMIT = 3;

const RESOLUTION_DECISION_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Menunggu Persetujuan', className: 'text-amber-600' },
  APPROVED: { label: 'Disetujui', className: 'text-emerald-600' },
  REJECTED: { label: 'Ditolak', className: 'text-destructive' },
};

export default function HandlerTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [showAllProgress, setShowAllProgress] = useState(false);

  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userDetailTitle, setUserDetailTitle] = useState('');
  const [userDetailData, setUserDetailData] = useState<UserDetailData | null>(null);

  const openReporterDetail = () => {
    if (!ticket) return;
    setUserDetailTitle('Detail Pelapor');
    setUserDetailData({
      name: ticket.reporterName,
      email: ticket.reporterEmail,
      phone: ticket.reporterPhone,
      address: ticket.reporterAddress,
      department: ticket.reporterDepartment,
      position: ticket.reporterPosition,
      isEmployee: ticket.reporterType === 'EMPLOYEE' || !!ticket.reporterDepartment,
    });
    setUserDetailOpen(true);
  };

  const openCustomerDetail = () => {
    if (!ticket || !ticket.customerData) return;
    setUserDetailTitle('Detail Customer');
    setUserDetailData({
      name: ticket.customerData.name,
      email: ticket.customerData.email,
      phone: ticket.customerData.phone,
      address: ticket.customerData.address,
      isEmployee: false,
    });
    setUserDetailOpen(true);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
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
            <Loader2 className="size-8 animate-spin text-muted-foreground/60" />
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

  // Boleh ajukan resolusi hanya saat tiket sedang dikerjakan atau rework
  const canSubmitResolution =
    ticket.status === 'IN_PROGRESS' || ticket.status === 'REWORK_REQUIRED';

  return (
    <div className="space-y-6 min-w-0">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/handler/need-action">
            <ArrowLeft className="size-4" />
            <span>Kembali</span>
          </Link>
        </Button>

        <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
      </div>

      {/* Header info */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{ticket.id}</span>
                  <span>•</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight md:text-2xl">{ticket.subject}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={ticket.priority} />
                <TypeBadge ticketType={ticket.ticketType} />
                <StatusBadge status={ticket.status} />
                <Button variant="outline" size="sm" onClick={() => setReportOpen(true)} className="gap-1.5">
                  <FileText className="size-3.5" />
                  <span>Detail Laporan</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-muted-foreground" />
              <span>Handler: <strong className="font-semibold text-foreground">{ticket.handlerName ?? '-'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building className="size-4 text-muted-foreground" />
              <span>Unit: <strong className="font-semibold text-foreground">{ticket.assignedUnit ?? '-'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="size-4 text-muted-foreground" />
              <span>SO: <strong className="font-semibold text-foreground">{ticket.soNumber ?? '-'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-muted-foreground" />
              <span>
                Pelapor:{' '}
                <button
                  type="button"
                  onClick={openReporterDetail}
                  className="font-semibold text-foreground hover:underline"
                >
                  {ticket.reporterName}
                </button>
              </span>
            </div>
            {ticket.customerData?.name && (
              <div className="flex items-center gap-1.5">
                <Building className="size-4 text-muted-foreground" />
                <span>
                  Customer:{' '}
                  <button
                    type="button"
                    onClick={openCustomerDetail}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {ticket.customerData.name}
                  </button>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 min-w-0">
        {/* Kolom kiri: Instruksi Penanganan & Progres Pengerjaan */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* ── Instruksi Penanganan ── */}
          {handlerAction && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="size-4 text-muted-foreground" />
                  Instruksi Penanganan
                </CardTitle>
                <CardDescription className="text-xs">
                  Aksi yang ditetapkan reviewer/unit untuk tiket ini.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 rounded-lg border bg-primary/5 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="size-3" />
                      {handlerAction.label}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{handlerAction.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progres pengerjaan handler */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <History className="size-4 text-muted-foreground" />
                Progres Pengerjaan
              </CardTitle>
              <CardDescription className="text-xs">
                Update berkala terlihat otomatis oleh reporter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {progressList.length > 0 && (
                <div className="relative space-y-4 pl-6">
                  <div className="absolute bottom-1.5 left-[11px] top-1.5 w-px bg-border" />
                  {visibleProgress.map((p) => (
                    <div key={p.id} className="relative">
                      <div className="absolute -left-[18px] top-1.5 size-2.5 rounded-full border-2 border-primary bg-primary" />
                      <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-xs font-semibold">{p.actorName ?? ticket.handlerName ?? 'Handler'}</span>
                          <span className="text-[10px] text-muted-foreground">{p.timestamp}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-foreground">{p.note}</p>
                        {p.attachments?.length ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {p.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                {att.type.startsWith('image/') ? (
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="size-7 rounded object-cover"
                                  />
                                ) : (
                                  <FileText className="size-3.5 shrink-0" />
                                )}
                                <span className="max-w-28 truncate">{att.name}</span>
                                <span className="shrink-0 text-[9px]">
                                  {(Number(att.size) / 1024).toFixed(0)}KB
                                </span>
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {progressList.length > PROGRESS_SHOW_LIMIT && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllProgress((v) => !v)}
                  className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showAllProgress ? (
                    <>
                      <ChevronUp className="size-3.5" />
                      Sembunyikan
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-3.5" />
                      Tampilkan {hiddenCount} progres lainnya
                    </>
                  )}
                </Button>
              )}

              {progressOpen && (
                <>
                  <Separator />
                  <div className="space-y-3 rounded-lg border border-dashed bg-background p-3.5">
                    <span className="block text-xs font-semibold text-foreground">Tambah Progres Pengerjaan</span>
                    <Textarea
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                      placeholder="Contoh: Hari ini koordinasi dengan warehouse untuk cek stok barang pengganti..."
                      className="min-h-20 text-xs"
                      disabled={submittingProgress}
                    />

                    {/* Lampiran bukti pengerjaan (opsional, maks. 5 file) */}
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted">
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
                        <ul className="space-y-1">
                          {pendingFiles.map((f, idx) => (
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
                                onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
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
                    <Button
                      size="sm"
                      onClick={() => setConfirmAction('progress')}
                      className="h-9 w-full gap-1.5 text-xs"
                      disabled={submittingProgress || !progressNote.trim()}
                    >
                      {submittingProgress ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      Simpan Progres
                    </Button>
                  </div>
                </>
              )}

              {progressList.length === 0 && !progressOpen && (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
                  <History className="size-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Belum ada progres penanganan</p>
                </div>
              )}

              {!progressOpen && ticket.status !== 'PENDING_REVIEW' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProgressOpen(true)}
                  className="w-full gap-1.5 text-xs"
                  disabled={submittingProgress}
                >
                  <Plus className="size-3.5" />
                  Tambah Progres
                </Button>
              )}

              {canSubmitResolution && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setResolutionOpen(true)}
                  className="w-full gap-1.5 text-xs mt-2"
                  disabled={submittingProgress}
                >
                  <Send className="size-3.5" />
                  {ticket.status === 'REWORK_REQUIRED' ? 'Ajukan Ulang Resolusi' : 'Ajukan Resolusi'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan: Status Resolusi & Riwayat Revisi */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Status resolusi saat ini */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardCheck className="size-4 text-muted-foreground" />
                Status Resolusi
              </CardTitle>
              <CardDescription className="text-xs">
                Status penyelesaian tiket saat ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ticket.status === 'CLOSED' ? (
                <div className="space-y-2 rounded-lg border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/20 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Selesai — tiket telah ditutup</span>
                  </div>
                  {approvedResolution ? (
                    <div className="space-y-1">
                      <p className="text-xs leading-relaxed text-foreground">{approvedResolution.summary}</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{approvedResolution.detail}</p>
                    </div>
                  ) : (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Tidak ada data resolusi yang disetujui untuk tiket ini.
                    </p>
                  )}
                </div>
              ) : ticket.status === 'REJECTED' ? (
                <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="size-3.5 text-destructive" />
                    <span className="text-xs font-semibold text-destructive">Ditolak</span>
                  </div>
                  {ticket.rejectionReason && (
                    <p className="text-xs text-muted-foreground">{ticket.rejectionReason}</p>
                  )}
                </div>
              ) : ticket.status === 'PENDING_REVIEW' && resolutions.length > 0 ? (
                <div className="space-y-2 rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Menunggu Persetujuan</span>
                  </div>
                  {resolutions.slice(0, 1).map((r) => (
                    <div key={r.id} className="space-y-1">
                      <p className="text-xs leading-relaxed text-foreground">{r.summary}</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{r.detail}</p>
                      {r.attachments && r.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {r.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              {att.type.startsWith('image/') ? (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="size-7 rounded object-cover"
                                />
                              ) : (
                                <FileText className="size-3.5" />
                              )}
                              <span className="max-w-28 truncate">{att.name}</span>
                              <span className="shrink-0 text-[9px]">
                                {(Number(att.size) / 1024).toFixed(0)}KB
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : ticket.status === 'REWORK_REQUIRED' ? (
                <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="size-3.5 text-destructive" />
                    <span className="text-xs font-semibold text-destructive">Perlu Perbaikan</span>
                  </div>
                  {ticket.rejectionReason && (
                    <p className="text-xs text-muted-foreground">{ticket.rejectionReason}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Sedang dikerjakan</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Riwayat revisi (resolusi yang sudah diproses approver) */}
          {pastResolutions.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4 text-muted-foreground" />
                  Riwayat Revisi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 border-l-2 ml-2 pl-4">
                  {pastResolutions.map((r) => {
                    const decision = RESOLUTION_DECISION_LABEL[r.reviewDecision] ?? {
                      label: r.reviewDecision,
                      className: 'text-muted-foreground',
                    };
                    return (
                      <div key={r.id} className="relative">
                        <span
                          className={`absolute -left-[21px] top-1.5 size-2 rounded-full ${
                            r.reviewDecision === 'APPROVED' ? 'bg-emerald-600' : 'bg-destructive/60'
                          }`}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">Resolusi #{r.resolutionNo}</span>
                          <span className={`text-[10px] font-semibold ${decision.className}`}>
                            {decision.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{r.summary}</p>
                        {r.attachments && r.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {r.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                {att.type.startsWith('image/') ? (
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="size-6 rounded object-cover"
                                  />
                                ) : (
                                  <FileText className="size-3" />
                                )}
                                <span className="max-w-24 truncate">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Detail Laporan */}
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
              {submittingResolution ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              {ticket.status === 'REWORK_REQUIRED' ? 'Ajukan Ulang' : 'Ajukan Resolusi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TicketTimeline activities={ticket.activities} />

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

      <UserDetailModal
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
        title={userDetailTitle}
        user={userDetailData}
      />
    </div>
  );
}
