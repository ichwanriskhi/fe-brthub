'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Handles session expiry events dispatched by the fetch wrapper.
 *
 * When the fetch wrapper detects that a refresh token has failed, it dispatches
 * a 'session-expired' event before redirecting to login. This component listens
 * for that event and displays a toast notification to the user.
 */
export default function SessionExpiryHandler() {
  useEffect(() => {
    const handleSessionExpired = () => {
      toast.error('Sesi Anda telah habis. Silakan login kembali.');
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, []);

  return null;
}
