'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS, MOCK_ACTIVITIES } from '@/lib/mock/data';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { TicketCardList } from '@/components/shared/TicketCardList';
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
} from 'lucide-react';

const HANDLER_NAME = 'Dimas P.';

const METRICS = [
    { label: 'Tiket Terbuka', value: String(MOCK_TICKETS.filter((t) => t.status === 'OPEN' && t.handlerName === HANDLER_NAME).length), subtitle: 'Belum ada resolusi', icon: Inbox },
    { label: 'Sedang Dikerjakan', value: String(MOCK_TICKETS.filter((t) => t.status === 'IN_PROGRESS' && t.handlerName === HANDLER_NAME).length), subtitle: 'Sedang diproses handler', icon: LoaderCircle, showTrend: true },
    { label: 'Selesai', value: String(MOCK_TICKETS.filter((t) => t.status === 'CLOSED' && t.handlerName === HANDLER_NAME).length), subtitle: 'Resolusi disetujui', icon: CheckCircle2, showTrend: true },
    { label: 'Perlu Revisi', value: String(MOCK_TICKETS.filter((t) => t.status === 'REWORK_REQUIRED' && t.handlerName === HANDLER_NAME).length), subtitle: 'Menunggu revisi resolusi', icon: AlertCircle },
]

export default function HandlerDashboardPage() {
  const openTickets = useMemo(
    () => MOCK_TICKETS.filter((t) => t.status === 'OPEN' && t.handlerName === HANDLER_NAME),
    []
  );

  const urgentQueue = useMemo(
    () => MOCK_TICKETS.filter((t) => (t.status === 'OPEN' || t.status === 'PENDING_REVIEW') && t.handlerName === HANDLER_NAME).slice(0, 5),
    []
  );

  const recentActivities = useMemo(() => {
    const allActivities: typeof MOCK_ACTIVITIES[string] = [];
    for (const ticketId in MOCK_ACTIVITIES) {
      allActivities.push(...MOCK_ACTIVITIES[ticketId]);
    }
    return allActivities
      .filter((a) => a.actor === HANDLER_NAME || a.role === 'Handler')
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, 6);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {METRICS.map((m) => (
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
          <div className="md:hidden border-t">
            {urgentQueue.map((ticket) => (
              <div key={ticket.id} className="border-b last:border-0 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                    <p className="text-sm font-semibold line-clamp-2">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">SO: {ticket.soNumber ?? '-'}</p>
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
                    <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{ticket.id}</TableCell>
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
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="size-4 text-muted-foreground" />
            Aktivitas Terbaru
          </CardTitle>
          <CardDescription>Aktivitas handler terakhir</CardDescription>
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
                          <span className="font-medium">{act.actor}</span> menandai resolusi
                          <span className="mx-1 text-muted-foreground">•</span>
                          <span className="font-medium text-primary">{act.action}</span>
                        </p>
                        {act.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Catatan: {act.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{act.timestamp}</span>
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
