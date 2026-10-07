'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PriorityBadge, StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import type { Ticket } from '@/lib/types/ticket';

type HeaderTicket = Pick<
  Ticket,
  'id' | 'subject' | 'createdAt' | 'priority' | 'ticketType' | 'status'
>;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Header halaman detail tiket — identitas, judul, dan status di LUAR Card.
 *
 * Semua halaman detail (unit, handler, reviewer, approver, admin, reporter)
 * memakai komponen ini supaya urutan badge, format tanggal, dan posisi aksi
 * selalu sama. Card hanya dipakai untuk isi yang butuh pengelompokan.
 */
export function TicketHeader({
  ticket,
  backHref,
  backLabel,
  actions,
}: {
  ticket: HeaderTicket;
  backHref: string;
  backLabel: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link href={backHref}>
            <ArrowLeft data-icon="inline-start" />
            {backLabel}
          </Link>
        </Button>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <p className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{ticket.id}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(ticket.createdAt)}</span>
        </p>
        <h1 className="text-balance text-xl font-semibold tracking-tight md:text-2xl">
          {ticket.subject}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={ticket.priority} />
          <TypeBadge ticketType={ticket.ticketType} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>
    </div>
  );
}