'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getHandlerTickets, type HandlerTicketStatus } from '@/lib/api/handler';
import type { Ticket } from '@/lib/types/ticket';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Inbox,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  notes: string;
  timestamp: string;
  sortKey: number;
}

function toEpoch(value: string): number {
  const n = Date.parse(value);
  return Number.isNaN(n) ? 0 : n;
}

export default function HandlerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [byStatus, setByStatus] = useState<Record<HandlerTicketStatus, Ticket[]>>({
    NEED_ACTION: [],
    WAITING_REVIEW: [],
    REWORK: [],
    HISTORY: [],
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getHandlerTickets('NEED_ACTION'),
      getHandlerTickets('WAITING_REVIEW'),
      getHandlerTickets('REWORK'),
      getHandlerTickets('HISTORY'),
    ])
      .then(([need, waiting, rework, history]) => {
        if (cancelled) return;
        setByStatus({
          NEED_ACTION: need.data,
          WAITING_REVIEW: waiting.data,
          REWORK: rework.data,
          HISTORY: history.data,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : 'Gagal memuat dashboard handler.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(
    () => [
      {
        label: 'Perlu Tindakan',
        value: String(byStatus.NEED_ACTION.length),
        subtitle: 'Belum ada resolusi',
        icon: Inbox,
      },
      {
        label: 'Menunggu Review',
        value: String(byStatus.WAITING_REVIEW.length),
        subtitle: 'Resolusi diajukan',
        icon: LoaderCircle,
        showTrend: true,
      },
      {
        label: 'Perlu Revisi',
        value: String(byStatus.REWORK.length),
        subtitle: 'Resolusi ditolak approver',
        icon: AlertCircle,
      },
      {
        label: 'Selesai',
        value: String(byStatus.HISTORY.length),
        subtitle: 'Resolusi disetujui / ditutup',
        icon: CheckCircle2,
        showTrend: true,
      },
    ],
    [byStatus],
  );

  const urgentQueue = useMemo(() => byStatus.NEED_ACTION.slice(0, 5), [byStatus.NEED_ACTION]);

  const recentActivities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const group of Object.values(byStatus)) {
      for (const ticket of group) {
        for (const p of ticket.handlerProgress ?? []) {
          items.push({
            id: `${ticket.id}-prog-${p.id}`,
            actor: p.actorName ?? ticket.handlerName ?? 'Handler',
            action: 'menambahkan progres',
            notes: p.note,
            timestamp: p.timestamp,
            sortKey: toEpoch(p.timestamp),
          });
        }
        for (const r of ticket.resolutions ?? []) {
          items.push({
            id: `${ticket.id}-res-${r.id}`,
            actor: ticket.handlerName ?? 'Handler',
            action: `mengajukan resolusi #${r.resolutionNo}`,
            notes: r.summary,
            timestamp: r.submittedAt,
            sortKey: toEpoch(r.submittedAt),
          });
        }
      }
    }
    return items.sort((a, b) => b.sortKey - a.sortKey).slice(0, 6);
  }, [byStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {metrics.map((m) => (
          <StatisticsCard key={m.label} {...m} />
        ))}
      </div>

      {/* Urgent Queue Table */}
      <Card className="col-span-full w-full gap-0 overflow-hidden p-0">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle>Perlu Tindakan Segera</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/handler/need-action">
                Lihat semua
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {urgentQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Inbox className="size-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Tidak ada tiket yang perlu ditindaklanjuti saat ini.
              </p>
            </div>
          ) : (
            <>
              <div className="border-t md:hidden">
                {urgentQueue.map((ticket) => (
                  <div key={ticket.id} className="space-y-3 border-b p-4 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                        <p className="line-clamp-2 text-sm font-semibold">{ticket.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">SO: {ticket.soNumber ?? '-'}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <PriorityBadge priority={ticket.priority} />
                        <TypeBadge ticketType={ticket.ticketType} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={ticket.status} />
                      <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                        <Link href={`/handler/ticket/${ticket.id}`}>Detail</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-muted/50 px-6 py-3">ID Tiket</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Subjek</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {urgentQueue.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="whitespace-nowrap px-6 py-3 font-mono text-xs">{ticket.id}</TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="max-w-[240px] space-y-0.5">
                            <p className="truncate text-sm font-medium">{ticket.subject}</p>
                            <p className="truncate text-xs text-muted-foreground">SO: {ticket.soNumber ?? '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <TypeBadge ticketType={ticket.ticketType} />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <PriorityBadge priority={ticket.priority} />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
                            <Link href={`/handler/ticket/${ticket.id}`}>
                              Detail
                              <ArrowUpRight className="size-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="size-4 text-muted-foreground" />
            Aktivitas Terbaru
          </CardTitle>
          <CardDescription>Progres & pengajuan resolusi terakhir Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada aktivitas terbaru</p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex gap-3">
                  <div className="mt-1 flex flex-col items-center">
                    <div className="size-2 rounded-full bg-primary" />
                    {act.id !== recentActivities[recentActivities.length - 1].id && (
                      <div className="h-4 w-px bg-border" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{act.actor}</span> {act.action}
                          <span className="mx-1 text-muted-foreground">•</span>
                          <span className="font-medium text-primary">Tiket</span>
                        </p>
                        {act.notes && (
                          <p className="mt-1 text-xs text-muted-foreground">Catatan: {act.notes}</p>
                        )}
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{act.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
