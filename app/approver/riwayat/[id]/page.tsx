'use client';

import { use } from 'react';
import { ApprovalDetail } from '@/components/shared/ApprovalDetail';

export default function RiwayatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <ApprovalDetail id={id} stage="FINAL" backHref="/approver/riwayat" readOnly />;
}
