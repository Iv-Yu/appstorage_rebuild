# DOCUMENTATION.md - Dokumentasi Teknis & Panduan Operasional FieldOps IT

![System Version](https://img.shields.io/badge/System_Version-v0.3.1-emerald.svg)
![React](https://img.shields.io/badge/React-19.3.0-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-5.0.0-000000?logo=express)
![Vite](https://img.shields.io/badge/Vite-8.3.0-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.3.3-38BDF8?logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-13.1.0-FFCA28?logo=firebase)
![Node](https://img.shields.io/badge/Node.js-26_LTS_(hingga_2029)-339933?logo=node.js)

Dokumen ini memuat panduan lengkap setup lingkungan, penjelasan arsitektur modul, penggunaan API Express Proxy, pengerasan keamanan sistem, serta prosedur pemeliharaan sistem **FieldOps IT (v0.3.1)**.

---

## 🛠️ 1. PANDUAN SETUP LINGKUNGAN (ENVIRONMENT SETUP)

### A. Prasyarat Sistem (Prerequisites)
Sebelum menjalankan atau mendepoloy aplikasi, pastikan sistem Anda memenuhi prasyarat berikut:
- **Node.js**: v26.x LTS (Direkomendasikan Node.js 26 dengan masa dukungan aktif hingga 2029, kompatibel `>=22.0.0`).
- **Package Manager**: `npm` (v10+) atau `bun` (v1+).
- **Proyek Firebase**: Proyek Google Firebase dengan layanan **Firestore Database** dan **Firebase Authentication** aktif.

---

### B. Konfigurasi Variabel Lingkungan (`.env`)

Buat file `.env` di root folder aplikasi dengan mengacu pada `.env.example`:

```bash
# Server Port Configuration
PORT=3000
NODE_ENV=development

# Firebase Client Configuration (Frontend)
VITE_FIREBASE_API_KEY=AIzaSyBYourApiKeyHere...
VITE_FIREBASE_AUTH_DOMAIN=fieldops-it.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fieldops-it
VITE_FIREBASE_STORAGE_BUCKET=fieldops-it.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=102938475612
VITE_FIREBASE_APP_ID=1:102938475612:web:abc123xyz456

# Express WhatsApp Gateway Proxy Configuration (Backend)
APP_SECRET_KEY=sk_live_fieldops_2026_x89_secret
WA_GATEWAY_URL=https://api.whatsapp-provider.com/v1
WA_GATEWAY_TOKEN=wa_token_sec_993848123xyz
```

#### Deskripsi Variabel Lingkungan:
| Variabel | Lingkungan | Wajib | Fungsi / Deskripsi |
| :--- | :--- | :---: | :--- |
| `PORT` | Server | Tidak | Port yang digunakan oleh Express Server (Default: `3000`). |
| `NODE_ENV` | Server | Ya | Mode runtime Node.js (`development` atau `production`). |
| `VITE_FIREBASE_*` | Frontend | Ya | Kredensial Firebase Client SDK untuk akses Firestore & Auth. |
| `APP_SECRET_KEY` | Server & Frontend | Ya | Kunci rahasia untuk otorisasi request proxy antara frontend dan Express server. |
| `WA_GATEWAY_URL` | Server | Ya | Endpoint API provider WhatsApp eksternal. |
| `WA_GATEWAY_TOKEN` | Server | Ya | Bearer token rahasia provider WhatsApp eksternal. |

---

### C. Perintah Instalasi & Mode Running

1. **Instal Dependensi**:
   ```bash
   npm install
   ```

2. **Jalankan Server Mode Pengembangan (Development)**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan secara lokal di `http://localhost:3000`.

3. **Kompilasi Produksi (Production Build)**:
   ```bash
   npm run build
   ```
   Menghasilkan *bundle* terkompresi di folder `dist/`.

4. **Jalankan Server Produksi**:
   ```bash
   npm start
   ```
   Menjalankan server Express (`server.ts`) yang melayani file statis PWA dan API Express Proxy.

---

## 📐 2. PENJELASAN ARSITEKTUR MODUL (MODULE ARCHITECTURE)

### A. Diagram Arsitektur Sistem

```
+-----------------------------------------------------------------------------------+
|                                  FIELD OPS IT SYSTEM                              |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                          React 19 SPA (Frontend)                          |   |
|   |                                                                           |   |
|   |   +-------------------+  +---------------------+  +-------------------+   |   |
|   |   |    AuthContext    |  |  InventoryContext   |  |   ThemeContext    |   |   |
|   |   |  (RBAC & Sesi)    |  | (Stok & Sync Queue) |  | (Terang/Gelap)    |   |   |
|   |   +-------------------+  +----------+----------+  +-------------------+   |   |
|   +-------------------------------------|-------------------------------------+   |
|                                         |                                         |
|                +------------------------+------------------------+                |
|                |                                                 |                |
|                v                                                 v                |
|   +--------------------------+                      +--------------------------+  |
|   |   Firebase Cloud Store   |                      |  Express Gateway Server  |  |
|   |  (Firestore & Auth SDK)  |                      | (server/whatsapp-gateway)|  |
|   +--------------------------+                      +------------+-------------+  |
|                                                                  |                |
|                                                                  v                |
|                                                     +--------------------------+  |
|                                                     |  WhatsApp Provider API   |  |
|                                                     +--------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

### B. Modul-Modul Utama Application State

#### 1. Modul Inventory State (`src/context/InventoryContext.tsx`)
- **Tanggung Jawab**: Mengelola master katalog barang (`items`), log transaksi mutasi (`transactions`), checklist lapangan (`checklists`), serta antrean sinkronisasi offline.
- **Mekanisme Sync**:
  - Operasi *Stock In*, *Stock Out*, dan *Batch Stock Out* diperbarui secara langsung ke state React & `localStorage` (*Optimistic UI*).
  - Jika perangkat terhubung ke internet, data dikirim langsung ke Firestore via `src/services/firebaseService.ts`.
  - Jika offline, transaksi dimasukkan ke antrean `src/services/offlineSyncService.ts` dan diproses otomatis saat koneksi pulih (*auto-sync*).

#### 2. Modul Autentikasi & Keamanan Sesi (`src/context/AuthContext.tsx` & `src/utils/security.ts`)
- **Tanggung Jawab**: Mengelola login pengguna, sesi aktif, dan hak akses (*Role-Based Access Control*).
- **Hukum Kriptografi Password**:
  - Hashing kata sandi lokal menggunakan algoritma **PBKDF2** dengan **100.000 iterasi SHA-256** dan **16-byte random salt**.
  - Dilarang keras menurunkan iterasi hashing di bawah 100.000.
- **Role Hierarchy**:
  - `technician`: Akses lihat katalog, catat barang keluar tiket, dan checklist tas.
  - `admin`: Akses catat barang masuk/keluar, tambah item baru, ekspor Excel/PDF, dan konfigurasi WA alert.
  - `supervisor`: Akses penuh termasuk verifikasi checklist, manajemen akun, dan reset data demo.

#### 3. Modul Tampilan Tema (`src/context/ThemeContext.tsx`)
- **Tanggung Jawab**: Mengatur mode tampilan visual aplikasi.
- **Pilihan Mode**: `light` (Terang), `dark` (Gelap), dan `system` (Mengikuti preferensi OS).
- **Penyimpanan**: Mode tersimpan di `localStorage` dengan kunci `fieldops_theme`.

---

## 🔌 3. PANDUAN PENGGUNAAN FITUR API (API FEATURE GUIDE)

Express Backend Proxy melayani endpoint notifikasi dan komunikasi gateway tanpa mengekspos kredensial rahasia ke browser client.

### A. Endpoint WhatsApp Gateway Proxy

Send Notification Alert via WhatsApp API Proxy.

- **URL Endpoint**: `/api/whatsapp/send`
- **HTTP Method**: `POST`
- **Content-Type**: `application/json`

#### Header Otorisasi Wajib:
| Header Name | Type | Description |
| :--- | :--- | :--- |
| `X-App-Secret-Key` | String | Kunci rahasia yang harus cocok dengan variabel `APP_SECRET_KEY` pada file `.env` server. |

---

#### 1. Contoh Request Payload JSON (Success Case)

**cURL Request**:
```bash
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "X-App-Secret-Key: sk_live_fieldops_2026_x89_secret" \
  -d '{
    "phone": "6281234567890",
    "message": "[ALERT STOK MENIPIS]\nBarang: Kabel UTP Cat6 305m\nSisa Stok: 2 Roll (Minimum: 5 Roll)\nLokasi Rak: Rak A-02\nHarap segera lakukan pengadaan ulang."
  }'
```

**JSON Request Body**:
```json
{
  "phone": "6281234567890",
  "message": "[ALERT STOK MENIPIS]\nBarang: Kabel UTP Cat6 305m\nSisa Stok: 2 Roll (Minimum: 5 Roll)\nLokasi Rak: Rak A-02\nHarap segera lakukan pengadaan ulang."
}
```

**JSON Response Body (200 OK)**:
```json
{
  "success": true,
  "message": "Pesan notifikasi WhatsApp berhasil dikirim ke 6281234567890",
  "data": {
    "messageId": "wa_msg_98237410298",
    "status": "SENT",
    "timestamp": "2026-10-30T04:12:00.000Z"
  }
}
```

---

#### 2. Contoh Response Error Cases

**Kasus A: Header `X-App-Secret-Key` Tidak Valid atau Kosong (401 Unauthorized)**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Akses ditolak: X-App-Secret-Key tidak valid atau tidak dikirimkan dalam header request."
}
```

**Kasus B: Format Payload Tidak Lengkap (400 Bad Request)**
```json
{
  "success": false,
  "error": "INVALID_PAYLOAD",
  "message": "Field 'phone' dan 'message' wajib diisi."
}
```

**Kasus C: Kegagalan Provider WhatsApp Eksternal (500 Internal Server Error)**
```json
{
  "success": false,
  "error": "GATEWAY_PROVIDER_ERROR",
  "message": "Gagal terhubung ke provider WhatsApp eksternal: Connection timeout.",
  "details": {
    "providerCode": 504,
    "targetPhone": "6281234567890"
  }
}
```

---

## ⚙️ 4. PROSEDUR PEMELIHARAAN SISTEM (MAINTENANCE PROCEDURES)

### A. Prosedur Cadangan Data (Backup & Restore)

1. **Firestore Automated Daily Export**:
   Jalankan ekspor otomatis data Firestore ke Google Cloud Storage bucket:
   ```bash
   gcloud firestore export gs://fieldops-backup-bucket/daily-backups --async
   ```

2. **Prosedur Pemulihan (Restore Firestore)**:
   ```bash
   gcloud firestore import gs://fieldops-backup-bucket/daily-backups/2026-10-30T00:00:00
   ```

3. **Kliring Cache Lokal & PWA Service Worker**:
   Jika pengguna mengalami masalah penumpukan data lama (*stale asset*):
   - Klik tombol **"Reset Data"** di footer sidebar untuk mengosongkan `localStorage`.
   - Atau unregister Service Worker melalui DevTools -> Application -> Service Workers -> Unregister.

---

### B. Proteksi Ekspor Data (Injeksi Formula CWE-1236)

Seluruh fungsi ekspor data CSV/Excel wajib menggunakan fungsi sanitasi `sanitizeFormulaInput()` (`src/utils/security.ts`):
```typescript
export function sanitizeFormulaInput(value: string): string {
  if (typeof value !== 'string') return value;
  const unsafePrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (unsafePrefixes.some(prefix => value.startsWith(prefix))) {
    return `'${value}`;
  }
  return value;
}
```

---

### C. Troubleshooting Umum & Penanganan Insiden

| Insiden / Gejala | Penyebab Kemungkinan | Langkah Penanganan |
| :--- | :--- | :--- |
| **HTTP 401 pada Proxy WA** | Header `X-App-Secret-Key` tidak cocok dengan `.env` | Periksa nilai `APP_SECRET_KEY` pada `.env` server dan sesuaikan dengan header request. |
| **Data Offline Tidak Sync** | Perangkat belum mendeteksi status internet | Periksa indikator koneksi browser, lalu klik ulang tombol "Sync Queue" pada header modal. |
| **Build Error Workbox Limit** | Asset JS melampaui limit default Workbox 2 MiB | Pastikan `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` diset pada `vite.config.ts`. |
