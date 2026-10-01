'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Ticket, TicketAttachment } from '@/lib/types/ticket';
import type { HandlerProgressEntry } from '@/lib/api/handler';
import { getAdminTicketDetail } from '@/lib/api/admin-ticket-monitoring';
import { UserDetailModal, type UserDetailData } from '@/components/shared/UserDetailModal';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { TicketTimeline } from '@/components/shared/TicketTimeline';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { RevisionDiff } from '@/components/shared/RevisionDiff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ClipboardCheck,
  History,
  User,
  Building,
  FileText,
  MessageSquare,
  Paperclip,
  Truck,
  UserCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';

/**
 * Detail tiket admin — view-only, menampilkan semua data yang tersedia:
 * rincian laporan, progress handler, resolusi, lampiran, dan riwayat revisi.
 */
export function AdminTicketDetail({
  id,
  backHref,
  backLabel,
}: {
  id: string;
  backHref: string;
  backLabel: string;
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

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

  const fetchTicket = () => {
    setLoading(true);
    setError(null);
    getAdminTicketDetail(id)
      .then(setTicket)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Gagal memuat tiket.'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <AdminTicketDetailSkeleton />;

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="size-8 text-muted-foreground/60" />
        <p className="text-sm font-medium text-destructive">{error ?? 'Tiket tidak ditemukan.'}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-4" /> Kembali ke {backLabel}
          </Link>
        </Button>
      </div>
    );
  }

  /** Link ke profil pelapor */
  const reporterProfileHref: string | null = ticket.reporterEmployeeId
    ? `/admin/pegawai?search=${encodeURIComponent(ticket.reporterName)}`
    : ticket.reporterCustomerId
      ? `/admin/pelanggan?search=${encodeURIComponent(ticket.reporterName)}`
      : null;

  const progressList = (ticket.handlerProgress ?? []) as HandlerProgressEntry[];
  const resolutions = (ticket.resolutions ?? []) as Array<{
    id: string;
    resolutionNo: number;
    summary: string;
    detail: string;
    submittedAt: string;
    reviewDecision: 'PENDING' | 'APPROVED' | 'REJECTED';
  }>;

  type DecisionStyle = { label: string; className: string; icon: React.ReactNode };
  const DECISION_STYLE: Record<string, DecisionStyle> = {
    PENDING: {
      label: 'Menunggu',
      className: 'text-amber-600',
      icon: <Clock className="size-3" />,
    },
    APPROVED: {
      label: 'Disetujui',
      className: 'text-emerald-600',
      icon: <CheckCircle2 className="size-3" />,
    },
    REJECTED: {
      label: 'Ditolak',
      className: 'text-destructive',
      icon: <XCircle className="size-3" />,
    },
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            <span>Kembali ke {backLabel}</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTicket}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <TicketChatDrawer
            ticketId={ticket.id}
            open={chatOpen}
            onOpenChange={setChatOpen}
          />
        </div>
      </div>

      {/* Header Card */}
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
              {ticket.priority && <PriorityBadge priority={ticket.priority} />}
              <TypeBadge ticketType={ticket.ticketType} />
              <StatusBadge status={ticket.status} />
              <Badge variant="outline" className="gap-1 text-xs">
                <Eye className="size-3" />
                View Only
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-muted-foreground" />
              <span>
                Pelapor:{' '}
                <strong className="font-semibold text-foreground">{ticket.reporterName}</strong>
              </span>
            </div>
            {ticket.handlerName && (
              <div className="flex items-center gap-1.5">
                <UserCheck className="size-4 text-muted-foreground" />
                <span>
                  Handler:{' '}
                  <strong className="font-semibold text-foreground">{ticket.handlerName}</strong>
                </span>
              </div>
            )}
            {ticket.assignedUnit && (
              <div className="flex items-center gap-1.5">
                <Building className="size-4 text-muted-foreground" />
                <span>
                  Unit:{' '}
                  <strong className="font-semibold text-foreground">{ticket.assignedUnit}</strong>
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <FileText className="size-4 text-muted-foreground" />
              <span>
                Kategori:{' '}
                <strong className="font-semibold text-foreground">{ticket.category}</strong>
                {ticket.subcategory && ticket.subcategory !== '-' && (
                  <>
                    {' '}
                    ›{' '}
                    <strong className="font-semibold text-foreground">{ticket.subcategory}</strong>
                  </>
                )}
              </span>
            </div>
            {ticket.soNumber && (
              <div className="flex items-center gap-1.5">
                <FileText className="size-4 text-muted-foreground" />
                <span>
                  SO:{' '}
                  <strong className="font-semibold text-foreground">{ticket.soNumber}</strong>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Kolom kiri: Laporan + Progress + Resolusi */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rincian Laporan */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-muted-foreground" />
                Rincian Laporan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Subjek</p>
                <p className="text-sm font-medium">{ticket.subject}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Deskripsi / Ruang Lingkup
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {ticket.description || '-'}
                </p>
              </div>

              {(ticket.productLine || ticket.vehicleModel) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ticket.productLine && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Lini Produk
                        </p>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Truck className="size-3.5 text-muted-foreground shrink-0" />
                          {ticket.productLine}
                        </div>
                      </div>
                    )}
                    {ticket.vehicleModel && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Model Kendaraan
                        </p>
                        <p className="text-sm">{ticket.vehicleModel}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {(ticket.soNumber || ticket.salesName) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ticket.soNumber && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">No. SO</p>
                        <p className="text-sm font-mono">{ticket.soNumber}</p>
                      </div>
                    )}
                    {ticket.salesName && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Nama Sales
                        </p>
                        <p className="text-sm">{ticket.salesName}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {ticket.claimedItems && ticket.claimedItems.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">
                      Informasi Barang Claim
                    </p>
                    <ClaimItemsTable items={ticket.claimedItems} />
                  </div>
                </>
              )}

              {ticket.attachments && ticket.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">
                      Lampiran Pelapor ({ticket.attachments.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ticket.attachments.map((att: TicketAttachment) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors"
                        >
                          <Paperclip className="size-4 text-primary shrink-0" />
                          <span className="font-medium truncate flex-1 text-sm">{att.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {att.size}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Progress Handler */}
          {progressList.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4 text-muted-foreground" />
                  Progress Pengerjaan Handler
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {progressList.length} entri
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative space-y-4 pl-6">
                  <div className="absolute bottom-1.5 left-[11px] top-1.5 w-px bg-border" />
                  {progressList.map((p) => (
                    <div key={p.id} className="relative">
                      <div className="absolute -left-[18px] top-1.5 size-2.5 rounded-full border-2 border-primary bg-primary" />
                      <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-xs font-semibold">{p.actorName ?? 'Handler'}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {p.timestamp
                              ? new Date(p.timestamp).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                          {p.note}
                        </p>
                        {p.attachments && p.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
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
                                  <Paperclip className="size-3.5 shrink-0" />
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolusi Handler */}
          {resolutions.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ClipboardCheck className="size-4 text-muted-foreground" />
                  Resolusi yang Diajukan
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {resolutions.length} resolusi
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {resolutions.map((r, idx) => {
                  const style = DECISION_STYLE[r.reviewDecision] ?? DECISION_STYLE.PENDING;
                  return (
                    <div key={r.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          Resolusi #{r.resolutionNo ?? idx + 1}
                        </span>
                        <div
                          className={`flex items-center gap-1 text-xs font-medium ${style.className}`}
                        >
                          {style.icon}
                          {style.label}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Ringkasan
                        </p>
                        <p className="text-sm leading-relaxed">{r.summary}</p>
                      </div>
                      {r.detail && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Detail</p>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.detail}</p>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Diajukan:{' '}
                        {r.submittedAt
                          ? new Date(r.submittedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '-'}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Riwayat Revisi Reviewer */}
          {ticket.latestRevision && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4 text-muted-foreground" />
                  Riwayat Revisi Reviewer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Revisi #{ticket.latestRevision.revisionNo} —{' '}
                  {new Date(ticket.latestRevision.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                {ticket.latestRevision.notes && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground">Catatan reviewer</p>
                    <p className="text-xs text-foreground">{ticket.latestRevision.notes}</p>
                  </div>
                )}
                <RevisionDiff changes={ticket.latestRevision.changes} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kolom kanan */}
        <div className="space-y-6 min-w-0">
          {/* Info Tiket */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-muted-foreground" />
                Info Tiket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Tipe</span>
                <TypeBadge ticketType={ticket.ticketType} />
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Kategori</span>
                <span className="text-foreground text-right">{ticket.category}</span>
              </div>
              {ticket.subcategory && ticket.subcategory !== '-' && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Sub Kategori</span>
                  <span className="text-foreground text-right">{ticket.subcategory}</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Prioritas</span>
                {ticket.priority ? (
                  <PriorityBadge priority={ticket.priority} />
                ) : (
                  <span className="text-muted-foreground italic">Belum ditentukan</span>
                )}
              </div>
              {ticket.approvalTarget && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Target Approval</span>
                  <span className="text-foreground text-right">{ticket.approvalTarget}</span>
                </div>
              )}
              {ticket.destinationDepartmentName && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Unit Tujuan</span>
                  <span className="text-foreground text-right">
                    {ticket.destinationDepartmentName}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Dibuat</span>
                <span className="text-foreground">
                  {new Date(ticket.createdAt).toLocaleDateString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Diperbarui</span>
                <span className="text-foreground">
                  {new Date(ticket.updatedAt).toLocaleDateString('id-ID')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Informasi Pelapor */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <UserCheck className="size-4 text-muted-foreground" />
                Informasi Pelapor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-4" />
                </div>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={openReporterDetail}
                    className="text-sm font-medium hover:underline text-left"
                  >
                    {ticket.reporterName}
                  </button>
                  {ticket.reporterPhone && (
                    <p className="font-mono text-xs text-muted-foreground">{ticket.reporterPhone}</p>
                  )}
                  {ticket.reporterAddress && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      {ticket.reporterAddress}
                    </p>
                  )}
                </div>
              </div>

              {reporterProfileHref && (
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" asChild>
                  <Link href={reporterProfileHref}>
                    <Search className="size-3.5" />
                    Lihat Profil Pelapor
                  </Link>
                </Button>
              )}

              {ticket.isReportForCustomer && ticket.customerData && (
                <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground mb-1">Data Customer</p>
                  <button
                    type="button"
                    onClick={openCustomerDetail}
                    className="text-foreground hover:underline text-left"
                  >
                    {ticket.customerData.name}
                  </button>
                  {ticket.customerData.phone && (
                    <p className="font-mono text-muted-foreground">{ticket.customerData.phone}</p>
                  )}
                  {ticket.customerData.address && (
                    <p className="text-muted-foreground leading-relaxed">
                      {ticket.customerData.address}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Riwayat Penugasan Handler */}
          {ticket.handlerAssignments && ticket.handlerAssignments.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Building className="size-4 text-muted-foreground" />
                  Riwayat Penugasan Handler
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {ticket.handlerAssignments.map((a) => (
                  <div key={a.id} className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">{a.handlerName ?? '-'}</span>
                      {a.isActive && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                          Aktif
                        </Badge>
                      )}
                    </div>
                    {a.assignedByName && (
                      <p className="text-muted-foreground">Ditugaskan oleh: {a.assignedByName}</p>
                    )}
                    {a.assignedAt && (
                      <p className="text-muted-foreground">
                        {new Date(a.assignedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Diskusi */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4 text-muted-foreground" />
                Diskusi Tiket
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Button
                onClick={() => setChatOpen(true)}
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground justify-center gap-2"
              >
                <MessageSquare className="size-4 text-primary" />
                <span>Baca Diskusi</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <TicketTimeline activities={ticket.activities} />

      <UserDetailModal
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
        title={userDetailTitle}
        user={userDetailData}
      />
    </div>
  );
}

/** Skeleton loading */
function AdminTicketDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="h-8 w-40 bg-muted/40 rounded" />
        <div className="h-8 w-32 bg-muted/40 rounded" />
      </div>
      <Card className="h-40 bg-muted/40" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-80 bg-muted/40" />
          <Card className="h-60 bg-muted/40" />
        </div>
        <div className="space-y-6">
          <Card className="h-48 bg-muted/40" />
          <Card className="h-32 bg-muted/40" />
          <Card className="h-32 bg-muted/40" />
        </div>
      </div>
    </div>
  );
}
