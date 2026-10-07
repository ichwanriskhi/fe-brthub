'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import { getMyTickets } from '@/lib/api/tickets';
import { reporterChatId, useReporterUnread } from '@/components/providers/ReporterUnreadProvider';
import type { Ticket, TicketStatus } from '@/lib/types/ticket';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/shared/DataTable';
import type { DataTableFeatures } from '@/components/shared/data-table-features';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { ColumnToggle } from '@/components/shared/ColumnToggle';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, MessageSquare, RefreshCw, FilterX } from 'lucide-react';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { useMasterOptions, toTicketTypeFilterOptions } from '@/hooks/use-master-options';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'Diproses' },
  { value: 'PENDING_REVIEW', label: 'Menunggu Review' },
  { value: 'REWORK_REQUIRED', label: 'Perlu Revisi' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'CLOSED', label: 'Selesai' },
];

const columnHelper = createColumnHelper<DataTableFeatures, Ticket>();

export default function ReportHistoryPage() {
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  // Opsi filter tipe dari backend — rename/tambah/nonaktif master langsung
  // tercermin tanpa deploy.
  const { ticketTypes } = useMasterOptions();
  const typeOptions = useMemo(() => toTicketTypeFilterOptions(ticketTypes), [ticketTypes]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  // State chat drawer per tiket
  const [chatTicketId, setChatTicketId] = useState<string | null>(null);

  // ── Data asli dari backend (laporan milik reporter yang login) ──
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { unread } = useReporterUnread();

  /** Pesan belum dibaca percakapan reporter<->admin untuk satu tiket. */
  const unreadFor = useCallback(
    (ticketId: string) => unread[reporterChatId(ticketId)] ?? 0,
    [unread],
  );

  // Fetch ulang saat `reloadKey` berubah (tombol "Coba lagi").
  useEffect(() => {
    let cancelled = false;
    getMyTickets()
      .then((data) => {
        if (cancelled) return;
        setTickets(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat laporan');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const categoryOptions = useMemo(
    () => [...new Set(tickets.map((t) => t.category).filter(Boolean))].map((c) => ({ value: c, label: c })),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = !filterValues.status || ticket.status === filterValues.status;
      const matchesType = !filterValues.type || ticket.ticketType === filterValues.type;
      const matchesCategory = !filterValues.category || ticket.category === filterValues.category;
      const matchesSearch =
        q === '' ||
        ticket.subject.toLowerCase().includes(q) ||
        (ticket.soNumber ?? '').toLowerCase().includes(q) ||
        ticket.id.toLowerCase().includes(q) ||
        ticket.reporterName.toLowerCase().includes(q) ||
        (ticket.customerData?.name?.toLowerCase().includes(q) ?? false);
      const created = new Date(ticket.createdAt);
      const matchesDate =
        !dateRange?.from ||
        (created >= new Date(dateRange.from.toDateString()) &&
          (!dateRange.to || created <= new Date(dateRange.to.toDateString() + ' 23:59')));
      return matchesStatus && matchesType && matchesCategory && matchesSearch && matchesDate;
    });
  }, [tickets, filterValues, searchQuery, dateRange]);

  /** Ada filter/search/tanggal aktif yang bisa direset. */
  const hasActiveFilters =
    Object.values(filterValues).some((v) => v != null && v !== '') ||
    searchQuery.trim() !== '' ||
    dateRange !== undefined;

  const resetFilters = () => {
    setFilterValues({});
    setSearchQuery('');
    setDateRange(undefined);
  };

  const columns: ColumnDef<DataTableFeatures, Ticket>[] = columnHelper.columns([
    columnHelper.accessor('id', {
      header: 'ID Tiket',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
          {row.original.id}
        </span>
      ),
    }),
    columnHelper.accessor('subject', {
      header: 'Subjek',
      cell: ({ row }) => (
        <div className="max-w-[260px] space-y-0.5">
          <p className="truncate text-sm font-medium">{row.original.subject}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.reporterName} · SO: {row.original.soNumber ?? '-'}
          </p>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'kategori',
      header: 'Kategori',
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {row.original.category}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Tanggal',
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'aksi',
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => {
        const count = unreadFor(row.original.id);
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative"
              onClick={() => setChatTicketId(row.original.id)}
              aria-label="Buka diskusi tiket"
            >
              <MessageSquare />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Button>
            <Button size="sm" asChild>
              <Link href={`/laporan/${row.original.id}`}>Detail</Link>
            </Button>
          </div>
        );
      },
      enableHiding: false,
    }),
  ]);

  const isEmptyAccount = !isLoading && !loadError && tickets.length === 0;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6 md:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riwayat Laporan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau status seluruh laporan yang Anda ajukan.
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/report/new">
            <Plus data-icon="inline-start" />
            Buat Laporan Baru
          </Link>
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Cari subjek, nomor SO, ID tiket, atau pelapor..."
            filters={[
              { key: 'status', label: 'Status', options: STATUS_OPTIONS },
              { key: 'type', label: 'Tipe Tiket', options: typeOptions },
              { key: 'category', label: 'Kategori', options: categoryOptions },
            ]}
            filterValues={filterValues}
            onFilterChange={setFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            dateLabel="Tanggal Pembuatan Laporan"
            action={
              <ColumnToggle
                columns={columns}
                visibility={columnVisibility}
                onVisibilityChange={setColumnVisibility}
              />
            }
          />
        </CardContent>

        {isLoading && tickets.length === 0 ? (
          <div className="px-4 pb-4">
            <TableSkeleton />
          </div>
        ) : loadError ? (
          <div className="px-4 pb-4">
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RefreshCw />
                </EmptyMedia>
                <EmptyTitle>Gagal memuat laporan</EmptyTitle>
                <EmptyDescription>{loadError}</EmptyDescription>
              </EmptyHeader>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoadError(null);
                  setIsLoading(true);
                  setReloadKey((k) => k + 1);
                }}
              >
                <RefreshCw data-icon="inline-start" />
                Coba lagi
              </Button>
            </Empty>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="px-4 pb-4">
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>
                  {isEmptyAccount ? 'Belum ada laporan' : 'Tidak ada laporan yang cocok'}
                </EmptyTitle>
                <EmptyDescription>
                  {isEmptyAccount
                    ? 'Akun ini belum pernah mengajukan laporan. Buat laporan pertama Anda.'
                    : 'Coba ubah filter status atau kata kunci pencarian.'}
                </EmptyDescription>
              </EmptyHeader>
              {isEmptyAccount && (
                <Button size="sm" asChild>
                  <Link href="/report/new">
                    <Plus data-icon="inline-start" />
                    Buat Laporan Pertama
                  </Link>
                </Button>
              )}
              {!isEmptyAccount && hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <FilterX data-icon="inline-start" />
                  Reset Filter
                </Button>
              )}
            </Empty>
          </div>
        ) : (
        <>
          {/* Mobile */}
          <div
            className={cn(
              'flex flex-col gap-3 px-4 pb-4 transition-opacity sm:hidden',
              isLoading && 'pointer-events-none opacity-50',
            )}
          >
            {filteredTickets.map((ticket) => {
              const count = unreadFor(ticket.id);
              return (
                <div key={ticket.id} className="rounded-lg border bg-card py-4">
                  <div className="space-y-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-mono text-[11px] text-muted-foreground">{ticket.id}</p>
                        <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                          {ticket.subject}
                        </h3>
                      </div>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {ticket.category}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        SO: {ticket.soNumber ?? '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="relative"
                          onClick={() => setChatTicketId(ticket.id)}
                          aria-label="Buka diskusi tiket"
                        >
                          <MessageSquare />
                          {count > 0 && (
                            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                              {count}
                            </span>
                          )}
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/laporan/${ticket.id}`}>Lihat Detail</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop */}
          <div
            className={cn(
              'hidden px-4 pb-4 sm:block',
              isLoading && 'pointer-events-none opacity-50',
            )}
          >
            <DataTable
              columns={columns}
              data={filteredTickets}
              isPending={isLoading}
              pageSize={10}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              emptyText="Tidak ada laporan yang cocok."
            />
          </div>
        </>
        )}
      </Card>

      {/* TicketChatDrawer — terbuka saat icon chat diklik */}
      {chatTicketId && (
        <TicketChatDrawer
          ticketId={chatTicketId}
          open={!!chatTicketId}
          onOpenChange={(open) => {
            if (!open) setChatTicketId(null);
          }}
        />
      )}
    </div>
  );
}