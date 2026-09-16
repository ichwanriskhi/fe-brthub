import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowRight, FileText } from 'lucide-react';

export default function ReportSuccessPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
          <CheckCircle2 className="h-8 w-8" />
        </div> */}

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Laporan Berhasil Terkirim!</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tiket Anda telah masuk ke antrean peninjauan internal BRTHub. Tim reviewer akan segera memproses penentuan prioritas dan unit terkait.
          </p>
        </div>

        {/* Ticket Preview Card */}
        <Card className="border text-left shadow-xs">
          <CardContent className="space-y-3 p-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-muted-foreground">Nomor Tiket</span>
              <span className="font-bold text-primary">BRT-2026-0913-001</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary" className="bg-amber-50 text-[10px] text-amber-700">Open</Badge>
            </div>
            <div>
              <span className="mb-1 block text-muted-foreground">Subjek</span>
              <p className="font-semibold text-foreground">Kekurangan pengiriman part Juken 5+ Vario 160</p>
            </div>
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
