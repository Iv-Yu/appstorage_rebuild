# AGENTS.md - Panduan & Invarian Pengkodian AI Studio / Developer

Dokumen ini memuat aturan teknis mutlak, invarian sistem, serta panduan pengkodian bagi Agen AI (LLM) dan pengembang yang bekerja pada repositori **FieldOps IT**.

---

## 🛑 1. Invarian Mutlak (Invariants - Dilarang Dilanggar)

1. **Aturan Kriptografi Kata Sandi**:
   - Seluruh hashing kata sandi pengelola dan pengguna WAJIB menggunakan algoritma PBKDF2 dengan minimal **100.000 iterasi SHA-256** dan **16-byte random salt** (`frontend/src/utils/security.ts` dan `backend/src/services/authService.ts`).
   - Dilarang keras menurunkan jumlah iterasi, menggunakan MD5/SHA-1, atau menyimpan kata sandi dalam bentuk *plain text*.

2. **Aturan Ekspor Data (CWE-1236 CSV/Excel Injection Prevention)**:
   - Setiap nilai string yang diekspor ke format CSV, Excel, atau PDF WAJIB melewati fungsi `sanitizeFormulaInput()` (`frontend/src/utils/security.ts`).
   - Karakter berisiko di awal string (`=`, `+`, `-`, `@`, `\t`, `\r`) wajib diprefiks dengan tanda petik tunggal (`'`).

3. **Disiplin Tema & Warna (Zero-Pill & Kontras)**:
   - Penggunaan komponen visual wajib mematuhi panduan `docs/TEMA_DAN_DESAIN.md`.
   - Dilarang membuat border putih yang tidak perlu pada elemen navigasi atau item menu di tema gelap.
   - Warna latar belakang tema gelap wajib menggunakan kelas Tailwind `bg-slate-900` / `bg-slate-950` dengan teks `text-slate-100` / `text-slate-200`.

4. **Isolasi Lingkungan & Token Notifikasi**:
   - Dilarang keras melakukan hardcode API Key, Token WhatsApp Gateway (Fonnte), Kredensial Database MariaDB, atau secret key pada file sumber `frontend/*` atau `backend/*`.
   - Seluruh variabel sensitif wajib dimuat dari `process.env`.

5. **Penanganan Transaksi Mutasi Atomik**:
   - Saat mencatat log mutasi stok (`stockIn`, `stockOut`), seluruh transaksi database MariaDB WAJIB dieksekusi secara atomik (`backend/src/routes/transactions.ts` / `backend/src/db/database.ts`) untuk menjamin konsistensi sisa stok.

---

## 🛠️ 2. Standar Arsitektur & Struktur File

- **Frontend**: React 19 SPA berbasis Vite (`frontend/src/App.tsx` sebagai entri utama).
- **Backend API**: Express 5 + MariaDB 11 (`backend/src/server.ts` & `backend/src/routes/`).
- **State Management**:
  - `InventoryContext` (`frontend/src/context/InventoryContext.tsx`): Pengelola utama state stok, mutasi, dan checklist.
  - `AuthContext` (`frontend/src/context/AuthContext.tsx`): Pengelola sesi otentikasi server-authoritative.
  - `ThemeContext` (`frontend/src/context/ThemeContext.tsx`): Pengelola mode tampilan (Terang / Gelap / Sistem).

---

## 🔍 3. Prosedur Verifikasi Sebelum Commit / Push

Sebelum menandai tugas selesai atau melakukan commit:

1. **Verifikasi Kompilasi & Build**:
   ```bash
   npm run build
   ```
   Pastikan tidak ada galat TypeScript atau kegagalan bundling Vite.

2. **Verifikasi Kualitas Kode (Linting)**:
   ```bash
   npm run lint
   ```
   Pastikan tidak ada kesalahan sintaksis atau impor yang terputus.

3. **Pemeriksaan Keamanan Dependensi**:
   ```bash
   npm audit
   ```

---

## 📝 4. Kebijakan Dokumentasi & Logging

- Setiap penambahan fitur baru wajib memperbarui `CHANGELOG.md`.
- Jika terdapat perubahan pada struktur skema tabel MariaDB, perbarui `docs/DATA.md` dan `backend/src/db/migrations/`.
- Jika terdapat endpoint API baru di `backend/src/routes/`, perbarui `docs/DEPLOY.md`.
