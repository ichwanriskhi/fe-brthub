'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyTicket, submitReview } from '@/lib/api/tickets';
import type { Ticket, TicketItemClaim, TicketPriority, TicketType } from '@/lib/types/ticket';
import type { SapMasterItem, SapOrderItem } from '@/lib/api/sap';
import { loadSapOrderItems, searchSapMasterItems } from '@/lib/api/sap';
import { SoCombobox } from '@/components/shared/SoCombobox';
import { ClaimItemSelect } from '@/components/shared/ClaimItemSelect';
import { record } from '@/lib/utils/record';
import {
  getClaimConfig,
  subcategoryCodeOf,
  type SubcategoryClaimConfig,
} from '@/lib/constants/claim';
import {
  CATEGORIES,
  SUBCATEGORY_MAP,
  HANDLER_ACTIONS,
  WORKFLOW_OPTIONS,
  isDistributionClaim,
  PRIORITY_INFO,
  workflowLabelFromApi,
  type WorkflowTarget,
} from '@/lib/constants/reviewer';
import { UserDetailModal, type UserDetailData } from '@/components/shared/UserDetailModal';
import { StatusBadge, TypeBadge } from '@/components/shared/StatusBadge';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ArrowLeft,
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Truck,
  Info,
  Sparkles,
  User,
  Building,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Send,
} from 'lucide-react';

export default function ReviewerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);

  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userDetailTitle, setUserDetailTitle] = useState('');
  const [userDetailData, setUserDetailData] = useState<UserDetailData | null>(null);

  const openReporterDetail = () => {
    if (!ticket) return;
    setUserDetailTitle('Detail Pelapor');
    setUserDetailData({
      name: ticket.reporterName,
      email: ticket.reporterEmail,
      phone: ticket.reporterPhone,
      address: ticket.reporterAddress,
      department: ticket.reporterDepartment,
      position: ticket.reporterPosition,
      isEmployee: ticket.reporterType === 'EMPLOYEE' || !!ticket.reporterDepartment,
    });
    setUserDetailOpen(true);
  };

  const openCustomerDetail = () => {
    if (!ticket || !ticket.customerData) return;
    setUserDetailTitle('Detail Customer');
    setUserDetailData({
      name: ticket.customerData.name,
      email: ticket.customerData.email,
      phone: ticket.customerData.phone,
      address: ticket.customerData.address,
      isEmployee: false,
    });
    setUserDetailOpen(true);
  };

  // Working copy — data hasil edit reviewer
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState<string>(SUBCATEGORY_MAP[CATEGORIES[0]][0]);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority | null>(null);
  const [tipeTiket, setTipeTiket] = useState<TicketType>('COMPLAINT');
  const [handlerAction, setHandlerAction] = useState<string>('');
  const [workflowTarget, setWorkflowTarget] = useState<WorkflowTarget>('Division');
  const [destinationDepartment, setDestinationDepartment] = useState<string>('');
  const [claimedItems, setClaimedItems] = useState<TicketItemClaim[]>([]);
  const [soNumber, setSoNumber] = useState('');
  const [salesName, setSalesName] = useState('');
  // SAP helpers reviewer (pola sama dengan report/new): daftar barang per SO.
  const [sapItems, setSapItems] = useState<SapOrderItem[]>([]);
  const [sapLoading, setSapLoading] = useState(false);
  const [sapError, setSapError] = useState<string | null>(null);
  const [vehicleModel, setVehicleModel] = useState('');
  const [productId, setProductId] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [categoryRows, setCategoryRows] = useState<{ id: string; code: string; name: string; parentId: string | null }[]>([]);
  const [productRows, setProductRows] = useState<{ id: string; name: string }[]>([]);
  const [ticketTypeRows, setTicketTypeRows] = useState<{ id: string; code: string; name: string }[]>([]);
  const [priorityRows, setPriorityRows] = useState<{ id: string; code: string; name: string }[]>([]);
  // Master aksi handler (actions + category_actions) — sumber kebenaran daftar
  // opsi & rekomendasi per subkategori, menggantikan hardcode HANDLER_ACTIONS.
  const [actionRows, setActionRows] = useState<
    { id: string; code: string; name: string; description: string | null }[]
  >([]);
  const [categoryActionRows, setCategoryActionRows] = useState<
    { categoryId: string; actionId: string; isRecommended: boolean }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Dialog konfirmasi sebelum aksi penting: Teruskan (ROUTE) / Tolak (REJECT).
  const [confirmAction, setConfirmAction] = useState<'route' | 'reject' | null>(null);

  // ── Master data: departments + categories + products + ticket types ─────
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    fetch(`${API_URL}/api/master/all`)
      .then((res) => res.json())
      .then((data) => {
        const d = record(data);
        const list = Array.isArray(d?.departments) ? d.departments : [];
        setDepartments(list.map((x: { id: string; name: string }) => ({ id: String(x.id), name: x.name })));

        const rawCats = Array.isArray(d?.raw_categories) ? d.raw_categories : [];
        setCategoryRows(
          rawCats.map((x: { id: string; code?: string; name: string; parent_category_id: string | null }) => ({
            id: String(x.id),
            code: String(x.code ?? ''),
            name: x.name,
            parentId: x.parent_category_id ? String(x.parent_category_id) : null,
          })),
        );

        const rawProds = Array.isArray(d?.products) ? d.products : [];
        setProductRows(rawProds.map((x: { id: string; name: string }) => ({ id: String(x.id), name: x.name })));

        const rawTypes = Array.isArray(d?.ticketTypes) ? d.ticketTypes : [];
        setTicketTypeRows(
          rawTypes.map((x: { id: string; code: string; name: string }) => ({
            id: String(x.id),
            code: x.code,
            name: x.name,
          })),
        );

        const rawPriorities = Array.isArray(d?.priorities) ? d.priorities : [];
        setPriorityRows(
          rawPriorities
            .map((x: { id: string; code: string; name: string }) => ({
              id: String(x.id),
              code: x.code,
              name: x.name,
            }))
            .sort((a, b) => a.code.localeCompare(b.code)),
        );

        const rawActions = Array.isArray(d?.actions) ? d.actions : [];
        setActionRows(
          rawActions.map(
            (x: { id: string; code: string; name: string; description?: string | null }) => ({
              id: String(x.id),
              code: String(x.code),
              name: String(x.name),
              description: x.description ?? null,
            }),
          ),
        );

        const rawCategoryActions = Array.isArray(d?.category_actions)
          ? d.category_actions
          : [];
        setCategoryActionRows(
          rawCategoryActions.map(
            (x: { category_id: string; action_id: string; is_recommended?: boolean | number }) => ({
              categoryId: String(x.category_id),
              actionId: String(x.action_id),
              isRecommended: x.is_recommended === true || x.is_recommended === 1,
            }),
          ),
        );
      })
      .catch(() => {
        setDepartments([]);
        setCategoryRows([]);
        setProductRows([]);
        setTicketTypeRows([]);
        setPriorityRows([]);
      });
  }, []);

  // ── Ticket detail ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    getMyTicket(id)
      .then((data) => {
        if (cancelled) return;
        setTicket(data);

        // Working copy: kalau ada revision terbaru, tampilkan data hasil revision.
        // Origin tetap utuh di server (tidak di-override).
        const rev = data.latestRevision?.changes;
        const revNested = (field: string): Record<string, { new?: unknown }> =>
          rev && typeof rev[field] === 'object' && !Array.isArray(rev[field])
            ? (rev[field] as Record<string, { new?: unknown }>)
            : {};

        setSubject(
          rev?.subject ? (rev.subject.new as string) : data.subject,
        );
        setDescription(
          rev?.description ? (rev.description.new as string) : data.description,
        );
        // category_id di DB = ID SUBKATEGORI (child). Kategori parent
        // diturunkan dari relasi parentId. Jangan asumsikan category_id = parent.
        const revCategoryId = rev?.category_id ? String(rev.category_id.new) : null;
        const revRow = revCategoryId ? categoryRows.find((c) => c.id === revCategoryId) : undefined;
        const revParent = revRow?.parentId ? categoryRows.find((c) => c.id === revRow.parentId) : undefined;
        // Bila tiket tersimpan sebagai parent (data lama rusak), fallback ke
        // subcategoryId/categoryId dari mapper agar tampilan tetap benar bila ada.
        const originChild = categoryRows.find((c) => c.id === data.subcategoryId);
        const originParent = originChild?.parentId
          ? categoryRows.find((c) => c.id === originChild.parentId)
          : categoryRows.find((c) => c.id === data.categoryId);
        setCategory(
          revCategoryId
            ? (revParent?.name ?? revRow?.name ?? data.category)
            : (originParent?.name ?? data.category),
        );
        setSubcategory(
          revCategoryId
            ? (revRow?.parentId ? revRow.name : (data.subcategory || ''))
            : (originChild?.name ?? data.subcategory),
        );
        setPriority(data.priority);
        setTipeTiket(
          rev?.ticket_type_id
            ? (ticketTypeRows.find((t) => t.id === rev.ticket_type_id.new)?.code as TicketType) ?? data.ticketType
            : data.ticketType,
        );
        setWorkflowTarget((data.approvalTarget as WorkflowTarget) ?? 'Division');
        setHandlerAction(data.handlerActionId ?? '');
        setDestinationDepartment(data.destinationDepartmentId ?? '');

        setClaimedItems(
          rev?.claimed_items ? (rev.claimed_items.new as TicketItemClaim[]) : data.claimedItems ?? [],
        );
        const vehicleDiff = revNested('vehicle_detail');
        const salesDiff = revNested('sales_detail');
        setVehicleModel(
          vehicleDiff.vehicle_model?.new != null
            ? String(vehicleDiff.vehicle_model.new)
            : data.vehicleModel ?? '',
        );
        setProductId(
          vehicleDiff.product_id?.new != null ? String(vehicleDiff.product_id.new) : data.productId ?? '',
        );
        setSoNumber(
          salesDiff.so_number?.new != null ? String(salesDiff.so_number.new) : data.soNumber ?? '',
        );
        setSalesName(
          salesDiff.sales_name?.new != null ? String(salesDiff.sales_name.new) : data.salesName ?? '',
        );
        // Muat daftar barang SAP untuk SO awal (dropdown kolom-1 klaim).
        const initialSo = salesDiff.so_number?.new != null ? String(salesDiff.so_number.new) : data.soNumber ?? '';
        if (initialSo.trim()) {
          setSapLoading(true);
          setSapError(null);
          loadSapOrderItems(
            initialSo,
            (items) => {
              setSapItems(items);
              setSapLoading(false);
            },
            (message) => {
              setSapError(message);
              setSapLoading(false);
            },
          );
        } else {
          setSapItems([]);
        }
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Gagal memuat detail laporan.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, categoryRows, ticketTypeRows]);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    // Prefer daftar DB (categoryRows) agar konsisten dengan data master;
    // fallback ke konstanta lama bila master belum termuat / nama tak cocok.
    const parentRow = categoryRows.find((c) => c.name === value && !c.parentId);
    const firstChild = parentRow
      ? categoryRows
          .filter((c) => c.parentId === parentRow.id)
          .sort((a, b) => a.name.localeCompare(b.name))[0]
      : undefined;
    setSubcategory(firstChild?.name ?? SUBCATEGORY_MAP[value]?.[0] ?? SUBCATEGORY_MAP[CATEGORIES[0]][0]);
  };

  const handleSoChange = (nextSo: string, nextSales: string) => {
    setSoNumber(nextSo);
    setSalesName(nextSales);
    // Refresh daftar barang SAP + reset pilihan barang yang tidak ada di SO baru
    // (pola sama dengan report/new agar payload Wansis selalu konsisten dgn SO).
    setSapError(null);
    if (!nextSo.trim()) {
      setSapItems([]);
      setSapLoading(false);
      return;
    }
    setSapLoading(true);
    loadSapOrderItems(
      nextSo,
      (items) => {
        setSapItems(items);
        setSapLoading(false);
        const codes = new Set(items.map((i) => i.code));
        setClaimedItems((prev) =>
          prev.map((c) => ({
            ...c,
            itemCode1: c.itemCode1 && codes.has(c.itemCode1) ? c.itemCode1 : '',
            itemName1: c.itemCode1 && codes.has(c.itemCode1) ? (c.itemName1 ?? '') : '',
          })),
        );
      },
      (message) => {
        setSapError(message);
        setSapLoading(false);
      },
    );
  };

  const updateClaimedItem = (claimId: string, patch: Partial<TicketItemClaim>) => {
    setClaimedItems((prev) => prev.map((c) => (c.id === claimId ? { ...c, ...patch } : c)));
  };

  const addClaimedItem = () => {
    setClaimedItems((prev) => [
      ...prev,
      {
        id: `claim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        quantity: 1,
      } as TicketItemClaim,
    ]);
  };

  const removeClaimedItem = (claimId: string) => {
    setClaimedItems((prev) => prev.filter((c) => c.id !== claimId));
  };

  /**
   * Bangun payload revisions — kirim SEMUA field yang bisa diedit reviewer.
   * Backend yang compute diff vs origin: hanya field yang berubah yang disimpan
   * di ticket_revisions. Origin tidak pernah di-override.
   * Kontrak kategori: category_id HARUS id subkategori (child). Bila child
   * tidak ketemu, kirim undefined agar BE tidak menyimpan parent secara diam-diam.
   */
  const buildRevisionsPayload = () => {
    const ticketTypeId =
      ticketTypeRows.find((t) => t.code === tipeTiket)?.id ?? ticket?.ticketType
        ? ticketTypeRows.find((t) => t.code === ticket?.ticketType)?.id
        : undefined;

    const parentCategory = categoryRows.find((c) => c.name === category && !c.parentId);
    const childCandidates = parentCategory
      ? categoryRows.filter((c) => c.parentId === parentCategory.id)
      : categoryRows.filter((c) => c.parentId);
    const norm = (s: string) => s.trim().toLowerCase();
    const childCategory =
      childCandidates.find((c) => norm(c.name) === norm(subcategory)) ??
      categoryRows.find((c) => c.parentId && norm(c.name) === norm(subcategory));

    return {
      subject: subject.trim(),
      ticket_type_id: ticketTypeId,
      category_id: childCategory?.id ?? undefined,
      description: description.trim(),
      sales_detail: {
        so_number: soNumber.trim() || undefined,
        sales_name: salesName.trim() || undefined,
      },
      vehicle_detail: {
        vehicle_model: vehicleModel.trim() || undefined,
        product_id: productId || undefined,
      },
      claimed_items: claimedItems.length > 0 ? claimedItems : undefined,
    };
  };

  const handleSubmit = async () => {
    if (readOnly) return;
    if (!subject.trim() || !priority || !workflowTarget) {
      setSubmitError('Lengkapi subjek, prioritas, dan tujuan eskalasi.');
      return;
    }
    if (!destinationDepartment) {
      setSubmitError('Pilih unit / departemen tujuan.');
      return;
    }
    // Kategori yang punya opsi aksi (matrix category_actions) wajib memilih
    // satu — aturan yang sama ditegakkan backend di submitReview (422).
    if (isClaim && availableActions.length > 0 && !handlerAction) {
      setSubmitError('Pilih aksi untuk handler terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const revisions = buildRevisionsPayload();
      const priorityRow = priorityRows.find((p) => p.code === priority);
      const workflowApiValue = WORKFLOW_OPTIONS.find((o) => o.value === workflowTarget)?.apiValue;
      await submitReview(id, {
        decision: 'ROUTE',
        priority_id: priorityRow?.id,
        approval_type: workflowApiValue,
        destination_department_id: destinationDepartment,
        action_id: handlerAction || undefined,
        revisions: Object.keys(revisions).length > 0 ? revisions : undefined,
      });
      setActionDone(`Tinjauan awal disimpan — tiket diteruskan ke ${workflowTarget}.`);
      setTimeout(() => router.push('/reviewer/tinjauan-awal'), 1500);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Gagal mengirim hasil review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (readOnly) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitReview(id, { decision: 'REJECT' });
      setActionDone('Laporan ditolak.');
      setTimeout(() => router.push('/reviewer/tinjauan-awal'), 1500);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Gagal menolak tiket.');
    } finally {
      setSubmitting(false);
    }
  };

  const isClaim = isDistributionClaim(category);
  const isVehicleCategory = category === 'Produk & Kendaraan';
  // Opsi subkategori dari master DB (100% database) agar nama selalu cocok
  // dengan categoryRows yang dipakai saat submit. Fallback ke konstanta lama.
  const dbSubcategoryOptions = (() => {
    const parentRow = categoryRows.find((c) => c.name === category && !c.parentId);
    if (!parentRow) return null;
    const children = categoryRows
      .filter((c) => c.parentId === parentRow.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => c.name);
    return children.length > 0 ? children : null;
  })();
  const subcategoryOptions = dbSubcategoryOptions ?? SUBCATEGORY_MAP[category] ?? SUBCATEGORY_MAP[CATEGORIES[0]];

  // Subkategori di halaman ini disimpan sebagai NAME ("Salah Kirim"), sedangkan
  // konfigurasi kolom klaim dikunci oleh CODE master (KLAIM_DISTRIBUSI_*).
  // Resolve lewat categoryRows dulu, baru fallback ke helper code/nama.
  const selectedSubcategoryRow = (() => {
    const target = subcategory.trim().toLowerCase();
    if (!target) return undefined;
    const parentRow = categoryRows.find((c) => c.name === category && !c.parentId);
    return (
      categoryRows.find(
        (c) => c.parentId === parentRow?.id && c.name.trim().toLowerCase() === target,
      ) ?? categoryRows.find((c) => c.parentId && c.name.trim().toLowerCase() === target)
    );
  })();
  const subcategoryCode = selectedSubcategoryRow?.code ?? subcategoryCodeOf(subcategory) ?? '';
  // null = subkategori belum dikenal (mis. tiket lama yang menyimpan kategori
  // induk) → editor klaim memakai label generik.
  const claimConfig = getClaimConfig(subcategoryCode || subcategory, categoryRows);

  // Opsi aksi handler: join matrix master (category_actions × actions) ke
  // subkategori terpilih berdasarkan ID kategori — bukan pencocokan nama
  // string yang rapuh kapitalisasi ("Salah kirim" vs "Salah Kirim").
  const availableActions = categoryActionRows
    .filter((ca) => ca.categoryId === selectedSubcategoryRow?.id)
    .flatMap((ca) => {
      const action = actionRows.find((a) => a.id === ca.actionId);
      return action
        ? [
            {
              id: action.code,
              label: action.name,
              description: action.description ?? '',
              isRecommended: ca.isRecommended,
            },
          ]
        : [];
    });
  const recommendedAction = availableActions.find((a) => a.isRecommended) ?? null;

  if (isLoading || !ticket) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {isLoading ? 'Memuat detail laporan…' : loadError ?? 'Laporan tidak ditemukan.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Hanya tiket OPEN (belum di-review) yang bisa diedit reviewer.
   * Tiket yang sudah diproses (di halaman riwayat/arsip) bersifat read-only.
   */
  const readOnly = ticket.status !== 'OPEN';

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/reviewer/tinjauan-awal">
            <ArrowLeft className="size-4" />
            <span>Kembali</span>
          </Link>
        </Button>

        <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
      </div>

      {actionDone && (
        <div className="bg-emerald-500/10 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 rounded-lg border p-4 text-xs font-semibold">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>{actionDone}</span>
        </div>
      )}

      {/* Ticket Brief Header */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{ticket.id}</span>
                <span>•</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{subject || ticket.subject}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge ticketType={tipeTiket} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-muted-foreground" />
              <span>
                Pelapor:{' '}
                <button
                  type="button"
                  onClick={openReporterDetail}
                  className="font-semibold text-foreground hover:underline"
                >
                  {ticket.reporterName}
                </button>
              </span>
            </div>
            {ticket.soNumber && (
              <div className="flex items-center gap-1.5">
                <FileText className="size-4 text-muted-foreground" />
                <span>SO: <strong className="font-semibold text-foreground">{ticket.soNumber}</strong></span>
              </div>
            )}
            {ticket.salesName && (
              <div className="flex items-center gap-1.5">
                <User className="size-4 text-muted-foreground" />
                <span>Sales: <strong className="font-semibold text-foreground">{ticket.salesName}</strong></span>
              </div>
            )}
            {ticket.productLine && (
              <div className="flex items-center gap-1.5">
                <Truck className="size-4 text-muted-foreground" />
                <span>Lini Produk: <strong className="font-semibold text-foreground">{ticket.productLine}</strong></span>
              </div>
            )}
            {ticket.vehicleModel && (
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-muted-foreground" />
                <span>Model Kendaraan: <strong className="font-semibold text-foreground">{ticket.vehicleModel}</strong></span>
              </div>
            )}
            {ticket.customerData?.name && (
              <div className="flex items-center gap-1.5">
                <Building className="size-4 text-muted-foreground" />
                <span>
                  Customer:{' '}
                  <button
                    type="button"
                    onClick={openCustomerDetail}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {ticket.customerData.name}
                  </button>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Kolom kiri: working copy + data tiket */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Data yang bisa diedit reviewer */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-muted-foreground" />
                Data Laporan {readOnly ? '(Read-Only)' : '(Salinan Kerja)'}
              </CardTitle>
              <CardDescription className="text-xs">
                {readOnly
                  ? 'Tiket sudah melalui tahap review awal. Data di bawah bersifat read-only.'
                  : 'Koreksi data laporan sebelum diteruskan. Data asli pelapor tersimpan di riwayat.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Subjek
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={readOnly} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Tipe Tiket
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <Select value={tipeTiket} onValueChange={(v) => setTipeTiket(v ?? 'COMPLAINT')} disabled={readOnly} items={[
                    { value: 'REQUEST', label: 'Request' },
                    { value: 'INCIDENT', label: 'Incident' },
                    { value: 'COMPLAINT', label: 'Complaint' },
                    { value: 'INQUIRY', label: 'Inquiry' },
                  ]}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REQUEST">Request</SelectItem>
                      <SelectItem value="INCIDENT">Incident</SelectItem>
                      <SelectItem value="COMPLAINT">Complaint</SelectItem>
                      <SelectItem value="INQUIRY">Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Kategori
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  {readOnly ? (
                    <Input value={ticket.category} disabled />
                  ) : (
                    <Select
                      value={category}
                      onValueChange={(v) => handleCategoryChange(v ?? CATEGORIES[0])}
                      items={CATEGORIES.map((c) => ({ value: c, label: c }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Sub Kategori
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  {readOnly ? (
                    <Input value={ticket.subcategory} disabled />
                  ) : (
                    <Select
                      value={subcategory}
                      onValueChange={(v) => setSubcategory(v ?? subcategoryOptions[0])}
                      items={subcategoryOptions.map((sc) => ({ value: sc, label: sc }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategoryOptions.map((sc) => (
                          <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Deskripsi / Ruang Lingkup
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24" disabled={readOnly} />
              </div>

              {/* Informasi barang claim — khusus Klaim Distribusi & Pengiriman */}
              {isClaim && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">Data Penjualan</span>
                      {readOnly ? null : (
                        <span className="text-[11px] text-muted-foreground">SO & barang dapat dikoreksi reviewer</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">No. SO</label>
                        {readOnly ? (
                          <Input value={soNumber} placeholder="Nomor Sales Order" disabled />
                        ) : (
                          <SoCombobox value={soNumber} onValueChange={handleSoChange} />
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">Nama Sales</label>
                        <Input
                          value={salesName}
                          placeholder="Terisi otomatis"
                          readOnly
                          disabled={readOnly}
                          className="bg-muted/40 text-muted-foreground"
                          title="Terisi otomatis dari nomor SO"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Terisi otomatis dari nomor SO yang dipilih.
                        </p>
                      </div>
                    </div>
                    {sapError && !readOnly ? (
                      <p className="text-[11px] text-destructive">{sapError}</p>
                    ) : null}
                  </div>
                </>
              )}

              {/* Informasi kendaraan — khusus Produk & Kendaraan */}
              {isVehicleCategory && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Lini Produk</label>
                      <Select
                        value={productId}
                        onValueChange={(v) => setProductId(v ?? '')} disabled={readOnly}
                        items={productRows.map((p) => ({ value: p.id, label: p.name }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih lini produk..." />
                        </SelectTrigger>
                        <SelectContent>
                          {productRows.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">Model Kendaraan</label>
                      <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Contoh: Vario 160" disabled={readOnly} />
                    </div>
                  </div>
                </>
              )}

              {isClaim && (claimedItems.length > 0 || !readOnly) && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Truck className="size-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Informasi Barang Claim</span>
                      </div>
                      {readOnly ? null : (
                        <Button type="button" variant="outline" size="sm" onClick={addClaimedItem}>
                          <Plus className="size-3.5" />
                          <span>Tambah barang</span>
                        </Button>
                      )}
                    </div>
                    {readOnly ? (
                      <ClaimItemsTable items={claimedItems} claimConfig={claimConfig} />
                    ) : claimedItems.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                        Belum ada barang klaim — tambah via tombol di atas.
                      </p>
                    ) : (
                      <ReviewerClaimEditor
                        items={claimedItems}
                        soNumber={soNumber}
                        sapItems={sapItems}
                        sapLoading={sapLoading}
                        sapError={sapError}
                        claimConfig={claimConfig}
                        onUpdate={updateClaimedItem}
                        onRemove={removeClaimedItem}
                      />
                    )}
                  </div>
                </>
              )}

              {ticket.attachments && ticket.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-2">Lampiran Pelapor</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ticket.attachments.map((att) => (
                        <a key={att.id} href={att.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors">
                        <Paperclip className="size-4 text-primary shrink-0" />
                        <span className="font-medium truncate flex-1 text-sm">{att.name}</span>
                        <span className="text-[10px] text-muted-foreground">{att.size}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan: keputusan & routing */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                Prioritas & Tujuan Penerusan
              </CardTitle>
              <CardDescription className="text-xs">
                Tentukan prioritas dan tujuan penerusan tiket.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tujuan Approval/Eskalasi */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-2">
                  Tujuan Approval / Eskalasi
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <RadioGroup
                  value={workflowTarget}
                  onValueChange={(v) => setWorkflowTarget(v as WorkflowTarget)}
                  className="gap-2"
                  disabled={readOnly}
                >
                  {WORKFLOW_OPTIONS.map((opt) => {
                    const selected = workflowTarget === opt.value;
                    return (
                      <label
                        key={opt.value}
                        data-checked={selected || undefined}
                        className="flex w-full cursor-pointer flex-col rounded-lg border border-border p-3 transition-colors hover:bg-accent data-checked:border-primary data-checked:bg-primary/10 dark:border-input"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} />
                          <span className="text-sm font-semibold">{opt.label}</span>
                        </div>
                        <p className="mt-1 ml-6 text-xs text-muted-foreground">{opt.description}</p>
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Prioritas */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Tingkat Prioritas
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <Select
                  value={priority ?? ''}
                  onValueChange={(v) => setPriority(v as TicketPriority)} disabled={readOnly}
                  items={priorityRows.map((p) => ({ value: p.code, label: `Prioritas ${p.code} (${p.name})` }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih prioritas..." />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityRows.map((p) => (
                      <SelectItem key={p.id} value={p.code}>
                        {p.code} - {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Info className="size-3.5 shrink-0" />
                  {priority ? PRIORITY_INFO[priority] : 'Prioritas belum ditentukan - pilih tingkat urgensi masalah.'}
                </p>
              </div>

              {/* Unit / Departemen Tujuan (untuk ROUTE) */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Unit / Departemen Tujuan
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                {readOnly ? (
                  <Input value={ticket.destinationDepartmentName || ticket.assignedUnit || '-'} disabled />
                ) : (
                  <Select
                    value={destinationDepartment}
                    onValueChange={(v) => setDestinationDepartment(v ?? '')}
                    items={departments.map((d) => ({ value: d.id, label: d.name }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih unit tujuan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Aksi handler khusus klaim distribusi (matrix category_actions) */}
              {isClaim && availableActions.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Aksi untuk Handler</label>
                  <RadioGroup value={handlerAction} onValueChange={setHandlerAction} className="gap-2" disabled={readOnly}>
                    {availableActions.map((action) => {
                      const selected = handlerAction === action.id;
                      const isRecommended = recommendedAction?.id === action.id;
                      return (
                        <label
                          key={action.id}
                          data-checked={selected || undefined}
                          className="flex w-full cursor-pointer flex-col rounded-lg border border-border p-3 transition-colors hover:bg-accent data-checked:border-primary data-checked:bg-primary/10 dark:border-input"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={action.id} />
                            <span className="text-sm font-semibold">{action.label}</span>
                            {isRecommended && (
                              <Badge variant="secondary" className="gap-1">
                                <Sparkles className="size-3" />
                                Direkomendasikan
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 ml-6 text-xs text-muted-foreground">{action.description}</p>
                        </label>
                      );
                    })}
                  </RadioGroup>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5 shrink-0" />
                    Rekomendasi sistem berdasarkan sub kategori terpilih.
                  </p>
                </div>
              )}

              {/* Ringkasan keputusan */}
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Ringkasan Keputusan
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="block text-muted-foreground">Prioritas</span>
                    <span className="font-semibold">{priority ?? 'Belum ditentukan'}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground">Tujuan Eskalasi</span>
                    <span className="font-semibold">{workflowTarget}</span>
                  </div>
                  {isClaim && (
                    <div className="col-span-2">
                      <span className="block text-muted-foreground">Aksi Handler</span>
                      <span className="font-semibold">
                        {availableActions.find((a) => a.id === handlerAction)?.label ??
                          HANDLER_ACTIONS.find((a) => a.id === handlerAction)?.label ??
                          '-'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {readOnly ? (
                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <Info className="size-4 shrink-0 mt-0.5" />
                  <span>
                    Tiket sudah melalui tahap review awal dan sedang menunggu proses selanjutnya.
                    Data di halaman ini bersifat read-only.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button onClick={() => setConfirmAction('route')} disabled={submitting} className="flex-1 text-xs font-semibold gap-2">
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                    <span>Teruskan Tiket</span>
                  </Button>
                  <Button onClick={() => setConfirmAction('reject')} disabled={submitting} variant="destructive" className="text-xs font-semibold gap-2">
                    <XCircle className="size-4" />
                    <span>Tolak</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <UserDetailModal
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
        title={userDetailTitle}
        user={userDetailData}
      />

      {/* Konfirmasi sebelum aksi penting (ROUTE / REJECT) — validasi di dalam
          handler tetap berjalan; galat tampil di banner submitError. */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        variant={confirmAction === 'reject' ? 'destructive' : 'default'}
        icon={
          confirmAction === 'reject' ? (
            <AlertCircle className="text-destructive" />
          ) : (
            <Send className="text-primary" />
          )
        }
        title={confirmAction === 'reject' ? 'Tolak laporan ini?' : 'Teruskan tiket ke approver?'}
        description={
          confirmAction === 'reject'
            ? 'Laporan akan berstatus REJECTED dan tidak dapat dibatalkan. Lanjutkan?'
            : `Tiket akan diteruskan ke ${workflowTarget ?? 'tujuan eskalasi'} melalui ${
                departments.find((d) => d.id === destinationDepartment)?.name ?? 'unit tujuan'
              }. Pastikan seluruh data review sudah benar.`
        }
        confirmLabel={confirmAction === 'reject' ? 'Ya, Tolak' : 'Ya, Teruskan'}
        loading={submitting}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === 'route') void handleSubmit();
          else if (action === 'reject') void handleReject();
        }}
      />
    </div>
  );
}

/** Editor baris klaim reviewer (dipisah agar file tetap lolos batas edit). */
function ReviewerClaimEditor({
  items,
  soNumber,
  sapItems,
  sapLoading,
  sapError,
  claimConfig,
  onUpdate,
  onRemove,
}: {
  items: TicketItemClaim[];
  soNumber: string;
  sapItems: SapOrderItem[];
  sapLoading: boolean;
  sapError: string | null;
  /**
   * Konfigurasi kolom klaim per subkategori (sumber sama dengan report/new).
   * `null` = subkategori belum dikenal → label generik + kolom pembanding tetap
   * ditampilkan agar tidak ada data yang tersembunyi.
   */
  claimConfig: SubcategoryClaimConfig | null;
  onUpdate: (claimId: string, patch: Partial<TicketItemClaim>) => void;
  onRemove: (claimId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((c, idx) => {
        const qtyVal = Number(c.quantity ?? c.qty ?? 1) || 1;
        const reasonVal = c.issueDescription ?? c.reason ?? '';
        // Label kolom mengikuti subkategori (mis. "Barang yang dikembalikan"),
        // jatuh ke label generik hanya bila subkategori belum dikenal.
        const label1 = claimConfig?.role1Label ?? `Barang (dari SO ${soNumber || '—'})`;
        const label2 = claimConfig?.role2Label ?? 'Barang pembanding (Master SAP)';
        // Kolom pembanding disembunyikan HANYA bila subkategori memang 1 kolom DAN
        // baris ini belum punya barang pembanding → data lama tidak hilang.
        const showSecondColumn =
          claimConfig?.hasSecondColumn === false ? Boolean(c.itemCode2) : true;
        return (
          <div key={c.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">Barang {idx + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:text-destructive"
                onClick={() => onRemove(c.id)}
              >
                <Trash2 className="size-3.5" />
                <span>Hapus</span>
              </Button>
            </div>
            <div className={showSecondColumn ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  {label1}
                </label>
                <ClaimItemSelect
                  id={`rev-item1-${c.id}`}
                  items={sapItems}
                  value={c.itemCode1 ?? ''}
                  selectedName={c.itemName1 ?? ''}
                  showNameInTrigger={false}
                  onValueChange={(code, name) => onUpdate(c.id, { itemCode1: code, itemName1: name })}
                  loading={sapLoading}
                  disabled={!soNumber}
                  error={sapError}
                  placeholder="Pilih barang dari SO..."
                />
                {c.itemName1 ? (
                  <p className="mt-1 truncate text-[11px] text-muted-foreground" title={c.itemName1}>
                    {c.itemName1}
                  </p>
                ) : null}
              </div>
              {showSecondColumn && (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                    {label2}
                  </label>
                  <ClaimItemSelect
                    id={`rev-item2-${c.id}`}
                    items={[]}
                    value={c.itemCode2 ?? ''}
                    selectedName={c.itemName2 ?? ''}
                    showNameInTrigger={false}
                    onValueChange={(code, name) => onUpdate(c.id, { itemCode2: code, itemName2: name })}
                    loading={sapLoading}
                    disabled={!soNumber}
                    error={sapError}
                    placeholder="Cari barang ..."
                    mode="master"
                    onSearch={searchSapMasterItems}
                  />
                  {c.itemName2 ? (
                    <p className="mt-1 truncate text-[11px] text-muted-foreground" title={c.itemName2}>
                      {c.itemName2}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
            <div className="grid grid-cols-[96px_1fr] gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Qty</label>
                <Input
                  type="number"
                  min={1}
                  value={qtyVal}
                  onChange={(e) => onUpdate(c.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Alasan</label>
                <Input
                  value={reasonVal}
                  onChange={(e) => onUpdate(c.id, { issueDescription: e.target.value, reason: e.target.value })}
                  placeholder="Alasan klaim barang ini..."
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}