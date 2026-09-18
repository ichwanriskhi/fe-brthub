'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
  FileText,
  History,
  MessageSquare,
  Paperclip,
  Truck,
  User,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ManagerCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const ticket = MOCK_TICKETS.find((t) => t.id === id) || MOCK_TICKETS[0];

  const [chatOpen, setChatOpen] = useState(false);
  const [reworkOpen, setReworkOpen] = useState(false);
  const [closureOpen, setClosureOpen] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [actionDone, setActionDone] = useState<string | null>(null);

  const handleRework = () => {
    if (!reworkReason.trim()) {
      toast.error('Tuliskan alasan rework terlebih dahulu');
      return;
    }
    setReworkOpen(false);
    setActionDone('Permintaan rework dikirim ke handler. Case kembali dikerjakan.');
    setTimeout(() => router.push('/manager/antrean'), 1500);
  };

  const handleClosure = () => {
    setClosureOpen(false);
    setActionDone('Case ditutup. Terima kasih atas review Anda.');
    setTimeout(() => router.push('/manager/antrean'), 1500);
  };

  const resolutionAttachments = ticket.resolutionAttachments ?? [];

  return (
    <div className="space-y-6 min-w-0">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/manager/antrean">
            <ArrowLeft className="size-4" />
            <span>Kembali</span>
          </Link>
        </Button>

        <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} readOnly />
      </div>

      {actionDone && (
        <div className="bg-emerald-500/10 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 rounded-lg border p-4 text-xs font-semibold">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>{actionDone}</span>
        </div>
      )}

      {/* Header Card */}
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
              <PriorityBadge priority={ticket.priority} />
              <TypeBadge ticketType={ticket.ticketType} />
              <StatusBadge status={ticket.status} />
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
              <span>Kategori: <strong className="font-semibold text-foreground">{ticket.category}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Kolom Kiri: Progress & Resolusi */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progres Pengerjaan Handler */}
          {(ticket.handlerProgress && ticket.handlerProgress.length > 0) && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
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

          {/* Resolusi Diajukan */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardCheck className="size-4 text-muted-foreground" />
                Resolusi Diajukan Handler
              </CardTitle>
              <CardDescription className="text-xs">
                Review dan tentukan apakah solusi sudah tepat untuk penutupan case.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <span className="text-xs font-semibold text-foreground block mb-1">Ringkasan Solusi</span>
                <p className="p-3 rounded-lg bg-muted/40 border text-xs md:text-sm leading-relaxed">
                  {ticket.resolutionSummary ?? 'Handler belum mengajukan resolusi.'}
                </p>
              </div>

              {ticket.resolutionDetail && (
                <div>
                  <span className="text-xs font-semibold text-foreground block mb-1">Detail Pelaksanaan</span>
                  <p className="p-3 rounded-lg bg-muted/40 border text-xs md:text-sm leading-relaxed">
                    {ticket.resolutionDetail}
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

          {/* Barang Claim */}
          {ticket.claimedItems && ticket.claimedItems.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="size-4 text-muted-foreground" />
                  Informasi Barang Claim
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ClaimItemsTable items={ticket.claimedItems} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kolom Kanan: Verifikasi */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-primary" />
                Verifikasi Penutupan
              </CardTitle>
              <CardDescription className="text-xs">
                Apakah solusi handler sudah tepat?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setClosureOpen(true)}
                  className="flex-1 text-xs font-semibold gap-2"
                >
                  <CheckCircle2 className="size-4" />
                  <span>Setujui & Tutup</span>
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

              <Separator />

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

      {/* Rework Dialog */}
      <Dialog open={reworkOpen} onOpenChange={setReworkOpen}>
        <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Minta Rework ke Handler</DialogTitle>
            <DialogDescription>
              Tuliskan alasan atau catatan untuk handler agar melakukan perbaikan lebih lanjut.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel>Alasan Rework *</FieldLabel>
              <Textarea
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
                placeholder="Jelaskan apa yang perlu diperbaiki atau dilengkapi..."
                className="min-h-24 text-xs"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReworkOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleRework}>Kirim Rework</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Closure Dialog */}
      <Dialog open={closureOpen} onOpenChange={setClosureOpen}>
        <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Setujui & Tutup Case</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin solusi handler sudah tepat dan case siap ditutup?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>• Case akan diubah status menjadi CLOSED</p>
            <p>• Reporter akan menerima notifikasi penutupan</p>
            <p>• Case tidak dapat dibuka kembali</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosureOpen(false)}>
              Batal
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleClosure}>
              Ya, Tutup Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
