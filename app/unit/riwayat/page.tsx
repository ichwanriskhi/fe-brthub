'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getUnitHistory } from '@/lib/api/handler';
import type { Ticket } from '@/lib/types/ticket';
import { TypeBadge, PriorityBadge, StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { History, ChevronRight, ArrowUpRight, Loader2, AlertCircle, Inbox } from 'lucide-react';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import type { DateRange } from 'react-day-picker';

const TICKETS_PER_PAGE = 10;

export default function UnitHistoryPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [serverLastPage, setServerLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getUnitHistory(currentPage)
      .then((result) => {
        if (cancelled) return;
        setTickets(result.data);
        setServerLastPage(result.lastPage);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTickets([]);
        setServerLastPage(1);
        setLoadError(error instanceof Error ? error.message : 'Gagal memuat riwayat penugasan.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Setiap tiket bisa punya beberapa assignment handler (aktif + diganti).
  // Kembangkan jadi baris per assignment agar bisa difilter per handler.
  type HistoryRow = {
    key: string;
    ticketId: string;
    subject: string;
    ticketType: Ticket['ticketType'];
    category: string;
    priority: Ticket['priority'];
    status: Ticket['status'];
    handler: string;
    assignedBy: string;
    assignedAt: string;
    isCurrent: boolean;
  };

  const rows = useMemo<HistoryRow[]>(() => {
    const out: HistoryRow[] = [];
    for (const t of tickets) {
      const assignments = t.handlerAssignments ?? [];
      if (assignments.length === 0) {
        // Tiket tanpa assignment handler — tampilkan sekali agar tidak hilang.
        out.push({
          key: `${t.id}-none`,
          ticketId: t.id,
          subject: t.subject,
          ticketType: t.ticketType,
          category: t.category,
          priority: t.priority,
          status: t.status,
          handler: '-',
          assignedBy: '-',
          assignedAt: t.createdAt,
          isCurrent: false,
        });
        continue;
      }
      for (const a of assignments) {
        out.push({
          key: `${t.id}-${a.id}`,
          ticketId: t.id,
          subject: a.isActive ? t.subject : `${t.subject} (Reassignment)`,
          ticketType: t.ticketType,
          category: t.category,
          priority: t.priority,
          status: t.status,
          handler: a.handlerName ?? '-',
          assignedBy: a.assignedByName ?? '-',
          assignedAt: a.assignedAt,
          isCurrent: a.isActive,
        });
      }
    }
    return out;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((row) => {
      const matchesSearch =
        q === '' ||
        row.ticketId.toLowerCase().includes(q) ||
        row.subject.toLowerCase().includes(q) ||
        row.handler.toLowerCase().includes(q);
      const matchesHandler = !filterValues.handler || row.handler === filterValues.handler;
      const stateVal = filterValues.state;
      const matchesState =
        !stateVal ||
        (stateVal === 'current' && row.isCurrent) ||
        (stateVal === 'superseded' && !row.isCurrent);
      const created = new Date(row.assignedAt);
      const matchesDate =
        !dateRange?.from ||
        (created >= new Date(dateRange.from.toDateString()) &&
          (!dateRange.to || created <= new Date(dateRange.to.toDateString() + ' 23:59')));
      return matchesSearch && matchesHandler && matchesState && matchesDate;
    });
  }, [rows, search, filterValues, dateRange]);

  const totalPages = Math.max(1, serverLastPage, Math.ceil(filtered.length / TICKETS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * TICKETS_PER_PAGE, safePage * TICKETS_PER_PAGE);

  const handlerOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.handler).filter((h) => h !== '-'))].map((h) => ({
        value: h,
        label: h,
      })),
    [rows],
  );

  const getPaginationItems = () => {
    const items: (number | 'ellipsis')[] = [];
    const total = totalPages;
    if (total <= 5) {
      for (let i = 1; i <= total; i += 1) items.push(i);
    } else if (safePage <= 3) {
      items.push(1, 2, 3, 'ellipsis', total);
    } else if (safePage >= total - 2) {
      items.push(1, 'ellipsis', total - 2, total - 1, total);
    } else {
      items.push(1, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', total);
    }
    return items;
  };

  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const fmtDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v);
              setCurrentPage(1);
            }}
            searchPlaceholder="Cari ID tiket, subjek, handler..."
            filters={[
              { key: 'handler', label: 'Handler', options: handlerOptions },
              {
                key: 'state',
                label: 'Status Penugasan',
                options: [
                  { value: 'current', label: 'Aktif' },
                  { value: 'superseded', label: 'Digantikan' },
                ],
              },
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
            <p className="text-sm font-medium">Memuat riwayat...</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <AlertCircle className="size-8 text-destructive/60" />
            <p className="text-sm font-medium text-destructive">{loadError}</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada riwayat penugasan</p>
            <p className="text-xs text-muted-foreground">Coba ubah filter atau kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="-mt-2 px-4 pb-4 md:hidden">
            {paginated.map((row) => (
              <div key={row.key} className="mb-3 rounded-lg border bg-card py-4 last:mb-0">
                <div className="space-y-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-mono text-xs text-muted-foreground">{row.ticketId}</p>
                      <p
                        className={`line-clamp-2 text-sm font-medium leading-snug ${
                          row.isCurrent ? '' : 'text-muted-foreground'
                        }`}
                      >
                        {row.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.handler} · {fmtDate(row.assignedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <PriorityBadge priority={row.priority} />
                      <Badge variant={row.isCurrent ? 'default' : 'secondary'} className="text-[11px]">
                        {row.isCurrent ? 'Aktif' : 'Digantikan'}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" className="w-full justify-between" asChild>
                    <Link href={`/unit/tiket/${row.ticketId}`}>
                      <span>Detail Tiket</span>
                      <ChevronRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !loadError && paginated.length > 0 && (
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 px-6 py-3">ID Tiket</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Subjek</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Kategori</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Handler</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Ditugaskan Oleh</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Waktu</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((row) => (
                  <TableRow key={row.key} className={row.isCurrent ? '' : 'bg-muted/30'}>
                    <TableCell className="whitespace-nowrap px-6 py-3 font-mono text-xs">{row.ticketId}</TableCell>
                    <TableCell className="px-6 py-3">
                      <span
                        className={`block max-w-[200px] truncate text-sm ${
                          row.isCurrent ? 'font-medium' : 'text-muted-foreground'
                        }`}
                        title={row.subject}
                      >
                        {row.subject}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <TypeBadge ticketType={row.ticketType} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-6 py-3 text-xs text-muted-foreground">
                      {row.category}
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <PriorityBadge priority={row.priority} />
                    </TableCell>
                    <TableCell
                      className={`px-6 py-3 text-sm ${row.isCurrent ? 'font-medium' : 'text-muted-foreground'}`}
                    >
                      {row.handler}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-6 py-3 text-xs text-muted-foreground">
                      {row.assignedBy}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-6 py-3 font-mono text-[11px] text-muted-foreground">
                      {fmtDate(row.assignedAt)}
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <Badge variant={row.isCurrent ? 'default' : 'secondary'} className="gap-1 text-[11px]">
                        {row.isCurrent ? (
                          <span className="size-1.5 rounded-full bg-primary-foreground" />
                        ) : null}
                        {row.isCurrent ? 'Aktif' : 'Digantikan'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <Button size="sm" asChild className="gap-1 text-xs">
                        <Link href={`/unit/tiket/${row.ticketId}`}>
                          Detail
                          <ArrowUpRight className="size-3.5" />
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
                    <PaginationItem key={`e-${i}`}>
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
    </div>
  );
}
