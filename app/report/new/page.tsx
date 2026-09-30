'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TypeBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SoCombobox } from '@/components/shared/SoCombobox';
import { ClaimItemSelect } from '@/components/shared/ClaimItemSelect';
import {
  CLAIM_ITEM_ROLES,
  SUBCATEGORY_CLAIM_CONFIG,
  type ClaimItemRole,
  type SubcategoryClaimConfig,
} from '@/lib/constants/claim';
import { loadSapOrderItems, searchSapMasterItems, type SapOrderItem, type SapMasterItem } from '@/lib/api/sap';
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
import { ArrowRight, ArrowLeft, Check, UploadCloud, XIcon, PlusIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

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

interface ClaimRowEntry {
  id: string;
  hasSecondColumn: boolean;
  role1: ClaimItemRole | '';
  itemCode1: string;
  itemName1: string;
  role2: ClaimItemRole | '';
  itemCode2: string;
  itemName2: string;
  qty: number;
  reason: string;
}

/** Baris klaim kosong. Module-level agar bisa dipakai di state & effect (reset saat SO berubah). */
function createClaimRow(): ClaimRowEntry {
  return {
    id: `claim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hasSecondColumn: false,
    role1: '',
    itemCode1: '',
    itemName1: '',
    role2: '',
    itemCode2: '',
    itemName2: '',
    qty: 1,
    reason: '',
  };
}

const RELATION_TYPES = [
  { value: 'RELATED_TO', label: 'Terkait Dengan' },
  { value: 'REPEATED_ISSUE', label: 'Masalah Berulang' },
  { value: 'FOLLOW_UP', label: 'Tindak Lanjut' },
];

interface TicketSummary {
  id: number;
  ticket_no: string;
  subject: string;
}

interface Department {
  id: number;
  code: string;
  name: string;
}

interface Position {
  id: number;
  department_id: number;
  code: string;
  name: string;
  hierarchy_level?: number;
}

interface Subcategory {
  id: number;
  code: string;
  name: string;
}

interface Category {
  id: number;
  code: string;
  name: string;
  parent_category_id?: number | null;
  children?: Subcategory[];
}

interface Product {
  id: number;
  code: string;
  name: string;
}

interface IdentityStatusData {
  is_defined: boolean;
  /** true = profil pelapor (nama+telepon+email) sudah tersimpan & terkunci di Auth Service */
  profile_complete?: boolean;
  type: 'CUSTOMER' | 'EMPLOYEE' | null;
  identity: {
    id: number;
    full_name: string;
    phone_number: string;
    email: string | null;
    address: string | null;
  } | null;
  employee_profile: {
    id: number;
    department_id: number;
    position_id: number;
  } | null;
}

interface AuthUserProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
}

const RequiredIndicator = () => (
  <span aria-hidden="true" className="ml-1 text-destructive">
    *
  </span>
);

export default function CreateReportPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState<'employee' | 'customer'>('customer');
  const [identityDefined, setIdentityDefined] = useState(false);
  const [checkingIdentity, setCheckingIdentity] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  /** true jika employee_profile sudah ada di DB — sembunyikan field dept & posisi */
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lockedFields, setLockedFields] = useState({ email: false, phone: false });

  // Master data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [existingTickets, setExistingTickets] = useState<TicketSummary[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

  // Form State - initialized clean without dummy data.
  // Setiap dropdown default-nya KOSONG agar placeholder "Pilih ..." tampil.
  const [formData, setFormData] = useState({
    ticketType: '' as '' | 'REQUEST' | 'INCIDENT' | 'COMPLAINT' | 'INQUIRY',
    name: '',
    phone: '',
    email: '',
    address: '',
    department: '',
    position: '',
    category: '',
    subcategory: '',
    subject: '',
    description: '',
    soNumber: '',
    salesName: '',
    productLine: '',
    vehicleModel: '',
    isReportForCustomer: false,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    isRelated: 'no',
    relatedTicketId: '',
    relationType: '',
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [draftSaved, setDraftSaved] = useState(false);

  const newClaimRow = createClaimRow;

    const [claimRows, setClaimRows] = useState<ClaimRowEntry[]>([newClaimRow()]);

    // Derive claim config from selected subcategory
    const claimConfig = useMemo(() => {
      return SUBCATEGORY_CLAIM_CONFIG[formData.subcategory] ?? null;
    }, [formData.subcategory]);

    // Reset claim rows when subcategory changes (applies new config)
    useEffect(() => {
      if (claimConfig) {
        setClaimRows([createConfiguredClaimRow(claimConfig)]);
      } else {
        setClaimRows([newClaimRow()]);
      }
    }, [claimConfig]);

    // Create a claim row pre-configured from subcategory config
    function createConfiguredClaimRow(config: SubcategoryClaimConfig): ClaimRowEntry {
      const row = createClaimRow();
      row.hasSecondColumn = config.hasSecondColumn;
      row.role1 = config.role1;
      if (config.role2) row.role2 = config.role2;
      return row;
    }

  // ── Detail SO dari SAP: item barang untuk dropdown klaim ──
  const [sapItems, setSapItems] = useState<SapOrderItem[]>([]);
  const [sapLoading, setSapLoading] = useState(false);
  const [sapError, setSapError] = useState<string | null>(null);

  // Saat SO berubah: ambil item dari SAP & reset baris klaim (kode/nama SO lain tidak valid).
  useEffect(() => {
    const so = formData.soNumber.trim();
    if (!so) {
      setSapItems([]);
      setSapError(null);
      setSapLoading(false);
      return;
    }

    let cancelled = false;
    setSapLoading(true);
    setSapError(null);

    loadSapOrderItems(
      so,
      (items) => {
        if (cancelled) return;
        setSapItems(items);
        setSapLoading(false);
      },
      (message) => {
        if (cancelled) return;
        setSapError(message);
        setSapItems([]);
        setSapLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.soNumber]);

  const updateClaimRow = (id: string, patch: Partial<ClaimRowEntry>) =>
    setClaimRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addClaimRow = () => setClaimRows((prev) => [...prev, newClaimRow()]);

  const removeClaimRow = (id: string) =>
    setClaimRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  // Dynamic Categories from Backend (100% database)
  const availableCategories = categories.map((c) => c.name);

  const activeCategoryObj = categories.find(
    (c) => c.name.toLowerCase() === formData.category.toLowerCase()
  );

  // Dynamic Subcategories for active category (100% database)
  const availableSubcategories =
    activeCategoryObj?.children?.map((ch) => ({
      code: ch.code,
      name: ch.name,
    })) ?? [];

  // Label nama untuk ringkasan — formData.subcategory menyimpan CODE (untuk
  // payload BE + SUBCATEGORY_CLAIM_CONFIG), jadi jangan render langsung.
  const subcategoryLabel =
    availableSubcategories.find((c) => c.code === formData.subcategory)?.name ||
    categories
      .flatMap((c) => c.children ?? [])
      .find((ch) => ch.code === formData.subcategory)?.name ||
    formData.subcategory;

  // Dynamic Product Lines (Lini Produk) — 100% dari backend, tanpa hardcode
  const availableProductLines = products.map((p) => p.name);

  // Dynamic Positions based on selected Department
  const availablePositions = formData.department
    ? positions.filter((p) => String(p.department_id) === String(formData.department))
    : positions;

  const isClaimCategory = formData.category.toLowerCase().includes('klaim');

  const isClaimDistributionCategory =
    activeCategoryObj?.id === 1 || activeCategoryObj?.parent_category_id === 1;
  const showTicketRelation = !isClaimDistributionCategory;

  const isVehicleCategory =
    formData.category.toLowerCase().includes('kendaraan') ||
    formData.category.toLowerCase().includes('produk');

  const setField = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Bantu nomor telepon (kanonik +62) ──────────────────────────────────────
  const normalizePhoneId = (raw: string): string => {
    let p = raw.replace(/[^\d+]/g, '');
    p = p.startsWith('+') ? '+' + p.slice(1).replace(/\+/g, '') : p.replace(/\+/g, '');
    if (!p) return '';
    if (p.startsWith('+62')) return p;
    if (p.startsWith('62')) return '+' + p;
    if (p.startsWith('0')) return '+62' + p.slice(1);
    return '+62' + p;
  };

  const isValidPhoneId = (raw: string): boolean => /^\+62[2-9]\d{7,12}$/.test(normalizePhoneId(raw));

  // Fetch Master Data and Existing Tickets
  useEffect(() => {
    fetch(API_URL + '/api/master/all')
      .then((r) => r.json())
      .then((data) => {
        if (data.departments) setDepartments(data.departments);
        if (data.positions) setPositions(data.positions);
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
        }
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
        }
      })
      .catch(() => {
        // Fallback silently if master endpoint not ready
      });

    // Fetch real tickets for relation dropdown
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      fetch(API_URL + '/api/auth/tickets?mine=true&status_code=CLOSED', {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      })
        .then((r) => r.json())
        .then((res) => {
          const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
          if (Array.isArray(list)) {
            setExistingTickets(
              list.map((t: { id: number; ticket_no: string; subject: string }) => ({
                id: t.id,
                ticket_no: t.ticket_no,
                subject: t.subject,
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [API_URL]);

  // Check Identity & Prefill User Data
  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const init = async () => {
      const token = localStorage.getItem('auth_token');
      const profileRaw = localStorage.getItem('user_profile');
      const authProfile: AuthUserProfile | null = profileRaw ? JSON.parse(profileRaw) : null;

      if (authProfile) {
        setFormData((prev) => ({
          ...prev,
          name: authProfile.full_name || prev.name,
          email: authProfile.email || prev.email,
          phone: authProfile.phone_number || prev.phone,
        }));
        setLockedFields((prev) => ({
          email: prev.email || !!authProfile.email,
          phone: prev.phone || !!authProfile.phone_number,
        }));
      }

      if (!token) {
        clearTimeout(timeout);
        setCheckingIdentity(false);
        return;
      }

      try {
        const res = await fetch(API_URL + '/api/auth/identity-status', {
          headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
          signal: controller.signal,
        });

        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            const data = result.data as IdentityStatusData;
            setProfileComplete(Boolean(data.profile_complete));
            if (data.is_defined && data.identity) {
              setIdentityDefined(true);
              setUserType(data.type === 'EMPLOYEE' ? 'employee' : 'customer');
              // employee_profile ada → sembunyikan form dept & posisi
              if (data.employee_profile) {
                setHasEmployeeProfile(true);
              }
              setFormData((prev) => ({
                ...prev,
                name: data.identity!.full_name,
                email: data.identity!.email || authProfile?.email || prev.email,
                phone: data.identity!.phone_number || authProfile?.phone_number || prev.phone,
                address: data.identity!.address || prev.address,
                department: data.employee_profile ? String(data.employee_profile.department_id) : prev.department,
                position: data.employee_profile ? String(data.employee_profile.position_id) : prev.position,
              }));
              setLockedFields((prev) => ({
                email: prev.email || !!data.identity?.email,
                phone: prev.phone || !!data.identity?.phone_number,
              }));
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('[identity-status] check failed:', err.message);
        }
      } finally {
        clearTimeout(timeout);
        if (isCurrent) {
          setCheckingIdentity(false);
        }
      }
    };

    init();
    return () => {
      isCurrent = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [API_URL]);

  // Step mapping:
  // If identity NOT defined:
  // 0: Siapa Anda (Jenis Pengguna)
  // 1: Data Pelapor
  // 2: Tipe Laporan
  // 3: Detail Pengajuan
  // 4: Relasi Tiket
  // 5: Konfirmasi
  // If identity defined:
  // 0: Data Pelapor
  // 1: Tipe Laporan
  // 2: Detail Pengajuan
  // 3: Relasi Tiket
  // 4: Konfirmasi

  const totalSteps = (identityDefined ? 5 : 6) - (showTicketRelation ? 0 : 1);

  const handleNext = () => {
    if (!identityDefined) {
      if (step === 0) {
        if (!userType) {
          toast.error('Mohon pilih tipe akun terlebih dahulu');
          return;
        }
      } else if (step === 1) {
        if (!formData.name || !formData.phone) {
          toast.error('Mohon lengkapi nama dan nomor handphone');
          return;
        }
        if (!isValidPhoneId(formData.phone)) {
          toast.error('Format nomor handphone tidak valid. Contoh: 081234567890');
          return;
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          toast.error('Format email tidak valid');
          return;
        }
        if (userType === 'employee' && (!formData.department || !formData.position)) {
          toast.error('Mohon pilih departemen dan posisi kepegawaian Anda');
          return;
        }
      } else if (step === 2) {
        if (!formData.ticketType) {
          toast.error('Mohon pilih tipe laporan terlebih dahulu');
          return;
        }
      } else if (step === 3) {
        if (!formData.category || !formData.subcategory || !formData.subject || !formData.description) {
          toast.error('Mohon lengkapi detail pengajuan');
          return;
        }
      } else if (step === 4) {
        if (showTicketRelation && formData.isRelated === 'yes' && (!formData.relatedTicketId || !formData.relationType)) {
          toast.error('Mohon lengkapi data relasi tiket');
          return;
        }
        if (!showTicketRelation) {
          handleSubmitReport();
          return;
        }
      } else if (step === 5) {
        handleSubmitReport();
        return;
      }
    } else {
      if (step === 0) {
        if (!formData.name || !formData.phone) {
          toast.error('Mohon lengkapi data pelapor');
          return;
        }
        if (userType === 'employee' && (!formData.department || !formData.position)) {
          toast.error('Mohon lengkapi data departemen dan posisi');
          return;
        }
      } else if (step === 1) {
        if (!formData.ticketType) {
          toast.error('Mohon pilih tipe laporan terlebih dahulu');
          return;
        }
      } else if (step === 2) {
        if (!formData.category || !formData.subcategory || !formData.subject || !formData.description) {
          toast.error('Mohon lengkapi detail pengajuan');
          return;
        }
      } else if (step === 3) {
        if (showTicketRelation && formData.isRelated === 'yes' && (!formData.relatedTicketId || !formData.relationType)) {
          toast.error('Mohon lengkapi data relasi tiket');
          return;
        }
        if (!showTicketRelation) {
          handleSubmitReport();
          return;
        }
      } else if (step === 4) {
        handleSubmitReport();
        return;
      }
    }

    setStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep((prev) => prev - 1);
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

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmitReport = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Sesi login telah berakhir. Silakan login kembali.');
        router.push('/login');
        return;
      }

      const reporterPhone = normalizePhoneId(formData.phone);
      if (!isValidPhoneId(formData.phone)) {
        toast.error('Nomor handphone pelapor tidak valid. Contoh: 081234567890');
        return;
      }

      const customerPhone = normalizePhoneId(formData.customerPhone);
      if (formData.isReportForCustomer && !isValidPhoneId(formData.customerPhone)) {
        toast.error('Nomor handphone pelanggan tidak valid. Contoh: 081234567890');
        return;
      }

      // Selalu sinkronisasi profil pelapor (nama & alamat) ke Auth Service dan local DB
      // sebelum tiket dibuat, supaya perubahan nama/alamat selalu tersimpan.
      {
        const profileRes = await fetch(API_URL + '/api/auth/profile', {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer ' + token,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: formData.name,
            phone_number: reporterPhone,
            email: formData.email || null,
            address: formData.address || null,
          }),
        });

        if (profileRes.ok || profileRes.status === 409) {
          setProfileComplete(true);
          if (profileRes.ok) {
            const profileJson = await profileRes.json().catch(() => null);
            const profileData = profileJson?.data;
            if (profileData) {
              localStorage.setItem(
                'user_profile',
                JSON.stringify({
                  id: profileData.uuid ?? profileData.id,
                  full_name: profileData.full_name,
                  email: profileData.email,
                  phone_number: profileData.phone_number,
                }),
              );
            }
          }
        } else {
          const profileJson = await profileRes.json().catch(() => ({}));
          throw new Error(profileJson.message || 'Gagal menyimpan data pelapor');
        }
      }

      const payload = new FormData();
      payload.append('reporter_type', userType === 'employee' ? 'EMPLOYEE' : 'CUSTOMER');
      payload.append('name', formData.name);
      payload.append('phone', reporterPhone);
      if (formData.email) payload.append('email', formData.email);
      if (formData.address) payload.append('address', formData.address);

      if (userType === 'employee') {
        if (formData.department) payload.append('department_id', formData.department);
        if (formData.position) payload.append('position_id', formData.position);
      }

      payload.append('ticket_type', formData.ticketType);
      payload.append('category', formData.category);
      payload.append('subcategory', formData.subcategory);
      payload.append('subject', formData.subject);
      payload.append('description', formData.description);

      // On behalf of customer
      payload.append('is_report_for_customer', formData.isReportForCustomer ? '1' : '0');
      if (formData.isReportForCustomer) {
        payload.append('customer_name', formData.customerName);
        payload.append('customer_phone', customerPhone);
        if (formData.customerEmail) payload.append('customer_email', formData.customerEmail);
        payload.append('customer_address', formData.customerAddress);
      }

      // Vehicle / Claim details
      if (isVehicleCategory) {
        payload.append('product_line', formData.productLine);
        payload.append('vehicle_model', formData.vehicleModel);
      }

      if (isClaimCategory) {
        payload.append('so_number', formData.soNumber);
        payload.append('sales_name', formData.salesName);
        payload.append('claimed_items', JSON.stringify(claimRows));
      }

      if (showTicketRelation && formData.isRelated === 'yes' && formData.relatedTicketId) {
        payload.append('is_related', 'yes');
        payload.append('related_ticket_id', formData.relatedTicketId);
        payload.append('relation_type', formData.relationType);
      }

      // Attachments
      attachments.forEach((file) => {
        payload.append('attachments[]', file);
      });

      const res = await fetch(API_URL + '/api/auth/tickets', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
        },
        body: payload,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal membuat tiket');
      }

      const createdTicket = json.data;
      const ticketId = createdTicket?.id || '';
      const ticketNo = createdTicket?.ticket_no || '';
      router.push(`/report/sukses?ticket_id=${ticketId}&ticket_no=${ticketNo}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim laporan';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const deptName = departments.find((d) => String(d.id) === formData.department)?.name || formData.department || '—';
  const posName = positions.find((p) => String(p.id) === formData.position)?.name || formData.position || '—';

  // Subtitle header text
  const getHeaderDescription = () => {
    if (!identityDefined) {
      switch (step) {
        case 0:
          return 'Pilih tipe akun Anda';
        case 1:
          return 'Isi data diri Anda sebagai pelapor';
        case 2:
          return 'Pilih tipe laporan yang sesuai';
        case 3:
          return 'Lengkapi detail permasalahan yang dialami';
        case 4:
          return showTicketRelation ? 'Hubungkan dengan tiket terkait jika ada' : 'Periksa kembali data sebelum dikirim';
        case 5:
          return 'Periksa kembali data sebelum dikirim';
        default:
          return '';
      }
    } else {
      switch (step) {
        case 0:
          return 'Isi data diri Anda sebagai pelapor';
        case 1:
          return 'Pilih tipe laporan yang sesuai';
        case 2:
          return 'Lengkapi detail permasalahan yang dialami';
        case 3:
          return showTicketRelation ? 'Hubungkan dengan tiket terkait jika ada' : 'Periksa kembali data sebelum dikirim';
        case 4:
          return 'Periksa kembali data sebelum dikirim';
        default:
          return '';
      }
    }
  };

  // ── Step Renderers ────────────────────────────────────────────────────────────

  // Step: Siapa Anda (Hanya untuk user baru)
  const renderUserTypeStep = () => {
    if (profileComplete) return null;
    return (
    <FieldSet>
      <FieldLegend variant="label">Siapa Anda?</FieldLegend>
      <FieldDescription>Pilih tipe akun agar data pelapor dapat disesuaikan.</FieldDescription>
      <RadioGroup
        value={userType}
        onValueChange={(val: string | null) => {
          if (val) setUserType(val as 'employee' | 'customer');
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <FieldLabel htmlFor="type-employee">
          <Field orientation="horizontal" className="w-full">
            <FieldContent className="flex-1">
              <FieldTitle>Pegawai BRT</FieldTitle>
              <FieldDescription>Saya adalah pegawai Bintang Racing Team</FieldDescription>
            </FieldContent>
            <RadioGroupItem value="employee" id="type-employee" />
          </Field>
        </FieldLabel>
        <FieldLabel htmlFor="type-customer">
          <Field orientation="horizontal" className="w-full">
            <FieldContent className="flex-1">
              <FieldTitle>Customer</FieldTitle>
              <FieldDescription>Saya bukan pegawai BRT (masyarakat umum / pelanggan)</FieldDescription>
            </FieldContent>
            <RadioGroupItem value="customer" id="type-customer" />
          </Field>
        </FieldLabel>
      </RadioGroup>
    </FieldSet>
    );
  };

  // Step: Data Pelapor
  const renderReporterDataStep = () => (
    <FieldSet>
      <div className="flex items-center justify-between gap-3">
        <FieldLegend>{userType === 'employee' ? 'Data Pegawai' : 'Data Pelapor'}</FieldLegend>
        {identityDefined && <Badge variant="secondary">Terdaftar</Badge>}
      </div>
      <FieldDescription>
        {userType === 'employee' && !hasEmployeeProfile
          ? 'Masukkan data kepegawaian Anda.'
          : identityDefined
          ? 'Data terisi otomatis. Nama dan alamat masih bisa diubah.'
          : 'Identitas Anda sebagai pelapor laporan.'}
      </FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nama Lengkap<RequiredIndicator /></FieldLabel>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Masukkan nama lengkap"
            
          />
        </Field>

        {/* Email field - ditampilkan untuk kedua tipe user (pegawai & customer) */}
        <Field>
          <FieldLabel htmlFor="email">
            Email <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
          </FieldLabel>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="nama@email.com"
            disabled={lockedFields.email}
          />
          {formData.email && <FieldDescription>Otomatis terisi dari akun login. Tidak dapat diubah di sini.</FieldDescription>}
        </Field>

        <Field>
          <FieldLabel htmlFor="phone">Nomor Handphone<RequiredIndicator /></FieldLabel>
          <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="08xxxxxxxxxx"
                disabled={lockedFields.phone}
              />
              {formData.phone && (
                <FieldDescription>Nomor terverifikasi melalui akun login. Tidak dapat diubah di sini.</FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="address">
                Alamat <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
              </FieldLabel>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setField('address', e.target.value)}
                placeholder="Masukkan alamat lengkap"
                className="min-h-20"
                
              />
            </Field>

            {/* Department & Position hanya untuk pegawai yang belum punya employee_profile */}
            {userType === 'employee' && !hasEmployeeProfile && (
              <FieldGroup className="grid gap-6 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="department">Departemen<RequiredIndicator /></FieldLabel>
                  {departments.length > 0 ? (
                    <Select
                      value={formData.department || null}
                      disabled={profileComplete}
                      onValueChange={(v) => {
                        if (!v) return;
                        const isPositionValid = positions.some(
                          (p) => String(p.department_id) === v && String(p.id) === formData.position
                        );
                        setFormData((prev) => ({
                          ...prev,
                          department: v,
                          position: isPositionValid ? prev.position : '',
                        }));
                      }}
                      items={departments.map((d) => ({ value: String(d.id), label: d.name }))}
                    >
                      <SelectTrigger id="department" className="w-full">
                        <SelectValue placeholder="Pilih departemen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setField('department', e.target.value)}
                      placeholder="Nama departemen"
                    />
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="position">Posisi / Jabatan<RequiredIndicator /></FieldLabel>
                  {availablePositions.length > 0 ? (
                    <Select
                      value={formData.position || null}
                      disabled={profileComplete}
                      onValueChange={(v) => v && setField('position', v)}
                      items={availablePositions.map((p) => ({ value: String(p.id), label: p.name }))}
                    >
                      <SelectTrigger id="position" className="w-full">
                        <SelectValue placeholder="Pilih posisi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {availablePositions.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setField('position', e.target.value)}
                      placeholder="Nama posisi / jabatan"
                    />
                  )}
                </Field>
              </FieldGroup>
            )}
      </FieldGroup>
    </FieldSet>
  );

  // Step: Tipe Laporan
  const renderTicketTypeStep = () => (
    <FieldSet>
      <FieldLegend variant="label">Tipe Laporan<RequiredIndicator /></FieldLegend>
      <FieldDescription>Pilih jenis laporan yang paling sesuai dengan keperluan Anda.</FieldDescription>
      <RadioGroup
        value={formData.ticketType}
        onValueChange={(val: string | null) => {
          if (val) setField('ticketType', val as typeof formData.ticketType);
        }}
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

  // Step: Detail Pengajuan
  const renderDetailStep = () => (
    <FieldSet className="space-y-8">
      <FieldSet>
        <FieldLegend>Detail Pengajuan</FieldLegend>
        <FieldDescription>Detail jenis laporan dan permasalahan yang dialami.</FieldDescription>
        <FieldGroup>
          <FieldGroup className="grid gap-6 md:grid-cols-2">
            <Field>
              <FieldLabel>Kategori Masalah<RequiredIndicator /></FieldLabel>
              <Select
                value={formData.category || null}
                onValueChange={(v) => {
                  if (!v) return;
                  const selectedCategory = categories.find((category) => category.name === v);
                  const isClaimDistribution =
                    selectedCategory?.id === 1 || selectedCategory?.parent_category_id === 1;
                  setFormData((prev) => ({
                    ...prev,
                    category: v,
                    subcategory: '',
                    ...(isClaimDistribution
                      ? { isRelated: 'no', relatedTicketId: '', relationType: '' }
                      : {}),
                  }));
                }}
                items={availableCategories.map((c) => ({ value: c, label: c }))}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Pilih Kategori Masalah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Subkategori<RequiredIndicator /></FieldLabel>
              <Select
                value={formData.subcategory || null}
                onValueChange={(v) => v && setField('subcategory', v)}
                items={availableSubcategories.map((c) => ({ value: c.code, label: c.name }))}
              >
                <SelectTrigger id="subcategory" className="w-full">
                  <SelectValue placeholder="Pilih Subkategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableSubcategories.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <Field>
            <FieldLabel htmlFor="subject">Subjek Masalah<RequiredIndicator /></FieldLabel>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setField('subject', e.target.value)}
              placeholder="Contoh: Kekurangan pengiriman part Juken 5+"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Deskripsi Masalah<RequiredIndicator /></FieldLabel>
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
              <SoCombobox
                value={formData.soNumber}
                onValueChange={(soNumber, salesName) =>
                  setFormData((prev) => ({ ...prev, soNumber, salesName }))
                }
                placeholder="Cari nomor SO..."
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="salesName">Nama Sales</FieldLabel>
              <Input
                id="salesName"
                value={formData.salesName}
                readOnly
                placeholder="Terisi otomatis"
                className="bg-muted/40 text-muted-foreground"
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
                                <Badge variant="secondary" className="font-mono">
                                  Klaim #{idx + 1}
                                </Badge>
                                {!claimConfig && (
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="xs"
                                    className="h-auto p-0 text-xs"
                                    onClick={() => updateClaimRow(row.id, { hasSecondColumn: !row.hasSecondColumn })}
                                  >
                                    {row.hasSecondColumn ? '− Hapus Kolom Pembanding' : '+ Tambah Kolom Pembanding'}
                                  </Button>
                                )}
                                {claimConfig && (
                                  <Badge variant="outline" className="text-xs">
                                    {claimConfig.hasSecondColumn ? '2 Kolom (Fixed)' : '1 Kolom (Fixed)'}
                                  </Badge>
                                )}
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
                                {claimConfig ? (
                                  // Fixed role from config - show as badge
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Tipe Barang</span>
                                    <Badge variant="secondary" className="font-medium">
                                      {claimConfig.role1Label}
                                    </Badge>
                                  </div>
                                ) : (
                                  // Free-form - show dropdown
                                  <Field orientation="horizontal" className="gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <FieldLabel htmlFor={`role1-${row.id}`} className="text-xs text-muted-foreground">
                                      Tipe Barang
                                    </FieldLabel>
                                    <Select
                                      value={row.role1 || null}
                                      onValueChange={(v) => v && updateClaimRow(row.id, { role1: v as ClaimItemRole })}
                                      items={CLAIM_ITEM_ROLES}
                                    >
                                      <SelectTrigger id={`role1-${row.id}`} className="w-full sm:w-[220px]">
                                        <SelectValue placeholder="Pilih Tipe Barang" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectGroup>
                                          {CLAIM_ITEM_ROLES.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                              {r.label}
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      </SelectContent>
                                    </Select>
                                  </Field>
                                )}
                                <div className="grid gap-2 min-w-0 overflow-hidden">
                                  <ClaimItemSelect
                                    id={`item1-${row.id}`}
                                    items={sapItems}
                                    value={row.itemCode1}
                                    selectedName={row.itemName1}
                                    showNameInTrigger={false}
                                    onValueChange={(code, name) =>
                                      updateClaimRow(row.id, { itemCode1: code, itemName1: name })
                                    }
                                    loading={sapLoading}
                                    disabled={!formData.soNumber}
                                    error={sapError}
                                    placeholder="Pilih barang…"
                                  />
                                  {row.itemName1 && (
                                    <p
                                      className="text-[11px] text-muted-foreground truncate min-w-0"
                                      title={row.itemName1}
                                    >
                                      {row.itemName1}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Kolom 2 (pembanding) */}
                              {row.hasSecondColumn && (
                                <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-2.5">
                                  {claimConfig && claimConfig.role2 ? (
                                    // Fixed role from config - show as badge
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">Tipe Barang</span>
                                      <Badge variant="secondary" className="font-medium">
                                        {claimConfig.role2Label}
                                      </Badge>
                                    </div>
                                  ) : (
                                    // Free-form - show dropdown
                                    <Field orientation="horizontal" className="gap-2 sm:flex-row sm:items-center sm:justify-between">
                                      <FieldLabel htmlFor={`role2-${row.id}`} className="text-xs text-muted-foreground">
                                        Tipe Barang
                                      </FieldLabel>
                                      <Select
                                        value={row.role2 || null}
                                        onValueChange={(v) => v && updateClaimRow(row.id, { role2: v as ClaimItemRole })}
                                        items={CLAIM_ITEM_ROLES}
                                      >
                                        <SelectTrigger id={`role2-${row.id}`} className="w-full sm:w-[220px]">
                                          <SelectValue placeholder="Pilih Tipe Barang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            {CLAIM_ITEM_ROLES.map((r) => (
                                              <SelectItem key={r.value} value={r.value}>
                                                {r.label}
                                              </SelectItem>
                                            ))}
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
                                    </Field>
                                  )}
                                  <div className="grid gap-2 min-w-0 overflow-hidden">
                                  <ClaimItemSelect
                                    id={`item2-${row.id}`}
                                    items={[]}
                                    value={row.itemCode2}
                                    selectedName={row.itemName2}
                                    showNameInTrigger={false}
                                    onValueChange={(code, name) =>
                                      updateClaimRow(row.id, { itemCode2: code, itemName2: name })
                                    }
                                    loading={sapLoading}
                                    disabled={!formData.soNumber}
                                    error={sapError}
                                    placeholder="Cari barang ..."
                                    mode="master"
                                    onSearch={searchSapMasterItems}
                                  />
                                  {row.itemName2 && (
                                    <p
                                      className="text-[11px] text-muted-foreground truncate min-w-0"
                                      title={row.itemName2}
                                    >
                                      {row.itemName2}
                                    </p>
                                  )}
                                </div>
                              </div>
                              )}
                            </div>

                {/* Qty + Alasan */}
                <div className="flex items-end gap-3">
                  <Field className="w-20 shrink-0 sm:w-24">
                    <FieldLabel htmlFor={`qty-${row.id}`} className="text-xs">
                      Qty
                    </FieldLabel>
                    <Input
                      id={`qty-${row.id}`}
                      type="number"
                      min={1}
                      className="min-w-0"
                      value={row.qty}
                      onChange={(e) =>
                        updateClaimRow(row.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                    />
                  </Field>
                  <Field className="min-w-0 flex-1">
                    <FieldLabel htmlFor={`reason-${row.id}`} className="text-xs">
                      Alasan Klaim
                    </FieldLabel>
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
              <FieldLabel htmlFor="productLine">Lini Produk (Product Line)</FieldLabel>
              <Select
                value={formData.productLine || null}
                onValueChange={(v) => v && setField('productLine', v)}
                items={availableProductLines.map((c) => ({ value: c, label: c }))}
              >
                <SelectTrigger id="productLine" className="w-full">
                  <SelectValue
                    placeholder={
                      availableProductLines.length > 0 ? 'Pilih Lini Produk' : 'Memuat lini produk...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableProductLines.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    {availableProductLines.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Memuat lini produk...
                      </div>
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="vehicleModel">Model Kendaraan</FieldLabel>
              <Input
                id="vehicleModel"
                value={formData.vehicleModel}
                onChange={(e) => setField('vehicleModel', e.target.value)}
                placeholder="Masukkan model kendaraan (contoh: Honda Vario 160, NMAX, Beat)"
              />
            </Field>
          </FieldGroup>
        </div>
      )}

      <FieldSet>
        <FieldLegend>Lampiran (Opsional)</FieldLegend>
        <FieldDescription>Tambahkan foto atau dokumen pendukung laporan.</FieldDescription>
        <div className="rounded-lg border border-dashed p-6 text-center">
          <UploadCloud className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Seret & lepas file di sini atau klik untuk memilih</p>
          <input
            type="file"
            multiple
            onChange={(e) => {
              handleFileUpload(e);
              e.target.value = '';
            }}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <span>Pilih File</span>
            </Button>
          </label>
          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus lampiran ${file.name}`}
                    onClick={() => removeAttachment(idx)}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
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
              <FieldLabel htmlFor="report-self" className="font-normal">
                Diri Sendiri
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="customer" id="report-customer" />
              <FieldLabel htmlFor="report-customer" className="font-normal">
                Pelanggan
              </FieldLabel>
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
                <FieldLabel htmlFor="customerEmail">
                  Email Pelanggan <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
                </FieldLabel>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setField('customerEmail', e.target.value)}
                  placeholder="nama@email.com"
                />
                <FieldDescription>Membantu mencocokkan akun pelanggan agar tidak duplikat.</FieldDescription>
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

  // Step: Relasi Tiket
  const renderRelationStep = () => (
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
              <FieldLabel htmlFor="relatedTicketId">Pilih Tiket Terkait<RequiredIndicator /></FieldLabel>
              <Select
                value={formData.relatedTicketId || null}
                onValueChange={(v) => setField('relatedTicketId', v ?? '')}
                items={existingTickets.map((t) => ({
                  value: t.ticket_no,
                  label: `${t.ticket_no} — ${t.subject}`,
                }))}
                disabled={existingTickets.length === 0}
              >
                <SelectTrigger id="relatedTicketId" className="w-full">
                  <SelectValue placeholder="Pilih Tiket Terkait" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {existingTickets.map((t) => (
                      <SelectItem key={t.ticket_no} value={t.ticket_no}>
                        {t.ticket_no} — {t.subject}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {existingTickets.length === 0 && (
                <FieldDescription>
                  Belum ada tiket Anda yang berstatus Closed untuk dipilih.
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel>Relasi Tiket<RequiredIndicator /></FieldLabel>
              <Select
                value={formData.relationType || null}
                onValueChange={(v) => v && setField('relationType', v)}
                items={RELATION_TYPES}
              >
                <SelectTrigger id="relationType" className="w-full">
                  <SelectValue placeholder="Pilih Relasi Tiket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {RELATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        )}

      </FieldGroup>
    </FieldSet>
  );

  // Step: Konfirmasi Data
  const renderConfirmationStep = () => (
    <FieldSet className="space-y-8">
      {/* Detail Pengajuan */}
      <FieldSet>
        <FieldLegend>Detail Pengajuan</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldDescription>Tipe Laporan</FieldDescription>
            <div className="flex flex-wrap gap-2">
              {formData.ticketType ? (
                <TypeBadge ticketType={formData.ticketType} />
              ) : (
                <Badge variant="outline">Belum dipilih</Badge>
              )}
            </div>
          </Field>
          <Field>
            <FieldDescription>Kategori Masalah</FieldDescription>
            <p className="text-sm font-medium">{formData.category}</p>
          </Field>
          <Field>
            <FieldDescription>Subkategori</FieldDescription>
            <p className="text-sm font-medium">{subcategoryLabel}</p>
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

      {/* Informasi Klaim Distribusi */}
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
                          <Badge variant="secondary" className="font-mono">
                            Klaim #{idx + 1}
                          </Badge>
                          <div className={row.hasSecondColumn ? 'grid gap-3 lg:grid-cols-2' : 'grid gap-3'}>
                            <div className="space-y-1 rounded-md border bg-background p-2.5 text-xs">
                              <p className="font-medium">
                                {claimConfig?.role1Label ?? CLAIM_ITEM_ROLES.find((r) => r.value === row.role1)?.label}
                              </p>
                              <p className="font-mono text-muted-foreground">{row.itemCode1 || '-'}</p>
                              <p className="leading-snug">{row.itemName1 || '-'}</p>
                            </div>
                            {row.hasSecondColumn && (
                              <div className="space-y-1 rounded-md border bg-background p-2.5 text-xs">
                                <p className="font-medium">
                                  {claimConfig?.role2Label ?? CLAIM_ITEM_ROLES.find((r) => r.value === row.role2)?.label}
                                </p>
                                <p className="font-mono text-muted-foreground">{row.itemCode2 || '-'}</p>
                                <p className="leading-snug">{row.itemName2 || '-'}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                            <span className="text-muted-foreground">
                              Qty: <strong className="text-foreground">{row.qty}</strong>
                            </span>
                            {row.reason && (
                              <span className="min-w-0 flex-1 text-muted-foreground">
                                Alasan: <span className="text-foreground">{row.reason}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
        </FieldSet>
      )}

      {/* Informasi Kendaraan */}
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

      {/* Data Pelapor */}
      <FieldSet>
        <FieldLegend>{userType === 'employee' ? 'Data Pegawai' : 'Data Pelapor'}</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldDescription>Nama Lengkap</FieldDescription>
            <p className="text-sm font-medium">{formData.name || '—'}</p>
          </Field>
          <Field>
            <FieldDescription>Nomor Handphone</FieldDescription>
            <p className="text-sm font-medium">{formData.phone || '—'}</p>
          </Field>
          {userType === 'customer' ? (
            <>
              {formData.email && (
                <Field>
                  <FieldDescription>Email</FieldDescription>
                  <p className="text-sm font-medium">{formData.email}</p>
                </Field>
              )}
              <Field className="sm:col-span-2">
                <FieldDescription>Alamat</FieldDescription>
                <p className="rounded-md border bg-muted/40 p-3 text-sm">{formData.address || '—'}</p>
              </Field>
            </>
          ) : (
            <>
              <Field>
                <FieldDescription>Departemen</FieldDescription>
                <p className="text-sm font-medium">{deptName}</p>
              </Field>
              <Field>
                <FieldDescription>Posisi / Jabatan</FieldDescription>
                <p className="text-sm font-medium">{posName}</p>
              </Field>
            </>
          )}
        </FieldGroup>
      </FieldSet>

      {/* Pelaporan Atas Nama */}
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
            {formData.customerEmail && (
              <Field>
                <FieldDescription>Email Pelanggan</FieldDescription>
                <p className="text-sm font-medium">{formData.customerEmail}</p>
              </Field>
            )}
            <Field className="sm:col-span-2">
              <FieldDescription>Alamat Pelanggan</FieldDescription>
              <p className="rounded-md border bg-muted/40 p-3 text-sm">{formData.customerAddress}</p>
            </Field>
          </FieldGroup>
        ) : (
          <p className="text-sm text-muted-foreground">
            Laporan dibuat atas nama sendiri (bukan untuk pelanggan).
          </p>
        )}
      </FieldSet>

      {/* Relasi Tiket */}
      {showTicketRelation && formData.isRelated === 'yes' && formData.relatedTicketId && (
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
              {existingTickets.find((t) => t.ticket_no === formData.relatedTicketId)?.subject ??
                formData.relatedTicketId}
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
          <div className="space-y-2">
            {attachments.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus lampiran ${file.name}`}
                  onClick={() => removeAttachment(idx)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </FieldSet>
      )}

      <FieldDescription>Pastikan data di atas sudah benar sebelum dikirim ke sistem.</FieldDescription>
    </FieldSet>
  );

  const renderStep = () => {
    if (!identityDefined) {
      switch (step) {
        case 0:
          return renderUserTypeStep();
        case 1:
          return renderReporterDataStep();
        case 2:
          return renderTicketTypeStep();
        case 3:
          return renderDetailStep();
        case 4:
          return showTicketRelation ? renderRelationStep() : renderConfirmationStep();
        case 5:
          return renderConfirmationStep();
        default:
          return null;
      }
    } else {
      switch (step) {
        case 0:
          return renderReporterDataStep();
        case 1:
          return renderTicketTypeStep();
        case 2:
          return renderDetailStep();
        case 3:
          return showTicketRelation ? renderRelationStep() : renderConfirmationStep();
        case 4:
          return renderConfirmationStep();
        default:
          return null;
      }
    }
  };

  if (checkingIdentity) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6 md:py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat Laporan Baru</h1>
          <p className="mt-1 text-sm text-muted-foreground">Memuat data pelapor...</p>
        </div>
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent className="py-6 space-y-6">
             <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              <Skeleton className="h-32 w-full mt-6" />
          </CardContent>
          <CardFooter className="justify-between border-t p-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isLastStep = step === totalSteps - 1;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buat Laporan Baru</h1>
        <p className="mt-1 text-sm text-muted-foreground">{getHeaderDescription()}</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>
              Langkah {step + 1} dari {totalSteps}
            </CardTitle>
            {formData.ticketType && (
              <Badge variant="secondary">
                {TICKET_TYPES.find((t) => t.value === formData.ticketType)?.label}
              </Badge>
            )}
          </div>
          <CardDescription className="sr-only">Formulir multi-langkah pembuatan laporan</CardDescription>
        </CardHeader>

        <CardContent className="py-6">{renderStep()}</CardContent>

        <CardFooter className="justify-between border-t p-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={step === 0 || submitting}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" /> Kembali
          </Button>
          <div className="flex gap-2">
            {step > 0 && !isLastStep && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                className="gap-1.5"
              >
                <Check className="size-4" /> Simpan Draft
              </Button>
            )}
            <Button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Mengirim...
                </>
              ) : isLastStep ? (
                'Kirim Laporan'
              ) : (
                <>
                  Lanjut <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
