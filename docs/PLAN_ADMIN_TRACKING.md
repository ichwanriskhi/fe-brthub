# Rencana: Tracking Masalah Sampai Akar + Role + Customer + Reporter

> Status: **DRAFT — menunggu konfirmasi**. Frontend-only (mock), belum backend.

## Konteks & masalah inti

Saat ini tiket menyimpan **string bebas** untuk hal-hal yang seharusnya ber-ID:

| Field tiket sekarang | Nilai contoh | Master data sebenarnya |
|---|---|---|
| `category` | `"Klaim Distribusi & Pengiriman"` | Kategori: Vehicle, Facility, IT Service… |
| `productLine` | `"Throttle Body"` | Lini Produk: ECU, CDI, CVT… |
| `reporterName` | `"Dimas Marketing"` | Pegawai: Dimas P. (emp-?) |
| `customerData.name` | `"Juliani 78"` | **tidak ada master customer** |

Akibatnya **tidak mungkin** menjawab "produk X punya berapa laporan masalah, berapa yang selesai" — karena tidak ada join dari tiket ke master. Semua requirement (produk, kategori, customer, reporter) bermuara ke **satu akar masalah: tiket belum ter-link by ID ke master data**.

---

## 0. Tombol "Detail Laporan" — Verifikasi Akhir (reviewer) — *quick win*

**Sekarang:** tombol ada di dalam card "Resolusi Diajukan Handler" (baris avatar handler).
**Handler:** tombol "Lihat Detail" ada di **header card**, sejajar dengan badge prioritas/tipe/status.

**Ubah:** pindahkan tombol `Detail Laporan` ke header card di `app/reviewer/tiket/[id]/tinjauan-akhir/page.tsx`, posisi & style sama persis dengan handler (`variant="outline" size="sm"` setelah baris badge). Modal `reportOpen` tidak berubah.

Estimasi: 1 patch kecil, ~5 menit.

---

## 1. Fondasi data (SYARAT sebelum item 2–5)

Tanpa ini, item 2–5 tidak bisa diimplementasikan dengan benar.

### 1a. Type `Ticket` — tambah field link

```ts
// lib/types/ticket.ts
export interface Ticket {
  // ...existing fields...

  /** Hasil identifikasi admin (workflow reporter identification) */
  reporterType?: 'EMPLOYEE' | 'CUSTOMER';
  reporterEmployeeId?: string;   // link → EmployeeEntry.id
  reporterCustomerId?: string;   // link → CustomerEntry.id

  /** Link ke master data (bukan string bebas) */
  categoryId?: string;           // link → CategoryEntry.id
  subcategoryId?: string;        // link → CategoryEntry.id
  productId?: string;            // link → ProductLineEntry.id
}
```

- String lama (`category`, `subcategory`, `productLine`, `reporterName`, `customerData`) **tetap dipakai untuk display** — tidak breaking.
- Field baru sumbernya dari: form pembuatan tiket (kategori/product terpilih) + hasil modal Identify Reporter (reporterType/employeeId/customerId).

### 1b. Master data baru: Customer

```ts
// lib/types/admin.ts
export interface CustomerEntry {
  id: string;
  code: string;              // kode unik, beda dengan id
  name: string;
  phone: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}
```

`lib/mock/admin.ts` → `MOCK_CUSTOMERS` (~8 entri, sebagian match dengan `customerData` di tiket existing: Juliani 78, EDDY, Toko Jaya Motor, Rifan Kusuma…).

### 1c. Role pegawai

```ts
// lib/types/admin.ts — EmployeeEntry tambah:
export type AppRole = 'ADMIN' | 'REVIEWER' | 'HANDLER' | 'UNIT' | 'STAFF';

export interface EmployeeEntry {
  // ...
  role: AppRole;             // role aplikasi (untuk login)
  // accountStatus tetap: ACTIVE | NOT_ACTIVATED | NO_ACCOUNT
}
```

Aturan: `STAFF` = pegawai tanpa akses aplikasi (hanya bisa jadi reporter). Role menentukan menu yang terlihat setelah login. Admin tidak melihat/mengatur password (tetap prinsip lama).

### 1d. Lib agregasi tracking

```ts
// lib/mock/analytics.ts
type ProblemStats = { total: number; active: number; resolved: number };

problemStatsByProduct(productId): ProblemStats        // item 2
problemStatsByCategory(categoryId, includeSub): ProblemStats  // item 3
customerTicketStats(customerId): ProblemStats         // item 5
employeeReportStats(employeeId): ProblemStats         // item 6 (reporter)
```

Definisi: `active` = status OPEN/IN_PROGRESS/PENDING_REVIEW/REWORK_REQUIRED, `resolved` = CLOSED/REJECTED.

### 1e. Rekonsiliasi mock data

Tambah field link ke 7 tiket mock yang ada (categoryId, productId, reporterEmployeeId/customerId) supaya tracking langsung terlihat di demo. Tanpa ini, semua angka akan 0.

---

## 2. Tracking produk bermasalah (Lini Produk)

**Lokasi:** Master Data → tab **Lini Produk** (sudah ada, tinggal perluas).

Per baris produk tambah kolom **"Laporan Masalah"** berisi chip:

```
[ 2 aktif ] [ 1 selesai ] 3 total
```

- Klik chip → buka **Monitoring Tiket** dengan filter produk aktif (bisa lewat filter baru `productId` di TableToolbar, atau dialog drill-down berisi list tiket produk tsb).
- Warna chip: ada aktif → amber; semua selesai → emerald; belum ada laporan → muted "-".
- Mobile card: tampilkan chips yang sama.

**Detail produk (opsional):** klik nama produk → dialog berisi semua tiket masalah produk itu + status. *Pertimbangkan: cukup chip + drill-down saja dulu.*

---

## 3. Tracking kategori masalah

**Lokasi:** Master Data → tab **Kategori**.

- Kategori **utama**: chip agregat (jumlah sendiri + semua sub-nya) — `[ 3 aktif ] [ 2 selesai ] 5 total`.
- **Sub kategori**: chip sendiri.
- Klik chip → drill-down seperti produk.

Karena kategori sudah punya struktur parent/sub (parentId), agregasi utama menjumlahkan sub. Ini menjawab "kategori ini punya tiket aktif berapa, selesai berapa, total berapa".

---

## 4. Penentuan role pegawai

**Lokasi:** Pegawai & Akun → halaman Pegawai (sudah ada).

- Tabel: tambah kolom **Role** antara Posisi dan Status Akun (badge: `Admin`/`Reviewer`/`Handler`/`Unit`/`Staff`).
- Dialog Tambah/Ubah Pegawai: tambah field **Role Aplikasi** (Select: 5 opsi di atas), wajib.
- Filter toolbar: tambah filter Role.
- Pelengkap: di Dashboard admin, card "Akun Butuh Aktivasi" tetap; tidak ada perubahan workflow password.

---

## 5. Data customer + tracking tiketnya

**Lokasi baru:** sidebar group **PEGAWAI & AKUN** → item baru **Pelanggan** (`/admin/customer`).

Halaman Pelanggan (struktur identik halaman Pegawai):
- Stats card: Total Pelanggan • Pelanggan Aktif • Pelanggan dengan Tiket Aktif • Tiket Selesai (akumulatif).
- Tabel: Kode | Nama | Telepon | Alamat | Tiket (aktif/selesai/total) | Status | Aksi.
- Kolom **Tiket** menampilkan chip `[ 1 aktif ] [ 2 selesai ] 3 total`.
- Klik baris/nama → **detail pelanggan**: info + section **"Tiket Pelanggan"** (list tiket yang `reporterCustomerId` = customer tsb ATAU `customerData.name` match — untuk tiket existing yang belum ber-ID).
- Mobile: card view seperti halaman lain.

Group sidebar `PEGAWAI & AKUN` di-rename jadi `PEGAWAI & PELANGGAN` (label saja), berisi: Pegawai, Pelanggan.

---

## 6. Reporter tracking (pelapor = pegawai atau customer)

Dua tempat, satu pattern:

**a. Detail Pegawai** (`/admin/pegawai/[id]` — halaman baru) → section **"Tiket yang Dilaporkan"**: list tiket di mana `reporterEmployeeId` = pegawai tsb, plus chip `[ X aktif ] [ Y selesai ] Z total`.

**b. Detail Pelanggan** (item 5) → section sama, source `reporterCustomerId`.

**c. Detail Tiket (admin & reviewer)** → area "Reporter Information" yang sudah ada: kalau reporter sudah teridentifikasi sebagai Employee, tampilkan link "Lihat profil pegawai →"; kalau Customer, "Lihat profil pelanggan →". Ini menutup loop tracking dari arah tiket→reporter.

Mock: beberapa tiket existing punya `reporterName: 'Dimas Marketing'` → link ke pegawai Dimas P. (emp-1) sehingga section langsung terisi.

---

## Urutan implementasi (batch)

| Batch | Isi | Ukuran |
|---|---|---|
| **A** | Item 0 (tombol Detail Laporan) | 1 patch |
| **B** | Item 1a–1e (fondasi data: type, customer master, role, analytics, rekonsiliasi mock) | type + mock + lib baru |
| **C** | Item 2 + 3 (chip tracking di Master Data Lini Produk & Kategori + drill-down) | perluas 1 file |
| **D** | Item 4 (role pegawai: tabel, dialog, filter) | perluas 1 file |
| **E** | Item 5 (halaman Pelanggan baru + sidebar) | 1 halaman + layout |
| **F** | Item 6 (section reporter tracking di detail pegawai/pelanggan/tiket) | 3 file |

Batch A–B dikerjakan dulu karena C–F bergantung. Setiap batch diakhiri `tsc` + `next build` hijau.

---

## Yang perlu konfirmasi

1. **Lokasi data customer** — menu baru "Pelanggan" di group `PEGAWAI & PELANGGAN` (rekomendasi), atau jadi tab ke-5 di Master Data?
2. **Nilai role** — 5 opsi `ADMIN | REVIEWER | HANDLER | UNIT | STAFF`? (`STAFF` = pegawai no-app-access, hanya reporter). Ada role lain (mis. Direktur)?
3. **Drill-down tracking** — cukup chip + langsung filter Monitoring Tiket (rekomendasi, paling sederhana), atau dialog detail per produk/kategori berisi list tiket?
4. **Detail pegawai/pelanggan** — halaman detail baru (rekomendasi, ruang untuk section reporter tracking), atau dialog saja?
5. **Scope** — kerjakan semua batch A–F, atau subset dulu?
