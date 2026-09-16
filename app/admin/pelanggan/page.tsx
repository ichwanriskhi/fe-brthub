'use client';

import { useState } from 'react';
import { MOCK_CUSTOMERS } from '@/lib/mock/admin';
import { customerTicketStats } from '@/lib/mock/analytics';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { CheckCircle2, Clock3, Inbox, MapPin, Phone, Plus, ExternalLink, Users } from 'lucide-react';
import { StatisticsCard } from '@/components/shared/StatisticsCard';

const ITEMS_PER_PAGE = 10;

export default function AdminPelangganPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const filterValues: TableFilterValues = { status: statusFilter };

  const filtered = MOCK_CUSTOMERS.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.address ?? '').toLowerCase().includes(q);
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'ACTIVE' ? c.isActive : !c.isActive);
    return matchesSearch && matchesStatus;
  });

  // Aggregate stats over all customers
  const allStats = MOCK_CUSTOMERS.map((c) => customerTicketStats(c.id));
  const totalTickets = allStats.reduce((s, x) => s + x.total, 0);
  const activeTickets = allStats.reduce((s, x) => s + x.active, 0);
  const resolvedTickets = allStats.reduce((s, x) => s + x.resolved, 0);
  const customersWithTickets = MOCK_CUSTOMERS.filter((c) => customerTicketStats(c.id).total > 0).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const getPaginationItems = () => {
    const items: (number | 'ellipsis')[] = [];
    const total = totalPages;
    const current = safePage;
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

  const TicketChips = ({ customerId }: { customerId: string }) => {
    const stats = customerTicketStats(customerId);
    if (stats.total === 0) {
      return <span className="text-xs text-muted-foreground">Belum ada tiket</span>;
    }
    return (
      <a
        href={`/admin/ticket/monitoring?customer=${customerId}`}
        className="inline-flex flex-wrap items-center gap-1.5 text-xs"
        title="Lihat tiket milik customer ini"
      >
        {stats.active > 0 && (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">{stats.active} aktif</Badge>
        )}
        {stats.resolved > 0 && (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{stats.resolved} selesai</Badge>
        )}
        <span className="font-medium text-foreground">total {stats.total}</span>
        <ExternalLink className="size-3 text-muted-foreground" />
      </a>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatisticsCard label="Total Pelanggan" value={String(MOCK_CUSTOMERS.length)} subtitle={`${customersWithTickets} pernah melapor`} icon={Users} />
        <StatisticsCard label="Total Tiket Customer" value={String(totalTickets)} subtitle="dari semua pelanggan" icon={Inbox} />
        <StatisticsCard label="Tiket Aktif" value={String(activeTickets)} subtitle="belum selesai" icon={Clock3} />
        <StatisticsCard label="Tiket Selesai" value={String(resolvedTickets)} subtitle="closed / rejected" icon={CheckCircle2} showTrend />
      </div>

      <Card className="w-full gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            searchPlaceholder="Cari nama, kode, telepon, alamat..."
            filters={[
              {
                key: 'status',
                label: 'Status',
                options: [
                  { value: 'ACTIVE', label: 'Aktif' },
                  { value: 'INACTIVE', label: 'Nonaktif' },
                ],
              },
            ]}
            filterValues={filterValues}
            onFilterChange={(key, value) => {
              if (key === 'status') setStatusFilter(value ?? '');
            }}
          />
        </CardContent>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t">
          <div>
            <p className="text-sm font-medium">Data Customer</p>
            <p className="text-xs text-muted-foreground">
              {filtered.length} pelanggan • {customersWithTickets} dengan tiket
            </p>
          </div>
          <Button size="sm" onClick={() => { /* mock — belum tersimpan */ }}>
            <Plus className="size-4" />
            Customer Baru
          </Button>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden px-4 pb-4">
          {paginated.map((c) => (
            <div key={c.id} className="mb-3 rounded-lg border bg-card py-4 last:mb-0">
              <div className="px-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
                    <p className="text-sm font-medium leading-snug">{c.name}</p>
                    <p className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      <Phone className="size-3" />
                      {c.phone}
                    </p>
                    {c.address && (
                      <p className="inline-flex items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 size-3 shrink-0" />
                        <span className="line-clamp-2">{c.address}</span>
                      </p>
                    )}
                    <div className="pt-1">
                      <TicketChips customerId={c.id} />
                    </div>
                  </div>
                  <Badge className={c.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted/50 text-muted-foreground'}>
                    {c.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
          {paginated.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Tidak ada customer yang ditemukan.
            </p>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 px-6 py-3">Kode</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Nama</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Telepon</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Alamat</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Tiket</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{c.code}</TableCell>
                  <TableCell className="px-6 py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Terdaftar {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground">{c.phone}</TableCell>
                  <TableCell className="max-w-64 px-6 py-3 text-xs text-muted-foreground">
                    <span className="line-clamp-2">{c.address ?? '-'}</span>
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <TicketChips customerId={c.id} />
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <Badge className={c.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted/50 text-muted-foreground'}>
                      {c.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    Tidak ada customer yang ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="border-t px-6 py-4">
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationPrevious onClick={() => goToPage(safePage - 1)} />
              <PaginationContent>
                {getPaginationItems().map((item, i) =>
                  item === 'ellipsis' ? (
                    <PaginationItem key={`e-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
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
