'use client';

import type { ReactNode } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive` → tombol konfirmasi merah + ikon peringatan bawaan. */
  variant?: 'default' | 'destructive';
  /** Override ikon pada header (default: HelpCircle / AlertCircle). */
  icon?: ReactNode;
  /** Nonaktifkan tombol selama request berjalan. */
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * Konfirmasi aksi penting — wrapper tipis di atas `ui/alert-dialog`
 * (tanpa tombol X: keputusan harus lewat Batal / Konfirmasi; ESC & klik
 * backdrop tetap membatalkan). Analog untuk konten: ReportDetailModal ← ui/dialog.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  variant = 'default',
  icon,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const destructive = variant === 'destructive';
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            {icon ??
              (destructive ? (
                <AlertCircle className="text-destructive" />
              ) : (
                <HelpCircle className="text-primary" />
              ))}
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}