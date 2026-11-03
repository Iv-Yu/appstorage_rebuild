# FieldOps IT - Sistem Manajemen Inventaris & Operasional Teknisi Lapangan

![Version](https://img.shields.io/badge/version-v0.3.1-emerald.svg)
![React](https://img.shields.io/badge/React-19.3.0-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-5.0.0-000000?logo=express)
![Vite](https://img.shields.io/badge/Vite-8.3.0-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.3.3-38BDF8?logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-13.1.0-FFCA28?logo=firebase)
![Node](https://img.shields.io/badge/Node.js-26_LTS_(hingga_2029)-339933?logo=node.js)

FieldOps IT adalah aplikasi web progresif (PWA) modern untuk tata kelola inventaris suku cadang, pelacak stok real-time, manajemen checklist tas teknisi lapangan, dan laporan pergerakan barang mingguan. Dikembangkan khusus untuk tim operasional IT Support dan Teknisi Lapangan dengan dukungan offline-first, sinkronisasi otomatis, pengerasan keamanan tingkat tinggi, dan tema gelap/terang adaptif.

---

## 🌟 Fitur Utama (v0.3.1)

- **Katalog Inventaris & Mutasi Stok**:
  - Pengecekan stok cepat dengan indikator visual stok minimum (low stock alert).
  - Mutasi barang masuk (Stock In) dan barang keluar (Stock Out/Batch Out).
  - Pencatatan serial number (SN), lokasi rak gudang, dan barcode tracking.
- **Pengerasan Keamanan Berlapis (Security Hardened - SEC-01 s/d SEC-05)**:
  - **Firestore Rules Ketat**: Seluruh koleksi dokumen dilindungi otentikasi `isSignedIn()` (`request.auth != null`) tanpa akses publik terbuka.
  - **Server-Side RBAC Enforcement**: Aksi destruktif/sensitif divalidasi otoritas backend (`/api/security/verify-action`).
  - **Proxy WhatsApp Fail-Closed**: Wajib menggunakan header otorisasi `X-App-Secret-Key` atau `Bearer Token`.
  - **HTTP Security Headers**: Penerapan standar proteksi `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, dan `Referrer-Policy`.
  - **Kriptografi PBKDF2**: Hashing kata sandi akun lokal dengan 100.000 iterasi SHA-256 dan 16-byte random salt.
  - **Proteksi Injeksi Formula**: Sanitasi CWE-1236 pada seluruh keluaran file ekspor Excel, CSV, dan PDF.
- **Checklist Tas Lapangan Teknisi**:
  - Verifikasi kelengkapan peralatan dan material bawaan sebelum berangkat ke lokasi pelanggan.
  - Pengurangan stok otomatis saat item dikonsumsi dari checklist atau tiket lapangan.
- **Laporan & Analytics**:
  - Visualisasi tren pergerakan barang 30 hari (Recharts) dan ekspor data (Excel .xlsx, CSV, PDF).
- **Dukungan Offline-First (PWA)**:
  - Layanan antrean mutasi lokal dan sinkronisasi otomatis ke cloud saat jaringan pulih.

---

## 🏗️ Teknologi Utama (Latest LTS Support)

| Komponen | Teknologi / Library | Versi | Status Dukungan |
| :--- | :--- | :--- | :--- |
| **Runtime Environment** | Node.js | `26.x LTS` (kompatibel `>=22.x`) | Active Long-Term Support (LTS) resmi hingga 2029 |
| **Frontend Framework** | React | `19.3.0` | Modern Concurrent Mode & Server Actions Ready |
| **Build Tool & Bundler** | Vite | `8.3.0` | High-Performance ESM Bundler |
| **Bahasa Pemrograman** | TypeScript | `7.0.2` (@types/node `^26.6.6`) | Strict Type-Checking & High Safety |
| **Styling & Design System** | Tailwind CSS | `4.3.3` | Zero-Runtime CSS Engine & Dark Mode |
| **Icons & Animasi** | Lucide React + Motion | `0.546.0` / `12.23.24` | Modern SVG Vector & UI Transition |
| **Visualisasi Data** | Recharts | `3.10.1` | Responsive SVG Dashboard Charts |
| **Backend Proxy & Server** | Express | `5.0.0` (v5 Major Release) | Modern Promises & Route-Handling Engine |
| **Database & Auth** | Firebase Firestore & Auth | `13.1.0` | Enterprise Multi-Tab Offline Persistent Cache |
| **PWA Service Worker** | Vite Plugin PWA | `2.0.0` | Workbox Offline Caching Engine |

---

## 🚀 Panduan Memulai (Local Setup)

### Prasyarat
- Node.js (Direkomendasikan Node.js v26 LTS dengan dukungan hingga 2029, atau v22+ LTS)
- npm (v10+) atau bun (v1+)

### Langkah Instalasi

1. **Clone Repository**:
   ```bash
   git clone https://github.com/organization/fieldops-it.git
   cd fieldops-it
   ```

2. **Instal Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables**:
   Salin file `.env.example` menjadi `.env` dan lengkapi variabel yang diperlukan:
   ```bash
   cp .env.example .env
   ```

4. **Jalankan Mode Pengembangan (Development)**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

5. **Build untuk Produksi**:
   ```bash
   npm run build
   ```

6. **Jalankan Server Produksi**:
   ```bash
   npm start
   ```

---

## 📚 Dokumentasi Lengkap

Dokumentasi rinci terkait arsitektur, data, peran, dan pengoperasian sistem dapat diakses melalui direktori [`docs/`](./docs/):

- 📐 [**Arsitektur Sistem (`docs/ARSITEKTUR.md`)**](./docs/ARSITEKTUR.md) — Diagram sistem, struktur folder, alur data, dan manajemen state.
- 🗄️ [**Struktur Data (`docs/DATA.md`)**](./docs/DATA.md) — Skema Firestore, kunci `localStorage`, kalkulasi stok, dan aturan mutasi.
- 🔐 [**Peran & Hak Akses (`docs/PERAN_DAN_AKSES.md`)**](./docs/PERAN_DAN_AKSES.md) — Matriks RBAC, alur autentikasi PBKDF2, dan manajemen sesi.
- 📖 [**Panduan Pengguna (`docs/PANDUAN_PENGGUNA.md`)**](./docs/PANDUAN_PENGGUNA.md) — Manual operasional non-teknis untuk staf admin dan teknisi.
- 🚀 [**Deployment & Operasional (`docs/DEPLOY_DAN_OPERASIONAL.md`)**](./docs/DEPLOY_DAN_OPERASIONAL.md) — Panduan build, eksposur `.env`, backup data, dan penanganan insiden.
- 🎨 [**Sistem Tema & Desain (`docs/TEMA_DAN_DESAIN.md`)**](./docs/TEMA_DAN_DESAIN.md) — Tokom warna Tailwind, disiplin dark mode, dan responsivitas.
- 📜 [**Changelog (`docs/CHANGELOG.md`)**](./docs/CHANGELOG.md) — Riwayat perubahan versi dari v0.1.0 hingga v0.2.9.
- 🛡️ [**Laporan Audit Sistem (`AUDIT_REPORT.md`)**](./AUDIT_REPORT.md) — Laporan lengkap audit keamanan, performa, dan kualitas kode.

---

## 🛡️ Aturan Kontribusi & Pengkodian untuk AI/Developer

Sebelum melakukan perubahan kode pada repositori ini, pastikan untuk membaca [`AGENTS.md`](./AGENTS.md) untuk memahami standar pengkodian, aturan pengamanan PBKDF2, dan larangan mutasi skema tanpa otorisasi.

---

## 📄 Lisensi

Hak Cipta © 2026 FieldOps IT Team. Dilindungi oleh Undang-Undang.
