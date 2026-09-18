'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { MOCK_PENDING_REPORTERS } from '@/lib/mock/admin';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { IdentifyReporterModal, type IdentifyReporterResult } from '@/components/shared/IdentifyReporterModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { ArrowUpRight, UserSearch, CircleHelp, Inbox } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

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

export default function AdminTicketActionPage() {
  const [search, setSearch] = useState('');
  const [filterValues, setFilter] = useState<TableFilterValues>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [identifyTicketId, setIdentifyTicketId] = useState<string | null>(null);

  // Only tickets that need admin action (pending reporter identification)
  const pendingMap = useMemo(() => {
    const m = new Map<string, typeof MOCK_PENDING_REPORTERS[0]>();
    for (const p of MOCK_PENDING_REPORTERS) {
      if (p.status === 'PENDING') m.set(p.ticketId, p);
    }
    return m;
  }, []);

  const pendingTickets = useMemo(() => {
    return MOCK_TICKETS.filter((t) => pendingMap.has(t.id));
  }, [pendingMap]);

  const filtered = useMemo(() => {
    let result = pendingTickets.filter((t) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.reporterName.toLowerCase().includes(q);
      const matchesStatus = !filterValues.status || t.status === filterValues.status;
      const matchesPriority = !filterValues.priority || t.priority === filterValues.priority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
    return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [pendingTickets, search, filterValues]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const identifyData = identifyTicketId ? pendingMap.get(identifyTicketId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Card className="w-full gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            searchPlaceholder="Cari ID tiket, subjek, pelapor..."
            filters={[
              { key: 'status', label: 'Status', options: [
                { value: 'OPEN', label: 'Open' },
                { value: 'IN_PROGRESS', label: 'Diproses' },
              ]},
              { key: 'priority', label: 'Prioritas', options: [
                { value: 'A', label: 'A (Critical)' },
                { value: 'B', label: 'B (High)' },
                { value: 'C', label: 'C (Normal)' },
              ]},
            ]}
            filterValues={filterValues}
            onFilterChange={(key, value) => { setFilter((prev) => ({ ...prev, [key]: value })); setCurrentPage(1); }}
          />
        </CardContent>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t">
          <div>
            <p className="text-sm font-medium">Perlu Tindakan Admin</p>
            <p className="text-xs text-muted-foreground">
              {filtered.length} tiket belum teridentifikasi reporter-nya
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada tiket yang perlu tindakan</p>
            <p className="text-xs text-muted-foreground">Semua reporter sudah teridentifikasi.</p>
          </div>
        ) : (
          <>
            {/* Mobile card */}
            <div className="md:hidden px-4 pb-4">
              {paginated.map((ticket) => (
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
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <CircleHelp className="size-3" /> Pending ID
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => setIdentifyTicketId(ticket.id)}
                      >
                        <UserSearch className="size-3.5" />
                        Identifikasi
                      </Button>
                      <Link
                        href={`/admin/ticket/action/${ticket.id}`}
                        className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-xs"
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
                    <TableHead className="bg-muted/50 px-6 py-3">Status Reporter</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((ticket) => (
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
                      <TableCell className="px-6 py-3">
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <CircleHelp className="size-3" />
                          Pending Identifikasi
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => setIdentifyTicketId(ticket.id)}
                          >
                            <UserSearch className="size-3.5" />
                            Identifikasi
                          </Button>
                          <Button variant="secondary" size="sm" className="gap-1.5 text-xs" asChild>
                            <Link href={`/admin/ticket/action/${ticket.id}`}>
                              Detail <ArrowUpRight data-icon="inline-end" />
                            </Link>
                          </Button>
                        </div>
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

      {identifyData && (
        <IdentifyReporterModal
          open={identifyTicketId !== null}
          onOpenChange={(open) => { if (!open) setIdentifyTicketId(null); }}
          reporterName={identifyData.reporterName}
          reporterPhone={identifyData.reporterPhone}
          onConfirm={(result: IdentifyReporterResult) => {
            // Mock: tulis hasil identifikasi ke tiket di memory
            const ticket = MOCK_TICKETS.find((t) => t.id === identifyTicketId);
            if (ticket) {
              ticket.reporterType = result.reporterType;
              ticket.reporterEmployeeId = result.reporterEmployeeId;
              ticket.reporterCustomerId = result.reporterCustomerId;
              // Update pending reporter record
              const pending = MOCK_PENDING_REPORTERS.find((p) => p.ticketId === identifyTicketId);
              if (pending) pending.status = 'DONE';
            }
            setIdentifyTicketId(null);
          }}
        />
      )}
    </div>
  );
}
