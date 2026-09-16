export type TicketType = 'REQUEST' | 'INCIDENT' | 'COMPLAINT' | 'INQUIRY';

export type TicketPriority = 'A' | 'B' | 'C';

export type TicketStatus = 
  | 'OPEN' 
  | 'IN_PROGRESS' 
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
}

export interface TicketCustomerData {
  name: string;
  phone: string;
  address: string;
}

export interface Ticket {
  id: string; // e.g. BRT-2026-0913-001
  ticketType: TicketType;
  category: string;
  subcategory: string;
  /** Null = belum ditentukan reviewer (tiket baru) */
  priority: TicketPriority | null;
  status: TicketStatus;
  subject: string;
  description: string;
  
  // SO / Sales info
  soNumber?: string;
  salesName?: string;
  productLine?: string;
  vehicleModel?: string;
  claimedItems?: TicketItemClaim[];
  
  // Reporter & Customer
  reporterName: string;
  reporterPhone: string;
  reporterAddress: string;
  isReportForCustomer: boolean;
  customerData?: TicketCustomerData;

  // ── Link ke master data (tracking) ──────────────────────────
  /** Kategori & sub kategori (link ke CategoryEntry.id) */
  categoryId?: string;
  subcategoryId?: string;
  /** Lini produk (link ke ProductLineEntry.id) */
  productId?: string;
  /** Hasil identifikasi admin: reporter adalah pegawai / customer */
  reporterType?: 'EMPLOYEE' | 'CUSTOMER';
  /** Link ke EmployeeEntry.id bila reporterType = EMPLOYEE */
  reporterEmployeeId?: string;
  /** Link ke CustomerEntry.id bila reporterType = CUSTOMER */
  reporterCustomerId?: string;
  
  // Relations & Attachments
  relatedTicketId?: string;
  relationType?: TicketRelationType;
  attachments: TicketAttachment[];
  
  // Timestamps & Routing
  createdAt: string;
  updatedAt: string;
  assignedUnit?: string;
  handlerName?: string;
  /** Aksi handler yang ditetapkan reviewer/unit (klaim distribusi) */
  handlerActionId?: string;
  
  // Resolution info if available
  resolutionSummary?: string;
  resolutionDetail?: string;
  resolutionAttachments?: TicketAttachment[];
  resolutionCycles?: ResolutionCycle[];

  // Progres pengerjaan handler (terlihat oleh reporter)
  handlerProgress?: HandlerProgress[];
}

export interface ResolutionCycle {
  id: string;
  cycleNumber: number;
  timestamp: string;
  summary: string;
  detail?: string;
  reviewerNote?: string;
  isCurrent?: boolean;
}

/** Entri progres pengerjaan yang diinput handler secara berkala */
export interface HandlerProgress {
  id: string;
  timestamp: string;
  note: string;
  attachments?: TicketAttachment[];
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
  senderName: string;
  senderRole: string;
  avatar?: string;
  message: string;
  timestamp: string;
  isInternalOnly?: boolean;
  /** Lampiran (file / gambar) pada pesan chat */
  attachments?: TicketChatAttachment[];
}

export interface TicketChatAttachment {
  id: string;
  name: string;
  size: string;
  type: 'image' | 'file';
  /** URL preview lokal (URL.createObjectURL) — runtime saja */
  previewUrl?: string;
}

export interface TableFilterValues {
  priority?: string;
  type?: string;
  category?: string;
  status?: string;
  handler?: string;
  state?: string;
}
