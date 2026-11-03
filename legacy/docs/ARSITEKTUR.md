# Arsitektur Sistem - FieldOps IT

Dokumen ini menjelaskan arsitektur perangkat lunak, struktur direktori, alur data, manajemen state, dan mekanisme sinkronisasi offline-first pada aplikasi **FieldOps IT**.

---

## 📐 1. Diagram Arsitektur Tingkat Tinggi

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT (BROWSER / PWA)                           |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                              React 19 SPA                                 |   |
|   |                                                                           |   |
|   |   +-------------------+  +---------------------+  +-------------------+   |   |
|   |   |    AuthContext    |  |  InventoryContext   |  |   ThemeContext    |   |   |
|   |   |  (RBAC & Sesi)    |  |  (Stok & Mutasi)    |  | (Terang/Gelap)    |   |   |
|   |   +---------+---------+  +----------+----------+  +---------+---------+   |   |
|   |             |                       |                       |         |   |
|   |             v                       v                       v         |   |
|   |   +-------------------+  +---------------------+  +-------------------+   |   |
|   |   |   Views / Modals  |  | Offline Sync Queue  |  |  Tailwind CSS v4  |   |   |
|   |   | (Dashboard, Task) |  | (offlineSyncServ)   |  | (Design System)   |   |   |
|   |   +-------------------+  +----------+----------+  +-------------------+   |   |
|   +-------------------------------------|-------------------------------------+   |
|                                         |                                         |
|                                         v                                         |
|                              +---------------------+                              |
|                              |    localStorage     |                              |
|                              | (fieldops_inventory)|                              |
|                              +----------+----------+                              |
+-----------------------------------------|-----------------------------------------+
                                          |
                +-------------------------+-------------------------+
                | Online Sync                                       | API Request
                v                                                   v
+-------------------------------+                   +-------------------------------+
|     FIREBASE CLOUD SERVICE    |                   |     EXPRESS BACKEND PROXY     |
|                               |                   |    (server.ts & gateway.js)   |
|  +-------------------------+  |                   |                               |
|  |   Firebase Auth         |  |                   |  +-------------------------+  |
|  +-------------------------+  |                   |  | WhatsApp Proxy Endpoint |  |
|  |   Firestore Database    |  |                   |  | (/api/whatsapp/send)    |  |
|  |   (Collections)         |  |                   |  +-------------------------+  |
|  +-------------------------+  |                   +-------------------------------+
+-------------------------------+
```

---

## 📁 2. Struktur Direktori Proyek

```
fieldops-it/
├── .aistudio/                 # Konfigurasi internal AI Studio
├── docs/                      # Dokumentasi sistem lengkap
│   ├── ARSITEKTUR.md          # Arsitektur & alur data
│   ├── DATA.md                # Skema data & localStorage
│   ├── PERAN_DAN_AKSES.md     # Hak akses & autentikasi
│   ├── PANDUAN_PENGGUNA.md    # Manual operasional user
│   ├── DEPLOY_DAN_OPERASIONAL.md # Panduan build & deployment
│   ├── TEMA_DAN_DESAIN.md     # Sistem tema & token warna
│   └── CHANGELOG.md           # Riwayat perubahan versi
├── public/                    # Asset statis (logo, pwa icons, media)
│   └── assets/aistudio/       # Tangkapan layar & lampiran audit
├── server/                    # Gateway & Server Proxy
│   └── whatsapp-gateway.js    # Express Proxy untuk WhatsApp API
├── src/                       # Kode Sumber Utama Frontend
│   ├── components/            # Komponen UI Reusable
│   │   ├── modals/            # Modal dialog (StockIn, Export, Access)
│   │   ├── layout/            # Sidebar, Header, Mobile Nav
│   │   └── common/            # Badge, Button, Input, Cards
│   ├── context/               # React Context Providers
│   │   ├── AuthContext.tsx    # Manajemen Sesi & Role RBAC
│   │   ├── InventoryContext.tsx # Manajemen Stok, Mutasi & Offline Queue
│   │   └── ThemeContext.tsx   # Manajemen Dark/Light/System Mode
│   ├── services/              # Service Layer
│   │   ├── firebaseService.ts # SDK Firestore & Firebase Auth
│   │   └── offlineSyncService.ts # Antrean Mutasi Offline
│   ├── utils/                 # Utility & Helpers
│   │   ├── security.ts        # PBKDF2 Hashing & CWE-1236 Sanitizer
│   │   └── formatters.ts      # Format Tanggal, Mata Uang, Angka
│   ├── App.tsx                # Entri Komponen Utama SPA
│   ├── index.css              # Global CSS & Tailwind v4 `@import`
│   └── main.tsx               # Bootstrapper React 19
├── .env.example               # Template Variabel Lingkungan
├── AUDIT_REPORT.md            # Laporan Audit Keamanan & Performa
├── AGENTS.md                  # Invarian & Panduan Pengkodian
├── firebase-blueprint.json    # Skema Koleksi & Aturan Firebase
├── firestore.rules            # Security Rules Firestore
├── index.html                 # HTML Entry Point
├── package.json               # Dependensi Node.js & Script
├── server.ts                  # Entri Express Server Produksi
├── tsconfig.json              # Konfigurasi TypeScript
└── vite.config.ts             # Konfigurasi Bundler Vite & PWA
```

---

## ⚡ 3. Alur Data & Sinkronisasi Offline-First

Aplikasi FieldOps IT mengadopsi pola **Offline-First dengan Synchronous Optimistic UI Update**:

1. **Operasi Mutasi (Create/Update)**:
   - Pengguna melakukan tindakan (misal: *Stock Out* 2 unit Kabel UTP).
   - `InventoryContext` langsung memperbarui state React dan menyimpan hasilnya ke `localStorage` (`fieldops_inventory_v2`).
   - Tampilan UI langsung diperbarui tanpa menunggu jaringan (Zero Lag).

2. **Antrean Sinkronisasi (Offline Queue)**:
   - Jika perangkat terhubung dengan koneksi internet, operasi langsung dikirim ke Firestore melalui `firebaseService.ts`.
   - Jika perangkat offline, transaksi dimasukkan ke dalam antrean `offlineSyncService`.
   - Saat event `window.addEventListener('online')` terdeteksi, antrean diproses secara berurutan (*FIFO*) untuk dikirim ke Firestore.

---

## 🎨 4. Arsitektur Tema (Dark Mode System)

Manajemen tema ditangani secara terpusat oleh `ThemeContext` (`src/context/ThemeContext.tsx`):
- **Opsi Mode**: `light` (Terang), `dark` (Gelap), dan `system` (Mengikuti preferensi OS).
- **Mekanisme Selektor CSS**: Menyuntikkan atau mencabut kelas `.dark` pada elemen `<html>` (`document.documentElement`).
- **Persistensi**: Mode tersimpan di `localStorage` dengan kunci `fieldops_theme`.
- **Styling Engine**: Menggunakan Tailwind CSS v4 dengan pemetaan variabel warna slate, zinc, dan primary blue yang konsisten di seluruh komponen.

---

## 🔌 5. Integrasi Layanan Eksternal

### A. Firebase Firestore & Auth
- Digunakan untuk penyimpanan data jarak jauh (remote store) dan verifikasi pengguna terdaftar.
- Komunikasi menggunakan modul modular SDK `@firebase/firestore` dan `@firebase/auth`.

### B. Express WhatsApp Gateway (`server/whatsapp-gateway.js`)
- Berfungsi sebagai reverse proxy untuk menghindari kendala CORS dan melindungi kredensial/token WhatsApp API dari eksposur client-side.
- Menerima request dari frontend di `/api/whatsapp/send`, memvalidasi header otorisasi `X-App-Secret-Key`, dan meneruskannya ke provider API WhatsApp.
