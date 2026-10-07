'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
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
import { Inbox, ChevronRight } from 'lucide-react';
import { TicketCardList } from '@/components/shared/TicketCardList';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import {
  useMasterOptions,
  toPriorityFilterOptions,
  toTicketTypeFilterOptions,
} from '@/hooks/use-master-options';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface Ticket {
  id: number;
  ticket_no: string;
  subject: string;
  description: string;
  reporter_user_id: number;
  customer_id: number | null;
  category_id: number | null;
  ticket_type_id: number | null;
  priority_id: number | null;
  status_id: number;
  approval_type: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  reporter_user?: { id: number; full_name: string; email: string; phone_number: string };
  customer?: { id: number; user: { id: number; full_name: string; email: string } };
  category?: { id: number; name: string; code: string; parent?: { id: number; name: string; code: string } };
  ticket_type?: { id: number; name: string; code: string };
  priority?: { id: number; name: string; code: 'A' | 'B' | 'C' };
  status?: { id: number; name: string; code: string };
  vehicle_detail?: { id: number; ticket_id: number; group_code: string | null; vehicle_model: string | null };
  sales_detail?: { id: number; ticket_id: number; so_number: string | null; sales_name: string | null; claimed_items: any[] | null };
}

interface TicketsResponse {
  data: Ticket[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const TICKETS_PER_PAGE = 10;

const getReporterName = (ticket: Ticket) => {
  if (ticket.reporter_user) return ticket.reporter_user.full_name;
  if (ticket.customer?.user) return ticket.customer.user.full_name;
  return 'Unknown';
};

const getSoNumber = (ticket: Ticket) => ticket.sales_detail?.so_number ?? '-';

/** Bentuk tabel yang dipakai `DataTable` — semua kolom string. */
interface AttentionRow {
  /** Dipakai untuk link detail — id numerik dari backend. */
  numericId: number;
  ticketNo: string;
  subject: string;
  soNumber: string;
  reporterName: string;
  ticketType: string | null;
  status: string;
}

const columnHelper = createColumnHelper<DataTableFeatures, AttentionRow>();

const columns: ColumnDef<DataTableFeatures, AttentionRow>[] = columnHelper.columns([
  columnHelper.accessor('ticketNo', {
    header: 'ID Tiket',
    cell: ({ row }) => (
      <span className="font-mono text-xs whitespace-nowrap">{row.original.ticketNo}</span>
    ),
  }),
  columnHelper.accessor('subject', {
    header: 'Subjek',
    cell: ({ row }) => (
      <div className="max-w-[280px] space-y-0.5">
        <p className="truncate text-sm font-medium">{row.original.subject}</p>
        <p className="truncate text-xs text-muted-foreground">SO: {row.original.soNumber}</p>
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
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status as never} />,
  }),
  columnHelper.display({
    id: 'aksi',
    header: () => <div className="text-right">Aksi</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <Button size="sm" asChild>
          <Link href={`/reviewer/tiket/${row.original.numericId}?from=tinjauan`}>
            Verifikasi
            <ChevronRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    ),
    enableHiding: false,
  }),
]);

export default function TinjauanAwalPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  // Opsi filter prioritas/tipe dari backend.
  const { priorities, ticketTypes } = useMasterOptions();
  const priorityOptions = useMemo(() => toPriorityFilterOptions(priorities), [priorities]);
  const typeOptions = useMemo(() => toTicketTypeFilterOptions(ticketTypes), [ticketTypes]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(TICKETS_PER_PAGE);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('brthub_token');
        if (!token) {
          throw new Error('No auth token');
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
        const params = new URLSearchParams({
          status_code: 'OPEN',
          page: currentPage.toString(),
          per_page: perPage.toString(),
        });
        if (search) params.append('search', search);

        const res = await fetch(`${API_URL}/api/auth/tickets?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.status}`);
        const data: TicketsResponse = await res.json();
        setTickets(data.data);
        setLastPage(data.last_page ?? 1);
        setTotal(data.total ?? data.data.length);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        toast.error(err instanceof Error ? err.message : 'Gagal memuat antrean tinjauan awal.');
        setTickets([]);
        setLastPage(1);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [currentPage, perPage, search]);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, lastPage);
  const safePage = Math.min(currentPage, totalPages);
  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            filters={[
              { key: 'priority', label: 'Prioritas', options: priorityOptions },
              { key: 'type', label: 'Tipe Tiket', options: typeOptions },
              { key: 'category', label: 'Kategori', options: [] },
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
              <EmptyTitle>Tidak ada tiket dalam antrean tinjauan awal</EmptyTitle>
              <EmptyDescription>
                Semua laporan telah diverifikasi.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <TicketCardList
              tickets={tickets.map((t) => ({
                id: t.ticket_no,
                subject: t.subject,
                reporterName: getReporterName(t),
                customerData: t.customer?.user ? { name: t.customer.user.full_name } : undefined,
                soNumber: getSoNumber(t),
                status: (t.status?.code ?? 'OPEN') as never,
                ticketType: t.ticket_type?.code ?? null,
                priority: t.priority?.code ?? null,
                category: t.category?.name ?? 'Uncategorized',
                createdAt: t.created_at,
                subcategory: '',
                description: '',
                reporterPhone: '',
                reporterAddress: '',
                isReportForCustomer: false,
                reporterType: undefined,
                attachments: [],
              })) as never}
              actionLabel="Verifikasi"
              hrefBase="/reviewer/tiket"
              linkQuery="?from=tinjauan"
              isPending={loading}
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
                data={tickets.map((t) => ({
                  numericId: t.id,
                  ticketNo: t.ticket_no,
                  subject: t.subject,
                  soNumber: getSoNumber(t),
                  reporterName: getReporterName(t),
                  ticketType: t.ticket_type?.code ?? null,
                  status: t.status?.code ?? 'OPEN',
                }))}
                isPending={loading}
                showRowNumbers
                rowNumberOffset={(safePage - 1) * perPage}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                emptyText="Tidak ada tiket dalam antrean tinjauan awal."
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
