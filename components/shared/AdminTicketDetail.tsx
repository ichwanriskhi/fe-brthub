'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Ticket } from '@/lib/types/ticket';
import type { HandlerProgressEntry } from '@/lib/api/handler';
import { getAdminTicketDetail } from '@/lib/api/admin-ticket-monitoring';
import { TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { AttachmentList } from '@/components/shared/AttachmentList';
import { TicketTimeline } from '@/components/shared/TicketTimeline';
import { TicketHeader } from '@/components/shared/TicketHeader';
import { TicketSummary } from '@/components/shared/TicketSummary';
import { DetailList } from '@/components/shared/DetailList';
import { DotChip } from '@/components/shared/DotChip';
import { ResolutionDecisionChip } from '@/components/shared/ResolutionDecisionChip';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { RevisionDiff } from '@/components/shared/RevisionDiff';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';

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

  /* Detail pelapor & pelanggan ditangani TicketSummary (memiliki modalnya
     sendiri), jadi state + handler di sini tidak dibutuhkan lagi. */

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
            <ArrowLeft data-icon="inline-start" /> Kembali ke {backLabel}
          </Link>
        </Button>
      </div>
    );
  }

  const progressList = (ticket.handlerProgress ?? []) as HandlerProgressEntry[];
  const resolutions = (ticket.resolutions ?? []) as Array<{
    id: string;
    resolutionNo: number;
    summary: string;
    detail: string;
    submittedAt: string;
    reviewDecision: 'PENDING' | 'APPROVED' | 'REJECTED';
  }>;

  /* Keputusan atas tiap resolusi memakai chip bersama — label & warnanya
     terkunci di ResolutionDecisionChip agar tidak berbeda antar halaman. */

  return (
    <div className="space-y-6 min-w-0">
      {/* Header halaman — di luar Card supaya judul/badan/aksi tidak menumpuk */}
      <TicketHeader
        ticket={ticket}
        backHref={backHref}
        backLabel={backLabel}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchTicket}>
              <RefreshCw data-icon="inline-start" />
              Refresh
            </Button>
            <TicketChatDrawer
              ticketId={ticket.id}
              open={chatOpen}
              onOpenChange={setChatOpen}
            />
          </>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom kiri (2/3): laporan, progress, resolusi, riwayat */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <TicketSummary ticket={ticket} showWansis />

          {/* Rincian Laporan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rincian Laporan</CardTitle>
              <CardDescription>Data tiket sebagaimana dilaporkan oleh pelapor.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Kategori/Sub Kategori = klasifikasi laporan, bukan identitas —
                  karena itu tampilnya di sini (sama seperti unit, approver,
                  reporter), bukan di Info Tiket.
                  Subjek, SO, Sales, Lini Produk, dan Model Kendaraan sudah
                  tampil di TicketHeader + TicketSummary. */}
              <DetailList
                items={[
                  {
                    label: 'Kategori',
                    value:
                      ticket.subcategory && ticket.subcategory !== '-'
                        ? `${ticket.category} › ${ticket.subcategory}`
                        : ticket.category,
                  },
                ]}
              />
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Deskripsi / Ruang Lingkup</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {ticket.description || '-'}
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
                    Lampiran Pelapor ({ticket.attachments.length})
                  </p>
                  <AttachmentList items={ticket.attachments} layout="grid" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Handler */}
          {progressList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress Pengerjaan Handler</CardTitle>
                <CardDescription>
                  {progressList.length} entri progres yang dikirim handler.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Bentuk visual sama dengan TicketTimeline supaya daftar
                    kronologi di halaman ini terbaca satu pola. */}
                <ol className="relative space-y-4 border-l pl-5">
                  {progressList.map((p) => (
                    <li key={p.id} className="relative">
                      <span className="absolute -left-[25px] top-1 size-2.5 rounded-full bg-primary ring-4 ring-card" />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {p.actorName ?? 'Handler'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {/* `p.timestamp` sudah diformat "10 Sep 2026, 09:15" oleh
                              `toHandlerTicket` — `new Date()` di sini akan NaN. */}
                          {p.timestamp || '-'}
                        </p>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {p.note}
                      </p>
                      {p.attachments && p.attachments.length > 0 && (
                        <AttachmentList items={p.attachments} size="xs" className="mt-2" />
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Resolusi Handler */}
          {resolutions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resolusi yang Diajukan</CardTitle>
                <CardDescription>
                  {resolutions.length} resolusi yang diajukan handler beserta hasil evaluasinya.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {resolutions.map((r, idx) => {
                  return (
                    <div key={r.id} className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          Resolusi #{r.resolutionNo ?? idx + 1}
                        </p>
                        <ResolutionDecisionChip decision={r.reviewDecision} />
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Ringkasan</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {r.summary}
                        </p>
                      </div>
                      {r.detail && (
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Detail</p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {r.detail}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
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
              <CardHeader>
                <CardTitle className="text-base">Riwayat Revisi Reviewer</CardTitle>
                <CardDescription>Perubahan yang dilakukan reviewer terhadap data laporan.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-xs text-muted-foreground">
                  Revisi #{ticket.latestRevision.revisionNo} —{' '}
                  {new Date(ticket.latestRevision.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                {ticket.latestRevision.notes && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground">Catatan reviewer</p>
                    <p className="text-sm text-foreground">{ticket.latestRevision.notes}</p>
                  </div>
                )}
                <RevisionDiff changes={ticket.latestRevision.changes} />
              </CardContent>
            </Card>
          )}

          <TicketTimeline activities={ticket.activities} />
        </div>

        {/* Kolom kanan (1/3): atribut routing, profil pelapor, riwayat.
            Sengaja TIDAK sticky: halaman admin adalah view-only — tidak ada
            aksi per-tiket yang perlu dijangkau, dan tinggi kolom ini (~700px)
            berisiko memicu bug sticky terpotong yang sudah pernah terjadi
            di reviewer. */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Info Tiket */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info Tiket</CardTitle>
              <CardDescription>Klasifikasi, routing, dan waktu pembaruan.</CardDescription>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  {
                    label: 'Tipe',
                    value: <TypeBadge ticketType={ticket.ticketType} />,
                  },
                  {
                    label: 'Prioritas',
                    value: ticket.priority ? (
                      <PriorityBadge priority={ticket.priority} />
                    ) : (
                      <span className="text-muted-foreground">Belum ditentukan</span>
                    ),
                  },
                  ...(ticket.approvalTarget
                    ? [{ label: 'Target Approval', value: ticket.approvalTarget }]
                    : []),
                  ...(ticket.destinationDepartmentName
                    ? [{ label: 'Unit Tujuan', value: ticket.destinationDepartmentName }]
                    : []),
                ]}
              />
              <Separator className="my-4" />
              <DetailList
                columns={1}
                items={[
                  {
                    label: 'Dibuat',
                    value: new Date(ticket.createdAt).toLocaleDateString('id-ID'),
                  },
                  {
                    label: 'Diperbarui',
                    value: new Date(ticket.updatedAt).toLocaleDateString('id-ID'),
                  },
                ]}
              />
            </CardContent>
          </Card>

          {/* Riwayat Penugasan Handler */}
          {ticket.handlerAssignments && ticket.handlerAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Riwayat Penugasan Handler</CardTitle>
                <CardDescription>Kronologi pergantian handler tiket ini.</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Bentuk visual sama dengan TicketTimeline. */}
                <ol className="relative space-y-4 border-l pl-5">
                  {ticket.handlerAssignments.map((a) => (
                    <li key={a.id} className="relative">
                      <span
                        className={`absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-card ${
                          a.isActive ? 'bg-primary' : 'bg-border'
                        }`}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {a.handlerName ?? '-'}
                        </p>
                        {a.isActive && <DotChip dotClass="bg-emerald-500/70">Aktif</DotChip>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Ditugaskan oleh {a.assignedByName ?? '-'}
                        {a.assignedAt
                          ? ` · ${new Date(a.assignedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}`
                          : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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
