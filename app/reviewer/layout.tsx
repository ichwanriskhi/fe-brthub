'use client';

import * as React from 'react';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import {
  LayoutDashboard,
  ClipboardCheck,
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

/**
 * Daftar asal untuk detail tiket, dibaca dari query `?from=` yang ditempel
 * link list.
 *
 * Tanpa ini, crumb tengah selalu `Tinjauan Awal` — bahkan saat tiket dibuka dari
 * `Arsip & Riwayat`, karena kedua daftar itu menunjuk ke route yang sama
 * (`/reviewer/tiket`) dan path-nya tidak bisa membedakannya.
 *
 * Kalau `?from=` tidak ada — mis. URL diketik atau dibuka dari tautan luar —
 * crumb memakai daftar utama, karena di situ memang tidak ada informasi lain.
 */
const REVIEWER_TICKET_ORIGINS: Record<string, { href: string; label: string }> = {
  riwayat: { href: '/reviewer/riwayat', label: 'Arsip & Riwayat' },
  'tinjauan-awal': { href: '/reviewer/tinjauan-awal', label: 'Tinjauan Awal' },
};

function ReviewerBreadcrumb({
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
      REVIEWER_TICKET_ORIGINS[searchParams.get('from') ?? ''] ??
      REVIEWER_TICKET_ORIGINS['tinjauan-awal'];

    crumbs = [
      { href: '/reviewer', label: 'Dashboard', isLast: false },
      { href: origin.href, label: origin.label, isLast: false },
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
  // Badge counts will be populated from API in a future iteration.
  // For now we show empty counts rather than faking them from client data.
  const badgeCounts: Record<string, number> = {};

  return (
    <AuthGuard role="reviewer">
      <AppLayout
        navGroups={NAV_GROUPS}
        routeLabels={ROUTE_LABELS}
        badgeCounts={badgeCounts}
        rootHref="/reviewer"
        renderBreadcrumb={(p, sp) => <ReviewerBreadcrumb pathname={p} searchParams={sp} />}
      >
        {children}
      </AppLayout>
    </AuthGuard>
  );
}
