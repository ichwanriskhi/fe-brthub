'use client';

import { ApprovalQueue } from '@/components/shared/ApprovalQueue';

export default function ApproverRiwayatPage() {
  return <ApprovalQueue stage="HISTORY" hrefBase="/approver/riwayat" actionLabel="Detail" />;
}
