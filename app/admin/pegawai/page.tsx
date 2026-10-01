'use client';

import { useState, useEffect } from 'react';
import { getAdminEmployees, createAdminEmployee, updateAdminEmployee, sendSetupPasswordLink, sendResetPasswordLink, appRolesToDbNames, type EmployeeProfile } from '@/lib/api/admin-employees';
import { getMasterDataAll } from '@/lib/api/master';
import type { EmployeeEntry, AccountStatus, AppRole } from '@/lib/types/admin';
import { APP_ROLES, ASSIGNABLE_APP_ROLES } from '@/lib/types/admin';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, MailCheck, KeyRound, ExternalLink } from 'lucide-react';
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

function RoleBadges({ roles }: { roles: AppRole[] }) {
  const list = roles.length > 0 ? roles : (['STAFF'] as AppRole[]);
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((role) => (
        <Badge key={role} className={ROLE_LABEL[role]?.className ?? ROLE_LABEL.STAFF.className}>
          {ROLE_LABEL[role]?.label ?? role}
        </Badge>
      ))}
    </div>
  );
}

/** Map employee profile dari API → EmployeeEntry untuk tabel/UI */
function toEntry(e: EmployeeProfile): EmployeeEntry {
  const roles = e.roles?.length ? e.roles : ['STAFF'];
  return {
    id: e.id,
    userId: e.user_id,
    employeeNumber: e.employee_number,
    name: e.user?.full_name ?? '-',
    phone: e.user?.phone_number ?? '-',
    email: e.user?.email ?? undefined,
    departmentId: e.department_id ?? '',
    positionId: e.position_id ?? '',
    departmentName: e.department?.name ?? '-',
    positionName: e.position?.name ?? '-',
    hierarchyLevel: e.position?.hierarchy_level ?? 0,
    role: (roles[0] ?? 'STAFF') as AppRole,
    roles: roles as AppRole[],
    accountStatus: e.user?.is_active ? 'ACTIVE' : 'NOT_ACTIVATED',
    hasPassword: e.hasPassword ?? null,
    activationLinkSent: false,
    hiredAt: e.created_at,
  };
}

export default function AdminPegawaiPage() {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [employees, setEmployees] = useState<EmployeeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string; hierarchyLevel: number; isActive: boolean; departmentId?: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [positionId, setPositionId] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);

  const filterValues: TableFilterValues = {
    departmentId: departmentFilter,
    status: statusFilter,
    role: roleFilter,
  };

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.employeeNumber.toLowerCase().includes(q) ||
      e.phone.includes(q) ||
      (e.email ?? '').toLowerCase().includes(q);
    const matchesDept = !departmentFilter || e.departmentId === departmentFilter;
    const matchesStatus = !statusFilter || e.accountStatus === statusFilter;
    const matchesRole =
      !roleFilter ||
      (roleFilter === 'STAFF'
        ? e.roles.length === 0 || e.roles.every((r) => r === 'STAFF')
        : e.roles.includes(roleFilter as AppRole));
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

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const [res, master] = await Promise.all([
        getAdminEmployees({ per_page: 100 }),
        getMasterDataAll(),
      ]);
      setEmployees(res.data.map(toEntry));
      setDepartments(master.departments.map((d) => ({ id: d.id, name: d.name, isActive: d.isActive })));
      setPositions(master.positions.map((p) => ({
        id: p.id,
        name: p.name,
        hierarchyLevel: p.hierarchyLevel,
        isActive: p.isActive,
        departmentId: p.departmentId ?? undefined,
      })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data pegawai.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setEmployeeNumber('');
    setEmail('');
    setPhone('');
    setDepartmentId('');
    setPositionId('');
    setSelectedRoles([]);
    setDialogOpen(true);
  };

  const openEdit = (emp: EmployeeEntry) => {
    setEditing(emp);
    setName(emp.name);
    setEmployeeNumber(emp.employeeNumber);
    setEmail(emp.email ?? '');
    setPhone(emp.phone === '-' ? '' : emp.phone);
    setDepartmentId(emp.departmentId);
    setPositionId(emp.positionId);
    setSelectedRoles(emp.roles.filter((r) => r !== 'STAFF' && r !== 'MANAGER'));
    setDialogOpen(true);
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nama wajib diisi.');
      return;
    }
    if (!employeeNumber.trim()) {
      toast.error('Nomor pegawai wajib diisi.');
      return;
    }

    const payload = {
      full_name: name.trim(),
      employee_number: employeeNumber.trim(),
      email: email.trim() || null,
      phone_number: phone.trim() || null,
      department_id: departmentId || null,
      position_id: positionId || null,
      status: 'active' as const,
      roles: appRolesToDbNames(selectedRoles),
    };

    try {
      setSaving(true);
      if (editing) {
        await updateAdminEmployee(editing.id, payload);
        toast.success('Data pegawai berhasil diubah.');
      } else {
        const created = await createAdminEmployee(payload);
        // Default: langsung kirim link setup password via email.
        // Pegawai tetap tersimpan bila pengiriman gagal (warning, tanpa rollback).
        try {
          await sendSetupPasswordLink(created.user_id, 'email');
          toast.success('Pegawai baru ditambahkan & link setup dikirim ke email.');
        } catch (linkError) {
          toast.warning(
            `Pegawai tersimpan, tetapi link setup gagal dikirim: ${
              linkError instanceof Error ? linkError.message : 'unknown error'
            }. Kirim ulang lewat ikon amplop.`,
          );
        }
      }
      setDialogOpen(false);
      await loadEmployees();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan data pegawai.');
    } finally {
      setSaving(false);
    }
  };

  const [pendingLink, setPendingLink] = useState<string | null>(null);

  const sendSetupLink = async (emp: EmployeeEntry, channel: 'email' = 'email') => {
    const key = `${emp.userId}:setup`;
    if (pendingLink) return;
    setPendingLink(key);
    try {
      await toast.promise(sendSetupPasswordLink(emp.userId, channel), {
        loading: `Mengirim link setup ke ${emp.name}…`,
        success:
          channel === 'email'
            ? `Link setup password dikirim ke email ${emp.name}`
            : `Link setup password dibuat untuk ${emp.name} (${emp.email ?? emp.phone})`,
        error: (err) => (err instanceof Error ? err.message : 'Gagal mengirim link setup password.'),
      });
    } finally {
      setPendingLink((current) => (current === key ? null : current));
    }
  };

  const sendResetLink = async (emp: EmployeeEntry, channel: 'email' = 'email') => {
    const key = `${emp.userId}:reset`;
    if (pendingLink) return;
    setPendingLink(key);
    try {
      await toast.promise(sendResetPasswordLink(emp.userId, channel), {
        loading: `Mengirim link reset ke ${emp.name}…`,
        success:
          channel === 'email'
            ? `Link reset password dikirim ke email ${emp.name}`
            : `Link reset password dibuat untuk ${emp.name}`,
        error: (err) => (err instanceof Error ? err.message : 'Gagal mengirim link reset password.'),
      });
    } finally {
      setPendingLink((current) => (current === key ? null : current));
    }
  };

  const actionButtons = (e: EmployeeEntry, sm = false) => (
    <>
      {/* Belum ber-password (atau status tak diketahui) → setup; sudah → reset. */}
      {e.hasPassword === true ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={sm ? 'outline' : 'ghost'}
                size={sm ? 'sm' : 'icon'}
                onClick={() => sendResetLink(e)}
                disabled={pendingLink === `${e.userId}:reset`}
                aria-label="Kirim link reset password"
                className={sm ? 'h-7 gap-1.5 text-xs' : ''}
              >
                <KeyRound className="size-3.5" />
                {sm && (pendingLink === `${e.userId}:reset` ? 'Mengirim…' : 'Reset')}
              </Button>
            }
          />
          <TooltipContent>Kirim link reset password</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={sm ? 'outline' : 'ghost'}
                size={sm ? 'sm' : 'icon'}
                onClick={() => sendSetupLink(e)}
                disabled={pendingLink === `${e.userId}:setup`}
                aria-label="Kirim link setup password"
                className={sm ? 'h-7 gap-1.5 text-xs' : ''}
              >
                <MailCheck className="size-3.5" />
                {sm && (pendingLink === `${e.userId}:setup` ? 'Mengirim…' : 'Setup')}
              </Button>
            }
          />
          <TooltipContent>Kirim link setup password</TooltipContent>
        </Tooltip>
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
                options: departments.map((d) => ({ value: d.id, label: d.name })),
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

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
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
                      <a
                      href={`/admin/ticket/monitoring?reporter=${e.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Lihat tiket
                      <ExternalLink className="size-3" />
                    </a>
                    </div>
                  </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <RoleBadges roles={e.roles} />
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
                    <RoleBadges roles={e.roles} />
                  </TableCell>
                  <TableCell className="px-6 py-3 font-mono text-xs text-muted-foreground">{e.phone}</TableCell>
                  <TableCell className="px-6 py-3">
                    <Badge className={ACCOUNT_STATUS_LABEL[e.accountStatus].className}>
                      {ACCOUNT_STATUS_LABEL[e.accountStatus].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    <a
                      href={`/admin/ticket/monitoring?reporter=${e.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Lihat tiket
                      <ExternalLink className="size-3" />
                    </a>
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Ubah ${editing.name}` : 'Pegawai Baru'}</DialogTitle>
            <DialogDescription>
              Satu user bisa memiliki beberapa role sekaligus. Tanpa role aplikasi, pegawai hanya menjadi pelapor (staff).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field>
              <FieldLabel>Nomor Pegawai *</FieldLabel>
              <Input
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder="EMP-0001"
                className="w-full font-mono"
              />
            </Field>
            <Field>
              <FieldLabel>Nama *</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className="w-full" />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@brt.co.id"
                className="w-full"
              />
            </Field>
            <Field>
              <FieldLabel>Telepon</FieldLabel>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full font-mono"
              />
            </Field>
            <Field>
              <FieldLabel>Departemen</FieldLabel>
              <Select
                value={departmentId || null}
                onValueChange={(v) => {
                  setDepartmentId(v ?? '');
                  setPositionId('');
                }}
                items={departments.filter((d) => d.isActive).map((d) => ({ value: d.id, label: d.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {departments.filter((d) => d.isActive).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Posisi</FieldLabel>
              <Select
                value={positionId || null}
                onValueChange={(v) => setPositionId(v ?? '')}
                items={positions
                  .filter((p) => p.isActive && (!departmentId || !p.departmentId || p.departmentId === departmentId))
                  .map((p) => ({ value: p.id, label: `${p.name} (Level ${p.hierarchyLevel})` }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih posisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {positions
                      .filter((p) => p.isActive && (!departmentId || !p.departmentId || p.departmentId === departmentId))
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} (Level {p.hierarchyLevel})</SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Role Aplikasi</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {ASSIGNABLE_APP_ROLES.map((item) => {
                  const checked = selectedRoles.includes(item.value);
                  return (
                    <label
                      key={item.value}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm has-data-checked:border-primary has-data-checked:bg-primary/5"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRole(item.value)}
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Boleh pilih lebih dari satu. Kosongkan semua jika pegawai hanya pelapor (staff).
              </p>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}