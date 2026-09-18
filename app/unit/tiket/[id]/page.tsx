'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
} from 'lucide-react';
import { toast } from 'sonner';

const HANDLERS = [
  { id: 'h1', name: 'Dimas P.', unit: 'IT Service', activeCases: 2 },
  { id: 'h2', name: 'Budi S.', unit: 'Distribution & Logistics', activeCases: 1 },
  { id: 'h3', name: 'Rina A.', unit: 'Warehouse Operations', activeCases: 3 },
  { id: 'h4', name: 'Agus S.', unit: 'Sales Operations', activeCases: 0 },
];

// Riwayat penugasan tiket ini
const ASSIGNMENT_LOG = [
  { handler: 'Dimas P.', assignedBy: 'Auto-route', time: '12 Sep 2026, 16:30', isCurrent: false },
  { handler: 'Agus S.', assignedBy: 'Tri Mentari', time: '13 Sep 2026, 08:15', isCurrent: true },
];

export default function UnitTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ticket = MOCK_TICKETS.find((t) => t.id === id) || MOCK_TICKETS[0];
  const [selectedHandler, setSelectedHandler] = useState('');

  const confirmAssign = () => {
    if (!selectedHandler) {
      toast.error('Pilih handler terlebih dahulu');
      return;
    }
    const handler = HANDLERS.find((h) => h.id === selectedHandler);
    toast.success(`Tiket ${ticket.id} ditugaskan ke ${handler?.name}.`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/unit/antrean">
            <ArrowLeft className="size-4" />
            <span>Kembali</span>
          </Link>
        </Button>
        <TicketChatDrawer ticketId={ticket.id} />
      </div>

      {/* Header info */}
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
              <Building className="size-4 text-muted-foreground" />
              <span>Pelanggan: <strong className="font-semibold text-foreground">{ticket.customerData?.name ?? ticket.reporterName}</strong></span>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 min-w-0">
        {/* Kolom kiri (2/3): detail tiket */}
        <div className="flex flex-col gap-6 lg:col-span-2 min-w-0">
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
                  <span className="font-semibold text-foreground">{ticket.category} ({ticket.subcategory})</span>
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
                  <span className="mb-2 block text-xs font-semibold text-foreground">Informasi Barang Claim</span>
                  <ClaimItemsTable items={ticket.claimedItems} />
                </div>
              )}

              {ticket.attachments && ticket.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="mb-2 block text-xs text-muted-foreground">Lampiran Bukti ({ticket.attachments.length})</span>
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
              <CardDescription className="text-xs">Kronologi pergantian handler tiket ini</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4 pl-6">
                <div className="absolute bottom-1.5 left-[11px] top-1.5 w-px bg-border" />
                {ASSIGNMENT_LOG.map((log, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-[18px] top-1.5 size-2.5 rounded-full border-2 ${
                        log.isCurrent
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40 bg-background'
                      }`}
                    />
                    <div className="space-y-0.5 rounded-lg border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold">{log.handler}</span>
                        {log.isCurrent && (
                          <Badge variant="default" className="text-[10px]">Handler Aktif</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Ditugaskan oleh {log.assignedBy} · {log.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan (1/3): assign handler */}
        <div className="flex flex-col gap-6 min-w-0">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <UserPlus className="size-4 text-primary" />
                Assign Handler
              </CardTitle>
              <CardDescription className="text-xs">Tentukan handler penanganan untuk tiket ini</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>Handler *</FieldLabel>
                  <Select
                    value={selectedHandler}
                    onValueChange={(v) => setSelectedHandler(v ?? '')}
                    items={HANDLERS.map((h) => ({ value: h.id, label: `${h.name} (${h.unit} • ${h.activeCases} kasus aktif)` }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih handler..." />
                    </SelectTrigger>
                    <SelectContent>
                      {HANDLERS.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} ({h.unit} • {h.activeCases} kasus aktif)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>Handler dengan beban rendah direkomendasikan.</FieldDescription>
                </Field>

                <Button onClick={confirmAssign} className="w-full gap-1.5">
                  <ClipboardCheck className="size-4" />
                  Konfirmasi Penugasan
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="size-4 text-muted-foreground" />
                Info Pelapor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><User className="size-3.5" /> Nama:</span>
                <span className="font-medium text-foreground">{ticket.reporterName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Building className="size-3.5" /> Unit:</span>
                <span className="font-medium text-foreground">{ticket.customerData?.name ?? '-'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
