'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMyTicket, submitReview } from '@/lib/api/tickets';
import type { Ticket, TicketItemClaim } from '@/lib/types/ticket';
import type { SapOrderItem } from '@/lib/api/sap';
import { loadSapOrderItems, searchSapMasterItems, getItemGroups } from '@/lib/api/sap';
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
  type WorkflowTarget,
} from '@/lib/constants/reviewer';
import { TicketChatDrawer } from '@/components/shared/TicketChatDrawer';
import { AttachmentList } from '@/components/shared/AttachmentList';
import { TicketTimeline } from '@/components/shared/TicketTimeline';
import { TicketHeader } from '@/components/shared/TicketHeader';
import { TicketSummary } from '@/components/shared/TicketSummary';
import { DetailList } from '@/components/shared/DetailList';
import { DotChip } from '@/components/shared/DotChip';
import { ChoiceList } from '@/components/shared/ChoiceList';
import { ClaimItemsTable } from '@/components/shared/ClaimItemsTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  XCircle,
  Info,
  AlertCircle,
  Plus,
  Trash2,
  Send,
} from 'lucide-react';

export default function ReviewerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
// Asal daftar untuk breadcrumb "kembali" — lihat `fromRiwayat` di bawah.
const searchParams = useSearchParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  /* Detail pelapor & pelanggan ditangani TicketSummary (memiliki modalnya
     sendiri), jadi state + handler di sini tidak dibutuhkan lagi. */

  // Working copy — data hasil edit reviewer
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState<string>(SUBCATEGORY_MAP[CATEGORIES[0]][0]);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string | null>(null);
  const [tipeTiket, setTipeTiket] = useState<string>('COMPLAINT');
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
  const [productGroupCode, setProductGroupCode] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [categoryRows, setCategoryRows] = useState<{ id: string; code: string; name: string; parentId: string | null }[]>([]);
  const [productRows, setProductRows] = useState<{ code: string; name: string }[]>([]);
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

        const rawProds: { code: string; name: string }[] = [];
        setProductRows(rawProds);
        // Grup diambil dari endpoint SAP terpisah (bukan master/all).
        getItemGroups()
          .then((groups) => {
            setProductRows(
              groups
                .filter((g) => g.code !== null)
                .map((g) => ({ code: g.code as string, name: g.name }))
            );
          })
          .catch(() => {
            // Dropdown kosong — bukan hardcode.
          });

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
            ? (ticketTypeRows.find((t) => t.id === rev.ticket_type_id.new)?.code ?? data.ticketType)
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
        setProductGroupCode(
          vehicleDiff.group_code?.new != null
            ? String(vehicleDiff.group_code.new)
            : (data.productLine ?? ''),
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
        group_code: productGroupCode || undefined,
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
      toast.success(`Tinjauan awal disimpan - tiket diteruskan ke ${workflowTarget}.`);
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
      toast.success('Laporan ditolak.');
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
  //
  // Yang `is_recommended` diangkat ke atas supaya reviewer tidak perlu
  // memindai seluruh daftar; sort stabil jadi urutan matriks di dalam tiap
  // kelompok tetap dipertahankan.
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
    })
    .sort((a, b) => Number(b.isRecommended) - Number(a.isRecommended));
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

  /**
   * Ke daftar mana tombol "kembali" harus pergi.
   *
   * Halaman ini dilayani oleh DUA daftar — `/reviewer/tinjauan-awal` dan
   * `/reviewer/riwayat` — yang keduanya menunjuk ke route yang sama. Tanpa
   * penanda asal, breadcrumb selalu menunjuk ke Tinjauan Awal sehingga dibuka
   * dari Arsip & Riwayat, tombolnya melompat ke daftar yang salah.
   *
   * Penandanya datang dari query `?from=` yang ditempel link list. Kalau
   * URL dibuka langsung tanpa penanda, ditebak dari status tiket: yang masih
   * OPEN memang milik antrean tinjauan, selebihnya sudah riwayat.
   */
  const fromRiwayat =
    searchParams.get('from') === 'riwayat' ||
    (searchParams.get('from') === null && readOnly);

  return (
    <div className="space-y-6">
      {/* Header halaman — di luar Card supaya judul/badan/aksi tidak menumpuk */}
      <TicketHeader
        ticket={{ ...ticket, subject: subject || ticket.subject }}
        backHref={fromRiwayat ? '/reviewer/riwayat' : '/reviewer/tinjauan-awal'}
        backLabel={fromRiwayat ? 'Kembali ke Arsip & Riwayat' : 'Kembali ke Tinjauan Awal'}
        actions={
          <TicketChatDrawer ticketId={ticket.id} open={chatOpen} onOpenChange={setChatOpen} />
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom kiri (2/3): working copy + data tiket */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <TicketSummary ticket={ticket} showWansis />

          {/* Data yang bisa diedit reviewer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Data Laporan {readOnly ? '(Read-Only)' : '(Salinan Kerja)'}
              </CardTitle>
              <CardDescription>
                {readOnly
                  ? 'Tiket sudah melalui tahap review awal. Data di bawah bersifat read-only.'
                  : 'Koreksi data laporan sebelum diteruskan. Data asli pelapor tersimpan di riwayat.'}
              </CardDescription>
            </CardHeader>
            {/* Samakan dengan unit: `flex flex-col gap-6` supaya jarak antar
                blok berasal dari satu sumber. Tanpa ini tiap blok harus
                membawa spacing sendiri, dan yang tidak membawa terlihat
                menempel — termasuk Separator yang jadi nempel ke konten. */}
            <CardContent className="flex flex-col gap-6">
              <FieldGroup>
                <Field>
                  <FieldLabel>Subjek</FieldLabel>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={readOnly} />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Tipe Tiket</FieldLabel>
                    <Select
                      value={tipeTiket}
                      onValueChange={(v) => setTipeTiket(v ?? 'COMPLAINT')}
                      disabled={readOnly}
                      items={ticketTypeRows.map((t) => ({ value: t.code, label: t.name }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketTypeRows.map((t) => (
                          <SelectItem key={t.id} value={t.code}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Kategori</FieldLabel>
                    <Select
                      value={category}
                      onValueChange={(v) => handleCategoryChange(v ?? CATEGORIES[0])}
                      disabled={readOnly}
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
                  </Field>
                  <Field>
                    <FieldLabel>Sub Kategori</FieldLabel>
                    <Select
                      value={subcategory}
                      onValueChange={(v) => setSubcategory(v ?? subcategoryOptions[0])}
                      disabled={readOnly}
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
                  </Field>
                </div>

                <Field>
                  <FieldLabel>Deskripsi / Ruang Lingkup</FieldLabel>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24" disabled={readOnly} />
                </Field>
              </FieldGroup>

              {/* Informasi barang claim — khusus Klaim Distribusi & Pengiriman */}
              {isClaim && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">Data Penjualan</p>
                      {!readOnly && (
                        <p className="text-xs text-muted-foreground">
                          SO & barang dapat dikoreksi reviewer
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>Nomor SO</FieldLabel>
                        {readOnly ? (
                          <Input value={soNumber} placeholder="Nomor Sales Order" disabled />
                        ) : (
                          <SoCombobox value={soNumber} onValueChange={handleSoChange} />
                        )}
                      </Field>
                      <Field>
                        <FieldLabel>Nama Sales</FieldLabel>
                        <Input
                          value={salesName}
                          placeholder="Terisi otomatis"
                          readOnly
                          disabled={readOnly}
                          className="bg-muted/40 text-muted-foreground"
                          title="Terisi otomatis dari nomor SO"
                        />
                        <FieldDescription>Terisi otomatis dari nomor SO yang dipilih.</FieldDescription>
                      </Field>
                    </div>
                    {sapError && !readOnly ? (
                      <p className="text-sm text-destructive">{sapError}</p>
                    ) : null}
                  </div>
                </>
              )}

              {/* Informasi kendaraan — khusus Produk & Kendaraan */}
              {isVehicleCategory && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Lini Produk</FieldLabel>
                      <Select
                        value={productGroupCode}
                        onValueChange={(v) => setProductGroupCode(v ?? '')} disabled={readOnly}
                        items={productRows.map((p) => ({ value: p.code, label: p.name }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih lini produk..." />
                        </SelectTrigger>
                        <SelectContent>
                          {productRows.map((p) => (
                            <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>Model Kendaraan</FieldLabel>
                      <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Contoh: Vario 160" disabled={readOnly} />
                    </Field>
                  </div>
                </>
              )}

              {isClaim && (claimedItems.length > 0 || !readOnly) && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">Informasi Barang Claim</p>
                      {readOnly ? null : (
                        <Button type="button" variant="outline" size="sm" onClick={addClaimedItem}>
                          <Plus data-icon="inline-start" />
                          Tambah barang
                        </Button>
                      )}
                    </div>
                    {readOnly ? (
                      <ClaimItemsTable items={claimedItems} claimConfig={claimConfig} />
                    ) : claimedItems.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
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
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Lampiran Pelapor</p>
                    <AttachmentList items={ticket.attachments} layout="grid" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <TicketTimeline activities={ticket.activities} />
        </div>

        {/* Kolom kanan (1/3) KHUSUS keputusan & aksi — sticky sebagai satu kesatuan.
          Catatan: sticky hanya aman kalau isinya lebih pendek dari viewport.
          Karena itu tiap opsi radio (Tujuan Eskalasi + Aksi Handler) memakai
          `ChoiceList`, yang deskripsinya hanya muncul pada opsi terpilih —
          hemat ~180px dibanding menampilkan deskripsi di semua opsi. */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Keputusan & Routing</CardTitle>
                <CardDescription>
                  {readOnly
                    ? 'Nilai yang sudah ditetapkan pada review awal.'
                    : 'Tentukan prioritas dan tujuan penerusan, lalu teruskan atau tolak laporan ini.'}
                </CardDescription>
              </CardHeader>
              {/* `flex flex-col gap-6` supaya jarak antar field berasal dari
                  satu sumber. Tanpa itu, Unit Tujuan dan tombol di bawahnya
                  menempel karena keduanya sibling dari CardContent yang
                  `display: block` tanpa gap. */}
              <CardContent className="flex flex-col gap-6">
                {readOnly ? (
                  /* Read-only: tampilkan sebagai data, bukan kontrol. Control
                     disabled (Select/RadioGroup) tetap terlihat seperti opsi
                     yang bisa diubah — itu yang dikeluhkan user. */
                  <DetailList
                    items={[
                      {
                        label: 'Tujuan Approval / Eskalasi',
                        value:
                          WORKFLOW_OPTIONS.find((o) => o.value === workflowTarget)?.label ?? '-',
                      },
                      {
                        label: 'Tingkat Prioritas',
                        value: priority
                          ? `${priority} - ${PRIORITY_INFO[priority]}`
                          : 'Belum ditentukan',
                      },
                      {
                        label: 'Unit / Departemen Tujuan',
                        value: ticket.destinationDepartmentName || ticket.assignedUnit || '-',
                      },
                      ...(isClaim
                        ? [
                            (() => {
                              /* Mode read-only: tampilkan label + deskripsi.
                                 Versi lama hanya menampilkan label, padahal
                                 deskripsi menjelaskan apa yang harus dilakukan
                                 handler. Di mode edit deskripsi itu terlihat
                                 lewat ChoiceList; tanpa ini, begitu tiket masuk
                                 tahap berikutnya reviewer tidak bisa lagi
                                 membaca keputusan yang pernah diambil. */
                              const action =
                                availableActions.find((a) => a.id === handlerAction) ??
                                HANDLER_ACTIONS.find((a) => a.id === handlerAction);
                              return {
                                label: 'Aksi untuk Handler',
                                value: action ? (
                                  <span className="flex flex-col gap-1">
                                    <span>{action.label}</span>
                                    {action.description && (
                                      <span className="text-xs font-normal leading-relaxed text-muted-foreground">
                                        {action.description}
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  '-'
                                ),
                              };
                            })(),
                          ]
                        : []),
                    ]}
                    columns={1}
                  />
                ) : (
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Tujuan Approval / Eskalasi</FieldLabel>
                      <ChoiceList
                        value={workflowTarget}
                        onValueChange={(v) => setWorkflowTarget(v as WorkflowTarget)}
                        options={WORKFLOW_OPTIONS.map((opt) => ({
                          value: opt.value,
                          label: opt.label,
                          description: opt.description,
                        }))}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Tingkat Prioritas</FieldLabel>
                      <Select
                        value={priority ?? ''}
                        onValueChange={(v) => setPriority(v)}
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
                      <FieldDescription>
                        {priority
                          ? PRIORITY_INFO[priority]
                          : 'Prioritas belum ditentukan, pilih tingkat urgensi masalah.'}
                      </FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>Unit / Departemen Tujuan</FieldLabel>
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
                    </Field>

              {/* Aksi handler khusus klaim distribusi (matrix category_actions) */}
                    {isClaim && availableActions.length > 0 && (
                      <Field>
                        <FieldLabel>Aksi untuk Handler</FieldLabel>
                        <ChoiceList
                          value={handlerAction}
                          onValueChange={setHandlerAction}
                          options={availableActions.map((action) => ({
                            value: action.id,
                            label: action.label,
                            description: action.description,
                            trailing:
                              recommendedAction?.id === action.id ? (
                                <DotChip dotClass="bg-primary">Direkomendasikan</DotChip>
                              ) : null,
                          }))}
                        />
                        <FieldDescription>
                          Rekomendasi sistem berdasarkan subkategori terpilih.
                        </FieldDescription>
                      </Field>
                    )}
                  </FieldGroup>
                )}

                {readOnly ? (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Tiket sudah melalui tahap review awal dan sedang menunggu proses selanjutnya.
                      Data di halaman ini bersifat read-only.
                    </span>
                  </div>
                ) : null}

                {!readOnly && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      {submitError && (
                        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                          <span>{submitError}</span>
                        </div>
                      )}
                      <Button
                        className="w-full"
                        onClick={() => setConfirmAction('route')}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <Send data-icon="inline-start" />
                        )}
                        Teruskan Tiket
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => setConfirmAction('reject')}
                        disabled={submitting}
                      >
                        <XCircle data-icon="inline-start" />
                        Tolak
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
                variant="destructive"
                size="sm"
                onClick={() => onRemove(c.id)}
              >
                <Trash2 data-icon="inline-start" />
                Hapus
              </Button>
            </div>
            <div className={showSecondColumn ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
              <Field>
                <FieldLabel>{label1}</FieldLabel>
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
                  <p className="mt-1 truncate text-xs text-muted-foreground" title={c.itemName1}>
                    {c.itemName1}
                  </p>
                ) : null}
              </Field>
              {showSecondColumn && (
                <Field>
                  <FieldLabel>{label2}</FieldLabel>
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
                    <p className="mt-1 truncate text-xs text-muted-foreground" title={c.itemName2}>
                      {c.itemName2}
                    </p>
                  ) : null}
                </Field>
              )}
            </div>
            <div className="grid grid-cols-[96px_1fr] gap-2">
              <Field>
                <FieldLabel>Qty</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={qtyVal}
                  onChange={(e) => onUpdate(c.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                />
              </Field>
              <Field>
                <FieldLabel>Alasan</FieldLabel>
                <Input
                  value={reasonVal}
                  onChange={(e) => onUpdate(c.id, { issueDescription: e.target.value, reason: e.target.value })}
                  placeholder="Alasan klaim barang ini..."
                />
              </Field>
            </div>
          </div>
        );
      })}
    </div>
  );
}