'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { HANDLER_ACTIONS } from '@/lib/constants/reviewer';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { ReportDetailModal } from '@/components/shared/ReportDetailModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Building,
  FileCheck,
  FileText,
  Truck,
  User,
  RotateCcw,
  ArrowRight,
  Paperclip,
  History,
  ShieldCheck,
  ClipboardCheck,
  Gavel,
} from 'lucide-react';

export default function FinalClosurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const ticket = MOCK_TICKETS.find((t) => t.id === id) || MOCK_TICKETS[0];

  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [closureOpen, setClosureOpen] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);

  const cycles = ticket.resolutionCycles ?? [];
  // Aksi yang ditetapkan reviewer (bukan tebak-tebakan dari subkategori).
  const handlerActionLabel = ticket.handlerActionId
    ? ticket.handlerActionName ??
      HANDLER_ACTIONS.find((a) => a.id === ticket.handlerActionId)?.label
    : undefined;
  const currentCycle = cycles.find((c) => c.isCurrent) ?? cycles[cycles.length - 1];
  const previousCycles = cycles.filter((c) => c.id !== currentCycle?.id);
  const resolutionAttachments = ticket.resolutionAttachments ?? [];

  // Determine closure authority based on approval_target
  const approvalTarget = ticket.approvalTarget ?? 'Direksi';
  const closureAuthority = approvalTarget === 'Direksi' ? 'Direktur' :
                          approvalTarget === 'General Manager' ? 'General Manager' :
                          approvalTarget === 'Operational Manager' ? 'Operational Manager' :
                          'Division Head';

  const handleClosure = () => {
    setClosureOpen(false);
    setActionDone(`Tiket ditutup final oleh ${closureAuthority}.`);
    setTimeout(() => router.push('/reviewer/penutupan'), 1500);
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/reviewer/penutupan">
            <ArrowLeft className="size-4" />
            <span>Kembali</span>
          </Link>
        </Button>

        <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
      </div>

      {actionDone && (
        <div className="bg-emerald-500/10 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 rounded-lg border p-4 text-xs font-semibold">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>{actionDone}</span>
        </div>
      )}

      {/* Brief Header */}
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
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge ticketType={ticket.ticketType} />
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              {handlerActionLabel && (
                <Badge variant="secondary" className="gap-1">
                  <Truck className="size-3" />
                  {handlerActionLabel}
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <Gavel className="size-3" />
                Penutupan Final
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setReportOpen(true)} className="gap-1.5">
                <FileText className="size-3.5" />
                <span>Detail Laporan</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-muted-foreground" />
              <span>Pelapor: <strong className="font-semibold text-foreground">{ticket.reporterName}</strong></span>
            </div>
            {ticket.soNumber && (
              <div className="flex items-center gap-1.5">
                <FileText className="size-4 text-muted-foreground" />
                <span>SO: <strong className="font-semibold text-foreground">{ticket.soNumber}</strong></span>
              </div>
            )}
            {ticket.salesName && (
              <div className="flex items-center gap-1.5">
                <User className="size-4 text-muted-foreground" />
                <span>Sales: <strong className="font-semibold text-foreground">{ticket.salesName}</strong></span>
              </div>
            )}
            {ticket.assignedUnit && (
              <div className="flex items-center gap-1.5">
                <Building className="size-4 text-muted-foreground" />
                <span>Unit: <strong className="font-semibold text-foreground">{ticket.assignedUnit}</strong></span>
              </div>
            )}
            {ticket.handlerName && (
              <div className="flex items-center gap-1.5">
                <User className="size-4 text-muted-foreground" />
                <span>Handler: <strong className="font-semibold text-foreground">{ticket.handlerName}</strong></span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Kolom kiri: evaluasi solusi handler & riwayat verifikasi */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progres Pengerjaan Handler */}
          {(ticket.handlerProgress && ticket.handlerProgress.length > 0) && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4 text-muted-foreground" />
                  Progres Pengerjaan Handler
                </CardTitle>
                <CardDescription className="text-xs">
                  Timeline pekerjaan yang telah dilakukan handler.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        {p.attachments && p.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {p.attachments.map((att) => (
                              <span key={att.id} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[10px]">
                                <Paperclip className="size-3 text-primary" />
                                {att.name}
                                <span className="text-muted-foreground">{att.size}</span>
                              </span>
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

          {/* Resolusi yang diajukan handler */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <ClipboardCheck className="size-4 text-muted-foreground" />
                    Resolusi Diajukan Handler {currentCycle ? `#${currentCycle.cycleNumber}` : ''}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Evaluasi apakah solusi berikut sudah tepat dan sesuai dengan laporan.
                  </CardDescription>
                </div>
                {currentCycle && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{currentCycle.timestamp}</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-foreground block mb-1">Ringkasan Solusi</span>
                <p className="p-3 rounded-lg bg-muted/40 border text-xs md:text-sm leading-relaxed">
                  {currentCycle?.summary ?? ticket.resolutionSummary ?? 'Handler belum mengajukan resolusi.'}
                </p>
              </div>

              {(currentCycle?.detail ?? ticket.resolutionDetail) && (
                <div>
                  <span className="text-xs font-semibold text-foreground block mb-1">Detail Pelaksanaan</span>
                  <p className="p-3 rounded-lg bg-muted/40 border text-xs md:text-sm leading-relaxed">
                    {currentCycle?.detail ?? ticket.resolutionDetail}
                  </p>
                </div>
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

          {/* Riwayat revisi (cycles) */}
          {previousCycles.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <RotateCcw className="size-4 text-muted-foreground" />
                    Riwayat Revisi
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">{cycles.length} siklus</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 border-l-2 ml-2 pl-4">
                  {previousCycles.map((cycle) => (
                    <div key={cycle.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-muted-foreground/40" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Resolusi #{cycle.cycleNumber}</span>
                        <span className="text-xs text-muted-foreground">{cycle.timestamp}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cycle.summary}</p>
                      {cycle.reviewerNote && (
                        <div className="mt-2 p-2.5 rounded-lg border bg-muted/40 text-xs">
                          <span className="font-semibold">Catatan Reviewer:</span>{' '}
                          <span className="text-muted-foreground">{cycle.reviewerNote}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verifikasi Tinjauan Akhir (untuk referensi) */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                Hasil Tinjauan Akhir (Reviewer)
              </CardTitle>
              <CardDescription className="text-xs">
                Referensi keputusan verifikasi resolusi sebelumnya.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 mt-0.5 shrink-0 text-emerald-600" />
                <span>Resolusi disetujui oleh Reviewer pada siklus <strong className="text-foreground">#{currentCycle?.cycleNumber ?? 1}</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <Gavel className="size-3.5 mt-0.5 shrink-0 text-primary" />
                <span>Tiket diteruskan ke <strong className="text-foreground">{closureAuthority}</strong> untuk penutupan final.</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan: keputusan penutupan final */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Gavel className="size-4 text-primary" />
                Penutupan Final
              </CardTitle>
              <CardDescription className="text-xs">
                Otoritas akhir untuk menutup tiket berdasarkan Approval Target.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Otoritas Penutupan
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="block text-muted-foreground">Approval Target</span>
                    <span className="font-semibold">{approvalTarget}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Otoritas Final</span>
                    <span className="font-semibold text-primary">{closureAuthority}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Prioritas</span>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Status Verifikasi</span>
                    <span className="font-semibold text-emerald-600">Disetujui Reviewer</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setClosureOpen(true)}
                  className="flex-1 text-xs font-semibold gap-2 bg-primary hover:bg-primary/90"
                >
                  <CheckCircle2 className="size-4" />
                  <span>Tutup Tiket Final</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info otoritas */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span>Basis Otoritas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <ShieldCheck className="size-3.5 mt-0.5 shrink-0" />
                <span>Penutupan final ditentukan oleh <strong className="text-foreground">{closureAuthority}</strong> sesuai <strong className="text-foreground">Approval Target</strong> yang ditetapkan saat Tinjauan Awal.</span>
              </div>
              <div className="flex items-start gap-2">
                <History className="size-3.5 mt-0.5 shrink-0" />
                <span>Prioritas (A/B/C) hanya menandai urgensi, <strong className="text-foreground">tidak menentukan</strong> alur approval maupun otoritas penutupan.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Detail Laporan */}
      <ReportDetailModal ticket={ticket} open={reportOpen} onOpenChange={setReportOpen} />

      {/* Modal Closure */}
      <Dialog open={closureOpen} onOpenChange={setClosureOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="size-4 text-primary" />
              Tutup Tiket Final
            </DialogTitle>
            <DialogDescription>
              Konfirmasi penutupan final tiket oleh {closureAuthority}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tiket</span>
              <span className="font-mono font-semibold">{ticket.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resolusi disetujui</span>
              <span className="font-semibold">#{currentCycle?.cycleNumber ?? 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prioritas</span>
              <PriorityBadge priority={ticket.priority} />
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Approval Target</span>
              <span className="font-semibold">{approvalTarget}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Otoritas Penutupan</span>
              <span className="font-semibold text-primary">{closureAuthority}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosureOpen(false)}>Batal</Button>
            <Button onClick={handleClosure} className="gap-1.5 bg-primary hover:bg-primary/90">
              Tutup Tiket
              <ArrowRight data-icon="inline-end" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}