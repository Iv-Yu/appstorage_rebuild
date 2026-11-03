# CHANGELOG.md - Riwayat Versi & Perubahan FieldOps IT

![Version](https://img.shields.io/badge/version-v0.3.1-emerald.svg)

Semua perubahan penting dan riwayat rilis proyek **FieldOps IT** dicatat secara kronologis dalam file ini.

---

## 🔄 [v0.3.1] - 2026-11-02 (Bulk Data Restore & Firestore Sync System)

### 📦 Restorasi Massal Data Firestore & Manajemen Cadangan (`DataRestoreModal.tsx`)
- **Fitur Pemulihan Data Massal (Bulk Restore)**: Mengimplementasikan antarmuka modal `DataRestoreModal.tsx` yang memungkinkan Admin/Supervisor memilih file cadangan JSON dari direktori `/backups` atau mengunggah file JSON eksternal untuk pemulihan massal ke Firestore.
- **Dukungan RESTORE_DATABASE via Otoritas Server (SEC-02)**: Mengintegrasikan verifikasi sandi administratif server-side (`POST /api/security/verify-action` dengan aksi `RESTORE_DATABASE`) sebelum pemulihan data diproses.
- **Operasi Atomic Firestore Batching**: Penulisan koleksi (`inventory_items`, `stock_transactions`, `technician_checklists`, `categories`, `weekly_reports`) menggunakan teknik *batched writes* berukuran maksimum 350 operasi per batch untuk performa maksimal dan stabilitas jaringan.
- **Snapshot Sample Starter Kit**: Menyediakan opsi pemulihan data instan dengan snapshot katalog standar (Item hardware, jaringan, CCTV, dan kategori bawaan).

### ⚙️ Middleware & Layanan Cadangan Backend (`server/backupService.ts`)
- **Automated Backup Engine**: Menambahkan layanan pencadangan harian Firestore di Express 5 backend yang membuat file JSON terstruktur dengan timestamp pada folder `backups/`.
- **Endpoint API Backup**: Menyediakan endpoint RESTful:
  - `GET /api/backup/list`: Mengembalikan daftar file cadangan beserta metadata jumlah dokumen.
  - `GET /api/backup/file/:filename`: Mengunduh file backup JSON spesifik.
  - `POST /api/backup/create`: Memicu pembuat cadangan data langsung dari antarmuka web.
  - `POST /api/backup/upload`: Mengunggah file cadangan JSON baru ke penyimpanan server.

### 🛡️ Skrip Audit Otoritas Firestore & Pengerasan Rules
- **Skrip Audit Otomatis (`scripts/audit-firestore-security.ts`)**: Skrip pengujian terisolasi yang memverifikasi seluruh koleksi Firestore terhadap aturan keamanan, mendeteksi potensi izin publik tak terotorisasi, dan menghasilkan ringkasan kepatuhan rules.
- **Aturan Firestore Diperbarui (`firestore.rules`)**: Memperbarui aturan akses Firestore untuk koleksi `trash` dan `checklists` di bawah `workspaces/{workspaceId}/**` agar selaras dengan aturan keamanan role terautentikasi (`isSignedIn()`).

### 🛡️ Remidiasi Menyeluruh Temuan Audit Keamanan (SEC-01 s/d SEC-05)
- **`[SEC-01]` Pengerasan Aturan Firestore**: Mengganti aturan terbuka publik `allow read, write: if true;` dengan aturan autentikasi wajib `isSignedIn()` (`request.auth != null`) serta validasi panjang `isValidId()` untuk seluruh koleksi `workspaces/{workspaceId}/**`.
- **`[SEC-02]` Enforce RBAC Otoritas Server-Side**: Menambahkan endpoint backend `POST /api/security/verify-action` untuk memverifikasi tindakan administratif destruktif dengan validasi kredensial server dan role supervisor/admin.
- **`[SEC-03]` Penutupan Celah Bypass WA Gateway**: Menghilangkan celah bypass otentikasi saat environment variable kosong secara *fail-closed*.
- **`[SEC-04]` Mitigasi Dependensi & Verifikasi Runtime**: Memverifikasi runtime isolasi paket dan memitigasi celah dependensi.
- **`[SEC-05]` Pemasangan HTTP Security Headers**: Menambahkan middleware HTTP security headers standar industri pada `server.ts`.
- **Pembaruan Runtime ke Node.js 26 LTS (Masa Dukungan hingga 2029)**: Mengonfigurasi dukungan runtime Node.js 26 LTS dengan dukungan aktif jangka panjang hingga 2029.

---

## 🚀 [v0.3.0] - 2026-10-30

### 🛡️ Implementasi Sistem Pelaporan Keamanan & Audit Interaktif
- **Komponen Dashboard Keamanan Baru (`SecurityReportModal.tsx`)**: Pembuatan modal visual interaktif yang merangkum hasil temuan dari `AUDIT_REPORT.md` untuk diakses khusus oleh Admin & Supervisor.
- **Kartu Temuan & Filter Kategori**: Penataan kartu temuan `SEC-01` s/d `SEC-05` dan kontrol positif dengan filter keparahan (*Critical, High, Medium, Positif*), tag lokasi file:line, deskripsi risiko, dan contoh solusi kode.
- **Pelacak Remidiasi & Task Progress**: Fitur *checklist* tugas perbaikan yang tersimpan secara otomatis di `localStorage` untuk memantau persentase penyelesaian remidiasi secara real-time.
- **Analisis Ukuran Bundle & Performa**: Tab analisis *chunk size* (1.67 MB) dengan rekomendasi optimasi *lazy loading* dan *code splitting*.
- **Integrasi Tombol Navigasi Admin**: Penambahan tombol "Audit System" di header utama dan menu dropdown aplikasi (`Navbar.tsx`).

### 🛡️ Penyelesaian Audit Keamanan & Performa System (`AUDIT_REPORT.md`)
- **Pelaksanaan Audit 5-Fase**: Penyelesaian audit menyeluruh mencakup Inventaris Teknologi (Fase 1), Audit Keamanan & Privasi (Fase 2), Performa & Efisiensi Resource (Fase 3), Kualitas Kode & Offline Sync (Fase 4), serta Peta Jalan Remidiasi (Fase 5).
- **Identifikasi Temuan Kritis**: Evaluasi aturan Firestore terbuka (`SEC-01`), client-side RBAC enforcement (`SEC-02`), bypass otorisasi WA gateway (`SEC-03`), kerentanan `npm audit` (`SEC-04`), dan HTTP security headers (`SEC-05`).
- **Pencatatan Kontrol Keamanan Positif**: Penegasan standar hashing PBKDF2 (100k SHA-256 iterations) dan sanitasi ekspor formula Excel/CSV (**CWE-1236**).

### 📄 Pembuatan Dokumentasi Teknis Komprehensif (`DOCUMENTATION.md`)
- **Penerbitan DOCUMENTATION.md**: Penyusunan file panduan teknis utama di root folder yang mencakup:
  - **Setup Lingkungan**: Tabel konfigurasi `.env`, prasyarat Node.js/Bun, serta perintah instalasi dan kompilasi produksi.
  - **Arsitektur Modul**: Diagram sistem ASCII, penjelasan `InventoryContext` (*Optimistic UI & Offline Queue*), `AuthContext` (*PBKDF2 & RBAC*), `ThemeContext`, dan Express WA Gateway Proxy.
  - **Panduan Fitur API**: Endpoint Express Proxy `/api/whatsapp/send`, header otorisasi `X-App-Secret-Key`, perintah cURL, serta contoh payload JSON lengkap untuk respons `200 OK`, `401 Unauthorized`, `400 Bad Request`, dan `500 Error`.
  - **Prosedur Pemeliharaan**: Prosedur backup/restore harian Firestore, kliring cache PWA/localStorage, dan tabel *troubleshooting*.

### ⚙️ Optimasi Bundler & PWA Cache
- **Peningkatan Batas Workbox Cache**: Pembaruan konfigurasi `maximumFileSizeToCacheInBytes` (5 MB) pada `vite.config.ts` untuk memastikan kelancaran kompilasi Service Worker PWA saat build.

---

## 📦 [v0.2.9] - 2026-10-30

### 🎨 Pembaruan Antarmuka & Tema (UI/UX Refinements)
- **Perbaikan Garis Pemisah Tema Gelap**: Menghapus garis pemisah putih tajam pada kelompok menu sidebar tema gelap dan menggantinya dengan border subtle `dark:border-slate-800/60`.
- **Tema Gelap Profil Pengguna**: Menyelaraskan komponen profil pengguna di header dengan tema gelap (`dark:bg-slate-800/80` & `dark:text-slate-200`), menghilangkan efek "pill putih" menyilaukan.
- **Optimasi Viewport Seluler**: Memperbaiki padding modal dan keterbacaan menu navigasi pada layar ponsel.

### 📖 Dokumentasi Suite
- Penerbitan suite dokumentasi awal pada direktori `docs/` (`ARSITEKTUR.md`, `DATA.md`, `PERAN_DAN_AKSES.md`, `PANDUAN_PENGGUNA.md`, `DEPLOY_DAN_OPERASIONAL.md`, `TEMA_DAN_DESAIN.md`, `CHANGELOG.md`).

---

## 📦 [v0.2.4] - 2026-10-25
- Penambahan mode tampilan Gelap / Terang / Sistem via `ThemeContext`.
- Integrasi PWA Service Worker untuk dukungan penggunaan offline.
- Peningkatan batas alert stok minimum pada katalog barang.

---

## 📦 [v0.1.0] - 2026-10-10
- Peluncuran versi perdana aplikasi FieldOps IT.
- Katalog Inventaris, Pencatatan Mutasi Barang Masuk/Keluar.
- Checklist Tas Lapangan Teknisi.
