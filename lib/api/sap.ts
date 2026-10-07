import { authenticatedFetch } from './fetch-wrapper';

/**
 * Detail Sales Order dari SAP (`/api/auth/sap/order/detail?soNumber=...`).
 *
 * Dipanggil lewat BE Laravel — server-to-server dari BE ke SAP,
 * sehingga IP internal SAP tidak ter-expose di browser dan response
 * di-cache 10 menit di sisi server.
 */

export interface SapOrderItem {
  /** Kode barang (field ItemCode / itemCode pada lines). */
  code: string;
  /** Nama barang (field ItemName / itemName / Item Description). */
  name: string;
  /** Kode grup WANSIS (ItmsGrpCod) — ada bila upstream mengirimnya. */
  groupCode?: string;
  /** Nama grup WANSIS (ItmsGrpNam). */
  groupName?: string;
}

export interface SapMasterItem {
  /** Kode barang dari Master Item SAP. */
  code: string;
  /** Nama barang dari Master Item SAP. */
  name: string;
  /** Kode grup WANSIS — ada bila upstream mengirimnya. */
  groupCode?: string;
  /** Nama grup WANSIS. */
  groupName?: string;
}

export interface SapMasterItemsResponse {
  items: SapMasterItem[];
  total?: number;
  page?: number;
  perPage?: number;
  /** Hanya diisi bila backend benar-benar mengirim totalPages (saat ini tidak). */
  totalPages?: number;
  /**
   * true bila halaman ini penuh (== pageSize) → masih ada hasil di luar
   * jendela 50 teratas yang dikembalikan upstream (jalur pencarian `q`
   * tidak punya pagination — lihat catatan di `searchSapMasterItems`).
   */
  truncated?: boolean;
  /** Pesan kesalahan pencarian (jaringan/auth) untuk ditampilkan di dropdown. */
  error?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/** Endpoint BE untuk detail SO — server memanggil SAP secara internal. */
const SAP_ORDER_DETAIL_URL = `${API_BASE}/api/auth/sap/order/detail`;
const SAP_ITEMS_URL = '/api/auth/sap/items';

interface CacheEntry {
  items: SapOrderItem[];
  /** true jika sudah selesai mengambil (bukan sedang loading). */
  done: boolean;
}

/** Cache per nomor SO: sekali ambil, dipakai ulang untuk semua baris klaim. */
const cache = new Map<string, CacheEntry>();
let inflight: Promise<SapOrderItem[]> | null = null;

/** Apakah objek punya tipe record yang bisa diakses propertinya. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Grup barang WANSIS (ItmsGrpCod/ItmsGrpNam) — master tunggal lini produk.
 * Kode numerik upstream disimpan sebagai string apa adanya.
 */
export interface SapItemGroup {
  code: string | null;
  name: string;
}

let groupsCache: SapItemGroup[] | null = null;
let groupsInflight: Promise<SapItemGroup[]> | null = null;

/**
 * Daftar grup untuk dropdown Lini Produk & mapping kode→nama.
 * Cache modul: daftar 31 grup jarang berubah; gagal muat → [] (dropdown
 * kosong, bukan hardcode — prinsip yang sama seperti useMasterOptions).
 */
export async function getItemGroups(): Promise<SapItemGroup[]> {
  if (groupsCache) return groupsCache;
  if (groupsInflight) return groupsInflight;

  groupsInflight = (async () => {
    try {
      // Lewat wrapper: 401 memicu refresh + retry. Gagal total → [] (dropdown
      // kosong, bukan hardcode) — perilaku fallback dipertahankan.
      const res = await authenticatedFetch(`${API_BASE}/api/auth/sap/item-groups`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return [];
      const json = await res.json().catch(() => null);
      const payload = isRecord(json) && json.success ? json.data : json;
      const list = Array.isArray(payload) ? payload : [];
      const groups = list
        .filter(isRecord)
        .map((g) => ({
          code: g.code === null || g.code === undefined || g.code === '' ? null : String(g.code),
          name: String(g.name ?? ''),
        }))
        .filter((g) => g.name !== '');
      groupsCache = groups;
      return groups;
    } catch {
      return [];
    } finally {
      groupsInflight = null;
    }
  })();

  return groupsInflight;
}

/** Cari nama grup dari kodenya; fallback kode mentah bila tak dikenal. */
export function itemGroupName(groups: SapItemGroup[], code: string | null | undefined): string {
  if (!code) return '';
  return groups.find((g) => g.code === code)?.name ?? code;
}

/**
 * Flatten lines SAP ke daftar { code, name } unik.
 *
 * Satu ItemCode dapat muncul beberapa kali (mis. baris bonus) — duplikat
 * dihilangkan agar dropdown tidak menampilkan opsi ganda.
 */
function parseLines(lines: unknown): SapOrderItem[] {
  if (!Array.isArray(lines)) return [];

  const seen = new Set<string>();
  const items: SapOrderItem[] = [];

  for (const raw of lines) {
    if (!isRecord(raw)) continue;

    const code = String(raw.ItemCode ?? raw.itemCode ?? '').trim();
    if (!code || seen.has(code)) continue;

    const name = String(
      raw.ItemName ?? raw.itemName ?? raw['Item Description'] ?? '',
    ).trim();

    // Grup WANSIS bila upstream mengirimnya (ItmsGrpCod/ItmsGrpNam).
    const groupCodeRaw = raw.ItmsGrpCod ?? raw.itmsGrpCod ?? raw.itemGroupCode ?? null;
    const groupNameRaw = raw.ItmsGrpNam ?? raw.itmsGrpNam ?? raw.itemGroupName ?? null;

    seen.add(code);
    items.push({
      code,
      name,
      ...(groupCodeRaw !== null && groupCodeRaw !== undefined && String(groupCodeRaw) !== ''
        ? { groupCode: String(groupCodeRaw) }
        : {}),
      ...(groupNameRaw ? { groupName: String(groupNameRaw) } : {}),
    });
  }

  return items;
}

/**
 * Ambil item barang untuk sebuah nomor SO melalui BE (server-to-server ke SAP).
 *
 * Mengembalikan array kosong bila SO tidak ditemukan atau error —
 * pemanggil tetap bisa men-submit klaim tanpa dropdown, tidak terblokir.
 */
export async function fetchSapOrderItems(soNumber: string): Promise<SapOrderItem[]> {
  const key = soNumber.trim();
  if (!key) return [];

  const cached = cache.get(key);
  if (cached) return cached.items;
  if (inflight) return inflight;

  inflight = (async () => {
    const url = `${SAP_ORDER_DETAIL_URL}?soNumber=${encodeURIComponent(key)}`;

    // Lewat wrapper: 401 memicu refresh + retry. Throw dipertahankan agar
    // pemanggil (loadSapOrderItems → onError) tetap menerima errornya.
    const res = await authenticatedFetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`SAP API error: ${res.status}`);

    const json = await res.json().catch(() => null);
    // BE membungkus response dalam { success, data }; data berisi payload SAP asli
    const payload = isRecord(json) && json.success ? json.data : json;
    const lines = isRecord(payload) ? payload.lines : [];

    const items = parseLines(lines);
    cache.set(key, { items, done: true });
    return items;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/**
 * Versi tanpa throw untuk dipanggil langsung dari komponen: state loading &
 * error dikelola pemanggil.
 */
export function loadSapOrderItems(
  soNumber: string,
  onDone: (items: SapOrderItem[]) => void,
  onError: (message: string) => void,
): void {
  const key = soNumber.trim();
  if (!key) {
    onDone([]);
    return;
  }

  fetchSapOrderItems(key)
    .then(onDone)
    .catch((err: unknown) => {
      onError(err instanceof Error ? err.message : 'Gagal memuat daftar barang dari SO.');
    });
}

/**
 * Cari master data item dari SAP untuk searchable dropdown wrongItemCode.
 *
 * CATATAN PAGINATION: endpoint upstream mengabaikan parameter `page` pada
 * jalur pencarian (q) — yang dikembalikan selalu jendela 50 hasil teratas.
 * Karena itu respons menandai `truncated` saat halaman penuh, dan `totalPages`
 * hanya diisi bila backend benar-benar mengirimnya (jangan menebak).
 *
 * @param query - Keyword pencarian
 * @param page - Nomor halaman (default 1)
 */
export async function searchSapMasterItems(
  query: string,
  page: number = 1,
): Promise<SapMasterItemsResponse> {
  if (!query.trim()) return { items: [] };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
  const url = `${API_URL}${SAP_ITEMS_URL}?q=${encodeURIComponent(query)}&page=${page}`;

  try {
    // Lewat wrapper: 401 memicu refresh + retry. Error lain tetap dilempar
    // agar dropdown menampilkan pesannya (kontrak error dipertahankan).
    const res = await authenticatedFetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`SAP API error: ${res.status}`);
    }

    const json = await res.json();

    // Handle response dari backend (yang sudah di-wrap oleh WansisService)
    // Backend return: { success: true, data: { items: [...], page: 1, pageSize: 50 } }
    if (json.success && json.data) {
      const items = Array.isArray(json.data.items) ? json.data.items : Array.isArray(json.data) ? json.data : [];
      const pageSize = Number(json.data.pageSize) || 50;
      const totalPages = Number(json.data.totalPages);
      return {
        items: items.map((item: unknown) => {
          if (!isRecord(item)) return { code: '', name: '' };
          // SAP API uses ItemCode and ItemName (case-sensitive)
          const groupCodeRaw = item.ItmsGrpCod ?? item.itemGroupCode ?? null;
          const groupNameRaw = item.ItmsGrpNam ?? item.itemGroupName ?? null;
          return {
            code: String(item.ItemCode || item.code || item.itemCode || '').trim(),
            name: String(item.ItemName || item.name || item.itemName || '').trim(),
            ...(groupCodeRaw !== null && groupCodeRaw !== undefined && String(groupCodeRaw) !== ''
              ? { groupCode: String(groupCodeRaw) }
              : {}),
            ...(groupNameRaw ? { groupName: String(groupNameRaw) } : {}),
          };
        }),
        page: Number(json.data.page) || page,
        perPage: pageSize,
        total: Number.isFinite(Number(json.data.total)) ? Number(json.data.total) : undefined,
        totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : undefined,
        // Jangan menebak ada halaman berikutnya dari panjang hasil — cukup
        // tandai hasil kena batas 50 teratas agar UI menampilkan hint.
        truncated: items.length >= pageSize,
      };
    }

    // Fallback: jika backend mengembalikan array langsung
    if (Array.isArray(json)) {
      return {
        items: json.map((item: unknown) => {
          if (!isRecord(item)) return { code: '', name: '' };
          const groupCodeRaw = item.ItmsGrpCod ?? item.itemGroupCode ?? null;
          const groupNameRaw = item.ItmsGrpNam ?? item.itemGroupName ?? null;
          return {
            code: String(item.ItemCode || item.code || item.itemCode || '').trim(),
            name: String(item.ItemName || item.name || item.itemName || '').trim(),
            ...(groupCodeRaw !== null && groupCodeRaw !== undefined && String(groupCodeRaw) !== ''
              ? { groupCode: String(groupCodeRaw) }
              : {}),
            ...(groupNameRaw ? { groupName: String(groupNameRaw) } : {}),
          };
        }),
        page,
        perPage: 50,
        truncated: json.length >= 50,
      };
    }

    return { items: [] };
  } catch (error) {
    console.error('Error searching SAP master items:', error);
    const message = error instanceof Error ? error.message : 'Gagal mencari Master SAP.';
    return { items: [], error: message };
  }
}
