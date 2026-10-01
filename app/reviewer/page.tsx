'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { StatisticsCard } from '@/components/shared/StatisticsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Inbox, Clock, Send, XCircle, ArrowUpRight, RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api/fetch-wrapper';
import { toTicket } from '@/lib/api/tickets';
import type { Ticket } from '@/lib/types/ticket';

const ATTENTION_LIMIT = 5;
const ACTIVITY_LIMIT = 5;
const OPEN_SAMPLE_SIZE = 100;

interface TicketsPage {
  data: Ticket[];
  total: number;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Satu halaman tiket dengan filter apa pun — hanya `total` dan item
 * ter-parse yang dipakai. `per_page=1` untuk angka KPI (murah).
 */
async function fetchTicketsPage(params: Record<string, string>): Promise<TicketsPage> {
  const searchParams = new URLSearchParams(params);
  const res = await authenticatedFetch(`/api/auth/tickets?${searchParams.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      typeof record(payload).message === 'string' && record(payload).message
        ? String(record(payload).message)
        : 'Gagal memuat tiket dari server.';
    throw new Error(msg);
  }
  const body = record(payload);
  const items = Array.isArray(body.data) ? body.data : [];
  return {
    data: items.map(toTicket),
    total: typeof body.total === 'number' ? body.total : items.length,
  };
}

function ageInDays(createdAt: string): number {
  const time = new Date(createdAt).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function firstDayOfMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}-01`;
}

export default function ReviewerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [waitingApproverCount, setWaitingApproverCount] = useState<number | null>(null);
  const [forwardedCount, setForwardedCount] = useState<number | null>(null);
  const [rejectedCount, setRejectedCount] = useState<number | null>(null);
  const [attentionTickets, setAttentionTickets] = useState<Ticket[]>([]);
  const [myActivity, setMyActivity] = useState<Ticket[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          openRes,
          waitingRes,
          forwardedRes,
          rejectedRes,
          openSampleRes,
          activityRes,
        ] = await Promise.all([
          fetchTicketsPage({ status_code: 'OPEN', per_page: '1' }),
          fetchTicketsPage({ reviewed_by_me: 'true', status_code: 'PENDING_APPROVAL', per_page: '1' }),
          fetchTicketsPage({ reviewed_by_me: 'true', date_from: firstDayOfMonth(), per_page: '1' }),
          fetchTicketsPage({ reviewed_by_me: 'true', status_code: 'REJECTED', per_page: '1' }),
          fetchTicketsPage({ status_code: 'OPEN', per_page: String(OPEN_SAMPLE_SIZE) }),
          fetchTicketsPage({ reviewed_by_me: 'true', per_page: String(ACTIVITY_LIMIT) }),
        ]);
        if (cancelled) return;
        setOpenCount(openRes.total);
        setWaitingApproverCount(waitingRes.total);
        setForwardedCount(forwardedRes.total);
        setRejectedCount(rejectedRes.total);
        // Backend urut terbaru; OPEN terlama diambil client-side dari sampel.
        setAttentionTickets(
          [...openSampleRes.data]
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .slice(0, ATTENTION_LIMIT),
        );
        setMyActivity(activityRes.data.slice(0, ACTIVITY_LIMIT));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat dasbor.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const fmt = (v: number | null) => (v === null ? '…' : String(v));

  const stats = [
    { label: 'Tinjauan Awal', value: fmt(openCount), subtitle: 'Laporan menunggu review', icon: Inbox },
    { label: 'Menunggu Approver', value: fmt(waitingApproverCount), subtitle: 'Terusan saya diproses', icon: Clock },
    { label: 'Diteruskan Bulan Ini', value: fmt(forwardedCount), subtitle: 'Tiket saya teruskan', icon: Send },
    { label: 'Ditolak Saya', value: fmt(rejectedCount), subtitle: 'Laporan tidak valid', icon: XCircle },
  ];

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">Gagal memuat dasbor</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRetryKey((k) => k + 1)}
        >
          <RefreshCw data-icon="inline-start" />
          Coba lagi
        </Button>
      </div>
    );
  }

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
              <CardTitle>Perlu Tindakan Segera</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reviewer/tinjauan-awal">
                Lihat semua
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground animate-pulse">Memuat antrean…</p>
          ) : attentionTickets.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Tidak ada laporan menunggu tinjauan awal.</p>
          ) : (
            <>
              <div className="md:hidden border-t">
                {attentionTickets.map((ticket) => (
                  <div key={ticket.id} className="border-b last:border-0 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                        <p className="text-sm font-semibold line-clamp-2">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">SO: {ticket.soNumber ?? '-'}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <TypeBadge ticketType={ticket.ticketType} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {ticket.reporterName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {ticket.reporterName} · {ageInDays(ticket.createdAt)} hari
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={ticket.status} />
                      <Button size="sm" asChild className="h-7 text-xs px-3">
                        <Link href={`/reviewer/tiket/${ticket.id}`}>Tinjau</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-muted/50 px-6 py-3">ID Tiket</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Subjek</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Pelapor</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Umur</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                      <TableHead className="bg-muted/50 px-6 py-3">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attentionTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{ticket.id}</TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="max-w-[240px] space-y-0.5">
                            <p className="truncate text-sm font-medium">{ticket.subject}</p>
                            <p className="truncate text-xs text-muted-foreground">SO: {ticket.soNumber ?? '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs">
                                {ticket.reporterName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{ticket.reporterName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <TypeBadge ticketType={ticket.ticketType} />
                        </TableCell>
                        <TableCell className="px-6 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {ageInDays(ticket.createdAt)} hari
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <Button size="sm" asChild className="gap-1 text-xs">
                            <Link href={`/reviewer/tiket/${ticket.id}`}>
                              Tinjau
                              <ArrowUpRight className="size-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-full w-full gap-0 overflow-hidden p-0">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle>Aktivitas Saya</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reviewer/riwayat">
                Lihat semua
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground animate-pulse">Memuat aktivitas…</p>
          ) : myActivity.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Belum ada tiket yang Anda review.</p>
          ) : (
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-muted/50 px-6 py-3">ID Tiket</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Subjek</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Pelapor</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Tipe</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                    <TableHead className="bg-muted/50 px-6 py-3">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myActivity.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">{ticket.id}</TableCell>
                      <TableCell className="px-6 py-3">
                        <div className="max-w-[240px] space-y-0.5">
                          <p className="truncate text-sm font-medium">{ticket.subject}</p>
                          <p className="truncate text-xs text-muted-foreground">SO: {ticket.soNumber ?? '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3 text-sm">{ticket.reporterName}</TableCell>
                      <TableCell className="px-6 py-3">
                        <TypeBadge ticketType={ticket.ticketType} />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <Button size="sm" variant="outline" asChild className="gap-1 text-xs">
                          <Link href={`/reviewer/tiket/${ticket.id}`}>
                            Lihat
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && myActivity.length > 0 && (
            <div className="md:hidden border-t">
              {myActivity.map((ticket) => (
                <div key={ticket.id} className="border-b last:border-0 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
                      <p className="text-sm font-semibold line-clamp-2">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">{ticket.reporterName}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <TypeBadge ticketType={ticket.ticketType} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={ticket.status} />
                    <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                      <Link href={`/reviewer/tiket/${ticket.id}`}>Lihat</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
