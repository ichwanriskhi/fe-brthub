import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu, FileText, ArrowRight, UserCheck } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FE0100] text-white font-bold text-lg shadow-sm">
            B
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-none text-foreground tracking-tight">
              BRTHub
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Bintang Racing Team
            </span>
          </div>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="#tentang" className="hover:text-foreground transition-colors">
            Tentang
          </Link>
          <Link href="#fitur" className="hover:text-foreground transition-colors">
            Fitur
          </Link>
          <Link href="#kategori" className="hover:text-foreground transition-colors">
            Kategori
          </Link>
          <Link href="#alur" className="hover:text-foreground transition-colors">
            Alur Pelaporan
          </Link>
          <Link href="#faq" className="hover:text-foreground transition-colors">
            FAQ
          </Link>
        </nav>

        {/* CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Masuk Internal</Link>
          </Button>
          <Button asChild size="sm" className="bg-[#FE0100] hover:bg-[#D00100] text-white font-medium">
            <Link href="/report/new" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Buat Laporan
            </Link>
          </Button>
        </div>

        {/* Mobile Sheet Nav */}
        <div className="flex md:hidden items-center gap-2">
          <Button asChild size="sm" className="bg-[#FE0100] text-white text-xs px-3 h-8">
            <Link href="/report/new">Buat Laporan</Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-[#FE0100] text-white font-bold text-sm">
                    B
                  </div>
                  BRTHub Mobile
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 py-6">
                <Link href="#tentang" className="text-sm font-medium hover:text-[#FE0100]">
                  Tentang Aplikasi
                </Link>
                <Link href="#fitur" className="text-sm font-medium hover:text-[#FE0100]">
                  Fitur Unggulan
                </Link>
                <Link href="#kategori" className="text-sm font-medium hover:text-[#FE0100]">
                  Kategori Tiket
                </Link>
                <Link href="#alur" className="text-sm font-medium hover:text-[#FE0100]">
                  Alur Pelaporan
                </Link>
                <Link href="#faq" className="text-sm font-medium hover:text-[#FE0100]">
                  Pertanyaan Sering Diajukan (FAQ)
                </Link>
                <hr className="my-2" />
                <Button asChild className="bg-[#FE0100] hover:bg-[#D00100] text-white w-full justify-start">
                  <Link href="/report/new">
                    <FileText className="mr-2 h-4 w-4" />
                    Buat Laporan Baru
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/laporan">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Lihat Laporan Saya
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href="/login">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Login Internal (Reviewer)
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
