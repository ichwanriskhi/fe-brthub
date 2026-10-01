'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';
import type { TicketActivityEntry } from '@/lib/types/ticket';
import { cn } from '@/lib/utils';

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

function dotClass(type: string): string {
  if (TERMINAL_TYPES.includes(type)) return 'bg-emerald-500';
  if (ATTENTION_TYPES.includes(type)) return 'bg-amber-500';
  if (type === 'CREATED') return 'bg-sky-500';
  return 'bg-primary';
}

/**
 * Timeline kronologis sistem (pembuatan → penutupan).
 * Sengaja berbeda visual dari chat/percakapan: tanpa bubble, penanda titik.
 */
export function TicketTimeline({ activities }: { activities?: TicketActivityEntry[] }) {
  const items = [...(activities ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4 text-muted-foreground" />
          Timeline Tiket
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Belum ada aktivitas tercatat.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l pl-5 pt-1">
            {items.map((item) => (
              <li key={item.id} className="relative text-xs">
                <span
                  className={cn(
                    'absolute -left-[25px] top-0.5 size-2.5 rounded-full ring-4 ring-card',
                    dotClass(item.activityType),
                  )}
                />
                <p className="font-medium text-foreground">{item.description}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {item.actorName ? `${item.actorName} · ` : ''}
                  {formatTimestamp(item.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
