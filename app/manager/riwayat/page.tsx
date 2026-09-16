'use client';

import { useState, useMemo } from 'react';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Inbox } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function ManagerRiwayatPage() {
  const [search, setSearch] = useState('');
  const [filterValues, setFilter] = useState<TableFilterValues>({});
  const [currentPage, setCurrentPage] = useState(1);

  const closedTickets = MOCK_TICKETS.filter(
    (t) => t.status === 'CLOSED' && t.priority === 'B'
  );

  const filtered = useMemo(() => {
    let result = closedTickets;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.reporterName.toLowerCase().includes(q)
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
            searchPlaceholder="Cari ID, subjek, pelapor..."
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
            <p className="text-sm font-medium">Tidak ada case yang ditutup</p>
            <p className="text-xs text-muted-foreground">Riwayat penutupan case akan muncul di sini.</p>
          </div>
        ) : (
          <div className="md:hidden px-4 pb-4 -mt-2">
            {paginatedTickets.map((ticket) => (
              <div key={ticket.id} className="mb-3 rounded-lg border bg-card py-4 last:mb-0">
                <div className="px-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                      <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.subject}</p>
                    </div>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{ticket.reporterName}</span>
                    <span className="text-muted-foreground">
                      {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
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
                  <TableHead className="bg-muted/50 px-6 py-3">Pelapor</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Ditutup</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{ticket.id}</TableCell>
                    <TableCell className="px-6 py-3">
                      <span className="block max-w-[220px] truncate text-sm font-medium">
                        {ticket.subject}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <TypeBadge ticketType={ticket.ticketType} />
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell className="px-6 py-3 text-sm">{ticket.reporterName}</TableCell>
                    <TableCell className="px-6 py-3 text-xs font-mono text-muted-foreground">
                      {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString('id-ID')}
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
