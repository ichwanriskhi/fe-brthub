'use client';

import { ApprovalQueue } from '@/components/shared/ApprovalQueue';

export default function PersetujuanPenutupanPage() {
  return <ApprovalQueue stage="FINAL" hrefBase="/approver/persetujuan-penutupan" actionLabel="Proses" />;
}
