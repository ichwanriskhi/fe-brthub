'use client';

import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';

export function TopbarClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div className="h-4 w-40" aria-hidden />;
  }

  const time = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const date = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{date}</span>
      <Separator orientation="vertical" className="h-4" />
      <span className="font-medium tabular-nums">{time}</span>
    </div>
  );
}
