'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import type { TicketStatus } from '@/lib/types/ticket';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Plus, FileText } from 'lucide-react';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import type { DateRange } from 'react-day-picker';

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'Diproses' },
  { value: 'PENDING_REVIEW', label: 'Menunggu Review' },
  { value: 'REWORK_REQUIRED', label: 'Perlu Revisi' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'CLOSED', label: 'Selesai' },
];

const TICKETS_PER_PAGE = 10;

export default function ReportHistoryPage() {
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredTickets = MOCK_TICKETS.filter((ticket) => {
    const matchesStatus = !filterValues.status || ticket.status === filterValues.status;
    const matchesType = !filterValues.type || ticket.ticketType === filterValues.type;
    const matchesCategory = !filterValues.category || ticket.category === filterValues.category;
    const q = searchQuery.trim().toLowerCase();
    const customerName = (ticket.customerData?.name ?? ticket.reporterName).toLowerCase();
    const matchesSearch =
      q === '' ||
      ticket.subject.toLowerCase().includes(q) ||
      (ticket.soNumber ?? '').toLowerCase().includes(q) ||
      ticket.id.toLowerCase().includes(q) ||
      customerName.includes(q);
    const created = new Date(ticket.createdAt);
    const matchesDate =
      !dateRange?.from ||
      (created >= new Date(dateRange.from.toDateString()) &&
        (!dateRange.to || created <= new Date(dateRange.to.toDateString() + ' 23:59')));
    return matchesStatus && matchesType && matchesCategory && matchesSearch && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / TICKETS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = filteredTickets.slice((safePage - 1) * TICKETS_PER_PAGE, safePage * TICKETS_PER_PAGE);

  const changeFilter = (fn: () => void) => {
    fn();
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riwayat Laporan</h1>
          <p className="text-sm text-muted-foreground mt-1">Pantau status seluruh laporan yang Anda ajukan.</p>
        </div>
        <Button asChild className="gap-2 text-xs font-semibold">
          <Link href="/report/new">
            <Plus className="size-4" />
            <span>Buat Laporan Baru</span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <TableToolbar
            searchValue={searchQuery}
            onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
            searchPlaceholder="Cari subjek, nomor SO, ID tiket, atau pelapor..."
            filters={[
              { key: 'status', label: 'Status', options: STATUS_OPTIONS },
              { key: 'type', label: 'Tipe Tiket', options: [
                { value: 'REQUEST', label: 'Request' },
                { value: 'INCIDENT', label: 'Incident' },
                { value: 'COMPLAINT', label: 'Complaint' },
                { value: 'INQUIRY', label: 'Inquiry' },
              ] },
              { key: 'category', label: 'Kategori', options: [...new Set(MOCK_TICKETS.map((t) => t.category))].map((c) => ({ value: c, label: c })) },
            ]}
            filterValues={filterValues}
            onFilterChange={setFilter}
            dateRange={dateRange}
            onDateRangeChange={(r) => { setDateRange(r); setCurrentPage(1); }}
            dateLabel="Tanggal Pembuatan Laporan"
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Menampilkan <strong className="text-foreground">{paginatedTickets.length}</strong> dari{' '}
        <strong className="text-foreground">{filteredTickets.length}</strong> laporan
      </p>

      {filteredTickets.length === 0 ? (
        <Card className="py-14 text-center">
          <CardContent className="space-y-3">
            <FileText className="size-8 text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm font-semibold">Tidak ada laporan ditemukan</p>
              <p className="text-xs text-muted-foreground mt-1">Coba ubah filter status atau kata kunci pencarian.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterValues({});
                setSearchQuery('');
                setDateRange(undefined);
                setCurrentPage(1);
              }}
            >
              Reset Filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {paginatedTickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="font-mono text-[11px] text-muted-foreground">{ticket.id}</p>
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2">{ticket.subject}</h3>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      {ticket.category}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">SO: {ticket.soNumber ?? '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs text-primary">
                      <Link href={`/laporan/${ticket.id}`}>Lihat Detail</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop — shadcn Table */}
          <Card className="hidden sm:block overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="bg-muted/50 px-6 py-3 font-semibold">ID Tiket</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 font-semibold">Subjek</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 font-semibold">Kategori</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 font-semibold">Status</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 font-semibold">Tanggal</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{ticket.id}</TableCell>
                    <TableCell className="px-6 py-3">
                      <div className="space-y-0.5 max-w-[260px]">
                        <p className="font-medium text-sm leading-none truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {ticket.customerData?.name ?? ticket.reporterName} · SO: {ticket.soNumber ?? '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">{ticket.category}</TableCell>
                    <TableCell className="px-6 py-3">
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                        <Link href={`/laporan/${ticket.id}`}>Detail</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <Pagination>
              <PaginationPrevious onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} />
              <PaginationContent>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink isActive={i + 1 === safePage} onClick={() => setCurrentPage(i + 1)}>
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              </PaginationContent>
              <PaginationNext onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} />
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
