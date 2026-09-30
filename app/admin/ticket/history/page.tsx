'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  getAdminTicketHistory,
  type AdminTicketHistoryParams,
} from '@/lib/api/admin-ticket-history';
import { getMasterDataAll } from '@/lib/api/master';
import { getAdminEmployees } from '@/lib/api/admin-employees';
import type { Ticket } from '@/lib/types/ticket';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Inbox, ArrowUpRight, CheckCircle2, Clock3 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 20;

function getPaginationItems(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const items: (number | 'ellipsis')[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) items.push(i);
  } else if (currentPage <= 3) {
    items.push(1, 2, 3, 'ellipsis', totalPages);
  } else if (currentPage >= totalPages - 2) {
    items.push(1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages);
  } else {
    items.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
  }
  return items;
}

export default function AdminTicketHistoryPage() {
  const [search, setSearch] = useState('');
  const [filterValues, setFilter] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
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
          per_page: ITEMS_PER_PAGE,
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
  }, [search, filterValues, dateRange, currentPage]);

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
              { key: 'priority', label: 'Prioritas', options: [
                { value: 'A', label: 'A (Tinggi)' },
                { value: 'B', label: 'B (Normal)' },
                { value: 'C', label: 'C (Rendah)' },
              ]},
              { key: 'type', label: 'Tipe Tiket', options: [
                { value: 'REQUEST', label: 'Request' },
                { value: 'INCIDENT', label: 'Incident' },
                { value: 'COMPLAINT', label: 'Complaint' },
                { value: 'INQUIRY', label: 'Inquiry' },
              ]},
              { key: 'category', label: 'Kategori', options: categoryOptions },
              { key: 'handler', label: 'Handler', options: handlerOptions },
            ]}
            filterValues={filterValues}
            onFilterChange={(key, value) => { setFilter((prev) => ({ ...prev, [key]: value })); setCurrentPage(1); }}
            dateRange={dateRange}
            onDateRangeChange={(r) => { setDateRange(r); setCurrentPage(1); }}
          />
        </CardContent>



        {!loading && tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada tiket riwayat</p>
            <p className="text-xs text-muted-foreground">Tiket yang selesai atau ditolak akan tampil di sini.</p>
          </div>
        ) : (
          <>
            {/* Mobile card */}
            <div className="md:hidden px-4 pb-4">
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
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-muted/50 px-6 py-3">ID Tiket</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Subjek</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Pelapor</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3 text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{ticket.id}</TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="max-w-[240px] space-y-0.5">
                          <p className="truncate text-sm font-medium">{ticket.subject}</p>
                          <p className="truncate text-xs text-muted-foreground">SO: {ticket.soNumber ?? '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3 text-sm">{ticket.reporterName}</TableCell>
                      <TableCell className="px-6 py-3"><TypeBadge ticketType={ticket.ticketType} /></TableCell>
                      <TableCell className="px-6 py-3"><PriorityBadge priority={ticket.priority} /></TableCell>
                      <TableCell className="px-6 py-3"><StatusBadge status={ticket.status} /></TableCell>
                      <TableCell className="px-6 py-3 text-right">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                          <Link href={`/admin/ticket/history/${ticket.id}`}>
                            Detail
                            <ArrowUpRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="border-t px-6 py-4">
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationPrevious onClick={() => goToPage(safePage - 1)} />
              <PaginationContent>
                {getPaginationItems(safePage, totalPages).map((item, i) =>
                  item === 'ellipsis' ? (
                    <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink isActive={item === safePage} onClick={() => goToPage(item as number)}>
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
              </PaginationContent>
              <PaginationNext onClick={() => goToPage(safePage + 1)} />
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
}
