'use client';

import { useEffect, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import {
  getAdminCustomers,
  toCustomerEntry,
  type CustomerEntry,
} from '@/lib/api/admin-customers';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/shared/DataTable';
import type { DataTableFeatures } from '@/components/shared/data-table-features';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { ColumnToggle } from '@/components/shared/ColumnToggle';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ActiveBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock3, Inbox, MapPin, Phone, ExternalLink, Users } from 'lucide-react';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { toast } from 'sonner';

const columnHelper = createColumnHelper<DataTableFeatures, CustomerEntry>();

export default function AdminPelangganPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerEntry[]>([]);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    customersWithTickets: 0,
    totalTickets: 0,
    activeTickets: 0,
    resolvedTickets: 0,
  });

  const filterValues: TableFilterValues = { status: statusFilter };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await getAdminCustomers({ per_page: 200 });
      setCustomers(res.data.map(toCustomerEntry));
      setSummary({
        totalCustomers: res.summary.total_customers,
        customersWithTickets: res.summary.customers_with_tickets,
        totalTickets: res.summary.total_tickets,
        activeTickets: res.summary.active_tickets,
        resolvedTickets: res.summary.resolved_tickets,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data pelanggan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.address ?? '').toLowerCase().includes(q);
    const matchesStatus =
      !statusFilter || (statusFilter === 'ACTIVE' ? c.isActive : !c.isActive);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const TicketChips = ({ customerId, tickets }: { customerId: string; tickets: CustomerEntry['tickets'] }) => {
    if (tickets.total === 0) {
      return <span className="text-xs text-muted-foreground">Belum ada tiket</span>;
    }
    return (
      <a
        href={`/admin/ticket/monitoring?customer=${customerId}`}
        className="inline-flex flex-wrap items-center gap-1.5 text-xs"
        title="Lihat tiket milik customer ini"
      >
        {tickets.active > 0 && (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">{tickets.active} aktif</Badge>
        )}
        {tickets.resolved > 0 && (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{tickets.resolved} selesai</Badge>
        )}
        <span className="font-medium text-foreground">total {tickets.total}</span>
        <ExternalLink className="size-3 text-muted-foreground" />
      </a>
    );
  };

  const columns: ColumnDef<DataTableFeatures, CustomerEntry>[] = columnHelper.columns([
    columnHelper.accessor('code', {
      header: 'Kode',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">{row.original.code}</span>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Nama',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            Terdaftar{' '}
            {new Date(row.original.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor('phone', {
      header: 'Telepon',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.phone}</span>
      ),
    }),
    columnHelper.accessor('address', {
      header: 'Alamat',
      cell: ({ row }) => (
        <span className="line-clamp-2 text-xs text-muted-foreground">{row.original.address ?? '-'}</span>
      ),
    }),
    columnHelper.display({
      id: 'tiket',
      header: 'Tiket',
      cell: ({ row }) => <TicketChips customerId={row.original.id} tickets={row.original.tickets} />,
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
    }),
  ]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatisticsCard
          label="Total Pelanggan"
          value={String(summary.totalCustomers)}
          subtitle={`${summary.customersWithTickets} pernah melapor`}
          icon={Users}
        />
        <StatisticsCard
          label="Total Tiket Customer"
          value={String(summary.totalTickets)}
          subtitle="dari semua pelanggan"
          icon={Inbox}
        />
        <StatisticsCard
          label="Tiket Aktif"
          value={String(summary.activeTickets)}
          subtitle="belum selesai"
          icon={Clock3}
        />
        <StatisticsCard
          label="Tiket Selesai"
          value={String(summary.resolvedTickets)}
          subtitle="closed / rejected"
          icon={CheckCircle2}
        />
      </div>

      <Card className="w-full gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v);
              setCurrentPage(1);
            }}
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
            action={
              <ColumnToggle
                columns={columns}
                visibility={columnVisibility}
                onVisibilityChange={setColumnVisibility}
              />
            }
          />
        </CardContent>

        {/* Mobile card view */}
        <div
          className={cn(
            'px-4 pb-4 transition-opacity md:hidden',
            loading && paginated.length > 0 && 'pointer-events-none opacity-50',
          )}
        >
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
                      <TicketChips customerId={c.id} tickets={c.tickets} />
                    </div>
                  </div>
                  <ActiveBadge isActive={c.isActive} />
                </div>
              </div>
            </div>
          ))}
          {paginated.length === 0 && (
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>Tidak ada customer yang ditemukan</EmptyTitle>
                <EmptyDescription>
                  Ubah filter atau kata kunci pencarian untuk melihat customer lain.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden px-4 pb-4 md:block">
          <DataTable
            mode="server"
            columns={columns}
            data={paginated}
            isPending={loading}
            showRowNumbers
            rowNumberOffset={(safePage - 1) * perPage}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            emptyText="Tidak ada customer yang ditemukan."
            footer={() => (
              <DataTablePagination
                page={safePage}
                lastPage={totalPages}
                total={filtered.length}
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
      </Card>
    </div>
  );
}
