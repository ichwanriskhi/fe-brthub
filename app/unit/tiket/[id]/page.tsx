'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getUnitTicket, getUnitEmployees, assignHandler, type UnitEmployee } from '@/lib/api/handler';
import type { Ticket } from '@/lib/types/ticket';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { AttachmentList } from '@/components/shared/AttachmentList';
import { TicketHeader } from '@/components/shared/TicketHeader';
import { TicketSummary } from '@/components/shared/TicketSummary';
import { DetailList } from '@/components/shared/DetailList';
import { TicketTimeline } from '@/components/shared/TicketTimeline';
import { AssignHandlerDialog } from '@/components/shared/AssignHandlerDialog';
import { DotChip } from '@/components/shared/DotChip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  UserPlus,
  History,
  AlertCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function UnitTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Asal daftar untuk breadcrumb "kembali" — lihat `fromRiwayat` di bawah.
  const searchParams = useSearchParams();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const [employees, setEmployees] = useState<UnitEmployee[]>([]);
  // Mulai dalam keadaan memuat — efek di bawah hanya menonaktifkannya, jadi
// tidak perlu setState sinkron di dalam badan efek.
  const [employeeLoading, setEmployeeLoading] = useState(true);
  const [selectedHandler, setSelectedHandler] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  /* Detail pelapor & pelanggan ditangani TicketSummary (memiliki modalnya
     sendiri), jadi state + handler di sini tidak dibutuhkan lagi. */

  useEffect(() => {
    let cancelled = false;

    getUnitTicket(id)
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

  // Handler tersedia untuk dropdown assign (pegawai di departemen tiket ini).
  useEffect(() => {
    let cancelled = false;

    getUnitEmployees(undefined)
      .then((list) => {
        if (cancelled) return;
        const deptId = ticket?.destinationDepartmentId;
        const filtered = deptId ? list.filter((e) => e.department_id === deptId) : list;
        setEmployees(filtered);
      })
      .catch(() => {
        // Bukan fatal — dropdown akan tampil kosong, tombol assign menunggu data.
      })
      .finally(() => {
        if (!cancelled) setEmployeeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticket?.destinationDepartmentId]);

  const submitAssign = async () => {
    if (!ticket) return;
    if (!selectedHandler) {
      toast.error('Pilih handler terlebih dahulu');
      return;
    }
    setSubmitting(true);
    try {
      await assignHandler(ticket.id, selectedHandler);
      const handler = employees.find((e) => e.id === selectedHandler);
      toast.success(`Tiket ${ticket.id} ditugaskan ke ${handler?.full_name}.`);
      const fresh = await getUnitTicket(id);
      setTicket(fresh);
      setSelectedHandler('');
      setAssignOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Gagal menugaskan handler.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset pilihan saat dialog ditutup tanpa submit, supaya buka lagi tidak
// langsung menampilkan handler yang terakhir dicoba.
const handleAssignOpenChange = (open: boolean) => {
    setAssignOpen(open);
    if (!open) setSelectedHandler('');
  };

  if (isLoading || !ticket) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          {isLoading ? (
            <Spinner className="size-8 text-muted-foreground/60" />
          ) : (
            <AlertCircle className="size-8 text-muted-foreground/60" />
          )}
          <p className="text-sm font-medium">
            {isLoading ? 'Memuat detail tiket...' : (loadError ?? 'Tiket tidak ditemukan.')}
          </p>
        </div>
      </div>
    );
  }

  const handlerAssignments = ticket.handlerAssignments ?? [];

  /**
   * Ke daftar mana tombol "kembali" harus pergi.
   *
   * Antrean Penugasan dan Riwayat Penugasan sama-sama dilayani route
   * `/unit/tiket`, jadi tanpa penanda asal dari `?from=` tombol ini selalu
   * kembali ke antrean — salah saat tiket dibuka dari riwayat.
   */
  const fromRiwayat = searchParams.get('from') === 'riwayat';

  return (
    <div className="flex flex-col gap-6">
      {/* Header halaman — di luar Card supaya judul/badan/aksi tidak menumpuk */}
      <TicketHeader
        ticket={ticket}
        backHref={fromRiwayat ? '/unit/riwayat' : '/unit/antrean'}
        backLabel={fromRiwayat ? 'Kembali ke Riwayat Penugasan' : 'Kembali ke Antrean'}
        actions={
          // Tanpa `readOnly`: pesan unit dipaksa internal oleh backend
          // (`resolveInternalFlag`) dan tidak pernah tampil ke pelapor.
          <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom kiri (2/3): detail tiket */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <TicketSummary ticket={ticket} showWansis />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rincian Laporan</CardTitle>
              <CardDescription>
                Salinan data laporan untuk koordinasi penugasan.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Kategori dipindah ke sini dari Ringkasan Tiket supaya
                  field list Ringkasan seragam di semua halaman detail. */}
              <DetailList
                items={[
                  {
                    label: 'Kategori Kendala',
                    value: `${ticket.category} (${ticket.subcategory})`,
                  },
                ]}
              />

              <div>
                <p className="mb-2 text-xs text-muted-foreground">Deskripsi Lengkap</p>
                <p className="whitespace-pre-line rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
                  {ticket.description}
                </p>
              </div>

              {ticket.claimedItems && ticket.claimedItems.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Informasi Barang Claim</p>
                  <ClaimItemsTable items={ticket.claimedItems} />
                </div>
              )}

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Lampiran Bukti ({ticket.attachments.length})
                  </p>
                  <AttachmentList items={ticket.attachments} layout="grid" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Riwayat penugasan tiket ini */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riwayat Penugasan</CardTitle>
              <CardDescription>Kronologi pergantian handler tiket ini.</CardDescription>
            </CardHeader>
            <CardContent>
              {handlerAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
                  <History aria-hidden className="size-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Belum ada handler yang ditugaskan
                  </p>
                </div>
              ) : (
                /* Bentuk visual sengaja sama dengan TicketTimeline supaya
                   dua daftar kronologi di halaman ini terbaca satu pola. */
                <ol className="relative space-y-4 border-l pl-5">
                  {handlerAssignments.map((log) => (
                    <li key={log.id} className="relative">
                      <span
                        className={`absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-card ${
                          log.isActive ? 'bg-primary' : 'bg-border'
                        }`}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {log.handlerName ?? 'Handler tidak diketahui'}
                        </p>
                        {log.isActive && (
                          <DotChip dotClass="bg-emerald-500/70">Aktif</DotChip>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Ditugaskan oleh {log.assignedByName ?? '-'} ·{' '}
                        {log.assignedAt
                          ? new Date(log.assignedAt).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <TicketTimeline activities={ticket.activities} />
        </div>

        {/* Kolom kanan (1/3) KHUSUS aksi yang jadi tujuan user membuka halaman
          ini — hanya Penugasan. Isi referensi (Timeline) tetap di kolom kiri
          supaya kolom ini tidak jadi tempat yang butuh di-scroll sendiri.
          Sticky dibatasi di lg+: di mobile layout-nya 1 kolom, jadi sticky
          akan menutupi header.
          Wrapper-nya wajib: grid item-nya adalah kolom ini, bukan Card-nya.
          Kalau Card-nya langsung yang sticky, kolom ini yang sudah di-stretch
          setinggi row akan ikut jadi tinggi, dan tidak ada ruang gerak. */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Penugasan</CardTitle>
                <CardDescription>Handler yang menangani tiket ini.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Unit Tujuan pindah ke sini dari Ringkasan Tiket — ini tujuan
                    penugasan, jadi tempatnya memang kartu Penugasan. */}
                <DetailList
                  items={[
                    {
                      label: 'Unit Tujuan',
                      value: ticket.destinationDepartmentName || ticket.assignedUnit || '-',
                    },
                  ]}
                />

                {ticket.handlerName ? (
                  <>
                    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs">
                          {ticket.handlerName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {ticket.handlerName}
                        </span>
                      </div>
                    </div>
                    {handlerAssignments.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        Ada {handlerAssignments.length} riwayat penugasan. Mengganti handler akan
                        menonaktifkan handler saat ini.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Belum ada handler yang ditugaskan untuk tiket ini.
                  </p>
                )}

                <Button className="w-full" onClick={() => setAssignOpen(true)}>
                  <UserPlus data-icon="inline-start" />
                  {ticket.handlerName ? 'Ganti Handler' : 'Tugaskan Handler'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AssignHandlerDialog
        open={assignOpen}
        onOpenChange={handleAssignOpenChange}
        currentHandlerName={ticket.handlerName ?? undefined}
        options={employees.map((e) => ({
          value: e.id,
          label: `${e.full_name}${e.position_name ? ` (${e.position_name})` : ''}`,
        }))}
        loadingOptions={employeeLoading}
        value={selectedHandler}
        onValueChange={setSelectedHandler}
        submitting={submitting}
        onSubmit={submitAssign}
      />
    </div>
  );
}
