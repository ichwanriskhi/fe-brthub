'use client';

import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { MOCK_EMPLOYEES } from '@/lib/mock/admin';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { CategoryTrendChart } from '@/components/shared/CategoryTrendChart';
import { ProductTrendChart } from '@/components/shared/ProductTrendChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Inbox,
  CheckCircle2,
  Clock,
  Users,
  ArrowUpRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const openCount = MOCK_TICKETS.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = MOCK_TICKETS.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingReviewCount = MOCK_TICKETS.filter((t) => t.status === 'PENDING_REVIEW').length;
  const closedCount = MOCK_TICKETS.filter((t) => t.status === 'CLOSED').length;
  const activeEmployees = MOCK_EMPLOYEES.filter((e) => e.accountStatus === 'ACTIVE').length;
  const notActivated = MOCK_EMPLOYEES.filter((e) => e.accountStatus === 'NOT_ACTIVATED').length;

  const recentTickets = [...MOCK_TICKETS]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = [
    { label: 'Tiket Open', value: String(openCount), subtitle: 'Menunggu review awal', icon: Inbox },
    { label: 'Sedang Dikerjakan', value: String(inProgressCount + pendingReviewCount), subtitle: 'Di handler / review', icon: Clock, showTrend: true },
    { label: 'Pegawai Aktif', value: String(activeEmployees), subtitle: `${notActivated} belum aktivasi`, icon: Users },
    { label: 'Tiket Selesai', value: String(closedCount), subtitle: 'Total penutupan', icon: CheckCircle2, showTrend: true },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {stats.map((s) => (
          <StatisticsCard key={s.label} icon={s.icon} value={s.value} label={s.label} subtitle={s.subtitle} showTrend={s.showTrend} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CategoryTrendChart />
        <ProductTrendChart />
      </div>

      <Card className="col-span-full w-full gap-0 overflow-hidden p-0">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle>Tiket Terbaru</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/ticket/monitoring">
                Monitoring Tiket
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
                <TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{ticket.id}</TableCell>
                  <TableCell className="px-6 py-3">
                    <Link
                      href={`/admin/monitoring/${ticket.id}`}
                      className="block max-w-[240px] truncate text-sm font-medium hover:text-primary transition-colors"
                    >
                      {ticket.subject}
                    </Link>
                  </TableCell>
                  <TableCell className="px-6 py-3 text-sm">{ticket.reporterName}</TableCell>
                  <TableCell className="px-6 py-3">
                    <TypeBadge ticketType={ticket.ticketType} />
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <StatusBadge status={ticket.status} />
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