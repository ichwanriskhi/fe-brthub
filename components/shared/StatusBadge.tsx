'use client';

import { Badge } from '@/components/ui/badge';
import { DotChip } from '@/components/shared/DotChip';
import type { TicketStatus, TicketPriority, TicketType } from '@/lib/types/ticket';

const STATUS_MAP: Record<TicketStatus, { label: string; dot: string; title: string }> = {
  OPEN: { label: 'Open', dot: 'bg-sky-500/70', title: 'Status: Open' },
  PENDING_APPROVAL: { label: 'Menunggu Approval', dot: 'bg-indigo-500/70', title: 'Status: Menunggu Approval' },
  IN_PROGRESS: { label: 'Diproses', dot: 'bg-amber-500/70', title: 'Status: Diproses' },
  PENDING_REVIEW: { label: 'Menunggu Review', dot: 'bg-violet-500/70', title: 'Status: Menunggu Review' },
  REWORK_REQUIRED: { label: 'Perlu Revisi', dot: 'bg-orange-500/70', title: 'Status: Perlu Revisi' },
  REJECTED: { label: 'Ditolak', dot: 'bg-destructive/70', title: 'Status: Ditolak' },
  CLOSED: { label: 'Selesai', dot: 'bg-emerald-500/70', title: 'Status: Selesai' },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const v = STATUS_MAP[status];
  if (!v) return <Badge variant="outline">Unknown</Badge>;
  return (
    <DotChip dotClass={v.dot} title={v.title}>
      {v.label}
    </DotChip>
  );
}

const ACTIVE_STYLE: Record<'active' | 'inactive', { label: string; dot: string }> = {
  active: { label: 'Aktif', dot: 'bg-emerald-500/70' },
  inactive: { label: 'Nonaktif', dot: 'bg-muted-foreground/40' },
};

/** Status aktif/nonaktif untuk master data & pelanggan. */
export function ActiveBadge({ isActive }: { isActive: boolean }) {
  const v = ACTIVE_STYLE[isActive ? 'active' : 'inactive'];
  return <DotChip dotClass={v.dot}>{v.label}</DotChip>;
}

const PRIORITY_STYLE: Record<TicketPriority, { label: string; dot: string; title: string }> = {
  A: { label: 'A', dot: 'bg-destructive/70', title: 'Prioritas A — Tinggi' },
  B: { label: 'B', dot: 'bg-amber-500/70', title: 'Prioritas B — Normal' },
  C: { label: 'C', dot: 'bg-sky-500/70', title: 'Prioritas C — Rendah' },
};

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return null;
  // Code baru dari master data belum punya gaya — tampilkan badge polos berisi
  // code-nya, bukan disembunyikan atau dipaksa ke tier lain.
  const v = PRIORITY_STYLE[priority as TicketPriority];
  if (!v) return <Badge variant="outline">{priority}</Badge>;
  return (
    <DotChip dotClass={v.dot} title={v.title}>
      {v.label}
    </DotChip>
  );
}

const TYPE_MAP: Record<TicketType, { label: string; dot: string; title: string }> = {
  REQUEST: { label: 'Request', dot: 'bg-sky-500/70', title: 'Tipe: Request' },
  INCIDENT: { label: 'Incident', dot: 'bg-orange-500/70', title: 'Tipe: Incident' },
  COMPLAINT: { label: 'Complaint', dot: 'bg-violet-500/70', title: 'Tipe: Complaint' },
  INQUIRY: { label: 'Inquiry', dot: 'bg-emerald-500/70', title: 'Tipe: Inquiry' },
};

export function TypeBadge({ ticketType }: { ticketType: string | null }) {
  // Sama seperti PriorityBadge: code tak dikenal tampil apa adanya.
  // "Unknown" menyembunyikan informasi yang sebenarnya ada di data.
  if (!ticketType) return null;
  const v = TYPE_MAP[ticketType as TicketType];
  if (!v) return <Badge variant="outline">{ticketType}</Badge>;
  return (
    <DotChip dotClass={v.dot} title={v.title}>
      {v.label}
    </DotChip>
  );
}