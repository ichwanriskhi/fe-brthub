import type {
  CategoryEntry,
  DepartmentEntry,
  PositionEntry,
  ProductLineEntry,
  EmployeeEntry,
  CustomerEntry,
} from '@/lib/types/admin';

/** ─── Master Data ─────────────────────────────────────────── */

export const MOCK_CATEGORIES: CategoryEntry[] = [
  { id: 'cat-1', name: 'Vehicle', parentId: undefined, isActive: true, sortOrder: 10, description: 'Klaim kendaraan' },
  { id: 'cat-2', name: 'Vehicle Maintenance', parentId: 'cat-1', isActive: true, sortOrder: 11, description: 'Pengerjaan & pemeliharaan kendaraan' },
  { id: 'cat-3', name: 'Vehicle Operation', parentId: 'cat-1', isActive: true, sortOrder: 12, description: 'Operasi kendaraan' },
  { id: 'cat-4', name: 'Vehicle Part', parentId: 'cat-1', isActive: true, sortOrder: 13, description: 'Spare part kendaraan' },
  { id: 'cat-5', name: 'Engine Part', parentId: 'cat-1', isActive: true, sortOrder: 14, description: 'Part motor' },
  { id: 'cat-6', name: 'Electrical Part', parentId: 'cat-1', isActive: true, sortOrder: 15, description: 'Part elektronik' },
  { id: 'cat-7', name: 'Facility', parentId: undefined, isActive: true, sortOrder: 20, description: 'Klaim fasilitas' },
  { id: 'cat-8', name: 'Office Facility', parentId: 'cat-7', isActive: true, sortOrder: 21, description: 'Fasilitas kantor' },
  { id: 'cat-9', name: 'Building Facility', parentId: 'cat-7', isActive: true, sortOrder: 22, description: 'Fasilitas gedung' },
  { id: 'cat-10', name: 'IT Service', parentId: undefined, isActive: true, sortOrder: 30, description: 'Klaim IT' },
  { id: 'cat-11', name: 'Network', parentId: 'cat-10', isActive: true, sortOrder: 31, description: 'Nerwork & internet' },
  { id: 'cat-12', name: 'Application', parentId: 'cat-10', isActive: true, sortOrder: 32, description: 'Aplikasi sistem' },
  { id: 'cat-13', name: 'Hardware', parentId: 'cat-10', isActive: true, sortOrder: 33, description: 'Hardware komputer' },
  { id: 'cat-distribusi', name: 'Klaim Distribusi & Pengiriman', parentId: undefined, isActive: true, sortOrder: 40, description: 'Klaim kesalahan distribusi barang' },
  { id: 'cat-distribusi-salah-kirim', name: 'Salah Kirim', parentId: 'cat-distribusi', isActive: true, sortOrder: 41, description: 'Barang terkirim tidak sesuai alamat/pesanan' },
  { id: 'cat-distribusi-salah-order', name: 'Salah Order', parentId: 'cat-distribusi', isActive: true, sortOrder: 42, description: 'Kesalahan input pesanan' },
  { id: 'cat-fasilitas-barang', name: 'Permintaan Barang', parentId: 'cat-7', isActive: true, sortOrder: 23, description: 'Permintaan barang fasilitas kantor' },
  { id: 'cat-garansi', name: 'Garansi & Servis Kendaraan', parentId: undefined, isActive: true, sortOrder: 50, description: 'Klaim garansi & servis' },
  { id: 'cat-garansi-ecu', name: 'Masalah Berulang ECU', parentId: 'cat-garansi', isActive: true, sortOrder: 51, description: 'Masalah ECU yang berulang' },
];

export const MOCK_DEPARTMENTS: DepartmentEntry[] = [
  { id: 'dept-1', name: 'Distribution & Logistics', unitCode: 'DIST', isActive: true, sortOrder: 10, managerName: 'Eko Master Tuner' },
  { id: 'dept-2', name: 'IT Service', unitCode: 'IT', isActive: true, sortOrder: 20, managerName: 'Rian Silva' },
  { id: 'dept-3', name: 'General Affair', unitCode: 'GA', isActive: true, sortOrder: 30, managerName: 'Bambang GA' },
  { id: 'dept-4', name: 'Divisi Teknik & Tuning', unitCode: 'TECH', isActive: true, sortOrder: 40, managerName: 'Eko Master Tuner' },
  { id: 'dept-5', name: 'Finance', unitCode: 'FIN', isActive: true, sortOrder: 50, managerName: 'Siti Fauziah' },
  { id: 'dept-6', name: 'HR', unitCode: 'HR', isActive: false, sortOrder: 60, managerName: 'Maria Lopez' },
];

export const MOCK_POSITIONS: PositionEntry[] = [
  { id: 'pos-1', name: 'Staff', hierarchyLevel: 10, isActive: true, sortOrder: 10, description: 'Posisi dasar' },
  { id: 'pos-2', name: 'Technician', hierarchyLevel: 20, isActive: true, sortOrder: 20, description: 'Teknik lapangan' },
  { id: 'pos-3', name: 'Supervisor', hierarchyLevel: 30, isActive: true, sortOrder: 30, description: 'Posisi pengerjaan medior' },
  { id: 'pos-4', name: 'Manager', hierarchyLevel: 40, isActive: true, sortOrder: 40, description: 'Kepala unit' },
  { id: 'pos-5', name: 'Director', hierarchyLevel: 50, isActive: true, sortOrder: 50, description: 'Level eksekutif' },
  { id: 'pos-6', name: 'Intern', hierarchyLevel: 5, isActive: false, sortOrder: 60, description: 'Posisi nonaktif' },
];

export const MOCK_PRODUCTS: ProductLineEntry[] = [
  { id: 'prod-1', name: 'ECU Juken', productCode: 'ECU', isActive: true, sortOrder: 10, description: 'Sistem kontrol motor' },
  { id: 'prod-2', name: 'CDI', productCode: 'CDI', isActive: true, sortOrder: 20, description: 'CDI Unit' },
  { id: 'prod-3', name: 'CVT', productCode: 'CVT', isActive: true, sortOrder: 30, description: 'Sistem variator' },
  { id: 'prod-4', name: 'Brake System', productCode: 'BRK', isActive: true, sortOrder: 40, description: 'Sistem brek' },
  { id: 'prod-5', name: 'Battery', productCode: 'BAT', isActive: true, sortOrder: 50, description: 'Bateri & aksesoris' },
  { id: 'prod-tb', name: 'Throttle Body', productCode: 'TB', isActive: true, sortOrder: 60, description: 'Throttle body injeksi' },
  { id: 'prod-sc', name: 'Super Coil & Camshaft', productCode: 'SCC', isActive: true, sortOrder: 70, description: 'Koil & cam' },
  { id: 'prod-ecu', name: 'Bore Up Kit & ECU', productCode: 'BU-ECU', isActive: true, sortOrder: 80, description: 'Paket bore up & ECU' },
];

/** ─── Pegawai & Akun ──────────────────────────────────────── */

export const MOCK_EMPLOYEES: EmployeeEntry[] = [
  {
    id: 'emp-1', employeeNumber: 'EMP-0001', name: 'Andi Pratama', phone: '+628****6780',
    email: 'andi.pratama@brt.co.id', departmentId: 'dept-1', positionId: 'pos-2',
    departmentName: 'Distribution & Logistics', positionName: 'Technician', hierarchyLevel: 20,
    role: 'STAFF', accountStatus: 'ACTIVE', activationLinkSent: false, hiredAt: '2025-03-14',
  },
  {
    id: 'emp-2', employeeNumber: 'EMP-0002', name: 'Budi Santoso', phone: '+628****6781',
    email: 'budi.santoso@brt.co.id', departmentId: 'dept-1', positionId: 'pos-3',
    departmentName: 'Distribution & Logistics', positionName: 'Supervisor', hierarchyLevel: 30,
    role: 'HANDLER', accountStatus: 'NOT_ACTIVATED', activationLinkSent: true, hiredAt: '2024-07-22',
  },
  {
    id: 'emp-3', employeeNumber: 'EMP-0003', name: 'Siti Fauziah', phone: '+628****6782',
    email: 'siti.fauziah@brt.co.id', departmentId: 'dept-5', positionId: 'pos-4',
    departmentName: 'Finance', positionName: 'Manager', hierarchyLevel: 40,
    role: 'MANAGER', accountStatus: 'ACTIVE', activationLinkSent: false, hiredAt: '2023-01-09',
  },
  {
    id: 'emp-4', employeeNumber: 'EMP-0004', name: 'Rian Silva', phone: '+628****6783',
    email: 'rian.silva@brt.co.id', departmentId: 'dept-2', positionId: 'pos-3',
    departmentName: 'IT Service', positionName: 'Supervisor', hierarchyLevel: 30,
    role: 'HANDLER', accountStatus: 'ACTIVE', activationLinkSent: false, hiredAt: '2022-11-30',
  },
  {
    id: 'emp-5', employeeNumber: 'EMP-0005', name: 'Bambang GA', phone: '+628****6784',
    email: 'bambang.ga@brt.co.id', departmentId: 'dept-3', positionId: 'pos-2',
    departmentName: 'General Affair', positionName: 'Technician', hierarchyLevel: 20,
    role: 'HANDLER', accountStatus: 'NO_ACCOUNT', activationLinkSent: false, hiredAt: '2026-01-15',
  },
  {
    id: 'emp-6', employeeNumber: 'EMP-0006', name: 'Eko Master Tuner', phone: '+628****6785',
    email: 'eko.tuner@brt.co.id', departmentId: 'dept-4', positionId: 'pos-4',
    departmentName: 'Divisi Teknik & Tuning', positionName: 'Manager', hierarchyLevel: 40,
    role: 'UNIT', accountStatus: 'ACTIVE', activationLinkSent: false, hiredAt: '2020-05-01',
  },
  {
    id: 'emp-7', employeeNumber: 'EMP-0007', name: 'Ahmad Subagja', phone: '+628****6786',
    email: 'a.subagja@brt.co.id', departmentId: 'dept-2', positionId: 'pos-3',
    departmentName: 'IT Service', positionName: 'Supervisor', hierarchyLevel: 30,
    role: 'REVIEWER', accountStatus: 'ACTIVE', activationLinkSent: false, hiredAt: '2021-08-01',
  },
  {
    id: 'emp-8', employeeNumber: 'EMP-0008', name: 'Dimas P. (Marketing)', phone: '+628****6787',
    email: 'dimas.p@brt.co.id', departmentId: 'dept-1', positionId: 'pos-1',
    departmentName: 'Distribution & Logistics', positionName: 'Staff', hierarchyLevel: 10,
    role: 'STAFF', accountStatus: 'ACTIVE', activationLinkSent: false, hiredAt: '2025-06-10',
  },
];

/** ─── Customer (pelanggan teridentifikasi) ───────────────── */

export const MOCK_CUSTOMERS: CustomerEntry[] = [
  { id: 'cust-1', code: 'CUST-001', name: 'Juliani 78 (Juliani78 Racing)', phone: '+628****5789', address: 'Jl Tirtosari Komplex XII, no 12 TTMandala by Pass, Kel. Bantan, Kec. Medan Tembung, Kota Medan, SUMUT 20224', isActive: true, createdAt: '2026-08-22' },
  { id: 'cust-2', code: 'CUST-002', name: 'EDDY (Klinik Performance)', phone: '+628****8743', address: 'Kp. Anggalasan RT 01 RW 02 desa kertarahayu kec. Jatiwaras, Tasikmalaya, Jawa Barat', isActive: true, createdAt: '2026-09-09' },
  { id: 'cust-3', code: 'CUST-003', name: 'Toko Jaya Motor', phone: '081233445566', address: 'Jl. Ahmad Yani No. 88, Semarang', isActive: true, createdAt: '2026-09-14' },
  { id: 'cust-4', code: 'CUST-004', name: 'Rifan Kusuma', phone: '085677889900', address: 'Jl. Margonda Raya No. 12, Depok', isActive: true, createdAt: '2026-09-11' },
  { id: 'cust-5', code: 'CUST-005', name: 'Sumber Motor', phone: '081277889911', address: 'Jl. Diponegoro No. 45, Surabaya', isActive: true, createdAt: '2026-09-10' },
  { id: 'cust-6', code: 'CUST-006', name: 'Bengkel Maju Jaya', phone: '081388990022', address: 'Jl. Gatot Subroto No. 12, Bandung', isActive: false, createdAt: '2026-08-01' },
];

/** ─── Tiket → Identifikasi reporter (received) ───────────── */

export interface PendingReporterIdentification {
  ticketId: string;
  reporterName: string;
  reporterPhone: string;
  submittedAt: string;
  status: 'PENDING' | 'DONE';
}

export const MOCK_PENDING_REPORTERS: PendingReporterIdentification[] = [
  {
    ticketId: 'BRT-2026-0914-011',
    reporterName: 'Andi Pratama',
    reporterPhone: '+628123456780',
    submittedAt: '2026-09-14T10:12:00Z',
    status: 'PENDING',
  },
  {
    ticketId: 'BRT-2026-0913-001',
    reporterName: 'Dimas Marketing',
    reporterPhone: '081234567890',
    submittedAt: '2026-09-13T08:30:00Z',
    status: 'PENDING',
  },
];