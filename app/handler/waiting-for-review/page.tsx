'use client';

import { HandlerQueue } from '@/components/shared/HandlerQueue';

export default function HandlerWaitingReviewPage() {
  return (
    <HandlerQueue
      status="WAITING_REVIEW"
      hrefBase="/handler/ticket"
      actionLabel="Detail"
      emptyTitle="Tidak ada tiket yang menunggu review"
      emptyDescription="Tiket yang resolusinya sudah Anda ajukan akan tampil di sini hingga disetujui."
    />
  );
}
