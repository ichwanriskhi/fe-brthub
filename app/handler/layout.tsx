'use client';

import * as React from 'react';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import {
  LayoutDashboard,
  AlertCircle,
  Clock,
  Redo,
  Archive,
} from 'lucide-react';
import { AppLayout, type NavGroup } from '@/components/shared/AppLayout';
import { AuthGuard } from '@/lib/auth/auth-guard';

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Antrean Kerja',
    items: [
      { href: '/handler', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/handler/need-action', label: 'Perlu Tindak Lanjut', icon: AlertCircle },
      { href: '/handler/waiting-for-review', label: 'Menunggu Review', icon: Clock },
      { href: '/handler/rework-required', label: 'Perlu Revisi', icon: Redo },
    ],
  },
  {
    label: 'Data',
    items: [{ href: '/handler/history', label: 'Riwayat', icon: Archive }],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  '/handler': 'Dashboard',
  '/handler/need-action': 'Perlu Tindak Lanjut',
  '/handler/waiting-for-review': 'Menunggu Review',
  '/handler/rework-required': 'Perlu Revisi',
  '/handler/history': 'Riwayat',
};

/**
 * Asal daftar untuk detail tiket, dibaca dari `?from=`.
 *
 * Handler punya empat daftar yang semuanya dilayani route `/handler/ticket`.
 * Tanpa penanda ini, crumb tidak bisa menyebut daftar mana yang sedang dibuka.
 * `ROUTE_LABELS` dipakai ulang supaya label crumb tidak pernah berbeda dengan
 * label di navigasi.
 */
const HANDLER_TICKET_ORIGINS: Record<string, string> = {
  'need-action': '/handler/need-action',
  'waiting-review': '/handler/waiting-for-review',
  rework: '/handler/rework-required',
  history: '/handler/history',
};

function HandlerBreadcrumb({
  pathname,
  searchParams,
}: {
  pathname: string;
  searchParams: URLSearchParams;
}) {
  const segments = pathname.split('/').filter(Boolean);
  const isTicketDetail = segments[1] === 'ticket' && segments.length >= 3;

  let crumbs: { href: string; label: string; isLast: boolean }[] = [];
  if (isTicketDetail) {
    const origin =
      HANDLER_TICKET_ORIGINS[searchParams.get('from') ?? ''] ?? HANDLER_TICKET_ORIGINS['need-action'];

    crumbs = [
      { href: '/handler', label: 'Dashboard', isLast: false },
      { href: origin, label: ROUTE_LABELS[origin], isLast: false },
      { href: pathname, label: 'Detail Tiket', isLast: true },
    ];
  } else {
    crumbs = segments.map((seg, i) => {
      const href = '/' + segments.slice(0, i + 1).join('/');
      const label = ROUTE_LABELS[href] ?? (i === segments.length - 1 ? 'Detail Tiket' : seg);
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

export default function HandlerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="handler">
      <AppLayout
        navGroups={NAV_GROUPS}
        routeLabels={ROUTE_LABELS}
        badgeCounts={{}}
        rootHref="/handler"
        renderBreadcrumb={(p, sp) => <HandlerBreadcrumb pathname={p} searchParams={sp} />}
      >
        {children}
      </AppLayout>
    </AuthGuard>
  );
}
