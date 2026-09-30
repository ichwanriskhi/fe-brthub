/**
 * Konfigurasi kolom klaim untuk subkategori "Klaim Distribusi & Pengiriman".
 *
 * Dipakai bersama halaman pelapor (app/report/new) dan halaman reviewer
 * (app/reviewer/tiket/[id]) supaya label kolom + jumlah kolom selalu mengikuti
 * subkategori yang dipilih, bukan label generik hasil hardcode per halaman.
 *
 * Catatan kontrak penamaan (penting untuk pemanggil):
 * - app/report/new menyimpan subkategori sebagai CODE (`KLAIM_DISTRIBUSI_*`)
 *   karena code itu juga dipakai untuk payload backend.
 * - app/reviewer/tiket/[id] menyimpan subkategori sebagai NAME ("Salah Kirim")
 *   karena nama tsb dipakai untuk mencocokkan master data & handler actions.
 * Karena itu resolver di file ini menerima KEDUANYA (code atau name), dan
 * memprioritaskan data master DB (categoryRows) bila tersedia.
 */

export type ClaimItemRole =
  | 'returned_item'
  | 'delivered_item'
  | 'expected_item'
  | 'replacement_item'
  | 'pending_send_item';

export const CLAIM_ITEM_ROLES: { value: ClaimItemRole; label: string }[] = [
  { value: 'returned_item', label: 'Dikembalikan' },
  { value: 'delivered_item', label: 'Dikirim ke Konsumen' },
  { value: 'expected_item', label: 'Seharusnya Dikirim' },
  { value: 'replacement_item', label: 'Pengganti' },
  { value: 'pending_send_item', label: 'Perlu Dikirim' },
];

/** Konfigurasi kolom klaim per subkategori (Klaim Distribusi & Pengiriman) */
export interface SubcategoryClaimConfig {
  hasSecondColumn: boolean;
  role1: ClaimItemRole;
  role1Label: string;
  role2?: ClaimItemRole;
  role2Label?: string;
}

export const SUBCATEGORY_CLAIM_CONFIG: Record<string, SubcategoryClaimConfig> = {
  'KLAIM_DISTRIBUSI_SALAH_KIRIM': {
    hasSecondColumn: true,
    role1: 'returned_item',
    role1Label: 'Barang yang dikembalikan',
    role2: 'expected_item',
    role2Label: 'Barang yang seharusnya dikirim',
  },
  'KLAIM_DISTRIBUSI_SALAH_SO': {
    hasSecondColumn: true,
    role1: 'delivered_item',
    role1Label: 'Barang yang dikirim ke konsumen',
    role2: 'replacement_item',
    role2Label: 'Barang pengganti',
  },
  'KLAIM_DISTRIBUSI_KURANG_KIRIM': {
    hasSecondColumn: false,
    role1: 'pending_send_item',
    role1Label: 'Barang yang perlu dikirim',
  },
  'KLAIM_DISTRIBUSI_BARANG_HILANG': {
    hasSecondColumn: false,
    role1: 'pending_send_item',
    role1Label: 'Barang yang hilang',
  },
  'KLAIM_DISTRIBUSI_SALAH_ORDER': {
    hasSecondColumn: true,
    role1: 'delivered_item',
    role1Label: 'Barang yang dikirim ke konsumen',
    role2: 'replacement_item',
    role2Label: 'Barang pengganti',
  },
  'KLAIM_DISTRIBUSI_BARANG_REJECT': {
    hasSecondColumn: false,
    role1: 'returned_item',
    role1Label: 'Barang Reject',
  },
};

/** Prefix code kategori induk klaim distribusi (lihat CategorySeeder backend). */
export const CLAIM_SUBCATEGORY_PREFIX = 'KLAIM_DISTRIBUSI';

/**
 * Nama subkategori (master DB / label UI) → code config.
 * Dipakai bila nama di DB tidak sama persis dengan suffix code,
 * mis. "Salah Sales Order" → KLAIM_DISTRIBUSI_SALAH_SO.
 */
const CLAIM_NAME_TO_CODE: Record<string, string> = {
  'SALAH KIRIM': 'KLAIM_DISTRIBUSI_SALAH_KIRIM',
  'SALAH SO': 'KLAIM_DISTRIBUSI_SALAH_SO',
  'SALAH SALES ORDER': 'KLAIM_DISTRIBUSI_SALAH_SO',
  'KURANG KIRIM': 'KLAIM_DISTRIBUSI_KURANG_KIRIM',
  'BARANG HILANG': 'KLAIM_DISTRIBUSI_BARANG_HILANG',
  'SALAH ORDER': 'KLAIM_DISTRIBUSI_SALAH_ORDER',
  'BARANG REJECT': 'KLAIM_DISTRIBUSI_BARANG_REJECT',
};

function normalizeKey(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

/**
 * Normalisasi code ATAU nama subkategori → code config `KLAIM_DISTRIBUSI_*`.
 * Contoh yang dianggap sama: "KLAIM_DISTRIBUSI_SALAH_KIRIM", "SALAH_KIRIM",
 * "Salah Kirim", "salah-kirim".
 *
 * @returns code config, atau null bila bukan subkategori klaim yang dikenal.
 */
export function subcategoryCodeOf(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = normalizeKey(value);
  if (SUBCATEGORY_CLAIM_CONFIG[normalized]) return normalized;

  const prefixed = `${CLAIM_SUBCATEGORY_PREFIX}_${normalized}`;
  if (SUBCATEGORY_CLAIM_CONFIG[prefixed]) return prefixed;

  // Nama yang tidak sama dengan suffix code (mis. "Salah Sales Order").
  const byName = CLAIM_NAME_TO_CODE[value.trim().toUpperCase().replace(/\s+/g, ' ')];
  return byName && SUBCATEGORY_CLAIM_CONFIG[byName] ? byName : null;
}

/** Baris master kategori (subset dari /api/master/all yang dipakai halaman). */
export interface ClaimCategoryRow {
  code: string;
  name: string;
}

/**
 * Ambil konfigurasi kolom klaim untuk subkategori terpilih.
 *
 * `value` boleh code (`KLAIM_DISTRIBUSI_SALAH_KIRIM`) atau nama ("Salah Kirim").
 * `rows` = daftar kategori dari master data (lebih akurat karena memuat nama
 * resmi yang tersimpan di DB).
 *
 * @returns config, atau null bila subkategori tidak dikenal (mis. data lama
 *          yang tersimpan sebagai kategori induk) — pemanggil wajib punya
 *          fallback label generik.
 */
export function getClaimConfig(
  value: string | null | undefined,
  rows?: readonly ClaimCategoryRow[],
): SubcategoryClaimConfig | null {
  if (!value) return null;

  const target = value.trim();

  // 1. Master DB diprioritaskan: cocokkan code atau name, lalu pakai code-nya.
  const row = rows?.find((r) => r.code === target || r.name === target);
  if (row) {
    const code = subcategoryCodeOf(row.code) ?? subcategoryCodeOf(row.name);
    if (code) return SUBCATEGORY_CLAIM_CONFIG[code];
  }

  // 2. Resolve langsung dari nilai yang dipilih (code penuh / suffix / nama).
  const code = subcategoryCodeOf(target);
  return code ? SUBCATEGORY_CLAIM_CONFIG[code] : null;
}
