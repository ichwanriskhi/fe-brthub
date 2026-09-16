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

export default function ManagerDashboardPage() {
  const allB = MOCK_TICKETS.filter(t => t.priority === 'B');
  const pendingClosure = allB.filter(t => (t.status === 'IN_PROGRESS' || t.status === 'REWORK_REQUIRED') && t.resolutionSummary);
  const closedCount = allB.filter(t => t.status === 'CLOSED').length;
  const inProgressCount = allB.filter(t => t.status === 'IN_PROGRESS').length;

  const stats = [
    { label: 'Menunggu Penutupan', value: String(pendingClosure.length), subtitle: 'Case priority B', icon: Clock },
    { label: 'Selesai', value: String(closedCount), subtitle: 'Case ditutup', icon: CheckCircle2, showTrend: true },
    { label: 'Sedang Dikerjakan', value: String(inProgressCount), subtitle: 'Di unit teknis', icon: TrendingUp },
    { label: 'Total Priority B', value: String(allB.length), subtitle: 'Seluruh riwayat', icon: Inbox },
  ]

  const recentPending = pendingClosure.slice(0, 5);

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
              <CardTitle>Menunggu Penutupan</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manager/antrean">
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
                <TableHead className="bg-muted/50 px-6 py-3">Handler</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPending.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{ticket.id}</TableCell>
                  <TableCell className="px-6 py-3">
                    <div className="max-w-[240px] space-y-0.5">
                      <p className="truncate text-sm font-medium">{ticket.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">{ticket.category}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-3 text-sm">{ticket.handlerName ?? '-'}</TableCell>
                  <TableCell className="px-6 py-3">
                    <TypeBadge ticketType={ticket.ticketType} />
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="px-6 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/manager/antrean/${ticket.id}`}>Review</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {recentPending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground italic">
                    Tidak ada case menunggu penutupan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
