'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import {
  LayoutDashboard,
  ClipboardCheck,
  CheckSquare,
  Archive,
} from 'lucide-react';
import { AppLayout, type NavGroup } from '@/components/shared/AppLayout';
import { AuthGuard } from '@/lib/auth/auth-guard';

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Antrean Kerja',
    items: [
      { href: '/reviewer', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/reviewer/tinjauan-awal', label: 'Tinjauan Awal', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Data',
    items: [{ href: '/reviewer/riwayat', label: 'Arsip & Riwayat', icon: Archive }],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  '/reviewer': 'Dashboard',
  '/reviewer/tinjauan-awal': 'Tinjauan Awal',
  '/reviewer/riwayat': 'Arsip & Riwayat',
};

// ─── Custom breadcrumb ────────────────────────────────────────────────────────

function ReviewerBreadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean);
  const isTicketDetail = segments[1] === 'tiket' && segments.length >= 3;

  let crumbs: { href: string; label: string; isLast: boolean }[] = [];
  if (isTicketDetail) {
    crumbs = [
      { href: '/reviewer', label: 'Dashboard', isLast: false },
      {
        href: '/reviewer/tinjauan-awal',
        label: 'Tinjauan Awal',
        isLast: false,
      },
      {
        href: pathname,
        label: 'Detail Tiket',
        isLast: true,
      },
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

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Badge counts will be populated from API in a future iteration.
  // For now, we show empty counts to avoid depending on MOCK_TICKETS.
  const badgeCounts: Record<string, number> = {};

  return (
    <AuthGuard role="reviewer">
      <AppLayout
        navGroups={NAV_GROUPS}
        routeLabels={ROUTE_LABELS}
        badgeCounts={badgeCounts}
        rootHref="/reviewer"
        renderBreadcrumb={(p) => <ReviewerBreadcrumb pathname={p} />}
      >
        {children}
      </AppLayout>
    </AuthGuard>
  );
}
