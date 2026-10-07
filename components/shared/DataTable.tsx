'use client';

import * as React from 'react';
import {
  createColumnHelper,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
  type Updater,
  type ColumnVisibilityState,
} from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { features, type DataTableFeatures } from './data-table-features';
import { DataTablePagination } from './DataTablePagination';
import { cn } from '@/lib/utils';

export interface DataTablePaginationInfo {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  /**
   * 'client' (default): TanStack paginasi + sortir seluruh `data` di browser.
   * 'server': `data` adalah satu halaman dari server — TanStack tidak
   * memaginasi ulang; pakai `rowNumberOffset` + footer dari parent.
   */
  mode?: 'client' | 'server';
  /** Tampilkan kolom nomor urut. */
  showRowNumbers?: boolean;
  /** Offset nomor = (halaman - 1) * perPage. Wajib di mode server. */
  rowNumberOffset?: number;
  /** Baris per halaman awal (mode client). */
  pageSize?: number;
  /**
   * Visibilitas kolom terkontrol. Bila diberikan, `DataTable` tidak menyimpan
   * state sendiri dan mengikuti nilai parent. Dipakai agar `ColumnToggle` bisa
   * diletakkan di baris toolbar parent, bukan di dalam tabel.
   */
  columnVisibility?: ColumnVisibilityState;
  onColumnVisibilityChange?: (updater: Updater<ColumnVisibilityState>) => void;
  /**
   * Tandai sedang mengambil data berikutnya (ganti halaman / filter).
   * Baris yang ada tetap terlihat dengan opasitas rendah — lebih halus
   * daripada mengganti seluruh tabel dengan skeleton.
   */
  isPending?: boolean;
  emptyText?: string;
  /**
   * Konten empty state kustom (mis. `Empty` dari `components/ui/empty`).
   * Bila diisi, `emptyText` diabaikan. Render sebagai sel `colSpan` tanpa padding
   * supaya komponen bisa menentukan ruangnya sendiri.
   */
  empty?: React.ReactNode;
  /** Footer kustom (mode server). Bila kosong dan mode client, footer paginasi otomatis. */
  footer?: (info: DataTablePaginationInfo) => React.ReactNode;
}

/**
 * Tabel gaya shadcn di atas TanStack Table v9: sorting per kolom,
 * toggle visibilitas kolom, penomoran baris, empty state, dan footer
 * paginasi (otomatis di mode client, dari parent di mode server).
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  mode = 'client',
  showRowNumbers = false,
  rowNumberOffset,
  pageSize = 10,
  columnVisibility,
  onColumnVisibilityChange,
  isPending = false,
  emptyText = 'Tidak ada data.',
  empty,
  footer,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });
  const [internalVisibility, setInternalVisibility] = React.useState<ColumnVisibilityState>({});

  // Tak-terkontrol (default): state di dalam. Terkontrol: mengikuti parent.
  const isControlled = columnVisibility !== undefined;
  const visibility = isControlled ? columnVisibility : internalVisibility;
  const handleVisibilityChange = isControlled
    ? (onColumnVisibilityChange ?? (() => {}))
    : setInternalVisibility;

  // Data baru (mis. filter berubah) bisa membuat halaman aktif jadi tidak valid.
  // Daripada reset lewat effect, indeks halaman di-clamp saat render.
  const maxPageIndex = Math.max(
    0,
    Math.ceil(data.length / pagination.pageSize) - 1,
  );
  const pageIndex = Math.min(pagination.pageIndex, maxPageIndex);

  const table = useTable({
    features,
    data,
    columns,
    manualPagination: mode === 'server',
    pageCount: mode === 'server' ? 1 : undefined,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: handleVisibilityChange,
    state: {
      sorting,
      pagination: { ...pagination, pageIndex },
      columnVisibility: visibility,
    },
  });

  const offset =
    mode === 'server' ? (rowNumberOffset ?? 0) : pageIndex * pagination.pageSize;

  const visibleColumnCount =
    table.getVisibleLeafColumns().length + (showRowNumbers ? 1 : 0);

  const clientInfo: DataTablePaginationInfo = {
    page: pageIndex + 1,
    lastPage: table.getPageCount(),
    total: data.length,
    perPage: table.state.pagination.pageSize,
    onPageChange: (page) => table.setPageIndex(page - 1),
    onPerPageChange: (perPage) => {
      table.setPageSize(perPage);
      table.setPageIndex(0);
    },
  };

  return (
    <div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {showRowNumbers && (
                  <TableHead className="w-12 text-muted-foreground">No</TableHead>
                )}
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            className={cn(
              'transition-opacity',
              isPending && 'pointer-events-none opacity-50',
            )}
          >
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow key={row.id}>
                  {showRowNumbers && (
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {offset + index + 1}
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount}
                  className="p-0 align-middle"
                >
                  {empty ?? (
                    <div className="flex h-24 items-center justify-center text-center text-sm text-muted-foreground">
                      {emptyText}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {footer ? (
        footer(clientInfo)
      ) : (
        mode === 'client' && (
          <DataTablePagination
            page={clientInfo.page}
            lastPage={clientInfo.lastPage}
            total={clientInfo.total}
            perPage={clientInfo.perPage}
            onPageChange={clientInfo.onPageChange}
            onPerPageChange={clientInfo.onPerPageChange}
          />
        )
      )}
    </div>
  );
}

/** Helper header sortable ala shadcn (tombol ghost + ikon). */
export function SortableHeader({ title, onToggle, sorted }: {
  title: string;
  onToggle: () => void;
  sorted: false | 'asc' | 'desc';
}) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 -mr-1.5 h-8" onClick={onToggle}>
      {title}
      <ArrowUpDown data-icon="inline-end" data-state={sorted || undefined} />
    </Button>
  );
}

export { createColumnHelper };
export type { ColumnDef };
