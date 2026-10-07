'use client';

import { use } from 'react';
import { FinalApprovalDetail } from '@/components/shared/FinalApprovalDetail';

export default function PersetujuanPenutupanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <FinalApprovalDetail id={id} backHref="/approver/persetujuan-penutupan" />
  );
}
