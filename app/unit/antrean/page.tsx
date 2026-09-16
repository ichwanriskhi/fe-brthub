'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import type { TicketPriority, TicketType } from '@/lib/types/ticket';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
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
import { Inbox, ChevronRight, UserPlus, Clock } from 'lucide-react';
import { toast } from 'sonner';

const TICKETS_PER_PAGE = 10;

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'Semua Prioritas' },
  { value: 'A', label: 'Prioritas A' },
  { value: 'B', label: 'Prioritas B' },
  { value: 'C', label: 'Prioritas C' },
];

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Semua Tipe' },
  { value: 'REQUEST', label: 'Request' },
  { value: 'INCIDENT', label: 'Incident' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'INQUIRY', label: 'Inquiry' },
];

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'Semua Kategori' },
  { value: 'Klaim Distribusi & Pengiriman', label: 'Klaim Distribusi & Pengiriman' },
  { value: 'Kendaraan', label: 'Kendaraan' },
  { value: 'IT Service', label: 'IT Service' },
  { value: 'Sarana & Prasarana', label: 'Sarana & Prasarana' },
];

// Handler yang tersedia untuk assignment
const HANDLERS = [
  { id: 'h1', name: 'Dimas P.', unit: 'IT Service', activeCases: 2 },
  { id: 'h2', name: 'Budi S.', unit: 'Distribution & Logistics', activeCases: 1 },
  { id: 'h3', name: 'Rina A.', unit: 'Warehouse Operations', activeCases: 3 },
  { id: 'h4', name: 'Agus S.', unit: 'Sales Operations', activeCases: 0 },
];

export default function UnitQueuePage() {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog assign state
  const [assignTarget, setAssignTarget] = useState<{ id: string; subject: string; unit: string } | null>(null);
  const [selectedHandler, setSelectedHandler] = useState('');

  const queueTickets = useMemo(
    () =>
      MOCK_TICKETS.filter(
        (t) => t.priority != null && !t.handlerName && t.status !== 'REJECTED' && t.status !== 'CLOSED'
      ),
    []
  );

  const filteredTickets = queueTickets.filter((t) => {
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

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / TICKETS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = filteredTickets.slice((safePage - 1) * TICKETS_PER_PAGE, safePage * TICKETS_PER_PAGE);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getPaginationItems = () => {
    const items: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else if (safePage <= 3) {
      items.push(1, 2, 3, 'ellipsis', totalPages);
    } else if (safePage >= totalPages - 2) {
      items.push(1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages);
    } else {
      items.push(1, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', totalPages);
    }
    return items;
  };

  const openAssignDialog = (id: string, subject: string, unit: string) => {
    setAssignTarget({ id, subject, unit });
    setSelectedHandler('');
  };

  const confirmAssign = () => {
    if (!selectedHandler) {
      toast.error('Pilih handler terlebih dahulu');
      return;
    }
    const handler = HANDLERS.find((h) => h.id === selectedHandler);
    toast.success(`Tiket ${assignTarget?.id} ditugaskan ke ${handler?.name}.`);
    setAssignTarget(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            searchPlaceholder="Cari ID, SO, subjek, pelapor..."
            filters={[
              { key: 'priority', label: 'Prioritas', options: [
                { value: 'A', label: 'Prioritas A (Critical)' },
                { value: 'B', label: 'Prioritas B (High)' },
                { value: 'C', label: 'Prioritas C (Normal)' },
              ] },
              { key: 'type', label: 'Tipe Tiket', options: [
                { value: 'REQUEST', label: 'Request' },
                { value: 'INCIDENT', label: 'Incident' },
                { value: 'COMPLAINT', label: 'Complaint' },
                { value: 'INQUIRY', label: 'Inquiry' },
              ] },
              { key: 'category', label: 'Kategori', options: CATEGORY_OPTIONS },
            ]}
            filterValues={filterValues}
            onFilterChange={setFilter}
            dateRange={dateRange}
            onDateRangeChange={(r) => { setDateRange(r); setCurrentPage(1); }}
          />
        </CardContent>

        {paginatedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada tiket dalam antrean penugasan</p>
            <p className="text-xs text-muted-foreground">Semua tiket telah ditugaskan.</p>
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
                      <p className="text-xs text-muted-foreground truncate">{ticket.category}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <PriorityBadge priority={ticket.priority} />
                      <TypeBadge ticketType={ticket.ticketType} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">{ticket.customerData?.name ?? ticket.reporterName}</span>
                    <span className="shrink-0 inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> 1d
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    onClick={() => openAssignDialog(ticket.id, ticket.subject, ticket.category)}
                  >
                    <UserPlus className="size-3.5" />
                    Assign Handler
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
                  <TableHead className="bg-muted/50 px-6 py-3">Kategori</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Prioritas</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Pelapor</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Menunggu</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{ticket.id}</TableCell>
                    <TableCell className="px-6 py-3">
                      <Link
                        href={`/unit/tiket/${ticket.id}`}
                        className="block max-w-[220px] truncate text-sm font-medium hover:text-primary transition-colors"
                      >
                        {ticket.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <TypeBadge ticketType={ticket.ticketType} />
                    </TableCell>
                    <TableCell className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">{ticket.category}</TableCell>
                    <TableCell className="px-6 py-3">
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-medium">{ticket.customerData?.name ?? ticket.reporterName}</span>
                        <span className="text-[10px] text-muted-foreground">{ticket.isReportForCustomer ? 'Customer' : 'Pegawai'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <Badge variant="outline" className="font-mono text-[11px]">1d</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => openAssignDialog(ticket.id, ticket.subject, ticket.category)}
                      >
                        <UserPlus className="size-3.5" />
                        Assign
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
                      <PaginationLink isActive={item === safePage} onClick={() => setCurrentPage(item)}>
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

      {/* ── Dialog Assign Handler (refactor AssignHandlerModal) ── */}
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
              <span className="font-semibold">{assignTarget?.unit}</span>
            </div>
            <div>
              <span className="block text-muted-foreground">Reviewer</span>
              <span className="font-semibold">Ahmad Subagja</span>
            </div>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel>Pilih Handler *</FieldLabel>
                  <Select
                    value={selectedHandler}
                    onValueChange={(v) => setSelectedHandler(v ?? '')}
                    items={HANDLERS.map((h) => ({ value: h.id, label: `${h.name} (${h.unit} • ${h.activeCases} kasus aktif)` }))}
                  >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih handler..." />
                </SelectTrigger>
                <SelectContent>
                  {HANDLERS.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} ({h.unit} • {h.activeCases} kasus aktif)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Handler dengan beban rendah direkomendasikan.</FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              Batal
            </Button>
            <Button onClick={confirmAssign} className="gap-1.5">
              <UserPlus className="size-4" />
              Konfirmasi Penugasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
