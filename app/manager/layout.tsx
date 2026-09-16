'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  FileCheck,
  Archive,
  LogOut,
  Settings,
  User,
  Bell,
} from 'lucide-react';
import { MOCK_TICKETS } from '@/lib/mock/data';
import { TopbarClock } from '@/components/shared/TopbarClock';
import { ModeToggle } from '@/components/shared/ModeToggle';

const NAV_GROUPS = [
  {
    label: 'Antrean Kerja',
    items: [
      { href: '/manager', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/manager/antrean', label: 'Antrean Penutupan', icon: FileCheck },
    ],
  },
  {
    label: 'Data',
    items: [{ href: '/manager/riwayat', label: 'Riwayat Penutupan', icon: Archive }],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  '/manager': 'Dashboard',
  '/manager/antrean': 'Antrean Penutupan',
  '/manager/riwayat': 'Riwayat Penutupan',
};

function ManagerBreadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean);
  const isTicketDetail = segments[1] === 'antrean' && segments.length >= 3;

  let crumbs: { href: string; label: string; isLast: boolean }[] = [];
  if (isTicketDetail) {
    crumbs = [
      { href: '/manager', label: 'Dashboard', isLast: false },
      { href: '/manager/antrean', label: 'Antrean Penutupan', isLast: false },
      { href: pathname, label: 'Detail Penutupan', isLast: true },
    ];
  } else {
    crumbs = [{ href: pathname, label: ROUTE_LABELS[pathname] ?? 'Dashboard', isLast: true }];
  }

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

function UserDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative rounded-full hover:bg-transparent" />}
      >
        <Avatar>
          <AvatarFallback>MS</AvatarFallback>
        </Avatar>
        <span className="absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2 ring-card" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-4 px-2 py-2.5 font-normal">
            <div className="relative">
              <Avatar className="size-10">
                <AvatarFallback>MS</AvatarFallback>
              </Avatar>
              <span className="absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2 ring-card" />
            </div>
            <div className="flex flex-1 flex-col items-start">
              <span className="text-base font-semibold">Manager System</span>
              <span className="text-sm text-muted-foreground">manager@brt.co.id</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
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
          <DropdownMenuItem variant="destructive" render={<Link href="/login" />}>
            <LogOut />
            <span>Keluar</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const isTicketDetail = segments[1] === 'antrean' && segments.length >= 3;

  const crumbsLastLabel = isTicketDetail
    ? 'Detail Penutupan'
    : ROUTE_LABELS[pathname] ?? 'Dashboard';

  const pendingCount = MOCK_TICKETS.filter(
    (t) => (t.status === 'IN_PROGRESS' || t.status === 'REWORK_REQUIRED') && 
            t.priority === 'B' && 
            t.resolutionSummary
  ).length;

  const counts: Record<string, number> = {
    '/manager/antrean': pendingCount,
  };

  return (
    <div className="flex h-svh w-full min-w-0 overflow-hidden">
      <SidebarProvider>
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
                  <div className="flex flex-col items-start">
                    <span className="text-lg font-semibold text-nowrap">BRTHub</span>
                    <span className="text-xs font-light text-nowrap">Approval & Ticketing System</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {NAV_GROUPS.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="text-sidebar-foreground/50 tracking-wider uppercase">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.href === '/manager' ? pathname === '/manager' : pathname.startsWith(item.href);
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={item.label}
                            className="data-active:bg-primary/10! data-active:text-primary!"
                            render={<Link href={item.href} />}
                          >
                            <Icon />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {counts[item.href] > 0 && (
                              <SidebarMenuBadge className="bg-primary/10 rounded-full px-1.5 font-normal">
                                {counts[item.href]}
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

        <SidebarInset className="flex min-h-0 flex-1 flex-col">
          <header className="bg-card z-50 shrink-0 border-b">
            <div className="mx-auto flex max-w-360 items-center justify-between gap-6 px-4 py-2 sm:px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="[&_svg]:size-5!" />
                <Separator orientation="vertical" className="hidden h-4! data-vertical:self-center sm:block" />
                <ManagerBreadcrumb pathname={pathname} />
                <span className="sm:hidden text-sm font-medium truncate">
                  {crumbsLastLabel}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="hidden md:block">
                  <TopbarClock />
                </div>
                <Button variant="ghost" size="icon-lg" className="relative">
                  <Bell className="size-[1.2rem]" />
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
                  <span className="sr-only">Notifikasi</span>
                </Button>
                <ModeToggle />
                <UserDropdown />
              </div>
            </div>
          </header>

          <main className="mx-auto size-full max-w-360 flex-1 overflow-y-auto px-4 py-6 sm:px-6">{children}</main>

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
