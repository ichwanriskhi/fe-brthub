'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/shared/DataTable';
import type { DataTableFeatures } from '@/components/shared/data-table-features';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { ColumnToggle } from '@/components/shared/ColumnToggle';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Inbox, ChevronRight, Archive, Check, X } from 'lucide-react';
import { TicketCardList } from '@/components/shared/TicketCardList';
import {
  useMasterOptions,
  toPriorityFilterOptions,
  toTicketTypeFilterOptions,
} from '@/hooks/use-master-options';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { getApprovals, type ApprovalStage, type ApprovalListParams } from '@/lib/api/tickets';
import type { Ticket, TicketStatus, TicketPriority, TicketType } from '@/lib/types/ticket';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const DEFAULT_PER_PAGE = 10;

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'Diproses' },
  { value: 'PENDING_REVIEW', label: 'Menunggu Review' },
  { value: 'REWORK_REQUIRED', label: 'Perlu Revisi' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'CLOSED', label: 'Selesai' },
  { value: 'PENDING_APPROVAL', label: 'Menunggu Approval' },
];

interface ApprovalQueueProps {
  /** Tahap: INITIAL = persetujuan awal, FINAL = persetujuan penutupan, HISTORY = riwayat */
  stage: ApprovalStage;
  /** Path detail tiket, mis. '/approver/persetujuan-tiket' */
  hrefBase: string;
  /** Label tombol aksi */
  actionLabel?: string;
  /**
   * Query string yang ditempel ke link detail, mis. `"?from=riwayat"`.
   *
   * Reviewer punya dua daftar (`/reviewer/tinjauan-awal` dan
   * `/reviewer/riwayat`) yang sama-sama menunjuk ke `/reviewer/tiket`. Tanpa
   * penanda asal, breadcrumb di halaman detail selalu kembali ke satu daftar
   * yang sama sehingga salah untuk daftar lain.
   */
  linkQuery?: string;
  /**
   * Aksi cepat approve / reject. Bila tidak diberi, kolom hanya menampilkan
   * tombol detail — dipakai halaman riwayat, yang keputusannya sudah lewat dan
   * tidak bisa diulang.
   */
  onDecide?: (ticket: Ticket, decision: 'APPROVE' | 'REJECT', rejectionReason?: string) => void;
  /** ID tiket yang sedang dikirim — hanya baris itu yang nonaktif. */
  decidingId?: string | null;
  /**
   * Dinaikkan oleh pemanggil setiap kali keputusan berhasil, supaya daftar
   * dimuat ulang dan baris yang baru diputuskan langsung hilang.
   */
  reloadKey?: number;
}

/** Kolom aksi butuh `hrefBase`, `actionLabel` & `onDecide`, jadi kolomnya dibuat di dalam komponen. */
function buildColumns(
  hrefBase: string,
  actionLabel: string,
  linkQuery: string,
  onDecide?: ApprovalQueueProps['onDecide'],
  decidingId?: string | null,
) {
  const helper = createColumnHelper<DataTableFeatures, Ticket>();
  return helper.columns([
    helper.accessor('id', {
      header: 'ID Tiket',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
          {row.original.id}
        </span>
      ),
    }),
    helper.accessor('subject', {
      header: 'Subjek',
      cell: ({ row }) => (
        <div className="max-w-[240px] space-y-0.5">
          <p className="truncate text-sm font-medium">{row.original.subject}</p>
          <p className="truncate text-xs text-muted-foreground">
            SO: {row.original.soNumber ?? '-'}
          </p>
        </div>
      ),
    }),
    helper.accessor('reporterName', {
      header: 'Pelapor',
      cell: ({ row }) => <span className="truncate text-sm">{row.original.reporterName}</span>,
    }),
    helper.display({
      id: 'tipe',
      header: 'Tipe',
      cell: ({ row }) => <TypeBadge ticketType={row.original.ticketType} />,
    }),
    helper.display({
      id: 'prioritas',
      header: 'Prioritas',
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    }),
    helper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    }),
    helper.accessor('createdAt', {
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
    helper.display({
      id: 'aksi',
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => {
        const busy = decidingId === row.original.id;
        return (
          <div className="flex justify-end gap-2">
            <Button size="sm" asChild>
              <Link href={`${hrefBase}/${row.original.id}${linkQuery}`}>
                {actionLabel}
                <ChevronRight data-icon="inline-end" />
              </Link>
            </Button>

            {/* Aksi cepat hanya di halaman antrean. Di riwayat keputusannya
                sudah lewat, jadi tombolnya dimatikan lewat `onDecide` yang
                tidak diberikan. */}
            {onDecide && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onDecide(row.original, 'APPROVE')}
                >
                  <Check data-icon="inline-start" />
                  Setujui
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDecide(row.original, 'REJECT')}
                >
                  <X data-icon="inline-start" />
                  Tolak
                </Button>
              </>
            )}
          </div>
        );
      },
      enableHiding: false,
    }),
  ]) as ColumnDef<DataTableFeatures, Ticket>[];
}

export function ApprovalQueue({
  stage,
  hrefBase,
  actionLabel = 'Proses',
  linkQuery = '',
  onDecide,
  decidingId,
  reloadKey = 0,
}: ApprovalQueueProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  // Opsi filter prioritas/tipe dari backend — rename/tambah/nonaktif master
  // langsung tercermin tanpa deploy.
  const { priorities, ticketTypes } = useMasterOptions();
  const priorityOptions = useMemo(() => toPriorityFilterOptions(priorities), [priorities]);
  const typeOptions = useMemo(() => toTicketTypeFilterOptions(ticketTypes), [ticketTypes]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  const columns = buildColumns(hrefBase, actionLabel, linkQuery, onDecide, decidingId);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params: ApprovalListParams = { page: currentPage, per_page: perPage };
    if (search) params.search = search;
    if (filterValues.status) params.status = filterValues.status as TicketStatus;
    if (filterValues.priority) params.priority = filterValues.priority as TicketPriority;
    if (filterValues.type) params.ticketType = filterValues.type as TicketType;
    if (filterValues.category) params.category = String(filterValues.category);
    if (dateRange?.from) {
      params.dateFrom = dateRange.from.toISOString().slice(0, 10);
      if (dateRange.to) params.dateTo = dateRange.to.toISOString().slice(0, 10);
    }

    getApprovals({ ...params, stage })
      .then((result) => {
        if (cancelled) return;
        setTickets(result.data);
        setLastPage(result.lastPage);
        setTotal(result.total);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : 'Gagal memuat daftar persetujuan.');
        setTickets([]);
        setLastPage(1);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stage, search, filterValues, dateRange, currentPage, perPage, reloadKey]);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Opsi kategori diturunkan dari kategori yang ada di halaman ini.
  const categoryOptions = [...new Set(tickets.map((t) => t.category).filter(Boolean))].map((c) => ({
    value: c,
    label: c,
  }));

  const totalPages = Math.max(1, lastPage);
  const safePage = Math.min(currentPage, totalPages);
  const goToPage = useCallback(
    (p: number) => setCurrentPage(Math.min(Math.max(1, p), Math.max(1, lastPage))),
    [lastPage],
  );

  const isHistory = stage === 'HISTORY';

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <CardContent className="p-4">
        <TableToolbar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Cari ID tiket, SO, subjek, pelapor..."
          filters={[
            { key: 'status', label: 'Status', options: STATUS_OPTIONS },
            { key: 'type', label: 'Tipe Tiket', options: typeOptions },
            { key: 'priority', label: 'Prioritas', options: priorityOptions },
            { key: 'category', label: 'Kategori', options: categoryOptions },
          ]}
          filterValues={filterValues}
          onFilterChange={setFilter}
          dateRange={dateRange}
          onDateRangeChange={(r) => {
            setDateRange(r);
            setCurrentPage(1);
          }}
          action={
            <ColumnToggle
              columns={columns}
              visibility={columnVisibility}
              onVisibilityChange={setColumnVisibility}
            />
          }
        />
      </CardContent>

      {loading && tickets.length === 0 ? (
        <div className="px-4 pb-4">
          <TableSkeleton />
        </div>
      ) : tickets.length === 0 ? (
        <Empty className="border-0 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {isHistory ? <Archive /> : <Inbox />}
            </EmptyMedia>
            <EmptyTitle>
              {isHistory ? 'Belum ada riwayat persetujuan' : 'Tidak ada tiket yang menunggu persetujuan'}
            </EmptyTitle>
            <EmptyDescription>
              {isHistory
                ? 'Riwayat persetujuan yang Anda lakukan akan tampil di sini.'
                : 'Semua tiket sudah diproses.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <TicketCardList
            tickets={tickets}
            actionLabel={actionLabel}
            hrefBase={hrefBase}
            linkQuery={linkQuery}
            isPending={loading}
            extraActions={
              onDecide
                ? (t) => (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={decidingId === t.id}
                        onClick={() => onDecide(t, 'APPROVE')}
                      >
                        <Check data-icon="inline-start" />
                        Setujui
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={decidingId === t.id}
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDecide(t, 'REJECT')}
                      >
                        <X data-icon="inline-start" />
                        Tolak
                      </Button>
                    </>
                  )
                : undefined
            }
            meta={(t) => ({
              label: 'Tanggal',
              value: new Date(t.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })}
          />

          <div
            className={cn('hidden px-4 pb-4 md:block', loading && 'pointer-events-none opacity-50')}
          >
            <DataTable
              mode="server"
              columns={columns}
              data={tickets}
              isPending={loading}
              showRowNumbers
              rowNumberOffset={(safePage - 1) * perPage}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              emptyText={
                isHistory ? 'Belum ada riwayat persetujuan.' : 'Semua tiket sudah diproses.'
              }
              footer={() => (
                <DataTablePagination
                  page={safePage}
                  lastPage={totalPages}
                  total={total}
                  perPage={perPage}
                  onPageChange={goToPage}
                  onPerPageChange={(n) => {
                    setPerPage(n);
                    setCurrentPage(1);
                  }}
                />
              )}
            />
          </div>
        </>
      )}
    </Card>
  );
}