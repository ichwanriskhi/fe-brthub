'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { TypeBadge, PriorityBadge } from '@/components/shared/StatusBadge';
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
import { History, ChevronRight, ArrowUpRight } from 'lucide-react';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import type { DateRange } from 'react-day-picker';

const TICKETS_PER_PAGE = 10;

// Entri riwayat penugasan: current + reassignment (superseded)
interface HistoryEntry {
  id: string;
  ticketId: string;
  subject: string;
  type: 'REQUEST' | 'INCIDENT' | 'COMPLAINT' | 'INQUIRY';
  category: string;
  priority: 'A' | 'B' | 'C' | null;
  handler: string;
  assignedBy: string;
  assignedAt: string;
  isCurrent: boolean;
  isSuperseded?: boolean;
}

const HISTORY_DATA: HistoryEntry[] = [
  { id: 'asg-1', ticketId: 'BRT-2026-0909-002', subject: 'Salah order part Juken 5+ Vario 160', type: 'COMPLAINT', category: 'Klaim Distribusi & Pengiriman', priority: 'B', handler: 'Budi S.', assignedBy: 'Tri Mentari', assignedAt: '13 Sep 2026, 13:40', isCurrent: true },
  { id: 'asg-2', ticketId: 'BRT-2026-0913-001', subject: 'Kekurangan pengiriman part Juken 5+', type: 'REQUEST', category: 'Klaim Distribusi & Pengiriman', priority: 'C', handler: 'Dimas P.', assignedBy: 'Auto-route', assignedAt: '13 Sep 2026, 09:10', isCurrent: true },
  { id: 'asg-3', ticketId: 'BRT-2026-0913-003', subject: 'Gangguan jaringan kantor operasional', type: 'INCIDENT', category: 'IT Service', priority: 'B', handler: 'Dimas P.', assignedBy: 'Auto-route', assignedAt: '12 Sep 2026, 16:30', isCurrent: false, isSuperseded: true },
  { id: 'asg-4', ticketId: 'BRT-2026-0913-003', subject: 'Gangguan jaringan kantor operasional (Reassignment)', type: 'INCIDENT', category: 'IT Service', priority: 'B', handler: 'Agus S.', assignedBy: 'Tri Mentari', assignedAt: '13 Sep 2026, 08:15', isCurrent: true },
  { id: 'asg-5', ticketId: 'BRT-2026-0912-005', subject: 'Pengadaan kursi kantor ergonomis', type: 'REQUEST', category: 'Sarana & Prasarana', priority: 'C', handler: 'Rina A.', assignedBy: 'Tri Mentari', assignedAt: '12 Sep 2026, 16:22', isCurrent: true },
  { id: 'asg-6', ticketId: 'BRT-2026-0912-005', subject: 'Pengadaan kursi kantor ergonomis (Reassignment)', type: 'REQUEST', category: 'Sarana & Prasarana', priority: 'C', handler: 'Budi S.', assignedBy: 'Tri Mentari', assignedAt: '11 Sep 2026, 10:05', isCurrent: false, isSuperseded: true },
  { id: 'asg-7', ticketId: 'BRT-2026-0911-008', subject: 'Servis berkala armada Vario 160', type: 'REQUEST', category: 'Kendaraan', priority: 'B', handler: 'Dimas P.', assignedBy: 'Auto-route', assignedAt: '11 Sep 2026, 09:00', isCurrent: true },
];

export default function UnitHistoryPage() {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<TableFilterValues>({});
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(
    () =>
      HISTORY_DATA.filter((row) => {
        const q = search.toLowerCase().trim();
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
          (stateVal === 'superseded' && row.isSuperseded);
        return matchesSearch && matchesHandler && matchesState;
      }),
    [search, filterValues]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / TICKETS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * TICKETS_PER_PAGE, safePage * TICKETS_PER_PAGE);

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

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            searchPlaceholder="Cari ID tiket, subjek, handler..."
            filters={[
              { key: 'handler', label: 'Handler', options: [
                { value: 'Dimas P.', label: 'Dimas P.' },
                { value: 'Budi S.', label: 'Budi S.' },
                { value: 'Rina A.', label: 'Rina A.' },
                { value: 'Agus S.', label: 'Agus S.' },
              ] },
              { key: 'state', label: 'Status Penugasan', options: [
                { value: 'current', label: 'Aktif' },
                { value: 'superseded', label: 'Digantikan' },
              ] },
            ]}
            filterValues={filterValues}
            onFilterChange={setFilter}
          />
        </CardContent>

        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-center">
            <History className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Tidak ada riwayat penugasan</p>
            <p className="text-xs text-muted-foreground">Coba ubah filter atau kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="md:hidden px-4 pb-4 -mt-2">
            {paginated.map((row) => (
              <div key={row.id} className="mb-3 rounded-lg border bg-card py-4 last:mb-0">
                <div className="px-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-mono text-xs text-muted-foreground">{row.ticketId}</p>
                      <p className={`text-sm font-medium leading-snug line-clamp-2 ${row.isSuperseded ? 'text-muted-foreground' : ''}`}>
                        {row.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.handler} · {row.assignedAt}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <PriorityBadge priority={row.priority} />
                      <Badge variant={row.isCurrent ? 'default' : 'secondary'} className="text-[11px]">
                        {row.isCurrent ? 'Aktif' : 'Digantikan'}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full justify-between" asChild>
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

        {paginated.length > 0 && (
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
                  <TableRow key={row.id} className={row.isSuperseded ? 'bg-muted/30' : ''}>
                    <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{row.ticketId}</TableCell>
                    <TableCell className="px-6 py-3">
                      <span className={`block max-w-[200px] truncate text-sm ${row.isSuperseded ? 'text-muted-foreground' : 'font-medium'}`} title={row.subject}>
                        {row.subject}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <TypeBadge ticketType={row.type} />
                    </TableCell>
                    <TableCell className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">{row.category}</TableCell>
                    <TableCell className="px-6 py-3">
                      <PriorityBadge priority={row.priority} />
                    </TableCell>
                    <TableCell className={`px-6 py-3 text-sm ${row.isSuperseded ? 'text-muted-foreground' : 'font-medium'}`}>
                      {row.handler}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">{row.assignedBy}</TableCell>
                    <TableCell className="px-6 py-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">{row.assignedAt}</TableCell>
                    <TableCell className="px-6 py-3">
                      <Badge variant={row.isCurrent ? 'default' : 'secondary'} className="text-[11px] gap-1">
                        {row.isCurrent ? (
                          <span className="size-1.5 rounded-full bg-primary-foreground" />
                        ) : null}
                        {row.isCurrent ? 'Aktif' : 'Digantikan'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
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
    </div>
  );
}

