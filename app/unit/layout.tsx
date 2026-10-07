'use client';

import * as React from 'react';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import {
  LayoutDashboard,
  Inbox,
  History,
} from 'lucide-react';
import { AppLayout, type NavGroup } from '@/components/shared/AppLayout';
import { AuthGuard } from '@/lib/auth/auth-guard';

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operasi Kasus',
    items: [
      { href: '/unit', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/unit/antrean', label: 'Antrean Penugasan', icon: Inbox },
      { href: '/unit/riwayat', label: 'Riwayat Penugasan', icon: History },
    ],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  '/unit': 'Dashboard',
  '/unit/antrean': 'Antrean Penugasan',
  '/unit/riwayat': 'Riwayat Penugasan',
};

/** Asal daftar untuk detail tiket, dibaca dari `?from=`. */
const UNIT_TICKET_ORIGINS: Record<string, string> = {
  antrean: '/unit/antrean',
  riwayat: '/unit/riwayat',
};

function UnitBreadcrumb({
  pathname,
  searchParams,
}: {
  pathname: string;
  searchParams: URLSearchParams;
}) {
  const segments = pathname.split('/').filter(Boolean);
  const isTicketDetail = segments[1] === 'tiket' && segments.length >= 3;

  let crumbs: { href: string; label: string; isLast: boolean }[] = [];
  if (isTicketDetail) {
    const origin =
      UNIT_TICKET_ORIGINS[searchParams.get('from') ?? ''] ?? UNIT_TICKET_ORIGINS.antrean;

    crumbs = [
      { href: '/unit', label: 'Dashboard', isLast: false },
      { href: origin, label: ROUTE_LABELS[origin], isLast: false },
      { href: pathname, label: 'Detail Penugasan', isLast: true },
    ];
  } else {
    crumbs = segments.map((seg, i) => {
      const href = '/' + segments.slice(0, i + 1).join('/');
      const label = ROUTE_LABELS[href] ?? (i === segments.length - 1 ? 'Detail' : seg);
      return { href, label, isLast: i === segments.length - 1 };
    });
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

export default function UnitLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="unit">
      <AppLayout
        navGroups={NAV_GROUPS}
        routeLabels={ROUTE_LABELS}
        badgeCounts={{}}
        rootHref="/unit"
        renderBreadcrumb={(p, sp) => <UnitBreadcrumb pathname={p} searchParams={sp} />}
      >
        {children}
      </AppLayout>
    </AuthGuard>
  );
}
