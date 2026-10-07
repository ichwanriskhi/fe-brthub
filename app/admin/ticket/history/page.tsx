'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import {
  getAdminTicketHistory,
  type AdminTicketHistoryParams,
} from '@/lib/api/admin-ticket-history';
import { getMasterDataAll } from '@/lib/api/master';
import { getAdminEmployees } from '@/lib/api/admin-employees';
import type { Ticket } from '@/lib/types/ticket';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { useMasterOptions } from '@/hooks/use-master-options';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/shared/DataTable';
import type { DataTableFeatures } from '@/components/shared/data-table-features';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { ColumnToggle } from '@/components/shared/ColumnToggle';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { Inbox, ArrowUpRight, CheckCircle2, Clock3 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const columnHelper = createColumnHelper<DataTableFeatures, Ticket>();

export default function AdminTicketHistoryPage() {
  const [search, setSearch] = useState('');
  const [filterValues, setFilter] = useState<TableFilterValues>({});
  // Label pendek ("A (Tinggi)") dipertahankan — sama dengan sebelumnya.
  const { priorities, ticketTypes } = useMasterOptions();
  const priorityOptions = useMemo(
    () => priorities.map((p) => ({ value: p.code, label: `${p.code} (${p.name})` })),
    [priorities]
  );
  const typeOptions = useMemo(
    () => ticketTypes.map((t) => ({ value: t.code, label: t.name })),
    [ticketTypes]
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ closedCount: 0, rejectedCount: 0, totalCount: 0 });
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [handlerOptions, setHandlerOptions] = useState<{ value: string; label: string }[]>([]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load dropdown options (kategori & handler) sekali
  useEffect(() => {
    (async () => {
      try {
        const [master, employees] = await Promise.all([
          getMasterDataAll(),
          getAdminEmployees({ per_page: 100 }),
        ]);
        setCategoryOptions(
          master.categories.map((c) => ({ value: String(c.id), label: c.name })),
        );
        setHandlerOptions(
          employees.data
            .map((e) => ({ value: String(e.id), label: e.user?.full_name ?? `Pegawai #${e.id}` }))
            .filter((h, i, arr) => arr.findIndex((x) => x.value === h.value) === i),
        );
      } catch {
        // dropdown opsional — biarkan kosong kalau gagal
      }
    })();
  }, []);

  // Load tickets dari server (server-side filter + pagination)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params: AdminTicketHistoryParams = {
          per_page: perPage,
          page: currentPage,
          withSummary: true,
        };
        if (search) params.search = search;
        if (filterValues.status === 'CLOSED' || filterValues.status === 'REJECTED') {
          params.status = filterValues.status;
        }
        if (filterValues.priority) params.priority = filterValues.priority as 'A' | 'B' | 'C';
        if (filterValues.type) params.ticketType = filterValues.type as AdminTicketHistoryParams['ticketType'];
        if (filterValues.category) params.categoryId = String(filterValues.category);
        if (filterValues.handler) params.handlerId = String(filterValues.handler);
        if (dateRange?.from) {
          params.dateFrom = dateRange.from.toISOString().slice(0, 10);
          if (dateRange.to) params.dateTo = dateRange.to.toISOString().slice(0, 10);
        }

        const res = await getAdminTicketHistory({ ...params, withSummary: true });
        if (cancelled) return;
        setTickets(res.data);
        setLastPage(res.last_page ?? 1);
        setTotal(res.total ?? 0);
        const s = (res as unknown as { summary?: { closed_count?: number; rejected_count?: number; total_count?: number } }).summary;
        if (s) {
          setSummary({
            closedCount: s.closed_count ?? 0,
            rejectedCount: s.rejected_count ?? 0,
            totalCount: s.total_count ?? 0,
          });
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Gagal memuat riwayat tiket.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [search, filterValues, dateRange, currentPage, perPage]);

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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/50 text-xs font-medium">
            {row.original.reporterName.slice(0, 1)}
          </div>
          <span className="text-sm">{row.original.reporterName}</span>
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
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    }),
    columnHelper.display({
      id: 'detail',
      header: () => <div className="text-right">Detail</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" asChild>
            <Link href={`/admin/ticket/history/${row.original.id}`}>
              Detail
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      ),
      enableHiding: false,
    }),
  ]);

  const totalPages = Math.max(1, lastPage);
  const safePage = Math.min(currentPage, totalPages);
  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const stats = [
    { label: 'Tiket Selesai', value: String(summary.closedCount), subtitle: 'Total penutupan', icon: CheckCircle2 },
    { label: 'Tiket Ditolak', value: String(summary.rejectedCount), subtitle: 'Tidak dilanjutkan', icon: Inbox },
    { label: 'Total Riwayat', value: String(summary.totalCount), subtitle: 'Selesai + ditolak', icon: Clock3 },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats cards — tanpa card komplain */}
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {stats.map((s) => (
          <StatisticsCard key={s.label} {...s} />
        ))}
      </div>

      <Card className="w-full gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={searchInput}
            onSearchChange={(v) => { setSearchInput(v); }}
            searchPlaceholder="Cari ID tiket, SO, subjek..."
            filters={[
              { key: 'status', label: 'Status', options: [
                { value: 'CLOSED', label: 'Selesai' },
                { value: 'REJECTED', label: 'Ditolak' },
              ]},
              { key: 'priority', label: 'Prioritas', options: priorityOptions },
              { key: 'type', label: 'Tipe Tiket', options: typeOptions },
              { key: 'category', label: 'Kategori', options: categoryOptions },
              { key: 'handler', label: 'Handler', options: handlerOptions },
            ]}
            filterValues={filterValues}
            onFilterChange={(key, value) => { setFilter((prev) => ({ ...prev, [key]: value })); setCurrentPage(1); }}
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

        {!loading && tickets.length === 0 ? (
          <Empty className="border-0 py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>Tidak ada tiket riwayat</EmptyTitle>
              <EmptyDescription>
                Tiket yang selesai atau ditolak akan tampil di sini.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {/* Mobile card */}
            <div
              className={cn(
                'px-4 pb-4 transition-opacity md:hidden',
                loading && tickets.length > 0 && 'pointer-events-none opacity-50',
              )}
            >
              {tickets.map((ticket) => (
                <div key={ticket.id} className="mb-3 rounded-lg border bg-card py-4 last:mb-0">
                  <div className="px-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                        <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.reporterName}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <PriorityBadge priority={ticket.priority} />
                        <TypeBadge ticketType={ticket.ticketType} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <StatusBadge status={ticket.status} />
                      <Link
                        href={`/admin/ticket/history/${ticket.id}`}
                        className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                      >
                        Detail <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden px-4 pb-4 md:block">
              {loading && tickets.length === 0 ? (
                <TableSkeleton />
              ) : (
                <DataTable
                  mode="server"
                  columns={columns}
                  data={tickets}
                  isPending={loading}
                  showRowNumbers
                  rowNumberOffset={(safePage - 1) * perPage}
                  columnVisibility={columnVisibility}
                  onColumnVisibilityChange={setColumnVisibility}
                  emptyText="Tidak ada tiket riwayat."
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
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
