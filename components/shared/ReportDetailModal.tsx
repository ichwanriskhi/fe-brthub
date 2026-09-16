'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import {
  User,
  Building2,
  FileText,
  Paperclip,
  Hash,
  ShoppingCart,
} from 'lucide-react';
import type { Ticket } from '@/lib/types/ticket';

interface ReportDetailModalProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5" />
      {title}
    </div>
  );
}

export function ReportDetailModal({ ticket, open, onOpenChange }: ReportDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden p-0 gap-0 sm:max-w-3xl md:max-h-[85vh]">
        {/* Header — fixed, not scrollable */}
        <DialogHeader className="px-4 sm:px-5 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mb-1">
                <Hash className="size-3" />
                {ticket.id}
              </div>
              <DialogTitle className="text-sm sm:text-base font-semibold leading-snug">
                {ticket.subject}
              </DialogTitle>
            </div>
            {/* <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <TypeBadge ticketType={ticket.ticketType} />
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div> */}
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto overscroll-contain flex-1 divide-y">
          {/* Pelapor + Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
            {/* Pelapor */}
            <div className="px-4 sm:px-5 py-3 sm:py-4 space-y-2.5">
              <SectionHeader icon={User} title="Data Pelapor" />
              <div className="space-y-2">
                <Field label="Nama" value={ticket.reporterName} />
                <Field label="No. HP" value={ticket.reporterPhone} />
                <Field label="Alamat" value={ticket.reporterAddress} />
              </div>
            </div>

            {/* Customer */}
            <div className="px-4 sm:px-5 py-3 sm:py-4 space-y-2.5">
              <SectionHeader icon={Building2} title="Data Customer" />
              {ticket.isReportForCustomer && ticket.customerData ? (
                <div className="space-y-2">
                  <Field label="Nama" value={ticket.customerData.name} />
                  <Field label="No. HP" value={ticket.customerData.phone} />
                  <Field label="Alamat" value={ticket.customerData.address} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Laporan atas nama sendiri.
                </p>
              )}
            </div>
          </div>

          {/* Info Tiket */}
          <div className="px-4 sm:px-5 py-3 sm:py-4 space-y-2.5">
            <SectionHeader icon={FileText} title="Informasi Laporan" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Tanggal" value={new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
              {ticket.soNumber && <Field label="No. SO" value={ticket.soNumber} />}
              {ticket.salesName && <Field label="Sales" value={ticket.salesName} />}
              <Field label="Kategori" value={ticket.category} />
              <Field label="Sub Kategori" value={ticket.subcategory} />
              {ticket.productLine && <Field label="Lini Produk" value={ticket.productLine} />}
              {ticket.vehicleModel && <Field label="Kendaraan" value={ticket.vehicleModel} />}
              {ticket.handlerName && <Field label="Handler" value={ticket.handlerName} />}
              {ticket.assignedUnit && <Field label="Unit" value={ticket.assignedUnit} />}
            </div>
          </div>

          {/* Deskripsi */}
          <div className="px-4 sm:px-5 py-3 sm:py-4 space-y-2">
            <SectionHeader icon={FileText} title="Deskripsi Permasalahan" />
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line rounded-md bg-muted/40 px-3 py-2.5 border">
              {ticket.description}
            </p>
          </div>

          {/* Barang Claim */}
          {ticket.claimedItems && ticket.claimedItems.length > 0 && (
            <div className="px-4 sm:px-5 py-3 sm:py-4 space-y-2 overflow-x-auto">
              <SectionHeader icon={ShoppingCart} title={`Barang Klaim (${ticket.claimedItems.length})`} />
              <ClaimItemsTable items={ticket.claimedItems} />
            </div>
          )}

          {/* Lampiran */}
          {ticket.attachments.length > 0 && (
            <div className="px-4 sm:px-5 py-3 sm:py-4 space-y-2">
              <SectionHeader icon={Paperclip} title={`Lampiran (${ticket.attachments.length})`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ticket.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate font-medium">{att.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{att.size}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}