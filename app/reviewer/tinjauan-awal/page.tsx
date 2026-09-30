'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { StatusBadge, TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Inbox, ChevronRight, Loader2 } from 'lucide-react';
import { TicketCardList } from '@/components/shared/TicketCardList';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import type { DateRange } from 'react-day-picker';

interface Ticket {
  id: number;
  ticket_no: string;
  subject: string;
  description: string;
  reporter_user_id: number;
  customer_id: number | null;
  category_id: number | null;
  ticket_type_id: number | null;
  priority_id: number | null;
  status_id: number;
  approval_type: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  reporter_user?: { id: number; full_name: string; email: string; phone_number: string };
  customer?: { id: number; user: { id: number; full_name: string; email: string } };
  category?: { id: number; name: string; code: string; parent?: { id: number; name: string; code: string } };
  ticket_type?: { id: number; name: string; code: string };
  priority?: { id: number; name: string; code: 'A' | 'B' | 'C' };
  status?: { id: number; name: string; code: string };
  vehicle_detail?: { id: number; ticket_id: number; product_id: number | null; vehicle_model: string | null; product?: { id: number; name: string; code: string } };
  sales_detail?: { id: number; ticket_id: number; so_number: string | null; sales_name: string | null; claimed_items: any[] | null };
}

interface TicketsResponse {
  data: Ticket[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const TICKETS_PER_PAGE = 10;

export default function TinjauanAwalPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('brthub_token');
        if (!token) {
          throw new Error('No auth token');
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
        const params = new URLSearchParams({
          status_code: 'OPEN',
          page: currentPage.toString(),
          per_page: TICKETS_PER_PAGE.toString(),
        });
        if (search) params.append('search', search);

        const res = await fetch(`${API_URL}/api/auth/tickets?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.status}`);
        const data: TicketsResponse = await res.json();
        setTickets(data.data);
        setTotalPages(data.last_page);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setTickets([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [currentPage, search]);

  const setFilter = (key: string, value: string | null) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getPaginationItems = () => {
    const items: (number | 'ellipsis')[] = [];
    const total = totalPages;
    const current = currentPage;
    if (total <= 5) {
      for (let i = 1; i <= total; i++) items.push(i);
    } else if (current <= 3) {
      items.push(1, 2, 3, 'ellipsis', total);
    } else if (current >= total - 2) {
      items.push(1, 'ellipsis', total - 2, total - 1, total);
    } else {
      items.push(1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total);
    }
    return items;
  };

  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const getReporterName = (ticket: Ticket) => {
    if (ticket.reporter_user) return ticket.reporter_user.full_name;
    if (ticket.customer?.user) return ticket.customer.user.full_name;
    return 'Unknown';
  };

  const getSoNumber = (ticket: Ticket) => ticket.sales_detail?.so_number ?? '-';

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            filters={[
              { key: 'priority', label: 'Prioritas', options: [
                { value: 'A', label: 'Prioritas A (Tinggi)' },
                { value: 'B', label: 'Prioritas B (Normal)' },
                { value: 'C', label: 'Prioritas C (Rendah)' },
              ] },
              { key: 'type', label: 'Tipe Tiket', options: [
                { value: 'REQUEST', label: 'Request' },
                { value: 'INCIDENT', label: 'Incident' },
                { value: 'COMPLAINT', label: 'Complaint' },
                { value: 'INQUIRY', label: 'Inquiry' },
              ] },
              { key: 'category', label: 'Kategori', options: [] },
            ]}
            filterValues={filterValues}
            onFilterChange={setFilter}
            dateRange={dateRange}
            onDateRangeChange={(r) => { setDateRange(r); setCurrentPage(1); }}
          />
        </CardContent>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground/60" />
            <p className="text-sm font-medium">Memuat tiket...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada tiket dalam antrean tinjauan awal</p>
            <p className="text-xs text-muted-foreground">Semua laporan telah diverifikasi.</p>
          </div>
        ) : (
          <>
            <div className="md:hidden px-4 pb-4 -mt-2">
              <TicketCardList
                tickets={tickets.map((t) => ({
                  id: t.ticket_no,
                  subject: t.subject,
                  reporterName: getReporterName(t),
                  customerData: t.customer?.user ? { name: t.customer.user.full_name } : undefined,
                  soNumber: getSoNumber(t),
                  status: (t.status?.code ?? 'OPEN') as any,
                  ticketType: (t.ticket_type?.code ?? 'REQUEST') as any,
                  priority: t.priority?.code ?? null,
                  category: t.category?.name ?? 'Uncategorized',
                  createdAt: t.created_at,
                  subcategory: '',
                  description: '',
                  reporterPhone: '',
                  reporterAddress: '',
                  isReportForCustomer: false,
                  reporterType: undefined,
                  attachments: [],
                })) as any}
                actionLabel="Verifikasi"
                hrefBase="/reviewer/tiket"
              />
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-muted/50 px-6 py-3">ID Tiket</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Subjek</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Pelapor</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {ticket.ticket_no}
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="max-w-[280px] space-y-0.5">
                          <p className="truncate text-sm font-medium">{ticket.subject}</p>
                          <p className="truncate text-xs text-muted-foreground">SO: {getSoNumber(ticket)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <span className="text-sm">{getReporterName(ticket)}</span>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <TypeBadge ticketType={(ticket.ticket_type?.code ?? 'REQUEST') as any} />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <StatusBadge status={(ticket.status?.code ?? 'OPEN') as any} />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <Button size="sm" asChild>
                          <Link href={`/reviewer/tiket/${ticket.id}`}>
                            Verifikasi
                            <ChevronRight data-icon="inline-end" />
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
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); goToPage(currentPage - 1); }}
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
                        isActive={item === currentPage}
                        onClick={(e) => { e.preventDefault(); goToPage(item); }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); goToPage(currentPage + 1); }}
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
