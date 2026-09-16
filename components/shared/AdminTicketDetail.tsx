'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { MOCK_PENDING_REPORTERS, MOCK_EMPLOYEES, MOCK_CUSTOMERS } from '@/lib/mock/admin';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { IdentifyReporterModal, type IdentifyReporterResult } from '@/components/shared/IdentifyReporterModal';
import { ReportDetailModal } from '@/components/shared/ReportDetailModal';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  History,
  User,
  Building,
  FileText,
  MessageSquare,
  Paperclip,
  UserCheck,
  CircleHelp,
  Search,
} from 'lucide-react';

/** Page Tiket detail admin (read-only) — dipakai action/monitoring/history. */
export function AdminTicketDetail({ id, backHref, backLabel }: { id: string; backHref: string; backLabel: string }) {
  const ticket = MOCK_TICKETS.find((t) => t.id === id) || MOCK_TICKETS[0];

  const [chatOpen, setChatOpen] = useState(false);
  const [identifyOpen, setIdentifyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const pendingReporter = MOCK_PENDING_REPORTERS.find(
    (p) => p.ticketId === ticket.id && p.status === 'PENDING'
  );

  const resolutionAttachments = ticket.resolutionAttachments ?? [];

  /** Link ke profil pelapor (pegawai / customer) */
  const reporterProfileHref: string | null = ticket.reporterEmployeeId
    ? `/admin/pegawai?search=${encodeURIComponent(
        MOCK_EMPLOYEES.find((e) => e.id === ticket.reporterEmployeeId)?.name ?? ''
      )}`
    : ticket.reporterCustomerId
    ? `/admin/pelanggan?search=${encodeURIComponent(
        MOCK_CUSTOMERS.find((c) => c.id === ticket.reporterCustomerId)?.name ?? ''
      )}`
    : null;

  return (
    <div className="space-y-6 min-w-0">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            <span>Kembali ke {backLabel}</span>
          </Link>
        </Button>

        <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} readOnly />
      </div>

      {/* Header Card */}
      <Card>
        <CardContent className="space-y-3 pt-6">
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

          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="size-4" />
              <span>Handler: <strong className="text-foreground">{ticket.handlerName ?? '-'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building className="size-4" />
              <span>Unit: <strong className="text-foreground">{ticket.assignedUnit ?? '-'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="size-4" />
              <span>Kategori: <strong className="text-foreground">{ticket.category}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">SO: <strong className="text-foreground">{ticket.soNumber ?? '-'}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Kolom kiri: Info + Reporter */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reporter Identification */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                Informasi Reporter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {/* Reporter info row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{ticket.reporterName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{ticket.reporterPhone}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ticket.reporterAddress}</p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {/* Badge status identifikasi */}
                  {pendingReporter ? (
                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <CircleHelp className="size-3" />
                      Pending ID
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="size-3" />
                      Teridentifikasi
                    </Badge>
                  )}

                  {/* Tombol lihat profil pelapor */}
                  {reporterProfileHref && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                      <Link href={reporterProfileHref}>
                        <Search className="size-3.5" />
                        Lihat Pelapor
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Customer info (bila laporan untuk customer) */}
              {ticket.isReportForCustomer && ticket.customerData && (
                <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground text-xs mb-1">Data Customer</p>
                  <p className="text-foreground">{ticket.customerData.name}</p>
                  <p className="font-mono text-muted-foreground">{ticket.customerData.phone}</p>
                  <p className="text-muted-foreground leading-relaxed">{ticket.customerData.address}</p>
                </div>
              )}

              {pendingReporter && (
                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  Reporter ini belum terhubung ke data pegawai/customer. Klik tombol di bawah untuk mengidentifikasi.
                </div>
              )}

              {pendingReporter && (
                <Button onClick={() => setIdentifyOpen(true)} className="w-full gap-2">
                  <UserCheck className="size-4" />
                  Identifikasi Reporter
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Claim items */}
          {ticket.claimedItems && ticket.claimedItems.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base font-semibold">Informasi Barang Claim</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ClaimItemsTable items={ticket.claimedItems} />
              </CardContent>
            </Card>
          )}

          {/* Progres handler */}
          {ticket.handlerProgress && ticket.handlerProgress.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <History className="size-4 text-muted-foreground" />
                  Progres Pengerjaan Handler
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative space-y-4 pl-6">
                  <div className="absolute bottom-1.5 left-[11px] top-1.5 w-px bg-border" />
                  {ticket.handlerProgress.map((p) => (
                    <div key={p.id} className="relative">
                      <div className="absolute -left-[18px] top-1.5 size-2.5 rounded-full border-2 border-primary bg-primary" />
                      <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-xs font-semibold">Handler</span>
                          <span className="text-[10px] text-muted-foreground">{p.timestamp}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-foreground">{p.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolusi */}
          {ticket.resolutionSummary && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base font-semibold">Resolusi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <p className="p-3 rounded-lg bg-muted/40 border text-xs md:text-sm leading-relaxed">
                  {ticket.resolutionSummary}
                </p>
                {ticket.resolutionDetail && (
                  <p className="p-3 rounded-lg bg-muted/40 border text-xs md:text-sm leading-relaxed">
                    {ticket.resolutionDetail}
                  </p>
                )}
                {resolutionAttachments.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-2">Bukti Lampiran ({resolutionAttachments.length})</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {resolutionAttachments.map((att) => (
                        <a key={att.id} href={att.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors">
                          <Paperclip className="size-4 text-primary shrink-0" />
                          <span className="font-medium truncate flex-1 text-sm">{att.name}</span>
                          <span className="text-[10px] text-muted-foreground">{att.size}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kolom kanan: Info tiket + chat */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Info Tiket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipe</span>
                <span className="text-foreground">{ticket.ticketType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kategori</span>
                <span className="text-foreground">{ticket.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subkategori</span>
                <span className="text-foreground">{ticket.subcategory}</span>
              </div>
              {ticket.productLine && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lini Produk</span>
                  <span className="text-foreground">{ticket.productLine}</span>
                </div>
              )}
              {ticket.vehicleModel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model Kendaraan</span>
                  <span className="text-foreground">{ticket.vehicleModel}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dibuat</span>
                <span className="text-foreground">{new Date(ticket.createdAt).toLocaleDateString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Terupdat</span>
                <span className="text-foreground">{new Date(ticket.updatedAt).toLocaleDateString('id-ID')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
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

      {/* Identify Reporter modal */}
      {pendingReporter && (
        <IdentifyReporterModal
          open={identifyOpen}
          onOpenChange={setIdentifyOpen}
          reporterName={ticket.reporterName}
          reporterPhone={ticket.reporterPhone}
          onConfirm={(result: IdentifyReporterResult) => {
            // Mock: tulis hasil ke tiket di memory
            ticket.reporterType = result.reporterType;
            ticket.reporterEmployeeId = result.reporterEmployeeId;
            ticket.reporterCustomerId = result.reporterCustomerId;
            const pending = MOCK_PENDING_REPORTERS.find((p) => p.ticketId === ticket.id);
            if (pending) pending.status = 'DONE';
            setIdentifyOpen(false);
          }}
        />
      )}

      {/* Modal Detail Laporan */}
      <ReportDetailModal ticket={ticket} open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
}
