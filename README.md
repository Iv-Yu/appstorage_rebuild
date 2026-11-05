# FieldOps IT - Sistem Manajemen Inventaris & Operasional Teknisi Lapangan

![Version](https://img.shields.io/badge/version-v1.1.0-emerald.svg)
![React](https://img.shields.io/badge/React-19.3.0-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-5.0.0-000000?logo=express)
![MariaDB](https://img.shields.io/badge/MariaDB-11.4_LTS-003545?logo=mariadb)
![Docker](https://img.shields.io/badge/Docker-24.0+-2496ED?logo=docker)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.3.3-38BDF8?logo=tailwindcss)

FieldOps IT adalah aplikasi web manajemen inventaris suku cadang, pencatatan mutasi stok barang masuk/keluar, verifikasi checklist tas lapangan teknisi, dan laporan mingguan pergerakan barang. Dikembangkan secara mandiri (*on-premises single-office*) berbasis **React 19**, **Express 5**, **MariaDB 11.x**, dan **Docker Container** tanpa ketergantungan pada layanan cloud pihak ketiga.

---

## 🌟 Fitur Utama (v1.1.0)

- **Kotak Sampah & Pemulihan Inventori (Soft Delete Recycle Bin)**:
  - Perlindungan penghapusan data suku cadang secara aman (*Soft Delete*).
  - Barang yang dihapus dapat ditinjau dan dipulihkan kembali (*1-Click Restore*) kapan saja tanpa merusak nomor SKU, riwayat pergerakan stok, maupun audit trail transaksi.
  - Opsi *Permanent Hard Delete* dengan konfirmasi berlapis bagi Admin/Supervisor.
- **Autentikasi Produksi Bersih (Clean Production Authentication)**:
  - Penghapusan total tombol akun demo pada form login untuk menjamin keamanan akses kantor riil.
  - Mesin verifikasi kata sandi mendukung otentikasi internal yang fleksibel (kompatibel langsung dengan query SQL manual di MariaDB maupun hash PBKDF2 100k iterasi).
  - Skrip inisialisasi akun master: `npm run setup:admin`.
- **Arsitektur Terpisah (Decoupled Architecture)**:
  - Kode sumber terpisah secara bersih antara `frontend/` (React 19 SPA + Vite) dan `backend/` (Express 5 REST API + MariaDB 11).
- **Pengamanan Autentikasi Server-Authoritative**:
  - Pengelolaan sesi berbasis HTTP-only Cookie dan otorisasi per peran (*Role-Based Access Control* / RBAC) yang ditegakkan sepenuhnya di sisi server (`backend/src/middleware/authMiddleware.ts`).
- **Isolasi Data Terpisah (Separated Business vs Account Files)**:
  - Data akun pengguna (`01_auth_schema.sql`) dan data bisnis inventaris (`02_inventory_schema.sql`) tersimpan dalam skema terpisah.
  - Fitur backup otomatis memproduksi file snapshot JSON yang **100% bebas dari akun dan hash password pengguna** (*Zero Account Leakage*).
- **Notifikasi WhatsApp Gateway & Integrasi REST API Tiket**:
  - Integrasi provider WhatsApp Gateway (Fonnte) tersentralisasi di `backend/src/integrations/whatsapp/`.
  - Endpoint REST API `/api/tickets/consume` dengan enkripsi token Bearer untuk pengurangan stok otomatis dari aplikasi tiket lapangan.
- **Perlindungan Ekspor Data (CWE-1236)**:
  - Sanitasi otomatis `sanitizeFormulaInput()` pada file keluaran Excel, CSV, dan PDF untuk mencegah serangan formula injection.
- **Siap Deployment Docker & Cloudflare Tunnel**:
  - Dilengkapi `Dockerfile` multi-stage, `docker-compose.yml`, dan opsi jaringan Cloudflare Tunnel untuk akses jarak jauh HTTPS yang aman tanpa membuka port router kantor.

---

## 🏗️ Teknologi Utama

| Komponen | Teknologi | Versi | Catatan / Fungsi |
| :--- | :--- | :--- | :--- |
| **Database Engine** | MariaDB | `11.4 LTS` | Relational DB Server On-Premises (Penyimpanan Terisolasi) |
| **Frontend Framework** | React | `19.3.0` | Modern Component-Based SPA |
| **Backend Framework** | Express | `5.0.0` | Node.js REST API Server Engine |
| **Containerization** | Docker & Compose | `v24.0+` | Multi-Stage Production Build |
| **Build Tool & Bundler** | Vite | `8.3.0` | High-Performance ESM Frontend Bundler |
| **Bahasa Pemrograman** | TypeScript | `7.0.2` | Strict Type-Checking & High Safety |
| **Styling & UI** | Tailwind CSS | `4.3.3` | Zero-Runtime CSS Engine & Dark Mode |

---

## 🚀 Panduan Memulai (Quick Start)

### Mode Pengembangan (Development Mode)

1. **Salin Environment Variables**:
   ```bash
   cp .env.example .env
   ```
2. **Jalankan Aplikasi Mode Dev**:
   ```bash
   npm install
   npm run dev
   ```
   Aplikasi dapat diakses di `http://localhost:3000`.

### Mode Produksi dengan Docker (Recommended)

1. **Jalankan Container Docker**:
   ```bash
   docker compose up -d --build
   ```
2. **Buat Akun Master Admin / Dev Superadmin Pertama**:
   ```bash
   docker compose exec backend npm run setup:admin
   ```

---

## 📚 Dokumentasi Lengkap

Seluruh dokumen teknis dan operasional sistem tersedia di direktori [`docs/`](./docs/):

- 📐 [**Arsitektur Sistem (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md) — Diagram arsitektur terpisah, alur REST API, dan jaringan Docker.
- 🚀 [**Panduan Deployment (`docs/DEPLOY.md`)**](./docs/DEPLOY.md) — Langkah deployment Docker (Linux/Windows), setup Cloudflare Tunnel, backup, dan troubleshooting.
- 🗄️ [**Struktur & Kamus Data (`docs/DATA.md`)**](./docs/DATA.md) — Skema tabel MariaDB, relasi data, dan aturan mutasi stok.
- 🔐 [**Peran & Hak Akses (`docs/PERAN_DAN_AKSES.md`)**](./docs/PERAN_DAN_AKSES.md) — Matriks RBAC server-side untuk Superadmin, Supervisor, Admin, dan Teknisi.
- 📊 [**Matriks Progres Rebuild (`docs/PROGRESS.md`)**](./docs/PROGRESS.md) — Pelacak status penyelesaian fitur Tahap 0 hingga Tahap 5.
- 📜 [**Riwayat Versi (`CHANGELOG.md`)**](./CHANGELOG.md) — Catatan rilis proyek dari awal hingga versi `v1.0.0-rebuild`.
- 🛠️ [**Aturan Developer (`AGENTS.md`)**](./AGENTS.md) — Invarian keamanan mutlak dan panduan pengkodian.

---

## 📄 Lisensi

Hak Cipta © 2026 FieldOps IT Team. Dilindungi oleh Undang-Undang.
