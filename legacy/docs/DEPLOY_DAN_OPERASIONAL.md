# Panduan Deployment & Operasional - FieldOps IT

Dokumen ini memuat prosedur kompilasi produksi, penyebaran (*deployment*), konfigurasi variabel lingkungan (*environment variables*), serta prosedur pemeliharaan sistem **FieldOps IT**.

---

## 🏗️ 1. Prosedur Build & Deployment

### Prasyarat Runtime
- **Node.js**: `v26.x LTS` (Masa dukungan aktif hingga 2029, dengan kompatibilitas minimum `>=22.0.0`).
- **NPM**: `v10+`

### A. Kompilasi Produksi (Production Build)
Jalankan perintah berikut pada server CI/CD atau mesin build:
```bash
npm run build
```
Proses ini akan menjalankan bundler Vite untuk menghasilkan folder `dist/` yang berisi aset statis PWA dan *bundle* JavaScript terkompresi.

### B. Menjalankan Server Produksi
Aplikasi menggunakan Express.js (`server.ts`) untuk melayani file statis frontend serta endpoint proxy API:
```bash
npm start
```
Secara bawaan, server akan mendengarkan koneksi pada port `3000` (dapat disesuaikan via variabel `PORT`).

---

## 🔑 2. Variabel Lingkungan (Environment Variables)

Seluruh konfigurasi sensitif WAJIB disimpan dalam file `.env` pada lingkungan produksi. Dilarang keras melakukan commit file `.env` ke VCS/GitHub.

| Variable Name | Required | Description | Example / Format |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | Port server Express produksi | `3000` |
| `NODE_ENV` | Required | Mode lingkungan runtime | `production` |
| `VITE_FIREBASE_API_KEY` | Required | API Key Firebase Web Client | `AIzaSyB...` (Tersebunyi) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Required | Firebase Auth Domain | `fieldops-it.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Required | ID Proyek Google Firebase | `fieldops-it` |
| `VITE_FIREBASE_STORAGE_BUCKET`| Required | Storage Bucket Firebase | `fieldops-it.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| Required | Cloud Messaging Sender ID | `102938475612` |
| `VITE_FIREBASE_APP_ID` | Required | App ID Firebase Web Client | `1:102938475612:web:abc...` |
| `APP_SECRET_KEY` | Required | Kunci rahasia Otorisasi Proxy WA Gateway | `sk_live_fieldops_2026_x89` |
| `WA_GATEWAY_URL` | Required | Endpoint Provider WhatsApp API External | `https://api.whatsapp-provider.com/v1` |
| `WA_GATEWAY_TOKEN` | Required | Token Bearer Provider WhatsApp API | `wa_token_sec_993...` |

---

## 📱 3. Konfigurasi WhatsApp Proxy Gateway

Gateway Express (`server/whatsapp-gateway.js`) berfungsi menepis isu CORS dan melindungi `WA_GATEWAY_TOKEN` dari browser client:

1. **Endpoint Frontend**:
   `POST /api/whatsapp/send`
2. **Header Wajib**:
   - `Content-Type: application/json`
   - `X-App-Secret-Key: <APP_SECRET_KEY>`
3. **Mekanisme Kerja**:
   - Express menerima payload `{ phone, message }`.
   - Menguji validitas `X-App-Secret-Key`.
   - Meneruskan pesan ke `WA_GATEWAY_URL` menggunakan Bearer token server.

---

## 💾 3.1 Endpoint Backup & Pemulihan (Backup REST Endpoints)

Express 5 Backend (`server.ts` & `server/backupService.ts`) menyediakan endpoint terproteksi untuk operasi cadangan dan pemulihan:

1. **`GET /api/backup/list`**:
   - Mengambil daftar file backup JSON yang tersimpan di direktori `backups/` beserta ukuran dan jumlah item.
2. **`GET /api/backup/file/:filename`**:
   - Mengunduh spesifik file JSON backup dari penyimpanan server.
3. **`POST /api/backup/create`**:
   - Memicu penciptaan snapshot cadangan baru berisi seluruh koleksi Firestore.
4. **`POST /api/backup/upload`**:
   - Menerima unggahan file JSON cadangan baru untuk disimpan di server.
5. **`POST /api/security/verify-action`**:
   - Memverifikasi otorisasi sandi administrative server-side (`RESTORE_DATABASE` atau `CLEAR_DATABASE`).

---

## 💾 4. Prosedur Cadangan & Pemulihan Data (Backup & Restore)

### A. Pemulihan Data Massal via Antarmuka Web (Data Restore Modal)
1. Buka antarmuka katalog/pengaturan lalu pilih tombol **"Restorasi Data"** (khusus role Admin/Supervisor).
2. Pilih file cadangan dari server (direktori `/backups`), unggah file JSON eksternal, atau gunakan *Starter Kit Sample Snapshot*.
3. Masukkan sandi otorisasi administrative server (`SEC-02`).
4. Klik **"Mulai Restorasi Data"** untuk menjalankan *atomic batch writes* ke Firestore (`workspaces/{workspaceId}/**`) serta memperbarui state lokal.

### B. Firestore Automated Export (Cloud Console)
1. Ekspor otomatis harian melalui Google Cloud Console:
   ```bash
   gcloud firestore export gs://fieldops-backup-bucket --async
   ```
2. Pemulihan via Cloud SDK:
   ```bash
   gcloud firestore import gs://fieldops-backup-bucket/2026-11-02T00:00:00
   ```

### C. Pemulihan Cache Lokal (Reset Local Data)
Jika browser teknisi mengalami masalah penumpukan cache:
1. Klik tombol **"Reset Data"** pada footer sidebar.
2. Aplikasi akan mengosongkan `localStorage` dan mengunduh ulang master barang segar dari Firestore.

---

## 🚨 5. Troubleshooting & Penanganan Insiden

- **Galat 401 Unauthorized pada Proxy WhatsApp**:
  - Periksa nilai `APP_SECRET_KEY` pada `.env` server apakah sudah cocok dengan header request frontend.
- **Service Worker Stale Asset**:
  - Jika tampilan baru tidak muncul setelah deploy, jalankan perintah `Unregister Service Worker` di DevTools -> Application -> Service Workers.
