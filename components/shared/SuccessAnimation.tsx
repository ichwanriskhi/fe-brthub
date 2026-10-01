'use client';

import { useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessAnimationProps {
  className?: string;
}

/**
 * Animasi sukses halaman `/report/sukses`.
 *
 * Memakai `@lottiefiles/dotlottie-react` (player resmi format `.lottie`)
 * sehingga tidak bergantung pada web component `lottie-player` dari CDN
 * (`unpkg.com/@lottiefiles/lottie-player@latest`) yang rapuh:
 * - versi tidak ter-pin (`@latest` bisa berubah kapan saja),
 * - butuh akses internet ke CDN eksternal,
 * - atribut boolean `autoplay`/`loop` tidak sampai ke player karena
 *   React 19 mengirimnya sebagai property DOM, bukan atribut HTML.
 *
 * Bila file animasi gagal dimuat (offline, file hilang, dsb.), komponen
 * menampilkan ikon statis sebagai fallback supaya halaman tetap bermakna.
 */
export function SuccessAnimation({ className }: SuccessAnimationProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label="Laporan berhasil terkirim"
        className={cn(
          'mx-auto flex size-32 items-center justify-center rounded-full bg-emerald-50 sm:size-36',
          className,
        )}
      >
        <CheckCircle2 className="size-16 text-emerald-500 sm:size-20" />
      </div>
    );
  }

  return (
    <DotLottieReact
      src="/Success.lottie"
      autoplay
      loop={false}
      onError={() => setFailed(true)}
      className={cn('mx-auto h-32 w-32 sm:h-40 sm:w-40', className)}
    />
  );
}
