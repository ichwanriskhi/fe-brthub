'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { ArrowRight } from 'lucide-react';

const STEPS = [
  {
    title: 'Pelaporan & verifikasi',
    body: 'Pelapor memasukkan nomor HP, menerima kode OTP, lalu mengisi detail kendala beserta lampiran pendukung. Tidak perlu membuat akun.',
  },
  {
    title: 'Tinjauan awal',
    body: 'Reviewer memeriksa kelengkapan laporan, menyempurnakan kategori dan subkategori, lalu menetapkan prioritas serta unit yang menangani.',
  },
  {
    title: 'Penanganan unit',
    body: 'Unit terkait mengerjakan perbaikan di lapangan, mengunggah bukti penanganan, dan mencatat tindakan yang dilakukan pada tiket.',
  },
  {
    title: 'Tinjauan akhir',
    body: 'Reviewer menilai hasil penanganan. Tiket ditutup bila sesuai, atau dikembalikan ke unit bila masih perlu perbaikan.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background font-sans text-foreground antialiased">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo/brt-logo.png"
              alt="Bintang Racing Team"
              width={28}
              height={28}
              className="size-7 shrink-0 object-contain"
              priority
            />
            <span className="truncate text-[15px] font-semibold tracking-tight">BRTHub</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <ModeToggle />
            <Button variant="ghost" size="sm" className="hidden font-medium sm:inline-flex" asChild>
              <Link href="/login">Masuk Pegawai</Link>
            </Button>
            <Button size="sm" className="font-medium" asChild>
              <Link href="/verifikasi">
                <span className="sm:hidden">Lapor</span>
                <span className="hidden sm:inline">Lapor Gangguan</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24">
          <p className="text-sm font-medium tracking-wide text-muted-foreground">Bintang Racing Team</p>
          <h1 className="mt-3 max-w-[22ch] text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[2.75rem]">
            Laporan gangguan dan layanan.
          </h1>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">
            BRTHub mencatat setiap laporan kendala dan layanan secara resmi. Alur tinjauan memastikan laporan diteruskan ke unit yang tepat dan hasil penanganannya dapat ditelusuri.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" className="font-medium" asChild><Link href="/verifikasi">Buat Laporan
              <ArrowRight data-icon="inline-end" /></Link></Button>
            <Button size="lg" variant="outline" className="font-medium" asChild><Link href="/login">Masuk sebagai Pegawai</Link></Button>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Cara penanganan laporan</h2>
            <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">
              Empat tahap tetap, sama untuk semua kategori laporan. Posisi laporan dapat diikuti pada setiap tahapnya.
            </p>

            <ol className="mt-12 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => (
                <li key={step.title} className="border-t border-border pt-5">
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* <section className="border-t">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Riwayat laporan tersimpan utuh</h2>
              <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
                Perubahan data dan setiap versi penanganan direkam, sehingga penelusuran dan audit laporan tidak bergantung
                pada salinan manual.
              </p>
            </div>
            <Button className="shrink-0 font-medium" asChild><Link href="/laporan">Lihat laporan publik</Link></Button>
          </div>
        </section> */}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Bintang Racing Team</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/verifikasi" className="transition-colors hover:text-foreground">
              Lapor Gangguan
            </Link>
            <Link href="/laporan" className="transition-colors hover:text-foreground">
              Laporan Publik
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Masuk Pegawai
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
