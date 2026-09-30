'use client';

import { useEffect, useState } from 'react';
import {
  getMasterDataAll,
  createMasterData,
  updateMasterData,
  deleteMasterData,
  type RawCategory,
  type RawDepartment,
  type RawPosition,
  type RawProduct,
} from '@/lib/api/master';
import type {
  MasterDataEntry,
  MasterDataType,
  CategoryEntry,
  DepartmentEntry,
  PositionEntry,
  ProductLineEntry,
} from '@/lib/types/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, CornerDownRight, ExternalLink } from 'lucide-react';
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

function normalizeProducts(raw: RawProduct[]): ProductLineEntry[] {
  return raw.map((p, i) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    isActive: p.isActive,
    productCode: p.code,
    sortOrder: i + 1,
  }));
}

const TAB_ORDER: MasterDataType[] = ['category', 'department', 'position', 'productLine'];

const DEFAULT_NAME: Record<MasterDataType, string> = {
  category: 'Kategori',
  department: 'Departemen',
  position: 'Posisi',
  productLine: 'Lini Produk',
};

function isCategory(e: MasterDataEntry): e is CategoryEntry {
  return 'parentId' in e;
}

function isProduct(e: MasterDataEntry): e is ProductLineEntry {
  return 'productCode' in e;
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
  return entry.isActive ? (
    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Aktif</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">Nonaktif</Badge>
  );
}

export default function AdminMasterDataPage() {
  const [activeTab, setActiveTab] = useState<MasterDataType>('category');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string | null>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterDataEntry | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MasterDataEntry | null>(null);

  // Master data asli dari backend
  const [categories, setCategories] = useState<CategoryEntry[]>([]);
  const [departments, setDepartments] = useState<DepartmentEntry[]>([]);
  const [positions, setPositions] = useState<PositionEntry[]>([]);
  const [products, setProducts] = useState<ProductLineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state (mock — belum tersimpan)
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [categoryType, setCategoryType] = useState<'main' | 'sub'>('main');
    const [parentCategoryId, setParentCategoryId] = useState('');
    const [unitCode, setUnitCode] = useState('');
    const [hierarchyLevel, setHierarchyLevel] = useState('');
    const [productCode, setProductCode] = useState('');
    const [departmentId, setDepartmentId] = useState('');

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const data = await getMasterDataAll();
      const depts = normalizeDepartments(data.departments);
      const deptNameById = new Map(depts.map((d) => [d.id, d.name]));
      setCategories(normalizeCategories(data.categories));
      setDepartments(depts);
      setPositions(normalizePositions(data.positions, deptNameById));
      setProducts(normalizeProducts(data.products));
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
    { tab: 'productLine', label: 'Lini Produk', entries: products },
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
        case 'productLine':
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
        default:
          return [];
      }
    };

    const filteredEntries = config.entries.filter((e) => {
      if (search.trim() && 
        !e.name.toLowerCase().includes(search.toLowerCase()) && 
        !(e.description ?? '').toLowerCase().includes(search.toLowerCase()) &&
        !(isProduct(e) && e.productCode.toLowerCase().includes(search.toLowerCase()))
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

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const entries = filteredEntries.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const getPaginationItems = () => {
    const items: (number | 'ellipsis')[] = [];
    const total = totalPages;
    const current = safePage;
    if (total <= 5) {
      for (let i = 1; i <= total; i++) items.push(i);
    } else if (current <= 3) {
      items.push(1, 2, 3, 'ellipsis', total);
    } else if (current >= total - 2) {
      items.push(1, 'ellipsis', total - 2, total - 1, total);
    } else {
      items.push(1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total);
    }
    return items;
  };

  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const openAdd = () => {
      setEditing(null);
      setFormName('');
      setFormDescription('');
      setCategoryType('main');
      setParentCategoryId('');
      setUnitCode('');
      setHierarchyLevel('');
      setProductCode('');
      setDepartmentId('');
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
    setProductCode('');
    setDepartmentId('');

    if (isCategory(entry)) {
      setCategoryType(entry.parentId ? 'sub' : 'main');
      setParentCategoryId(entry.parentId ?? '');
    }
    if (isProduct(entry)) setProductCode(entry.productCode);
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

      const typeMap: Record<MasterDataType, 'category' | 'department' | 'position' | 'product'> = {
        category: 'category',
        department: 'department',
        position: 'position',
        productLine: 'product',
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
      } else if (activeTab === 'productLine') {
        payload.code = productCode.trim().toUpperCase();
        payload.description = formDescription.trim() || null;
      }

      // For position, we need department - skip if not selected
            if (activeTab === 'position' && !departmentId) {
              toast.error('Pilih departemen untuk posisi.');
              return;
            }
            if (activeTab === 'productLine' && !productCode.trim()) {
        toast.error('Kode produk wajib diisi.');
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

      const typeMap: Record<MasterDataType, 'category' | 'department' | 'position' | 'product'> = {
        category: 'category',
        department: 'department',
        position: 'position',
        productLine: 'product',
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
        return parent ? (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <CornerDownRight className="size-3.5" />
            Sub dari {parent}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Kategori utama</span>
        );
      }
      case 'department':
        return <span className="font-mono text-xs text-muted-foreground">{(entry as DepartmentEntry).unitCode}</span>;
      case 'position':
        return <span className="font-mono text-xs text-muted-foreground">Level {(entry as PositionEntry).hierarchyLevel}</span>;
      default:
        return <span className="text-sm text-muted-foreground">{entry.description ?? '-'}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as MasterDataType)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="flex w-full justify-start overflow-x-auto overflow-y-hidden rounded-lg no-scrollbar sm:w-auto sm:inline-flex">
            {configs.map((c) => (
              <TabsTrigger key={c.tab} value={c.tab} className="min-w-fit px-4 whitespace-nowrap">
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
                        />
                      </CardContent>

              {/* Mobile card view */}
              <div className="md:hidden px-4 pb-4">
                {entries.map((entry) => (
                  <div key={entry.id} className="mb-3 rounded-lg border bg-card py-4 last:mb-0">
                    <div className="px-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        {activeTab === 'productLine' && isProduct(entry) && (
                          <p className="font-mono text-xs text-muted-foreground">{entry.productCode}</p>
                        )}
                        <p className="text-sm font-medium leading-snug">{entry.name}</p>
                        <div className="text-xs text-muted-foreground">
                          {activeTab === 'category' && renderDetailCell(entry)}
                          {activeTab === 'department' && <>Kode: {(entry as DepartmentEntry).unitCode}</>}
                          {activeTab === 'position' && <>Level: {(entry as PositionEntry).hierarchyLevel}</>}
                          {activeTab === 'productLine' && <>{entry.description ?? '-'}</>}
                        </div>
                        {(activeTab === 'category' || activeTab === 'productLine') && (
                          <div className="pt-1">
                            {activeTab === 'category' ? (
                              <a
                                href={`/admin/ticket/monitoring?category=${entry.id}`}
                                className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                              >
                                Lihat tiket
                                <ExternalLink className="size-3" />
                              </a>
                            ) : (
                              <a
                                href={`/admin/ticket/monitoring?product=${entry.id}`}
                                className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                              >
                                Lihat tiket
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <StatusBadgeCell entry={entry} />
                    </div>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => openEdit(entry)}>
                          <Pencil className="size-3.5" />
                          Ubah
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs text-destructive hover:bg-destructive/10" onClick={() => openDelete(entry)}>
                          <Trash2 className="size-3.5" />
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {loading ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Memuat data...
                  </p>
                ) : entries.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Tidak ada {title.toLowerCase()} yang ditemukan.
                  </p>
                ) : null}
              </div>

              {/* Desktop table */}
              {entries.length > 0 && (
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {activeTab === 'productLine' && (
                          <TableHead className="bg-muted/50 px-6 py-3">Kode Produk</TableHead>
                        )}
                        <TableHead className="bg-muted/50 px-6 py-3">Nama</TableHead>
                        <TableHead className="bg-muted/50 px-6 py-3">
                          {activeTab === 'category' ? 'Parent' : activeTab === 'department' ? 'Kode Unit' : activeTab === 'position' ? 'Level' : 'Deskripsi'}
                        </TableHead>
                        <TableHead className="bg-muted/50 px-6 py-3">Status</TableHead>
                        {(activeTab === 'category' || activeTab === 'productLine') && (
                          <TableHead className="bg-muted/50 px-6 py-3">Laporan Masalah</TableHead>
                        )}
                        <TableHead className="bg-muted/50 px-6 py-3 text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          {activeTab === 'productLine' && isProduct(entry) && (
                            <TableCell className="px-6 py-3 font-mono text-xs">{entry.productCode}</TableCell>
                          )}
                          <TableCell className="px-6 py-3">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{entry.name}</p>
                              <p className="text-xs text-muted-foreground">#{entry.id}</p>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3">{renderDetailCell(entry)}</TableCell>
                          <TableCell className="px-6 py-3">
                            <StatusBadgeCell entry={entry} />
                          </TableCell>
                          {(activeTab === 'category' || activeTab === 'productLine') && (
                            <TableCell className="px-6 py-3">
                              {activeTab === 'category' ? (
                                <a
                                  href={`/admin/ticket/monitoring?category=${entry.id}`}
                                  className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                                >
                                  Lihat tiket
                                  <ExternalLink className="size-3" />
                                </a>
                              ) : (
                                <a
                                  href={`/admin/ticket/monitoring?product=${entry.id}`}
                                  className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                                >
                                  Lihat tiket
                                  <ExternalLink className="size-3" />
                                </a>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="px-6 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(entry)}
                              aria-label={`Ubah ${entry.name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDelete(entry)}
                              aria-label={`Hapus ${entry.name}`}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="border-t px-6 py-4">
                  <Pagination className="mx-0 w-auto justify-end">
                    <PaginationPrevious onClick={() => goToPage(safePage - 1)} />
                    <PaginationContent>
                      {getPaginationItems().map((item, i) =>
                        item === 'ellipsis' ? (
                          <PaginationItem key={`e-${i}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={item}>
                            <PaginationLink isActive={item === safePage} onClick={() => goToPage(item as number)}>
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                    </PaginationContent>
                    <PaginationNext onClick={() => goToPage(safePage + 1)} />
                  </Pagination>
                </div>
              )}
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

            {activeTab === 'productLine' && (
              <Field>
                <FieldLabel>Kode Produk *</FieldLabel>
                <Input
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="e.g. ECU, CDI, CVT"
                  className="w-full font-mono"
                />
                <p className="text-xs text-muted-foreground">Kode produk berbeda dari ID produk internal.</p>
              </Field>
            )}

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

            {activeTab !== 'position' && (
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
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus {title}?</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.name ?? ''}" akan dihapus permanen. Data referensi yang sedang dipakai tiket tidak dapat dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
                      <Button variant="outline" onClick={() => setConfirmOpen(false)}>Batal</Button>
                      <Button
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={handleDelete}
                        disabled={loading}
                      >
                        {loading ? 'Menghapus...' : 'Ya, Hapus'}
                      </Button>
                    </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}