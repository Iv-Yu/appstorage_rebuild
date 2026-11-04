# PROMPT: Rapikan Struktur & Siapkan Deploy Lokal (Docker) - FieldOps IT

Kamu adalah agen pengembang untuk repositori **FieldOps IT** (React + Vite di `frontend/`, Express 5 + MariaDB di `backend/`). Kerjakan tugas di bawah ini **secara bertahap** dan ikuti aturan kerja di bagian berikut.

---

## 1. Tujuan

Pengembangan tetap berjalan di AI Studio (mode development dengan Vite), tetapi aplikasi juga harus bisa di-deploy di server lokal kantor memakai **Docker**, dari satu repositori yang sama. Data asli hanya ada di server kantor dan tidak boleh masuk repositori.

## 2. Kondisi saat ini (hasil audit)

- Root repo masih memuat salinan frontend yang identik dengan `frontend/`: `src/`, `index.html`, `vite.config.ts`, `tsconfig.json`.
- `public/` (ikon PWA) hanya ada di root. `frontend/` tidak punya folder `public`.
- `backend/src/server.ts` menjalankan Vite dengan `root: rootDir` (folder root proyek), sehingga masih bergantung pada file root.
- `backend/package.json` belum mencantumkan `vite`, padahal server memakainya.
- Skrip `start` di `package.json` root masih `node server.ts` (server lama). `server.ts` lama masih mengimpor `./src/data/mockData`.
- Server saat ini selalu memakai middleware Vite, termasuk saat production.
- `docker-compose.yml` merujuk `Dockerfile` (context `.`) yang **belum ada**. Compose juga memuat password bawaan yang ditulis langsung.
- `docs/DEPLOY.md` masih menyebut `nssm`, `pm2`, path `C:\`, dan `node server.ts`.
- `AGENTS.md`, `README.md`, `DOCUMENTATION.md`, dan `AUDIT_REPORT.md` di root masih menjelaskan versi lama (Firebase/Firestore, Express 4) dan identik dengan salinan di `legacy/`.
- Folder `backups/` ada di repo (isinya hasil tes otomatis).
- Repo ini **publik**.

## 3. Aturan kerja (wajib)

1. Kerjakan **satu tahap per giliran**. Setelah tiap tahap selesai, **berhenti**, laporkan hasilnya, dan tunggu saya mengetik `lanjut`.
2. Jangan mengerjakan tahap berikutnya sebelum saya minta.
3. Hanya ubah file yang dibutuhkan tahap itu. Jangan ubah logika bisnis, endpoint API, skema database, atau tampilan.
4. Jangan menghapus file apa pun kecuali tahap itu secara tegas memintanya, dan untuk penghapusan **tampilkan daftar dulu, tunggu konfirmasi**.
5. Folder `legacy/` jangan diubah atau dihapus.
6. Jangan menulis password, token, API key, atau IP nyata di file mana pun. Semua nilai sensitif dibaca dari environment variable.
7. Pertahankan invarian keamanan: PBKDF2 minimal 100.000 iterasi SHA-256 dengan salt 16 byte, sanitasi CSV/Excel (`sanitizeFormulaInput`), dan larangan hardcode kunci.
8. Mode development (Vite) untuk AI Studio **harus tetap berfungsi** di setiap tahap.
9. Setiap akhir tahap, jalankan pemeriksaan yang relevan (`npm run lint`, build, atau `npm run dev`) dan laporkan hasil sebenarnya, termasuk kalau gagal.
10. Format laporan tiap tahap: (a) apa yang dikerjakan, (b) daftar file yang diubah/dibuat/dipindah, (c) hasil pemeriksaan, (d) hal yang perlu saya cek manual, (e) pertanyaan bila ada.

## 4. Tahap-tahap

### TAHAP 0: Kebersihan repo publik

1. Tambahkan ke `.gitignore`: `backups/`, `.env*` (tetap izinkan `!.env.example`), `node_modules/`, `dist/`.
2. Cari di seluruh kode dan dokumen: password, token, API key, alamat IP, atau nama orang yang tertulis langsung. **Tampilkan daftarnya** (file dan baris), jangan langsung mengubahnya.
3. Tampilkan daftar file di folder `backups/`.

Hanya `.gitignore` yang boleh diubah. Berhenti setelah melapor.

### TAHAP 1: Pindahkan `public/` dan arahkan Vite ke `frontend/`

1. Pindahkan `public/` ke `frontend/public/`.
2. Ubah `backend/src/server.ts` agar `createViteServer` memakai root ke folder `frontend/`.
3. Pastikan dependensi frontend dan backend tercantum di `package.json` yang tepat (termasuk `vite` untuk server development).
4. Pastikan `npm run dev` dari root tetap menjalankan aplikasi penuh di `http://localhost:3000`.

Jangan hapus file di root pada tahap ini. Jalankan `npm run dev` dan `npm run lint`, lalu laporkan. Berhenti.

### TAHAP 2: Mode production

1. Di `backend/src/server.ts`: jika `NODE_ENV=production`, sajikan hasil build `frontend/dist` dengan `express.static` dan fallback SPA (semua rute non-`/api` diarahkan ke `index.html`). Selain itu, pakai middleware Vite seperti sekarang.
2. Import `vite` secara dinamis hanya di mode development, supaya image production tidak membutuhkannya.
3. Rute `/api/*` tidak boleh terkena fallback SPA.
4. Tambahkan/rapikan skrip `package.json`: build frontend, build backend, dan start production.

Tes dengan build lalu start dalam mode production di lokal (tanpa Docker). Pastikan refresh di halaman dalam (misalnya katalog) tidak menghasilkan 404. Laporkan. Berhenti.

### TAHAP 3: Dockerfile dan docker-compose

1. Buat `Dockerfile` multi-stage: tahap build frontend, lalu image akhir yang menjalankan backend mode production dan menyajikan `frontend/dist`. Base image Node 22.
2. Buat `.dockerignore` (`node_modules`, `dist`, `.env*`, `backups`, `legacy`, `.git`).
3. Perbarui `docker-compose.yml`: hapus semua password bawaan yang ditulis langsung (fallback `fieldops_secure_password_2026`, `fieldops_root_secure_2026`, dan sejenisnya). Password dan `APP_SECRET_KEY` wajib dibaca dari `.env`, dan compose harus gagal dengan pesan jelas jika belum diisi.
4. Pastikan data MariaDB dan folder `backups/` tersimpan di volume di luar kontainer.
5. Perbarui `.env.example` di root: semua variabel yang dibutuhkan compose, tanpa nilai rahasia, dan hapus variabel Firebase/Gemini yang tidak dipakai.

Jangan menjalankan docker di lingkungan ini. Jelaskan perintah yang akan saya jalankan di server. Berhenti.

### TAHAP 4: Tulis ulang `docs/DEPLOY.md`

Tulis ulang seluruhnya dalam Bahasa Indonesia yang mudah dipahami pemula. Isi wajib:

1. Kebutuhan: Docker Desktop (Windows) atau Docker Engine (Ubuntu), dan Git.
2. Instalasi pertama: clone repo, salin `.env.example` menjadi `.env`, isi password, `docker compose up -d --build`, buat akun admin pertama (tulis perintah persis untuk menjalankan skrip setup admin di dalam kontainer), dan cara membuka aplikasi dari PC lain di jaringan kantor.
3. Prosedur update: backup dulu, lalu `git pull`, lalu build ulang, lalu cek.
4. Backup dan restore data, termasuk menyalin backup ke luar server.
5. Troubleshooting: kontainer tidak jalan, lupa password admin, port bentrok, cara melihat log.
6. Bagian terpisah untuk Windows (Docker Desktop mulai otomatis, IP tetap) dan Ubuntu Server.

Hapus semua rujukan ke `nssm`, `pm2`, path `C:\`, dan `node server.ts`. Semua cara menjalankan lewat Docker. Berhenti.

### TAHAP 5: Pembersihan file duplikat dan dokumen lama

Lakukan ini hanya setelah tahap 1 sampai 3 saya konfirmasi sudah dites.

1. **Tampilkan dulu** daftar file yang akan dihapus, lalu tunggu konfirmasi saya. Kandidatnya: `src/`, `index.html`, `vite.config.ts`, `tsconfig.json`, `server.ts` lama, dan `bun.lock` di root.
2. Setelah saya setuju: hapus file tersebut, lalu perbarui `package.json` root (hapus dependensi Firebase dan `@google/genai` jika tidak dipakai, dan sesuaikan skrip `dev`, `build`, `start`).
3. Tulis ulang `AGENTS.md`: hapus rujukan ke Firestore, Firebase, Express 4, dan `server/whatsapp-gateway.js`. **Pertahankan** invarian keamanan dan perbarui lokasi file sesuai struktur `frontend/` dan `backend/`.
4. Tulis ulang `README.md` sesuai arsitektur sekarang (React + Express + MariaDB + Docker), tanpa badge Firebase.
5. Gabungkan `CHANGELOG.md` root dengan `docs/CHANGELOG.md` menjadi satu file.
6. Jalankan lint dan build, lalu laporkan hasilnya.

### TAHAP 6 (opsional, hanya jika saya minta): Mode database untuk preview AI Studio

1. Analisis dulu: tampilkan semua tempat yang memanggil `executeQuery` atau `runTransaction` langsung dari route/service (bukan lewat `repositories/`) dan usulkan rencana refaktor. **Jangan langsung mengubah kode.**
2. Setelah saya setuju: pindahkan akses database ke lapisan `repositories`, tambahkan implementasi SQLite lewat `DB_DRIVER=sqlite` (default tetap MariaDB di production), dan seed data demo hanya untuk mode SQLite.
3. Perilaku production (MariaDB) tidak boleh berubah. Sertakan tes yang membuktikan hasil sama di kedua driver.

---

## 5. Mulai sekarang

Kerjakan **TAHAP 0** saja, lalu berhenti dan laporkan sesuai format laporan di bagian 3.
