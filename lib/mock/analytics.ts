/**
 * Agregasi tracking tiket sampai ke akar masalah.
 * Frontend-only (mock) — hitung dari MOCK_TICKETS saat runtime.
 */
import { MOCK_TICKETS } from '@/lib/mock/data';
import { MOCK_CATEGORIES } from '@/lib/mock/admin';
import type { Ticket } from '@/lib/types/ticket';
import type { CategoryEntry } from '@/lib/types/admin';

/** Status tiket yang masih aktif (belum selesai) */
export const ACTIVE_STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'REWORK_REQUIRED'];
/** Status tiket yang sudah final */
export const FINAL_STATUSES = ['CLOSED', 'REJECTED'];

export interface ProblemStats {
  total: number;
  active: number;
  resolved: number;
}

const isActive = (t: Ticket) => ACTIVE_STATUSES.includes(t.status);
const isResolved = (t: Ticket) => FINAL_STATUSES.includes(t.status);

/** Statistik tiket yang match kumpulan tiket tertentu */
function statsOf(tickets: Ticket[]): ProblemStats {
  return {
    total: tickets.length,
    active: tickets.filter(isActive).length,
    resolved: tickets.filter(isResolved).length,
  };
}

/** Tiket yang produknya bermasalah (by productId) */
export function ticketsByProduct(productId: string): Ticket[] {
  return MOCK_TICKETS.filter((t) => t.productId === productId);
}

export function problemStatsByProduct(productId: string): ProblemStats {
  return statsOf(ticketsByProduct(productId));
}

/**
 * Tiket untuk sebuah kategori.
 * - Kategori utama: dirinya sendiri + semua sub kategori (recurse 1 level).
 * - Sub kategori: hanya tiket di sub kategori itu.
 */
export function ticketsByCategory(categoryId: string, includeSub = true): Ticket[] {
  const subIds = MOCK_CATEGORIES
    .filter((c) => c.parentId === categoryId)
    .map((c) => c.id);

  return MOCK_TICKETS.filter((t) => {
    if (t.categoryId === categoryId) return true;
    return includeSub && subIds.includes(t.subcategoryId ?? t.categoryId ?? '');
  });
}

export function problemStatsByCategory(categoryId: string, includeSub = true): ProblemStats {
  return statsOf(ticketsByCategory(categoryId, includeSub));
}

/** Tiket yang dilaporkan oleh pegawai tertentu (sebagai reporter) */
export function ticketsByReporterEmployee(employeeId: string): Ticket[] {
  return MOCK_TICKETS.filter(
    (t) => t.reporterEmployeeId === employeeId || t.reporterName === employeeId
  );
}

export function reportStatsByEmployee(employeeId: string): ProblemStats {
  return statsOf(ticketsByReporterEmployee(employeeId));
}

/** Tiket milik customer tertentu */
export function ticketsByCustomer(customerId: string): Ticket[] {
  return MOCK_TICKETS.filter((t) => t.reporterCustomerId === customerId);
}

export function customerTicketStats(customerId: string): ProblemStats {
  return statsOf(ticketsByCustomer(customerId));
}

/** Cari customer berdasarkan nama (fallback untuk tiket yang belum ber-ID) */
export function findCustomerByName(name: string): CategoryEntry | undefined {
  return undefined;
}

/** Category helpers */
export function getCategoryName(id?: string): string | undefined {
  if (!id) return undefined;
  return MOCK_CATEGORIES.find((c) => c.id === id)?.name;
}

export function isSubCategory(id?: string): boolean {
  if (!id) return false;
  return MOCK_CATEGORIES.some((c) => c.id === id && c.parentId);
}
