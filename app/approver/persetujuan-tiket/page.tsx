'use client';

import { ApprovalQueue } from '@/components/shared/ApprovalQueue';

export default function PersetujuanTiketPage() {
  return <ApprovalQueue stage="INITIAL" hrefBase="/approver/persetujuan-tiket" actionLabel="Proses" />;
}
