'use client';

import { Badge } from '@/components/ui/badge';
import type { TicketStatus, TicketPriority, TicketType } from '@/lib/types/ticket';
import { CircleCheck, CircleDashed, LoaderCircle, CircleAlert, CircleX, CircleDot, MessageSquarePlus, TriangleAlert, MessageSquareWarning, HelpCircle } from 'lucide-react';

const STATUS_MAP: Record<TicketStatus, { label: string; icon: typeof CircleDot; iconClass: string }> = {
  OPEN: { label: 'Open', icon: CircleDot, iconClass: 'text-sky-600 dark:text-sky-400' },
  IN_PROGRESS: { label: 'Diproses', icon: LoaderCircle, iconClass: 'text-amber-600 dark:text-amber-400' },
  PENDING_REVIEW: { label: 'Menunggu Review', icon: CircleDashed, iconClass: 'text-violet-600 dark:text-violet-400' },
  REWORK_REQUIRED: { label: 'Perlu Revisi', icon: CircleAlert, iconClass: 'text-orange-600 dark:text-orange-400' },
  REJECTED: { label: 'Ditolak', icon: CircleX, iconClass: 'text-destructive' },
  CLOSED: { label: 'Selesai', icon: CircleCheck, iconClass: 'text-emerald-600 dark:text-emerald-400' },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const v = STATUS_MAP[status];
  const Icon = v.icon;
  return (
    <Badge variant="outline">
      <Icon data-icon="inline-start" className={v.iconClass} />
      {v.label}
    </Badge>
  );
}

const PRIORITY_STYLE: Record<TicketPriority, { label: string; cls: string }> = {
  A: { label: 'A', cls: 'border-destructive/50 bg-destructive/10 text-destructive' },
  B: { label: 'B', cls: 'border-amber-600/50 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  C: { label: 'C', cls: 'border-sky-600/50 bg-sky-500/10 text-sky-700 dark:text-sky-400' },
};

export function PriorityBadge({ priority }: { priority: TicketPriority | null }) {
  if (!priority) return null;
  const v = PRIORITY_STYLE[priority];
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

const TYPE_MAP: Record<TicketType, { label: string; icon: typeof CircleDot; iconClass: string }> = {
  REQUEST: { label: 'Request', icon: MessageSquarePlus, iconClass: 'text-sky-600 dark:text-sky-400' },
  INCIDENT: { label: 'Incident', icon: TriangleAlert, iconClass: 'text-orange-600 dark:text-orange-400' },
  COMPLAINT: { label: 'Complaint', icon: MessageSquareWarning, iconClass: 'text-violet-600 dark:text-violet-400' },
  INQUIRY: { label: 'Inquiry', icon: HelpCircle, iconClass: 'text-emerald-600 dark:text-emerald-400' },
};

export function TypeBadge({ ticketType }: { ticketType: TicketType }) {
  const v = TYPE_MAP[ticketType];
  const Icon = v.icon;
  return (
    <Badge variant="outline">
      <Icon data-icon="inline-start" className={v.iconClass} />
      {v.label}
    </Badge>
  );
}
