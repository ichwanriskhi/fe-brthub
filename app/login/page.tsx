'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { authServiceClient } from '@/lib/api/auth-service';
import { brthubApi, deriveRoles, resolveRoleRedirect, roleFromRedirect } from '@/lib/api/brthub-api';
import { useAuth } from '@/lib/auth/auth-context';
import type { AuthUser } from '@/lib/auth/auth-context';

const BRTHUB_APP_ID = 'brthub_client_SAypfMmFdNpzizRcKbCX';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('Mohon lengkapi email/nomor handphone dan password');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Login via Auth Service (email atau nomor HP + password)
      const loginResp = await authServiceClient.loginWithPassword(identifier, password);

      const accessToken = loginResp.data?.access_token;
      const refreshToken = loginResp.data?.refresh_token;
      if (!loginResp.success || !accessToken || !refreshToken) {
        throw new Error(loginResp.message || 'Email/nomor atau password salah.');
      }

      // 2. Ambil profil + roles dari be-brthub (token eksplisit: localStorage
      //    belum diisi sebelum profil berhasil; skipAuthRefresh agar 401 tidak
      //    memicu clear-session + redirect saat kita masih di halaman login)
      const meData = await brthubApi.getMe(accessToken, { skipAuthRefresh: true });

      if (!meData.success) {
        throw new Error('Akun tidak ditemukan di BRTHub. Hubungi admin untuk pendaftaran akun.');
      }

      const roles = deriveRoles(
        meData.brthub?.roles ?? [],
        meData.brthub?.employee_profile ?? null,
      );
      if (roles.length === 0) {
        throw new Error('Akun Anda belum memiliki peran di BRTHub. Hubungi admin.');
      }

      const authUser: AuthUser = {
        uuid: meData.user.uuid,
        full_name: meData.user.full_name,
        email: meData.user.email,
        phone_number: meData.user.phone_number,
        roles,
        employee_profile: meData.brthub?.employee_profile ?? null,
      };

      // Simpan via AuthContext (konsisten dengan OTP flow),
      // sekaligus sinkronkan badge dengan halaman tujuan.
      const destination = resolveRoleRedirect(roles, null);
      login(accessToken, refreshToken, authUser, roleFromRedirect(destination));

      toast.success(`Login berhasil! Selamat datang, ${meData.user.full_name}.`);
      router.push(destination);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Login gagal. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-muted/20">
      <div className="flex justify-end p-4">
        <ModeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Masuk ke BRTHub</CardTitle>
              <CardDescription>
                Portal login petugas internal BRTHub.
              </CardDescription>
            </CardHeader>

            <CardContent>
                          <form onSubmit={handleSubmit}>
                            <FieldGroup>
                              <Field>
                                <FieldLabel htmlFor="identifier">Email / Nomor Handphone</FieldLabel>
                                <Input
                                  id="identifier"
                                  type="text"
                                  placeholder="email@domain.com atau 08123456789"
                                  value={identifier}
                                  onChange={(e) => setIdentifier(e.target.value)}
                                  autoComplete="email"
                                />
                              </Field>

                              <Field>
                                <div className="flex items-center justify-between">
                                  <FieldLabel htmlFor="password">Password</FieldLabel>
                                  <Link href="#" className="text-sm underline-offset-4 hover:underline">
                                    Lupa password?
                                  </Link>
                                </div>
                                <Input
                                  id="password"
                                  type="password"
                                  placeholder="Masukkan password Anda"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  autoComplete="current-password"
                                />
                              </Field>

                  <Field>
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Memproses...' : 'Masuk Sekarang'}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>

              <FieldSeparator className="my-6">atau</FieldSeparator>

              <Button variant="outline" className="w-full" asChild>
                <Link href="/verifikasi?mode=staff">
                  <Smartphone data-icon="inline-start" />
                  Masuk menggunakan kode OTP
                </Link>
              </Button>
            </CardContent>

            <CardFooter className="flex-row items-start gap-1 border-t">
              <p className="text-sm text-muted-foreground">
                Hanya ingin melaporkan kendala?
              </p>
              <Link
                href="/verifikasi"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Klik di sini
              </Link>
            </CardFooter>
          </Card>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Kembali ke halaman utama
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
