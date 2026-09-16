import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowRight, FileText } from 'lucide-react';

export default function ReportSuccessPage() {
  return (
    <div className="min-h-svh flex flex-col bg-background">

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-6">
          {/* <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-8 w-8" />
          </div> */}

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Laporan Berhasil Terkirim!</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tiket Anda telah masuk ke antrean peninjauan internal BRTHub. Tim reviewer akan segera memproses penentuan prioritas dan unit terkait.
            </p>
          </div>

          {/* Ticket Preview Card */}
          <Card className="border text-left shadow-xs">
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2.5">
                <span className="text-muted-foreground">Nomor Tiket</span>
                <span className="font-bold text-primary">BRT-2026-0913-001</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2.5">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-[10px]">Open</Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Subjek</span>
                <p className="font-semibold text-foreground">Kekurangan pengiriman part Juken 5+ Vario 160</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button asChild variant="outline" className="h-10 text-sm">
              <Link href="/laporan">Lihat Laporan Saya</Link>
            </Button>
            <Button asChild className="h-10 text-sm">
              <Link href="/report/new">Kirim Laporan Lain</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
