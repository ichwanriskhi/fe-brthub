'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TypeBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { ArrowRight, ArrowLeft, Check, UploadCloud, XIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

const TICKET_TYPES = [
  {
    value: 'REQUEST',
    label: 'Request',
    desc: 'Permintaan barang, layanan, atau informasi tertentu.',
  },
  {
    value: 'INCIDENT',
    label: 'Incident',
    desc: 'Kejadian tak terduga yang mengganggu operasional.',
  },
  {
    value: 'COMPLAINT',
    label: 'Complaint',
    desc: 'Keluhan atas produk, layanan, atau penanganan.',
  },
  {
    value: 'INQUIRY',
    label: 'Inquiry',
    desc: 'Pertanyaan atau permintaan informasi umum.',
  },
] as const;

const CATEGORIES = ['Klaim Distribusi & Pengiriman', 'Kendaraan', 'IT Service', 'Sarana & Prasarana', 'Lainnya'];

const SUBCATEGORY_MAP: Record<string, string[]> = {
  'Klaim Distribusi & Pengiriman': [
    'Salah Kirim',
    'Kurang Kirim',
    'Salah SO',
    'Barang Hilang',
    'Salah Order',
    'Barang Rusak',
  ],
  Kendaraan: ['Perawatan Berkala', 'Operasional Kendaraan', 'Suku Cadang Kendaraan'],
  'IT Service': ['Hardware', 'Software & Aplikasi', 'Jaringan & Internet'],
  'Sarana & Prasarana': ['Fasilitas Kantor', 'Gedung & Lingkungan'],
  Lainnya: ['Lainnya'],
};

// Subkategori yang memunculkan data penjualan + barang klaim
const CLAIM_SUBCATEGORIES = new Set(SUBCATEGORY_MAP['Klaim Distribusi & Pengiriman']);

// ── Baris klaim dinamis (sesuai fe-brthub lama) ──
type ClaimItemRole =
  | 'returned_item'
  | 'delivered_item'
  | 'expected_item'
  | 'replacement_item'
  | 'pending_send_item';

const CLAIM_ITEM_ROLES: { value: ClaimItemRole; label: string }[] = [
  { value: 'returned_item', label: 'Dikembalikan' },
  { value: 'delivered_item', label: 'Dikirim ke Konsumen' },
  { value: 'expected_item', label: 'Seharusnya Dikirim' },
  { value: 'replacement_item', label: 'Pengganti' },
  { value: 'pending_send_item', label: 'Perlu Dikirim' },
];

interface ClaimRowEntry {
  id: string;
  hasSecondColumn: boolean;
  role1: ClaimItemRole;
  itemCode1: string;
  itemName1: string;
  role2: ClaimItemRole;
  itemCode2: string;
  itemName2: string;
  qty: number;
  reason: string;
}
const PRODUCT_LINES = ['ECU & Electrical', 'Body Parts', 'Engine Components', 'Lainnya'];
const VEHICLE_MODELS = ['Honda Vario 160', 'Honda Beat', 'Honda Scoopy', 'Lainnya'];
const RELATION_TYPES = [
  { value: 'RELATED_TO', label: 'Terkait Dengan' },
  { value: 'REPEATED_ISSUE', label: 'Masalah Berulang' },
  { value: 'FOLLOW_UP', label: 'Tindak Lanjut' },
];
const RELATED_TICKETS = [
  { value: 'BRT-2026-0910-003', label: 'BRT-2026-0910-003 — Kerusakan barang saat pengiriman' },
  { value: 'BRT-2026-0908-012', label: 'BRT-2026-0908-012 — Keterlambatan pengiriman part' },
];

export default function CreateReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [formData, setFormData] = useState({
    ticketType: 'COMPLAINT' as 'REQUEST' | 'INCIDENT' | 'COMPLAINT' | 'INQUIRY',
    name: 'Dimas Marketing',
    phone: '081234567890',
    address: 'Jl. Raya Bogor KM 28, Jakarta Timur',
    category: 'Klaim Distribusi & Pengiriman',
    subcategory: 'Salah Kirim',
    subject: 'Kekurangan pengiriman part Juken 5+ Vario 160',
    description: 'Pengiriman SO-88491 kurang 2 unit ECU Juken 5+. Mohon dikirimkan kekurangan part tersebut.',
    soNumber: 'SO-88491',
    salesName: 'Budi Santoso',
    productLine: 'ECU & Electrical',
    vehicleModel: 'Honda Vario 160',
    isReportForCustomer: true,
    customerName: 'Bengkel AHASS Vario Jaya',
    customerPhone: '081987654321',
    customerAddress: 'Jl. Pemuda No. 45, Jakarta Selatan',
    isRelated: 'no',
    relatedTicketId: '',
    relationType: 'RELATED_TO',
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [draftSaved, setDraftSaved] = useState(false);

  const newClaimRow = (): ClaimRowEntry => ({
    id: `claim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hasSecondColumn: false,
    role1: 'expected_item',
    itemCode1: '',
    itemName1: '',
    role2: 'delivered_item',
    itemCode2: '',
    itemName2: '',
    qty: 1,
    reason: '',
  });

  const [claimRows, setClaimRows] = useState<ClaimRowEntry[]>([newClaimRow()]);

  const updateClaimRow = (id: string, patch: Partial<ClaimRowEntry>) =>
    setClaimRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addClaimRow = () => setClaimRows((prev) => [...prev, newClaimRow()]);

  const removeClaimRow = (id: string) =>
    setClaimRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const isClaimCategory =
    formData.category === 'Klaim Distribusi & Pengiriman' &&
    CLAIM_SUBCATEGORIES.has(formData.subcategory);
  const isVehicleCategory = formData.category === 'Kendaraan';

  const setField = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (step === 0) {
      if (!formData.ticketType) {
        toast.error('Mohon pilih tipe laporan terlebih dahulu');
        return;
      }
    } else if (step === 1) {
      if (!formData.name || !formData.phone) {
        toast.error('Mohon lengkapi data diri');
        return;
      }
    } else if (step === 2) {
      if (!formData.category || !formData.subcategory || !formData.subject || !formData.description) {
        toast.error('Mohon lengkapi detail pengajuan');
        return;
      }
    } else if (step === 3) {
      if (formData.isRelated === 'yes' && (!formData.relatedTicketId || !formData.relationType)) {
        toast.error('Mohon lengkapi data relasi tiket');
        return;
      }
    } else if (step === 4) {
      toast.success('Laporan berhasil dikirim!');
      router.push('/report/sukses');
      return;
    }

    setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSaveDraft = () => {
    setDraftSaved(true);
    toast.info('Draft berhasil disimpan');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...files]);
      toast.success(`${files.length} file berhasil ditambahkan`);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <FieldSet>
            <FieldLegend variant="label">Tipe Laporan</FieldLegend>
            <FieldDescription>
              Pilih jenis laporan yang paling sesuai dengan keperluan Anda.
            </FieldDescription>
            <RadioGroup
              value={formData.ticketType}
              onValueChange={(val: string | null) => { if (val) setField('ticketType', val as typeof formData.ticketType); }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {TICKET_TYPES.map((t) => (
                <FieldLabel key={t.value} htmlFor={`type-${t.value}`}>
                  <Field orientation="horizontal" className="w-full">
                    <FieldContent className="flex-1">
                      <FieldTitle>{t.label}</FieldTitle>
                      <FieldDescription>{t.desc}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value={t.value} id={`type-${t.value}`} />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>
        );

      case 1:
        return (
          <FieldSet>
            <FieldLegend>Data Pelapor</FieldLegend>
            <FieldDescription>Identitas Anda sebagai pelapor laporan.</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Nama Lengkap</FieldLabel>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Masukkan nama lengkap"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Nomor Handphone</FieldLabel>
                <Input id="phone" value={formData.phone} disabled />
                <FieldDescription>Nomor terverifikasi melalui OTP.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="address">Alamat</FieldLabel>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setField('address', e.target.value)}
                  placeholder="Masukkan alamat lengkap"
                  className="min-h-20"
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        );

      case 2:
        return (
          <FieldSet className="space-y-8">
            <FieldSet>
              <FieldLegend>Detail Pengajuan</FieldLegend>
              <FieldDescription>Detail jenis laporan dan permasalahan yang dialami.</FieldDescription>
              <FieldGroup>

                <FieldGroup className="grid gap-6 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Kategori Masalah</FieldLabel>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => {
                        if (!v) return;
                        setFormData((prev) => ({
                          ...prev,
                          category: v,
                          subcategory: SUBCATEGORY_MAP[v]?.[0] ?? 'Lainnya',
                        }));
                      }}
                      items={CATEGORIES.map((c) => ({ value: c, label: c }))}
                    >
                      <SelectTrigger id="category" className="w-full">
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Subkategori</FieldLabel>
                    <Select
                      value={formData.subcategory}
                      onValueChange={(v) => v && setField('subcategory', v)}
                      items={(SUBCATEGORY_MAP[formData.category] ?? []).map((c) => ({ value: c, label: c }))}
                    >
                      <SelectTrigger id="subcategory" className="w-full">
                        <SelectValue placeholder="Pilih subkategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(SUBCATEGORY_MAP[formData.category] ?? []).map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <Field>
                  <FieldLabel htmlFor="subject">Subjek Masalah</FieldLabel>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setField('subject', e.target.value)}
                    placeholder="Contoh: Kekurangan pengiriman part Juken 5+"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">Deskripsi Masalah</FieldLabel>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Jelaskan detail permasalahan yang dialami..."
                    className="min-h-28"
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            {/* ── Data penjualan + barang klaim: HANYA kategori Klaim Distribusi & Pengiriman ── */}
            {isClaimCategory && (
              <div className="flex flex-col gap-6 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Informasi Klaim Distribusi</p>
                  <FieldDescription>Isi detail SO dan barang terkait klaim.</FieldDescription>
                </div>

                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="soNumber">Nomor Sales Order (SO)</FieldLabel>
                    <Input
                      id="soNumber"
                      value={formData.soNumber}
                      onChange={(e) => setField('soNumber', e.target.value)}
                      placeholder="Contoh: 973603"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="salesName">Nama Sales</FieldLabel>
                    <Input
                      id="salesName"
                      value={formData.salesName}
                      onChange={(e) => setField('salesName', e.target.value)}
                      placeholder="Nama sales terkait"
                    />
                  </Field>
                </FieldGroup>

                {/* ── Baris klaim dinamis ── */}
                <Field orientation="vertical" className="gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <FieldLabel>Detail Barang yang Diklaim</FieldLabel>
                    <span className="text-xs text-muted-foreground">
                      Pilih tipe barang, kode, qty, dan 1 alasan per baris klaim
                    </span>
                  </div>

                  {claimRows.map((row, idx) => (
                    <div key={row.id} className="flex flex-col gap-3 rounded-lg border bg-background p-3.5 shadow-xs">
                      {/* Header baris */}
                      <div className="flex items-center justify-between gap-2 border-b pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="font-mono">Klaim #{idx + 1}</Badge>
                          <Button
                            type="button"
                            variant="link"
                            size="xs"
                            className="h-auto p-0 text-xs"
                            onClick={() => updateClaimRow(row.id, { hasSecondColumn: !row.hasSecondColumn })}
                          >
                            {row.hasSecondColumn ? '− Hapus Kolom Pembanding' : '+ Tambah Kolom Pembanding'}
                          </Button>
                        </div>
                        {claimRows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Hapus baris klaim"
                            onClick={() => removeClaimRow(row.id)}
                          >
                            <XIcon className="size-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Kolom barang 1 / 2 */}
                      <div className={row.hasSecondColumn ? 'grid gap-3 lg:grid-cols-2' : 'grid gap-3'}>
                        {/* Kolom 1 */}
                        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-2.5">
                          <Field orientation="horizontal" className="gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <FieldLabel htmlFor={`role1-${row.id}`} className="text-xs text-muted-foreground">Tipe Barang</FieldLabel>
                            <Select
                              value={row.role1}
                              onValueChange={(v) => v && updateClaimRow(row.id, { role1: v as ClaimItemRole })}
                              items={CLAIM_ITEM_ROLES}
                            >
                              <SelectTrigger id={`role1-${row.id}`} className="w-full sm:w-[220px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {CLAIM_ITEM_ROLES.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>
                          <div className="grid grid-cols-[5rem_1fr] gap-2">
                            <Input
                              className="col-span-1 min-w-0"
                              placeholder="Kode"
                              value={row.itemCode1}
                              onChange={(e) => updateClaimRow(row.id, { itemCode1: e.target.value })}
                            />
                            <Input
                              className="col-span-3 min-w-0"
                              placeholder="Nama / Deskripsi Barang"
                              value={row.itemName1}
                              onChange={(e) => updateClaimRow(row.id, { itemName1: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* Kolom 2 (pembanding) */}
                        {row.hasSecondColumn && (
                          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-2.5">
                            <Field orientation="horizontal" className="gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <FieldLabel htmlFor={`role2-${row.id}`} className="text-xs text-muted-foreground">Tipe Barang</FieldLabel>
                              <Select
                                value={row.role2}
                                onValueChange={(v) => v && updateClaimRow(row.id, { role2: v as ClaimItemRole })}
                                items={CLAIM_ITEM_ROLES}
                              >
                                <SelectTrigger id={`role2-${row.id}`} className="w-full sm:w-[220px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {CLAIM_ITEM_ROLES.map((r) => (
                                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </Field>
                            <div className="grid grid-cols-[5rem_1fr] gap-2">
                              <Input
                                className="col-span-1 min-w-0"
                                placeholder="Kode"
                                value={row.itemCode2}
                                onChange={(e) => updateClaimRow(row.id, { itemCode2: e.target.value })}
                              />
                              <Input
                                className="col-span-3 min-w-0"
                                placeholder="Nama / Deskripsi Barang"
                                value={row.itemName2}
                                onChange={(e) => updateClaimRow(row.id, { itemName2: e.target.value })}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Qty + Alasan */}
                      <div className="flex items-end gap-3">
                        <Field className="w-20 shrink-0 sm:w-24">
                          <FieldLabel htmlFor={`qty-${row.id}`} className="text-xs">Qty</FieldLabel>
                          <Input
                            id={`qty-${row.id}`}
                            type="number"
                            min={1}
                            className="min-w-0"
                            value={row.qty}
                            onChange={(e) => updateClaimRow(row.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </Field>
                        <Field className="min-w-0 flex-1">
                          <FieldLabel htmlFor={`reason-${row.id}`} className="text-xs">Alasan Klaim</FieldLabel>
                          <Input
                            id={`reason-${row.id}`}
                            className="w-full min-w-0"
                            placeholder="Contoh: Beli TB XMAX 40 tapi isi Vario 32"
                            value={row.reason}
                            onChange={(e) => updateClaimRow(row.id, { reason: e.target.value })}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-dashed"
                    onClick={addClaimRow}
                  >
                    <PlusIcon className="size-4" /> Tambah Baris Klaim Baru
                  </Button>
                </Field>
              </div>
            )}

            {/* ── Kendaraan: product line & model kendaraan HANYA utk kategori Kendaraan ── */}
            {isVehicleCategory && (
              <div className="flex flex-col gap-6 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Informasi Kendaraan</p>
                  <FieldDescription>Lini produk dan model kendaraan yang bermasalah.</FieldDescription>
                </div>
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Lini Produk (Product Line)</FieldLabel>
                    <Select
                      value={formData.productLine}
                      onValueChange={(v) => v && setField('productLine', v)}
                      items={PRODUCT_LINES.map((c) => ({ value: c, label: c }))}
                    >
                      <SelectTrigger id="productLine" className="w-full">
                        <SelectValue placeholder="Pilih lini produk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {PRODUCT_LINES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Model Kendaraan</FieldLabel>
                    <Select
                      value={formData.vehicleModel}
                      onValueChange={(v) => v && setField('vehicleModel', v)}
                      items={VEHICLE_MODELS.map((c) => ({ value: c, label: c }))}
                    >
                      <SelectTrigger id="vehicleModel" className="w-full">
                        <SelectValue placeholder="Pilih model kendaraan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {VEHICLE_MODELS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </div>
            )}

            <FieldSet>
              <FieldLegend>Lampiran (Opsional)</FieldLegend>
              <FieldDescription>Tambahkan foto atau dokumen pendukung laporan.</FieldDescription>
              <div className="rounded-lg border border-dashed p-6 text-center">
                <UploadCloud className="mx-auto mb-2 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Seret & lepas file di sini atau klik untuk memilih
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" size="sm" className="mt-2">
                    Pilih File
                  </Button>
                </label>
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((file, idx) => (
                      <p key={idx} className="truncate text-sm">{file.name}</p>
                    ))}
                  </div>
                )}
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Pelaporan Atas Nama</FieldLegend>
              <FieldGroup>
                <RadioGroup
                  className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2"
                  value={formData.isReportForCustomer ? 'customer' : 'self'}
                  onValueChange={(v) => setField('isReportForCustomer', v === 'customer')}
                >
                  <Field orientation="horizontal">
                    <RadioGroupItem value="self" id="report-self" />
                    <FieldLabel htmlFor="report-self" className="font-normal">Diri Sendiri</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <RadioGroupItem value="customer" id="report-customer" />
                    <FieldLabel htmlFor="report-customer" className="font-normal">Pelanggan</FieldLabel>
                  </Field>
                </RadioGroup>

                {formData.isReportForCustomer && (
                  <FieldGroup className="rounded-lg border bg-muted/40 p-4">
                    <Field>
                      <FieldLabel htmlFor="customerName">Nama Pelanggan</FieldLabel>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => setField('customerName', e.target.value)}
                        placeholder="Masukkan nama pelanggan"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="customerPhone">Nomor HP Pelanggan</FieldLabel>
                      <Input
                        id="customerPhone"
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => setField('customerPhone', e.target.value)}
                        placeholder="Masukkan nomor handphone pelanggan"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="customerAddress">Alamat Pelanggan</FieldLabel>
                      <Textarea
                        id="customerAddress"
                        value={formData.customerAddress}
                        onChange={(e) => setField('customerAddress', e.target.value)}
                        placeholder="Masukkan alamat lengkap pelanggan"
                        className="min-h-20"
                      />
                    </Field>
                  </FieldGroup>
                )}
              </FieldGroup>
            </FieldSet>
          </FieldSet>
        );

      case 3:
        return (
          <FieldSet>
            <FieldLegend>Relasi Tiket</FieldLegend>
            <FieldDescription>
              Hubungkan laporan ini dengan tiket lain bila merupakan masalah yang sama atau lanjutan.
            </FieldDescription>
            <FieldGroup>
              <RadioGroup
                className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2"
                value={formData.isRelated}
                onValueChange={(v) => setField('isRelated', v ?? 'no')}
              >
                <Field orientation="horizontal">
                  <RadioGroupItem value="no" id="related-no" />
                  <FieldLabel htmlFor="related-no" className="font-normal">
                    Laporan ini berdiri sendiri
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <RadioGroupItem value="yes" id="related-yes" />
                  <FieldLabel htmlFor="related-yes" className="font-normal">
                    Terkait laporan lain
                  </FieldLabel>
                </Field>
              </RadioGroup>

              {formData.isRelated === 'yes' && (
                <FieldGroup className="rounded-lg border bg-muted/40 p-4">
                  <Field>
                    <FieldLabel>Pilih Tiket Terkait</FieldLabel>
                    <Select
                      value={formData.relatedTicketId}
                      onValueChange={(v) => setField('relatedTicketId', v ?? '')}
                      items={RELATED_TICKETS}
                    >
                      <SelectTrigger id="relatedTicketId" className="w-full">
                        <SelectValue placeholder="Pilih tiket..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {RELATED_TICKETS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Relasi Tiket</FieldLabel>
                    <Select
                      value={formData.relationType}
                      onValueChange={(v) => v && setField('relationType', v)}
                      items={RELATION_TYPES}
                    >
                      <SelectTrigger id="relationType" className="w-full">
                        <SelectValue placeholder="Pilih relasi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {RELATION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              )}

              <FieldDescription>
                Jika kategori laporan adalah <strong>Klaim Distribusi &amp; Pengiriman</strong>, langkah ini
                dilewati otomatis saat pengiriman.
              </FieldDescription>
            </FieldGroup>
          </FieldSet>
        );

      case 4:
        return (
          <FieldSet className="space-y-8">
            {/* Detail Pengajuan — penamaan seragam dengan langkah 3 */}
            <FieldSet>
              <FieldLegend>Detail Pengajuan</FieldLegend>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldDescription>Tipe Laporan</FieldDescription>
                  <div className="flex flex-wrap gap-2">
                    <TypeBadge ticketType={formData.ticketType} />
                  </div>
                </Field>
                <Field>
                  <FieldDescription>Kategori Masalah</FieldDescription>
                  <p className="text-sm font-medium">{formData.category}</p>
                </Field>
                <Field>
                  <FieldDescription>Subkategori</FieldDescription>
                  <p className="text-sm font-medium">{formData.subcategory}</p>
                </Field>
                <Field>
                  <FieldDescription>Subjek Masalah</FieldDescription>
                  <p className="text-sm font-medium">{formData.subject}</p>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldDescription>Deskripsi Masalah</FieldDescription>
                  <p className="rounded-md border bg-muted/40 p-3 text-sm">{formData.description}</p>
                </Field>
              </FieldGroup>
            </FieldSet>

            {/* Informasi Klaim Distribusi — hanya kategori klaim, seragam dengan langkah 3 */}
            {isClaimCategory && (
              <FieldSet>
                <FieldLegend>Informasi Klaim Distribusi</FieldLegend>
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldDescription>Nomor Sales Order (SO)</FieldDescription>
                    <p className="text-sm font-medium">{formData.soNumber}</p>
                  </Field>
                  <Field>
                    <FieldDescription>Nama Sales</FieldDescription>
                    <p className="text-sm font-medium">{formData.salesName}</p>
                  </Field>
                </FieldGroup>
                <div className="space-y-3">
                  <span className="text-sm font-medium">Detail Barang yang Diklaim</span>
                  {claimRows.map((row, idx) => (
                    <div key={row.id} className="space-y-3 rounded-lg border bg-muted/30 p-3.5">
                      <Badge variant="secondary" className="font-mono">Klaim #{idx + 1}</Badge>
                      <div className={row.hasSecondColumn ? 'grid gap-3 lg:grid-cols-2' : 'grid gap-3'}>
                        <div className="space-y-1 rounded-md border bg-background p-2.5 text-xs">
                          <p className="font-medium">{CLAIM_ITEM_ROLES.find((r) => r.value === row.role1)?.label}</p>
                          <p className="font-mono text-muted-foreground">{row.itemCode1 || '-'}</p>
                          <p className="leading-snug">{row.itemName1 || '-'}</p>
                        </div>
                        {row.hasSecondColumn && (
                          <div className="space-y-1 rounded-md border bg-background p-2.5 text-xs">
                            <p className="font-medium">{CLAIM_ITEM_ROLES.find((r) => r.value === row.role2)?.label}</p>
                            <p className="font-mono text-muted-foreground">{row.itemCode2 || '-'}</p>
                            <p className="leading-snug">{row.itemName2 || '-'}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                        <span className="text-muted-foreground">Qty: <strong className="text-foreground">{row.qty}</strong></span>
                        {row.reason && (
                          <span className="min-w-0 flex-1 text-muted-foreground">Alasan: <span className="text-foreground">{row.reason}</span></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </FieldSet>
            )}

            {/* Informasi Kendaraan — hanya kategori Kendaraan, seragam dengan langkah 3 */}
            {isVehicleCategory && (
              <FieldSet>
                <FieldLegend>Informasi Kendaraan</FieldLegend>
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldDescription>Lini Produk (Product Line)</FieldDescription>
                    <p className="text-sm font-medium">{formData.productLine}</p>
                  </Field>
                  <Field>
                    <FieldDescription>Model Kendaraan</FieldDescription>
                    <p className="text-sm font-medium">{formData.vehicleModel}</p>
                  </Field>
                </FieldGroup>
              </FieldSet>
            )}

            {/* Data Pelapor — seragam dengan langkah 2 */}
            <FieldSet>
              <FieldLegend>Data Pelapor</FieldLegend>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldDescription>Nama Lengkap</FieldDescription>
                  <p className="text-sm font-medium">{formData.name}</p>
                </Field>
                <Field>
                  <FieldDescription>Nomor Handphone</FieldDescription>
                  <p className="text-sm font-medium">{formData.phone}</p>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldDescription>Alamat</FieldDescription>
                  <p className="rounded-md border bg-muted/40 p-3 text-sm">{formData.address}</p>
                </Field>
              </FieldGroup>
            </FieldSet>

            {/* Pelaporan Atas Nama — seragam dengan langkah 3 */}
            <FieldSet>
              <FieldLegend>Pelaporan Atas Nama</FieldLegend>
              {formData.isReportForCustomer ? (
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldDescription>Nama Pelanggan</FieldDescription>
                    <p className="text-sm font-medium">{formData.customerName}</p>
                  </Field>
                  <Field>
                    <FieldDescription>Nomor HP Pelanggan</FieldDescription>
                    <p className="text-sm font-medium">{formData.customerPhone}</p>
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldDescription>Alamat Pelanggan</FieldDescription>
                    <p className="rounded-md border bg-muted/40 p-3 text-sm">{formData.customerAddress}</p>
                  </Field>
                </FieldGroup>
              ) : (
                <p className="text-sm text-muted-foreground">Laporan dibuat atas nama sendiri (bukan untuk pelanggan).</p>
              )}
            </FieldSet>

            {/* Relasi Tiket — gambaran tiket terkait, seragam dengan langkah 4 */}
            {formData.isRelated === 'yes' && formData.relatedTicketId && (
              <FieldSet>
                <FieldLegend>Relasi Tiket</FieldLegend>
                <div className="space-y-3 rounded-lg border bg-muted/40 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">{formData.relatedTicketId}</span>
                    <Badge variant="secondary">
                      {RELATION_TYPES.find((t) => t.value === formData.relationType)?.label}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium leading-snug">
                    {RELATED_TICKETS.find((t) => t.value === formData.relatedTicketId)?.label.split('—')[1]?.trim() ?? 'Tiket terkait'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Laporan ini ditandai terkait dengan tiket di atas.
                  </p>
                </div>
              </FieldSet>
            )}

            {/* Lampiran */}
            {attachments.length > 0 && (
              <FieldSet>
                <FieldLegend>Lampiran</FieldLegend>
                <div className="space-y-1">
                  {attachments.map((file, idx) => (
                    <p key={idx} className="truncate border-b pb-1 text-sm last:border-0">{file.name}</p>
                  ))}
                </div>
              </FieldSet>
            )}

            <FieldDescription>
              Pastikan data di atas sudah benar sebelum dikirim ke sistem.
            </FieldDescription>
          </FieldSet>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buat Laporan Baru</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 0 && 'Pilih tipe laporan yang sesuai'}
          {step === 1 && 'Isi data diri Anda sebagai pelapor'}
          {step === 2 && 'Lengkapi detail permasalahan yang dialami'}
          {step === 3 && 'Hubungkan dengan tiket terkait jika ada'}
          {step === 4 && 'Periksa kembali data sebelum dikirim'}
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Langkah {step + 1} dari 5</CardTitle>
            <Badge variant="secondary">{TICKET_TYPES.find((t) => t.value === formData.ticketType)?.label}</Badge>
          </div>
          <CardDescription className="sr-only">Formulir multi-langkah pembuatan laporan</CardDescription>
        </CardHeader>

        <CardContent className="py-6">{renderStep()}</CardContent>

        <CardFooter className="justify-between border-t p-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" /> Kembali
          </Button>
          <div className="flex gap-2">
            {step > 0 && step < 4 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                className="gap-1.5"
              >
                <Check className="size-4" /> Simpan Draft
              </Button>
            )}
            <Button type="button" onClick={handleNext} className="gap-1.5">
              {step === 4 ? 'Kirim Laporan' : 'Lanjut'} <ArrowRight className="size-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
