'use client';

import { useEffect, useState } from 'react';
import {
  MOCK_CATEGORIES,
  MOCK_DEPARTMENTS,
  MOCK_POSITIONS,
  MOCK_PRODUCTS,
} from '@/lib/mock/admin';
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
import { problemStatsByCategory, problemStatsByProduct, getCategoryName } from '@/lib/mock/analytics';

const ITEMS_PER_PAGE = 10;

interface TabConfig {
  tab: MasterDataType;
  label: string;
  entries: MasterDataEntry[];
}

const masterConfigs: TabConfig[] = [
  { tab: 'category', label: 'Kategori', entries: MOCK_CATEGORIES },
  { tab: 'department', label: 'Departemen', entries: MOCK_DEPARTMENTS },
  { tab: 'position', label: 'Posisi', entries: MOCK_POSITIONS },
  { tab: 'productLine', label: 'Lini Produk', entries: MOCK_PRODUCTS },
];

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

function parentCategoryName(e: MasterDataEntry): string | undefined {
  if (isCategory(e) && e.parentId) {
    return MOCK_CATEGORIES.find((c) => c.id === e.parentId)?.name;
  }
  return undefined;
}

function StatusBadgeCell({ entry }: { entry: MasterDataEntry }) {
  return entry.isActive ? (
    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Aktif</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">Nonaktif</Badge>
  );
}

/** Chip "aktif / selesai / total" — klik untuk drill-down ke monitoring tiket. */
function ProblemChips({ stats, href }: { stats: { active: number; resolved: number; total: number }; href: string }) {
  if (stats.total === 0) {
    return <span className="text-xs text-muted-foreground">Belum ada laporan</span>;
  }
  return (
    <a
      href={href}
      className="inline-flex flex-wrap items-center gap-1.5 text-xs"
      title="Lihat tiket pada Monitoring Tiket"
    >
      {stats.active > 0 && (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
          {stats.active} aktif
        </Badge>
      )}
      {stats.resolved > 0 && (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {stats.resolved} selesai
        </Badge>
      )}
      <span className="font-medium text-foreground">total {stats.total}</span>
      <ExternalLink className="size-3 text-muted-foreground" />
    </a>
  );
}

export default function AdminMasterDataPage() {
  const [activeTab, setActiveTab] = useState<MasterDataType>('category');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterDataEntry | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MasterDataEntry | null>(null);

  // Form state (mock — belum tersimpan)
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [categoryType, setCategoryType] = useState<'main' | 'sub'>('main');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [hierarchyLevel, setHierarchyLevel] = useState('');
  const [productCode, setProductCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && TAB_ORDER.includes(tab as MasterDataType)) {
      setActiveTab(tab as MasterDataType);
    }
  }, []);

  const config = masterConfigs.find((c) => c.tab === activeTab) ?? masterConfigs[0];
  const title = DEFAULT_NAME[activeTab];
  const topLevelCategories = MOCK_CATEGORIES.filter((c) => !c.parentId);

  const filteredEntries = config.entries.filter((e) =>
    !search.trim() ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (isProduct(e) && e.productCode.toLowerCase().includes(search.toLowerCase()))
  );

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
    setDialogOpen(true);
  };

  const openEdit = (entry: MasterDataEntry) => {
    setEditing(entry);
    setFormName(entry.name);
    setFormDescription(entry.description ?? '');
    if (isCategory(entry)) {
      setCategoryType(entry.parentId ? 'sub' : 'main');
      setParentCategoryId(entry.parentId ?? '');
    }
    if (isProduct(entry)) setProductCode(entry.productCode);
    setDialogOpen(true);
  };

  const openDelete = (entry: MasterDataEntry) => {
    setDeleteTarget(entry);
    setConfirmOpen(true);
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
            {masterConfigs.map((c) => (
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

        {masterConfigs.map((c) => (
          <TabsContent key={c.tab} value={c.tab}>
            <Card className="w-full gap-0 overflow-hidden p-0">
              <CardContent className="p-4">
                <TableToolbar
                  searchValue={search}
                  onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
                  searchPlaceholder={`Cari ${title.toLowerCase()}...`}
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
                              <ProblemChips
                                stats={problemStatsByCategory(entry.id)}
                                href={`/admin/ticket/monitoring?category=${entry.id}`}
                              />
                            ) : (
                              <ProblemChips
                                stats={problemStatsByProduct(entry.id)}
                                href={`/admin/ticket/monitoring?product=${entry.id}`}
                              />
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
                {entries.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Tidak ada {title.toLowerCase()} yang ditemukan.
                  </p>
                )}
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
                                <ProblemChips
                                  stats={problemStatsByCategory(entry.id)}
                                  href={`/admin/ticket/monitoring?category=${entry.id}`}
                                />
                              ) : (
                                <ProblemChips
                                  stats={problemStatsByProduct(entry.id)}
                                  href={`/admin/ticket/monitoring?product=${entry.id}`}
                                />
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
                    onValueChange={(v) => setCategoryType(v as 'main' | 'sub')}
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
                      value={parentCategoryId || undefined}
                      onValueChange={(v) => setParentCategoryId(v ?? '')}
                      items={topLevelCategories.map((c) => ({ value: c.id, label: c.name }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih kategori induk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {topLevelCategories.map((c) => (
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
              <Field>
                <FieldLabel>Level Hierarki *</FieldLabel>
                <Input
                  value={hierarchyLevel}
                  onChange={(e) => setHierarchyLevel(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full font-mono"
                />
              </Field>
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
            <Button onClick={() => setDialogOpen(false)}>Simpan</Button>
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
              onClick={() => {
                setDeleteTarget(null);
                setConfirmOpen(false);
              }}
            >
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}