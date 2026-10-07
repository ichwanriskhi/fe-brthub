'use client';

import { useState, useEffect } from 'react';
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';
import { authServiceClient } from '@/lib/api/auth-service';
import { Bell, FilePlus2, Files, LogOut, User } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
}

const NAV_ITEMS = [
  { href: '/report/new', label: 'Buat Laporan', icon: FilePlus2 },
  { href: '/laporan',    label: 'Laporan Saya',  icon: Files },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

export function ReporterNavbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Read user profile from localStorage (written after OTP verify)
  useEffect(() => {
    const raw = localStorage.getItem('user_profile');
    if (raw) {
      try { setProfile(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  const displayName    = profile?.full_name   || 'Pengguna';
  const displayContact = profile?.email       || profile?.phone_number || '';
  const initials       = getInitials(displayName);

  const handleLogout = async () => {
    setConfirmOpen(false);
    const token = localStorage.getItem('auth_token');

    // Revoke the Auth Service token (best-effort) and clear the reporter
    // session cookie so the proxy locks the protected pages again.
    if (token) {
      authServiceClient.logout(token).catch(() => {});
    }
    fetch('/api/session', { method: 'DELETE' }).catch(() => {});

    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    sessionStorage.removeItem('reporter_data');
    router.push('/verifikasi');
  };

  return (
    <>
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
          <Button variant="ghost" size="icon-lg" className="relative" aria-label="Notifikasi">
            <Bell />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
          </Button>
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu profil" />}
            >
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-semibold">{displayName}</span>
                  {displayContact && (
                    <span className="block text-xs text-muted-foreground truncate">{displayContact}</span>
                  )}
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
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                  <LogOut />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 border-t px-4 py-2 md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn('flex-1', active && 'bg-primary/10 text-primary')}
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
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      variant="destructive"
      title="Keluar dari BRTHub?"
      description="Sesi laporan Anda akan diakhiri. Anda perlu verifikasi ulang untuk membuat laporan baru."
      confirmLabel="Ya, Keluar"
      onConfirm={handleLogout}
    />
    </>
  );
}
