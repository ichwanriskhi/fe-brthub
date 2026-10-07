'use client';

import { useState } from 'react';
import { ApprovalQueue } from '@/components/shared/ApprovalQueue';
import { useQuickApprovalDecision } from '@/components/shared/QuickApprovalDecision';

export default function PersetujuanPenutupanPage() {
  // Keputusan menutup tiket, jadi barisnya hilang dari antrean pending.
  const [reloadKey, setReloadKey] = useState(0);
  const { decidingId, request, dialogs } = useQuickApprovalDecision({
    stage: 'FINAL',
    onSuccess: () => setReloadKey((k) => k + 1),
  });

  return (
    <>
      <ApprovalQueue
        stage="FINAL"
        hrefBase="/approver/persetujuan-penutupan"
        actionLabel="Detail"
        onDecide={request}
        decidingId={decidingId}
        reloadKey={reloadKey}
      />
      {dialogs}
    </>
  );
}