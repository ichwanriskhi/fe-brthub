'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Bell, Repeat } from 'lucide-react';
import { TopbarClock } from '@/components/shared/TopbarClock';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { defaultRole } from '@/lib/api/brthub-api';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface AppLayoutProps {
  children: React.ReactNode;
  navGroups: NavGroup[];
  /** Maps href → breadcrumb label. */
  routeLabels: Record<string, string>;
  /**
   * Optional function that computes badge counts keyed by href.
   * Return an empty object or undefined to show no badges.
   */
  badgeCounts?: Record<string, number>;
  /**
   * The root href of this role section (e.g. '/reviewer').
   * Used so the root nav item only activates on exact match.
   */
  rootHref: string;
  /**
   * Optional custom breadcrumb logic. If omitted, a generic breadcrumb is
   * rendered from routeLabels.
   */
  /**
   * Parameter kedua berisi query string aktif.
   *
   * `usePathname()` tidak menyertakan query string, padahal beberapa halaman
   * list menunjuk ke route detail yang sama dari daftar berbeda dan menandainya
   * lewat `?from=`. Tanpa parameter ini, breadcrumb tidak bisa tahu asal
   * pengguna dan selalu menunjuk ke satu daftar yang sama.
   */
  renderBreadcrumb?: (pathname: string, searchParams: URLSearchParams) => React.ReactNode;
}

// ─── ProfileDropdown ─────────────────────────────────────────────────────────

function ProfileDropdown() {
  const { user, initials, logout, availableRoles, activeRole, setActiveRole } = useAuth();

  const ROLE_LABELS: Record<string, string> = {
    reviewer: 'Reviewer',
    handler: 'Handler',
    unit: 'Unit Teknis',
    approver: 'Approver',
    admin: 'Administrator',
  };
  // Satu-satunya fallback memakai urutan prioritas yang sama dengan redirect,
  // dan hanya bila role tersimpan tidak lagi dimiliki user.
  const primaryRole =
    activeRole && availableRoles.includes(activeRole)
      ? activeRole
      : defaultRole(availableRoles) ?? '';
  const roleLabel = ROLE_LABELS[primaryRole] || primaryRole;
  const switchableRoles = availableRoles.filter((r) => r !== primaryRole);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      toast.error('Gagal keluar. Silakan coba lagi.');
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative rounded-full hover:bg-transparent" aria-label="Menu akun" />}
      >
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2 ring-card" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-4 px-2 py-2.5 font-normal">
            <div className="relative">
              <Avatar className="size-10">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2 ring-card" />
            </div>
            <div className="flex flex-1 flex-col items-start min-w-0">
              <span className="text-base font-semibold truncate w-full">
                {user?.full_name ?? 'Pengguna'}
              </span>
              <span className="text-sm text-muted-foreground truncate w-full mb-1">
                {user?.email ?? user?.phone_number ?? ''}
              </span>
              {roleLabel && (
                <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {roleLabel}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        {switchableRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                Ganti Peran
              </DropdownMenuLabel>
              {switchableRoles.map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => setActiveRole(role)}
                >
                  <Repeat />
                  <span>{ROLE_LABELS[role] ?? role}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="#" />}>
            <User />
            <span>Profil Saya</span>
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="#" />}>
            <Settings />
            <span>Pengaturan</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <LogOut />
            <span>Keluar</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      variant="destructive"
      title="Keluar dari BRTHub?"
      description="Sesi kerja Anda akan diakhiri. Anda perlu login kembali untuk mengakses dashboard."
      confirmLabel="Ya, Keluar"
      loading={loggingOut}
      onConfirm={handleLogout}
    />
    </>
  );
}

// ─── Generic breadcrumb ───────────────────────────────────────────────────────

function GenericBreadcrumb({
  pathname,
  routeLabels,
}: {
  pathname: string;
  routeLabels: Record<string, string>;
}) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = routeLabels[href] ?? (i === segments.length - 1 ? 'Detail' : seg);
    return { href, label, isLast: i === segments.length - 1 };
  });

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb.href}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

export function AppLayout({
  children,
  navGroups,
  routeLabels,
  badgeCounts = {},
  rootHref,
  renderBreadcrumb,
}: AppLayoutProps) {
  const pathname = usePathname();
  // Query string aktif, diteruskan ke `renderBreadcrumb` supaya breadcrumb bisa
  // tahu dari daftar mana pengguna datang (`?from=`). `usePathname()` sendiri
  // tidak memuat query string.
  const searchParams = useSearchParams();

  // Mobile topbar label = last breadcrumb item
  const segments = pathname.split('/').filter(Boolean);
  const lastHref = '/' + segments.join('/');
  const mobileTitleLabel = routeLabels[lastHref] ?? routeLabels[pathname] ?? 'Dashboard';

  return (
    <div className="flex h-svh w-full min-w-0 overflow-hidden">
      <SidebarProvider>
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  className="gap-2.5 bg-transparent! p-1.5!"
                  render={<Link href="/" />}
                >
                  <div className="bg-muted flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border p-1">
                    <Image
                      src="/logo/brt-logo.png"
                      alt="BRT"
                      width={32}
                      height={32}
                      className="size-full object-contain"
                    />
                  </div>
                  <span className="text-base font-semibold text-nowrap">BRTHub</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.href === rootHref
                          ? pathname === rootHref
                          : pathname.startsWith(item.href);
                      const count = badgeCounts[item.href] ?? 0;
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={item.label}
                            render={<Link href={item.href} />}
                          >
                            <Icon />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {count > 0 && (
                              <SidebarMenuBadge className="rounded-full bg-muted px-1.5 font-normal group-data-active/menu-button:bg-primary/10">
                                {count}
                              </SidebarMenuBadge>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>

        {/* ── Main content ────────────────────────────────────────── */}
        <SidebarInset className="flex min-h-0 flex-1 flex-col">
          <header className="bg-card z-50 shrink-0 border-b">
            <div className="mx-auto flex max-w-360 items-center justify-between gap-6 px-4 py-2 sm:px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="[&_svg]:size-5!" />
                <Separator
                  orientation="vertical"
                  className="hidden h-4! data-vertical:self-center sm:block"
                />
                {renderBreadcrumb ? (
                  renderBreadcrumb(pathname, searchParams)
                ) : (
                  <GenericBreadcrumb pathname={pathname} routeLabels={routeLabels} />
                )}
                <span className="sm:hidden text-sm font-medium truncate">
                  {mobileTitleLabel}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="hidden md:block">
                  <TopbarClock />
                </div>
                <Button variant="ghost" size="icon-lg" className="relative" aria-label="Notifikasi">
                  <Bell />
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
                </Button>
                <ModeToggle />
                <ProfileDropdown />
              </div>
            </div>
          </header>

          <main className="mx-auto size-full max-w-360 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {children}
          </main>

          <footer className="shrink-0">
            <div className="text-muted-foreground mx-auto flex size-full max-w-360 items-center justify-between gap-3 px-4 py-3 max-sm:flex-col sm:gap-6 sm:px-6">
              <p className="text-sm text-balance max-sm:text-center">
                ©{new Date().getFullYear()} Bintang Racing Team. All rights reserved.
              </p>
            </div>
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
