import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 text-muted-foreground text-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-[#FE0100] text-white font-bold text-sm">
                B
              </div>
              <span className="font-bold text-foreground text-base">BRTHub</span>
            </div>
            <p className="max-w-sm text-xs leading-relaxed">
              Sistem terpusat pelaporan tiket & manajemen kasus PT Bintang Racing Team (BRT). Mempermudah penanganan keluhan, kendala teknis, klaim barang, dan pengajuan layanan internal.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs tracking-wider uppercase">Tautan Cepat</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/report/new" className="hover:text-foreground">Buat Laporan</Link></li>
              <li><Link href="/laporan" className="hover:text-foreground">Cek Status Laporan</Link></li>
              <li><Link href="/login" className="hover:text-foreground">Login Staf Internal</Link></li>
              <li><Link href="/reviewer" className="hover:text-foreground">Dashboard Reviewer</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs tracking-wider uppercase">Alamat & Kontak</h4>
            <p className="text-xs leading-relaxed space-y-1">
              <span>PT Bintang Racing Team</span><br />
              <span>Jl. Raya Mayor Oking No. 35, Cibinong, Bogor, Jawa Barat</span><br />
              <span className="font-medium text-foreground">Hotline: (021) 8790-8888</span>
            </p>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} PT Bintang Racing Team (BRT). All rights reserved. BRTHub v2.
        </div>
      </div>
    </footer>
  );
}
