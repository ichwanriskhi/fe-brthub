'use client';

import { use } from 'react';
import { ApprovalDetail } from '@/components/shared/ApprovalDetail';

export default function PersetujuanTiketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <ApprovalDetail id={id} stage="INITIAL" backHref="/approver/persetujuan-tiket" />
  );
}
