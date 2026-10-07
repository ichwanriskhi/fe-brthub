'use client';

import { HandlerQueue } from '@/components/shared/HandlerQueue';

export default function HandlerNeedActionPage() {
  return (
    <HandlerQueue
      status="NEED_ACTION"
      hrefBase="/handler/ticket"
      linkQuery="?from=need-action"
      actionLabel="Kerjakan"
      emptyTitle="Tidak ada tiket yang perlu ditindaklanjuti"
      emptyDescription="Semua tiket yang ditugaskan kepada Anda telah diajukan resolusinya."
    />
  );
}
