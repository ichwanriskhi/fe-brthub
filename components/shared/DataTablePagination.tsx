'use client';

import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTablePaginationProps {
  /** Halaman aktif (1-based, dari paginator server). */
  page: number;
  /** Total halaman (last_page dari server). */
  lastPage: number;
  /** Total baris (total dari server). */
  total: number;
  /** Baris per halaman saat ini. */
  perPage: number;
  /** Opsi rows-per-page. Default [10, 20, 50]. */
  perPageOptions?: number[];
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

/**
 * Pagination ala shadcn tasks-demo: info range + rows-per-page +
 * "Page X of Y" + tombol first/prev/next/last.
 * Tanpa counter seleksi (tidak ada checkbox).
 */
export function DataTablePagination({
  page,
  lastPage,
  total,
  perPage,
  perPageOptions = [10, 20, 50],
  onPageChange,
  onPerPageChange,
}: DataTablePaginationProps) {
  const safeLastPage = Math.max(1, lastPage);
  const safePage = Math.min(Math.max(1, page), safeLastPage);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Menampilkan {from}–{to} dari {total} data
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Baris per halaman</span>
          <Select
            value={String(perPage)}
            onValueChange={(v) => onPerPageChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {perPageOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-sm font-medium">
          Halaman {safePage} dari {safeLastPage}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={safePage <= 1}
            aria-label="Halaman pertama"
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= safeLastPage}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safeLastPage)}
            disabled={safePage >= safeLastPage}
            aria-label="Halaman terakhir"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
