'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatisticsCardProps = {
  label: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  className?: string;
};

/**
 * Kartu KPI: label muted, nilai besar, dan subtitle muted. Warna memakai token
 * semantik (`muted-foreground`, `muted`, `foreground`) supaya ikut mode
 * terang/gelap dan konsisten dengan komponen lain. Aksen merah disimpan untuk
 * kondisi yang butuh perhatian, bukan untuk setiap kartu.
 */
export function StatisticsCard({
  label,
  value,
  subtitle,
  icon: Icon,
  className,
}: StatisticsCardProps) {
  return (
    <Card className={cn('gap-0 rounded-xl p-0 shadow-none', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-normal text-muted-foreground">{label}</p>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>

        <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>

        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}