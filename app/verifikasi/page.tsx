'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function PhoneVerificationPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      toast.error('Masukkan nomor handphone yang valid');
      return;
    }

    setIsLoading(true);
    // Simpan phone di sessionStorage untuk alur OTP & report
    sessionStorage.setItem('brt_user_phone', phone);

    setTimeout(() => {
      setIsLoading(false);
      toast.success('Kode OTP berhasil dikirim via WhatsApp/SMS');
      router.push(`/otp?phone=${encodeURIComponent(phone)}`);
    }, 600);
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
              <CardTitle>Verifikasi Nomor Ponsel</CardTitle>
              <CardDescription>
                Masukkan nomor ponsel aktif Anda untuk menerima 6 digit kode OTP.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="phone">Nomor Handphone</FieldLabel>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="08xxxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      autoFocus
                    />
                    <FieldDescription>
                      Pastikan nomor terhubung WhatsApp atau aktif menerima SMS.
                    </FieldDescription>
                  </Field>

                  <Field orientation="horizontal">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.back()}
                    >
                      Batal
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? 'Mengirim...' : 'Kirim Kode OTP'}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>

            <CardFooter className="border-t">
              <p className="text-sm text-muted-foreground">
                Dengan melanjutkan, Anda menyetujui pemrosesan data laporan sesuai ketentuan layanan.
              </p>
            </CardFooter>
          </Card>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Kembali ke beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
