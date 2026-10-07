import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { AuthProvider } from '@/lib/auth/auth-context';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MediaLightboxProvider } from '@/components/shared/MediaLightbox';
import SessionExpiryHandler from '@/components/shared/SessionExpiryHandler';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BRTHub - Laporan & Tiket BRT',
  description: 'Sistem pengaduan dan tiket terpusat Bintang Racing Team. Buat laporan kendala, keluhan, dan permintaan barang secara mudah via verifikasi OTP.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var k='brthub-theme';var s=localStorage.getItem(k);var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t;}catch(e){}})();`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <MediaLightboxProvider>
                {children}
                <Toaster />
                <SessionExpiryHandler />
              </MediaLightboxProvider>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
