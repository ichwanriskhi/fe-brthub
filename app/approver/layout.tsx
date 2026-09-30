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
    label: 'Antrean Persetujuan',
    items: [
      { href: '/approver', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/approver/persetujuan-tiket', label: 'Persetujuan Tiket', icon: ClipboardCheck },
      { href: '/approver/persetujuan-penutupan', label: 'Persetujuan Penutupan', icon: CheckSquare },
    ],
  },
  {
    label: 'Data',
    items: [{ href: '/approver/riwayat', label: 'Arsip & Riwayat', icon: Archive }],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  '/approver': 'Dashboard',
  '/approver/persetujuan-tiket': 'Persetujuan Tiket',
  '/approver/persetujuan-penutupan': 'Persetujuan Penutupan',
  '/approver/riwayat': 'Arsip & Riwayat',
};

// ─── Custom breadcrumb ────────────────────────────────────────────────────────

function ApproverBreadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean);
  const isTicketDetail = segments[1] === 'tiket' && segments.length >= 3;
  const isClosure = segments[1] === 'persetujuan-penutupan' || (isTicketDetail && segments[3] === 'penutupan');

  let crumbs: { href: string; label: string; isLast: boolean }[] = [];
  if (isTicketDetail) {
    crumbs = [
      { href: '/approver', label: 'Dashboard', isLast: false },
      {
        href: isClosure ? '/approver/persetujuan-penutupan' : '/approver/persetujuan-tiket',
        label: isClosure ? 'Persetujuan Penutupan' : 'Persetujuan Tiket',
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

export default function ApproverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Badge counts will be populated from API in a future iteration.
  const badgeCounts: Record<string, number> = {};

  return (
    <AuthGuard role="approver">
      <AppLayout
        navGroups={NAV_GROUPS}
        routeLabels={ROUTE_LABELS}
        badgeCounts={badgeCounts}
        rootHref="/approver"
        renderBreadcrumb={(p) => <ApproverBreadcrumb pathname={p} />}
      >
        {children}
      </AppLayout>
    </AuthGuard>
  );
}
