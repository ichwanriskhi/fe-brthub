'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { SuccessAnimation } from '@/components/shared/SuccessAnimation';

interface TicketData {
  id: number;
  ticket_no: string;
  subject: string;
  description?: string;
  category?: {
    id: number;
    name: string;
  };
  status?: {
    id: number;
    code: string;
    name: string;
  };
  created_at?: string;
}

function ReportSuccessContent() {
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('ticket_id');
  const ticketNoParam = searchParams.get('ticket_no');

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

  useEffect(() => {
    const fetchTicket = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const targetId = ticketId || ticketNoParam;

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        if (targetId) {
          // Fetch specific ticket by ID or ticket_no
          const res = await fetch(`${API_URL}/api/auth/tickets/${targetId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });
          if (res.ok) {
            const data = await res.json();
            setTicket(data);
          }
        } else {
          // If no query params, fallback to user's latest ticket
          const res = await fetch(`${API_URL}/api/auth/tickets`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });
          if (res.ok) {
            const json = await res.json();
            const list = json.data?.data || json.data || (Array.isArray(json) ? json : []);
            if (Array.isArray(list) && list.length > 0) {
              setTicket(list[0]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load ticket:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId, ticketNoParam, API_URL]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-4 text-center">
        {/* Lottie Success Animation */}
        <SuccessAnimation />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Laporan Berhasil Terkirim!</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tiket Anda telah masuk ke antrean peninjauan internal BRTHub. Tim reviewer akan segera memproses penentuan prioritas dan unit terkait.
          </p>
        </div>

        {/* Ticket Preview Card */}
        <Card className="border text-left shadow-xs">
          <CardContent className="space-y-3 p-4 text-xs">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                <span>Memuat data tiket...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b pb-2.5">
                  <span className="text-muted-foreground">Nomor Tiket</span>
                  <span className="font-bold text-primary font-mono">
                    {ticket?.ticket_no || ticketNoParam || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-2.5">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="bg-amber-50 text-[10px] text-amber-700">
                    {ticket?.status?.name || 'Buka (Open)'}
                  </Badge>
                </div>
                {ticket?.category?.name && (
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <span className="text-muted-foreground">Kategori</span>
                    <span className="font-medium text-foreground">{ticket.category.name}</span>
                  </div>
                )}
                <div>
                  <span className="mb-1 block text-muted-foreground">Subjek</span>
                  <p className="font-semibold text-foreground">
                    {ticket?.subject || 'Laporan baru'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" className="h-10 text-sm">
            <Link href="/laporan">Lihat Laporan Saya</Link>
          </Button>
          <Button asChild className="h-10 text-sm">
            <Link href="/report/new">Kirim Laporan Lain</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReportSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ReportSuccessContent />
    </Suspense>
  );
}
