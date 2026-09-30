'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  LayoutDashboard,
  Tags,
  Users,
  ContactRound,
  MonitorCog,
  BadgeCheck,
  Package,
} from 'lucide-react';
import { AppLayout, type NavGroup } from '@/components/shared/AppLayout';
import { AuthGuard } from '@/lib/auth/auth-guard';

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Manajemen',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/master-data', label: 'Master Data', icon: Tags },
      { href: '/admin/pegawai', label: 'Pegawai', icon: Users },
      { href: '/admin/pelanggan', label: 'Pelanggan', icon: ContactRound },
    ],
  },
  {
    label: 'Tiket',
    items: [
      // { href: '/admin/ticket/action', label: 'Perlu Tindakan', icon: BadgeCheck },
      { href: '/admin/ticket/monitoring', label: 'Monitoring Tiket', icon: MonitorCog },
      { href: '/admin/ticket/history', label: 'Riwayat Tiket', icon: Package },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/master-data': 'Master Data',
  '/admin/pegawai': 'Pegawai',
  '/admin/pelanggan': 'Pelanggan',
  // '/admin/ticket/action': 'Perlu Tindakan',
  '/admin/ticket/monitoring': 'Monitoring Tiket',
  '/admin/ticket/history': 'Riwayat Tiket',
};

// ─── Custom breadcrumb ────────────────────────────────────────────────────────

function AdminBreadcrumb({ pathname }: { pathname: string }) {
  const segs = pathname.split('/').filter(Boolean);
  const ticketSub = segs[1] === 'ticket' ? segs[2] : null;
  const isDetail = ticketSub && segs.length >= 4;

  const parentLabel: Record<string, string> = {
    action: 'Perlu Tindakan',
    monitoring: 'Monitoring Tiket',
    history: 'Riwayat Tiket',
  };
  const parentHref: Record<string, string> = {
    action: '/admin/ticket/action',
    monitoring: '/admin/ticket/monitoring',
    history: '/admin/ticket/history',
  };

  let crumbs: { href: string; label: string; isLast: boolean }[];
  if (isDetail && ticketSub) {
    crumbs = [
      { href: '/admin', label: 'Dashboard', isLast: false },
      {
        href: parentHref[ticketSub] ?? '/admin',
        label: parentLabel[ticketSub] ?? 'Tiket',
        isLast: false,
      },
      { href: pathname, label: 'Detail Tiket', isLast: true },
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

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="admin">
      <AppLayout
        navGroups={NAV_GROUPS}
        routeLabels={ROUTE_LABELS}
        badgeCounts={{}}
        rootHref="/admin"
        renderBreadcrumb={(p) => <AdminBreadcrumb pathname={p} />}
      >
        {children}
      </AppLayout>
    </AuthGuard>
  );
}