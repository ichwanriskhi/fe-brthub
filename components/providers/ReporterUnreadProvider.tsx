'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'reporter_unread';

/** chatId percakapan reporter <-> admin untuk satu tiket. */
export const reporterChatId = (ticketId: string) => `${ticketId}:ADMIN`;

interface ReporterUnreadValue {
  /** Keyed by chatId (`${ticketId}:ADMIN`). */
  unread: Record<string, number>;
  /** Tandai seluruh pesan pada chat sudah dibaca. */
  markRead: (chatId: string) => void;
  /** Tambah counter pesan belum dibaca (mis. pesan baru dari admin). */
  increment: (chatId: string, by?: number) => void;
}

const ReporterUnreadContext = createContext<ReporterUnreadValue | null>(null);

/**
 * Menyimpan jumlah pesan belum dibaca percakapan reporter per tiket.
 * Persist ke localStorage agar bertahan antar kunjungan halaman.
 * Angka akan terisi nyata begitu API chat tersedia; untuk sekarang state
 * dimulai dari 0 (menggantikan MOCK_UNREAD).
 */
export function ReporterUnreadProvider({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUnread(JSON.parse(raw) as Record<string, number>);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unread));
    } catch {
      /* ignore quota errors */
    }
  }, [unread]);

  const markRead = useCallback((chatId: string) => {
    setUnread((prev) => (prev[chatId] ? { ...prev, [chatId]: 0 } : prev));
  }, []);

  const increment = useCallback((chatId: string, by = 1) => {
    setUnread((prev) => ({ ...prev, [chatId]: (prev[chatId] ?? 0) + by }));
  }, []);

  const value = useMemo(() => ({ unread, markRead, increment }), [unread, markRead, increment]);

  return <ReporterUnreadContext.Provider value={value}>{children}</ReporterUnreadContext.Provider>;
}

export function useReporterUnread(): ReporterUnreadValue {
  const ctx = useContext(ReporterUnreadContext);
  if (!ctx) {
    throw new Error('useReporterUnread harus dipakai di dalam ReporterUnreadProvider');
  }
  return ctx;
}
