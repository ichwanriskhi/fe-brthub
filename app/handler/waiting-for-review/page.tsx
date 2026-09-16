'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import type { DateRange } from 'react-day-picker';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Inbox, ChevronRight } from 'lucide-react';
import { TicketCardList } from '@/components/shared/TicketCardList';

const TICKETS_PER_PAGE = 10;

export default function HandlerWaitingForReviewPage() {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  const pendingTickets = MOCK_TICKETS.filter((t) => {
    const isTargetStatus = t.status === 'PENDING_REVIEW';
    const q = search.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      t.id.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.soNumber && t.soNumber.toLowerCase().includes(q)) ||
      t.reporterName.toLowerCase().includes(q) ||
      (t.customerData?.name && t.customerData.name.toLowerCase().includes(q));
    const matchesPriority = !filterValues.priority || t.priority === filterValues.priority;
    const matchesType = !filterValues.type || t.ticketType === filterValues.type;
    const matchesCategory = !filterValues.category || t.category === filterValues.category;
    const created = new Date(t.createdAt);
    const matchesDate =
      !dateRange?.from ||
      (created >= new Date(dateRange.from.toDateString()) &&
        (!dateRange.to || created <= new Date(dateRange.to.toDateString() + ' 23:59')));
    return isTargetStatus && matchesSearch && matchesPriority && matchesType && matchesCategory && matchesDate;
  });

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(pendingTickets.length / TICKETS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = pendingTickets.slice((safePage - 1) * TICKETS_PER_PAGE, safePage * TICKETS_PER_PAGE);

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

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            filters={[
              { key: 'priority', label: 'Prioritas', options: [
                { value: 'A', label: 'Prioritas A (Critical)' },
                { value: 'B', label: 'Prioritas B (High)' },
                { value: 'C', label: 'Prioritas C (Normal)' },
              ] },
              { key: 'type', label: 'Tipe Tiket', options: [
                { value: 'REQUEST', label: 'Request' },
                { value: 'INCIDENT', label: 'Incident' },
                { value: 'COMPLAINT', label: 'Complaint' },
                { value: 'INQUIRY', label: 'Inquiry' },
              ] },
              { key: 'category', label: 'Kategori', options: [...new Set(MOCK_TICKETS.map((t) => t.category))].map((c) => ({ value: c, label: c })) },
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
            <p className="text-sm font-medium">Tidak ada tiket menunggu review</p>
            <p className="text-xs text-muted-foreground">Semua resolusi telah diverifikasi.</p>
          </div>
        ) : (
          <div className="md:hidden px-4 pb-4 -mt-2">
            <TicketCardList tickets={paginatedTickets} actionLabel="Detail" hrefBase="/handler/ticket" />
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
                  <TableHead className="bg-muted/50 px-6 py-3">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{ticket.id}</TableCell>
                    <TableCell className="px-6 py-3">
                      <div className="max-w-[280px] space-y-0.5">
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
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/handler/ticket/${ticket.id}`}>
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
