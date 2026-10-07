'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import {
  getMyReviewedTickets,
  type MyReviewedTicketsParams,
} from '@/lib/api/tickets';
import type { Ticket, TicketStatus, TicketPriority, TicketType } from '@/lib/types/ticket';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/shared/DataTable';
import type { DataTableFeatures } from '@/components/shared/data-table-features';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { ColumnToggle } from '@/components/shared/ColumnToggle';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Inbox, ChevronRight, Archive, CheckCircle2, XCircle, CircleDashed } from 'lucide-react';
import { TicketCardList } from '@/components/shared/TicketCardList';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import {
  useMasterOptions,
  toPriorityFilterOptions,
  toTicketTypeFilterOptions,
} from '@/hooks/use-master-options';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'Diproses' },
  { value: 'PENDING_REVIEW', label: 'Menunggu Review' },
  { value: 'REWORK_REQUIRED', label: 'Perlu Revisi' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'CLOSED', label: 'Selesai' },
  { value: 'PENDING_APPROVAL', label: 'Menunggu Approval' },
];

const DEFAULT_PER_PAGE = 10;

const columnHelper = createColumnHelper<DataTableFeatures, Ticket>();

const columns: ColumnDef<DataTableFeatures, Ticket>[] = columnHelper.columns([
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
        <p className="truncate text-xs text-muted-foreground">SO: {row.original.soNumber ?? '-'}</p>
      </div>
    ),
  }),
  columnHelper.accessor('reporterName', {
    header: 'Pelapor',
    cell: ({ row }) => <span className="truncate text-sm">{row.original.reporterName}</span>,
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
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Tanggal',
    cell: ({ row }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'aksi',
    header: () => <div className="text-right">Aksi</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <Button size="sm" asChild>
          <Link href={`/reviewer/tiket/${row.original.id}?from=riwayat`}>
            Detail
            <ChevronRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    ),
    enableHiding: false,
  }),
]);

export default function ReviewerRiwayatPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  // Opsi filter prioritas/tipe dari backend — rename/tambah/nonaktif master
  // langsung tercermin tanpa deploy.
  const { priorities, ticketTypes } = useMasterOptions();
  const priorityOptions = useMemo(() => toPriorityFilterOptions(priorities), [priorities]);
  const typeOptions = useMemo(() => toTicketTypeFilterOptions(ticketTypes), [ticketTypes]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params: MyReviewedTicketsParams = { page: currentPage, per_page: perPage };
    if (search) params.search = search;
    if (filterValues.status) params.status = filterValues.status as TicketStatus;
    if (filterValues.priority) params.priority = filterValues.priority as TicketPriority;
    if (filterValues.type) params.ticketType = filterValues.type as TicketType;
    if (filterValues.category) params.category = String(filterValues.category);
    if (dateRange?.from) {
      params.dateFrom = dateRange.from.toISOString().slice(0, 10);
      if (dateRange.to) params.dateTo = dateRange.to.toISOString().slice(0, 10);
    }

    getMyReviewedTickets(params)
      .then((res) => {
        if (cancelled) return;
        setTickets(res.data);
        setLastPage(res.last_page ?? 1);
        setTotal(res.total ?? res.data.length);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : 'Gagal memuat riwayat review.');
        setTickets([]);
        setLastPage(1);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, filterValues, dateRange, currentPage, perPage]);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Opsi kategori diturunkan dari kategori yang ada di halaman ini.
  const categoryOptions = [...new Set(tickets.map((t) => t.category).filter(Boolean))].map((c) => ({
    value: c,
    label: c,
  }));

  const totalPages = Math.max(1, lastPage);
  const safePage = Math.min(currentPage, totalPages);
  const goToPage = useCallback(
    (p: number) => setCurrentPage(Math.min(Math.max(1, p), Math.max(1, lastPage))),
    [lastPage],
  );

  const countByStatus = (status: TicketStatus) => tickets.filter((t) => t.status === status).length;

  const metrics = [
    { label: 'Total Review', value: String(total), subtitle: 'Tiket yang pernah Anda review', icon: Archive },
    { label: 'Selesai', value: String(countByStatus('CLOSED')), subtitle: 'Tiket ditutup', icon: CheckCircle2 },
    { label: 'Ditolak', value: String(countByStatus('REJECTED')), subtitle: 'Laporan tidak lolos', icon: XCircle },
    { label: 'Diproses', value: String(countByStatus('IN_PROGRESS') + countByStatus('PENDING_REVIEW') + countByStatus('PENDING_APPROVAL')), subtitle: 'Di unit teknis & menunggu', icon: CircleDashed },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {metrics.map((m) => (
          <StatisticsCard key={m.label} {...m} />
        ))}
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Cari ID tiket, SO, subjek, pelapor..."
            filters={[
              { key: 'status', label: 'Status', options: STATUS_OPTIONS },
              { key: 'type', label: 'Tipe Tiket', options: typeOptions },
              { key: 'priority', label: 'Prioritas', options: priorityOptions },
              { key: 'category', label: 'Kategori', options: categoryOptions },
            ]}
            filterValues={filterValues}
            onFilterChange={setFilter}
            dateRange={dateRange}
            onDateRangeChange={(r) => { setDateRange(r); setCurrentPage(1); }}
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
        ) : tickets.length === 0 ? (
          <Empty className="border-0 py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>Tidak ada tiket ditemukan</EmptyTitle>
              <EmptyDescription>
                Coba ubah filter status atau kata kunci pencarian.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <TicketCardList
              tickets={tickets}
              actionLabel="Detail"
              hrefBase="/reviewer/tiket"
              linkQuery="?from=riwayat"
              isPending={loading}
              meta={(t) => ({
                label: 'Tanggal',
                value: new Date(t.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
              })}
            />

            <div
              className={cn(
                'hidden px-4 pb-4 md:block',
                loading && 'pointer-events-none opacity-50',
              )}
            >
              <DataTable
                mode="server"
                columns={columns}
                data={tickets}
                isPending={loading}
                showRowNumbers
                rowNumberOffset={(safePage - 1) * perPage}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                emptyText="Tidak ada tiket ditemukan."
                footer={() => (
                  <DataTablePagination
                    page={safePage}
                    lastPage={totalPages}
                    total={total}
                    perPage={perPage}
                    onPageChange={goToPage}
                    onPerPageChange={(n) => {
                      setPerPage(n);
                      setCurrentPage(1);
                    }}
                  />
                )}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}