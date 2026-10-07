import type {
  Ticket,
  TicketAttachment,
  TicketItemClaim,
  TicketPriority,
  TicketRelationType,
  TicketRevision,
  TicketRevisionChanges,
  TicketStatus,
  TicketType,
} from "@/lib/types/ticket";
import { workflowLabelFromApi } from "@/lib/constants/reviewer";
import { authenticatedFetch } from "./fetch-wrapper";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

type ApiRecord = Record<string, unknown>;

const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING_APPROVAL",
  "PENDING_REVIEW",
  "REWORK_REQUIRED",
  "REJECTED",
  "CLOSED",
];
const RELATION_TYPES: TicketRelationType[] = [
  "RECURRING_OF",
  "DUPLICATE_OF",
  "RELATED_TO",
  "FOLLOW_UP_OF",
  "CHILD_OF",
];

function record(value: unknown): ApiRecord {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as ApiRecord;
  }
  return {};
}

function getNestedProperty(obj: ApiRecord, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    if (
      current !== null &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      return (current as ApiRecord)[key];
    }
    return undefined;
  }, obj as unknown);
}

function string(value: unknown, fallback = ""): string {
  return typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : fallback;
}

function oneOf<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T,
): T {
  const normalized = string(value).toUpperCase();
  return values.includes(normalized as T) ? (normalized as T) : fallback;
}

function attachment(value: unknown): TicketAttachment {
  const item = record(value);
  return {
    id: string(item.id),
    name: string(item.file_name, string(item.name, "Lampiran")),
    size: string(item.file_size, string(item.size)),
    type: string(item.mime_type, string(item.type)),
    url: string(item.url, string(item.file_url)),
  };
}

function claim(value: unknown): TicketItemClaim {
  const item = record(value);
  const truthy = (v: unknown): boolean | undefined => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number")
      return v === 1 ? true : v === 0 ? false : undefined;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (["1", "true", "ya", "yes"].includes(s)) return true;
      if (["0", "false", "tidak", "no", ""].includes(s))
        return s === "" ? undefined : false;
    }
    return undefined;
  };
  return {
    id: string(item.id),
    deliveredItem:
      string(item.delivered_item, string(item.deliveredItem)) || undefined,
    replacementItem:
      string(item.replacement_item, string(item.replacementItem)) || undefined,
    partName: string(item.part_name, string(item.partName)) || undefined,
    partNumber: string(item.part_number, string(item.partNumber)) || undefined,
    issueDescription:
      string(
        item.issue_description,
        string(item.issueDescription, string(item.reason)),
      ) || undefined,
    reason: string(item.reason, string(item.issue_description)) || undefined,
    quantity: Number(item.quantity ?? item.qty) || 1,
    qty: Number(item.qty ?? item.quantity) || undefined,
    // ── Teruskan kolom dinamis dari creation report (jangan dibuang) ──
    hasSecondColumn:
      truthy(item.hasSecondColumn ?? item.has_second_column) ??
      (string(item.role2) || string(item.itemName2) || string(item.itemCode2)
        ? true
        : undefined),
    role1: string(item.role1) || undefined,
    itemCode1: string(item.itemCode1, string(item.item_code1)) || undefined,
    itemName1: string(item.itemName1, string(item.item_name1)) || undefined,
    role2: string(item.role2) || undefined,
    itemCode2: string(item.itemCode2, string(item.item_code2)) || undefined,
    itemName2: string(item.itemName2, string(item.item_name2)) || undefined,
  };
}

function parseClaimedItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  // Backend bisa mengirim claimed_items sebagai string JSON (FormData JSON.stringify)
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

/** Parse latest_revision (working copy reviewer) → TicketRevision */
function toRevision(value: unknown): TicketRevision | undefined {
  const item = record(value);
  if (!item.id && !item.changes) return undefined;
  return {
    id: string(item.id),
    revisionNo: Number(item.revision_no) || 1,
    changes: record(item.changes) as TicketRevisionChanges,
    notes: string(item.notes) || undefined,
    createdAt: string(item.created_at, new Date(0).toISOString()),
  };
}

function relationCode(value: unknown): string {
  if (typeof value === "string") return value;
  return string(record(value).code);
}

/** Converts the normalized Laravel ticket response into the shape used by the reporter UI. */
export function toTicket(value: unknown): Ticket {
  const item = record(value);
  const categoryRel = record(item.category);
  const parentCategory = record(categoryRel.parent);
  
  // ── Robust nested object extraction (handles both snake_case & camelCase) ──
  const reporterUserRaw = record(item.reporter_user ?? item.reporterUser);
  const customerRaw = record(item.customer);
  const customerUserRaw = record(customerRaw.user ?? customerRaw.user_id);
  const ticketTypeRaw = record(item.ticket_type ?? item.ticketType);
  const priorityRaw = record(item.priority);
  const statusRaw = record(item.status);
  const vehicleDetailRaw = record(item.vehicle_detail ?? item.vehicleDetail);

  // Lini Produk = kode grup WANSIS (bukan nama produk lokal). Nama grup
  // di-resolve FE lewat cache item-groups; fallback kode mentah.
  const salesDetailRaw = record(item.sales_detail ?? item.salesDetail);
  const actionRaw = record(item.action);
  const destinationDeptRaw = record(item.destination_department ?? item.destinationDepartment);
  const latestReviewLogRaw = record(item.latest_review_log ?? item.latestReviewLog);
  const latestReviewLogDestDeptRaw = record(latestReviewLogRaw.destination_department ?? latestReviewLogRaw.destinationDepartment);
  
  const relations = Array.isArray(item.relations) ? item.relations.map(record) : [];
  const firstRelation = relations[0];
  const relatedTicketRaw = record(firstRelation?.related_ticket ?? firstRelation?.relatedTicket);
  
  const rawClaims = parseClaimedItems(
    salesDetailRaw.claimed_items ?? salesDetailRaw.claimedItems ?? item.claimed_items,
  );
  const rawAttachments = Array.isArray(item.attachments) ? item.attachments : [];
  const rawActivities = Array.isArray(item.activities) ? item.activities.map(record) : [];
  const activities = rawActivities.map((a) => ({
    id: string(a.id),
    activityType: string(a.activity_type, string(a.activityType)),
    description: string(a.description),
    actorName: string(record(a.actor).full_name) || undefined,
    createdAt: string(a.created_at, string(a.createdAt)),
  }));

  /**
   * Nomor report WANSIS — relasi `wansisReports` sudah di-eager-load dengan
   * kolom minimal (`id,ticket_id,wansis_report_id`).
   *
   * Ambil baris PERTAMA yang punya nomor. Baris `queued`/`failed` punya
   * `wansis_report_id` null, jadi dilewati; kalau semua gagal, hasilnya
   * `undefined` dan field tidak ditampilkan sama sekali.
   *
   * Catatan: `hasMany` dengan `orderByDesc('id')`, jadi "pertama" = terbaru.
   */
  const rawWansisReports = Array.isArray(item.wansis_reports) ? item.wansis_reports : [];
  const wansisReportNumber = (() => {
    for (const row of rawWansisReports.map(record)) {
      const reportId = string(row.wansis_report_id, string(row.wansisReportId));
      if (reportId) return reportId;
    }
    return undefined;
  })();

  // ── Fallback chains for every field ──
  const reporterName =
    string(reporterUserRaw.full_name) ||
    string(reporterUserRaw.name) ||                    // some APIs use 'name'
    string(item.reporterName) ||                       // frontend-computed fallback
    (string(item.reporter_user_id) ? `User #${string(item.reporter_user_id)}` : "—");

  const reporterEmail = string(reporterUserRaw.email) || undefined;
  const reporterProfile = record(reporterUserRaw.employee_profile ?? reporterUserRaw.employeeProfile);
  const reporterDept = record(reporterProfile.department);
  const reporterPos = record(reporterProfile.position);
  const reporterDepartment = string(reporterDept.name) || undefined;
  const reporterPosition = string(reporterPos.name) || undefined;

  const reporterPhone = string(reporterUserRaw.phone_number) || "";
  const reporterAddress = string(reporterUserRaw.address) || "";

  // ticketType: relationship.code → ticket_type_id lookup → fallback.
  // Sengaja pass-through: code asing (mis. tipe baru dari master data) harus
  // tampil apa adanya, bukan dipaksa jadi INQUIRY oleh `oneOf`. "INQUIRY" hanya
  // untuk string kosong (data korup), bukan untuk code yang tidak dikenal.
  const ticketTypeCode =
    relationCode(ticketTypeRaw) ||
    string(item.ticket_type_code) ||
    string(item.ticketTypeCode) ||
    "";

  const customerName =
    string(customerUserRaw.full_name) ||
    string(customerUserRaw.name) ||
    string(record(item.customerData).name);
  const customerData = customerName
    ? {
        name: customerName,
        email: string(customerUserRaw.email) || string(record(item.customerData).email) || undefined,
        phone: string(customerUserRaw.phone_number) || string(record(item.customerData).phone) || "",
        address: string(customerUserRaw.address) || string(record(item.customerData).address) || "",
      }
    : string(item.customer_id)
      ? { name: `Customer #${string(item.customer_id)}`, phone: "", address: "" }
      : undefined;

  const priorityCode =
    relationCode(priorityRaw) ||
    string(item.priority_code) ||
    string(item.priorityCode) ||
    (item.priority === null ? "" : string(item.priority)) ||
    "";

  const productLine =
    string(vehicleDetailRaw.group_code) ||
    string(item.productLine) ||
    undefined;

  const handlerActionId =
    string(actionRaw.code) ||
    string(item.action_id) ||
    string(item.handlerActionId) ||
    undefined;

  const directDeptId =
    string(item.destination_department_id) ||
    string(latestReviewLogRaw.destination_department_id) ||
    string(item.destinationDepartmentId) ||
    undefined;
  const directDeptName =
    string(destinationDeptRaw.name) ||
    string(latestReviewLogDestDeptRaw.name) ||
    string(item.destinationDepartmentName) ||
    undefined;

  // ── Assignments / handler name ──
  const assignments = Array.isArray(item.assignments) ? item.assignments.map(record) : [];
  const handlerAssignment = assignments.find(
    (a) => string(a.assignment_type) === "HANDLER" && a.is_active !== false,
  );
  let handlerName: string | undefined = undefined;
  if (handlerAssignment) {
    const assignedTo = record(
      handlerAssignment.assigned_to_employee ?? handlerAssignment.assignedToEmployee,
    );
    handlerName = string(record(assignedTo.user).full_name) || undefined;
  }

  const categoryName =
    string(parentCategory.name) ||
    string(categoryRel.name) ||
    (typeof item.category === "string" ? string(item.category) : "") ||
    "—";
  const subcategoryName = parentCategory.name
    ? string(categoryRel.name, "—")
    : string(item.subcategory, "—");

  return {
    id: string(item.ticket_no, string(item.id)),
    // Pass-through seperti priority: code tak dikenal tampil apa adanya
    // (`TypeBadge` me-render badge polos), bukan dipaksa jadi INQUIRY.
    ticketType: ticketTypeCode || "INQUIRY",
    category: categoryName,
    subcategory: subcategoryName,
    // Pass-through: `null` berarti belum ditentukan reviewer (badge tidak
    // me-render apa-apa), code asing tampil apa adanya. Jangan koersi ke "B".
    priority: priorityCode || null,
    status: oneOf(relationCode(statusRaw) || string(item.status), TICKET_STATUSES, "OPEN"),
    subject: string(item.subject, "(Tanpa subjek)"),
    description: string(item.description),
    soNumber: string(salesDetailRaw.so_number) || string(item.soNumber) || undefined,
    salesName: string(salesDetailRaw.sales_name) || string(item.salesName) || undefined,
    productLine,
    vehicleModel: string(vehicleDetailRaw.vehicle_model) || string(item.vehicleModel) || undefined,
    claimedItems: rawClaims.length > 0 ? rawClaims.map(claim) : Array.isArray(item.claimedItems) ? (item.claimedItems as TicketItemClaim[]) : [],
    reporterName,
    reporterEmail,
    reporterPhone,
    reporterAddress,
    reporterDepartment,
    reporterPosition,
    isReportForCustomer: Boolean(item.customer_id ?? item.isReportForCustomer),
    customerData,
    categoryId: string(parentCategory.id ?? categoryRel.id) || string(item.categoryId) || undefined,
    subcategoryId: parentCategory.name ? string(categoryRel.id) || undefined : string(item.subcategoryId) || undefined,
    approvalTarget: workflowLabelFromApi(string(item.approval_type)) || string(item.approvalTarget) || undefined,
    destinationDepartmentName: directDeptName,
    destinationDepartmentId: directDeptId,
    relatedTicketId: string(relatedTicketRaw.ticket_no) || string(item.relatedTicketId) || undefined,
    relationType: firstRelation?.relation_type
      ? oneOf(firstRelation.relation_type, RELATION_TYPES, "RELATED_TO")
      : item.relationType ? oneOf(item.relationType, RELATION_TYPES, "RELATED_TO") : undefined,
    attachments: rawAttachments.length > 0 ? rawAttachments.map(attachment) : Array.isArray(item.attachments) ? (item.attachments as TicketAttachment[]) : [],
    activities,
    wansisReportNumber,
    createdAt: string(item.created_at, string(item.createdAt, new Date(0).toISOString())),
    updatedAt: string(item.updated_at, string(item.updatedAt, string(item.created_at, new Date(0).toISOString()))),
    latestRevision: toRevision(item.latest_revision) ?? (item.latestRevision as Ticket["latestRevision"]),
    handlerActionId,
    handlerActionName: string(actionRaw.name) || undefined,
    handlerActionDescription: string(actionRaw.description) || undefined,
    rejectionReason: string(item.rejection_reason) || string(item.rejectionReason) || undefined,
    handlerName: handlerName || string(item.handlerName) || undefined,
  };
}

function responseItems(payload: unknown): unknown[] {
  const body = record(payload);
  if (Array.isArray(body.data)) return body.data;
  const nested = record(body.data);
  return Array.isArray(nested.data) ? nested.data : [];
}

/** Format timestamp backend → "10 Sep 2026, 09:15" (id-ID). */
function formatTimestamp(value: unknown): string {
  const raw = string(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Normalisasi detail tiket untuk reporter (TicketController::show).
 *
 * Respons show sudah menyertakan handler_progress (actor + attachments),
 * assignments (handler aktif) dan resolutions (attachments + review_log).
 * Field ini dilapis di atas toTicket karena halaman /laporan/[id]
 * menggunakannya untuk menampilkan progres pengerjaan, hasil resolusi,
 * dan riwayat perbaikan resolusi.
 */
export function toReporterTicket(value: unknown): Ticket {
  const base = toTicket(value);
  const item = record(value);

  // ── Progres pengerjaan handler ──
  const progress = Array.isArray(item.handler_progress)
    ? item.handler_progress
    : [];
  base.handlerProgress = progress.map((p) => {
    const row = record(p);
    const atts = Array.isArray(row.attachments) ? row.attachments : [];
    return {
      id: string(row.id),
      note: string(row.note),
      timestamp: formatTimestamp(row.created_at),
      actorName: string(record(row.actor).full_name) || undefined,
      attachments: atts.map(attachment),
    };
  });

  // ── Handler aktif (assignment HANDLER) ──
  const assignments = Array.isArray(item.assignments)
    ? item.assignments.map(record)
    : [];
  const handlerAssignment = assignments.find(
    (a) => string(a.assignment_type) === "HANDLER" && a.is_active !== false,
  );
  if (handlerAssignment) {
    const assignedTo = record(
      handlerAssignment.assigned_to_employee ??
        handlerAssignment.assignedToEmployee,
    );
    base.handlerName = string(record(assignedTo.user).full_name) || undefined;
  }

  // ── Resolusi: cycles (urut naik) + resolusi aktif (no tertinggi) ──
  const resolutions = (Array.isArray(item.resolutions) ? item.resolutions : [])
    .map(record)
    .sort(
      (a, b) => (Number(a.resolution_no) || 1) - (Number(b.resolution_no) || 1),
    );

  if (resolutions.length > 0) {
    base.resolutionCycles = resolutions.map((r) => {
      const reviewLog = record(r.review_log);
      // `review_decision` dipertahankan (bukan dibuang): riwayat revisi butuh
      // chip status per versi, dan halaman reporter butuh memastikan yang
      // tampil benar-benar yang approved.
      const decision = string(r.review_decision).toUpperCase();
      // Lampiran dipertahankan PER SIKLUS (bukan hanya versi aktif): backend
      // eager-load `resolutions.attachments`, jadi riwayat bisa menampilkan
      // bukti tiap versi tanpa request tambahan.
      const cycleAtts = Array.isArray(r.attachments) ? r.attachments : [];
      return {
        id: string(r.id),
        cycleNumber: Number(r.resolution_no) || 1,
        timestamp: formatTimestamp(r.submitted_at),
        summary: string(r.summary),
        detail: string(r.detail) || undefined,
        reviewerNote: string(reviewLog.notes) || undefined,
        reviewDecision:
          decision === 'APPROVED' || decision === 'REJECTED' ? decision : 'PENDING',
        attachments: cycleAtts.map(attachment),
        isCurrent: false,
      };
    });

    const active = resolutions[resolutions.length - 1];
    if (base.resolutionCycles.length > 0) {
      base.resolutionCycles[base.resolutionCycles.length - 1].isCurrent = true;
    }
    base.resolutionSummary = string(active.summary) || undefined;
    base.resolutionDetail = string(active.detail) || undefined;
    const resAtts = Array.isArray(active.attachments) ? active.attachments : [];
    base.resolutionAttachments = resAtts.map(attachment);
  }

  return base;
}

function pageInfo(payload: unknown): { lastPage: number } {
  const body = record(payload);
  const nested = record(body.data);
  const source = Array.isArray(body.data) ? body : nested;
  return { lastPage: Number(source.last_page) || 1 };
}

async function requestTickets(page: number, token: string): Promise<unknown> {
  const response = await authenticatedFetch(
    `/api/auth/tickets?mine=true&page=${page}`,
    {
      headers: { Accept: "application/json" },
      // Sesi reporter dipakai eksplisit (lihat reporterToken()).
      token,
    },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      string(record(payload).message, "Gagal memuat laporan dari server."),
    );
  }

  return payload;
}

async function requestAllTickets(
  page: number,
  token: string,
): Promise<unknown> {
  const response = await authenticatedFetch(`/api/auth/tickets?page=${page}`, {
    headers: { Accept: "application/json" },
    token,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      string(record(payload).message, "Gagal memuat daftar tiket dari server."),
    );
  }

  return payload;
}

async function authToken(): Promise<string> {
  if (typeof window === "undefined") return "";
  const token =
    localStorage.getItem("brthub_token") || localStorage.getItem("auth_token");
  if (!token)
    throw new Error("Sesi Anda tidak ditemukan. Silakan masuk kembali.");
  return token;
}

/**
 * Token for reporter-only endpoints ("Laporan Saya").
 *
 * `/laporan` & `/laporan/[id]` are reporter-only (dijaga `ReporterGuard` +
 * cookie `brthub_session`), sehingga WAJIB memakai sesi reporter (`auth_token`).
 * Kalau memakai default fetch-wrapper (`brthub_token` lebih diutamakan), maka di
 * browser yang juga punya sesi staf endpoint `mine=true` akan memakai identitas
 * staf — daftar jadi kosong atau menampilkan tiket orang lain.
 */
async function reporterToken(): Promise<string> {
  if (typeof window === "undefined") return "";
  const token = localStorage.getItem("auth_token");
  if (!token)
    throw new Error("Sesi Anda tidak ditemukan. Silakan masuk kembali.");
  return token;
}

/**
 * Token for the ticket-detail endpoint.
 *
 * Dipakai lintas role: reporter (`/laporan/[id]`), reviewer
 * (`/reviewer/tiket/[id]`) dan approver (`ApprovalDetail`). Karena itu defaultnya
 * adalah sesi apa pun yang tersedia (`brthub_token` staf, fallback `auth_token`
 * reporter). Halaman reporter yang wajib memakai identitas pelapor memanggil
 * `getMyTicket(id, { asReporter: true })` supaya di browser dengan dua sesi
 * (staf + reporter) tidak tertukar identitas.
 */
function ticketDetailToken(asReporter: boolean | undefined): Promise<string> {
  return asReporter ? reporterToken() : authToken();
}

/** Returns every ticket owned by the currently authenticated reporter. */
export async function getMyTickets(): Promise<Ticket[]> {
  const token = await reporterToken();

  const firstPage = await requestTickets(1, token);
  const { lastPage } = pageInfo(firstPage);
  const pages = [firstPage];

  for (let page = 2; page <= lastPage; page += 1) {
    pages.push(await requestTickets(page, token));
  }

  return pages.flatMap(responseItems).map(toTicket);
}

/**
 * Returns one ticket. Dipakai reporter, reviewer dan approver — lihat
 * {@link ticketDetailToken} untuk aturan pemilihan token.
 *
 * @param options.asReporter set `true` dari halaman reporter (`/laporan/[id]`).
 */
export async function getMyTicket(
  ticketId: string,
  options: { asReporter?: boolean } = {},
): Promise<Ticket> {
  const token = await ticketDetailToken(options.asReporter);
  const response = await authenticatedFetch(
    `/api/auth/tickets/${encodeURIComponent(ticketId)}`,
    {
      headers: { Accept: "application/json" },
      token,
    },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      string(
        record(payload).message,
        "Gagal memuat detail laporan dari server.",
      ),
    );
  }

  return toReporterTicket(record(payload).data || payload);
}

/** Returns ALL tickets (for reviewer/admin history) — no mine=true filter. */
export async function getAllTickets(): Promise<Ticket[]> {
  const token = await authToken();

  const firstPage = await requestAllTickets(1, token);
  const { lastPage } = pageInfo(firstPage);
  const pages = [firstPage];

  for (let page = 2; page <= lastPage; page += 1) {
    pages.push(await requestAllTickets(page, token));
  }

  return pages.flatMap(responseItems).map(toTicket);
}

/** Parameter filter untuk `getMyReviewedTickets` — diteruskan sebagai query string. */
export interface MyReviewedTicketsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  ticketType?: TicketType;
  category?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
}

export interface MyReviewedTicketsResponse {
  data: Ticket[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Returns tickets the currently-logged-in reviewer has ever reviewed. */
export async function getMyReviewedTickets(
  params: MyReviewedTicketsParams = {},
): Promise<MyReviewedTicketsResponse> {
  const token = await authToken();
  const searchParams = new URLSearchParams({ reviewed_by_me: "true" });
  if (params.page) searchParams.set("page", String(params.page));
  if (params.per_page) searchParams.set("per_page", String(params.per_page));
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status_code", params.status);
  if (params.priority) searchParams.set("priority_code", params.priority);
  if (params.ticketType) searchParams.set("ticket_type_code", params.ticketType);
  if (params.category) searchParams.set("category_id", params.category);
  if (params.dateFrom) searchParams.set("date_from", params.dateFrom);
  if (params.dateTo) searchParams.set("date_to", params.dateTo);

  const response = await authenticatedFetch(
    `/api/auth/tickets?${searchParams.toString()}`,
    {
      headers: { Accept: "application/json" },
      token,
    },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      string(
        record(payload).message,
        "Gagal memuat riwayat review dari server.",
      ),
    );
  }

  const body = record(payload);
  const items = Array.isArray(body.data) ? (body.data as unknown[]) : [];

  return {
    ...(body as unknown as MyReviewedTicketsResponse),
    data: items.map(toTicket),
  };
}

/** Submit reviewer decision (route / request rework / reject) for a ticket. */
export async function submitReview(
  ticketId: string,
  payload: {
    decision: "ROUTE" | "REQUEST_REWORK" | "REJECT";
    priority_id?: string;
    approval_type?: string;
    destination_department_id?: string;
    action_id?: string;
    notes?: string;
    /**
     * Working copy / hasil penyesuaian reviewer.
     * Backend compute diff vs origin & simpan di ticket_revisions —
     * field yang tidak berubah tidak akan tersimpan.
     */
    revisions?: {
      subject?: string;
      ticket_type_id?: string;
      category_id?: string;
      description?: string;
      vehicle_detail?: { vehicle_model?: string; group_code?: string };
      sales_detail?: { so_number?: string; sales_name?: string };
      claimed_items?: TicketItemClaim[];
    };
  },
): Promise<void> {
  const token = await authToken();
  const response = await authenticatedFetch(
    `/api/auth/tickets/${encodeURIComponent(ticketId)}/review`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      token,
    },
  );

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      string(record(body).message, "Gagal mengirim hasil review."),
    );
  }
}

// ─── Approver API ────────────────────────────────────────────────────────────
// Approver adalah posisi (jabatan), bukan role. Backend memfilter tiket
// berdasarkan kecocokan approval_type ↔ posisi pegawai.

export type ApprovalStage = "INITIAL" | "FINAL" | "HISTORY";

export interface ApprovalListResult {
  data: Ticket[];
  total: number;
  currentPage: number;
  lastPage: number;
}

/** Opsi `getApprovals` — semua diteruskan sebagai query string. */
export interface ApprovalListParams {
  stage?: ApprovalStage;
  page?: number;
  per_page?: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  ticketType?: TicketType;
  category?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
}

/** Daftar tiket yang menunggu approval oleh user yang login (atau riwayatnya). */
export async function getApprovals(
  params: ApprovalListParams = {},
): Promise<ApprovalListResult> {
  const searchParams = new URLSearchParams({ stage: params.stage ?? "INITIAL" });
  if (params.page) searchParams.set("page", String(params.page));
  if (params.per_page) searchParams.set("per_page", String(params.per_page));
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status_code", params.status);
  if (params.priority) searchParams.set("priority_code", params.priority);
  if (params.ticketType) searchParams.set("ticket_type_code", params.ticketType);
  if (params.category) searchParams.set("category_id", params.category);
  if (params.dateFrom) searchParams.set("date_from", params.dateFrom);
  if (params.dateTo) searchParams.set("date_to", params.dateTo);

  const token = await authToken();
  const response = await authenticatedFetch(
    `/api/auth/approvals?${searchParams.toString()}`,
    {
      headers: { Accept: "application/json" },
      token,
    },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      string(record(payload).message, "Gagal memuat daftar persetujuan."),
    );
  }

  const data = responseItems(payload).map(toTicket);
  const body = record(payload);
  const source = Array.isArray(body.data) ? body : record(body.data);

  return {
    data,
    total: Number(source.total) || data.length,
    currentPage: Number(source.current_page) || 1,
    lastPage: Number(source.last_page) || 1,
  };
}

/** Approve / reject tiket (persetujuan awal maupun penutupan). */
export async function decideApproval(
  ticketId: string,
  payload: {
    decision: "APPROVE" | "REJECT";
    stage: "INITIAL" | "FINAL";
    rejection_reason?: string;
  },
): Promise<Ticket> {
  const token = await authToken();
  const response = await authenticatedFetch(
    `/api/auth/approvals/${encodeURIComponent(ticketId)}/decide`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      token,
    },
  );

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      string(record(body).message, "Gagal memproses persetujuan."),
    );
  }

  return toTicket(record(body).data);
}
