'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TicketActivityEntry } from '@/lib/types/ticket';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

function formatTimestamp(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TERMINAL_TYPES = ['APPROVED_FINAL', 'REVIEW_REJECTED', 'REJECTED_INITIAL'];
const ATTENTION_TYPES = ['REWORK_REQUESTED', 'REVIEW_REWORK', 'REJECTED_INITIAL', 'REVIEW_REJECTED'];

/** Batas baris timeline sebelum show-more — berlaku ke semua 6 pemakai. */
const TIMELINE_LIMIT = 5;

function dotClass(type: string): string {
  if (TERMINAL_TYPES.includes(type)) return 'bg-emerald-500';
  if (ATTENTION_TYPES.includes(type)) return 'bg-amber-500';
  if (type === 'CREATED') return 'bg-sky-500';
  return 'bg-primary';
}

/**
 * Timeline kronologis sistem (pembuatan → penutupan).
 * Sengaja berbeda visual dari chat/percakapan: tanpa bubble, penanda titik.
 *
 * Isinya **kejadian**, bukan isi. Entri `PROGRESS` hanya berbunyi "Progres
 * pengerjaan ditambahkan." — catatan handler yang lengkap ada di card Riwayat
 * Progres, jadi timeline tidak perlu menyimpannya (dulu ia menyimpan cuplikan
 * 120 karakter tanpa lampiran, yang hasilnya lebih buruk dari card aslinya).
 */
export function TicketTimeline({
  activities,
  description = 'Kronologi perubahan status tiket oleh sistem.',
}: {
  activities?: TicketActivityEntry[];
  description?: string;
}) {
  const [showAll, setShowAll] = useState(false);

  const items = [...(activities ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Tertua dulu — yang disembunyikan adalah entri terbaru (biasanya progres
  // berulang), bukan asal-usul tiket. Pola sama dengan show-more progres di
  // `laporan/[id]` dan halaman handler.
  const visibleItems = showAll ? items : items.slice(0, TIMELINE_LIMIT);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Timeline Tiket</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
        ) : (
          <>
            <ol className="relative space-y-4 border-l pl-5">
              {visibleItems.map((item) => (
                <li key={item.id} className="relative">
                  <span
                    className={cn(
                      'absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-card',
                      dotClass(item.activityType),
                    )}
                  />
                  <p className="text-sm font-medium text-foreground">{item.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.actorName ? `${item.actorName} · ` : ''}
                    {formatTimestamp(item.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
            {hiddenCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full border-dashed"
                onClick={() => setShowAll(true)}
              >
                <ChevronDown data-icon="inline-start" />
                Tampilkan {hiddenCount} aktivitas lainnya
              </Button>
            )}
            {showAll && items.length > TIMELINE_LIMIT && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-muted-foreground"
                onClick={() => setShowAll(false)}
              >
                <ChevronUp data-icon="inline-start" />
                Sembunyikan
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
