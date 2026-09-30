'use client';

import { HandlerQueue } from '@/components/shared/HandlerQueue';

export default function HandlerHistoryPage() {
  return (
    <HandlerQueue
      status="HISTORY"
      hrefBase="/handler/ticket"
      actionLabel="Detail"
      emptyTitle="Belum ada riwayat"
      emptyDescription="Tiket yang sudah selesai atau ditolak akan tampil di sini."
    />
  );
}
