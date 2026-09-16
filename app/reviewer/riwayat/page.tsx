'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import type { TicketStatus, TicketPriority, TicketType } from '@/lib/types/ticket';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Inbox, ChevronRight, Archive, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { TicketCardList } from '@/components/shared/TicketCardList';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import type { DateRange } from 'react-day-picker';

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'Diproses' },
  { value: 'PENDING_REVIEW', label: 'Menunggu Review' },
  { value: 'REWORK_REQUIRED', label: 'Perlu Revisi' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'CLOSED', label: 'Selesai' },
];

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'A', label: 'Prioritas A (Critical)' },
  { value: 'B', label: 'Prioritas B (High)' },
  { value: 'C', label: 'Prioritas C (Normal)' },
];

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: 'REQUEST', label: 'Request' },
  { value: 'INCIDENT', label: 'Incident' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'INQUIRY', label: 'Inquiry' },
];

const CATEGORY_OPTIONS = [...new Set(MOCK_TICKETS.map((t) => t.category))].map((c) => ({ value: c, label: c }));

const TICKETS_PER_PAGE = 10;

export default function ReviewerRiwayatPage() {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredTickets = MOCK_TICKETS.filter((t) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      t.id.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.soNumber && t.soNumber.toLowerCase().includes(q)) ||
      t.reporterName.toLowerCase().includes(q) ||
      (t.customerData?.name && t.customerData.name.toLowerCase().includes(q));
    const matchesStatus = !filterValues.status || t.status === filterValues.status;
    const matchesPriority = !filterValues.priority || t.priority === filterValues.priority;
    const matchesType = !filterValues.type || t.ticketType === filterValues.type;
    const matchesCategory = !filterValues.category || t.category === filterValues.category;
    const created = new Date(t.createdAt);
    const matchesDate =
      !dateRange?.from ||
      (created >= new Date(dateRange.from.toDateString()) &&
        (!dateRange.to || created <= new Date(dateRange.to.toDateString() + ' 23:59')));
    return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesCategory && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / TICKETS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = filteredTickets.slice((safePage - 1) * TICKETS_PER_PAGE, safePage * TICKETS_PER_PAGE);

  const getPaginationItems = () => {
    const items: (number | 'ellipsis')[] = [];
    const total = totalPages;
    const current = safePage;
    if (total <= 5) {
      for (let i = 1; i <= total; i++) items.push(i);
    } else if (current <= 3) {
      items.push(1, 2, 3, 'ellipsis', total);
    } else if (current >= total - 2) {
      items.push(1, 'ellipsis', total - 2, total - 1, total);
    } else {
      items.push(1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total);
    }
    return items;
  };

  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const countByStatus = (status: TicketStatus) => MOCK_TICKETS.filter((t) => t.status === status).length;

  const metrics = [
    { label: 'Total Tiket', value: String(MOCK_TICKETS.length), subtitle: 'Semua tiket tercatat', icon: Archive },
    { label: 'Selesai', value: String(countByStatus('CLOSED')), subtitle: 'Tiket ditutup', icon: CheckCircle2, showTrend: true },
    { label: 'Ditolak', value: String(countByStatus('REJECTED')), subtitle: 'Laporan tidak lolos', icon: XCircle },
    { label: 'Diproses', value: String(countByStatus('IN_PROGRESS') + countByStatus('PENDING_REVIEW')), subtitle: 'Di unit teknis & review', icon: Loader2 },
  ]

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
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            filters={[
              { key: 'status', label: 'Status', options: STATUS_OPTIONS },
              { key: 'type', label: 'Tipe Tiket', options: TYPE_OPTIONS },
              { key: 'priority', label: 'Prioritas', options: PRIORITY_OPTIONS },
              { key: 'category', label: 'Kategori', options: CATEGORY_OPTIONS },
            ]}
            filterValues={filterValues}
            onFilterChange={setFilter}
            dateRange={dateRange}
            onDateRangeChange={(r) => { setDateRange(r); setCurrentPage(1); }}
          />
        </CardContent>

        {paginatedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada tiket ditemukan</p>
            <p className="text-xs text-muted-foreground">Coba ubah filter status atau kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="md:hidden px-4 pb-4 -mt-2">
            <TicketCardList
              tickets={paginatedTickets}
              actionLabel="Detail"
              hrefBase="/reviewer/tiket"
              meta={(t) => ({
                label: 'Tanggal',
                value: new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
              })}
            />
          </div>
        )}

        {paginatedTickets.length > 0 && (
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
                <TableHead className="bg-muted/50 px-6 py-3">Tanggal</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{ticket.id}</TableCell>
                  <TableCell className="px-6 py-3">
                    <div className="max-w-[240px] space-y-0.5">
                      <p className="truncate text-sm font-medium">{ticket.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">SO: {ticket.soNumber ?? '-'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <span className="text-sm">{ticket.customerData?.name ?? ticket.reporterName}</span>
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <TypeBadge ticketType={ticket.ticketType} />
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/reviewer/tiket/${ticket.id}`}>
                        Detail
                        <ChevronRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="border-t px-6 py-4">
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); goToPage(safePage - 1); }} aria-disabled={safePage === 1} className={safePage === 1 ? 'pointer-events-none opacity-50' : undefined} />
                </PaginationItem>
                {getPaginationItems().map((item, i) =>
                  item === 'ellipsis' ? (
                    <PaginationItem key={`e-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink href="#" isActive={item === safePage} onClick={(e) => { e.preventDefault(); goToPage(item); }}>
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); goToPage(safePage + 1); }} aria-disabled={safePage === totalPages} className={safePage === totalPages ? 'pointer-events-none opacity-50' : undefined} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
}
