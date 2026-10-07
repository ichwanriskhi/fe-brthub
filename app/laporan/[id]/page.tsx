'use client';

import { use, useEffect, useState } from 'react';
import { getMyTicket } from '@/lib/api/tickets';
import type { Ticket } from '@/lib/types/ticket';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { AttachmentList } from '@/components/shared/AttachmentList';
import { TicketHeader } from '@/components/shared/TicketHeader';
import { TicketSummary } from '@/components/shared/TicketSummary';
import { TicketTimeline } from '@/components/shared/TicketTimeline';
import { DetailList } from '@/components/shared/DetailList';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, FileOutput } from 'lucide-react';

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

    getMyTicket(id, { asReporter: true })
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

  // Resolusi approved untuk reporter: saat CLOSED, siklus aktif (no tertinggi)
  // adalah versi yang disetujui approver. Dibaca dari field ringkas
  // `resolutionSummary/Detail/Attachments` — BUKAN `ticket.resolutions` yang
  // tidak pernah diisi `toReporterTicket` (dead code: selalu undefined).
  // Tanpa riwayat revisi dan tanpa chip status: reporter melihat hasil,
  // bukan prosesnya.
  const hasResolution = isClosed && !!ticket.resolutionSummary;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      {/* Header halaman — di luar Card. Aksi (Surat Keluar + chat) tetap di
        header; shell reporter memakai max-w-5xl sendiri, bukan AppLayout. */}
      <TicketHeader
        ticket={ticket}
        backHref="/laporan"
        backLabel="Kembali"
        actions={
          <>
            {isClosed && (
              <Button variant="outline" size="sm">
                <FileOutput data-icon="inline-start" />
                <span className="hidden sm:inline">Surat Keluar</span>
                <span className="sm:hidden">Surat</span>
              </Button>
            )}
            <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
          </>
        }
      />

      <TicketSummary ticket={ticket} />

      {/* ── Status Stepper ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progres Penanganan</CardTitle>
          <CardDescription>Tahap penanganan laporan yang sedang berjalan.</CardDescription>
        </CardHeader>
        <CardContent>
          {isRejected ? (
            <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4">
              <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Laporan Ditolak</p>
                <p className="mt-0.5 text-sm text-foreground">
                  Laporan tidak memenuhi kriteria verifikasi atau informasi tidak sesuai.
                  Silakan periksa pesan dari tim reviewer di tombol diskusi.
                </p>
              </div>
            </div>
          ) : (
            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {STAGES.map((stage, idx) => {
                const isDone = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <li
                    key={stage.key}
                    className={`flex flex-col gap-2 rounded-lg border p-3 ${
                      isCurrent ? 'border-primary bg-primary/5' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="size-3.5" /> : idx + 1}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isCurrent
                            ? 'text-primary'
                            : isDone
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {stage.desc}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* ── Progres Pengerjaan Handler (timeline) ── */}
      {ticket.handlerProgress && ticket.handlerProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progres Pengerjaan Handler</CardTitle>
            <CardDescription>Update berkala selama penanganan berlangsung.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Bentuk visual sama dengan TicketTimeline supaya daftar
                kronologi di halaman ini terbaca satu pola. */}
            <ol className="relative space-y-4 border-l pl-5">
              {(showAllProgress
                ? ticket.handlerProgress
                : ticket.handlerProgress.slice(0, PROGRESS_SHOW_LIMIT)
              ).map((p) => (
                <li key={p.id} className="relative">
                  <span className="absolute -left-[25px] top-1 size-2.5 rounded-full bg-primary ring-4 ring-card" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {p.actorName ?? ticket.handlerName ?? 'Handler'}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.timestamp}</p>
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-foreground">{p.note}</p>
                  {p.attachments && p.attachments.length > 0 && (
                    <AttachmentList items={p.attachments} size="xs" className="mt-2" />
                  )}
                </li>
              ))}
            </ol>

            {ticket.handlerProgress.length > PROGRESS_SHOW_LIMIT && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAllProgress((v) => !v)}
                className="mt-4 w-full border-dashed text-muted-foreground"
              >
                {showAllProgress ? (
                  <>
                    <ChevronUp data-icon="inline-start" />
                    Sembunyikan
                  </>
                ) : (
                  <>
                    <ChevronDown data-icon="inline-start" />
                    Tampilkan {ticket.handlerProgress.length - PROGRESS_SHOW_LIMIT} progres lainnya
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════ */}
      {/*  HASIL RESOLUSI (oleh Handler)           */}
      {/* ════════════════════════════════════════ */}
      {hasResolution && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hasil Resolusi</CardTitle>
            <CardDescription>
              {ticket.handlerName
                ? `Penyelesaian yang diajukan oleh ${ticket.handlerName}.`
                : 'Penyelesaian yang diajukan handler.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Ringkasan Tindakan</p>
              <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
                {ticket.resolutionSummary}
              </p>
            </div>

            {ticket.resolutionDetail && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Detail Penyelesaian</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {ticket.resolutionDetail}
                </p>
              </div>
            )}

            {ticket.resolutionAttachments && ticket.resolutionAttachments.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Lampiran Bukti Penyelesaian ({ticket.resolutionAttachments.length})
                </p>
                <AttachmentList items={ticket.resolutionAttachments} layout="grid" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rincian Laporan
          Wrapper grid `md:grid-cols-3` + `md:col-span-2` sudah dihapus
          вместе sidebar 1/3.inggalnya membuat kartu ini terkunci di 2/3
          lebar dengan ruang kosong di kanan — tidak ada lagi yang mengisi
          kolom ketiga, jadi kartu ini sekarang full width seperti yang lain. */}
      <Card>
          <CardHeader>
            <CardTitle className="text-base">Rincian Laporan</CardTitle>
            <CardDescription>Data laporan sebagaimana dikirim.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Kategori TIDAK ada di TicketSummary — itu identitas (siapa/apa/
                di mana), sedangkan kategori adalah klasifikasi laporan. Jadi
                tetap di sini, sama seperti unit & approver. */}
            <DetailList
              items={[
                {
                  label: 'Kategori Kendala',
                  value: `${ticket.category} (${ticket.subcategory})`,
                },
              ]}
            />

            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Deskripsi Lengkap</p>
              <p className="whitespace-pre-line rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
                {ticket.description}
              </p>
            </div>

            {ticket.claimedItems && ticket.claimedItems.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Informasi Barang Claim</p>
                <ClaimItemsTable items={ticket.claimedItems} />
              </div>
            )}

            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Lampiran Bukti ({ticket.attachments.length})
                </p>
                <AttachmentList items={ticket.attachments} layout="grid" />
              </div>
            )}
          </CardContent>
        </Card>

      <TicketTimeline activities={ticket.activities} />
    </div>
  );
}
