'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyTicket, decideApproval } from '@/lib/api/tickets';
import type { Ticket } from '@/lib/types/ticket';
import { isDistributionClaim, HANDLER_ACTIONS } from '@/lib/constants/reviewer';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { TicketTimeline } from '@/components/shared/TicketTimeline';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  Truck,
  Sparkles,
  User,
  Building,
  Loader2,
  AlertCircle,
  Info,
  ShieldCheck,
  ClipboardCheck,
  History,
  Send,
} from 'lucide-react';

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
          ? 'Resolusi ditolak — tiket dikembalikan ke handler untuk diperbaiki.'
          : 'Tiket ditolak.',
      );
      setTimeout(() => router.push(backHref), 1500);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Gagal memproses penolakan.');
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            <span>Kembali</span>
          </Link>
        </Button>

        <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} readOnly />
      </div>

      {/* Ticket Brief Header */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{ticket.id}</span>
                <span>•</span>
                <span>
                  {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{ticket.subject}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge ticketType={ticket.ticketType} />
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-muted-foreground" />
              <span>
                Pelapor:{' '}
                <strong className="font-semibold text-foreground">
                  {ticket.reporterName} ({ticket.reporterPhone})
                </strong>
              </span>
            </div>
            {ticket.soNumber && (
              <div className="flex items-center gap-1.5">
                <FileText className="size-4 text-muted-foreground" />
                <span>
                  SO: <strong className="font-semibold text-foreground">{ticket.soNumber}</strong>
                </span>
              </div>
            )}
            {ticket.salesName && (
              <div className="flex items-center gap-1.5">
                <User className="size-4 text-muted-foreground" />
                <span>
                  Sales: <strong className="font-semibold text-foreground">{ticket.salesName}</strong>
                </span>
              </div>
            )}
            {ticket.productLine && (
              <div className="flex items-center gap-1.5">
                <Truck className="size-4 text-muted-foreground" />
                <span>
                  Lini Produk:{' '}
                  <strong className="font-semibold text-foreground">{ticket.productLine}</strong>
                </span>
              </div>
            )}
            {ticket.vehicleModel && (
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-muted-foreground" />
                <span>
                  Model Kendaraan:{' '}
                  <strong className="font-semibold text-foreground">{ticket.vehicleModel}</strong>
                </span>
              </div>
            )}
            {ticket.customerData?.name && (
              <div className="flex items-center gap-1.5">
                <Building className="size-4 text-muted-foreground" />
                <span>
                  Customer:{' '}
                  <strong className="font-semibold text-foreground">{ticket.customerData.name}</strong>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 min-w-0 lg:grid-cols-3">
        {/* Kolom kiri: data tiket (read-only) */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-muted-foreground" />
                Data Laporan (Read-Only)
              </CardTitle>
              <CardDescription className="text-xs">
                {isFinal
                  ? 'Data tiket & resolusi yang diajukan handler untuk persetujuan penutupan.'
                  : 'Data laporan sebagaimana diajukan pelapor dan diteruskan reviewer.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">Kategori</span>
                  <span className="text-sm font-medium">{ticket.category}</span>
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">Sub Kategori</span>
                  <span className="text-sm font-medium">{ticket.subcategory || '-'}</span>
                </div>
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Deskripsi</span>
                <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
              </div>

              {isClaim && (ticket.soNumber || ticket.salesName) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <span className="mb-1 block text-xs font-semibold text-muted-foreground">No. SO</span>
                      <span className="text-sm font-medium">{ticket.soNumber ?? '-'}</span>
                    </div>
                    <div>
                      <span className="mb-1 block text-xs font-semibold text-muted-foreground">Nama Sales</span>
                      <span className="text-sm font-medium">{ticket.salesName ?? '-'}</span>
                    </div>
                  </div>
                </>
              )}

              {isVehicleCategory && (ticket.productLine || ticket.vehicleModel) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <span className="mb-1 block text-xs font-semibold text-muted-foreground">Lini Produk</span>
                      <span className="text-sm font-medium">{ticket.productLine ?? '-'}</span>
                    </div>
                    <div>
                      <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Model Kendaraan
                      </span>
                      <span className="text-sm font-medium">{ticket.vehicleModel ?? '-'}</span>
                    </div>
                  </div>
                </>
              )}

              {isClaim && ticket.claimedItems && ticket.claimedItems.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Truck className="size-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Informasi Barang Claim</span>
                    </div>
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="size-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          Aksi yang Harus Dilakukan Handler
                        </span>
                      </div>
                      <div className="rounded-lg border bg-muted/40 p-3">
                        <div className="text-sm font-semibold text-foreground">{action.label}</div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Resolusi handler — khusus persetujuan penutupan */}
              {isFinal && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-foreground">
                        Resolusi yang Diajukan Handler
                      </span>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                      <div>
                        <span className="block text-xs font-semibold text-muted-foreground">Handler</span>
                        <span className="text-sm font-medium">{ticket.handlerName ?? '-'}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-muted-foreground">
                          Ringkasan Resolusi
                        </span>
                        <p className="whitespace-pre-wrap text-sm">
                          {ticket.resolutionSummary ?? 'Belum ada ringkasan resolusi.'}
                        </p>
                      </div>
                      {ticket.resolutionDetail && (
                        <div>
                          <span className="block text-xs font-semibold text-muted-foreground">
                            Detail Resolusi
                          </span>
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {ticket.resolutionDetail}
                          </p>
                        </div>
                      )}
                      {ticket.resolutionAttachments && ticket.resolutionAttachments.length > 0 && (
                        <div>
                          <span className="block text-xs font-semibold text-muted-foreground mb-2">
                            Lampiran Resolusi
                          </span>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {ticket.resolutionAttachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-lg border bg-card p-2.5 transition-colors hover:bg-accent"
                              >
                                <Paperclip className="size-4 shrink-0 text-primary" />
                                <span className="flex-1 truncate text-sm font-medium">{att.name}</span>
                                <span className="text-[10px] text-muted-foreground">{att.size}</span>
                              </a>
                            ))}
                          </div>
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <History className="size-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        Progres Pengerjaan Handler
                      </span>
                    </div>
                    <div className="relative space-y-4 pl-6">
                      <div className="absolute bottom-1.5 left-[11px] top-1.5 w-px bg-border" />
                      {ticket.handlerProgress.map((p) => (
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
                  </div>
                </>
              )}

              {ticket.attachments && ticket.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="mb-2 block text-xs font-semibold text-foreground">Lampiran Pelapor</span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {ticket.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-lg border bg-card p-2.5 transition-colors hover:bg-accent"
                        >
                          <Paperclip className="size-4 shrink-0 text-primary" />
                          <span className="flex-1 truncate text-sm font-medium">{att.name}</span>
                          <span className="text-[10px] text-muted-foreground">{att.size}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan: aksi approver */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                {isFinal ? 'Persetujuan Penutupan' : 'Persetujuan Tiket'}
              </CardTitle>
              <CardDescription className="text-xs">
                {readOnly
                  ? 'Detail keputusan yang pernah Anda buat untuk tiket ini.'
                  : isFinal
                    ? 'Setujui penutupan tiket bila resolusi handler sudah sesuai, atau tolak untuk mengembalikannya ke handler.'
                    : 'Setujui tiket untuk diteruskan ke unit teknis, atau tolak pengajuannya.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Ringkasan Persetujuan
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <span className="block text-muted-foreground">Tujuan Eskalasi</span>
                    <span className="font-semibold">
                      {ticket.approvalTarget
                        ? APPROVAL_TYPE_LABEL[ticket.approvalTarget] ?? ticket.approvalTarget
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Unit Tujuan</span>
                    <span className="font-semibold">
                      {ticket.destinationDepartmentName || ticket.assignedUnit || '-'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-muted-foreground">Prioritas</span>
                    <span className="font-semibold">{ticket.priority ?? 'Belum ditentukan'}</span>
                  </div>
                </div>
              </div>

              {showRejectForm && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-foreground">
                    Alasan Penolakan <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={
                      isFinal
                        ? 'Jelaskan mengapa resolusi handler ditolak — tiket akan dikembalikan ke handler.'
                        : 'Jelaskan mengapa tiket ini ditolak.'
                    }
                    className="min-h-24"
                    disabled={submitting}
                  />
                </div>
              )}

              {readOnly ? (
                /* ── Mode riwayat: tidak ada aksi, hanya ringkasan keputusan ── */
                <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    {ticket.rejectionReason ? (
                      <XCircle className="size-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    )}
                    <span className="font-semibold text-foreground">
                      {ticket.rejectionReason ? 'Tiket Ditolak' : 'Tiket Disetujui'}
                    </span>
                  </div>
                  {ticket.rejectionReason && (
                    <p className="leading-relaxed text-muted-foreground">{ticket.rejectionReason}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Tiket ini sudah pernah Anda proses. Lihat detail data tiket di kolom kiri.
                  </p>
                </div>
              ) : showRejectForm ? (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setConfirmAction('reject')}
                    disabled={submitting}
                    variant="destructive"
                    className="flex-1 gap-2 text-xs font-semibold"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                    <span>Konfirmasi Tolak</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                    disabled={submitting}
                    variant="outline"
                    className="text-xs font-semibold"
                  >
                    Batal
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setConfirmAction('approve')}
                    disabled={submitting}
                    className="flex-1 gap-2 text-xs font-semibold"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    <span>{isFinal ? 'Setujui Penutupan' : 'Setujui Tiket'}</span>
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(true)}
                    disabled={submitting}
                    variant="destructive"
                    className="gap-2 text-xs font-semibold"
                  >
                    <XCircle className="size-4" />
                    <span>Tolak</span>
                  </Button>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                <span>
                  {isFinal
                    ? 'Menolak penutupan berarti resolusi handler ditolak & tiket dikembalikan ke handler sebagai permintaan perbaikan.'
                    : 'Penolakan tiket memerlukan alasan yang akan diteruskan ke pelapor dan reviewer.'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TicketTimeline activities={ticket.activities} />

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
