'use client';

import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Inbox, CheckCircle2, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';

export default function ReviewerDashboardPage() {
  const openCount = MOCK_TICKETS.filter(t => t.status === 'OPEN').length;
  const reworkCount = MOCK_TICKETS.filter(t => t.status === 'REWORK_REQUIRED').length;
  const pendingReviewCount = MOCK_TICKETS.filter(t => t.status === 'PENDING_REVIEW').length;
  const inProgressCount = MOCK_TICKETS.filter(t => t.status === 'IN_PROGRESS').length;
  const closedCount = MOCK_TICKETS.filter(t => t.status === 'CLOSED').length;

  const urgentQueue = MOCK_TICKETS.filter(t => t.status === 'OPEN' || t.status === 'PENDING_REVIEW').slice(0, 5);

  const stats = [
    { label: 'Tinjauan Awal', value: String(openCount + reworkCount), subtitle: 'Laporan baru & perlu revisi', icon: Inbox },
    { label: 'Tinjauan Akhir', value: String(pendingReviewCount), subtitle: 'Menunggu konfirmasi tutup', icon: Clock },
    { label: 'Sedang Dikerjakan', value: String(inProgressCount), subtitle: 'Di unit teknis', icon: TrendingUp, showTrend: true },
    { label: 'Selesai', value: String(closedCount), subtitle: 'Tiket ditutup', icon: CheckCircle2, showTrend: true },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {stats.map((s) => (
          <StatisticsCard key={s.label} {...s} />
        ))}
      </div>

      <Card className="col-span-full w-full gap-0 overflow-hidden p-0">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle>Perlu Tindakan Segera</CardTitle>
              <CardDescription>5 tiket teratas di antrean verifikasi dan persetujuan</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reviewer/tinjauan-awal">
                Lihat semua
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 px-6 py-3">ID Tiket</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Subjek</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Pelapor</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
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
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">
                            {(ticket.customerData?.name ?? ticket.reporterName).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{ticket.customerData?.name ?? ticket.reporterName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <TypeBadge ticketType={ticket.ticketType} />
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
                        <Link href={`/reviewer/tiket/${ticket.id}`}>
                          Tinjau
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
