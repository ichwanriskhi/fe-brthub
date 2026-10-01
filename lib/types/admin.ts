/**
 * Tipe master data & pegawai untuk bagian Admin.
 * Frontend-only (mock) — nanti diganti API/store.
 */

export interface MasterDataEntry {
  id: string;
  name: string;
  description?: string;
  /** True = aktif; false = nonaktif (nonaktif tidak tampil di form pilihan system) */
  isActive: boolean;
  /** Sorting display */
  sortOrder: number;
}

export interface CategoryEntry extends MasterDataEntry {
  parentId?: string;
  code: string;
}

export interface DepartmentEntry extends MasterDataEntry {
  unitCode: string;
  managerName?: string;
}

export interface PositionEntry extends MasterDataEntry {
  /** Hormone hierarchical level — tinggi = lebih senior (Director > Manager) */
  hierarchyLevel: number;
  departmentId?: string;
  code: string;
}

export interface ProductLineEntry extends MasterDataEntry {
  productCode: string;
  description?: string;
}

export type MasterDataType = 'category' | 'department' | 'position' | 'productLine';

export type AccountStatus = 'ACTIVE' | 'NOT_ACTIVATED' | 'NO_ACCOUNT';

/** Role aplikasi — menentukan menu & akses setelah login. STAFF = hanya reporter, tanpa akses app. */
export type AppRole = 'ADMIN' | 'REVIEWER' | 'HANDLER' | 'UNIT' | 'MANAGER' | 'STAFF';

export const APP_ROLES: { value: AppRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'REVIEWER', label: 'Reviewer' },
  { value: 'HANDLER', label: 'Handler' },
  { value: 'UNIT', label: 'Unit' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'STAFF', label: 'Staff (Reporter Saja)' },
];

/** Role yang bisa di-assign ke user di tabel `roles` (bukan Manager/Staff turunan). */
export const ASSIGNABLE_APP_ROLES: { value: Exclude<AppRole, 'MANAGER' | 'STAFF'>; label: string; dbName: string }[] = [
  { value: 'ADMIN', label: 'Admin', dbName: 'admin' },
  { value: 'REVIEWER', label: 'Reviewer', dbName: 'reviewer' },
  { value: 'HANDLER', label: 'Handler', dbName: 'handler' },
  { value: 'UNIT', label: 'Unit', dbName: 'unit' },
];

export interface EmployeeEntry {
  id: string;
  userId: string;
  employeeNumber: string;
  name: string;
  phone: string;
  email?: string;
  departmentId: string;
  positionId: string;
  departmentName: string;
  positionName: string;
  /** 0 = hierarchy level posisi */
  hierarchyLevel: number;
  /** Role utama (kompatibilitas tampilan lama). */
  role: AppRole;
  /** Semua role aplikasi yang dimiliki user. */
  roles: AppRole[];
  accountStatus: AccountStatus;
  /** True bila akun sudah punya password di Auth Service. Null = tidak diketahui. */
  hasPassword: boolean | null;
  /** True bila admin sudah kirim link setup/reset password */
  activationLinkSent: boolean;
  hiredAt: string;
}

/** Master data customer (pelanggan teridentifikasi) */
export interface CustomerEntry {
  id: string;
  /** Kode unik customer — beda dengan id internal */
  code: string;
  name: string;
  phone: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

/** Kategori monitor reporter (admin identifikasi) */
export type ReporterIdentificationStatus = 'UNKNOWN' | 'EMPLOYEE' | 'CUSTOMER';