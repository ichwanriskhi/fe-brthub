import type { Ticket, TicketActivity, TicketChatMessage } from '../types/ticket';

// -------------------------------------------------------------------
// Domain konstan workflow reviewer (dari analisis project lama fe-brthub)
// -------------------------------------------------------------------

export const CATEGORIES = ['Klaim Distribusi & Pengiriman', 'IT Service', 'Fasilitas Kantor', 'Garansi & Servis Kendaraan'] as const;

export const SUBCATEGORY_MAP: Record<string, string[]> = {
  'Klaim Distribusi & Pengiriman': [
    'Salah Kirim',
    'Kurang Kirim',
    'Salah Order',
    'Salah Sales Order',
    'Barang Missing / Hilang',
  ],
  'IT Service': ['Network / Wi-Fi', 'Aplikasi', 'Hardware'],
  'Fasilitas Kantor': ['Permintaan Barang', 'Fasilitas Gedung', 'Fasilitas Kantor'],
  'Garansi & Servis Kendaraan': ['Masalah Berulang ECU', 'Klaim Garansi', 'Servis Kendaraan'],
};

export const HANDLER_ACTIONS = [
  {
    id: 'RETURN_AND_REPLACE',
    label: 'Return & Replace',
    description: 'Kembalikan barang yang salah dan kirim barang pengganti.',
    recommendedFor: ['Salah Kirim', 'Salah Sales Order'],
  },
  {
    id: 'REPLACE_ONLY',
    label: 'Replace Only',
    description: 'Kirim barang pengganti tanpa pengembalian barang.',
    recommendedFor: ['Kurang Kirim', 'Barang Missing / Hilang'],
  },
  {
    id: 'ADDITIONAL_SHIPMENT',
    label: 'Additional Shipment',
    description: 'Kirim tambahan barang untuk melengkapi pesanan.',
    recommendedFor: ['Kurang Kirim'],
  },
] as const;

export const ROUTING_UNITS = ['Distribution & Logistics', 'Sales Operations', 'Warehouse Operations', 'Customer Service'] as const;

export const HANDLERS = [
  { id: 'dimas', name: 'Dimas P.', unit: 'Technical Handler' },
  { id: 'budi', name: 'Budi S.', unit: 'Distribution Handler' },
  { id: 'rina', name: 'Rina A.', unit: 'Operations Handler' },
] as const;

export const PRIORITY_INFO: Record<string, string> = {
  A: 'Tiket ini membutuhkan perhatian segera.',
  B: 'Tiket ini membutuhkan perhatian tinggi.',
  C: 'Tiket ini dapat ditangani dengan prioritas normal.',
};

export const DISTRIBUTION_CATEGORY = 'Klaim Distribusi & Pengiriman';

export function isDistributionClaim(category: string) {
  return category === DISTRIBUTION_CATEGORY;
}
