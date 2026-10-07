'use client';

import { useState, useEffect } from 'react';
import type { ColumnVisibilityState } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { getAdminEmployees, createAdminEmployee, updateAdminEmployee, sendSetupPasswordLink, sendResetPasswordLink, appRolesToDbNames, type EmployeeProfile } from '@/lib/api/admin-employees';
import { getMasterDataAll } from '@/lib/api/master';
import type { EmployeeEntry, AccountStatus, AppRole } from '@/lib/types/admin';
import { APP_ROLES, ASSIGNABLE_APP_ROLES } from '@/lib/types/admin';
import { TableToolbar, type TableFilterValues } from '@/components/shared/TableToolbar';
import { DataTable, createColumnHelper, type ColumnDef } from '@/components/shared/DataTable';
import type { DataTableFeatures } from '@/components/shared/data-table-features';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { ColumnToggle } from '@/components/shared/ColumnToggle';
import { DotChip } from '@/components/shared/DotChip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, MailCheck, KeyRound, ExternalLink, Users } from 'lucide-react';
import { toast } from 'sonner';

const ACCOUNT_STATUS_LABEL: Record<AccountStatus, { label: string; dot: string }> = {
  ACTIVE: { label: 'Aktif', dot: 'bg-emerald-500/70' },
  NOT_ACTIVATED: { label: 'Belum Aktivasi', dot: 'bg-amber-500/70' },
  NO_ACCOUNT: { label: 'Belum Punya Akun', dot: 'bg-muted-foreground/40' },
};

function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const v = ACCOUNT_STATUS_LABEL[status];
  return <DotChip dotClass={v.dot}>{v.label}</DotChip>;
}

const ROLE_LABEL: Record<AppRole, { label: string; dot: string }> = {
  ADMIN:    { label: 'Admin',    dot: 'bg-violet-500/70' },
  REVIEWER: { label: 'Reviewer', dot: 'bg-sky-500/70' },
  HANDLER:  { label: 'Handler',  dot: 'bg-amber-500/70' },
  UNIT:     { label: 'Unit',     dot: 'bg-orange-500/70' },
  MANAGER:  { label: 'Manager',  dot: 'bg-emerald-500/70' },
  STAFF:    { label: 'Staff',    dot: 'bg-muted-foreground/50' },
};

/**
 * Role pertama ditampilkan penuh; sisanya diringkas jadi "+N" yang memunculkan
 * daftar role lengkap saat diklik.
 */
function RoleBadges({ roles }: { roles: AppRole[] }) {
  const list = roles.length > 0 ? roles : (['STAFF'] as AppRole[]);
  const [primary, ...rest] = list;
  const primaryMeta = ROLE_LABEL[primary] ?? { label: primary, dot: ROLE_LABEL.STAFF.dot };
  return (
    <div className="flex flex-wrap items-center gap-1">
      <DotChip dotClass={primaryMeta.dot}>{primaryMeta.label}</DotChip>
      {rest.length > 0 && (
        <Popover>
          <PopoverTrigger
            render={<DotChip interactive aria-label={`Lihat ${rest.length} role lainnya`} />}
          >
            +{rest.length}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40 p-2">
            <p className="px-1 pb-1.5 text-[11px] font-medium text-muted-foreground">
              Role lainnya
            </p>
            <ul className="space-y-1">
              {rest.map((role) => {
                const meta = ROLE_LABEL[role] ?? { label: role, dot: ROLE_LABEL.STAFF.dot };
                return (
                  <li key={role}>
                    <DotChip dotClass={meta.dot} className="w-full justify-start">
                      {meta.label}
                    </DotChip>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
      )}
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

const columnHelper = createColumnHelper<DataTableFeatures, EmployeeEntry>();

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
  const [perPage, setPerPage] = useState(10);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const columns: ColumnDef<DataTableFeatures, EmployeeEntry>[] = columnHelper.columns([
    columnHelper.accessor('employeeNumber', {
      header: 'Emp No',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">{row.original.employeeNumber}</span>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Nama',
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email ?? row.original.phone}</p>
        </div>
      ),
    }),
    columnHelper.accessor('departmentName', {
      header: 'Departemen',
      cell: ({ row }) => <span className="text-sm">{row.original.departmentName}</span>,
    }),
    columnHelper.accessor('positionName', {
      header: 'Posisi',
      cell: ({ row }) => <span className="text-sm">{row.original.positionName}</span>,
    }),
    columnHelper.display({
      id: 'role',
      header: 'Role',
      cell: ({ row }) => <RoleBadges roles={row.original.roles} />,
    }),
    columnHelper.accessor('phone', {
      header: 'Telepon',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.phone}</span>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status Akun',
      cell: ({ row }) => <AccountStatusBadge status={row.original.accountStatus} />,
    }),
    columnHelper.display({
      id: 'laporan',
      header: 'Laporan',
      cell: ({ row }) => (
        <a
          href={`/admin/ticket/monitoring?reporter=${row.original.id}`}
          className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
        >
          Lihat tiket
          <ExternalLink className="size-3" />
        </a>
      ),
    }),
    columnHelper.display({
      id: 'aksi',
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">{actionButtons(row.original)}</div>
      ),
      enableHiding: false,
    }),
  ]);

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
              >
                <KeyRound data-icon="inline-start" />
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
              >
                <MailCheck data-icon="inline-start" />
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
      >
        <Pencil data-icon="inline-start" />
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
            action={
              <ColumnToggle
                columns={columns}
                visibility={columnVisibility}
                onVisibilityChange={setColumnVisibility}
              />
            }
          />
        </CardContent>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-4" />
            Pegawai Baru
          </Button>
        </div>

        {/* Mobile card view */}
        <div
          className={cn(
            'px-4 pb-4 transition-opacity md:hidden',
            loading && paginated.length > 0 && 'pointer-events-none opacity-50',
          )}
        >
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
                    <AccountStatusBadge status={e.accountStatus} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1">
                  {actionButtons(e, true)}
                </div>
              </div>
            </div>
          ))}
          {paginated.length === 0 && (
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>Tidak ada pegawai yang ditemukan</EmptyTitle>
                <EmptyDescription>
                  Ubah filter atau kata kunci pencarian untuk melihat pegawai lain.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden px-4 pb-4 md:block">
          {loading && paginated.length === 0 ? (
            <TableSkeleton />
          ) : (
            <DataTable
              mode="server"
              columns={columns}
              data={paginated}
              isPending={loading}
              showRowNumbers
              rowNumberOffset={(safePage - 1) * perPage}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              empty={(
                <Empty className="border-0 py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Users />
                    </EmptyMedia>
                    <EmptyTitle>Tidak ada pegawai yang ditemukan</EmptyTitle>
                    <EmptyDescription>
                      Ubah filter atau kata kunci pencarian untuk melihat pegawai lain.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              footer={() => (
                <DataTablePagination
                  page={safePage}
                  lastPage={totalPages}
                  total={filtered.length}
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