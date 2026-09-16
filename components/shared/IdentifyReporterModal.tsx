'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Field, FieldLabel } from '@/components/ui/field';
import { User, Building, Briefcase, Search } from 'lucide-react';
import { MOCK_EMPLOYEES, MOCK_DEPARTMENTS, MOCK_POSITIONS, MOCK_CUSTOMERS } from '@/lib/mock/admin';

/** Hasil identifikasi reporter — dikirim ke parent untuk update tiket */
export interface IdentifyReporterResult {
  reporterType: 'EMPLOYEE' | 'CUSTOMER';
  /** ID EmployeeEntry (bila EMPLOYEE) */
  reporterEmployeeId?: string;
  /** ID CustomerEntry (bila CUSTOMER) */
  reporterCustomerId?: string;
  /** Nama pegawai/customer untuk display */
  displayName?: string;
}

interface IdentifyReporterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reporterName: string;
  reporterPhone: string;
  onConfirm?: (result: IdentifyReporterResult) => void;
}

/** Helper: cari pegawai berdasarkan nama/telepon (fuzzy match) */
function findMatchingEmployees(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return MOCK_EMPLOYEES;
  return MOCK_EMPLOYEES.filter((e) =>
    e.name.toLowerCase().includes(q) ||
    e.employeeNumber.toLowerCase().includes(q) ||
    e.phone.includes(q)
  );
}

/** Helper: cari customer berdasarkan nama/telepon */
function findMatchingCustomers(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return MOCK_CUSTOMERS.filter((c) => c.isActive);
  return MOCK_CUSTOMERS.filter((c) =>
    c.isActive &&
    (c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.phone.includes(q))
  );
}

export function IdentifyReporterModal({
  open,
  onOpenChange,
  reporterName,
  reporterPhone,
  onConfirm,
}: IdentifyReporterModalProps) {
  const [reporterType, setReporterType] = useState<'EMPLOYEE' | 'CUSTOMER'>('EMPLOYEE');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const employeeOptions = useMemo(
    () =>
      findMatchingEmployees(employeeSearch).map((e) => ({
        value: e.id,
        label: `${e.name} — ${e.departmentName} / ${e.positionName}`,
      })),
    [employeeSearch]
  );

  const customerOptions = useMemo(
    () =>
      findMatchingCustomers(customerSearch).map((c) => ({
        value: c.id,
        label: `${c.name} (${c.code})`,
      })),
    [customerSearch]
  );

  const resetState = () => {
    setReporterType('EMPLOYEE');
    setSelectedEmployeeId('');
    setSelectedCustomerId('');
    setEmployeeSearch('');
    setCustomerSearch('');
  };

  const isConfirmDisabled =
    reporterType === 'EMPLOYEE' ? !selectedEmployeeId : !selectedCustomerId;

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    if (reporterType === 'EMPLOYEE') {
      const emp = MOCK_EMPLOYEES.find((e) => e.id === selectedEmployeeId);
      onConfirm?.({
        reporterType: 'EMPLOYEE',
        reporterEmployeeId: selectedEmployeeId,
        displayName: emp?.name,
      });
    } else {
      const cust = MOCK_CUSTOMERS.find((c) => c.id === selectedCustomerId);
      onConfirm?.({
        reporterType: 'CUSTOMER',
        reporterCustomerId: selectedCustomerId,
        displayName: cust?.name,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Identifikasi Reporter</DialogTitle>
          <DialogDescription>
            Hubungkan reporter ini dengan data pegawai atau tandai sebagai customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Info Reporter */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{reporterName}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">{reporterPhone}</p>
            </div>
          </div>

          {/* Reporter Type */}
          <Field>
            <FieldLabel>Tipe Reporter</FieldLabel>
            <RadioGroup
              className="grid grid-cols-2 gap-2"
              value={reporterType}
              onValueChange={(v) => {
                setReporterType(v as 'EMPLOYEE' | 'CUSTOMER');
                setSelectedEmployeeId('');
                setSelectedCustomerId('');
              }}
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm has-data-checked:border-primary has-data-checked:bg-primary/5">
                <RadioGroupItem value="EMPLOYEE" />
                <span>Pegawai</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm has-data-checked:border-primary has-data-checked:bg-primary/5">
                <RadioGroupItem value="CUSTOMER" />
                <span>Customer</span>
              </label>
            </RadioGroup>
          </Field>

          {reporterType === 'EMPLOYEE' ? (
            <div className="space-y-4">
              <Field>
                <FieldLabel>Pegawai</FieldLabel>
                <div className="relative">
                  <Select
                    value={selectedEmployeeId || undefined}
                    onValueChange={(v) => setSelectedEmployeeId(v ?? '')}
                    items={employeeOptions}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Cari / pilih pegawai" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <div className="px-3 py-2 border-b">
                          <Input
                            placeholder="Cari nama, nomor, telepon..."
                            value={employeeSearch}
                            onChange={(e) => setEmployeeSearch(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        {employeeOptions.length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                            Tidak ditemukan pegawai
                          </div>
                        ) : (
                          employeeOptions.map((e) => (
                            <SelectItem key={e.value} value={e.value}>
                              {e.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </Field>
            </div>
          ) : (
            <div className="space-y-4">
              <Field>
                <FieldLabel>Customer</FieldLabel>
                <div className="relative">
                  <Select
                    value={selectedCustomerId || undefined}
                    onValueChange={(v) => setSelectedCustomerId(v ?? '')}
                    items={customerOptions}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Cari / pilih customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <div className="px-3 py-2 border-b">
                          <Input
                            placeholder="Cari nama, kode, telepon..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="text-xs"
                          />
                        </div>
                        {customerOptions.length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                            Tidak ditemukan customer aktif
                          </div>
                        ) : (
                          customerOptions.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </Field>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleConfirm} disabled={isConfirmDisabled}>
            Konfirmasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}