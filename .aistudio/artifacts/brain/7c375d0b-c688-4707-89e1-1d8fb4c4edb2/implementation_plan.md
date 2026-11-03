# Rencana Pembuatan File DOCUMENTATION.md - FieldOps IT

Penyusunan file `DOCUMENTATION.md` komprehensif di root folder proyek untuk memberikan panduan teknis, arsitektur modul, penggunaan API Express Proxy, dan prosedur pengoperasian/pemeliharaan sistem **FieldOps IT**.

---

## User Review & Critical Decisions

> [!IMPORTANT] Keputusan yang Telah Dikonfirmasi Pengguna:
> - **Format & Kedalaman**: Dokumen Lengkap & Terstruktur mencakup detail setup lingkungan, arsitektur modul, contoh cURL, dan prosedur pemeliharaan sistem.
> - **Detail API**: Menyertakan contoh payload request/response JSON lengkap dan header otorisasi `X-App-Secret-Key` untuk seluruh API Express Proxy.

---

## 1. Overview & Core Concept

- **Tujuan Utama**: Menyediakan satu dokumen rujukan teknis tunggal (`DOCUMENTATION.md`) bagi pengembang, devops, dan administrator sistem yang mengelola aplikasi **FieldOps IT**.
- **Target Pembaca**: Technical Lead, Software Engineer, System Administrator, dan DevOps Engineer.
- **Nilai Tambah**: Memudahkan onboarding pengembang baru, memperjelas integrasi WhatsApp Gateway Proxy, serta memastikan prosedur pemeliharaan data dan keamanan dipatuhi.

---

## 2. Struktur & Isi Dokumentasi (`DOCUMENTATION.md`)

File `DOCUMENTATION.md` akan disusun dengan bab-bab utama sebagai berikut:

1. **Panduan Setup Lingkungan (Environment Setup Guide)**:
   - Prasyarat sistem (Node.js >= v18, Bun/npm).
   - Pengaturan variabel lingkungan (`.env`) beserta deskripsi fungsi setiap variabel.
   - Langkah instalasi dependensi, mode pengembangan (`npm run dev`), dan kompilasi produksi (`npm run build` & `npm start`).

2. **Penjelasan Arsitektur Modul (Module Architecture)**:
   - Penjelasan struktur direktori `src/` dan `server/`.
   - Modul `InventoryContext`: Tata kelola state stok, mutasi barang, dan antrean offline sync.
   - Modul `AuthContext` & Hashing PBKDF2: Manajemen sesi dan verifikasi hak akses (RBAC).
   - Modul `ThemeContext`: Pengaturan mode tampilan terang, gelap, dan sistem.
   - Modul Express Proxy (`server/whatsapp-gateway.js` & `server.ts`).

3. **Panduan Penggunaan Fitur API (API Feature Guide)**:
   - Endpoint WhatsApp Gateway `/api/whatsapp/send`:
     - Method & URL.
     - Header Otorisasi wajib (`X-App-Secret-Key`).
     - Contoh cURL request.
     - Contoh Payload Request JSON & Response JSON (Success & Error 401/500).
   - Endpoint Health Check & Status System.

4. **Prosedur Pemeliharaan & Pengoperasian Sistem (System Maintenance Procedures)**:
   - Prosedur harian/mingguan backup data Firestore.
   - Pemulihan cache lokal & kliring Service Worker PWA.
   - Prosedur sanitasi data ekspor (CWE-1236 protection).
   - Penanganan insiden & troubleshooting umum.

---

## 3. Technical Architecture Diagram

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

## 4. Langkah Eksekusi (Implementation Steps)

1. Buat file `/DOCUMENTATION.md` di root folder workspace.
2. Tulis seluruh bab sesuai kesepakatan format lengkap dan contoh JSON payload.
3. Jalankan `compile_applet` untuk memverifikasi kesehatan aplikasi.
4. Berikan ringkasan penyelesaian dokumen kepada pengguna.
