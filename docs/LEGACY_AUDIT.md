# LAPORAN AUDIT LENGKAP KODE LAMA & PERSIAPAN REBUILD (TAHAP 0)
**Aplikasi**: FieldOps IT Inventory (App-storage)  
**Dokumen**: `docs/LEGACY_AUDIT.md`  
**Fase**: Tahap 0 - Audit Menyeluruh (Tanpa Kode Baru)  
**Status**: Selesai & Terverifikasi Faktual Berdasarkan Kode `legacy/`

---

## 📌 Ringkasan Eksekutif & Tujuan Dokumen
Dokumen ini disusun sebagai pelaksanaan resmi **Tahap 0** rekonstruksi total sistem FieldOps IT Inventory. Audit dilakukan dengan membaca dan menganalisis secara mendalam kode sumber lama yang telah diamankan di direktori `legacy/` (bersifat *read-only*).

Sistem lama dirancang untuk manajemen inventaris IT, namun memiliki cacat arsitektur fatal:
1. Akun dan hash kata sandi disimpan di `localStorage` browser dan disertakan dalam payload ekspor backup.
2. Firebase hanya menggunakan autentikasi anonim dengan aturan `request.auth != null`, membuka akses baca/tulis penuh ke publik.
3. Rahasia otentikasi di-hardcode ke browser dan backend mempercayai klaim `role` langsung dari body request klien.
4. Monolit `InventoryContext.tsx` berukuran 1.639 baris menggabungkan 8 domain yang tidak kohesif.
5. Fonnte diimplementasikan dua kali dengan konfigurasi dan log yang hanya tersimpan di memori.
6. Dokumentasi tidak sinkron dengan implementasi kode riil.

---

## 1. Daftar Fitur & Pemetaan Lokasi Kode (Dipakai / Mati / Mock)

| Nama Fitur | Lokasi Kode Legacy | Status Penggunaan | Keterangan & Rencana Rebuild |
| :--- | :--- | :--- | :--- |
| **Katalog Master Barang** | `legacy/src/components/InventoryCatalog.tsx`, `legacy/src/components/catalog/*` | **DIPAKAI** | Fitur utama. Komponen UI dapat diadaptasi; state dipindahkan dari localStorage ke REST API backend. |
| **Tambah & Edit Barang** | `legacy/src/components/ItemFormModal.tsx` | **DIPAKAI** | Validasi input form SKU, barcode, stok minimum, dan lokasi rak. Diproteksi peran Admin/Supervisor. |
| **Detail Barang & Riwayat Item** | `legacy/src/components/ItemDetailModal.tsx` | **DIPAKAI** | Menampilkan spesifikasi, pergerakan stok, dan tombol aksi mutasi. |
| **Mutasi Stok (IN / OUT)** | `legacy/src/components/StockInOutModal.tsx` | **DIPAKAI** | Logika kalkulasi mutasi (`previousQty ± qty`) wajib dipindahkan ke backend dalam transaksi atomik database. |
| **Riwayat Transaksi Mutasi** | `legacy/src/components/TransactionHistory.tsx` | **DIPAKAI** | Tabel filter jenis mutasi, pencarian nomor referensi, dan tombol cetak bukti mutasi. |
| **Dashboard KPI & Tren** | `legacy/src/components/Dashboard.tsx`, `legacy/src/components/dashboard/*` | **DIPAKAI** | Visualisasi total stok, barang kritis, donat kategori, dan grafik pergerakan stok. |
| **Manajemen Kategori** | `legacy/src/components/CategoryManager.tsx` | **DIPAKAI** | CRUD kategori barang. Dipindahkan ke tabel database lokal backend. |
| **Laporan Mingguan (Weekly Report)** | `legacy/src/components/WeeklyReport.tsx` | **DIPAKAI** | Rekap mutasi masuk/keluar mingguan, barang pergerakan tertinggi, dan ekspor CSV/Excel tersanitasi. |
| **Cetak Surat Jalan / Bukti Mutasi** | `legacy/src/components/PrintDocumentModal.tsx` | **DIPAKAI** | Template cetak slip mutasi fisik dan surat serah terima barang teknisi. |
| **Checklist Tas Lapangan Teknisi** | `legacy/src/components/FieldTripChecklistModal.tsx` | **DIPAKAI** | Verifikasi alat & consumable sebelum teknisi berangkat ke lokasi insiden. |
| **Simulasi Integrasi Tiket (Jira/GLPI)** | `legacy/src/components/TicketIntegrationHub.tsx` | **HANYA MOCK / SIMULATOR** | Hanya simulasi UI; tidak ada endpoint backend HTTP riil untuk menerima webhook external. Wajib dibuatkan endpoint backend resmi `POST /api/tickets/consume` dengan API key auth. |
| **Manajemen Pengguna & Ganti Peran** | `legacy/src/components/UserRoleSwitcher.tsx` | **DIPAKAI (CACAT KEAMANAN)** | Di legacy, ganti role langsung di browser tanpa sesi server. Wajib diganti dengan manajemen akun server-side. |
| **Autentikasi Login** | `legacy/src/components/LoginScreen.tsx` | **DIPAKAI (CACAT KEAMANAN)** | Login memilih user dari dropdown dan verifikasi PBKDF2 di browser. Wajib diganti login form username/password via server session. |
| **Pemilih Workspace / Multi-Tenant** | `legacy/src/components/Navbar.tsx` (baris 156–175), `legacy/src/components/LoginScreen.tsx` (baris 178) | **MATI / WAJIB DIHAPUS** | Hanya memanipulasi prefix kunci localStorage. Sesuai aturan, konsep workspace dihapus total (1 kantor, 1 DB). |
| **Konfigurasi WhatsApp Alert** | `legacy/src/components/WhatsAppConfigModal.tsx` | **DIPAKAI (CACAT IMPLEMENTASI)** | Menyimpan token di memori dan memanggil endpoint yang tidak terproteksi. Wajib dikonsolidasi ke satu service backend. |
| **Restore Database Snapshot** | `legacy/src/components/DataRestoreModal.tsx` | **DIPAKAI (BERISIKO)** | Memulihkan data dan menimpa array `users` (termasuk hash). Wajib dipisahkan antara data bisnis dan data akun. |
| **Panduan Deployment GoLive** | `legacy/src/components/GoLiveModal.tsx` | **MATI / TIDAK RELEVAN** | Panduan teks statis untuk setup Firestore & Cloudflare. Dihapus karena beralih ke server lokal. |
| **QR Akses Jaringan Lokal (Mobile)** | `legacy/src/components/MobileAccessModal.tsx` | **DIPAKAI** | Menampilkan QR Code URL server lokal untuk akses teknisi via smartphone. |
| **Audit Laporan Keamanan di UI** | `legacy/src/components/SecurityReportModal.tsx` | **DIPAKAI (UTILITY)** | Modal visualisasi daftar remedi audit keamanan. |
| **Download Source Code ZIP** | `legacy/src/components/DownloadModal.tsx` | **MATI / TIDAK PERLU** | Men-generate ZIP project di browser client via JSZip. Tidak diperlukan untuk sistem operasional lokal. |

---

## 2. Inventaris Kunci localStorage, Koleksi Firestore, & Selisih Dokumentasi

### A. Seluruh Kunci `localStorage` yang Ditemukan di Kode Legacy
| Kunci localStorage | Lokasi Kode | Kategori Data | Status di Rebuild |
| :--- | :--- | :--- | :--- |
| `fieldops_auth_session` | `InventoryContext.tsx:196` | Sesi Login Client (`'true'`) | **Dihapus** (diganti HTTP-only session cookie) |
| `fieldops_inventory_current_user` | `InventoryContext.tsx:280` | ID Pengguna Aktif | **Dihapus** (dikelola oleh sesi backend) |
| `fieldops_workspaces` | `InventoryContext.tsx:205` | Daftar Workspace JSON | **Dihapus total** (aturan bebas multi-tenant) |
| `fieldops_current_workspace_id` | `InventoryContext.tsx:214` | ID Workspace Aktif | **Dihapus total** |
| `fieldops_inventory_users` | `InventoryContext.tsx:186` | Array User + Salt + Hash | **Dihapus total** (disimpan di tabel database server) |
| `fieldops_inventory_items` | `InventoryContext.tsx:183` | Master Barang (Fallback) | **Dihapus** (disimpan di database SQLite server) |
| `fieldops_inventory_categories` | `InventoryContext.tsx:184` | Master Kategori (Fallback) | **Dihapus** (disimpan di database SQLite server) |
| `fieldops_inventory_transactions` | `InventoryContext.tsx:185` | Log Transaksi Mutasi | **Dihapus** (disimpan di database SQLite server) |
| `fieldops_inventory_api_keys` | `InventoryContext.tsx:188` | Daftar API Key Integrasi | **Dihapus** (disimpan di database SQLite server) |
| `fieldops_inventory_logs` | `InventoryContext.tsx:189` | Log Integrasi Tiket | **Dihapus** (disimpan di database SQLite server) |
| `fieldops_${wsId}_items` | `InventoryContext.tsx:365` | Barang per Workspace | **Dihapus total** |
| `fieldops_${wsId}_trash_items` | `InventoryContext.tsx:235` | Soft Delete per Workspace | **Dihapus total** |
| `fieldops_${wsId}_categories` | `InventoryContext.tsx:373` | Kategori per Workspace | **Dihapus total** |
| `fieldops_${wsId}_transactions` | `InventoryContext.tsx:381` | Transaksi per Workspace | **Dihapus total** |
| `fieldops_${wsId}_api_keys` | `InventoryContext.tsx:405` | API Key per Workspace | **Dihapus total** |
| `fieldops_${wsId}_logs` | `InventoryContext.tsx:413` | Log Tiket per Workspace | **Dihapus total** |
| `fieldops_theme_mode` | `ThemeContext.tsx:23` | Preferensi Tampilan (`light`/`dark`) | **Dipertahankan di Frontend** (preferensi personal browser) |
| `fieldops_whatsapp_config` | `whatsappService.ts:46` | Salinan Konfigurasi WA | **Dihapus dari client** (konfigurasi diatur via backend) |
| `fieldops_offline_queue` | `offlineSyncService.ts:63` | Antrean Mutasi Offline | **Dihapus** (tidak ada sinkronisasi Firestore) |
| `fieldops_last_sync_time` | `offlineSyncService.ts:65` | Timestamp Sinkronisasi | **Dihapus** |
| `fieldops_checklist_history_v1` | `FieldTripChecklistModal.tsx:114` | Riwayat Checklist Lapangan | **Dipindahkan ke database backend** |
| `fieldops_audit_remediation_progress` | `SecurityReportModal.tsx:139` | Checklist Remedi UI | **Dihapus** |

### B. Koleksi Firestore Nyata di Kode
Penyimpanan Firestore lama diakses melalui path berjenjang:
- `/workspaces/{workspaceId}/items/{itemId}`
- `/workspaces/{workspaceId}/transactions/{transactionId}`
- `/workspaces/{workspaceId}/categories/{categoryId}`
- `/workspaces/{workspaceId}/trash/{trashId}`
- `/workspaces/{workspaceId}/checklists/{checklistId}`
- `/workspaces/{workspaceId}/sync_queue/{queueId}`
- `/workspaces/{workspaceId}/inspections/{inspectionId}`

### C. Selisih Antara Implementasi Nyata vs Dokumen Lama (`DATA.md` & `ARSITEKTUR.md`)
1. **Hierarki Koleksi**: `DATA.md` mendokumentasikan koleksi root (`inventory_items`, `stock_transactions`, `technician_checklists`), padahal implementasi nyata membungkus seluruh dokumen di dalam subkoleksi `workspaces/{workspaceId}/*`.
2. **Penamaan Atribut (Field Mismatch)**:
   - Ambang batas stok: `DATA.md` menulis `minQuantity`, kode nyata memakai `minStockAlert`.
   - Pembuat mutasi: `DATA.md` menulis `createdBy`, kode nyata memakai `performedBy`.
   - Penerima/sumber: `DATA.md` menulis `recipientOrSource`, kode nyata memakai `recipientOrDestination`.
   - Nomor tiket: `DATA.md` menulis `ticketId`, kode nyata memakai `referenceNumber`.
3. **Koleksi Tidak Terdokumentasi**: Subkoleksi `trash`, `sync_queue`, dan `inspections` ada di `firestore.rules`, tetapi tidak pernah ditulis di `docs/DATA.md`.
4. **Modul Palsu di Arsitektur**: `docs/ARSITEKTUR.md` dan `AGENTS.md` menyebutkan adanya `src/context/AuthContext.tsx` dan `src/services/firebaseService.ts`, padahal kedua file tersebut tidak ada di repositori.

---

## 3. Audit Workspace & Keberadaan Data Riil

### A. Daftar Workspace yang Ditemukan di Kode Legacy
Ditemukan di `legacy/src/context/InventoryContext.tsx` (baris 47–67):
1. **`default`**:
   - Nama: *Kantor Pusat (Main Cloud SQL)*
   - Perusahaan: *FieldOps Corp Utama*
   - Status: Workspace default bawaan aplikasi.
   - **Isi Data Bawaan**:
     - **Barang (`items`)**: 12 item (`item-01` s/d `item-12` dari `mockData.ts`).
     - **Transaksi (`transactions`)**: 16 transaksi mutasi awal (`tx-01` s/d `tx-16`).
     - **Kategori (`categories`)**: 6 kategori master (`cat-cables`, `cat-network`, `cat-hardware`, `cat-cctv`, `cat-tools`, `cat-peripheral`).
2. **`cabang_bandung`**:
   - Nama: *Gudang Cabang Bandung*
   - Perusahaan: *PT FieldOps Regional West Java*
   - Status: Workspace tiruan/contoh.
   - **Isi Data**: **0 barang, 0 transaksi, 0 kategori** (hanya ada di deklarasi array `DEFAULT_WORKSPACES`).
3. **`cabang_surabaya`**:
   - Nama: *Gudang Cabang Surabaya*
   - Perusahaan: *PT FieldOps Regional East Java*
   - Status: Workspace tiruan/contoh.
   - **Isi Data**: **0 barang, 0 transaksi, 0 kategori**.

### B. Analisis File Backup Riil di Folder `/backups`
Pemeriksaan terhadap file snapshot di `/backups/firestore-backup-2026-11-03T04-02-17-804Z.json` membuktikan:
- `inventory_items`: 12 item (seluruhnya berasal dari workspace `'default'`).
- `stock_transactions`: 16 transaksi (seluruhnya milik workspace `'default'`).
- `categories`: 6 kategori.
- `trash_items`, `users`, `workspaces`, `api_keys`, `integration_logs`, `technician_checklists`: Berisi array kosong `[]`.
- **Kesimpulan Faktual**: **Tidak ada data bisnis di workspace selain `'default'`.** Sumber data tunggal untuk migrasi di Tahap 5 adalah data master kantor tunggal (`default`).

### C. Komponen & File Terkait Workspace yang Akan Dihapus Total
1. `legacy/src/types/inventory.ts`: Tipe antarmuka `DatabaseWorkspace`.
2. `legacy/src/components/Navbar.tsx`: Dropdown `<select>` pemilih database workspace aktif (baris 156–175).
3. `legacy/src/components/LoginScreen.tsx`: Dropdown pemilih workspace login (baris 178).
4. `legacy/src/components/DataRestoreModal.tsx`: Dropdown pemilihan `targetWorkspaceId` saat restore.
5. `legacy/src/context/InventoryContext.tsx`: State `workspaces`, `currentWorkspaceId`, fungsi `switchWorkspace()`, `addWorkspace()`, helper `getWorkspaceKey()`, dan efek `localStorage` per-workspace.
6. `legacy/src/services/offlineSyncService.ts`: Parameter `workspaceId` pada metode `enqueue()`.

---

## 4. Titik Pencampuran Akun dengan Data & Logika Kata Sandi

### A. Titik Kritis Pencampuran Data
1. **Penyimpanan Lokal**:
   - File: `legacy/src/context/InventoryContext.tsx` baris 186 & 389.
   - Variabel: `STORAGE_KEYS.USERS = 'fieldops_inventory_users'`.
   - Tindakan: `localStorage.setItem('fieldops_inventory_users', JSON.stringify(users))` menyimpan data akun lengkap bersebelahan dengan barang di domain browser yang sama.
2. **Payload Cadangan / Ekspor**:
   - File: `legacy/src/context/InventoryContext.tsx` baris 1540 & 1577, serta `legacy/server.ts` baris 467.
   - Seluruh objek user (termasuk `salt` dan `passwordHash`) diikutsertakan ke dalam JSON snapshot cadangan.

### B. Cara Penyimpanan & Verifikasi Kata Sandi
- **Algoritma**: PBKDF2 (SHA-256) dengan 100.000 iterasi dan salt acak 16 byte (`src/utils/security.ts`).
- **Cacat Arsitektur**:
  - Hashing dan verifikasi dilakukan di **browser klien** (`login()` di `InventoryContext.tsx` baris 488).
  - Browser membaca salt dan hash langsung dari state/localStorage, menjalankan `hashPasswordWithSalt(passwordAttempt, target.salt)`, dan membandingkannya di JavaScript runtime klien.
  - Sesi login hanya berupa flag string: `localStorage.setItem('fieldops_auth_session', 'true')` dan `localStorage.setItem('fieldops_inventory_current_user', userId)`. Siapa pun dapat memanipulasi kedua nilai ini di DevTools Console untuk menjadi user mana pun tanpa password.

### C. Daftar Akun Bawaan (`INITIAL_USERS`) & Kredensial Awal
Ditemukan di `legacy/src/data/mockData.ts` (baris 517–584):

| User ID | Nama Pengguna | Role | Departemen | Salt | Default Password (di Kode UI) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `usr-master-01` | Hendra Wijaya | `supervisor` (Master Admin) | Direksi & Master Governance IT | `salt_master_001` | `FieldOpsMaster2026!` / `FieldOps2026!` | `ACTIVE` |
| `tech-01` | Budi Santoso | `technician` | Field Operations & Support | `salt_tech_001` | `FieldOps2026!` | `ACTIVE` |
| `adm-01` | Siti Rahma | `admin` | IT Asset & Warehouse | `salt_adm_001` | `FieldOps2026!` | `ACTIVE` |
| `spv-01` | Hendra Wijaya, S.Kom | `supervisor` | Infrastructure & Field Ops | `salt_spv_001` | `FieldOps2026!` | `ACTIVE` |
| `usr-pending-01`| Rizky Ramadhan | `technician` | Cabang Bandung | `salt_pending_001`| `FieldOps2026!` | `PENDING_APPROVAL`|

*Catatan untuk Rebuild*: Seluruh kredensial default dan hash statis ini tidak boleh dipakai di produksi. Akun admin pertama wajib dibuat melalui skrip inisialisasi setup backend (`npm run setup:admin`).

---

## 5. Pemetaan Endpoint Backend, Akses, & Titik Bocor Rahasia

### A. Daftar Seluruh Endpoint Backend Legacy (`server.ts`)
| Endpoint | Method | Siapa yang Boleh Memanggil (Otorisasi) | Titik Kerentanan & Rahasia |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Publik | Tidak ada secret; mengekspos versi runtime. |
| `/api/backup/list` | `GET` | **Publik / Siapa Saja** | Tidak ada middleware auth. Siapa pun dapat melihat daftar file cadangan. |
| `/api/backup/file/:filename` | `GET` | **Publik / Siapa Saja** | Tidak ada auth. Siapa pun dapat mengunduh isi database lengkap. |
| `/api/backup/create` | `POST` | **Publik / Siapa Saja** | Siapa pun dapat memicu pembuatan file backup di server. |
| `/api/backup/upload` | `POST` | **Publik / Siapa Saja** | Tidak ada auth. Siapa pun dapat mengunggah file JSON ke storage server. |
| `/api/backup/status` | `GET` | **Publik / Siapa Saja** | Tanpa proteksi. |
| `/api/backup/trigger` | `POST` | **Publik / Siapa Saja** | Tanpa proteksi. |
| `/api/backup/download` | `GET` | **Publik / Siapa Saja** | Tanpa proteksi. Mengunduh data snapshot termasuk koleksi user. |
| `/api/security/firestore-audit`| `GET` | **Publik / Siapa Saja** | Tanpa proteksi. |
| `/api/security/verify-action` | `POST` | Klien dengan Secret Header | **Kritis**: Menerima rahasia `'fieldops-internal-proxy-v1'`. Mempercayai `req.body.role` yang dikirim klien untuk mengizinkan reset/restore. |
| `/api/whatsapp/config` | `GET` | Klien dengan Secret Header | Menggunakan `'fieldops-internal-proxy-v1'`. |
| `/api/whatsapp/config` | `POST` | Klien dengan Secret Header | Menggunakan `'fieldops-internal-proxy-v1'`. Mengubah setting WA gateway. |
| `/api/whatsapp/send` | `POST` | Klien dengan Secret Header | Menggunakan `'fieldops-internal-proxy-v1'`. Proxy pengiriman pesan WhatsApp. |
| `/api/whatsapp/test` | `POST` | Klien dengan Secret Header | Menggunakan `'fieldops-internal-proxy-v1'`. |
| `/api/whatsapp/logs` | `GET` | Klien dengan Secret Header | Menggunakan `'fieldops-internal-proxy-v1'`. |

### B. Titik Muncul Rahasia (Hardcoded Secrets Leakage)
1. `'fieldops-internal-proxy-v1'`:
   - Ditemukan di `legacy/server.ts` (baris 13) sebagai `DEFAULT_INTERNAL_SECRET`.
   - Ditemukan di `legacy/server/whatsapp-gateway.js` (baris 29) sebagai `defaultInternalSecret`.
   - Ditemukan di `legacy/src/services/whatsappService.ts` (baris 25) sebagai `INTERNAL_SECRET`. Terkirim langsung ke browser pengguna dalam bundle JavaScript produksi.
   - Pengecekan pada server menggunakan logika OR permisif:
     ```typescript
     if (!providedSecret || (providedSecret !== REQUIRED_SECRET && providedSecret !== DEFAULT_INTERNAL_SECRET))
     ```
     Menyebabkan rahasia default ini **selalu valid** meskipun administrator telah mengisi `APP_SECRET_KEY` kuat di file `.env`.
2. Mock API Key Publik di Bundle Frontend:
   - `legacy/src/data/mockData.ts` baris 590: `'fops_demo_key_9a87d62e1c3b4a5f6e7d8c9b0a1'`
   - `legacy/src/data/mockData.ts` baris 600: `'fops_demo_key_1b2c3d4e5f6a7b8c9d0e1f2a3b4'`
3. Kredensial Firebase Proyek:
   - File `legacy/firebase-applet-config.json` memuat `apiKey`, `appId`, dan `projectId`.

---

## 6. Penggunaan Firebase & Padanannya di Arsitektur Baru

| Komponen Firebase Legacy | Lokasi Kode Legacy | Masalah di Kode Lama | Padanan di Arsitektur Rebuild |
| :--- | :--- | :--- | :--- |
| **Firebase Auth** | `legacy/src/lib/firebase.ts:16,84` | Hanya memanggil `signInAnonymously()`. Tidak memverifikasi identitas pengguna nyata. | **Express Session + HTTP-only Cookie**. Hash diverifikasi di backend via tabel SQLite `users`. |
| **Firestore Database** | `legacy/src/lib/firebase.ts:28`, `offlineSyncService.ts:14` | Bergantung pada Google Cloud Firestore. Kuota baca/tulis terbatas dan memerlukan koneksi internet. | **SQLite Lokal Terkelola** (`data/fieldops.db` via `node:sqlite`). Nol dependensi cloud, berjalan 100% di server kantor. |
| **Firestore Security Rules** | `legacy/firestore.rules` | Hanya mengecek `request.auth != null`. Siapa pun dengan token anonim memiliki izin penuh. | **Server-side Middleware Otorisasi** (`requireAuth`, `requireRole(['admin', 'supervisor'])`). |
| **Firestore Batch Restore** | `legacy/src/services/firestoreRestoreService.ts` | Menggunakan `writeBatch` Firestore untuk memulihkan dokumen. | **SQLite Database Transaction** (`BEGIN TRANSACTION ... COMMIT`). |
| **Offline Sync Queue** | `legacy/src/services/offlineSyncService.ts` | Antrean mutasi offline di `localStorage` yang di-push ke Firestore saat online. | **Dihapus**. Karena server berjalan di jaringan lokal kantor, klien selalu mengakses server lokal secara langsung. Caching browser ditangani oleh PWA Service Worker. |

---

## 7. Alur WhatsApp Gateway (Kedua Implementasi) & Seluruh Pemicu

### A. Analisis Kedua Implementasi
1. **Implementasi 1: `legacy/server.ts`**
   - Mendefinisikan endpoint langsung di file server utama (`/api/whatsapp/config`, `/api/whatsapp/send`, `/api/whatsapp/test`, `/api/whatsapp/logs`).
   - Menyimpan konfigurasi di variabel `let waConfig` dan log di array `const waLogs`.
   - Menggunakan fetch ke API Fonnte/Wablas secara inline.
2. **Implementasi 2: `legacy/server/whatsapp-gateway.js`**
   - Berupa Express Router terpisah yang dapat dijalankan sebagai standalone service (`node server/whatsapp-gateway.js`) pada port 3001.
   - Menduplikasi seluruh logika: middleware auth, parsing payload, mapping gateway, dan in-memory log.
   - Menyebabkan inkonsistensi: jika konfigurasi diubah di `server.ts`, `whatsapp-gateway.js` tidak terpengaruh, begitu pula sebaliknya.

### B. Seluruh Pemicu Notifikasi WhatsApp di Kode Legacy
Notifikasi dikirim melalui `whatsappService.sendStockAlertNotification()` pada kondisi:
1. **Pemicu 1 - Stock Out Satuan**:
   - File: `legacy/src/context/InventoryContext.tsx` baris 994–1002.
   - Kondisi: Saat `recordStockOut` dieksekusi dan stok baru barang `<= item.minStockAlert`.
2. **Pemicu 2 - Batch Stock Out (Pengambilan Banyak Barang Sekaligus)**:
   - File: `legacy/src/context/InventoryContext.tsx` baris 1089–1099.
   - Kondisi: Saat `recordBatchStockOut` dieksekusi dan satu atau lebih barang yang diambil memiliki sisa stok `<= minStockAlert`.
3. **Pemicu 3 - Auto-Deduct Tiket Eksternal Lapangan**:
   - File: `legacy/src/context/InventoryContext.tsx` baris 1256–1268.
   - Kondisi: Saat `consumeStockFromTicket` berhasil memotong stok dan sisa barang mencapai `<= minStockAlert`.
4. **Pemicu 4 - Pengujian Manual Gateway (Manual Test Connection)**:
   - File: `legacy/src/components/WhatsAppConfigModal.tsx` baris 108.
   - Kondisi: Admin menekan tombol *"Kirim Pesan Uji Coba"* via `POST /api/whatsapp/test`.

---

## 8. Identifikasi Bagian Tidak Jelas & Berisiko (Risk Registry)

| ID Risiko | Area Risiko | Deskripsi Risiko & Ketidakjelasan | Mitigasi yang Diusulkan di Tahap 1 |
| :--- | :--- | :--- | :--- |
| **`[RISK-01]`** | Ketersediaan Data Riil Pengguna | File backup di repositori (`backups/`) hanya memuat 12 item dan 16 transaksi bawaan `mockData.ts`. Belum diketahui apakah pengguna memiliki file ekspor riil tersendiri yang akan diberikan. | Konfirmasi ke pengguna di Tahap 1: apakah akan mengimpor data ekspor eksternal atau memakai baseline 12 item kantor pusat saat ini. |
| **`[RISK-02]`** | Akses Jarak Jauh Atasan ke Server Kantor | Atasan perlu mengakses webapp dari luar kantor. Jika kantor menggunakan IP dinamis atau berada di belakang CGNAT ISP tanpa IP publik statis, port-forwarding standar akan gagal. | Sajikan perbandingan teknis: **Opsi A (Cloudflare Tunnel)** vs **Opsi B (VPN WireGuard/Tailscale)** di Tahap 1 untuk dipilih pengguna. |
| **`[RISK-03]`** | Mode Offline PWA vs Arsitektur Server Lokal | Di versi lama, `offlineSyncService` mencoba mensinkronkan mutasi offline ke Firestore. Untuk server lokal tanpa Firestore, mutasi offline tanpa koneksi ke server lokal dapat memicu stok negatif atau konflik nomor transaksi. | Evaluasi di Tahap 1: Apakah teknisi lapangan membutuhkan offline write (dengan antrean sinkronisasi lokal saat kembali ke jangkauan Wi-Fi kantor) atau cukup online-first ke IP lokal/tunnel. |
| **`[RISK-04]`** | Kredensial Akun Lama | Password hash di `INITIAL_USERS` telah terekspos di repositori publik GitHub. | Seluruh akun lama di database baru harus direset kata sandinya dan diinisialisasi melalui skrip setup admin pertama yang aman. |
| **`[RISK-05]`** | Format Nomor WhatsApp | Fallback nomor tujuan di-hardcode dengan format `'081290008888'`, sedangkan API Fonnte sering kali memerlukan format internasional tanpa tanda plus/strip (`6281290008888`). | Normalisasi nomor telepon otomatis di backend (`formatIndonesianPhoneNumber`) sebelum dikirim ke API Fonnte. |

---

## 9. Matriks Kode yang Dapat Dipakai Ulang (Legacy Reuse Matrix)

Sesuai aturan ketat proyek, kode lama **HANYA** boleh dipakai ulang jika tercatat di tabel ini dan memiliki pengujian unit (unit test):

| Modul / Fungsi Legacy | Asal File | Status | Persyaratan & Catatan Pengujian |
| :--- | :--- | :--- | :--- |
| `sanitizeFormulaInput()` | `legacy/src/utils/security.ts` | **Boleh Dipakai Ulang** | Mencegah CSV/Formula Injection (CWE-1236) pada ekspor data. Wajib diuji dengan test suite mencakup karakter `=`, `+`, `-`, `@`, `\t`, `\r`. |
| Algoritma PBKDF2 (SHA-256 100k iterasi + 16B salt) | `legacy/src/utils/security.ts` | **Boleh Dipakai Ulang di Backend** | Dipindahkan ke `backend/src/services/authService.ts`. Dilarang dijalankan di frontend. Wajib memiliki unit test verifikasi hash. |
| Design Tokens & Dark Mode Theme | `legacy/docs/TEMA_DAN_DESAIN.md`, `legacy/src/index.css` | **Boleh Dipakai Ulang di Frontend** | Menjaga konsistensi tema `slate-900`/`slate-800`, zero-pill discipline, tanpa border putih di dark mode. |
| Komponen Presentasional UI | `legacy/src/components/catalog/*`, `legacy/src/components/dashboard/*` | **Boleh Diadaptasi** | Tampilan kartu barang, grafik tren, dan layout ringkasan diadaptasi untuk menerima data dari REST API backend baru. |
| Template Desain Cetak Dokumen | `legacy/src/components/PrintDocumentModal.tsx` | **Boleh Diadaptasi** | Logika rendering cetak surat jalan / slip mutasi fisik. |
| Firebase SDK, Rules, Blueprint | Seluruh file Firebase | **DILARANG KERAS** | Dihapus total dari repositori. |
| Kunci & Konsep Workspace Multi-tenant | Seluruh file | **DILARANG KERAS** | Dihapus total. |
| Penyimpanan Kredensial di localStorage | `InventoryContext.tsx` | **DILARANG KERAS** | Dihapus total. |
| Hardcoded Fallback Secret | `server.ts`, `whatsappService.ts` | **DILARANG KERAS** | Dihapus total. |

---
*Laporan Tahap 0 ini selesai dibuat dan siap diajukan untuk persetujuan pengguna sebelum melangkah ke Tahap 1.*
