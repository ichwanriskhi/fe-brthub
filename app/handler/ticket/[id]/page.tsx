'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { HANDLER_ACTIONS } from '@/lib/constants/reviewer';
import type { TicketAttachment } from '@/lib/types/ticket';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { UploadCloud, Paperclip, X, Plus, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ArrowLeft,
  Building,
  ClipboardCheck,
  FileText,
  History,
  Paperclip as PaperclipIcon,
  Send,
  Sparkles,
  Truck,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { ReportDetailModal } from '@/components/shared/ReportDetailModal';

const PROGRESS_SHOW_LIMIT = 3;

export default function HandlerTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ticket = MOCK_TICKETS.find((t) => t.id === id) || MOCK_TICKETS[0];
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [showAllProgress, setShowAllProgress] = useState(false);

  // Progres pengerjaan
  const [progressNote, setProgressNote] = useState('');
  const [progressFiles, setProgressFiles] = useState<{ name: string; size: string }[]>([]);
  const [progressList, setProgressList] = useState(ticket.handlerProgress ?? []);

  // Pengajuan resolusi
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionDetail, setResolutionDetail] = useState('');

  const handlerAction = HANDLER_ACTIONS.find((a) => a.id === ticket.handlerActionId);

  const submitProgress = () => {
    if (!progressNote.trim()) {
      toast.error('Tuliskan progres pengerjaan terlebih dahulu');
      return;
    }
    setProgressList((prev) => [
      ...prev,
      {
        id: `prog-new-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        note: progressNote.trim(),
        attachments: progressFiles.map((f, i) => ({
          id: `new-att-${i}`, name: f.name, size: f.size, type: 'image/jpeg', url: '#',
        })) as TicketAttachment[],
      },
    ]);
    setProgressNote('');
    setProgressFiles([]);
    toast.success('Progres pengerjaan tersimpan & terlihat oleh reporter');
  };

  const submitResolution = () => {
    if (!resolutionSummary.trim() || !resolutionDetail.trim()) {
      toast.error('Isi ringkasan & detail resolusi terlebih dahulu');
      return;
    }
    toast.success('Resolusi diajukan — menunggu tinjauan reviewer');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).map((f) => ({
        name: f.name,
        size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      }));
      setProgressFiles((prev) => [...prev, ...files]);
    }
  };

  const visibleProgress = showAllProgress ? progressList : progressList.slice(0, PROGRESS_SHOW_LIMIT);
  const hiddenCount = progressList.length - PROGRESS_SHOW_LIMIT;

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
              <span>Pelapor: <strong className="font-semibold text-foreground">{ticket.reporterName}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Revisi 3: Instruksi Penanganan dipindah ke sini (di atas grid) ── */}
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
              <p className="text-xs text-muted-foreground leading-relaxed">{handlerAction.description}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 min-w-0">
        {/* Kolom kiri (2/3): progres + resolusi */}
        <div className="flex flex-col gap-6 lg:col-span-2 min-w-0">
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
                          <span className="text-xs font-semibold">{ticket.handlerName ?? 'Handler'}</span>
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
              )}

              {/* ── Revisi 5: Show More button ── */}
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
                  {/* ── Revisi 6: Fix button height di mobile ── */}
                  <div className="space-y-3 rounded-lg border border-dashed bg-background p-3.5">
                    <span className="text-xs font-semibold text-foreground block">Tambah Progres Pengerjaan</span>
                    <Textarea
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                      placeholder="Contoh: Hari ini koordinasi dengan warehouse untuk cek stok barang pengganti..."
                      className="min-h-20 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        hidden
                        id="progress-upload"
                      />
                      <label htmlFor="progress-upload" className="contents">
                        <Button variant="outline" size="sm" className="h-9 w-full gap-1.5 text-xs" asChild>
                          <span>
                            <UploadCloud className="size-3.5" />
                            {progressFiles.length > 0 ? `${progressFiles.length} file dipilih` : 'Unggah Bukti'}
                          </span>
                        </Button>
                      </label>
                      <Button size="sm" onClick={submitProgress} className="h-9 w-full gap-1.5 text-xs">
                        <Send className="size-3.5" />
                        Simpan Progres
                      </Button>
                    </div>
                    {progressFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {progressFiles.map((f) => (
                          <Badge key={f.name} variant="outline" className="gap-1 text-[10px]">
                            <X className="size-2.5 cursor-pointer" onClick={() => setProgressFiles((prev) => prev.filter((x) => x.name !== f.name))} />
                            {f.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {progressList.length === 0 && !progressOpen && (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
                  <History className="size-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Belum ada progres penanganan</p>
                </div>
              )}

              {!progressOpen && (
                <Button variant="outline" size="sm" onClick={() => setProgressOpen(true)} className="w-full gap-1.5 text-xs">
                  <Plus className="size-3.5" />
                  Tambah Progres
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Ajukan resolusi */}
          {ticket.status !== 'CLOSED' && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Send className="size-4 text-muted-foreground" />
                  Ajukan Resolusi
                </CardTitle>
                <CardDescription className="text-xs">
                  Isi ketika penanganan sudah selesai untuk ditinjau reviewer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel>
                    Ringkasan Solusi
                    <span className="text-red-500 ml-0.5">*</span>
                  </FieldLabel>
                  <Textarea
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    placeholder="Jelaskan solusi yang telah diberikan secara singkat..."
                    className="min-h-24 text-xs"
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    Detail Pelaksanaan
                    <span className="text-red-500 ml-0.5">*</span>
                  </FieldLabel>
                  <Textarea
                    value={resolutionDetail}
                    onChange={(e) => setResolutionDetail(e.target.value)}
                    placeholder="Jelaskan detail langkah-langkah yang telah dilakukan..."
                    className="min-h-24 text-xs"
                  />
                </Field>
                <Button onClick={submitResolution} className="w-full gap-1.5 text-xs" disabled={!resolutionSummary.trim() || !resolutionDetail.trim()}>
                  <Send className="size-3.5" />
                  Ajukan untuk Direview
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kolom kanan (1/3): riwayat revisi */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Riwayat revisi (jika ada) */}
          {(ticket.resolutionCycles ?? []).filter((c) => !c.isCurrent).length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4 text-muted-foreground" />
                  Riwayat Revisi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 border-l-2 ml-2 pl-4">
                  {(ticket.resolutionCycles ?? []).filter((c) => !c.isCurrent).map((cycle) => (
                    <div key={cycle.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-muted-foreground/40" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Resolusi #{cycle.cycleNumber}</span>
                        <span className="text-[10px] text-muted-foreground">{cycle.timestamp}</span>
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
      </div>

      {/* Modal Detail Laporan */}
      <ReportDetailModal ticket={ticket} open={reportOpen} onOpenChange={setReportOpen} />
    </div>

  );
}
