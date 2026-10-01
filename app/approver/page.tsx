'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApprovals } from '@/lib/api/tickets';
import type { Ticket } from '@/lib/types/ticket';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, CheckSquare, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';

export default function ApproverDashboardPage() {
  const [initial, setInitial] = useState<Ticket[]>([]);
  const [final, setFinal] = useState<Ticket[]>([]);
  const [history, setHistory] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getApprovals('INITIAL', 1),
      getApprovals('FINAL', 1),
      getApprovals('HISTORY', 1),
    ])
      .then(([init, fin, hist]) => {
        if (cancelled) return;
        setInitial(init.data);
        setFinal(fin.data);
        setHistory(hist.data);
      })
      .catch((error) => {
        console.error('Error loading approver dashboard:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rejectedCount = history.filter((t) => t.status === 'REJECTED' || t.status === 'REWORK_REQUIRED').length;
  const closedCount = history.filter((t) => t.status === 'CLOSED').length;

  const stats = [
    {
      label: 'Persetujuan Tiket',
      value: String(initial.length),
      subtitle: 'Menunggu persetujuan awal',
      icon: ClipboardCheck,
    },
    {
      label: 'Persetujuan Penutupan',
      value: String(final.length),
      subtitle: 'Menunggu persetujuan resolusi',
      icon: CheckSquare,
    },
    {
      label: 'Selesai',
      value: String(closedCount),
      subtitle: 'Tiket yang Anda setujui penutupannya',
      icon: CheckCircle2,
      showTrend: true,
    },
    {
      label: 'Ditolak / Revisi',
      value: String(rejectedCount),
      subtitle: 'Anda tolak atau minta revisi',
      icon: XCircle,
    },
  ];

  const urgentQueue = [...initial, ...final].slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {stats.map((s) => (
          <StatisticsCard key={s.label} {...s} />
        ))}
      </div>

      <Card className="col-span-full w-full gap-0 overflow-hidden p-0">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle>Perlu Persetujuan Segera</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/approver/persetujuan-tiket">
                Lihat semua
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground animate-pulse">
              Memuat antrean persetujuan...
            </div>
          ) : urgentQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <ClipboardCheck className="size-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">Antrean bersih</p>
              <p className="text-xs text-muted-foreground">
                Semua tiket yang memerlukan persetujuan Anda sudah diproses.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 px-6 py-3">ID Tiket</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Subjek</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Tahap</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                  <TableHead className="bg-muted/50 px-6 py-3 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urgentQueue.map((ticket) => {
                  const isFinal = final.some((t) => t.id === ticket.id);
                  const href = isFinal
                    ? `/approver/persetujuan-penutupan/${ticket.id}`
                    : `/approver/persetujuan-tiket/${ticket.id}`;

                  return (
                    <TableRow key={ticket.id}>
                      <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {ticket.id}
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="max-w-[280px] space-y-0.5">
                          <p className="truncate text-sm font-medium" title={ticket.subject}>
                            {ticket.subject}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">SO: {ticket.soNumber ?? '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <span className="text-xs font-medium text-muted-foreground">
                          {isFinal ? 'Penutupan' : 'Awal'}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <TypeBadge ticketType={ticket.ticketType} />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="px-6 py-3 text-right">
                        <Button size="sm" asChild className="gap-1 text-xs">
                          <Link href={href}>
                            Tinjau
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
