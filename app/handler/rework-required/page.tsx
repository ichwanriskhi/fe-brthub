'use client';

import { HandlerQueue } from '@/components/shared/HandlerQueue';

export default function HandlerReworkRequiredPage() {
  return (
    <HandlerQueue
      status="REWORK"
      hrefBase="/handler/ticket"
      linkQuery="?from=rework"
      actionLabel="Revisi"
      emptyTitle="Tidak ada tiket yang perlu direvisi"
      emptyDescription="Tiket yang resolusinya ditolak approver akan kembali ke sini untuk diperbaiki."
    />
  );
}
