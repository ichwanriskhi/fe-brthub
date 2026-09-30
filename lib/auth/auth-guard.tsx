'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import type { AppRole } from '@/lib/api/brthub-api';

interface AuthGuardProps {
  /** The role required to access the wrapped content. */
  role: AppRole;
  children: React.ReactNode;
}

/**
 * AuthGuard — wraps a role-specific section of the app.
 *
 * - If not authenticated → redirect to /login
 * - If authenticated but wrong role → redirect to /unauthorized
 * - While loading → render nothing (prevents flash of protected content)
 */
export function AuthGuard({ role, children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!hasRole(role)) {
      router.replace('/unauthorized');
    }
  }, [isLoading, isAuthenticated, hasRole, role, router]);

  // While loading or redirecting, render nothing to avoid flash
  if (isLoading) {
    return (
      <div className="flex h-svh w-full items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Memuat...</div>
      </div>
    );
  }

  if (!isAuthenticated || !hasRole(role)) {
    return null;
  }

  return <>{children}</>;
}
