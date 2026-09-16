'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { MOCK_PENDING_REPORTERS, MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/lib/mock/admin';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Inbox, ArrowUpRight, CircleHelp, UserCheck } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

const ITEMS_PER_PAGE = 10;

/** Tiket berjalan = belum CLOSED / REJECTED */
const ACTIVE_STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'REWORK_REQUIRED'];

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

export default function AdminTicketMonitoringPage() {
  const [search, setSearch] = useState('');
  const [filterValues, setFilter] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Drill-down dari Master Data (kategori/produk) & Pegawai/Customer (reporter).
   * Query params: ?category=|product=|reporter=|customer=
   * Saat entity aktif, tampil SEMUA status (bukan hanya berjalan) agar
   * admin bisa tracking masalah sampai akar: aktif, selesai, dan totalnya.
   */
  const [entityFilter, setEntityFilter] = useState<{
    kind: 'category' | 'product' | 'reporter' | 'customer';
    id: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kind =
      params.get('category') ? 'category' :
      params.get('product') ? 'product' :
      params.get('reporter') ? 'reporter' :
      params.get('customer') ? 'customer' : null;
    if (kind) {
      const id = params.get(kind) ?? '';
      if (id) setEntityFilter({ kind, id });
    }
  }, []);

  const entityLabel = entityFilter
    ? entityFilter.kind === 'category'
      ? MOCK_CATEGORIES.find((c) => c.id === entityFilter.id)?.name
      : entityFilter.kind === 'product'
        ? `${MOCK_PRODUCTS.find((p) => p.id === entityFilter.id)?.name ?? ''} (${MOCK_PRODUCTS.find((p) => p.id === entityFilter.id)?.productCode ?? ''})`
        : entityFilter.kind === 'reporter'
          ? 'Reporter: Pegawai'
          : 'Milik Customer'
    : null;

  /** Ids kategori yang diizinkan (kategori + semua sub-nya) untuk filter category */
  const allowedCategoryIds = useMemo(() => {
    if (entityFilter?.kind !== 'category') return null;
    const root = entityFilter.id;
    const children = MOCK_CATEGORIES.filter((c) => c.parentId === root).map((c) => c.id);
    return new Set([root, ...children]);
  }, [entityFilter]);

  const entityTicketCount = useMemo(() => {
    if (!entityFilter) return null;
    const all = MOCK_TICKETS.filter((t) => {
      switch (entityFilter.kind) {
        case 'category':
          return t.categoryId === entityFilter.id || (t.subcategoryId != null && allowedCategoryIds?.has(t.subcategoryId));
        case 'product':
          return t.productId === entityFilter.id;
        case 'reporter':
          return t.reporterEmployeeId === entityFilter.id;
        case 'customer':
          return t.reporterCustomerId === entityFilter.id;
      }
    });
    const active = all.filter((t) => ACTIVE_STATUSES.includes(t.status)).length;
    return { total: all.length, active, resolved: all.length - active };
  }, [entityFilter, allowedCategoryIds]);

  const pendingReporterIds = useMemo(
    () => new Set(MOCK_PENDING_REPORTERS.filter((p) => p.status === 'PENDING').map((p) => p.ticketId)),
    []
  );

  const filtered = useMemo(() => {
    const base = entityFilter
      ? MOCK_TICKETS // semua status saat drill-down entitas
      : MOCK_TICKETS.filter((t) => ACTIVE_STATUSES.includes(t.status));
    let result = base.filter((t) => {
      if (entityFilter) {
        switch (entityFilter.kind) {
          case 'category':
            if (!(t.categoryId === entityFilter.id || (t.subcategoryId != null && allowedCategoryIds?.has(t.subcategoryId)))) return false;
            break;
          case 'product':
            if (t.productId !== entityFilter.id) return false;
            break;
          case 'reporter':
            if (t.reporterEmployeeId !== entityFilter.id) return false;
            break;
          case 'customer':
            if (t.reporterCustomerId !== entityFilter.id) return false;
            break;
        }
      }
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
  }, [search, filterValues, dateRange, entityFilter, allowedCategoryIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div className="flex flex-col gap-6">
      <Card className="w-full gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            searchPlaceholder="Cari ID tiket, SO, reporter, handler..."
            filters={[
              { key: 'status', label: 'Status', options: [
                { value: 'OPEN', label: 'Open' },
                { value: 'IN_PROGRESS', label: 'Diproses' },
                { value: 'PENDING_REVIEW', label: 'Menunggu Review' },
                { value: 'REWORK_REQUIRED', label: 'Perlu Revisi' },
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
            <p className="text-sm font-medium">
              {entityFilter ? `Tiket: ${entityLabel}` : 'Tiket Berjalan'}
            </p>
            <p className="text-xs text-muted-foreground">
              {entityFilter
                ? entityTicketCount
                  ? `${entityTicketCount.total} tiket total (${entityTicketCount.active} aktif, ${entityTicketCount.resolved} selesai)`
                  : 'Tidak ada tiket'
                : `${filtered.length} tiket aktif diproses sistem`}
            </p>
          </div>
          {entityFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.pushState({}, '', '/admin/ticket/monitoring')}
              className="gap-1.5"
            >
              <ArrowUpRight className="size-3.5 rotate-180" />
              Kembali ke Monitoring
            </Button>
          )}
        </div>

        {paginatedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada tiket yang ditemukan</p>
            <p className="text-xs text-muted-foreground">Tiket berjalan akan tampil di sini.</p>
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
                        href={`/admin/ticket/monitoring/${ticket.id}`}
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
                    {pendingReporterIds.size > 0 && (
                      <TableHead className="bg-muted/50 px-6 py-3">Reporter</TableHead>
                    )}
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
                      <TableCell className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/50 text-xs font-medium">
                            {ticket.reporterName.slice(0, 1)}
                          </div>
                          <span className="text-sm">{ticket.reporterName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3"><TypeBadge ticketType={ticket.ticketType} /></TableCell>
                      <TableCell className="px-6 py-3"><PriorityBadge priority={ticket.priority} /></TableCell>
                      <TableCell className="px-6 py-3 text-sm">{ticket.handlerName ?? '-'}</TableCell>
                      <TableCell className="px-6 py-3"><StatusBadge status={ticket.status} /></TableCell>
                      {pendingReporterIds.size > 0 && (
                        <TableCell className="px-6 py-3">
                          {pendingReporterIds.has(ticket.id) ? (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              <CircleHelp className="size-3" />
                              Pending ID
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <UserCheck className="size-3" />
                              Identified
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="px-6 py-3 text-right">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                          <Link href={`/admin/ticket/monitoring/${ticket.id}`}>
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