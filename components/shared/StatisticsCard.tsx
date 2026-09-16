'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatisticsCardProps = {
  label: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  showTrend?: boolean;
  className?: string;
};

export function StatisticsCard({
  label,
  value,
  subtitle,
  icon: Icon,
  showTrend = false,
  className,
}: StatisticsCardProps) {
  return (
    <Card
      className={cn(
        'gap-0 rounded-xl p-0 shadow-none',
        className
      )}
    >
      <CardContent className="p-4">
        {/* Row: Label + Icon */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-normal text-gray-500 dark:text-gray-400">{label}</p>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
        </div>

        {/* Value */}
        <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>

        {/* Subtitle / Trend */}
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {showTrend && <span className="mr-1 text-gray-500 dark:text-gray-400">↑</span>}
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}