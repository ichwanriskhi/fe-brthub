'use client';

import * as React from 'react';
import type { Updater, ColumnVisibilityState } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Enough of a ColumnDef to drive this control — avoids generic plumbing. */
export interface ToggleableColumn {
  id?: string;
  enableHiding?: boolean;
}

interface ColumnToggleProps {
  /** Daftar kolom tabel; hanya `id` dan `enableHiding` yang dibaca. */
  columns: readonly ToggleableColumn[];
  /** Visibilitas terkini, dikontrol oleh parent. */
  visibility: ColumnVisibilityState;
  onVisibilityChange: (updater: Updater<ColumnVisibilityState>) => void;
  /** Label tombol. Default "Kolom". */
  label?: string;
  className?: string;
}

/**
 * Dropdown pengatur visibilitas kolom, berdiri sendiri dari `DataTable`.
 * Pasangan dengan prop `columnVisibility` / `onColumnVisibilityChange` supaya
 * bisa diletakkan sebaris dengan toolbar, bukan menggantung di atas tabel.
 */
export function ColumnToggle({
  columns,
  visibility,
  onVisibilityChange,
  label = 'Kolom',
  className,
}: ColumnToggleProps) {
  const hideable = columns.filter(
    (column) =>
      (column.enableHiding ?? true) &&
      // Kolom tanpa id stabil tidak punya nama yang bisa ditampilkan.
      typeof column.id === 'string' && column.id.length > 0,
  );

  const toggle = (id: string, visible: boolean) => {
    onVisibilityChange((prev) => ({ ...prev, [id]: visible }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className={className} />}
      >
        {label} <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          {hideable.map((column) => {
            const id = column.id as string;
            const visible = visibility[id] ?? true;
            return (
              <DropdownMenuCheckboxItem
                key={id}
                className="capitalize"
                checked={visible}
                onCheckedChange={(value) => toggle(id, !!value)}
              >
                {id}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}