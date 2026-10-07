'use client';

import * as React from 'react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { RANGE_OPTIONS, type RangeKey } from './chart-range';

interface ChartCardProps {
  title: string;
  /** Kalimat deskriptif, biasanya menyebut periode aktif. */
  description: string;
  /** Tab range yang aktif. */
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Shell card untuk chart tren: judul + deskripsi periode di kiri, tab rentang
 * di kanan. Menggantikan pasangan dropdown (rentang + agregasi) yang tadinya
 * ada di setiap chart.
 */
export function ChartCard({
  title,
  description,
  range,
  onRangeChange,
  className,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn('gap-0 p-0', className)}>
      <CardHeader className="flex flex-col items-start justify-between gap-3 px-5 py-4 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>

        <Tabs
          value={range}
          onValueChange={(v) => onRangeChange((v ?? '90d') as RangeKey)}
          className="shrink-0"
        >
          <TabsList className="h-9">
            {RANGE_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="px-3">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>

      <div className="px-2 pb-3 sm:px-4">{children}</div>
    </Card>
  );
}