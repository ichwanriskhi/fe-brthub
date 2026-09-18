'use client';

import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Inbox, LoaderCircle, CircleDashed, Timer, ArrowUpRight, UserPlus, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

// Aktivitas penugasan terbaru (mock)
const ACTIVITIES = [
  {
    id: 'BRT-2026-0909-002',
    assignedTo: 'Budi S.',
    role: 'Distribution Handler',
    assignedBy: 'Tri Mentari',
    time: '13 Sep 2026, 13:40',
    status: 'IN_PROGRESS' as const,
  },
  {
    id: 'BRT-2026-0913-001',
    assignedTo: 'Dimas P.',
    role: 'IT Service',
    assignedBy: 'Auto-route',
    time: '13 Sep 2026, 09:10',
    status: 'OPEN' as const,
  },
  {
    id: 'BRT-2026-0912-005',
    assignedTo: 'Rina A.',
    role: 'Warehouse Operations',
    assignedBy: 'Tri Mentari',
    time: '12 Sep 2026, 16:22',
    status: 'CLOSED' as const,
  },
];

export default function UnitDashboardPage() {
  const assignedCount = MOCK_TICKETS.filter((t) => t.handlerName).length;
  const inProgressCount = MOCK_TICKETS.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingReviewCount = MOCK_TICKETS.filter((t) => t.status === 'PENDING_REVIEW').length;
  const queueCount = MOCK_TICKETS.filter(
    (t) => t.priority != null && !t.handlerName && t.status !== 'REJECTED' && t.status !== 'CLOSED'
  ).length;

  const stats = [
    { label: 'Ditugaskan', value: String(assignedCount), subtitle: 'Tiket dengan handler aktif', icon: Inbox },
    { label: 'Sedang Dikerjakan', value: String(inProgressCount), subtitle: 'Diproses oleh handler', icon: LoaderCircle, showTrend: true },
    { label: 'Menunggu Review', value: String(pendingReviewCount), subtitle: 'Menunggu konfirmasi reviewer', icon: CircleDashed },
    { label: 'Belum Ditugaskan', value: String(queueCount), subtitle: 'Menunggu penentuan handler', icon: Timer },
  ]

  // Antrean menunggu penugasan handler
  const pendingQueue = MOCK_TICKETS.filter(
    (t) => t.priority != null && !t.handlerName && t.status !== 'REJECTED' && t.status !== 'CLOSED'
  );

  const priorityCount = (p: 'A' | 'B' | 'C') =>
    MOCK_TICKETS.filter((t) => t.priority === p).length;

  const priorityData = [
    { name: 'Prioritas A', value: priorityCount('A'), color: '#ef4444' },
    { name: 'Prioritas B', value: priorityCount('B'), color: '#f59e0b' },
    { name: 'Prioritas C', value: priorityCount('C'), color: '#0ea5e9' },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {stats.map((s) => (
          <StatisticsCard key={s.label} {...s} />
        ))}
      </div>

      {/* Priority & Activity Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Priority breakdown */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Sebaran Prioritas</CardTitle>
            <CardDescription>Komposisi prioritas tiket yang beredar saat ini</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            {priorityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Tidak ada data
              </div>
            ) : (
              <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                  {priorityData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs">
                      <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="font-medium">{entry.name}</span>
                      <span className="text-muted-foreground">({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Activity timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Aktivitas Penugasan Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {ACTIVITIES.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {item.assignedTo.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-col">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold">{item.id}</span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <span className="text-sm font-medium">{item.assignedTo}</span>
                      <span className="text-muted-foreground text-xs">({item.role})</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Ditugaskan oleh {item.assignedBy}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Queue table */}
      <Card className="w-full gap-0 overflow-hidden p-0">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle>Menunggu Penugasan</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/unit/antrean">
                Lihat semua
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="md:hidden border-t">
            {pendingQueue.slice(0, 5).map((ticket) => (
              <div key={ticket.id} className="border-b last:border-0 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                    <p className="text-sm font-semibold line-clamp-2">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">{ticket.category}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <PriorityBadge priority={ticket.priority} />
                    <TypeBadge ticketType={ticket.ticketType} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="size-5 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {(ticket.customerData?.name ?? ticket.reporterName).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {ticket.customerData?.name ?? ticket.reporterName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" /> 1d
                  </span>
                  <Button variant="outline" size="sm" asChild className="h-7 text-xs px-3 gap-1.5">
                    <Link href={`/unit/tiket/${ticket.id}`}>
                      <UserPlus className="size-3.5" />
                      Assign
                    </Link>
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
                  <TableHead className="bg-muted/50 px-6 py-3">Pelapor</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Menunggu</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingQueue.slice(0, 5).map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{ticket.id}</TableCell>
                    <TableCell className="px-6 py-3">
                      <div className="max-w-[240px] space-y-0.5">
                        <p className="truncate text-sm font-medium">{ticket.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">{ticket.category}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <TypeBadge ticketType={ticket.ticketType} />
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <PriorityBadge priority={ticket.priority} />
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
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="size-3.5" />
                        1d
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                        <Link href={`/unit/tiket/${ticket.id}`}>
                          <UserPlus className="size-3.5" />
                          Assign
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

    </div>
  );
}
