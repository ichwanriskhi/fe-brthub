'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';

export interface AssignOption {
  /** `value` (bukan `id`) supaya bisa langsung dipakai sebagai `items` Select. */
  value: string;
  label: string;
}

/**
 * Form penugasan handler dalam dialog.
 *
 * Aksi ini sebelumnya punya Select + tombol + kotak peringatan sebagai isi kartu
 * permanen di sidebar, lalu masih harus lewat `ConfirmDialog` kedua. Dua lapis
 * konfirmasi untuk aksi yang reversible. Di sini confirm digabung ke dalam
 * dialog: `description` menjelaskan konsekuensinya, dan tombol konfirmasi
 * langsung melakukan submit (destructive saat mengganti handler aktif).
 */
export function AssignHandlerDialog({
  open,
  onOpenChange,
  /** Nama handler yang sedang aktif — menentukan mode assign atau replace. */
  currentHandlerName,
  options,
  loadingOptions,
  value,
  onValueChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentHandlerName?: string;
  options: AssignOption[];
  loadingOptions: boolean;
  value: string;
  onValueChange: (value: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const isReplace = Boolean(currentHandlerName);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onOpenChange(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isReplace ? 'Ganti Handler' : 'Tugaskan Handler'}</DialogTitle>
          <DialogDescription>
            {isReplace
              ? `Handler aktif (${currentHandlerName}) akan dinonaktifkan dan tiket diteruskan ke handler baru.`
              : 'Pilih pegawai yang akan menangani tiket ini dari unit tujuan.'}
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel>Handler</FieldLabel>
          <Select value={value} onValueChange={(v) => onValueChange(v ?? '')} items={options}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih handler..." />
            </SelectTrigger>
            <SelectContent>
              {loadingOptions ? (
                <SelectItem value="__loading" disabled>
                  Memuat daftar pegawai...
                </SelectItem>
              ) : options.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  Tidak ada pegawai di departemen ini
                </SelectItem>
              ) : (
                options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FieldDescription>
            Handler harus berasal dari departemen yang menerima tiket ini.
          </FieldDescription>
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant={isReplace ? 'destructive' : 'default'}
            onClick={onSubmit}
            disabled={submitting || !value || options.length === 0}
          >
            {submitting && <Spinner data-icon="inline-start" />}
            {isReplace ? 'Ya, Ganti Handler' : 'Ya, Tugaskan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}