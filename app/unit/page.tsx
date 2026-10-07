'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import { getUnitTickets, getUnitHistory } from '@/lib/api/handler';
import type { Ticket } from '@/lib/types/ticket';
import { reporterDisplay, reporterInitials } from '@/lib/utils/ticket-display';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/shared/DataTable';
import type { DataTableFeatures } from '@/components/shared/data-table-features';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { ColumnToggle } from '@/components/shared/ColumnToggle';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Inbox,
  Clock,
  CircleDashed,
  Timer,
  ArrowUpRight,
  UserPlus,
  AlertCircle,
  CircleCheckBig,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const URGENT_LIMIT = 5;

function toEpoch(value: string): number {
  const n = Date.parse(value);
  return Number.isNaN(n) ? 0 : n;
}

const columnHelper = createColumnHelper<DataTableFeatures, Ticket>();

const queueColumns: ColumnDef<DataTableFeatures, Ticket>[] = columnHelper.columns([
  columnHelper.accessor('id', {
    header: 'ID Tiket',
    cell: ({ row }) => (
      <span className="font-mono text-xs whitespace-nowrap">{row.original.id}</span>
    ),
  }),
  columnHelper.accessor('subject', {
    header: 'Subjek',
    cell: ({ row }) => (
      <div className="max-w-[240px] space-y-0.5">
        <p className="truncate text-sm font-medium">{row.original.subject}</p>
        <p className="truncate text-xs text-muted-foreground">{row.original.category}</p>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'tipe',
    header: 'Tipe',
    cell: ({ row }) => <TypeBadge ticketType={row.original.ticketType} />,
  }),
  columnHelper.display({
    id: 'prioritas',
    header: 'Prioritas',
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
  }),
  columnHelper.display({
    id: 'pelapor',
    header: 'Pelapor',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-6 shrink-0">
          <AvatarFallback className="text-[10px]">{reporterInitials(row.original)}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm">{reporterDisplay(row.original)}</span>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'handler',
    header: 'Handler',
    cell: ({ row }) => (
      <span className="text-xs">
        {row.original.handlerName ?? <span className="text-muted-foreground">Belum ada</span>}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'aksi',
    header: () => <div className="text-right">Aksi</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <Button size="sm" asChild>
          <Link href={`/unit/tiket/${row.original.id}`}>
            <UserPlus data-icon="inline-start" />
            Assign
          </Link>
        </Button>
      </div>
    ),
    enableHiding: false,
  }),
]);

export default function UnitDashboardPage() {
  const [queue, setQueue] = useState<Ticket[]>([]);
  const [history, setHistory] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getUnitTickets({ page: 1 }), getUnitHistory(1)])
      .then(([queueResult, historyResult]) => {
        if (cancelled) return;
        setQueue(queueResult.data);
        setHistory(historyResult.data);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Gagal memuat dashboard unit.');
        toast.error(error instanceof Error ? error.message : 'Gagal memuat dashboard unit.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Antrean = tiket IN_PROGRESS departemen ini; belum ada handler aktif.
  const pendingQueue = useMemo(() => queue.filter((t) => !t.handlerName), [queue]);
  const assignedCount = useMemo(
    () => history.filter((t) => !!t.handlerName).length,
    [history],
  );
  const inProgressCount = useMemo(
    () => queue.filter((t) => t.status === 'IN_PROGRESS' && t.handlerName).length,
    [queue],
  );
  const pendingReviewCount = useMemo(
    () => history.filter((t) => t.status === 'PENDING_REVIEW').length,
    [history],
  );

  const stats = [
    {
      label: 'Ditugaskan',
      value: String(assignedCount),
      subtitle: 'Tiket dengan handler aktif',
      icon: Inbox,
    },
    {
      label: 'Sedang Dikerjakan',
      value: String(inProgressCount),
      subtitle: 'Diproses oleh handler',
      icon: Clock,
      showTrend: true,
    },
    {
      label: 'Menunggu Review',
      value: String(pendingReviewCount),
      subtitle: 'Resolusi diajukan handler',
      icon: CircleDashed,
    },
    {
      label: 'Belum Ditugaskan',
      value: String(pendingQueue.length),
      subtitle: 'Menunggu penentuan handler',
      icon: Timer,
    },
  ];

  const priorityCount = (p: 'A' | 'B' | 'C') => history.filter((t) => t.priority === p).length;

  const priorityData = [
    { name: 'Prioritas A', value: priorityCount('A'), color: '#ef4444' },
    { name: 'Prioritas B', value: priorityCount('B'), color: '#f59e0b' },
    { name: 'Prioritas C', value: priorityCount('C'), color: '#0ea5e9' },
  ].filter((d) => d.value > 0);

  // Aktivitas penugasan terbaru dari assignment handler (history).
  const activities = useMemo(() => {
    const items: {
      key: string;
      ticketId: string;
      assignedTo: string;
      assignedBy: string;
      time: string;
      sortKey: number;
      status: Ticket['status'];
    }[] = [];

    for (const t of history) {
      for (const a of t.handlerAssignments ?? []) {
        items.push({
          key: `${t.id}-${a.id}`,
          ticketId: t.id,
          assignedTo: a.handlerName ?? '-',
          assignedBy: a.assignedByName ?? '-',
          time: a.assignedAt,
          sortKey: toEpoch(a.assignedAt),
          status: t.status,
        });
      }
    }

    return items.sort((a, b) => b.sortKey - a.sortKey).slice(0, 5);
  }, [history]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-8 text-muted-foreground/60" />
      </div>
    );
  }

  if (loadError && queue.length === 0 && history.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-medium text-destructive">{loadError}</p>
        </div>
      </div>
    );
  }

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
                        contentStyle={{
                          borderRadius: '8px',
                          fontSize: '12px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--background)',
                        }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                  {priorityData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
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
            <CardDescription>Assignment handler terbaru di departemen Anda</CardDescription>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {activities.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Inbox className="size-5 text-muted-foreground/40" />
                <span>Belum ada aktivitas penugasan</span>
              </div>
            ) : (
              activities.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {item.assignedTo
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-col">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold">{item.ticketId}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-sm font-medium">{item.assignedTo}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Ditugaskan oleh {item.assignedBy}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {item.time
                        ? new Date(item.time).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </span>
                    <StatusBadge status={item.status} />
                    <Button size="sm" asChild>
                      <Link href={`/unit/tiket/${item.ticketId}`}>
                        Detail
                        <ArrowUpRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Queue table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Menunggu Penugasan</CardTitle>
            <CardDescription>
              {URGENT_LIMIT} tiket yang sudah disetujui dan diterima departemen Anda
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ColumnToggle
              columns={queueColumns}
              visibility={columnVisibility}
              onVisibilityChange={setColumnVisibility}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href="/unit/antrean">
                Lihat semua
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && pendingQueue.length === 0 ? (
            <TableSkeleton rows={URGENT_LIMIT} />
          ) : pendingQueue.length === 0 ? (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleCheckBig />
                </EmptyMedia>
                <EmptyTitle>Tidak ada tiket yang menunggu penugasan</EmptyTitle>
                <EmptyDescription>
                  Semua tiket departemen Anda sudah memiliki handler.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div
                className={cn(
                  // Tanpa `px-*`: `CardContent` sudah memberi padding kiri-kanan.
                  'space-y-3 transition-opacity md:hidden',
                  loading && 'pointer-events-none opacity-50',
                )}
              >
                {pendingQueue.slice(0, URGENT_LIMIT).map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border bg-card py-4">
                    <div className="space-y-3 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                          <p className="line-clamp-2 text-sm font-semibold">{ticket.subject}</p>
                          <p className="truncate text-xs text-muted-foreground">{ticket.category}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <PriorityBadge priority={ticket.priority} />
                          <TypeBadge ticketType={ticket.ticketType} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-5 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {reporterInitials(ticket)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate text-xs text-muted-foreground">
                          {reporterDisplay(ticket)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Timer className="size-3.5" /> {ticket.handlerName ? 'Ada handler' : 'Belum ada handler'}
                        </span>
                        <Button size="sm" asChild>
                          <Link href={`/unit/tiket/${ticket.id}`}>
                            <UserPlus data-icon="inline-start" />
                            Assign
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={cn('hidden md:block', loading && 'pointer-events-none opacity-50')}
              >
                <DataTable
                  columns={queueColumns}
                  data={pendingQueue.slice(0, URGENT_LIMIT)}
                  isPending={loading}
                  columnVisibility={columnVisibility}
                  onColumnVisibilityChange={setColumnVisibility}
                  emptyText="Tidak ada tiket yang menunggu penugasan."
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
