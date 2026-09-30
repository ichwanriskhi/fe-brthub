'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { ArrowLeft, Mail, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { authServiceClient } from '@/lib/api/auth-service';

function VerifikasiForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // mode=staff → karyawan login (hanya akun terdaftar), mode lainnya → reporter/guest
  const mode = searchParams.get('mode') ?? 'reporter';
  const isStaffMode = mode === 'staff';

  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmail, setIsEmail] = useState(false);

  // Auto-detect email vs phone input
  useEffect(() => {
    setIsEmail(identifier.includes('@'));
  }, [identifier]);

  // Preserve the post-login redirect target coming from the protected pages.
  const getNextParam = () => {
    if (typeof window === 'undefined') return '';
    const next = new URLSearchParams(window.location.search).get('next');
    return next ? `&next=${encodeURIComponent(next)}` : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim()) {
      toast.error('Mohon masukkan email atau nomor handphone');
      return;
    }

    setIsLoading(true);

    try {
      // Staff login: *_login menolak bila akun tidak ada (hanya akun terdaftar).
      // Reporter guest: *_otp membuat akun baru bila belum ada.
      const action = isStaffMode
        ? isEmail ? 'email_login' : 'phone_login'
        : isEmail ? 'email_otp' : 'phone_otp';

      await authServiceClient.requestOtp(identifier, action);

      toast.success('Kode OTP telah dikirim!');

      // Pass mode along to /otp so it knows the correct verify action & redirect
      const encodedId = encodeURIComponent(identifier);
      router.push(
        `/otp?identifier=${encodedId}&type=${isEmail ? 'email' : 'phone'}&mode=${mode}${getNextParam()}`
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Gagal mengirim kode OTP. Silakan coba lagi.';
      toast.error(msg);
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
              <CardTitle>
                {isStaffMode
                  ? 'Login via OTP'
                  : isEmail
                  ? 'Verifikasi Email'
                  : 'Verifikasi Nomor Ponsel'}
              </CardTitle>
              <CardDescription>
                {isStaffMode
                  ? 'Masukkan email atau nomor HP yang terdaftar sebagai akun karyawan BRTHub.'
                  : isEmail
                  ? 'Masukkan email aktif Anda untuk menerima 6 digit kode OTP.'
                  : 'Masukkan nomor ponsel aktif Anda untuk menerima 6 digit kode OTP.'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="identifier">
                      {isEmail ? 'Email' : 'Nomor Handphone'}
                    </FieldLabel>
                    <Input
                      id="identifier"
                      type={isEmail ? 'email' : 'tel'}
                      placeholder={isEmail ? 'nama@email.com' : '08xxxxxxxxxx'}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="username"
                    />
                    <FieldDescription>
                      {isEmail
                        ? 'Email aktif untuk menerima OTP'
                        : 'Nomor yang terhubung WhatsApp.'}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Mengirim Kode...' : 'Kirim Kode OTP'}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmail(true)}
                  className="flex-1"
                >
                  <Mail className="size-4" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmail(false)}
                  className="flex-1"
                >
                  <Smartphone className="size-4" />
                  Phone
                </Button>
              </div>
            </CardContent>

            <CardFooter className="border-t">
              <p className="text-sm text-muted-foreground">
                {isStaffMode
                  ? 'Hanya akun karyawan terdaftar yang dapat login.'
                  : 'Dengan melanjutkan, Anda menyetujui pemrosesan data laporan sesuai ketentuan layanan.'}
              </p>
            </CardFooter>
          </Card>

          <div className="mt-6 text-center">
            <Link
              href={isStaffMode ? '/login' : '/'}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {isStaffMode ? 'Kembali ke login' : 'Kembali ke beranda'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PhoneVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">Memuat...</p>
        </div>
      }
    >
      <VerifikasiForm />
    </Suspense>
  );
}