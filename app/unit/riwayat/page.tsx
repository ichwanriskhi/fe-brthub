'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import { getAllUnitHistory } from '@/lib/api/handler';
import type { Ticket, TicketStatus } from '@/lib/types/ticket';
import { TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { DotChip } from '@/components/shared/DotChip';
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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ArrowUpRight, AlertCircle, History } from 'lucide-react';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const PAGE_SIZE = 10;

export default function UnitHistoryPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  // Seluruh riwayat diambil sekali (semua halaman digabung) — filter per
  // handler/status penugasan bekerja pada baris turunan, jadi client-side.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getAllUnitHistory()
      .then((data) => {
        if (cancelled) return;
        setTickets(data);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTickets([]);
        setLoadError(error instanceof Error ? error.message : 'Gagal memuat riwayat penugasan.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  // Setiap tiket bisa punya beberapa assignment handler (aktif + diganti).
  // Kembangkan jadi baris per assignment agar bisa difilter per handler.
  type HistoryRow = {
    key: string;
    ticketId: string;
    subject: string;
    ticketType: string;
    category: string;
    priority: Ticket['priority'];
    status: TicketStatus;
    handler: string;
    assignedBy: string;
    assignedAt: string;
    isCurrent: boolean;
  };

  const rows = useMemo<HistoryRow[]>(() => {
    const out: HistoryRow[] = [];
    for (const t of tickets) {
      const assignments = t.handlerAssignments ?? [];
      if (assignments.length === 0) {
        // Tiket tanpa assignment handler — tampilkan sekali agar tidak hilang.
        out.push({
          key: `${t.id}-none`,
          ticketId: t.id,
          subject: t.subject,
          ticketType: t.ticketType,
          category: t.category,
          priority: t.priority,
          status: t.status,
          handler: '-',
          assignedBy: '-',
          assignedAt: t.createdAt,
          isCurrent: false,
        });
        continue;
      }
      for (const a of assignments) {
        out.push({
          key: `${t.id}-${a.id}`,
          ticketId: t.id,
          subject: a.isActive ? t.subject : `${t.subject} (Reassignment)`,
          ticketType: t.ticketType,
          category: t.category,
          priority: t.priority,
          status: t.status,
          handler: a.handlerName ?? '-',
          assignedBy: a.assignedByName ?? '-',
          assignedAt: a.assignedAt,
          isCurrent: a.isActive,
        });
      }
    }
    return out;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((row) => {
      const matchesSearch =
        q === '' ||
        row.ticketId.toLowerCase().includes(q) ||
        row.subject.toLowerCase().includes(q) ||
        row.handler.toLowerCase().includes(q);
      const matchesHandler = !filterValues.handler || row.handler === filterValues.handler;
      const stateVal = filterValues.state;
      const matchesState =
        !stateVal ||
        (stateVal === 'current' && row.isCurrent) ||
        (stateVal === 'superseded' && !row.isCurrent);
      const created = new Date(row.assignedAt);
      const matchesDate =
        !dateRange?.from ||
        (created >= new Date(dateRange.from.toDateString()) &&
          (!dateRange.to || created <= new Date(dateRange.to.toDateString() + ' 23:59')));
      return matchesSearch && matchesHandler && matchesState && matchesDate;
    });
  }, [rows, search, filterValues, dateRange]);

  const handlerOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.handler).filter((h) => h !== '-'))].map((h) => ({
        value: h,
        label: h,
      })),
    [rows],
  );

  const fmtDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columnHelper = createColumnHelper<DataTableFeatures, HistoryRow>();

  const columns: ColumnDef<DataTableFeatures, HistoryRow>[] = columnHelper.columns([
    columnHelper.accessor('ticketId', {
      header: 'ID Tiket',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">{row.original.ticketId}</span>
      ),
    }),
    columnHelper.accessor('subject', {
      header: 'Subjek',
      cell: ({ row }) => (
        <span
          className={cn(
            'block max-w-[200px] truncate text-sm',
            row.original.isCurrent ? 'font-medium' : 'text-muted-foreground',
          )}
          title={row.original.subject}
        >
          {row.original.subject}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'tipe',
      header: 'Tipe',
      cell: ({ row }) => <TypeBadge ticketType={row.original.ticketType} />,
    }),
    columnHelper.display({
      id: 'kategori',
      header: 'Kategori',
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {row.original.category}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'prioritas',
      header: 'Prioritas',
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    }),
    columnHelper.display({
      id: 'handler',
      header: 'Handler',
      cell: ({ row }) => (
        <span
          className={cn('text-sm', row.original.isCurrent ? 'font-medium' : 'text-muted-foreground')}
        >
          {row.original.handler}
        </span>
      ),
    }),
    columnHelper.accessor('assignedBy', {
      header: 'Ditugaskan Oleh',
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {row.original.assignedBy}
        </span>
      ),
    }),
    columnHelper.accessor('assignedAt', {
      header: 'Waktu',
      cell: ({ row }) => (
        <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
          {fmtDate(row.original.assignedAt)}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <DotChip dotClass={row.original.isCurrent ? 'bg-emerald-500' : 'bg-muted-foreground/40'}>
          {row.original.isCurrent ? 'Aktif' : 'Digantikan'}
        </DotChip>
      ),
    }),
    columnHelper.display({
      id: 'aksi',
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" asChild>
            <Link href={`/unit/tiket/${row.original.ticketId}?from=riwayat`}>
              Detail
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      ),
      enableHiding: false,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Cari ID tiket, subjek, handler..."
            filters={[
              { key: 'handler', label: 'Handler', options: handlerOptions },
              {
                key: 'state',
                label: 'Status Penugasan',
                options: [
                  { value: 'current', label: 'Aktif' },
                  { value: 'superseded', label: 'Digantikan' },
                ],
              },
            ]}
            filterValues={filterValues}
            onFilterChange={setFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            action={
              <ColumnToggle
                columns={columns}
                visibility={columnVisibility}
                onVisibilityChange={setColumnVisibility}
              />
            }
          />
        </CardContent>

        {loading && tickets.length === 0 ? (
          <div className="px-4 pb-4">
            <TableSkeleton />
          </div>
        ) : loadError ? (
          <div className="px-4 pb-4">
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <AlertCircle />
                </EmptyMedia>
                <EmptyTitle>Gagal memuat riwayat</EmptyTitle>
                <EmptyDescription>{loadError}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 pb-4">
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <History />
                </EmptyMedia>
                <EmptyTitle>Tidak ada riwayat penugasan</EmptyTitle>
                <EmptyDescription>
                  Coba ubah filter atau kata kunci pencarian.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'flex flex-col gap-3 px-4 pb-4 transition-opacity md:hidden',
                loading && 'pointer-events-none opacity-50',
              )}
            >
              {filtered.map((row) => (
                <div key={row.key} className="rounded-lg border bg-card py-4">
                  <div className="space-y-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-mono text-xs text-muted-foreground">{row.ticketId}</p>
                        <p
                          className={cn(
                            'line-clamp-2 text-sm font-medium leading-snug',
                            !row.isCurrent && 'text-muted-foreground',
                          )}
                        >
                          {row.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.handler} · {fmtDate(row.assignedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <PriorityBadge priority={row.priority} />
                        <DotChip dotClass={row.isCurrent ? 'bg-emerald-500' : 'bg-muted-foreground/40'}>
                          {row.isCurrent ? 'Aktif' : 'Digantikan'}
                        </DotChip>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" asChild>
                        <Link href={`/unit/tiket/${row.ticketId}?from=riwayat`}>
                          Detail Tiket
                          <ChevronRight data-icon="inline-end" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={cn('hidden px-4 pb-4 md:block', loading && 'pointer-events-none opacity-50')}
            >
              <DataTable
                columns={columns}
                data={filtered}
                isPending={loading}
                pageSize={PAGE_SIZE}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                emptyText="Tidak ada riwayat penugasan."
              />
            </div>
          </>
        )}

        </Card>
    </div>
  );
}
