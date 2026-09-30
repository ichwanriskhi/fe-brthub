'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyTicket } from '@/lib/api/tickets';
import type { Ticket } from '@/lib/types/ticket';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Building,
  ClipboardCheck,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  User,
  Phone,
  MapPin,
  FileOutput,
  RefreshCwIcon,
  Clock,
  Hammer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const STAGES = [
  { key: 'OPEN', label: 'Dibuat', desc: 'Laporan berhasil dibuat & dikirim' },
  { key: 'IN_PROGRESS', label: 'Diproses', desc: 'Tim sedang memverifikasi & menindaklanjuti' },
  { key: 'PENDING_REVIEW', label: 'Tinjauan Akhir', desc: 'Menunggu konfirmasi penyelesaian' },
  { key: 'CLOSED', label: 'Selesai', desc: 'Laporan telah ditutup & diselesaikan' },
];

function getStageIndex(status: string) {
  switch (status) {
    case 'OPEN': return 0;
    case 'IN_PROGRESS': return 1;
    case 'PENDING_REVIEW': return 2;
    case 'CLOSED': return 3;
    case 'REWORK_REQUIRED': return 1;
    case 'REJECTED': return -1;
    default: return 0;
  }
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [showAllProgress, setShowAllProgress] = useState(false);

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
        setLoadError(error instanceof Error ? error.message : 'Gagal memuat detail laporan.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading || !ticket) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {isLoading ? 'Memuat detail laporan…' : loadError ?? 'Laporan tidak ditemukan.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const PROGRESS_SHOW_LIMIT = 3;

  const currentStageIndex = getStageIndex(ticket.status);
  const isRejected = ticket.status === 'REJECTED';
  const isClosed = ticket.status === 'CLOSED';

  // Ambil resolusi terakhir yang sudah disetujui (APPROVED) untuk ditampilkan ke reporter
  const approvedResolutions = (ticket.resolutions ?? []).filter((r) => r.reviewDecision === 'APPROVED');
  const latestApprovedResolution = approvedResolutions.length > 0
    ? approvedResolutions[approvedResolutions.length - 1]
    : null;
  const hasResolution = isClosed && latestApprovedResolution !== null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      {/* ── Top Action Bar ── */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/laporan">
            <ArrowLeft className="size-4" />
            <span>Kembali</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {/* Surat Keluar — hanya muncul saat CLOSED */}
          {isClosed && (
            <Button variant="outline" size="sm" className="gap-2 font-medium">
              <FileOutput className="size-4" />
              <span className="hidden sm:inline">Surat Keluar</span>
              <span className="sm:hidden">Surat</span>
            </Button>
          )}

          <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
        </div>
      </div>

      {/* ── Header Info ── */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{ticket.id}</span>
                <span>•</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{ticket.subject}</h1>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 border-t pt-4 text-xs text-muted-foreground">
            {ticket.isReportForCustomer && ticket.customerData?.name && (
              <div className="flex items-center gap-1.5">
                <Building className="size-4 text-muted-foreground" />
                <span>Pelanggan: <strong className="font-semibold text-foreground">{ticket.customerData.name}</strong></span>
              </div>
            )}
            {ticket.category === 'Klaim Distribusi & Pengiriman' && ticket.soNumber && (
              <div className="flex items-center gap-1.5">
                <FileText className="size-4 text-muted-foreground" />
                <span>SO: <strong className="font-semibold text-foreground">{ticket.soNumber}</strong></span>
              </div>
            )}
            {ticket.category === 'Klaim Distribusi & Pengiriman' && ticket.salesName && (
              <div className="flex items-center gap-1.5">
                <User className="size-4 text-muted-foreground" />
                <span>Sales: <strong className="font-semibold text-foreground">{ticket.salesName}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-muted-foreground" />
              <span>Pelapor: <strong className="font-semibold text-foreground">{ticket.reporterName}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Status Stepper Timeline ── */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck className="size-4 text-muted-foreground" />
            Progres Penanganan Tiket
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isRejected ? (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Laporan Ditolak</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Laporan tidak memenuhi kriteria verifikasi atau informasi tidak sesuai. Silakan periksa pesan dari tim reviewer di tombol diskusi.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {STAGES.map((stage, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <div key={stage.key} className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div
                          className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : isCurrent
                              ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="size-3.5" /> : idx + 1}
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            isCurrent
                              ? 'text-primary'
                              : isDone
                              ? 'text-emerald-700'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {stage.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {stage.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Progres Pengerjaan Handler (timeline) ── */}
      {ticket.handlerProgress && ticket.handlerProgress.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Hammer className="size-4 text-muted-foreground" />
              Progres Pengerjaan Handler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-4 pl-6">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-1.5 bottom-1.5 w-px bg-border" />
              {(showAllProgress
                ? ticket.handlerProgress
                : ticket.handlerProgress.slice(0, PROGRESS_SHOW_LIMIT)
              ).map((p) => (
                <div key={p.id} className="relative">
                  {/* Dot */}
                  <div className="absolute left-[-18px] top-1.5 size-2.5 rounded-full border-2 border-primary bg-primary" />
                  <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground">
                        {ticket.handlerName ?? 'Handler'}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="size-3" />
                        {p.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{p.note}</p>
                    {p.attachments && p.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {p.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[10px] hover:bg-accent transition-colors"
                          >
                            <Paperclip className="size-3 text-primary" />
                            {att.name}
                            <span className="text-muted-foreground">{att.size}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* ── Show More button ── */}
            {ticket.handlerProgress.length > PROGRESS_SHOW_LIMIT && (
              <button
                onClick={() => setShowAllProgress((v) => !v)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
              >
                {showAllProgress ? (
                  <><ChevronUp className="size-3.5" /> Sembunyikan</>
                ) : (
                  <><ChevronDown className="size-3.5" /> Tampilkan {ticket.handlerProgress.length - PROGRESS_SHOW_LIMIT} progres lainnya</>
                )}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════ */}
      {/*  HASIL RESOLUSI (oleh Handler)           */}
      {/* ════════════════════════════════════════ */}
      {hasResolution && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardCheck className="size-4 text-muted-foreground" />
                Hasil Resolusi
              </CardTitle>
              {ticket.handlerName && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Oleh: {ticket.handlerName}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ringkasan */}
            <div>
              <span className="text-xs font-semibold text-foreground block mb-1">Ringkasan Tindakan</span>
              <p className="text-sm text-muted-foreground leading-relaxed bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                {latestApprovedResolution?.summary}
              </p>
            </div>

            {/* Detail */}
            {latestApprovedResolution?.detail && (
              <>
                <Separator />
                <div>
                  <span className="text-xs font-semibold text-foreground block mb-1">Detail Penyelesaian</span>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {latestApprovedResolution.detail}
                  </p>
                </div>
              </>
            )}

            {/* Lampiran Resolusi */}
            {latestApprovedResolution?.attachments && latestApprovedResolution.attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <span className="text-xs font-semibold text-foreground block mb-2">
                    Lampiran Bukti Penyelesaian ({latestApprovedResolution.attachments.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {latestApprovedResolution.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors text-xs"
                      >
                        <Paperclip className="size-4 shrink-0 text-emerald-600" />
                        <span className="font-medium truncate flex-1">{att.name}</span>
                        <span className="text-[10px] text-muted-foreground">{att.size}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Ticket Details & Lampiran Grid ── */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Detail Rincian (2/3) */}
        <Card className="md:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4 text-muted-foreground" />
              Rincian Laporan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Kategori Kendala</span>
                <span className="font-semibold text-foreground">{ticket.category} ({ticket.subcategory})</span>
              </div>
              {ticket.category === 'Produk & Kendaraan' && (
                <>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Model Kendaraan / Armada</span>
                    <span className="font-semibold text-foreground">{ticket.vehicleModel || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Lini Produk</span>
                    <span className="font-semibold text-foreground">{ticket.productLine || '-'}</span>
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div>
              <span className="text-xs text-muted-foreground block mb-1">Deskripsi Lengkap</span>
              <p className="text-xs md:text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-3.5 rounded-lg border">
                {ticket.description}
              </p>
            </div>

            {ticket.claimedItems && ticket.claimedItems.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-foreground block mb-2">Informasi Barang Claim</span>
                <ClaimItemsTable items={ticket.claimedItems} />
              </div>
            )}

            {ticket.attachments && ticket.attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground block mb-2">Lampiran Bukti ({ticket.attachments.length})</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ticket.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors text-xs"
                      >
                        <Paperclip className="size-4 shrink-0 text-primary" />
                        <span className="font-medium truncate flex-1">{att.name}</span>
                        <span className="text-[10px] text-muted-foreground">{att.size}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          <Card className="bg-muted/20 border-dashed">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4 text-muted-foreground" />
                Diskusi / Bantuan Laporan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Butuh memberikan klarifikasi atau menanyakan status terkini kepada reviewer? Gunakan fitur percakapan langsung.
              </p>
              <Button
                onClick={() => setChatOpen(true)}
                className="w-full gap-2 text-xs font-semibold"
              >
                <MessageSquare className="size-4" />
                <span>Buka Diskusi Tiket</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="size-4 text-muted-foreground" />
                Informasi Kontak Pelapor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><User className="size-3.5" /> Nama:</span>
                <span className="font-medium text-foreground">{ticket.reporterName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Phone className="size-3.5" /> Telepon:</span>
                <span className="font-medium text-foreground">{ticket.reporterPhone}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1.5 shrink-0"><MapPin className="size-3.5" /> Alamat:</span>
                <span className="font-medium text-foreground text-right truncate">{ticket.reporterAddress}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
