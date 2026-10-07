'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { DotChip } from '@/components/shared/DotChip';
import {
  getCategoryActions,
  attachCategoryAction,
  updateCategoryAction,
  detachCategoryAction,
  type RawAction,
  type RawCategoryAction,
} from '@/lib/api/master';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CategoryActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kategori yang sedang diatur — null = dialog tertutup. */
  category: { id: string; name: string } | null;
  /** Semua aksi master (termasuk nonaktif, untuk konteks). */
  actions: RawAction[];
  /**
   * Dipanggil setiap mutasi berhasil dengan daftar mapping terbaru kategori
   * ini — induk mengganti baris kategori tersebut tanpa refetch seluruh
   * master data.
   */
  onSync: (categoryId: string, rows: RawCategoryAction[]) => void;
}

/**
 * Editor matriks kategori → aksi.
 *
 * Reviewer hanya boleh memilih aksi yang terpasang pada subkategori tiket
 * (`submitReview` menolak `action_id` di luar matriks dengan 422), jadi dialog
 * ini adalah satu-satunya tempat opsi itu ditentukan. Centang = pasang, bintang
 * = rekomendasi (ditampilkan sebagai chip "Direkomendasikan" + diurutkan paling
 * atas di dropdown reviewer).
 */
export function CategoryActionDialog({
  open,
  onOpenChange,
  category,
  actions,
  onSync,
}: CategoryActionDialogProps) {
  const [rows, setRows] = useState<RawCategoryAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Muat mapping terbaru setiap dialog dibuka — data induk bisa basi bila
  // master berubah di tab lain.
  useEffect(() => {
    if (!open || !category) return;
    const categoryId = category.id;
    let cancelled = false;
    // Async IIFE: `setLoading` sinkron di badan effect memicu
    // `react-hooks/set-state-in-effect`.
    void (async () => {
      setLoading(true);
      try {
        const result = await getCategoryActions(categoryId);
        if (cancelled) return;
        setRows(
          result.map((r) => ({
            categoryId: r.categoryId,
            actionId: r.actionId,
            isRecommended: r.isRecommended,
          }))
        );
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Gagal memuat mapping aksi.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, category]);

  if (!category) return null;

  const attached = new Map(rows.map((r) => [r.actionId, r]));

  const sync = (next: RawCategoryAction[]) => {
    setRows(next);
    onSync(category.id, next);
  };

  const toggleAttach = async (action: RawAction, attach: boolean) => {
    setBusyId(action.id);
    try {
      if (attach) {
        await attachCategoryAction(category.id, action.id, false);
        toast.success(`"${action.name}" dipasang ke ${category.name}.`);
        sync([...rows, { categoryId: category.id, actionId: action.id, isRecommended: false }]);
      } else {
        await detachCategoryAction(category.id, action.id);
        toast.success(`"${action.name}" dilepas dari ${category.name}.`);
        sync(rows.filter((r) => r.actionId !== action.id));
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Operasi gagal.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleRecommended = async (actionId: string, next: boolean) => {
    setBusyId(actionId);
    try {
      await updateCategoryAction(category.id, actionId, next);
      sync(rows.map((r) => (r.actionId === actionId ? { ...r, isRecommended: next } : r)));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Operasi gagal.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aksi untuk {category.name}</DialogTitle>
          <DialogDescription>
            Centang aksi yang boleh dipilih reviewer untuk kategori ini. Bintang menandai
            rekomendasi sistem.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner data-icon="inline-start" />
            Memuat mapping…
          </div>
        ) : actions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada master aksi. Tambahkan dulu di tab Aksi.
          </p>
        ) : (
          <div className="space-y-1.5">
            {actions.map((action) => {
              const row = attached.get(action.id);
              const busy = busyId === action.id;
              return (
                <div
                  key={action.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                    row && 'border-primary/40 bg-primary/5'
                  )}
                >
                  <Checkbox
                    checked={!!row}
                    disabled={busy || (!row && !action.isActive)}
                    onCheckedChange={(checked) => toggleAttach(action, checked === true)}
                    aria-label={`Pasang ${action.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className="truncate">{action.name}</span>
                      {!action.isActive && <DotChip dotClass="bg-muted-foreground">Nonaktif</DotChip>}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{action.code}</p>
                  </div>
                  {row && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleRecommended(action.id, !row.isRecommended)}
                      aria-label={
                        row.isRecommended ? 'Hapus rekomendasi' : 'Tandai sebagai rekomendasi'
                      }
                      title={row.isRecommended ? 'Hapus rekomendasi' : 'Tandai sebagai rekomendasi'}
                      className={cn(
                        'rounded-md p-1.5 transition-colors hover:bg-accent',
                        row.isRecommended ? 'text-amber-500' : 'text-muted-foreground/40'
                      )}
                    >
                      <Star className={cn('size-4', row.isRecommended && 'fill-amber-500')} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
