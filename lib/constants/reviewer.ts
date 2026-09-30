import type { Ticket, TicketActivity, TicketChatMessage } from '../types/ticket';

// -------------------------------------------------------------------
// Domain konstan workflow reviewer (dari analisis project lama fe-brthub)
// -------------------------------------------------------------------

export const CATEGORIES = ['Klaim Distribusi & Pengiriman', 'Produk & Kendaraan', 'Sarana Prasarana'] as const;

export const SUBCATEGORY_MAP: Record<string, string[]> = {
  'Klaim Distribusi & Pengiriman': [
    'Salah kirim',
    'Salah SO',
    'Kurang kirim',
    'Barang hilang',
    'Salah order',
  ],
  'Produk & Kendaraan': [
    'Perawatan Berkala',
    'Kerusakan Produk',
    'Kendala Pemasangan',
    'Suku Cadang',
    'Lainnya',
  ],
  'Sarana Prasarana': [
    'Fasilitas Kantor',
    'Gedung & Lingkungan',
    'Peralatan Kerja',
    'Kebersihan & Keamanan',
    'Lainnya',
  ],
};

/**
 * Daftar statis aksi handler — HANYA fallback bila master backend
 * (`GET /api/master/all` → actions/category_actions) belum termuat.
 * Label, opsi per subkategori, dan rekomendasi bersumber dari backend
 * (tabel `actions` + `category_actions`), bukan dari sini.
 */
export const HANDLER_ACTIONS = [
  {
    id: 'RETURN_AND_REPLACE',
    label: 'Return & Replace',
    description: 'Kembalikan barang yang salah dan kirim barang pengganti.',
  },
  {
    id: 'REPLACE_ONLY',
    label: 'Replace Only',
    description: 'Kirim barang pengganti tanpa pengembalian barang.',
  },
  {
    id: 'ADDITIONAL_SHIPMENT',
    label: 'Additional Shipment',
    description: 'Kirim tambahan barang untuk melengkapi pesanan.',
  },
] as const;

export const WORKFLOW_OPTIONS = [
  { value: 'Direksi', apiValue: 'DIREKSI', label: 'Direksi', description: 'Eskalasi ke level Direksi perusahaan.' },
  { value: 'General Manager', apiValue: 'GENERAL_MANAGER', label: 'General Manager', description: 'Diteruskan ke General Manager terkait.' },
  { value: 'Operational Manager', apiValue: 'OPERATIONAL_MANAGER', label: 'Operational Manager', description: 'Diteruskan ke Operational Manager.' },
  { value: 'Division', apiValue: 'DIVISION', label: 'Division', description: 'Diteruskan ke divisi/unit yang bertanggung jawab.' },
] as const;

export type WorkflowTarget = typeof WORKFLOW_OPTIONS[number]['value'];

export const WORKFLOW_API_TO_LABEL: Record<string, string> = Object.fromEntries(
  WORKFLOW_OPTIONS.map((o) => [o.apiValue, o.value]),
);

export function workflowLabelFromApi(apiValue: string | null | undefined): WorkflowTarget {
  if (apiValue && WORKFLOW_API_TO_LABEL[apiValue]) {
    return WORKFLOW_API_TO_LABEL[apiValue] as WorkflowTarget;
  }
  return 'Division';
}

export const ROUTING_UNITS = ['Distribution & Logistics', 'Sales Operations', 'Warehouse Operations', 'Customer Service'] as const;

/**
 * Opsi tingkat prioritas — HARUS sinkron dengan seeder backend
 * (be-brthub: WorkflowMasterSeeder → priority_levels).
 *
 * code dipakai sebagai value filter/label di UI, id dipakai saat
 * mengirim ke API (backend validasi `exists:priority_levels,id`).
 */
export const PRIORITY_OPTIONS = [
  { id: '1', code: 'A', label: 'Prioritas A (Tinggi)' },
  { id: '2', code: 'B', label: 'Prioritas B (Normal)' },
  { id: '3', code: 'C', label: 'Prioritas C (Rendah)' },
] as const;

export const PRIORITY_ID_BY_CODE: Record<string, string> = Object.fromEntries(
  PRIORITY_OPTIONS.map((p) => [p.code, p.id]),
);

export const PRIORITY_LABEL_BY_CODE: Record<string, string> = Object.fromEntries(
  PRIORITY_OPTIONS.map((p) => [p.code, p.label]),
);

export function priorityIdFromCode(code: string | null | undefined): string | undefined {
  return code ? PRIORITY_ID_BY_CODE[code] : undefined;
}

export function priorityLabelFromCode(code: string | null | undefined): string {
  return code ? (PRIORITY_LABEL_BY_CODE[code] ?? code) : 'Belum ditentukan';
}

export const PRIORITY_INFO: Record<string, string> = {
  A: 'Tiket ini membutuhkan perhatian segera.',
  B: 'Tiket ini membutuhkan perhatian tinggi.',
  C: 'Tiket ini dapat ditangani dengan prioritas normal.',
};

export const DISTRIBUTION_CATEGORY = 'Klaim Distribusi & Pengiriman';

export function isDistributionClaim(category: string) {
  return category === DISTRIBUTION_CATEGORY;
}
