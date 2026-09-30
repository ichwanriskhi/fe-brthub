import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { AuthProvider } from '@/lib/auth/auth-context';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

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

/**
 * Script inline untuk mencegah flash tema yang salah (FOUC).
 * Dirender di server component (bukan oleh React di client), sehingga aman
 * dari warning "Encountered script tag while rendering React component".
 */
const themeInitScript = `(function(){try{var k='brthub-theme';var s=localStorage.getItem(k);var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
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
              {children}
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
