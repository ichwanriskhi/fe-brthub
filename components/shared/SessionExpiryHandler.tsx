'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { startProactiveRefresh } from '@/lib/api/fetch-wrapper';

/**
 * Handles session expiry events dispatched by the fetch wrapper.
 *
 * When the fetch wrapper detects that a refresh token has failed, it dispatches
 * a 'session-expired' event before redirecting to login. This component listens
 * for that event and displays a toast notification to the user.
 *
 * Plus scheduler refresh proaktif (satu-satunya starter global): perpanjang
 * sesi sebelum 401 pertama. Non-destruktif — gagal proaktif tidak me-logout.
 */
export default function SessionExpiryHandler() {
  useEffect(() => {
    const handleSessionExpired = () => {
      toast.error('Sesi Anda telah habis. Silakan login kembali.');
    };

    window.addEventListener('session-expired', handleSessionExpired);
    const stopProactive = startProactiveRefresh();
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
      stopProactive();
    };
  }, []);

  return null;
}
