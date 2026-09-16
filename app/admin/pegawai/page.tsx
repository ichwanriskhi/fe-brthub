'use client';

import { useState } from 'react';
import { MOCK_EMPLOYEES, MOCK_DEPARTMENTS, MOCK_POSITIONS } from '@/lib/mock/admin';
import type { EmployeeEntry, AccountStatus, AppRole } from '@/lib/types/admin';
import { APP_ROLES } from '@/lib/types/admin';
import { reportStatsByEmployee } from '@/lib/mock/analytics';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldLabel } from '@/components/ui/field';
import { Plus, Pencil, Trash2, MailCheck, KeyRound, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

const ACCOUNT_STATUS_LABEL: Record<AccountStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Aktif', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  NOT_ACTIVATED: { label: 'Belum Aktivasi', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  NO_ACCOUNT: { label: 'Belum Punya Akun', className: 'bg-muted/50 text-muted-foreground' },
};

const ROLE_LABEL: Record<AppRole, { label: string; className: string }> = {
  ADMIN:    { label: 'Admin',    className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  REVIEWER: { label: 'Reviewer', className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  HANDLER:  { label: 'Handler',  className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  UNIT:     { label: 'Unit',     className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  MANAGER:  { label: 'Manager',  className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  STAFF:    { label: 'Staff',    className: 'bg-muted/50 text-muted-foreground' },
};

/** Chip jumlah laporan yang dibuat pegawai ini (sebagai reporter). */
function ReportChips({ employeeId }: { employeeId: string }) {
  const stats = reportStatsByEmployee(employeeId);
  if (stats.total === 0) {
    return <span className="text-xs text-muted-foreground">Belum pernah melapor</span>;
  }
  return (
    <a
      href={`/admin/ticket/monitoring?reporter=${employeeId}`}
      className="inline-flex flex-wrap items-center gap-1.5 text-xs"
      title="Lihat tiket yang dilaporkan pegawai ini"
    >
      {stats.active > 0 && (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">{stats.active} aktif</Badge>
      )}
      {stats.resolved > 0 && (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{stats.resolved} selesai</Badge>
      )}
      <span className="font-medium text-foreground">total {stats.total}</span>
      <ExternalLink className="size-3 text-muted-foreground" />
    </a>
  );
}

export default function AdminPegawaiPage() {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeEntry | null>(null);
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [positionId, setPositionId] = useState<string>('');
  const [role, setRole] = useState<AppRole>('STAFF');

  const filterValues: TableFilterValues = {
    departmentId: departmentFilter,
    status: statusFilter,
    role: roleFilter,
  };

  const filtered = MOCK_EMPLOYEES.filter((e) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.employeeNumber.toLowerCase().includes(q) ||
      e.phone.includes(q) ||
      (e.email ?? '').toLowerCase().includes(q);
    const matchesDept = !departmentFilter || e.departmentId === departmentFilter;
    const matchesStatus = !statusFilter || e.accountStatus === statusFilter;
    const matchesRole = !roleFilter || e.role === roleFilter;
    return matchesSearch && matchesDept && matchesStatus && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

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
    setName('');
    setDepartmentId('');
    setPositionId('');
    setRole('STAFF');
    setDialogOpen(true);
  };

  const openEdit = (emp: EmployeeEntry) => {
    setEditing(emp);
    setName(emp.name);
    setDepartmentId(emp.departmentId);
    setPositionId(emp.positionId);
    setRole(emp.role);
    setDialogOpen(true);
  };

  const sendSetupLink = (emp: EmployeeEntry) => {
    toast.success(`Link setup password dikirim ke ${emp.name} (${emp.email ?? emp.phone})`);
  };

  const sendResetLink = (emp: EmployeeEntry) => {
    toast.success(`Link reset password dikirim ke ${emp.name}`);
  };

  const actionButtons = (e: EmployeeEntry, sm = false) => (
    <>
      {e.accountStatus === 'NOT_ACTIVATED' && (
        <Button
          variant={sm ? 'outline' : 'ghost'}
          size={sm ? 'sm' : 'icon'}
          onClick={() => sendSetupLink(e)}
          aria-label="Kirim link setup password"
          title="Kirim link setup password"
          className={sm ? 'h-7 gap-1.5 text-xs' : ''}
        >
          <MailCheck className="size-3.5" />
          {sm && 'Setup'}
        </Button>
      )}
      {e.accountStatus === 'ACTIVE' && (
        <Button
          variant={sm ? 'outline' : 'ghost'}
          size={sm ? 'sm' : 'icon'}
          onClick={() => sendResetLink(e)}
          aria-label="Kirim link reset password"
          title="Kirim link reset password"
          className={sm ? 'h-7 gap-1.5 text-xs' : ''}
        >
          <KeyRound className="size-3.5" />
          {sm && 'Reset'}
        </Button>
      )}
      <Button
        variant={sm ? 'outline' : 'ghost'}
        size={sm ? 'sm' : 'icon'}
        onClick={() => openEdit(e)}
        aria-label={`Ubah ${e.name}`}
        className={sm ? 'h-7 gap-1.5 text-xs' : ''}
      >
        <Pencil className="size-3.5" />
        {sm && 'Ubah'}
      </Button>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="w-full gap-0 overflow-hidden p-0">
        <CardContent className="p-4">
          <TableToolbar
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
            searchPlaceholder="Cari nama, emp no, telepon, email..."
            filters={[
              {
                key: 'departmentId',
                label: 'Departemen',
                options: MOCK_DEPARTMENTS.map((d) => ({ value: d.id, label: d.name })),
              },
              {
                key: 'role',
                label: 'Role',
                options: APP_ROLES.map((r) => ({ value: r.value, label: r.label })),
              },
              {
                key: 'status',
                label: 'Status Akun',
                options: [
                  { value: 'ACTIVE', label: 'Aktif' },
                  { value: 'NOT_ACTIVATED', label: 'Belum Aktivasi' },
                  { value: 'NO_ACCOUNT', label: 'Belum Punya Akun' },
                ],
              },
            ]}
            filterValues={filterValues}
            onFilterChange={(key, value) => {
              if (key === 'departmentId') setDepartmentFilter(value ?? '');
              if (key === 'status') setStatusFilter(value ?? '');
              if (key === 'role') setRoleFilter(value ?? '');
            }}
          />
        </CardContent>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t">
          <div>
            <p className="text-sm font-medium">Pegawai & Akun</p>
            <p className="text-xs text-muted-foreground">
              {filtered.length} pegawai • aktif: {MOCK_EMPLOYEES.filter((e) => e.accountStatus === 'ACTIVE').length}
            </p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-4" />
            Pegawai Baru
          </Button>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden px-4 pb-4">
          {paginated.map((e) => (
            <div key={e.id} className="mb-3 rounded-lg border bg-card py-4 last:mb-0">
              <div className="px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.employeeNumber} • {e.departmentName} • {e.positionName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{e.phone}</p>
                    <div className="pt-1">
                      <ReportChips employeeId={e.id} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge className={ROLE_LABEL[e.role].className}>
                      {ROLE_LABEL[e.role].label}
                    </Badge>
                    <Badge className={ACCOUNT_STATUS_LABEL[e.accountStatus].className}>
                      {ACCOUNT_STATUS_LABEL[e.accountStatus].label}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1">
                  {actionButtons(e, true)}
                </div>
              </div>
            </div>
          ))}
          {paginated.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Tidak ada pegawai yang ditemukan.
            </p>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 px-6 py-3">Emp No</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Nama</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Departemen</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Posisi</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Role</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Telepon</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Status Akun</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3">Laporan</TableHead>
                <TableHead className="bg-muted/50 px-6 py-3 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="px-6 py-3 font-mono text-xs whitespace-nowrap">
                    {e.employeeNumber}
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.email ?? e.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-3 text-sm">{e.departmentName}</TableCell>
                  <TableCell className="px-6 py-3 text-sm">{e.positionName}</TableCell>
                  <TableCell className="px-6 py-3">
                    <Badge className={ROLE_LABEL[e.role].className}>
                      {ROLE_LABEL[e.role].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground">{e.phone}</TableCell>
                  <TableCell className="px-6 py-3">
                    <Badge className={ACCOUNT_STATUS_LABEL[e.accountStatus].className}>
                      {ACCOUNT_STATUS_LABEL[e.accountStatus].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <ReportChips employeeId={e.id} />
                  </TableCell>
                  <TableCell className="px-6 py-3 text-right">
                    <div className="flex items-center gap-1">
                      {actionButtons(e)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    Tidak ada pegawai yang ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

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

      {/* Add / Edit pegawai dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Ubah ${editing.name}` : 'Pegawai Baru'}</DialogTitle>
            <DialogDescription>
              Data pegawai + hubungan ke akun. Admin tidak atur password pegawai.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field>
              <FieldLabel>Nama *</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className="w-full" />
            </Field>
            <Field>
              <FieldLabel>Departemen</FieldLabel>
              <Select
                value={departmentId || undefined}
                onValueChange={(v) => setDepartmentId(v ?? '')}
                items={MOCK_DEPARTMENTS.filter((d) => d.isActive).map((d) => ({ value: d.id, label: d.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MOCK_DEPARTMENTS.filter((d) => d.isActive).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Posisi</FieldLabel>
              <Select
                value={positionId || undefined}
                onValueChange={(v) => setPositionId(v ?? '')}
                items={MOCK_POSITIONS.filter((p) => p.isActive).map((p) => ({ value: p.id, label: `${p.name} (Level ${p.hierarchyLevel})` }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih posisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MOCK_POSITIONS.filter((p) => p.isActive).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} (Level {p.hierarchyLevel})</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Role Aplikasi *</FieldLabel>
              <Select
                value={role}
                onValueChange={(v) => setRole((v ?? 'STAFF') as AppRole)}
                items={APP_ROLES.map((r) => ({ value: r.value, label: r.label }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {APP_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Role menentukan menu &amp; akses setelah login. Admin tidak mengatur password pegawai.
              </p>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => setDialogOpen(false)}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}