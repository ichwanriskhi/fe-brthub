'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCwIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { toast } from 'sonner';

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone') || '081234567890';

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      toast.error('Masukkan 6 digit kode OTP dengan lengkap');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Verifikasi OTP berhasil');
      router.push('/report/new');
    }, 800);
  };

  const handleResend = () => {
    if (resendCountdown > 0) return;
    setResendCountdown(30);
    toast.success('Kode OTP baru telah dikirim ulang.');
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Verifikasi Login Anda</CardTitle>
        <CardDescription>
          Masukkan kode verifikasi 6 digit yang dikirim via WhatsApp/SMS ke nomor:{' '}
          <span className="font-medium text-foreground">{phoneParam}</span>.
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
                  disabled={resendCountdown > 0}
                >
                  <RefreshCwIcon className="size-3.5" />
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
                Tidak dapat mengakses nomor ini lagi?{' '}
                <Link href="/verifikasi" className="underline underline-offset-4 hover:text-primary">
                  Ubah nomor handphone
                </Link>
              </FieldDescription>
            </Field>

            <Field>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Memverifikasi...' : 'Verifikasi'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <Link
          href="/verifikasi"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Kembali ke verifikasi nomor
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
                  Memuat verifikasi OTP...
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
