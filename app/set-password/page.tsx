'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { checkPassword } from '@/lib/auth/password-criteria';
import { authServiceClient } from '@/lib/api/auth-service';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, Check, CircleAlert, CircleCheck, Eye, EyeOff } from 'lucide-react';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const userId = searchParams.get('user_id') ?? '';
  const hasLink = token !== '' && userId !== '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { items, allMet } = useMemo(() => checkPassword(password), [password]);
  const passwordsMatch = confirmation === '' || password === confirmation;
  const canSubmit =
    hasLink && !isLoading && allMet && confirmation !== '' && password === confirmation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      await authServiceClient.setPassword(token, userId, password, confirmation);
      setSuccess(true);
      toast.success('Password berhasil dibuat. Silakan login.');
      setTimeout(() => router.push('/login'), 2500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Buat Password</CardTitle>
        <CardDescription>
          Akun Anda telah dibuat. Silakan buat password untuk mengaktifkan akun.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!hasLink ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <CircleAlert className="size-4 shrink-0" />
              Tautan tidak valid
            </p>
            <p className="mt-1 text-muted-foreground">
              Tautan ini tidak lengkap atau kedaluwarsa. Minta link baru ke admin.
            </p>
          </div>
        ) : success ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
              <CircleCheck className="size-4 shrink-0" />
              Password berhasil dibuat!
            </p>
            <p className="mt-1 text-muted-foreground">
              Anda akan diarahkan ke halaman login…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password baru"
                    autoComplete="new-password"
                    className="pr-10"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (!touched) setTouched(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="password-confirmation">Konfirmasi Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password-confirmation"
                    type={showConfirmation ? 'text' : 'password'}
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                    className="pr-10"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmation((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showConfirmation ? 'Sembunyikan konfirmasi' : 'Tampilkan konfirmasi'}
                  >
                    {showConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {confirmation !== '' && !passwordsMatch && (
                  <p className="text-xs text-destructive">Konfirmasi password tidak sama.</p>
                )}
              </Field>

              {touched && (
                <Field>
                  <ul className="space-y-1.5 rounded-lg border bg-muted/40 p-3">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-xs">
                        <span
                          className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded-full transition-colors',
                            item.met ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                          )}
                        >
                          {item.met && <Check className="size-2.5 text-white" strokeWidth={3} />}
                        </span>
                        <span className={item.met ? 'text-foreground' : 'text-muted-foreground'}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Field>
              )}

              <Field>
                <Button type="submit" className="w-full" disabled={!canSubmit}>
                  {isLoading ? 'Menyimpan...' : 'Simpan Password'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function SetPasswordPage() {
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
                  Memuat…
                </CardContent>
              </Card>
            }
          >
            <SetPasswordForm />
          </Suspense>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Kembali ke halaman login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
