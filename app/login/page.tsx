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

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('Mohon lengkapi nomor handphone dan password');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Login berhasil sebagai Reviewer');
      router.push('/reviewer');
    }, 800);
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
                Portal login khusus staf internal, reviewer, dan tim teknis BRT.
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
                      placeholder="08123456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
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
                <Link href="/verifikasi">
                  <Smartphone data-icon="inline-start" />
                  Masuk menggunakan kode OTP
                </Link>
              </Button>
            </CardContent>

            <CardFooter className="flex-col items-start gap-1 border-t">
              <p className="text-sm text-muted-foreground">
                Bukan karyawan internal atau hanya ingin melaporkan kendala?
              </p>
              <Link
                href="/verifikasi"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Lapor tanpa akun password
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
