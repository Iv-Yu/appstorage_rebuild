# AGENTS.md - Panduan & Invarian Pengkodian AI Studio / Developer

Dokumen ini memuat aturan teknis mutlak, invarian sistem, serta panduan pengkodian bagi Agen AI (LLM) dan pengembang yang bekerja pada repositori **FieldOps IT**.

---

## 🛑 1. Invarian Mutlak (Invariants - Dilarang Dilanggar)

1. **Aturan Kriptografi Kata Sandi**:
   - Seluruh hashing kata sandi pengelola dan pengguna lokal WAJIB menggunakan algoritma PBKDF2 dengan minimal **100.000 iterasi SHA-256** dan **16-byte random salt** (sebagaimana diimplementasikan pada `src/utils/security.ts`).
   - Dilarang keras menurunkan jumlah iterasi, menggunakan MD5/SHA-1, atau menyimpan kata sandi dalam bentuk *plain text*.

2. **Aturan Ekspor Data (CWE-1236 CSV/Excel Injection Prevention)**:
   - Setiap nilai string yang diekspor ke format CSV, Excel, atau PDF WAJIB melewati fungsi `sanitizeFormulaInput()` (`src/utils/security.ts`).
   - Karakter berisiko di awal string (`=`, `+`, `-`, `@`, `\t`, `\r`) wajib diprefiks dengan tanda petik tunggal (`'`).

3. **Disiplin Tema & Warna (Zero-Pill & Kontras)**:
   - Penggunaan komponen visual wajib mematuhi panduan `docs/TEMA_DAN_DESAIN.md`.
   - Dilarang membuat border putih yang tidak perlu pada elemen navigasi atau item menu di tema gelap.
   - Warna latar belakang tema gelap wajib menggunakan kelas Tailwind `bg-slate-900` / `bg-slate-950` dengan teks `text-slate-100` / `text-slate-200`.

4. **Isolasi Lingkungan & Proxy Notifikasi**:
   - Dilarang keras melakukan hardcode API Key, Token WhatsApp, atau Kredensial Firebase pada file sumber `src/*` atau `server/*`.
   - Seluruh variabel sensitif wajib dimuat dari `process.env` / `import.meta.env`.

5. **Penanganan Array Mutasi Firestore**:
   - Saat mencatat log mutasi stok (`stockIn`, `stockOut`, `batchStockOut`), operasi array pada lokal state dan Firestore wajib terisolasi agar tidak merusak riwayat transaksi.

---

## 🛠️ 2. Standar Arsitektur & Struktur File

- **Frontend**: React 19 SPA berbasis Vite (`src/App.tsx` sebagai entri utama).
- **Backend Proxy**: Express 4 (`server.ts` & `server/whatsapp-gateway.js`).
- **State Management**:
  - `InventoryContext` (`src/context/InventoryContext.tsx`): Pengelola utama state stok, log mutasi, checklist, dan sinkronisasi.
  - `ThemeContext` (`src/context/ThemeContext.tsx`): Pengelola mode tampilan (Terang / Gelap / Sistem).
  - `AuthContext` (`src/context/AuthContext.tsx`): Pengelola sesi pengguna dan peran RBAC.

---

## 🔍 3. Prosedur Verifikasi Sebelum Commit / Push

Sebelum menandai tugas selesai atau melakukan commit:

1. **Verifikasi Kompilasi & Build**:
   ```bash
   npm run build
   ```
   Pastikan tidak ada galat TypeScript atau kegagalan pemetakan modul Vite.

2. **Verifikasi Kualitas Kode (Linting)**:
   ```bash
   npm run lint
   ```
   Pastikan tidak ada kesalahan fatal pada sintaksis atau impor yang terputus.

3. **Pemeriksaan Keamanan Dependensi**:
   ```bash
   npm audit
   ```
   Gunakan flag `--package-lock-only` jika memperbarui dependensi tanpa mengubah `node_modules`.

---

## 📝 4. Kebijakan Dokumentasi & Logging

- Setiap penambahan fitur baru wajib memperbarui `docs/CHANGELOG.md`.
- Jika terdapat perubahan pada struktur data atau kunci `localStorage`, perbarui `docs/DATA.md`.
- Jika terdapat endpoint proxy baru di `server.ts` atau `server/whatsapp-gateway.js`, perbarui `docs/DEPLOY_DAN_OPERASIONAL.md`.
