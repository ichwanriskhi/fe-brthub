---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Surface brief — Landing page (app/page.tsx)

## Scope & mode
Persuade. Satu halaman publik untuk dua audiens berbeda: pelapor eksternal (gangguan armada/fasilitas/layanan) dan pegawai (login reviewer/internal).

## Audience, job, action, proof
- Pelapor: butuh jalur pelaporan cepat tanpa akun → CTA "Lapor Gangguan" (alur OTP). Bukti: klaim "tanpa perlu registrasi akun", verifikasi nomor HP.
- Pegawai: butuh pintu login internal → "Masuk Pegawai".
- Keduanya perlu memahami dalam sekali lihat: apa sistem ini, alurna (lapor → verifikasi → prioritas → unit → resolusi → selesai), dan kepercayaan (brand BRT resmi).

## Constraints
- Logo resmi `/logo/brt-logo.png`, merah BRT `#FE0100` sebagai aksen brand (bukan drench).
- Bahasa Indonesia baku, tone operasional-profesional (bukan hype marketing).
- Bersih, modern, minim icon, tidak terkesan "AI-generated".
- Komponen shadcn/ui standar; dark mode via next-themes.

## Direction (contract)
THESIS: Landing ini adalah "jalur pelaporan yang bisa ditemukan dalam 5 detik" — bukan brosur fitur. Default kategori (hero besar + 3 kartu icon + badge kicker) ditolak; sebagai gantinya halaman menuntun pengunjung lewat alur nyata sistem (lapor → ditinjau → dikerjakan → selesai) yang diperlihatkan sebagai konten, bukan dijanjikan.

OWN-WORLD: Ground putih/neutral shadcn, tipografi editorial bersih (Inter), satu aksen merah BRT untuk aksi utama dan tanda status; garis pemisah tipis `border-border` sebagai struktur utama menggantikan kartu-kartu ber-icon. Ikon hanya pada status alur (lucide, stroke konsisten, warna per-status sesuai palet sistem). 

STORY: Pengunjung tiba → langsung paham ini portal resmi BRT → memilih jalurnya (pelapor → CTA merah; pegawai → login) → melihat alur penanganan yang transparan → percaya sistemnya akuntabel.

FIRST VIEWPORT: Header ramping (logo + 2 tombol: ghost "Masuk Pegawai", primary "Lapor Gangguan"). Hero tanpa badge kicker: headline 2 baris berat, sub 1 kalimat, 2 CTA (primary "Buat Laporan" + ghost "Masuk Pegawai" untuk pegawai yang tersesat) — tidak ada hero image. Di bawahnya langsung bagian "Alur Penanganan" berupa daftar langkah bernomor real (bukan kartu icon): 01 Lapor & verifikasi OTP → 02 Tinjauan awal & prioritas → 03 Dikerjakan unit terkait → 04 Verifikasi akhir & selesai. Setiap langkah = judul + 1-2 kalimat, dipisah garis, nomor mono kecil.

FORM: directed build (redesign halaman landing dalam sistem established); roll key 2eef5f0e.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
