'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { ShieldOff, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

export default function UnauthorizedPage() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="flex min-h-svh flex-col bg-muted/20">
      <div className="flex justify-end p-4">
        <ModeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldOff className="size-10" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Akses Ditolak</h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              Anda tidak memiliki izin untuk mengakses halaman ini.
              Pastikan Anda login dengan akun yang memiliki peran yang sesuai.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isAuthenticated ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/" className="gap-2">
                    <ArrowLeft className="size-4" />
                    Kembali ke Beranda
                  </Link>
                </Button>
                <Button variant="destructive" onClick={() => logout()}>
                  <LogIn className="size-4" />
                  Keluar &amp; Login Ulang
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/login" className="gap-2">
                  <LogIn className="size-4" />
                  Masuk ke BRTHub
                </Link>
              </Button>
            )}
          </div>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground">
            Jika Anda merasa ini adalah kesalahan, hubungi administrator sistem.
          </p>
        </div>
      </div>
    </div>
  );
}
