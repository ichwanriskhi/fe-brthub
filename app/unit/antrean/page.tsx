'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getUnitTickets, getUnitEmployees, assignHandler, type UnitEmployee } from '@/lib/api/handler';
import type { Ticket } from '@/lib/types/ticket';
import { reporterDisplay, customerDisplayName } from '@/lib/utils/ticket-display';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Inbox, ChevronRight, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const TICKETS_PER_PAGE = 10;

const PRIORITY_OPTIONS = [
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

export default function UnitQueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [serverLastPage, setServerLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog assign state
  const [assignTarget, setAssignTarget] = useState<Ticket | null>(null);
  const [employees, setEmployees] = useState<UnitEmployee[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [selectedHandler, setSelectedHandler] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getUnitTickets(currentPage)
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
        setLoadError(error instanceof Error ? error.message : 'Gagal memuat antrean penugasan.');
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

  const categoryOptions = useMemo(
    () => [...new Set(tickets.map((t) => t.category))].map((c) => ({ value: c, label: c })),
    [tickets],
  );

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
  const paginatedTickets = filteredTickets.slice((safePage - 1) * TICKETS_PER_PAGE, safePage * TICKETS_PER_PAGE);

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
      // Refresh antrean
      const fresh = await getUnitTickets(currentPage);
      setTickets(fresh.data);
      setServerLastPage(fresh.lastPage);
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
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v);
              setCurrentPage(1);
            }}
            searchPlaceholder="Cari ID, SO, subjek, pelapor..."
            filters={[
              { key: 'priority', label: 'Prioritas', options: PRIORITY_OPTIONS },
              { key: 'type', label: 'Tipe Tiket', options: TYPE_OPTIONS },
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
            <p className="text-sm font-medium">Memuat antrean...</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <AlertCircle className="size-8 text-destructive/60" />
            <p className="text-sm font-medium text-destructive">{loadError}</p>
          </div>
        ) : paginatedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada tiket dalam antrean penugasan</p>
            <p className="text-xs text-muted-foreground">
              Tiket yang sudah disetujui dan diterima departemen Anda akan tampil di sini.
            </p>
          </div>
        ) : (
          <div className="-mt-2 px-4 pb-4 md:hidden">
            {paginatedTickets.map((ticket) => (
              <div key={ticket.id} className="mb-3 rounded-lg border bg-card py-4 last:mb-0">
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
                    <span className="shrink-0">{ticket.handlerName ? `Handler: ${ticket.handlerName}` : 'Belum ada handler'}</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    onClick={() => openAssignDialog(ticket)}
                  >
                    <UserPlus className="size-3.5" />
                    {ticket.handlerName ? 'Ganti Handler' : 'Assign Handler'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !loadError && paginatedTickets.length > 0 && (
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 px-6 py-3">ID Tiket</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Subjek</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Kategori</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Pelapor</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Handler</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="whitespace-nowrap px-6 py-3 font-mono text-xs">{ticket.id}</TableCell>
                    <TableCell className="px-6 py-3">
                      <Link
                        href={`/unit/tiket/${ticket.id}`}
                        className="block max-w-[220px] truncate text-sm font-medium transition-colors hover:text-primary"
                      >
                        {ticket.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <TypeBadge ticketType={ticket.ticketType} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-6 py-3 text-xs text-muted-foreground">{ticket.category}</TableCell>
                    <TableCell className="px-6 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-medium">{reporterDisplay(ticket)}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {ticket.isReportForCustomer ? 'Atas nama customer' : 'Pegawai'}
                        </span>
                        {customerDisplayName(ticket) && (
                          <span className="text-[10px] text-muted-foreground">
                            Customer: {customerDisplayName(ticket)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell className="px-6 py-3 text-xs">
                      {ticket.handlerName ?? <span className="text-muted-foreground">Belum ada</span>}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => openAssignDialog(ticket)}
                      >
                        <UserPlus className="size-3.5" />
                        {ticket.handlerName ? 'Ganti' : 'Assign'}
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

      {/* ── Dialog Assign Handler ── */}
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
              className="gap-1.5"
              disabled={submitting || !selectedHandler || employees.length === 0}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Konfirmasi Penugasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
