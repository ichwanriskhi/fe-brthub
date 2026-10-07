'use client';

import * as React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
  /** Elemen kecil di sebelah label, mis. chip "Direkomendasikan". */
  trailing?: React.ReactNode;
}

/**
 * RadioGroup dengan baris ringkas: deskripsi hanya ditampilkan untuk opsi yang
 * sedang dipilih.
 *
 * Versi lama menampilkan deskripsi di SETIAP opsi. Untuk 4 tujuan eskalasi +
 * 3 aksi handler itumeaning ~180px terbuang, dan kolom kanan jadi terlalu
 * tinggi untuk `position: sticky` (elemen sticky yang lebih tinggi dari
 * viewport akan terpotong di bawah).
 */
export function ChoiceList({
  value,
  onValueChange,
  options,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: ChoiceOption[];
  className?: string;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onValueChange(String(v))}
      className={cn('gap-1.5', className)}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            data-checked={selected || undefined}
            className="flex cursor-pointer flex-col rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent data-checked:border-primary data-checked:bg-primary/10 dark:border-input"
          >
            <span className="flex items-center gap-2">
              <RadioGroupItem value={option.value} />
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              {option.trailing}
            </span>
            {selected && option.description ? (
              <span className="mt-1 ml-6 text-xs text-muted-foreground">{option.description}</span>
            ) : null}
          </label>
        );
      })}
    </RadioGroup>
  );
}