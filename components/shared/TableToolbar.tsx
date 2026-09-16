'use client';

import * as React from 'react';
import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

export interface FilterOption {
  value: string;
  label: string;
  /** Jumlah data yang match opsi ini (ditampilkan di kanan, opsional) */
  count?: number;
}

export interface TableFilterConfig {
  key: string;
  label: string;
  placeholder?: string;
  options: FilterOption[];
}

export interface TableFilterValues {
  [key: string]: string | null;
}

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: TableFilterConfig[];
  filterValues?: TableFilterValues;
  onFilterChange?: (key: string, value: string | null) => void;
  dateRange?: DateRange | undefined;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  dateLabel?: string;
}

/**
 * Section card dalam modal filter — meniru referensi:
 * label bold kecil di atas, konten filter di bawah, kartu putih rounded border.
 */
function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-xs font-semibold tracking-wide text-foreground">{label}</p>
      {children}
    </section>
  );
}

/** Baris opsi checkbox — checkbox kiri, label tengah, count kanan (mono, muted). */
function FilterOptionRow({
  option,
  checked,
  onToggle,
}: {
  option: FilterOption;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
        'hover:bg-muted/50',
        checked && 'text-foreground'
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="pointer-events-none"
        id={`opt-${option.value}`}
      />
      <span className={cn('flex-1 truncate', checked ? 'font-medium' : 'text-muted-foreground')}>
        {option.label}
      </span>
      {option.count != null && (
        <span className="font-mono text-xs text-muted-foreground">{option.count}</span>
      )}
    </label>
  );
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari ID, SO, subjek, pelapor...',
  filters = [],
  filterValues = {},
  onFilterChange,
  dateRange,
  onDateRangeChange,
  dateLabel = 'Tanggal Pembuatan Laporan',
}: TableToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  /**
   * Jumlah filter aktif (badge di tombol + indikator "(N)" di tombol Apply).
   */
  const activeFilterCount =
    Object.values(filterValues).filter(Boolean).length + (dateRange?.from ? 1 : 0);

  const activeBadges = filters
    .filter((f) => filterValues[f.key])
    .map((f) => ({
      key: f.key,
      label: f.options.find((o) => o.value === filterValues[f.key])?.label ?? String(filterValues[f.key]),
    }));

  const isFilterActive = (key: string, value: string) => filterValues[key] === value;

  const toggleFilter = (key: string, value: string) => {
    // Single-select per key: klik opsi aktif = clear; klik opsi lain = ganti.
    onFilterChange?.(key, isFilterActive(key, value) ? null : value);
  };

  const resetAll = () => {
    filters.forEach((f) => onFilterChange?.(f.key, null));
    onDateRangeChange?.(undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Search + trigger button */}
      <div className="flex items-center gap-2">
        <InputGroup className="flex-1">
          <InputGroupInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>

        {filters.length > 0 && (
          <Button
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 size-5 justify-center rounded-full px-1 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {(activeBadges.length > 0 || dateRange?.from) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeBadges.map((b) => (
            <button
              key={b.key}
              type="button"
              className="group inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs hover:bg-muted"
              onClick={() => onFilterChange?.(b.key, null)}
            >
              {b.label}
              <X className="size-3 text-muted-foreground group-hover:text-foreground" />
            </button>
          ))}
          {dateRange?.from && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs hover:bg-muted"
              onClick={() => onDateRangeChange?.(undefined)}
            >
              {format(dateRange.from, 'dd MMM y')}
              {dateRange.to ? ` – ${format(dateRange.to, 'dd MMM y')}` : ''}
              <X className="toggle-lucide size-3 text-muted-foreground group-hover:text-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Filter modal — style professional card-section */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {/* Header */}
          <DialogHeader className="space-y-0 border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="size-4" />
              Filter
            </DialogTitle>
            <DialogDescription className="sr-only">
              Saring data berdasarkan parameter di bawah.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
            {onDateRangeChange && (
              <FilterSection label={dateLabel}>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start px-2.5 font-normal',
                          !dateRange && 'text-muted-foreground'
                        )}
                      />
                    }
                  >
                    <CalendarIcon data-icon="inline-start" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd LLL y')} – {format(dateRange.to, 'dd LLL y')}
                        </>
                      ) : (
                        format(dateRange.from, 'dd LLL y')
                      )
                    ) : (
                      <span>Pilih rentang tanggal</span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={onDateRangeChange}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </FilterSection>
            )}

            {filters.map((f) => (
              <FilterSection key={f.key} label={f.label}>
                <div className="space-y-0.5">
                  {f.options.map((o) => (
                    <FilterOptionRow
                      key={o.value}
                      option={o}
                      checked={isFilterActive(f.key, o.value)}
                      onToggle={() => toggleFilter(f.key, o.value)}
                    />
                  ))}
                </div>
              </FilterSection>
            ))}
          </div>

          {/* Footer: Reset kiri, Cancel+Apply kanan (style referensi) */}
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAll}
              disabled={activeFilterCount === 0}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="size-3.5" />
              Reset
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFilterOpen(false)}>
                Batal
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setFilterOpen(false)}>
                Terapkan
                {activeFilterCount > 0 && ` (${activeFilterCount})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
