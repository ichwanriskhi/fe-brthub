'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Inbox, Clock } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function ManagerAntreanPage() {
  const [search, setSearch] = useState('');
  const [filterValues, setFilter] = useState<TableFilterValues>({});
  const [currentPage, setCurrentPage] = useState(1);

  const pendingTickets = MOCK_TICKETS.filter(
    (t) => (t.status === 'IN_PROGRESS' || t.status === 'REWORK_REQUIRED') &&
           t.priority === 'B' &&
           t.resolutionSummary
  );

  const filtered = useMemo(() => {
    let result = pendingTickets;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.reporterName.toLowerCase().includes(q) ||
          (t.handlerName ?? '').toLowerCase().includes(q)
      );
    }

    if (filterValues.priority) {
      result = result.filter((t) => t.priority === filterValues.priority);
    }

    return result;
  }, [search, filterValues]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const safePage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const paginatedTickets = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const getPaginationItems = () => {
    const items: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (safePage > 3) items.push('ellipsis');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) items.push(i);
      if (safePage < totalPages - 2) items.push('ellipsis');
      items.push(totalPages);
    }
    return items;
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="w-full gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            searchPlaceholder="Cari ID, subjek, handler, pelapor..."
            filters={[
              { key: 'priority', label: 'Prioritas', options: [
                { value: 'B', label: 'Priority B' },
              ] },
            ]}
            filterValues={filterValues}
            onFilterChange={(key, value) => { 
              setFilter((prev) => ({ ...prev, [key]: value }));
              setCurrentPage(1);
            }}
          />
        </CardContent>

        {paginatedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada case menunggu penutupan</p>
            <p className="text-xs text-muted-foreground">Semua case priority B sudah ditutup.</p>
          </div>
        ) : (
          <div className="md:hidden px-4 pb-4 -mt-2">
            {paginatedTickets.map((ticket) => (
              <div key={ticket.id} className="mb-3 rounded-lg border bg-card py-4 last:mb-0">
                <div className="px-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                      <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">{ticket.handlerName ?? 'Handler'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <PriorityBadge priority={ticket.priority} />
                      <TypeBadge ticketType={ticket.ticketType} />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    asChild
                  >
                    <Link href={`/manager/antrean/${ticket.id}`}>
                      <Clock className="size-3.5" />
                      Review Penutupan
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {paginatedTickets.length > 0 && (
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 px-6 py-3">ID Tiket</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Subjek</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Handler</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{ticket.id}</TableCell>
                    <TableCell className="px-6 py-3">
                      <Link
                        href={`/manager/antrean/${ticket.id}`}
                        className="block max-w-[220px] truncate text-sm font-medium hover:text-primary transition-colors"
                      >
                        {ticket.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <TypeBadge ticketType={ticket.ticketType} />
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell className="px-6 py-3 text-sm">{ticket.handlerName ?? 'Handler'}</TableCell>
                    <TableCell className="px-6 py-3">
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        asChild
                      >
                        <Link href={`/manager/antrean/${ticket.id}`}>
                          <Clock className="size-3.5" />
                          Review
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
              <PaginationPrevious onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} />
              <PaginationContent>
                {getPaginationItems().map((item, i) =>
                  item === 'ellipsis' ? (
                    <PaginationItem key={`e-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink isActive={item === safePage} onClick={() => setCurrentPage(item as number)}>
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
              </PaginationContent>
              <PaginationNext onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} />
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
}
