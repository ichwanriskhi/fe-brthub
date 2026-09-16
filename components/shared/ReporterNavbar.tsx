'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { cn } from '@/lib/utils';
import { Bell, FilePlus2, Files, LogOut, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/report/new', label: 'Buat Laporan', icon: FilePlus2 },
  { href: '/laporan', label: 'Laporan Saya', icon: Files },
];

export function ReporterNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/report/new" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/logo/brt-logo.png"
            alt="BRT Trans Jateng"
            width={28}
            height={28}
            className="size-7 shrink-0 object-contain"
            priority
          />
          <span className="truncate text-[15px] font-semibold tracking-tight">BRTHub</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                className={cn('font-medium', active && 'bg-primary/10 text-primary')}
                asChild
              >
                <Link href={item.href}>
                  <item.icon data-icon="inline-start" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" size="icon-lg" className="relative">
            <Bell className="size-[1.2rem]" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
            <span className="sr-only">Notifikasi</span>
          </Button>
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="rounded-full" />}
            >
              <Avatar>
                <AvatarFallback>DP</AvatarFallback>
              </Avatar>
              <span className="sr-only">Menu profil</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-semibold">Dimas Pelapor</span>
                  <span className="block text-sm text-muted-foreground">081234567890</span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link href="/laporan" />}>
                  <Files />
                  <span>Laporan Saya</span>
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/report/new" />}>
                  <FilePlus2 />
                  <span>Buat Laporan</span>
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="#" />}>
                  <User />
                  <span>Profil</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    sessionStorage.removeItem('brt_user_phone');
                    router.push('/');
                  }}
                >
                  <LogOut />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Menu mobile: hanya ikon label ringkas */}
      <nav className="flex items-center gap-1 border-t px-4 py-2 md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn('flex-1 text-xs font-medium', active && 'bg-primary/10 text-primary')}
              asChild
            >
              <Link href={item.href}>
                <item.icon data-icon="inline-start" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
    </header>
  );
}
