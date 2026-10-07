'use client';

import { useState } from 'react';
import { ApprovalQueue } from '@/components/shared/ApprovalQueue';
import { useQuickApprovalDecision } from '@/components/shared/QuickApprovalDecision';

export default function PersetujuanTiketPage() {
  // Keputusan mengubah daftar (tiket approved keluar dari antrean), jadi
  // daftar perlu dimuat ulang tanpa reload halaman.
  const [reloadKey, setReloadKey] = useState(0);
  const { decidingId, request, dialogs } = useQuickApprovalDecision({
    stage: 'INITIAL',
    onSuccess: () => setReloadKey((k) => k + 1),
  });

  return (
    <>
      <ApprovalQueue
        stage="INITIAL"
        hrefBase="/approver/persetujuan-tiket"
        actionLabel="Detail"
        onDecide={request}
        decidingId={decidingId}
        reloadKey={reloadKey}
      />
      {dialogs}
    </>
  );
}