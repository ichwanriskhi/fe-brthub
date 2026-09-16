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
} from 'lucide-react';

export default function ResolutionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const ticket = MOCK_TICKETS.find((t) => t.id === id) || MOCK_TICKETS[0];

  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reworkOpen, setReworkOpen] = useState(false);
  const [closureOpen, setClosureOpen] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [actionDone, setActionDone] = useState<string | null>(null);

  const cycles = ticket.resolutionCycles ?? [];
  const handlerActionLabel = HANDLER_ACTIONS.find((a) =>
    (a.recommendedFor as readonly string[]).includes(ticket.subcategory)
  )?.label;
  const currentCycle = cycles.find((c) => c.isCurrent) ?? cycles[cycles.length - 1];
  const previousCycles = cycles.filter((c) => c.id !== currentCycle?.id);
  const resolutionAttachments = ticket.resolutionAttachments ?? [];

  const handleRework = () => {
    if (!reworkReason.trim()) return;
    setReworkOpen(false);
    setActionDone('Permintaan revisi dikirim ke handler. Tiket kembali dikerjakan.');
    setTimeout(() => router.push('/reviewer/tinjauan-akhir'), 1500);
  };

  const handleClosure = () => {
    setClosureOpen(false);
    setActionDone('Tiket disetujui & diteruskan ke Direktur untuk penutupan final.');
    setTimeout(() => router.push('/reviewer/tinjauan-akhir'), 1500);
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/reviewer/tinjauan-akhir">
            <ArrowLeft className="size-4" />
            <span>Kembali ke Antrean</span>
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
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>{ticket.id}</span>
                <span>•</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground mt-1">{ticket.subject}</h1>
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
                        <Button variant="outline" size="sm" onClick={() => setReportOpen(true)} className="gap-1.5">
                          <FileText className="size-3.5" />
                          <span>Detail Laporan</span>
                        </Button>
                      </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2 border-t">
            <span>Pelapor: {ticket.reporterName}</span>
            {ticket.soNumber && <span>SO: {ticket.soNumber}</span>}
            {ticket.salesName && <span>Sales: {ticket.salesName}</span>}
            {ticket.assignedUnit && <span>Unit: {ticket.assignedUnit}</span>}
            {ticket.handlerName && <span>Handler: {ticket.handlerName}</span>}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Kolom kiri: evaluasi solusi handler */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progres Pengerjaan Handler */}
          {(ticket.handlerProgress && ticket.handlerProgress.length > 0) && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  {/* <History className="size-4 text-muted-foreground" /> */}
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
                  <CardTitle className="text-base font-semibold">
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
                  <CardTitle className="text-base font-semibold">Riwayat Revisi</CardTitle>
                  <Badge variant="secondary">{cycles.length} siklus</Badge>
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

        </div>

        {/* Kolom kanan: keputusan verifikasi final */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCheck className="size-4 text-primary" />
                <span>Verifikasi Solusi</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Apakah solusi handler sudah tepat & sesuai laporan?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setClosureOpen(true)}
                  className="flex-1 text-xs font-semibold gap-2"
                >
                  <CheckCircle2 className="size-4" />
                  <span>Setujui & Tutup Tiket</span>
                </Button>
              </div>
              <Button
                onClick={() => setReworkOpen(true)}
                variant="outline"
                className="w-full text-xs font-semibold gap-2"
              >
                <RotateCcw className="size-4" />
                <span>Minta Rework</span>
              </Button>

              {/* <Separator />

              <Button
                onClick={() => setChatOpen(true)}
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground justify-center gap-2"
              >
                <MessageSquare className="size-4 text-primary" />
                <span>Diskusi dengan Handler/Reporter</span>
              </Button> */}
            </CardContent>
          </Card>

          {/* Info routing penutupan */}
          {/* <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span>Alur Setelah Persetujuan</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <History className="size-3.5 mt-0.5 shrink-0" />
                <span>Tiket yang disetujui akan diteruskan ke <strong className="text-foreground">Direktur</strong> untuk penutupan final.</span>
              </div>
              <div className="flex items-start gap-2">
                <RotateCcw className="size-3.5 mt-0.5 shrink-0" />
                <span>Rework mengembalikan tiket ke handler dengan catatan revisi.</span>
              </div>
              <div className="flex items-start gap-2">
                <MessageSquare className="size-3.5 mt-0.5 shrink-0" />
                <span>Diskusi tersedia untuk klarifikasi tanpa mengubah status.</span>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>

      {/* Modal Detail Laporan */}
      <ReportDetailModal ticket={ticket} open={reportOpen} onOpenChange={setReportOpen} />

      {/* Modal Rework */}
      <Dialog open={reworkOpen} onOpenChange={setReworkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-4 text-primary" />
              Minta Rework
            </DialogTitle>
            <DialogDescription>
              Tiket akan dikembalikan ke {ticket.handlerName ?? 'handler'} untuk dikerjakan ulang.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Alasan Rework <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Jelaskan bagian solusi yang belum tepat atau bukti yang kurang..."
              value={reworkReason}
              onChange={(e) => setReworkReason(e.target.value)}
              className="min-h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReworkOpen(false)}>Batal</Button>
            <Button onClick={handleRework} disabled={!reworkReason.trim()} className="gap-1.5">
              Kirim ke Handler
              <ArrowRight data-icon="inline-end" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Closure */}
      <Dialog open={closureOpen} onOpenChange={setClosureOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              Setujui & Tutup Tiket
            </DialogTitle>
            <DialogDescription>
              Konfirmasi persetujuan resolusi dan penerusan ke Direktur.
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
              <span className="text-muted-foreground">Otoritas Final</span>
              <span className="font-semibold text-primary">Direktur</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosureOpen(false)}>Batal</Button>
            <Button onClick={handleClosure} className="gap-1.5">
              Setujui & Teruskan
              <ArrowRight data-icon="inline-end" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
