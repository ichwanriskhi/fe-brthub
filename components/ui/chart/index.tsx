'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface ChartConfig {
  [k: string]: {
    label?: string;
    icon?: React.ComponentType;
    color?: string | { light?: string; dark?: string };
  };
}

interface ChartContainerProps {
  children: React.ReactNode;
  config: ChartConfig;
  className?: string;
  /** @deprecated use className instead */
  style?: React.CSSProperties;
}

const defaultColors = [
  'var(--chart-1))',
  'var(--chart-2))',
  'var(--chart-3))',
  'var(--chart-4))',
  'var(--chart-5))',
];

function getChartColors(config: ChartConfig) {
  const colors: Record<string, string> = {};
  let i = 0;
  for (const key in config) {
    const entry = config[key];
    if (!entry.color) {
      colors[key] = defaultColors[i % defaultColors.length];
      i++;
    } else if (typeof entry.color === 'object') {
      // light/dark object not used in this simple implementation
      colors[key] = entry.color.light ?? defaultColors[i % defaultColors.length];
      i++;
    } else {
      colors[key] = entry.color;
    }
  }
  return colors;
}

export function ChartContainer({ children, config, className, style }: ChartContainerProps) {
  const colors = getChartColors(config);

  // Inject CSS variables for chart colors
  React.useEffect(() => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    return () => {
      Object.keys(colors).forEach((key) => {
        root.style.removeProperty(`--color-${key}`);
      });
    };
  }, [colors]);

  return (
    <div
      className={cn('flex aspect-auto w-full justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none', className)}
      style={style}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

type TooltipPayloadItem = Record<string, unknown> & {
  value: number | string;
  name: string;
  color: string;
  payload?: unknown;
  dataKey?: string;
};

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<TooltipPayloadItem>;
  label?: string;
  labelFormatter?: (value: string, payload: Array<TooltipPayloadItem>) => string;
  contentStyle?: React.CSSProperties;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'dot' | 'line' | 'dashed' | boolean;
  nameKey?: string;
  labelKey?: string;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  contentStyle,
  hideLabel,
  hideIndicator,
  indicator = 'dot',
  nameKey = 'name',
  labelKey = 'label',
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  const payloadItem = payload[0];
  const color = (payloadItem?.color as string) ?? 'var(--border))';
  const rawLabel = labelFormatter
    ? labelFormatter(label ?? '', payload)
    : label ?? (payloadItem?.[labelKey] as string) ?? '';

  const formattedLabel: string = typeof rawLabel === 'string' ? rawLabel : String(rawLabel ?? '');

  return (
    <div
      className={cn(
        'grid min-w-[8rem] gap-1 rounded-md border bg-background p-2.5 shadow-md',
        'dark:border',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
      )}
      style={contentStyle}
    >
      {!hideLabel && formattedLabel && (
        <div className="text-sm font-medium text-foreground">{formattedLabel}</div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-1.5">
            {!hideIndicator && indicator && (
              <div
                className={cn(
                  'size-2 rounded-full',
                  indicator === 'line' ? 'w-3 h-0.5' : 'size-2',
                  indicator === 'dashed' ? 'w-3 h-0.5 border-t-[2px] border-dashed' : ''
                )}
                style={{ backgroundColor: color }}
              />
            )}
            <span className="text-xs font-medium text-foreground">
              {String(item[nameKey] ?? (item.payload as Record<string, unknown>)?.[nameKey] ?? item.dataKey ?? 'Value')}
            </span>
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChartLegendContentProps {
  nameKey?: string;
  dataKey?: string;
  payload?: Array<Record<string, unknown> & {
    value: number | string;
    color: string;
    name: string;
  }>;
}

export function ChartLegendContent({
  nameKey = 'name',
  dataKey = 'color',
  payload,
}: ChartLegendContentProps) {
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {payload.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: (item[dataKey] as string) ?? item.color }}
          />
          <span className="text-sm text-foreground">{String(item[nameKey] ?? item.name)}</span>
        </div>
      ))}
    </div>
  );
}

interface ChartTooltipProps {
  content?: React.ReactNode;
  cursor?: boolean | React.ReactNode;
  formatter?: (value: number, name: string) => [number, string];
  labelFormatter?: (value: string) => string;
}

export function ChartTooltip({
  content,
  cursor = false,
  formatter,
  labelFormatter,
}: ChartTooltipProps) {
  // Cast ke recharts TooltipProps — wrapper ini hanya untuk compat shadcn API
  return <Tooltip {...({ content: content ?? undefined, cursor: cursor ?? undefined, formatter, labelFormatter } as Record<string, unknown>)} />;
}