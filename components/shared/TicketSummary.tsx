'use client';

import * as React from 'react';
import { Building, FileText, Truck, User, Bike, FileCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DetailList, type DetailItem } from '@/components/shared/DetailList';
import { UserDetailModal, type UserDetailData } from '@/components/shared/UserDetailModal';
import { reporterDisplay, customerDisplayName } from '@/lib/utils/ticket-display';
import { useItemGroupName } from '@/hooks/use-item-groups';
import type { Ticket } from '@/lib/types/ticket';

/**
 * Kartu "Ringkasan Tiket" — seragam di semua halaman detail (unit, reviewer,
 * approver, admin, handler).
 *
 * FIELD LIST DIKUNCI DI SINI, bukan per halaman. Sebelumnya tiap halaman
 * menyusun sendiri sehingga isinya berbeda-beda: unit tidak menampilkan Sales
 * dan Lini Produk, reviewer/approver tidak menampilkan Unit Tujuan, dan
 * label-nya campur "Pelanggan" vs "Customer".
 *
 * Yang TIDAK ada di sini karena bukan identitas tiket:
 * - Kategori / Sub Kategori → ada di `Data Laporan` / form edit
 * - Unit Tujuan → ada di panel routing / penugasan
 *
 * Modal detail pelapor & pelanggan dimiliki komponen ini, supaya ketiga
 * halaman tidak perlu menyalin state + handler yang sama.
 */
export function TicketSummary({
  ticket,
  showWansis = false,
}: {
  ticket: Ticket;
  /**
   * Tampilkan "Nomor Report WANSIS" bila tersedia.
   *
   * Default `false` supaya halaman reporter — yang tidak boleh menampilkan
   * referensi internal WANSIS — cukupomit prop ini. Halaman internal
   * (unit, reviewer, approver, handler, admin) mengoper `showWansis`.
   *
   * Tetap nullable: kalau tiket belum pernah dikirim ke WANSIS, atau
   * pengajuannya `queued`/`failed`, field-nya TIDAK dirender sama sekali.
   */
  showWansis?: boolean;
}) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalData, setModalData] = React.useState<UserDetailData | null>(null);
  // productLine menyimpan KODE grup — tampilkan namanya, fallback kode mentah.
  const productLineName = useItemGroupName(ticket.productLine);

  const open = (title: string, data: UserDetailData) => {
    setModalTitle(title);
    setModalData(data);
    setModalOpen(true);
  };

  const openReporter = () => {
    open('Detail Pelapor', {
      name: ticket.reporterName,
      email: ticket.reporterEmail,
      phone: ticket.reporterPhone,
      address: ticket.reporterAddress,
      department: ticket.reporterDepartment,
      position: ticket.reporterPosition,
      isEmployee: ticket.reporterType === 'EMPLOYEE' || !!ticket.reporterDepartment,
    });
  };

  // `customerDisplayName` hanya mengembalikan nilai bila laporan memang atas
  // nama customer — lebih aman daripada sekadar mengecek `customerData?.name`.
  const customerName = customerDisplayName(ticket);
  const openCustomer = () => {
    if (!customerName || !ticket.customerData) return;
    open('Detail Pelelanggan', {
      name: customerName,
      email: ticket.customerData.email,
      phone: ticket.customerData.phone,
      address: ticket.customerData.address,
      isEmployee: false,
    });
  };

  /* Nama pelapor / pelanggan adalah tautan ke modal detail. Dipakai Button
     shadcn dengan variant link, bukan elemen button HTML biasa. */
  const link = (label: string, onClick: () => void) => (
    <Button variant="link" size="sm" onClick={onClick}>
      {label}
    </Button>
  );

  const items: DetailItem[] = [
    { label: 'Pelapor', icon: User, value: link(reporterDisplay(ticket), openReporter) },
    ...(customerName
      ? [
          {
            label: 'Pelanggan',
            icon: Building,
            value: link(customerName, openCustomer),
          },
        ]
      : []),
    ...(ticket.soNumber ? [{ label: 'Nomor SO', icon: FileText, value: ticket.soNumber }] : []),
    ...(ticket.salesName ? [{ label: 'Sales', icon: User, value: ticket.salesName }] : []),
    ...(ticket.productLine ? [{ label: 'Lini Produk', icon: Truck, value: productLineName || ticket.productLine }] : []),
    ...(ticket.vehicleModel
      ? [{ label: 'Model Kendaraan', icon: Bike, value: ticket.vehicleModel }]
      : []),
    /* Nomor report WANSIS - kelasnya sama dengan Nomor SO: referensi dokumen
       eksternal. Hanya untuk klaim distribusi, dan HANYA kalau WANSIS sudah
       mengembalikan nomor. Kalau belum ada, label-nya ikut hilang (bukan
       tampil dengan nilai "-"). Reporter lewat: showWansis tidak dioper. */
    ...(showWansis && ticket.wansisReportNumber
      ? [{ 
          label: 'Nomor Report WANSIS', 
          icon: FileCheck, 
          value: (
            <a 
              href={`${process.env.NEXT_PUBLIC_WANSIS_URL || 'http://192.168.11.228:3000'}/wrong-delivery/${ticket.wansisReportNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              {ticket.wansisReportNumber}
            </a>
          )
        }]
      : []),
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ringkasan Tiket</CardTitle>
          <CardDescription>Identitas tiket, pihak terkait, dan data pendukung.</CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList items={items} />
        </CardContent>
      </Card>

      <UserDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={modalTitle}
        user={modalData}
      />
    </>
  );
}