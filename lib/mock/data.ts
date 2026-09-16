import { Ticket, TicketActivity, TicketChatMessage } from '../types/ticket';

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'BRT-2026-0913-001',
    ticketType: 'COMPLAINT',
    category: 'Klaim Distribusi & Pengiriman',
    subcategory: 'Salah Kirim',
    categoryId: 'cat-distribusi',
    subcategoryId: 'cat-distribusi-salah-kirim',
    productId: 'prod-tb',
    priority: 'B',
    status: 'OPEN',
    handlerName: 'Budi S. (Distribution Handler)',
    handlerActionId: 'RETURN_AND_REPLACE',
    subject: 'Salah Kirim - SO 973603 (Juliani 78)',
    description: 'Ekspedisi LARIS CARGO (DFOD) Rp 0, Juliani78 Racing Jl Tirtosari Komplex XII, no 12 TTMandala by Pass, Kelurahan Bantan, Kec. Medan Tembung, Kota Medan, SUMUT 20224, +628****5789',
    soNumber: '973603',
    salesName: 'Wansis',
    productLine: 'Throttle Body',
    vehicleModel: 'Yamaha XMAX',
    claimedItems: [
      {
        id: 'item-1',
        deliveredItem: 'BRT-TB-XMAX-40 THROTTLE BODY XMAX SIZE 40 MM SINGLE INJECTOR',
        replacementItem: 'BRT-TB-XMAX-40 THROTTLE BODY XMAX SIZE 40 MM SINGLE INJECTOR',
        quantity: 1,
        issueDescription: 'Beli tb xmax 40 tapi yang isi dalam nya vario 32',
      }
    ],
    reporterName: 'Dimas Marketing',
    reporterPhone: '081234567890',
    reporterAddress: 'Jl. Raya Bogor KM 28, Jakarta Timur',
    isReportForCustomer: true,
    reporterType: 'EMPLOYEE',
    reporterEmployeeId: 'emp-8',
    reporterCustomerId: 'cust-1',
    customerData: {
      name: 'Juliani 78 (Juliani78 Racing)',
      phone: '+628****5789',
      address: 'Jl Tirtosari Komplex XII, no 12 TTMandala by Pass, Kelurahan Bantan, Kec. Medan Tembung, Kota Medan, Sumatera Utara, 20224',
    },
    attachments: [
      { id: 'att-1', name: 'barang-salah.jpg', size: '1.4 MB', type: 'image/jpeg', url: '#' },
      { id: 'att-2', name: 'barang-salah.mp4', size: '8.6 MB', type: 'video/mp4', url: '#' }
    ],
    createdAt: '2026-08-22T18:44:47Z',
    updatedAt: '2026-08-22T18:44:47Z'
  },
  {
    id: 'BRT-2026-0909-002',
    ticketType: 'COMPLAINT',
    category: 'Klaim Distribusi & Pengiriman',
    subcategory: 'Salah Order',
    categoryId: 'cat-distribusi',
    subcategoryId: 'cat-distribusi-salah-order',
    productId: 'prod-sc',
    priority: 'B',
    status: 'PENDING_REVIEW',
    subject: 'Salah Order - SO 995206 (EDDY)',
    description: 'Ekspedisi J&T, Rian klinik performance Kp. Anggalasan RT 01 RW 02 desa kertarahayu kec. Jatiwaras, Tasikmalaya, Jawa Barat, +628****8743',
    soNumber: '995206',
    salesName: 'BRT Plaza',
    productLine: 'Super Coil & Camshaft',
    vehicleModel: 'Yamaha Aerox',
    claimedItems: [
      {
        id: 'item-2-1',
        deliveredItem: 'BRT-GC02-SUPER-COIL-CARB-00R BRT SUPER KOIL GC-02 KARBURATOR',
        replacementItem: 'BRT-GC02-SUPER-COIL-CARB-00R BRT SUPER KOIL GC-02 KARBURATOR',
        quantity: 1,
        issueDescription: '3 SO 975183 BRTPLAZA OPEN 2026-09-09 15:35:14 BRT (9e6ab5b2-aba3-41d4-bdc9-62952f024321), EZ, 6282144777746',
      },
      {
        id: 'item-2-2',
        deliveredItem: 'AER-1917R1-M02-02 CAM YAMAHA AEROX NEW M02#02',
        replacementItem: 'AER-1917R1-M03-02 CAM YAMAHA AEROX NEW M03#02',
        quantity: 1,
      }
    ],
    reporterName: 'Dimas Marketing',
    reporterPhone: '081234567890',
    reporterAddress: 'Jl. Raya Bogor KM 28, Jakarta Timur',
    isReportForCustomer: true,
    reporterType: 'EMPLOYEE',
    reporterEmployeeId: 'emp-8',
    reporterCustomerId: 'cust-2',
    customerData: {
      name: 'EDDY (Klinik Performance)',
      phone: '+628****8743',
      address: 'Kp. Anggalasan RT 01 RW 02 desa kertarahayu kec. Jatiwaras, Tasikmalaya, Jawa Barat',
    },
    attachments: [],
    createdAt: '2026-09-09T18:28:19Z',
    updatedAt: '2026-09-13T11:00:00Z',
    handlerName: 'Budi S. (Distribution Handler)',
    handlerActionId: 'REPLACE_ONLY',
    handlerProgress: [
      {
        id: 'prog-1-1',
        timestamp: '10 Sep 2026, 09:15',
        note: 'Verifikasi SO 995206 dengan tim warehouse. Konfirmasi barang terkirim CAM M02#02, bukan M03#02 sesuai pesanan.',
      },
      {
        id: 'prog-1-2',
        timestamp: '12 Sep 2026, 14:30',
        note: 'Menghubungi customer EDDY untuk konfirmasi penggantian. Pengiriman pengganti CAM M03#02 dijadwalkan besok.',
        attachments: [
          { id: 'prog-att-1', name: 'konfirmasi-customer.jpg', size: '890 KB', type: 'image/jpeg', url: '#' },
        ],
      },
    ],
    resolutionSummary: 'Penggantian barang salah order dengan CAM YAMAHA AEROX NEW M03#02 sesuai pesanan customer.',
    resolutionDetail: 'Diverifikasi SO 995206 atas laporan customer EDDY. Barang CAM M02#02 yang terkirim akan dikembalikan (kirim balik) dan dikirim pengganti CAM M03#02 sesuai pesanan. Bukti penerimaan dan pengiriman pengganti dilampirkan.',
    resolutionAttachments: [
      { id: 'res-1', name: 'bukti-penerimaan.jpg', size: '1.2 MB', type: 'image/jpeg', url: '#' },
      { id: 'res-2', name: 'bukti-pengiriman.jpg', size: '1.8 MB', type: 'image/jpeg', url: '#' }
    ],
    resolutionCycles: [
      {
        id: 'cyc-1',
        cycleNumber: 1,
        timestamp: '10 Sep 2026, 11:10',
        summary: 'Barang yang diterima customer tidak sesuai dengan pesanan. Ditemukan CAM M02#02 pada kemasan CAM M03#02.',
        reviewerNote: 'Mohon tindak lanjuti penggantian barang sesuai pesanan dan lampirkan bukti penerimaan serta bukti pengiriman barang pengganti.',
      },
      {
        id: 'cyc-2',
        cycleNumber: 2,
        timestamp: '13 Sep 2026, 13:42',
        summary: 'Penggantian barang salah order dengan CAM YAMAHA AEROX NEW M03#02 sesuai pesanan customer.',
        detail: 'Barang yang tidak sesuai ditindaklanjuti untuk dikembalikan dan dilakukan pengiriman barang pengganti sesuai pesanan customer.',
        isCurrent: true,
      },
    ]
  },
  {
    id: 'BRT-2026-0913-003',
    ticketType: 'INCIDENT',
    category: 'IT Service',
    subcategory: 'Network / Wi-Fi',
    categoryId: 'cat-10',
    subcategoryId: 'cat-11',
    priority: 'C',
    status: 'IN_PROGRESS',
    subject: 'Koneksi Wi-Fi Gudang Utama terputus',
    description: 'Wi-Fi lantai 2 gudang mati sejak pagi, scanner RFID tidak bisa kirim data ke server.',
    reporterName: 'Agus Gudang',
    reporterPhone: '081299887766',
    reporterAddress: 'Gudang BRT Central, Bekasi',
    isReportForCustomer: false,
    reporterType: 'EMPLOYEE',
    reporterEmployeeId: 'emp-4',
    attachments: [],
    createdAt: '2026-09-13T08:15:00Z',
    updatedAt: '2026-09-13T10:00:00Z',
    handlerName: 'Rian IT Support',
  },
  {
    id: 'BRT-2026-0912-005',
    ticketType: 'REQUEST',
    category: 'Fasilitas Kantor',
    subcategory: 'Permintaan Barang',
    categoryId: 'cat-7',
    subcategoryId: 'cat-fasilitas-barang',
    priority: 'C',
    status: 'CLOSED',
    subject: 'Permintaan Tambahan Kursi Ergonomis Tim CS',
    description: 'Permintaan 3 unit kursi kerja baru untuk tim Customer Service lantai 1.',
    reporterName: 'Siti CS Supervisor',
    reporterPhone: '081311223344',
    reporterAddress: 'Head Office BRT, Lantai 1',
    isReportForCustomer: false,
    reporterType: 'EMPLOYEE',
    reporterEmployeeId: 'emp-3',
    attachments: [],
    createdAt: '2026-09-12T14:20:00Z',
    updatedAt: '2026-09-13T11:00:00Z',
    handlerName: 'Bambang General Affair',
    resolutionSummary: 'Pengadaan 3 kursi ergonomis sudah disetujui GA & siap diserahterimakan.',
    resolutionDetail: 'Barang telah dipesan ke vendor PT Indo Mebel, PO #GA-9912. Estimasi tiba tanggal 15 Sept.',
    resolutionCycles: [
      {
        id: 'cyc-1',
        cycleNumber: 1,
        timestamp: '12 Sep 2026, 15:40',
        summary: 'Pengadaan kursi masih menunggu persetujuan manajemen GA.',
        reviewerNote: 'Mohon sertakan PO vendor dan estimasi waktu kedatangan sebagai bukti.',
      },
      {
        id: 'cyc-2',
        cycleNumber: 2,
        timestamp: '13 Sep 2026, 11:00',
        summary: 'Pengadaan 3 kursi ergonomis sudah disetujui GA & siap diserahterimakan.',
        detail: 'Barang telah dipesan ke vendor PT Indo Mebel, PO #GA-9912. Estimasi tiba tanggal 15 Sept.',
        isCurrent: true,
      },
    ]
  },
  {
    id: 'BRT-2026-0911-008',
    ticketType: 'COMPLAINT',
    category: 'Garansi & Servis Kendaraan',
    subcategory: 'Masalah Berulang ECU',
    categoryId: 'cat-garansi',
    subcategoryId: 'cat-garansi-ecu',
    productId: 'prod-ecu',
    priority: 'B',
    status: 'CLOSED',
    subject: 'Motor Vario 150 Brebet Setelah Pemetaan ECU',
    description: 'Pelanggan melaporkan tarikan motor brebet pada RPM 4000 setelah pemasangan paket custom.',
    soNumber: 'SO-87110',
    salesName: 'Anita Sales',
    productLine: 'Bore Up Kit & ECU',
    vehicleModel: 'Honda Vario 150',
    reporterName: 'Dimas Marketing',
    reporterPhone: '081234567890',
    reporterAddress: 'Jl. Raya Bogor KM 28, Jakarta Timur',
    isReportForCustomer: true,
    reporterType: 'EMPLOYEE',
    reporterEmployeeId: 'emp-8',
    reporterCustomerId: 'cust-4',
    customerData: {
      name: 'Rifan Kusuma',
      phone: '085677889900',
      address: 'Jl. Margonda Raya No. 12, Depok'
    },
    attachments: [],
    createdAt: '2026-09-11T10:00:00Z',
    updatedAt: '2026-09-12T16:00:00Z',
    assignedUnit: 'Divisi Teknik & Tuning',
    handlerName: 'Eko Master Tuner'
  },
  {
    id: 'BRT-2026-0914-010',
    ticketType: 'COMPLAINT',
    category: 'Klaim Distribusi & Pengiriman',
    subcategory: 'Salah Kirim',
    categoryId: 'cat-distribusi',
    subcategoryId: 'cat-distribusi-salah-kirim',
    productId: 'prod-sc',
    priority: 'B',
    status: 'OPEN',
    subject: 'Barang salah kirim - SO 993521 (Toko Jaya Motor)',
    description: 'Customer menerima CAM M02#02 padahal pesanan CAM M03#02. Mohon dikirim barang pengganti sesuai pesanan.',
    soNumber: 'SO-993521',
    salesName: 'Wansis Sales',
    claimedItems: [
      {
        id: 'item-10-1',
        deliveredItem: 'AER-1917R1-M02-02 CAM YAMAHA AEROX NEW M02#02',
        replacementItem: 'AER-1917R1-M03-02 CAM YAMAHA AEROX NEW M03#02',
        quantity: 1,
        issueDescription: 'Customer pesan CAM M03#02, yang diterima CAM M02#02.',
      },
    ],
    attachments: [
      { id: 'att-10-1', name: 'foto-barang-diterima.jpg', size: '1.1 MB', type: 'image/jpeg', url: '#' },
      { id: 'att-10-2', name: 'bukti-pesanan-so-993521.pdf', size: '320 KB', type: 'application/pdf', url: '#' },
    ],
    reporterName: 'Dimas Marketing',
    reporterPhone: '081234567890',
    reporterAddress: 'Jl. Raya Bogor KM 28, Jakarta Timur',
    isReportForCustomer: true,
    reporterType: 'EMPLOYEE',
    reporterEmployeeId: 'emp-8',
    reporterCustomerId: 'cust-3',
    customerData: {
      name: 'Toko Jaya Motor',
      phone: '081233445566',
      address: 'Jl. Ahmad Yani No. 88, Semarang'
    },
    createdAt: '2026-09-14T08:30:00Z',
    updatedAt: '2026-09-14T08:30:00Z',
    assignedUnit: 'Distribution & Logistics',
    handlerActionId: 'RETURN_AND_REPLACE',
    handlerProgress: [
      {
        id: 'prog-10-1',
        timestamp: '14 Sep 2026, 10:20',
        note: 'Cek stok CAM M03#02 di gudang — tersedia 2 unit. Koordinasi ekspedisi untuk pengambilan barang salah.',
      },
    ],
  },
  {
    id: 'BRT-2026-0914-011',
    ticketType: 'INCIDENT',
    category: 'IT Service',
    subcategory: 'Jaringan & Internet',
    categoryId: 'cat-10',
    subcategoryId: 'cat-11',
    priority: 'C',
    status: 'OPEN',
    subject: 'Internet kantor depo terputus sejak pagi',
    description: 'Koneksi internet kantor depo utama terputus sejak pagi, mengganggu input SO dan cek stok.',
    soNumber: undefined,
    salesName: undefined,
    reporterName: 'Dimas Marketing',
    reporterPhone: '081234567890',
    reporterAddress: 'Jl. Raya Bogor KM 28, Jakarta Timur',
    isReportForCustomer: false,
    reporterType: 'EMPLOYEE',
    reporterEmployeeId: 'emp-4',
    attachments: [],
    createdAt: '2026-09-14T07:15:00Z',
    updatedAt: '2026-09-14T07:15:00Z',
    assignedUnit: 'IT Service'
  }
];

export const MOCK_ACTIVITIES: Record<string, TicketActivity[]> = {
  'BRT-2026-0913-001': [
    {
      id: 'act-1',
      ticketId: 'BRT-2026-0913-001',
      timestamp: '22 Aug 2026, 18:44',
      actor: 'Dimas Marketing',
      role: 'Pelapor',
      action: 'Laporan Dibuat',
      notes: 'Tiket berhasil dikirim ke sistem.'
    }
  ],
  'BRT-2026-0909-002': [
    {
      id: 'act-2',
      ticketId: 'BRT-2026-0909-002',
      timestamp: '09 Sep 2026, 18:28',
      actor: 'Dimas Marketing',
      role: 'Pelapor',
      action: 'Laporan Dibuat'
    },
    {
      id: 'act-3',
      ticketId: 'BRT-2026-0909-002',
      timestamp: '10 Sep 2026, 09:05',
      actor: 'Hendra Reviewer',
      role: 'Reviewer',
      action: 'Tinjauan Awal Disetujui',
      notes: 'Priority B diteruskan ke Distribution & Logistics.'
    },
    {
      id: 'act-4',
      ticketId: 'BRT-2026-0909-002',
      timestamp: '13 Sep 2026, 13:42',
      actor: 'Budi S.',
      role: 'Handler',
      action: 'Resolusi Diajukan',
      notes: 'Penggantian barang salah order sesuai pesanan.'
    }
  ]
};

export const MOCK_HANDLERS = [
  { id: 'dimas', name: 'Dimas P.', unit: 'Distribution & Logistics', activeCases: 5 },
  { id: 'budi', name: 'Budi S.', unit: 'Distribution & Logistics', activeCases: 3 },
  { id: 'rian', name: 'Rian IT Support', unit: 'IT Service', activeCases: 2 },
  { id: 'bambang', name: 'Bambang GA', unit: 'General Affair', activeCases: 1 },
  { id: 'eko', name: 'Eko Master Tuner', unit: 'Divisi Teknik & Tuning', activeCases: 4 },
];

export const MOCK_CHAT: Record<string, TicketChatMessage[]> = {
  'BRT-2026-0913-001': [
    {
      id: 'chat-1',
      ticketId: 'BRT-2026-0913-001',
      senderName: 'Dimas Marketing',
      senderRole: 'Pelapor',
      message: 'Halo Pak, mohon dibantu follow up untuk SO 973603 ya, customer Juliani 78 menanyakan barangnya.',
      timestamp: '09:35 AM'
    },
    {
      id: 'chat-2',
      ticketId: 'BRT-2026-0913-001',
      senderName: 'Hendra Reviewer',
      senderRole: 'Reviewer',
      message: 'Siap Pak, sedang kami tinjau di bagian logistik.',
      timestamp: '09:42 AM'
    }
  ]
};
