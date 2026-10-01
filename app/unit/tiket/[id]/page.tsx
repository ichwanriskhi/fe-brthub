'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUnitTicket, getUnitEmployees, assignHandler, type UnitEmployee } from '@/lib/api/handler';
import type { Ticket } from '@/lib/types/ticket';
import { reporterDisplay, customerDisplayName } from '@/lib/utils/ticket-display';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { UserDetailModal, type UserDetailData } from '@/components/shared/UserDetailModal';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  ArrowLeft,
  Paperclip,
  Building,
  FileText,
  User,
  UserPlus,
  ClipboardCheck,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function UnitTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const [employees, setEmployees] = useState<UnitEmployee[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [selectedHandler, setSelectedHandler] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReplaceForm, setShowReplaceForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'assign' | 'replace' | null>(null);

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
      });

    return () => {
      cancelled = true;
    };
  }, [ticket?.destinationDepartmentId]);

  const confirmAssign = async () => {
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Gagal menugaskan handler.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAssign = async () => {
    await confirmAssign();
  };

  if (isLoading || !ticket) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          {isLoading ? (
            <Loader2 className="size-8 animate-spin text-muted-foreground/60" />
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

  return (
    <div className="flex flex-col gap-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/unit/antrean">
            <ArrowLeft className="size-4" />
            <span>Kembali</span>
          </Link>
        </Button>
        <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} readOnly />
      </div>

      {/* Header info */}
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
              <PriorityBadge priority={ticket.priority} />
              <TypeBadge ticketType={ticket.ticketType} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-muted-foreground" />
              <span>
                Pelapor:{' '}
                <button
                  type="button"
                  onClick={openReporterDetail}
                  className="font-semibold text-foreground hover:underline"
                >
                  {reporterDisplay(ticket)}
                </button>
              </span>
            </div>
            {customerDisplayName(ticket) && (
              <div className="flex items-center gap-1.5">
                <Building className="size-4 text-muted-foreground" />
                <span>
                  Pelanggan:{' '}
                  <button
                    type="button"
                    onClick={openCustomerDetail}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {customerDisplayName(ticket)}
                  </button>
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <FileText className="size-4 text-muted-foreground" />
              <span>
                SO: <strong className="font-semibold text-foreground">{ticket.soNumber ?? '-'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building className="size-4 text-muted-foreground" />
              <span>
                Unit Tujuan:{' '}
                <strong className="font-semibold text-foreground">
                  {ticket.destinationDepartmentName || ticket.assignedUnit || '-'}
                </strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom kiri (2/3): detail tiket */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-muted-foreground" />
                Rincian Laporan
              </CardTitle>
              <CardDescription>Salinan data laporan untuk koordinasi penugasan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="mb-0.5 block text-muted-foreground">Kategori Kendala</span>
                  <span className="font-semibold text-foreground">
                    {ticket.category} ({ticket.subcategory})
                  </span>
                </div>
                <div>
                  <span className="mb-0.5 block text-muted-foreground">Model Kendaraan / Armada</span>
                  <span className="font-semibold text-foreground">{ticket.vehicleModel || '-'}</span>
                </div>
              </div>

              <Separator />

              <div>
                <span className="mb-1 block text-xs text-muted-foreground">Deskripsi Lengkap</span>
                <p className="whitespace-pre-line rounded-lg border bg-muted/30 p-3.5 text-xs leading-relaxed text-foreground md:text-sm">
                  {ticket.description}
                </p>
              </div>

              {ticket.claimedItems && ticket.claimedItems.length > 0 && (
                <div>
                  <span className="mb-2 block text-xs font-semibold text-foreground">
                    Informasi Barang Claim
                  </span>
                  <ClaimItemsTable items={ticket.claimedItems} />
                </div>
              )}

              {ticket.attachments && ticket.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="mb-2 block text-xs text-muted-foreground">
                      Lampiran Bukti ({ticket.attachments.length})
                    </span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {ticket.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-lg border bg-card p-2.5 text-xs transition-colors hover:bg-accent"
                        >
                          <Paperclip className="size-4 shrink-0 text-primary" />
                          <span className="flex-1 truncate font-medium">{att.name}</span>
                          <span className="text-[10px] text-muted-foreground">{att.size}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Riwayat penugasan tiket ini */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <History className="size-4 text-muted-foreground" />
                Riwayat Penugasan Tiket
              </CardTitle>
              <CardDescription className="text-xs">
                Kronologi pergantian handler tiket ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              {handlerAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
                  <History className="size-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Belum ada handler yang ditugaskan</p>
                </div>
              ) : (
                <div className="relative space-y-4 pl-6">
                  <div className="absolute bottom-1.5 left-[11px] top-1.5 w-px bg-border" />
                  {handlerAssignments.map((log) => (
                    <div key={log.id} className="relative">
                      <div
                        className={`absolute -left-[18px] top-1.5 size-2.5 rounded-full border-2 ${
                          log.isActive
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/40 bg-background'
                        }`}
                      />
                      <div className="space-y-0.5 rounded-lg border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold">
                            {log.handlerName ?? 'Handler tidak diketahui'}
                          </span>
                          {log.isActive && (
                            <Badge variant="default" className="text-[10px]">
                              Handler Aktif
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan (1/3): assign handler */}
        <div className="flex min-w-0 flex-col gap-6">
          {ticket.handlerName && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ClipboardCheck className="size-4 text-emerald-600" />
                  Handler Aktif
                </CardTitle>
                <CardDescription className="text-xs">
                  Tiket ini sudah ditugaskan dan sedang dikerjakan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border bg-emerald-500/5 p-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">
                      {ticket.handlerName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {ticket.handlerName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ticket.destinationDepartmentName || ticket.assignedUnit || '-'}
                    </span>
                  </div>
                </div>
                {handlerAssignments.length > 1 && (
                  <p className="text-[11px] text-muted-foreground">
                    Ada {handlerAssignments.length} riwayat penugasan — lihat kronologi di kolom
                    kiri. Mengganti handler akan menonaktifkan handler saat ini.
                  </p>
                )}
                {showReplaceForm ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 text-xs"
                    onClick={() => setShowReplaceForm(false)}
                  >
                    Batal Pergantian Handler
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 text-xs"
                    onClick={() => setConfirmAction('replace')}
                  >
                    <UserPlus className="size-3.5" />
                    Ganti Handler
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {(!ticket.handlerName || showReplaceForm) && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <UserPlus className="size-4 text-primary" />
                {ticket.handlerName ? 'Ganti Handler' : 'Assign Handler'}
              </CardTitle>
              <CardDescription className="text-xs">
                Tentukan handler penanganan untuk tiket ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showReplaceForm && ticket.handlerName && (
                <div className="mb-4 rounded-lg border border-amber-600/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                  Handler aktif ({ticket.handlerName}) akan dinonaktifkan.
                </div>
              )}
              <FieldGroup>
                <Field>
                  <FieldLabel>Handler *</FieldLabel>
                  <Select
                    value={selectedHandler}
                    onValueChange={(v) => setSelectedHandler(v ?? '')}
                    items={employees.map((e) => ({
                      value: e.id,
                      label: `${e.full_name}${e.position_name ? ` (${e.position_name})` : ''}`,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih handler..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeLoading ? (
                        <SelectItem value="__loading" disabled>
                          Memuat daftar pegawai...
                        </SelectItem>
                      ) : employees.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          Tidak ada pegawai di departemen ini
                        </SelectItem>
                      ) : (
                        employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.full_name}
                            {e.position_name ? ` (${e.position_name})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Handler harus berasal dari departemen yang menerima tiket ini.
                  </FieldDescription>
                </Field>

                <Button
                  onClick={() => setConfirmAction(showReplaceForm ? 'replace' : 'assign')}
                  className="w-full gap-1.5"
                  disabled={submitting || !selectedHandler || employees.length === 0}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="size-4" />
                  )}
                  {showReplaceForm ? 'Konfirmasi Ganti Handler' : 'Konfirmasi Penugasan'}
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>
          )}

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="size-4 text-muted-foreground" />
                Info Pelapor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="size-3.5" /> Nama:
                </span>
                <span className="font-medium text-foreground">{reporterDisplay(ticket)}</span>
              </div>
              {customerDisplayName(ticket) ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building className="size-3.5" /> Customer:
                  </span>
                  <span className="font-medium text-foreground">
                    {customerDisplayName(ticket)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building className="size-3.5" /> Customer:
                  </span>
                  <span className="font-medium text-muted-foreground">
                    Bukan laporan customer
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="size-3.5" /> No. SO:
                </span>
                <span className="font-medium text-foreground">{ticket.soNumber ?? '-'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <UserDetailModal
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
        title={userDetailTitle}
        user={userDetailData}
      />

      {/* Konfirmasi sebelum aksi penting (ASSIGN / REPLACE HANDLER) */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        variant={confirmAction === 'replace' ? 'destructive' : 'default'}
        icon={
          confirmAction === 'replace' ? (
            <AlertCircle className="text-destructive" />
          ) : (
            <ClipboardCheck className="text-primary" />
          )
        }
        title={confirmAction === 'replace' ? 'Ganti handler aktif?' : 'Tugaskan handler?'}
        description={
          confirmAction === 'replace'
            ? `Handler aktif (${ticket?.handlerName}) akan dinonaktifkan dan tiket diteruskan ke ${employees.find((e) => e.id === selectedHandler)?.full_name || 'handler baru'}. Lanjutkan?`
            : `Tiket akan ditugaskan ke ${employees.find((e) => e.id === selectedHandler)?.full_name || 'handler terpilih'}. Lanjutkan?`
        }
        confirmLabel={confirmAction === 'replace' ? 'Ya, Ganti' : 'Ya, Tugaskan'}
        loading={submitting}
        onConfirm={async () => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === 'assign') {
            await handleConfirmAssign();
          } else if (action === 'replace') {
            await handleConfirmAssign();
            setShowReplaceForm(false);
          }
        }}
      />
    </div>
  );
}
