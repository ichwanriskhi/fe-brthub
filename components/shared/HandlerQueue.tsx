'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
import { Inbox, ChevronRight, Loader2 } from 'lucide-react';
import { TicketCardList } from '@/components/shared/TicketCardList';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import type { DateRange } from 'react-day-picker';
import { getHandlerTickets, type HandlerTicketStatus } from '@/lib/api/handler';
import type { Ticket } from '@/lib/types/ticket';

const TICKETS_PER_PAGE = 10;

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'A', label: 'Prioritas A (Tinggi)' },
  { value: 'B', label: 'Prioritas B (Normal)' },
  { value: 'C', label: 'Prioritas C (Rendah)' },
];

const TYPE_OPTIONS = [
  { value: 'REQUEST', label: 'Request' },
  { value: 'INCIDENT', label: 'Incident' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'INQUIRY', label: 'Inquiry' },
];

interface HandlerQueueProps {
  /** Kelompok status antrean */
  status: HandlerTicketStatus;
  /** Path detail tiket, mis. '/handler/need-action' */
  hrefBase: string;
  /** Label tombol aksi */
  actionLabel?: string;
  /** Pesan saat antrean kosong */
  emptyTitle?: string;
  emptyDescription?: string;
}

export function HandlerQueue({
  status,
  hrefBase,
  actionLabel = 'Kerjakan',
  emptyTitle = 'Tidak ada tiket',
  emptyDescription = 'Tiket yang ditugaskan kepada Anda akan tampil di sini.',
}: HandlerQueueProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [serverLastPage, setServerLastPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getHandlerTickets(status, currentPage)
      .then((result) => {
        if (cancelled) return;
        setTickets(result.data);
        setServerLastPage(result.lastPage);
      })
      .catch((error) => {
        console.error(`Error fetching handler tickets (${status}):`, error);
        if (!cancelled) {
          setTickets([]);
          setServerLastPage(1);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, currentPage]);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const categoryOptions = [...new Set(tickets.map((t) => t.category))].map((c) => ({
    value: c,
    label: c,
  }));

  const filteredTickets = tickets.filter((t) => {
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
    return matchesSearch && matchesPriority && matchesType && matchesCategory && matchesDate;
  });

  const totalPages = Math.max(1, serverLastPage, Math.ceil(filteredTickets.length / TICKETS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = filteredTickets.slice(
    (safePage - 1) * TICKETS_PER_PAGE,
    safePage * TICKETS_PER_PAGE,
  );

  const getPaginationItems = () => {
    const items: (number | 'ellipsis')[] = [];
    const total = totalPages;
    const current = safePage;
    if (total <= 5) {
      for (let i = 1; i <= total; i += 1) items.push(i);
    } else if (current <= 3) {
      items.push(1, 2, 3, 'ellipsis', total);
    } else if (current >= total - 2) {
      items.push(1, 'ellipsis', total - 2, total - 1, total);
    } else {
      items.push(1, 'ellipsis', current - 1, current + 1, 'ellipsis', total);
    }
    return items;
  };

  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <CardContent className="p-4">
        <TableToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setCurrentPage(1);
          }}
          filters={[
            { key: 'type', label: 'Tipe Tiket', options: TYPE_OPTIONS },
            { key: 'priority', label: 'Prioritas', options: PRIORITY_OPTIONS },
            { key: 'category', label: 'Kategori', options: categoryOptions },
          ]}
          filterValues={filterValues}
          onFilterChange={setFilter}
          dateRange={dateRange}
          onDateRangeChange={(r) => {
            setDateRange(r);
            setCurrentPage(1);
          }}
        />
      </CardContent>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground/60" />
          <p className="text-sm font-medium">Memuat tiket...</p>
        </div>
      ) : paginatedTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
          <Inbox className="size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="text-xs text-muted-foreground">{emptyDescription}</p>
        </div>
      ) : (
        <div className="md:hidden px-4 pb-4 -mt-2">
          <TicketCardList
            tickets={paginatedTickets}
            actionLabel={actionLabel}
            hrefBase={hrefBase}
            meta={(t) => ({
              label: 'Tanggal',
              value: new Date(t.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })}
          />
        </div>
      )}

      {!loading && paginatedTickets.length > 0 && (
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
                  <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {ticket.id}
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <div className="max-w-[240px] space-y-0.5">
                      <p className="truncate text-sm font-medium">{ticket.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        SO: {ticket.soNumber ?? '-'}
                      </p>
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
                      {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <Button size="sm" asChild>
                      <Link href={`${hrefBase}/${ticket.id}`}>
                        {actionLabel}
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

      {!loading && totalPages > 1 && (
        <div className="border-t px-6 py-4">
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(currentPage - 1);
                  }}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                />
              </PaginationItem>
              {getPaginationItems().map((item, i) =>
                item === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href="#"
                      isActive={item === safePage}
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(item);
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToPage(currentPage + 1);
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </Card>
  );
}
