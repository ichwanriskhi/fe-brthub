'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
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
import { Inbox, ArrowUpRight, CheckCircle2, Clock3, BadgeCheck } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

const ITEMS_PER_PAGE = 10;

/** Tiket selesai = CLOSED / REJECTED */
const FINAL_STATUSES = ['CLOSED', 'REJECTED'];

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

  const finished = useMemo(
    () => MOCK_TICKETS.filter((t) => FINAL_STATUSES.includes(t.status)),
    []
  );

  const filtered = useMemo(() => {
    let result = finished.filter((t) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.soNumber && t.soNumber.toLowerCase().includes(q)) ||
        t.reporterName.toLowerCase().includes(q) ||
        (t.handlerName ?? '').toLowerCase().includes(q);
      const matchesStatus = !filterValues.status || t.status === filterValues.status;
      const matchesPriority = !filterValues.priority || t.priority === filterValues.priority;
      const matchesType = !filterValues.type || t.ticketType === filterValues.type;
      const matchesCategory = !filterValues.category || t.category === filterValues.category;
      const matchesHandler = !filterValues.handler || t.handlerName === filterValues.handler;
      const created = new Date(t.createdAt);
      const matchesDate =
        !dateRange?.from ||
        (created >= new Date(dateRange.from.toDateString()) &&
          (!dateRange.to || created <= new Date(dateRange.to.toDateString() + ' 23:59')));
      return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesCategory && matchesHandler && matchesDate;
    });
    return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [finished, search, filterValues, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const closedCount = finished.filter((t) => t.status === 'CLOSED').length;
  const rejectedCount = finished.filter((t) => t.status === 'REJECTED').length;
  const complaintCount = finished.filter((t) => t.ticketType === 'COMPLAINT').length;

  const stats = [
    { label: 'Tiket Selesai', value: String(closedCount), subtitle: 'Total penutupan', icon: CheckCircle2 },
    { label: 'Tiket Ditolak', value: String(rejectedCount), subtitle: 'Tidak dilanjutkan', icon: Inbox },
    { label: 'Komplain', value: String(complaintCount), subtitle: 'Tiket selesai bertipe complaint', icon: BadgeCheck },
    { label: 'Total Riwayat', value: String(finished.length), subtitle: 'Semua tiket selesai', icon: Clock3 },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {stats.map((s) => (
          <StatisticsCard key={s.label} {...s} />
        ))}
      </div>

      <Card className="w-full gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            searchPlaceholder="Cari ID tiket, SO, reporter, handler..."
            filters={[
              { key: 'status', label: 'Status', options: [
                { value: 'CLOSED', label: 'Selesai' },
                { value: 'REJECTED', label: 'Ditolak' },
              ]},
              { key: 'priority', label: 'Prioritas', options: [
                { value: 'A', label: 'A (Critical)' },
                { value: 'B', label: 'B (High)' },
                { value: 'C', label: 'C (Normal)' },
              ]},
              { key: 'type', label: 'Tipe Tiket', options: [
                { value: 'REQUEST', label: 'Request' },
                { value: 'INCIDENT', label: 'Incident' },
                { value: 'COMPLAINT', label: 'Complaint' },
                { value: 'INQUIRY', label: 'Inquiry' },
              ]},
              { key: 'category', label: 'Kategori', options: [...new Set(MOCK_TICKETS.map((t) => t.category))].map((c) => ({ value: c, label: c })) },
              { key: 'handler', label: 'Handler', options: [...new Set(MOCK_TICKETS.map((t) => t.handlerName ?? '').filter(Boolean))].map((h) => ({ value: h, label: h })) },
            ]}
            filterValues={filterValues}
            onFilterChange={(key, value) => { setFilter((prev) => ({ ...prev, [key]: value })); setCurrentPage(1); }}
            dateRange={dateRange}
            onDateRangeChange={(r) => { setDateRange(r); setCurrentPage(1); }}
          />
        </CardContent>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t">
          <div>
            <p className="text-sm font-medium">Riwayat Tiket</p>
            <p className="text-xs text-muted-foreground">
              {filtered.length} tiket selesai / ditolak
            </p>
          </div>
        </div>

        {paginatedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada tiket riwayat</p>
            <p className="text-xs text-muted-foreground">Tiket yang selesai akan tampil di sini.</p>
          </div>
        ) : (
          <>
            {/* Mobile card */}
            <div className="md:hidden px-4 pb-4">
              {paginatedTickets.map((ticket) => (
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
                    <TableHead className="bg-muted/50 px-6 py-3">Handler</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3 text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTickets.map((ticket) => (
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
                      <TableCell className="px-6 py-3 text-sm">{ticket.handlerName ?? '-'}</TableCell>
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