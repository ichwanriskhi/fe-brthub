'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/**
 * Client-side second line of defense for reporter pages: the proxy already
 * gates on cookie presence, this validates the bearer token against the
 * BRTHub API and forces a re-login when it is expired/revoked (401).
 */
export function ReporterGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'checking' | 'ok'>('checking');

  useEffect(() => {
    let cancelled = false;

    const redirectToLogin = () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');
      router.replace(`/verifikasi?next=${encodeURIComponent(pathname)}`);
    };

    const token = localStorage.getItem('auth_token');
    if (!token) {
      redirectToLogin();
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 401) {
          redirectToLogin();
          return;
        }
        setStatus('ok');
      })
      .catch(() => {
        // Network hiccup: keep the page usable, individual data fetches will
        // surface their own errors.
        if (!cancelled) setStatus('ok');
      });

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (status === 'checking') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6 md:py-10">
        <Card>
          <CardContent className="flex min-h-64 items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Spinner className="size-8 text-primary" />
              <span className="text-sm">Memeriksa sesi pelapor…</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
