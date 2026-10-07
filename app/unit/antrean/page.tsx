'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import {
  getUnitTickets,
  getUnitEmployees,
  assignHandler,
  type UnitEmployee,
  type UnitTicketsParams,
} from '@/lib/api/handler';
import type { Ticket, TicketPriority, TicketType } from '@/lib/types/ticket';
import { reporterDisplay, customerDisplayName } from '@/lib/utils/ticket-display';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import {
  useMasterOptions,
  toPriorityFilterOptions,
  toTicketTypeFilterOptions,
} from '@/hooks/use-master-options';
import type { DateRange } from 'react-day-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { ChevronRight, Inbox, UserPlus, AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DEFAULT_PER_PAGE = 10;

const columnHelper = createColumnHelper<DataTableFeatures, Ticket>();

/** Kolom aksi butuh `openAssignDialog`, jadi kolomnya dibuat setelah fungsi itu ada. */
function buildColumns(
  openAssignDialog: (ticket: Ticket) => void,
): ColumnDef<DataTableFeatures, Ticket>[] {
  return columnHelper.columns([
    columnHelper.accessor('id', {
      header: 'ID Tiket',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">{row.original.id}</span>
      ),
    }),
    columnHelper.accessor('subject', {
      header: 'Subjek',
      // Teks biasa — pintu masuk ke halaman detail dipindah ke kolom Aksi
      // supaya satu baris punya satu tempat untuk navigasi, bukan subjek yang
      // diam-diam bisa diklik. Styling tetap sama agar tinggi baris tidak berubah.
      cell: ({ row }) => (
        <p className="max-w-[220px] truncate text-sm font-medium">{row.original.subject}</p>
      ),
    }),
    columnHelper.display({
      id: 'tipe',
      header: 'Tipe',
      cell: ({ row }) => <TypeBadge ticketType={row.original.ticketType} />,
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
      id: 'prioritas',
      header: 'Prioritas',
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    }),
    columnHelper.display({
      id: 'pelapor',
      header: 'Pelapor',
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{reporterDisplay(row.original)}</span>
          <span className="text-[10px] text-muted-foreground">
            {row.original.isReportForCustomer ? 'Atas nama customer' : 'Pegawai'}
          </span>
          {customerDisplayName(row.original) && (
            <span className="text-[10px] text-muted-foreground">
              Customer: {customerDisplayName(row.original)}
            </span>
          )}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    }),
    columnHelper.display({
      id: 'handler',
      header: 'Handler',
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.handlerName ?? (
            <span className="text-muted-foreground">Belum ada</span>
          )}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'aksi',
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {/* Navigasi dulu (outline), aksi utama Assign menyusul (default) —
              supaya tombol utama unit tetap yang paling menonjol. */}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/unit/tiket/${row.original.id}?from=antrean`}>
              Detail
              <ChevronRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button size="sm" onClick={() => openAssignDialog(row.original)}>
            <UserPlus data-icon="inline-start" />
            {row.original.handlerName ? 'Ganti' : 'Assign'}
          </Button>
        </div>
      ),
      enableHiding: false,
    }),
  ]);
}

export default function UnitQueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [serverLastPage, setServerLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  // Dialog assign state
  const [assignTarget, setAssignTarget] = useState<Ticket | null>(null);
  const [employees, setEmployees] = useState<UnitEmployee[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [selectedHandler, setSelectedHandler] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

    const params: UnitTicketsParams = { page: currentPage, per_page: perPage };
    if (search) params.search = search;
    if (filterValues.priority) params.priority = filterValues.priority as TicketPriority;
    if (filterValues.type) params.ticketType = filterValues.type as TicketType;
    if (filterValues.category) params.category = String(filterValues.category);
    if (dateRange?.from) {
      params.dateFrom = dateRange.from.toISOString().slice(0, 10);
      if (dateRange.to) params.dateTo = dateRange.to.toISOString().slice(0, 10);
    }

    getUnitTickets(params)
      .then((result) => {
        if (cancelled) return;
        setTickets(result.data);
        setServerLastPage(result.lastPage);
        setTotal(result.total);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTickets([]);
        setServerLastPage(1);
        setTotal(0);
        setLoadError(error instanceof Error ? error.message : 'Gagal memuat antrean penugasan.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, filterValues, dateRange, currentPage, perPage]);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const categoryOptions = useMemo(
    () => [...new Set(tickets.map((t) => t.category).filter(Boolean))].map((c) => ({ value: c, label: c })),
    [tickets],
  );

  const totalPages = Math.max(1, serverLastPage);
  const safePage = Math.min(currentPage, totalPages);
  const goToPage = useCallback(
    (p: number) => setCurrentPage(Math.min(Math.max(1, p), Math.max(1, serverLastPage))),
    [serverLastPage],
  );

  const openAssignDialog = (ticket: Ticket) => {
    setAssignTarget(ticket);
    setSelectedHandler('');
    setEmployees([]);
    setEmployeeLoading(true);
    // Handler harus dari departemen yang menerima tiket (backend memvalidasi).
    // getUnitEmployees mengembalikan semua pegawai bila tanpa filter; kita
    // filter lokal memakai destinationDepartmentId.
    getUnitEmployees(ticket.destinationDepartmentId)
      .then((list) => {
        const deptId = ticket.destinationDepartmentId;
        const filtered = deptId ? list.filter((e) => e.department_id === deptId) : list;
        setEmployees(filtered);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Gagal memuat daftar handler.');
      })
      .finally(() => setEmployeeLoading(false));
  };

  // Setelah `openAssignDialog` terdefinisi — kolom aksi memanggil fungsi ini.
  const columns = buildColumns(openAssignDialog);

  const confirmAssign = async () => {
    if (!assignTarget) return;
    if (!selectedHandler) {
      toast.error('Pilih handler terlebih dahulu');
      return;
    }
    setSubmitting(true);
    try {
      await assignHandler(assignTarget.id, selectedHandler);
      const handler = employees.find((e) => e.id === selectedHandler);
      toast.success(`Tiket ${assignTarget.id} ditugaskan ke ${handler?.full_name}.`);
      setAssignTarget(null);
      // Refresh antrean dengan filter yang sedang aktif.
      const params: UnitTicketsParams = { page: currentPage, per_page: perPage };
      if (search) params.search = search;
      if (filterValues.priority) params.priority = filterValues.priority as TicketPriority;
      if (filterValues.type) params.ticketType = filterValues.type as TicketType;
      if (filterValues.category) params.category = String(filterValues.category);
      const fresh = await getUnitTickets(params);
      setTickets(fresh.data);
      setServerLastPage(fresh.lastPage);
      setTotal(fresh.total);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Gagal menugaskan handler.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Cari ID, SO, subjek, pelapor..."
            filters={[
              { key: 'priority', label: 'Prioritas', options: priorityOptions },
              { key: 'type', label: 'Tipe Tiket', options: typeOptions },
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
        ) : loadError ? (
          <div className="px-4 pb-4">
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <AlertCircle />
                </EmptyMedia>
                <EmptyTitle>Gagal memuat antrean</EmptyTitle>
                <EmptyDescription>{loadError}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-4 pb-4">
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Inbox />
                </EmptyMedia>
                <EmptyTitle>Tidak ada tiket dalam antrean penugasan</EmptyTitle>
                <EmptyDescription>
                  Tiket yang sudah disetujui dan diterima departemen Anda akan tampil di sini.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col gap-3 px-4 pb-4 transition-opacity md:hidden',
              loading && 'pointer-events-none opacity-50',
            )}
          >
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-lg border bg-card py-4">
                <div className="space-y-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{ticket.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">{ticket.category}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <PriorityBadge priority={ticket.priority} />
                      <TypeBadge ticketType={ticket.ticketType} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">{reporterDisplay(ticket)}</span>
                    <span className="shrink-0">
                      {ticket.handlerName ? `Handler: ${ticket.handlerName}` : 'Belum ada handler'}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/unit/tiket/${ticket.id}?from=antrean`}>
                        Detail
                        <ChevronRight data-icon="inline-end" />
                      </Link>
                    </Button>
                    <Button size="sm" onClick={() => openAssignDialog(ticket)}>
                      <UserPlus data-icon="inline-start" />
                      {ticket.handlerName ? 'Ganti Handler' : 'Assign Handler'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !loadError && tickets.length > 0 && (
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
              emptyText="Tidak ada tiket dalam antrean penugasan."
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
        )}

        </Card>
      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{assignTarget?.id}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-foreground">
              {assignTarget?.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-xs">
            <div>
              <span className="block text-muted-foreground">Unit Tujuan</span>
              <span className="font-semibold">
                {assignTarget?.destinationDepartmentName || assignTarget?.assignedUnit || '-'}
              </span>
            </div>
            <div>
              <span className="block text-muted-foreground">Handler Saat Ini</span>
              <span className="font-semibold">{assignTarget?.handlerName ?? 'Belum ada'}</span>
            </div>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel>Pilih Handler *</FieldLabel>
              <Select
                value={selectedHandler}
                onValueChange={(v) => setSelectedHandler(v ?? '')}
                items={employees.map((e) => ({
                  value: e.id,
                  label: `${e.full_name}${e.position_name ? ` (${e.position_name})` : ''}`,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih handler..." />
                </SelectTrigger>
                <SelectContent>
                  {employeeLoading ? (
                    <SelectItem value="__loading" disabled>
                      Memuat daftar pegawai...
                    </SelectItem>
                  ) : employees.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      Tidak ada pegawai di departemen ini
                    </SelectItem>
                  ) : (
                    employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name}
                        {e.position_name ? ` (${e.position_name})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FieldDescription>
                Handler harus berasal dari departemen yang menerima tiket ini.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)} disabled={submitting}>
              Batal
            </Button>
            <Button
              onClick={confirmAssign}
              disabled={submitting || !selectedHandler || employees.length === 0}
            >
              {submitting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <UserPlus data-icon="inline-start" />
              )}
              Konfirmasi Penugasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
