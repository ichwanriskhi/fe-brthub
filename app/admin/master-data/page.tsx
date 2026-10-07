'use client';

import { useEffect, useState } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import {
  getMasterDataAll,
  createMasterData,
  updateMasterData,
  deleteMasterData,
  type RawCategory,
  type RawDepartment,
  type RawPosition,
  type RawAction,
  type RawCategoryAction,
  type RawPriority,
  type RawTicketType,
  type MasterDataCrudType,
} from '@/lib/api/master';
import type {
  MasterDataEntry,
  MasterDataType,
  CategoryEntry,
  DepartmentEntry,
  PositionEntry,
  ActionEntry,
  PriorityEntry,
  TicketTypeEntry,
} from '@/lib/types/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/shared/DataTable';
import type { DataTableFeatures } from '@/components/shared/data-table-features';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { ColumnToggle } from '@/components/shared/ColumnToggle';
import { DotChip } from '@/components/shared/DotChip';
import { ActiveBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, ExternalLink, Database, ListChecks } from 'lucide-react';
import { CategoryActionDialog } from '@/components/shared/CategoryActionDialog';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

interface TabConfig {
  tab: MasterDataType;
  label: string;
  entries: MasterDataEntry[];
}

// ─── Normalizer: backend raw → entry shape yang dipakai tabel ─────────────────

function normalizeCategories(raw: RawCategory[]): CategoryEntry[] {
  return raw.map((c, i) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    isActive: c.isActive,
    parentId: c.parentId ?? undefined,
    code: c.code,
    sortOrder: i + 1,
  }));
}

function normalizeDepartments(raw: RawDepartment[]): DepartmentEntry[] {
  return raw.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description ?? undefined,
    isActive: d.isActive,
    unitCode: d.code,
    sortOrder: d.sortOrder || 1,
  }));
}

function normalizePositions(raw: RawPosition[], deptNameById: Map<string, string>): PositionEntry[] {
  return raw.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.departmentId ? deptNameById.get(p.departmentId) : undefined,
    isActive: p.isActive,
    hierarchyLevel: p.hierarchyLevel,
    sortOrder: p.hierarchyLevel,
    departmentId: p.departmentId ?? undefined,
    code: p.code,
  }));
}

function normalizeActions(raw: RawAction[]): ActionEntry[] {
  return raw.map((a, i) => ({
    id: a.id,
    name: a.name,
    description: a.description ?? undefined,
    isActive: a.isActive,
    actionCode: a.code,
    sortOrder: i + 1,
  }));
}

function normalizePriorities(raw: RawPriority[]): PriorityEntry[] {
  return raw.map((p) => ({
    id: p.id,
    name: p.name,
    description: undefined,
    isActive: p.isActive,
    priorityCode: p.code,
    sortOrder: p.sortOrder,
  }));
}

function normalizeTicketTypes(raw: RawTicketType[]): TicketTypeEntry[] {
  return raw.map((t, i) => ({
    id: t.id,
    name: t.name,
    description: undefined,
    isActive: t.isActive,
    ticketTypeCode: t.code,
    sortOrder: i + 1,
  }));
}

const TAB_ORDER: MasterDataType[] = [
  'category',
  'department',
  'position',
  'action',
  'priority',
  'ticketType',
];

const DEFAULT_NAME: Record<MasterDataType, string> = {
  category: 'Kategori',
  department: 'Departemen',
  position: 'Posisi',
  action: 'Aksi',
  priority: 'Prioritas',
  ticketType: 'Tipe Tiket',
};

function isCategory(e: MasterDataEntry): e is CategoryEntry {
  return 'parentId' in e;
}

function isAction(e: MasterDataEntry): e is ActionEntry {
  return 'actionCode' in e;
}

function isPriority(e: MasterDataEntry): e is PriorityEntry {
  return 'priorityCode' in e;
}

function isTicketType(e: MasterDataEntry): e is TicketTypeEntry {
  return 'ticketTypeCode' in e;
}

function isDepartment(e: MasterDataEntry): e is DepartmentEntry {
  return 'unitCode' in e;
}

function isPosition(e: MasterDataEntry): e is PositionEntry {
  return 'hierarchyLevel' in e && 'departmentId' in e;
}

function slugCode(name: string, max = 50): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, max);
  return slug || 'ITEM';
}


function StatusBadgeCell({ entry }: { entry: MasterDataEntry }) {
  return <ActiveBadge isActive={entry.isActive} />;
}

const columnHelper = createColumnHelper<DataTableFeatures, MasterDataEntry>();

export default function AdminMasterDataPage() {
  const [activeTab, setActiveTab] = useState<MasterDataType>('category');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(ITEMS_PER_PAGE);
  const [filterValues, setFilterValues] = useState<Record<string, string | null>>({});
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterDataEntry | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MasterDataEntry | null>(null);

  // Master data asli dari backend
  const [categories, setCategories] = useState<CategoryEntry[]>([]);
  const [departments, setDepartments] = useState<DepartmentEntry[]>([]);
  const [positions, setPositions] = useState<PositionEntry[]>([]);
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [priorities, setPriorities] = useState<PriorityEntry[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeEntry[]>([]);
  // Matriks kategori → aksi — sumber hitungan "dipakai" di tab Aksi/Kategori.
  const [matrixRows, setMatrixRows] = useState<RawCategoryAction[]>([]);
  // Dialog matriks per kategori (Opsi A: dari tab Kategori, bukan tab terpisah).
  const [matrixCategory, setMatrixCategory] = useState<CategoryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state (mock — belum tersimpan)
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [categoryType, setCategoryType] = useState<'main' | 'sub'>('main');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [hierarchyLevel, setHierarchyLevel] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [actionCode, setActionCode] = useState('');
  const [priorityCode, setPriorityCode] = useState('');
  const [ticketTypeCode, setTicketTypeCode] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const data = await getMasterDataAll();
      const depts = normalizeDepartments(data.departments);
      const deptNameById = new Map(depts.map((d) => [d.id, d.name]));
      setCategories(normalizeCategories(data.categories));
      setDepartments(depts);
      setPositions(normalizePositions(data.positions, deptNameById));
      setActions(normalizeActions(data.actions));
      setPriorities(normalizePriorities(data.priorities));
      setTicketTypes(normalizeTicketTypes(data.ticketTypes));
      setMatrixRows(
        data.categoryActions.map((ca) => ({
          categoryId: ca.categoryId,
          actionId: ca.actionId,
          isRecommended: ca.isRecommended,
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat master data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && TAB_ORDER.includes(tab as MasterDataType)) {
      setActiveTab(tab as MasterDataType);
    }
  }, []);

  const configs: TabConfig[] = [
    { tab: 'category', label: 'Kategori', entries: categories },
    { tab: 'department', label: 'Departemen', entries: departments },
    { tab: 'position', label: 'Posisi', entries: positions },
    { tab: 'action', label: 'Aksi', entries: actions },
    { tab: 'priority', label: 'Prioritas', entries: priorities },
    { tab: 'ticketType', label: 'Tipe Tiket', entries: ticketTypes },
  ];

  const config = configs.find((c) => c.tab === activeTab) ?? configs[0];
  const title = DEFAULT_NAME[activeTab];
  const topLevelCategories = categories.filter((c) => !c.parentId);
  const parentCategoryOptions = topLevelCategories.filter((c) => !editing || c.id !== editing.id);

  const parentCategoryName = (entry: MasterDataEntry): string | undefined => {
    if (isCategory(entry) && entry.parentId) {
      return categories.find((c) => c.id === entry.parentId)?.name;
    }
    return undefined;
  };

  // Filter configs per tab
  const getFiltersForTab = (tab: MasterDataType) => {
    switch (tab) {
      case 'category':
        return [
          {
            key: 'isActive',
            label: 'Status',
            options: [
              { value: 'true', label: 'Aktif' },
              { value: 'false', label: 'Nonaktif' },
            ],
          },
          {
            key: 'parentCategory',
            label: 'Kategori Induk',
            options: topLevelCategories.map((c) => ({ value: c.id, label: c.name })),
          },
        ];
      case 'department':
      case 'action':
      case 'priority':
      case 'ticketType':
        return [
          {
            key: 'isActive',
            label: 'Status',
            options: [
              { value: 'true', label: 'Aktif' },
              { value: 'false', label: 'Nonaktif' },
            ],
          },
        ];
      case 'position':
        return [
          {
            key: 'isActive',
            label: 'Status',
            options: [
              { value: 'true', label: 'Aktif' },
              { value: 'false', label: 'Nonaktif' },
            ],
          },
          {
            key: 'department',
            label: 'Departemen',
            options: departments.map((d) => ({ value: d.id, label: d.name })),
          },
        ];
      default:
        return [];
    }
  };

  const filteredEntries = config.entries.filter((e) => {
    if (
      search.trim() &&
      !e.name.toLowerCase().includes(search.toLowerCase()) &&
      !(e.description ?? '').toLowerCase().includes(search.toLowerCase()) &&
      !(isAction(e) && e.actionCode.toLowerCase().includes(search.toLowerCase())) &&
      !(isPriority(e) && e.priorityCode.toLowerCase().includes(search.toLowerCase())) &&
      !(isTicketType(e) && e.ticketTypeCode.toLowerCase().includes(search.toLowerCase()))
    ) {
      return false;
    }
    // Apply filters
    const isActiveFilter = filterValues.isActive;
    if (isActiveFilter !== null && isActiveFilter !== undefined) {
      if (e.isActive !== (isActiveFilter === 'true')) return false;
    }
    if (activeTab === 'category') {
      const parentFilter = filterValues.parentCategory;
      if (parentFilter && isCategory(e) && e.parentId !== parentFilter) return false;
    }
    if (activeTab === 'position') {
      const deptFilter = filterValues.department;
      if (deptFilter && 'departmentId' in e && e.departmentId !== deptFilter) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const entries = filteredEntries.slice((safePage - 1) * perPage, safePage * perPage);

  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setCategoryType('main');
    setParentCategoryId('');
    setUnitCode('');
    setHierarchyLevel('');
    setDepartmentId('');
    setActionCode('');
    setPriorityCode('');
    setTicketTypeCode('');
    setSortOrder('');
    setDialogOpen(true);
  };

  const openEdit = (entry: MasterDataEntry) => {
    setEditing(entry);
    setFormName(entry.name);
    setFormDescription(entry.description ?? '');
    setCategoryType('main');
    setParentCategoryId('');
    setUnitCode('');
    setHierarchyLevel('');
    setDepartmentId('');
    setActionCode('');
    setPriorityCode('');
    setTicketTypeCode('');
    setSortOrder('');

    if (isCategory(entry)) {
      setCategoryType(entry.parentId ? 'sub' : 'main');
      setParentCategoryId(entry.parentId ?? '');
    }
    if (isAction(entry)) setActionCode(entry.actionCode);
    if (isPriority(entry)) {
      setPriorityCode(entry.priorityCode);
      setSortOrder(String(entry.sortOrder));
    }
    if (isTicketType(entry)) setTicketTypeCode(entry.ticketTypeCode);
    if (isDepartment(entry)) setUnitCode(entry.unitCode);
    if (isPosition(entry)) {
      setDepartmentId(entry.departmentId ?? '');
      setHierarchyLevel(String(entry.hierarchyLevel));
    }
    setDialogOpen(true);
  };

  const openDelete = (entry: MasterDataEntry) => {
    setDeleteTarget(entry);
    setConfirmOpen(true);
  };

  // ─── Save handler (create or update) ─────────────────────────────────────
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Nama wajib diisi.');
      return;
    }

    const typeMap: Record<MasterDataType, MasterDataCrudType> = {
      category: 'category',
      department: 'department',
      position: 'position',
      action: 'action',
      priority: 'priority',
      ticketType: 'ticket_type',
    };
    const apiType = typeMap[activeTab];

    const payload: {
      name: string;
      code: string;
      isActive: boolean;
      description?: string | null;
      parentCategoryId?: string | null;
      sortOrder?: number;
      departmentId?: string;
      hierarchyLevel?: number;
    } = {
      name: formName.trim(),
      code: '',
      isActive: editing ? editing.isActive : true,
    };

    if (activeTab === 'category') {
      const existing = editing && isCategory(editing) ? editing.code : '';
      payload.code = existing || slugCode(formName.trim(), 100);
      payload.description = formDescription.trim() || null;
      payload.parentCategoryId = categoryType === 'sub' ? parentCategoryId : null;
    } else if (activeTab === 'department') {
      payload.code = unitCode.trim().toUpperCase();
      payload.description = formDescription.trim() || null;
      payload.sortOrder = editing && isDepartment(editing) ? editing.sortOrder : 1;
    } else if (activeTab === 'position') {
      const existing = editing && isPosition(editing) ? editing.code : '';
      payload.code = existing || slugCode(formName.trim(), 50);
      payload.departmentId = departmentId;
      payload.hierarchyLevel = parseInt(hierarchyLevel, 10) || 0;
    } else if (activeTab === 'action') {
      // `code` immutable setelah create (identitas `resolveActionId` reviewer) -
      // saat ubah, pakai code yang sudah ada dan kunci inputnya.
      const existing = editing && isAction(editing) ? editing.actionCode : '';
      payload.code = existing || actionCode.trim().toUpperCase();
      payload.description = formDescription.trim() || null;
    } else if (activeTab === 'priority') {
      // `code` immutable — dipakai sebagai key filter, badge, dan resolve.
      const existing = editing && isPriority(editing) ? editing.priorityCode : '';
      payload.code = existing || priorityCode.trim().toUpperCase();
      if (sortOrder.trim()) {
        payload.sortOrder = parseInt(sortOrder, 10) || 0;
      } else if (editing && isPriority(editing)) {
        payload.sortOrder = editing.sortOrder;
      } else {
        // Baris baru ditaruh paling bawah, bukan menyalip ke urutan 0.
        payload.sortOrder = priorities.reduce((m, p) => Math.max(m, p.sortOrder), 0) + 1;
      }
    } else if (activeTab === 'ticketType') {
      const existing = editing && isTicketType(editing) ? editing.ticketTypeCode : '';
      payload.code = existing || ticketTypeCode.trim().toUpperCase();
    }

    // For position, we need department - skip if not selected
    if (activeTab === 'position' && !departmentId) {
      toast.error('Pilih departemen untuk posisi.');
      return;
    }
    if (activeTab === 'department' && !unitCode.trim()) {
      toast.error('Kode unit wajib diisi.');
      return;
    }
    if (activeTab === 'category' && categoryType === 'sub' && !parentCategoryId) {
      toast.error('Pilih kategori induk untuk sub kategori.');
      return;
    }
    if (activeTab === 'action' && !editing && !actionCode.trim()) {
      toast.error('Kode aksi wajib diisi.');
      return;
    }
    if (activeTab === 'priority' && !editing && !priorityCode.trim()) {
      toast.error('Kode prioritas wajib diisi.');
      return;
    }
    if (activeTab === 'ticketType' && !editing && !ticketTypeCode.trim()) {
      toast.error('Kode tipe wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      if (editing) {
        await updateMasterData(apiType, editing.id, payload);
        toast.success(`${title} berhasil diubah.`);
      } else {
        await createMasterData(apiType, payload);
        toast.success(`${title} berhasil ditambahkan.`);
      }
      setDialogOpen(false);
      await loadMasterData();
    } catch (error: unknown) {
      const err = error as { status?: number; errors?: Record<string, string[]>; message?: string };
      if (err.status === 422 && err.errors) {
        const firstError = Object.values(err.errors).flat()[0];
        toast.error(firstError || 'Validasi gagal.');
      } else {
        toast.error(err.message || 'Operasi gagal.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete handler ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;

    const typeMap: Record<MasterDataType, MasterDataCrudType> = {
      category: 'category',
      department: 'department',
      position: 'position',
      action: 'action',
      priority: 'priority',
      ticketType: 'ticket_type',
    };
    const apiType = typeMap[activeTab];

    try {
      setLoading(true);
      await deleteMasterData(apiType, deleteTarget.id);
      toast.success(`${title} berhasil dihapus.`);
      setConfirmOpen(false);
      setDeleteTarget(null);
      await loadMasterData();
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 409) {
        toast.error(err.message || 'Data tidak dapat dihapus karena sedang digunakan.');
      } else {
        toast.error(err.message || 'Gagal menghapus data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderDetailCell = (entry: MasterDataEntry) => {
    switch (activeTab) {
      case 'category': {
        const parent = parentCategoryName(entry);
        // Parent kosong = kategori utama — sel dikosongkan, bukan diisi teks.
        // Teks "Kategori utama" diulang di setiap baris tanpa menambah info.
        return parent ? (
          <DotChip title={`Sub dari ${parent}`}>{parent}</DotChip>
        ) : null;
      }
      case 'department':
        return <span className="font-mono text-xs text-muted-foreground">{(entry as DepartmentEntry).unitCode}</span>;
      case 'position':
        return <span className="font-mono text-xs text-muted-foreground">Level {(entry as PositionEntry).hierarchyLevel}</span>;
      case 'priority':
        return (
          <span className="font-mono text-xs text-muted-foreground">
            Urutan {isPriority(entry) ? entry.sortOrder : '-'}
          </span>
        );
      default:
        return <span className="text-sm text-muted-foreground">{entry.description ?? '-'}</span>;
    }
  };

  const detailHeader =
    activeTab === 'category'
      ? 'Parent'
      : activeTab === 'department'
        ? 'Kode Unit'
        : activeTab === 'position'
          ? 'Level'
          : activeTab === 'priority'
            ? 'Urutan'
            : 'Deskripsi';

  const showReportColumn = activeTab === 'category';
  const reportParam = 'category';

  const columns: ColumnDef<DataTableFeatures, MasterDataEntry>[] = columnHelper.columns([
    ...(activeTab === 'priority'
      ? [
          columnHelper.accessor(
            (row) => (isPriority(row) ? row.priorityCode : '-'),
            {
              id: 'priorityCode',
              header: 'Kode',
              cell: ({ row }) => (
                <span className="font-mono text-xs">
                  {isPriority(row.original) ? row.original.priorityCode : '-'}
                </span>
              ),
            },
          ),
        ]
      : []),
    ...(activeTab === 'ticketType'
      ? [
          columnHelper.accessor(
            (row) => (isTicketType(row) ? row.ticketTypeCode : '-'),
            {
              id: 'ticketTypeCode',
              header: 'Kode',
              cell: ({ row }) => (
                <span className="font-mono text-xs">
                  {isTicketType(row.original) ? row.original.ticketTypeCode : '-'}
                </span>
              ),
            },
          ),
        ]
      : []),
    ...(activeTab === 'action'
      ? [
          columnHelper.accessor(
            (row) => (isAction(row) ? row.actionCode : '-'),
            {
              id: 'actionCode',
              header: 'Kode Aksi',
              cell: ({ row }) => (
                <span className="font-mono text-xs">
                  {isAction(row.original) ? row.original.actionCode : '-'}
                </span>
              ),
            },
          ),
          columnHelper.display({
            id: 'usage',
            header: 'Dipakai',
            cell: ({ row }) => {
              const count = matrixRows.filter((r) => r.actionId === row.original.id).length;
              return (
                <span className="text-xs text-muted-foreground">
                  {count === 0 ? 'Belum dipasang' : `${count} kategori`}
                </span>
              );
            },
          }),
        ]
      : []),
    columnHelper.accessor('name', {
      header: 'Nama',
      cell: ({ row }) => (
        <p className="max-w-[240px] truncate text-sm font-medium">{row.original.name}</p>
      ),
    }),
    // Tab Tipe Tiket tidak punya kolom deskripsi di database — menampilkan
    // kolom "Deskripsi" berisi `-` permanen berarti berbohong. Kolomnya
    // disembunyikan, bukan diisi placeholder.
    ...(activeTab === 'ticketType'
      ? []
      : [
          columnHelper.display({
            id: 'detail',
            header: detailHeader,
            cell: ({ row }) => renderDetailCell(row.original),
          }),
        ]),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadgeCell entry={row.original} />,
    }),
    ...(showReportColumn
      ? [
          columnHelper.display({
            id: 'laporan',
            header: 'Laporan Masalah',
            cell: ({ row }: { row: { original: MasterDataEntry } }) => (
              <a
                href={`/admin/ticket/monitoring?${reportParam}=${row.original.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
              >
                Lihat tiket
                <ExternalLink className="size-3" />
              </a>
            ),
          }),
        ]
      : []),
    columnHelper.display({
      id: 'aksi',
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => {
        // `original` diekstrak agar type-guard `isCategory` tetap berlaku di
        // dalam closure onClick (narrowing property access hilang di callback).
        const original = row.original;
        return (
        <div className="flex items-center justify-end gap-1">
          {/* Matriks kategori → aksi hanya relevan di tab Kategori — di sinilah
              opsi dropdown reviewer ditentukan. */}
          {activeTab === 'category' && isCategory(original) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMatrixCategory(original)}
              aria-label={`Atur aksi untuk ${original.name}`}
              title={`Atur aksi (${matrixRows.filter((r) => r.categoryId === original.id).length} terpasang)`}
            >
              <ListChecks className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEdit(original)}
            aria-label={`Ubah ${original.name}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openDelete(original)}
            aria-label={`Hapus ${original.name}`}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/40"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        );
      },
      enableHiding: false,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as MasterDataType)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            {configs.map((c) => (
              <TabsTrigger key={c.tab} value={c.tab}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button size="sm" onClick={openAdd} className="w-full sm:w-auto">
            <Plus className="size-4" />
            Baru
          </Button>
        </div>

        {configs.map((c) => (
          <TabsContent key={c.tab} value={c.tab}>
            <Card className="w-full gap-0 overflow-hidden p-0">
              <CardContent className="p-4">
                <TableToolbar
                  searchValue={search}
                  onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
                  searchPlaceholder={`Cari ${title.toLowerCase()}...`}
                  filters={getFiltersForTab(activeTab)}
                  filterValues={filterValues}
                  onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
                  action={
                    <ColumnToggle
                      columns={columns}
                      visibility={columnVisibility}
                      onVisibilityChange={setColumnVisibility}
                    />
                  }
                />
              </CardContent>

              {/* Mobile card view */}
              <div
                className={cn(
                  'px-4 pb-4 transition-opacity md:hidden',
                  loading && entries.length > 0 && 'pointer-events-none opacity-50',
                )}
              >
                {entries.map((entry) => (
                  <div key={entry.id} className="mb-3 rounded-lg border bg-card py-4 last:mb-0">
                    <div className="px-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          {activeTab === 'action' && isAction(entry) && (
                            <p className="font-mono text-xs text-muted-foreground">{entry.actionCode}</p>
                          )}
                          {activeTab === 'priority' && isPriority(entry) && (
                            <p className="font-mono text-xs text-muted-foreground">{entry.priorityCode}</p>
                          )}
                          {activeTab === 'ticketType' && isTicketType(entry) && (
                            <p className="font-mono text-xs text-muted-foreground">{entry.ticketTypeCode}</p>
                          )}
                          <p className="text-sm font-medium leading-snug">{entry.name}</p>
                          <div className="text-xs text-muted-foreground">
                            {activeTab === 'category' && renderDetailCell(entry)}
                            {activeTab === 'department' && <>Kode: {(entry as DepartmentEntry).unitCode}</>}
                            {activeTab === 'position' && <>Level: {(entry as PositionEntry).hierarchyLevel}</>}
                            {activeTab === 'priority' && isPriority(entry) && <>Urutan: {entry.sortOrder}</>}
                            {activeTab === 'action' && (
                              <>
                                {(() => {
                                  const count = matrixRows.filter((r) => r.actionId === entry.id).length;
                                  return count === 0 ? 'Belum dipasang' : `Dipakai di ${count} kategori`;
                                })()}
                                {entry.description ? ` · ${entry.description}` : ''}
                              </>
                            )}
                          </div>
                          {activeTab === 'category' && (
                            <div className="pt-1">
                              <a
                                href={`/admin/ticket/monitoring?category=${entry.id}`}
                                className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                              >
                                Lihat tiket
                                <ExternalLink className="size-3" />
                              </a>
                            </div>
                          )}
                        </div>
                        <StatusBadgeCell entry={entry} />
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        {activeTab === 'category' && isCategory(entry) && (
                          <Button variant="outline" size="sm" onClick={() => setMatrixCategory(entry)}>
                            <ListChecks data-icon="inline-start" />
                            Aksi
                            {(() => {
                              const count = matrixRows.filter((r) => r.categoryId === entry.id).length;
                              return count > 0 ? ` (${count})` : '';
                            })()}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEdit(entry)}>
                          <Pencil data-icon="inline-start" />
                          Ubah
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => openDelete(entry)}>
                          <Trash2 data-icon="inline-start" />
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && entries.length === 0 ? (
                  <TableSkeleton rows={3} />
                ) : entries.length === 0 ? (
                  <Empty className="border-0 py-10">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Database />
                      </EmptyMedia>
                      <EmptyTitle>Tidak ada {title.toLowerCase()} yang ditemukan</EmptyTitle>
                      <EmptyDescription>
                        Ubah filter atau kata kunci pencarian, atau tambahkan {title.toLowerCase()} baru.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : null}
              </div>

              {/* Desktop table */}
              <div className="hidden px-4 pb-4 md:block">
                {loading && entries.length === 0 ? (
                  <TableSkeleton rows={8} />
                ) : (
                  <DataTable
                    isPending={loading}
                    mode="server"
                    columns={columns}
                    data={entries}
                    showRowNumbers
                    rowNumberOffset={(safePage - 1) * perPage}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                    empty={(
                  <Empty className="border-0 py-14">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Database />
                      </EmptyMedia>
                      <EmptyTitle>Tidak ada {title.toLowerCase()} yang ditemukan</EmptyTitle>
                      <EmptyDescription>
                        Ubah filter atau kata kunci pencarian, atau tambahkan {title.toLowerCase()} baru.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                    footer={() => (
                      <DataTablePagination
                        page={safePage}
                        lastPage={totalPages}
                        total={filteredEntries.length}
                        perPage={perPage}
                        onPageChange={goToPage}
                        onPerPageChange={(n) => {
                          setPerPage(n);
                          setCurrentPage(1);
                        }}
                      />
                    )}
                  />
                )}
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Ubah ${title}` : `Tambah ${title} Baru`}</DialogTitle>
            <DialogDescription>
              {editing ? 'Perbaiki informasi data referensi.' : 'Data referensi baru akan aktif segera.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {activeTab === 'category' && (
              <>
                <Field>
                  <FieldLabel>Tipe Kategori *</FieldLabel>
                  <RadioGroup
                    className="grid grid-cols-2 gap-2"
                    value={categoryType}
                    onValueChange={(v) => {
                      const next = v as 'main' | 'sub';
                      setCategoryType(next);
                      if (next === 'main') setParentCategoryId('');
                    }}
                  >
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm has-data-checked:border-primary has-data-checked:bg-primary/5">
                      <RadioGroupItem value="main" />
                      <span>Kategori Utama</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm has-data-checked:border-primary has-data-checked:bg-primary/5">
                      <RadioGroupItem value="sub" />
                      <span>Sub Kategori</span>
                    </label>
                  </RadioGroup>
                </Field>
                {categoryType === 'sub' && (
                  <Field>
                    <FieldLabel>Parent Kategori *</FieldLabel>
                    <Select
                      value={parentCategoryId}
                      onValueChange={(v) => setParentCategoryId(v ?? '')}
                      items={parentCategoryOptions.map((c) => ({ value: c.id, label: c.name }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih kategori induk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {parentCategoryOptions.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </>
            )}

            <Field>
              <FieldLabel>Nama *</FieldLabel>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={`Nama ${title.toLowerCase()}`}
                className="w-full"
              />
            </Field>

            {activeTab === 'department' && (
              <Field>
                <FieldLabel>Kode Unit *</FieldLabel>
                <Input
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  placeholder="e.g. DIST"
                  className="w-full font-mono"
                />
              </Field>
            )}

            {activeTab === 'action' && (
              <Field>
                <FieldLabel>Kode Aksi *</FieldLabel>
                <Input
                  value={actionCode}
                  onChange={(e) => setActionCode(e.target.value.toUpperCase())}
                  placeholder="e.g. RETURN_AND_REPLACE"
                  className="w-full font-mono"
                  disabled={!!editing}
                />
                {editing ? (
                  <p className="text-xs text-muted-foreground">
                    Kode tidak dapat diubah setelah dibuat — dipakai sebagai identitas aksi oleh reviewer.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Huruf kapital, tanpa spasi.</p>
                )}
              </Field>
            )}

            {activeTab === 'priority' && (
              <>
                <Field>
                  <FieldLabel>Kode Prioritas *</FieldLabel>
                  <Input
                    value={priorityCode}
                    onChange={(e) => setPriorityCode(e.target.value.toUpperCase())}
                    placeholder="e.g. D"
                    className="w-full font-mono"
                    disabled={!!editing}
                  />
                  {editing && (
                    <p className="text-xs text-muted-foreground">
                      Kode tidak dapat diubah setelah dibuat — dipakai sebagai key filter dan badge.
                    </p>
                  )}
                </Field>
                <Field>
                  <FieldLabel>Urutan Tampil</FieldLabel>
                  <Input
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Kosongkan untuk taruh paling bawah"
                    className="w-full font-mono"
                  />
                </Field>
              </>
            )}

            {activeTab === 'ticketType' && (
              <Field>
                <FieldLabel>Kode Tipe *</FieldLabel>
                <Input
                  value={ticketTypeCode}
                  onChange={(e) => setTicketTypeCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SARAN"
                  className="w-full font-mono"
                  disabled={!!editing}
                />
                {editing ? (
                  <p className="text-xs text-muted-foreground">
                    Kode tidak dapat diubah setelah dibuat — dipakai sebagai key filter dan badge.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Huruf kapital, tanpa spasi.</p>
                )}
              </Field>
            )}

            {activeTab === 'position' && (
              <>
                <Field>
                  <FieldLabel>Departemen *</FieldLabel>
                  <Select
                    value={departmentId}
                    onValueChange={(v) => setDepartmentId(v ?? '')}
                    items={departments.map((d) => ({ value: d.id, label: d.name }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih departemen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Level Hierarki *</FieldLabel>
                  <Input
                    value={hierarchyLevel}
                    onChange={(e) => setHierarchyLevel(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full font-mono"
                  />
                </Field>
              </>
            )}

            {/* Deskripsi hanya untuk tipe yang punya kolomnya — position,
                priority, dan ticket_type tidak punya. Menampilkannya akan
                menyiratkan data tersimpan padahal dibuang saat validasi. */}
            {!['position', 'priority', 'ticketType'].includes(activeTab) && (
              <Field>
                <FieldLabel>Deskripsi</FieldLabel>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Deskripsi opsional..."
                  className="min-h-20 text-xs"
                />
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Hapus ${title}?`}
        description={`"${deleteTarget?.name ?? ''}" akan dihapus permanen. Data referensi yang sedang dipakai tiket tidak dapat dihapus.`}
        confirmLabel="Ya, Hapus"
        variant="destructive"
        loading={loading}
        onConfirm={handleDelete}
      />

      {/* Editor matriks kategori → aksi (dari tab Kategori) */}
      <CategoryActionDialog
        open={matrixCategory !== null}
        onOpenChange={(open) => {
          if (!open) setMatrixCategory(null);
        }}
        category={matrixCategory ? { id: matrixCategory.id, name: matrixCategory.name } : null}
        actions={actions.map((a) => ({
          id: a.id,
          code: a.actionCode,
          name: a.name,
          description: a.description ?? null,
          isActive: a.isActive,
        }))}
        onSync={(categoryId, rows) => {
          setMatrixRows((prev) => [
            ...prev.filter((r) => r.categoryId !== categoryId),
            ...rows,
          ]);
        }}
      />
    </div>
  );
}