'use client';

import { use } from 'react';
import { AdminTicketDetail } from '@/components/shared/AdminTicketDetail';

export default function AdminTicketHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdminTicketDetail id={id} backHref="/admin/ticket/history" backLabel="Riwayat Tiket" />;
}