'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCwIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel, FieldGroup, FieldDescription } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { toast } from 'sonner';
import { authServiceClient } from '@/lib/api/auth-service';
import { brthubApi, deriveRoles, resolveStaffDestination, roleFromRedirect } from '@/lib/api/brthub-api';
import { saveReporterSession, setTokenExpiry } from '@/lib/api/fetch-wrapper';
import { useAuth, type AuthUser } from '@/lib/auth/auth-context';

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const identifierParam = searchParams.get('identifier') || '';
  const typeParam = searchParams.get('type') as 'email' | 'phone' | null;
  const modeParam = searchParams.get('mode') ?? 'reporter';
  const isStaffMode = modeParam === 'staff';

  const identifier = decodeURIComponent(identifierParam);
  const isEmail = typeParam === 'email';

  // Default next path: staff → login (will be overridden by role redirect),
  // reporter → /report/new
  const nextParamRaw = searchParams.get('next');
  const reporterNextPath =
    nextParamRaw && nextParamRaw.startsWith('/') && !nextParamRaw.startsWith('//')
      ? nextParamRaw
      : '/report/new';

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!identifier) {
      toast.error('Identifier tidak ditemukan. Silakan login ulang.');
      router.push('/verifikasi');
    }
  }, [identifier, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Staff login: verify OTP → fetch me from be-brthub → set AuthContext → redirect by role
  const handleStaffLogin = async (accessToken: string, refreshToken: string, expiresIn?: number) => {
    let meData;
    try {
      // Token eksplisit: saat ini belum (dan tidak boleh) tersimpan di
      // localStorage sebelum profil berhasil diambil. skipAuthRefresh agar 401
      // tidak memicu redirect otomatis dari fetch-wrapper saat masih di /otp.
      meData = await brthubApi.getMe(accessToken, { skipAuthRefresh: true });
    } catch {
      throw new Error('Gagal mengambil profil pengguna. Pastikan Anda memiliki akun petugas BRTHub.');
    }

    if (!meData.success) {
      throw new Error('Akun tidak ditemukan di BRTHub. Hubungi admin untuk pendaftaran akun petugas.');
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

    // Role aktif = role yang terakhir dipakai user (bila masih dimiliki),
    // supaya user multi-role tidak selalu dipaksa ke role tertentu.
    let preferredRole: string | null = null;
    try {
      preferredRole = localStorage.getItem('brthub_active_role');
    } catch {
      preferredRole = null;
    }

    const destination = resolveStaffDestination(roles, preferredRole, searchParams.get('next'));
    // Simpan ke AuthContext + localStorage (refresh token dipakai oleh
    // fetch-wrapper untuk memperbarui access token saat kedaluwarsa),
    // sekaligus sinkronkan badge dengan halaman tujuan.
    login(accessToken, refreshToken, authUser, roleFromRedirect(destination), expiresIn);
    toast.success(`Login berhasil! Selamat datang, ${meData.user.full_name}.`);
    router.push(destination);
  };

  // ─── Reporter login: existing flow (save raw token, redirect to report page)
  const handleReporterLogin = async (
    accessToken: string,
    expiresIn?: number,
    refreshToken?: string,
  ) => {
    // Key terpusat di fetch-wrapper (jangan hardcode string di sini).
    // Refresh token reporter — key TERPISAH dari staff agar tidak saling
    // timpa di browser bersama. Tanpa ini reporter mati tiap access expired.
    saveReporterSession(accessToken, refreshToken);
    // Umur untuk scheduler proaktif (lihat fetch-wrapper).
    if (Number.isFinite(Number(expiresIn)) && Number(expiresIn) > 0) {
      setTokenExpiry('reporter', Number(expiresIn));
    }

    try {
      const userResult = await authServiceClient.getUser(accessToken);
      if (userResult.success && userResult.data) {
        localStorage.setItem('user_profile', JSON.stringify(userResult.data));
      }
    } catch {
      // Non-critical — continue even if profile fetch fails
    }

    // Persist session cookie via API route so proxy.ts lets reporter pages through
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, expires_in: expiresIn }),
    });

    toast.success('Login berhasil!');
    router.push(reporterNextPath);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length < 6) {
      toast.error('Masukkan 6 digit kode OTP dengan lengkap');
      return;
    }

    setIsLoading(true);

    try {
      // Staff: *_login — reporter: *_otp
      const action = isStaffMode
        ? isEmail ? 'email_login' : 'phone_login'
        : isEmail ? 'email_otp' : 'phone_otp';

      const result = await authServiceClient.verifyOtp(identifier, code, action);

      if (!result.success) {
        throw new Error(result.error || result.message || 'Verifikasi gagal');
      }

      const accessToken = result.data?.access_token;
      if (!accessToken) {
        throw new Error('Token tidak ditemukan pada respons verifikasi');
      }

      if (isStaffMode) {
        await handleStaffLogin(accessToken, result.data?.refresh_token ?? '', result.data?.expires_in);
      } else {
        await handleReporterLogin(accessToken, result.data?.expires_in, result.data?.refresh_token);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Kode OTP salah atau habis berlaku';
      toast.error(msg);
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || resending) return;

    setResending(true);
    try {
      const action = isStaffMode
        ? isEmail ? 'email_login' : 'phone_login'
        : isEmail ? 'email_otp' : 'phone_otp';
      await toast.promise(authServiceClient.requestOtp(identifier, action), {
        loading: 'Mengirim ulang kode OTP…',
        success: 'Kode OTP baru telah dikirim ulang.',
        error: (err) => (err instanceof Error ? err.message : 'Gagal mengirim ulang OTP'),
      });
      // Countdown hanya diulang saat kirim berhasil — gagal berarti boleh
      // langsung coba lagi tanpa menunggu 30 detik.
      setResendCountdown(30);
    } finally {
      setResending(false);
    }
  };

  if (!identifier) {
    return (
      <Card className="shadow-xs">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Memuat verifikasi OTP...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>
          {isStaffMode ? 'Verifikasi Login Petugas' : 'Verifikasi Login Anda'}
        </CardTitle>
        <CardDescription>
          Masukkan kode verifikasi 6 digit yang dikirim{' '}
          {isEmail ? 'via email' : 'via WhatsApp/SMS'} ke:{' '}
          <span className="font-medium text-foreground">{identifier}</span>.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleVerify} id="otp-form">
          <FieldGroup>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="otp">Kode Verifikasi</FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || resending}
                >
                  {resending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <RefreshCwIcon data-icon="inline-start" />
                  )}
                  {resendCountdown > 0 ? `Kirim Ulang (${resendCountdown}s)` : 'Kirim Ulang Kode'}
                </Button>
              </div>

              <div className="flex justify-center pt-2 pb-1">
                <InputOTP maxLength={6} id="otp" value={code} onChange={setCode} autoFocus required>
                  <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator className="mx-2" />
                  <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <FieldDescription>
                Tidak dapat mengakses ini lagi?{' '}
                <Link
                  href={isStaffMode ? '/verifikasi?mode=staff' : '/verifikasi'}
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Ganti nomor/email
                </Link>
              </FieldDescription>
            </Field>

            <Field>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Spinner data-icon="inline-start" />}
                {isLoading ? 'Memverifikasi...' : 'Verifikasi'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <Link
          href={isStaffMode ? '/login' : '/verifikasi'}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {isStaffMode ? 'Kembali ke login' : 'Kembali ke verifikasi'}
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function OtpPage() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/20">
      <div className="flex justify-end p-4">
        <ModeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Suspense
            fallback={
              <Card className="shadow-xs">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Memuat form verifikasi...
                </CardContent>
              </Card>
            }
          >
            <OtpForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
