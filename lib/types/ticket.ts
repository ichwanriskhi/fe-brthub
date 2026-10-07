export type TicketType = 'REQUEST' | 'INCIDENT' | 'COMPLAINT' | 'INQUIRY';

export type TicketPriority = 'A' | 'B' | 'C';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'PENDING_REVIEW'
  | 'REWORK_REQUIRED'
  | 'REJECTED'
  | 'CLOSED';

export type TicketRelationType = 
  | 'RECURRING_OF' 
  | 'DUPLICATE_OF' 
  | 'RELATED_TO' 
  | 'FOLLOW_UP_OF' 
  | 'CHILD_OF';

export interface TicketAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
}

/**
 * Working copy hasil penyesuaian reviewer (JSON diff, tidak override origin).
 * Hanya field yang berubah yang tersimpan di `changes`.
 */
export interface TicketRevision {
  id: string;
  revisionNo: number;
  changes: TicketRevisionChanges;
  notes?: string;
  createdAt: string;
}

export type TicketRevisionChanges = {
  [field: string]: {
    old: unknown;
    new: unknown;
  };
};

export type ClaimItemRole =
  | 'returned_item'
  | 'delivered_item'
  | 'expected_item'
  | 'replacement_item'
  | 'pending_send_item';

export const CLAIM_ITEM_ROLE_LABELS: Record<ClaimItemRole, string> = {
  returned_item: 'Dikembalikan',
  delivered_item: 'Dikirim ke Konsumen',
  expected_item: 'Seharusnya Dikirim',
  replacement_item: 'Pengganti',
  pending_send_item: 'Perlu Dikirim',
};

export interface TicketItemClaim {
  id: string;
  /** Barang yang dikirim ke konsumen (aktual) */
  deliveredItem?: string;
  /** Barang pengganti / seharusnya dikirim */
  replacementItem?: string;
  /** Legacy single-item field (kompatibilitas data lama) */
  partName?: string;
  partNumber?: string;
  issueDescription?: string;
  quantity: number;
  /** ── Kolom dinamis dari creation report (JSON claimRows) ── */
  hasSecondColumn?: boolean;
  role1?: string;
  itemCode1?: string;
  itemName1?: string;
  role2?: string;
  itemCode2?: string;
  itemName2?: string;
  /** Alias kompatibilitas (snake_case / backend) */
  qty?: number;
  reason?: string;
}

export interface TicketCustomerData {
  name: string;
  email?: string;
  phone: string;
  address: string;
}

export interface Ticket {
  id: string; // e.g. BRT-2026-0913-001
  /**
   * Code apa adanya dari backend (pass-through) — bisa code baru hasil master
   * data admin. Union `TicketType` hanya untuk code yang dikenal (opsi form,
   * map badge); jangan paksa field ini ke union itu.
   */
  ticketType: string;
  category: string;
  subcategory: string;
  /**
   * Null = belum ditentukan reviewer (tiket baru). Code asing tampil apa
   * adanya — jangan koersi ke "B".
   */
  priority: string | null;
  status: TicketStatus;
  subject: string;
  description: string;
  
  // SO / Sales info
  soNumber?: string;
  salesName?: string;
  /** Lini produk = KODE grup WANSIS (nama di-resolve FE via cache item-groups) */
  productLine?: string;
  vehicleModel?: string;
  claimedItems?: TicketItemClaim[];
  
  // Reporter & Customer
  reporterName: string;
  reporterEmail?: string;
  reporterPhone: string;
  reporterAddress: string;
  reporterDepartment?: string;
  reporterPosition?: string;
  isReportForCustomer: boolean;
  customerData?: TicketCustomerData;

  // ── Link ke master data (tracking) ──────────────────────────
  /** Kategori & sub kategori (link ke CategoryEntry.id) */
  categoryId?: string;
  subcategoryId?: string;
  /** Hasil identifikasi admin: reporter adalah pegawai / customer */
  reporterType?: 'EMPLOYEE' | 'CUSTOMER';
  /** Link ke EmployeeEntry.id bila reporterType = EMPLOYEE */
  reporterEmployeeId?: string;
  /** Link ke CustomerEntry.id bila reporterType = CUSTOMER */
  reporterCustomerId?: string;
  
  // Approval workflow
  /** Target approval yang menentukan siapa approver + final closure authority */
  approvalTarget?: 'Direksi' | 'General Manager' | 'Operational Manager' | 'Division';
  /** Nama departemen/unit tujuan yang dipilih reviewer */
  destinationDepartmentName?: string;
  /** ID departemen/unit tujuan yang dipilih reviewer */
  destinationDepartmentId?: string;

  // Relations & Attachments
  relatedTicketId?: string;
  relationType?: TicketRelationType;
  attachments: TicketAttachment[];
  
  // Timestamps & Routing
  createdAt: string;
  updatedAt: string;
  assignedUnit?: string;
  handlerName?: string;
  /** Alasan penolakan (reviewer maupun approver saat menolak penutupan) */
  rejectionReason?: string;
  /** Aksi handler yang ditetapkan reviewer/unit (klaim distribusi) */
  handlerActionId?: string;
  /** Label resmi aksi dari tabel `actions` (fallback ke HANDLER_ACTIONS bila kosong) */
  handlerActionName?: string;
  /** Deskripsi resmi aksi dari tabel `actions` */
  handlerActionDescription?: string;
  
  // Resolution info if available
  resolutionSummary?: string;
  resolutionDetail?: string;
  resolutionAttachments?: TicketAttachment[];
  resolutionCycles?: ResolutionCycle[];

  // Progres pengerjaan handler (terlihat oleh reporter)
  handlerProgress?: HandlerProgress[];

  /**
   * Nomor report WANSIS untuk klaim distribusi.
   *
   * Hanya terisi kalau pengajuan ke WANSIS **berhasil** dan WANSIS sudah
   * mengembalikan nomor (`status = 'sent'`). Baris `queued`/`failed` tidak
   * punya nomor, jadi tidak ditampilkan sama sekali — label-nya pun tidak.
   *
   * Halaman reporter TIDAK menampilkan ini; lihat `TicketSummary`.
   */
  wansisReportNumber?: string;

  /**
   * Timeline kronologis tiket dari pembuatan sampai selesai
   * (ditulis backend via TicketActivityLogger di setiap aksi workflow).
   */
  activities?: TicketActivityEntry[];

  /**
   * Riwayat assignment handler ke tiket ini (dipilih oleh unit). Untuk
   * halaman unit: handler aktif + yang sudah diganti.
   */
  handlerAssignments?: HandlerAssignment[];

  /**
   * Resolusi yang diajukan handler (paling baru di depan). Bisa beberapa kali
   * bila pengajuan sebelumnya ditolak approver (rework).
   */
  resolutions?: {
    id: string;
    resolutionNo: number;
    summary: string;
    detail: string;
    submittedAt: string;
    reviewDecision: 'PENDING' | 'APPROVED' | 'REJECTED';
    attachments?: TicketAttachment[];
  }[];

  /**
   * Working copy hasil penyesuaian reviewer terbaru.
   * Yang ditampilkan di UI = origin + diff dari latestRevision.
   * Origin (data pelapor) tidak pernah di-override.
   */
  latestRevision?: TicketRevision;
}

export interface ResolutionCycle {
  id: string;
  cycleNumber: number;
  timestamp: string;
  summary: string;
  detail?: string;
  reviewerNote?: string;
  /** Status review versi ini — untuk chip di riwayat revisi. */
  reviewDecision?: 'PENDING' | 'APPROVED' | 'REJECTED';
  /** Lampiran bukti versi ini (backend eager-load per resolusi). */
  attachments?: TicketAttachment[];
  isCurrent?: boolean;
}

/** Entri progres pengerjaan yang diinput handler secara berkala */
export interface HandlerProgress {
  id: string;
  timestamp: string;
  note: string;
  attachments?: TicketAttachment[];
  /** Nama pegawai yang mencatat progres (dari backend) */
  actorName?: string;
}

/** Satu baris timeline aktivitas tiket (kronologis sistem, bukan chat) */
export interface TicketActivityEntry {
  id: string;
  activityType: string;
  /**
   * Kalimat fakta tentang kejadian, mis. "Laporan dibuat." atau
   * "Handler ditugaskan: Budi.".
   *
   * Untuk `PROGRESS` ini **tidak** berisi catatan handler — backend hanya
   * menulis "Progres pengerjaan ditambahkan." Isi lengkapnya ada di
   * `handlerProgress` dan dirender lewat card Riwayat Progres, jadi jangan
   * dipakai sebagai sumber teks progres.
   */
  description: string;
  /** Nama aktor (dari backend) */
  actorName?: string;
  createdAt: string;
}

/** Assignment handler pada sebuah tiket (dipilih oleh unit) */
export interface HandlerAssignment {
  id: string;
  handlerName?: string;
  assignedByName?: string;
  assignedAt: string;
  isActive: boolean;
}

export interface TicketActivity {
  id: string;
  ticketId: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  notes?: string;
}

export interface TicketChatMessage {
  id: string;
  ticketId: string;
  senderUserId: string;
  senderName: string;
  senderRole: string;
  avatar?: string;
  message: string;
  timestamp: string;
  isInternalOnly?: boolean;
  /** Sudah dihapus (soft delete) — hanya ditampilkan ke admin */
  isDeleted?: boolean;
  /**
   * Pengirim pesan ini adalah pemilik tiket. Dihitung backend dari
   * `tickets.reporter_user_id`, bukan dari klaim klien.
   *
   * Untuk orang yang memegang banyak role, dua-duanya benar: ia Reviewer
   * sekaligus pelapor tiketnya. Digunakan untuk menampilkan keduanya, bukan
   * menimpa satu menimpa yang lain.
   */
  isTicketReporter?: boolean;
  /** Pengirim ini berhak menghapus pesan (pengirimnya sendiri / admin) */
  canDelete?: boolean;
  /** Lampiran (gambar / video / dokumen) pada pesan chat. */
  attachments?: TicketChatAttachment[];
}

/**
 * Lampiran pada pesan chat.
 *
 * Bentuknya identik dengan `TicketAttachment` (lihat `TicketInteractionController::format`),
 * karena `AttachmentList` membedakan gambar / video / dokumen lewat `type`
 * yang berisi MIME — bukan lewat flag `'image' | 'file'`.
 */
export type TicketChatAttachment = TicketAttachment;

export interface TableFilterValues {
  priority?: string;
  type?: string;
  category?: string;
  status?: string;
  handler?: string;
  state?: string;
}
