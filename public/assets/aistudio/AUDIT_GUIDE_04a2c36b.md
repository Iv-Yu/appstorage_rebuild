# AUDIT_GUIDE.md — Audit Ulang Keamanan & Performa FieldOps Inventory

> File ini adalah instruksi untuk agent AI. Baca SELURUH isi file sebelum mengerjakan apa pun.
> Mode kerja: **AUDIT DULU, LAPORKAN, BARU PERBAIKI setelah disetujui.** Jangan mengubah kode pada Fase 0–4.

---

## 1. Peran

Kamu adalah auditor keamanan aplikasi web sekaligus insinyur performa frontend. Tugasmu mengaudit ulang **FieldOps Inventory**, lalu menyusun laporan temuan yang jelas, terprioritas, dan bisa ditindaklanjuti oleh pemilik proyek yang tidak selalu berlatar belakang developer senior. Tulis laporan dalam **Bahasa Indonesia** yang sederhana; istilah teknis boleh tetap berbahasa Inggris, tetapi jelaskan singkat.

## 2. Konteks Aplikasi

- **Fungsi:** webapp untuk mendata barang inventaris kantor dan mengecek stok.
- **Organisasi:** satu kantor, bisnis penyedia jasa internet (ISP), tidak ada cabang.
- **Pengguna:** sekitar 7 orang (teknisi dan atasan). Atasan perlu bisa mengecek stok dari mana saja, jadi aplikasi harus aman diakses dari internet publik.
- **Autentikasi:** sudah ada sistem akun (termasuk Google Auth lewat Firebase).
- **Penyimpanan data:** kondisi awal memakai `localStorage` dengan kunci berawalan `fieldops_inventory_*` (sudah berisi **data riil**). Rencana arah: data permanen di server, webapp hanya sebagai penyimpanan sementara/cache. Periksa kondisi sebenarnya di kode, jangan berasumsi.
- **Audit keamanan sebelumnya:** menghasilkan hashing **PBKDF2, 100.000 iterasi, SHA-256**. Pertahankan, kecuali kamu menemukan alasan kuat dan melaporkannya dulu.

### Tech stack (verifikasi dari `package.json` dan lockfile, jangan percaya tabel ini mentah-mentah)

| Lapisan | Teknologi (menurut catatan pemilik) |
|---|---|
| Runtime | Node.js 22.x LTS |
| UI | React 19.0.1, TypeScript 7.0.2, Tailwind CSS 4.3.3 |
| Build | Vite 8.3.0 |
| Backend/Auth/DB | Firebase SDK 13.1.0 (Firestore offline cache multi-tab + Google Auth), Express 4.21.2 sebagai backend proxy |
| UI lain | Recharts 3.10.1, Lucide 0.546.0, Motion 12.23.24 |
| PWA | Vite Plugin PWA 2.0.0 (Workbox, batas cache 5 MB) |

Jika versi di `package.json` berbeda dari tabel ini, **versi di repositori yang benar**. Catat selisihnya di laporan.

---

## 3. Aturan Keras (JANGAN DILANGGAR)

1. **Jangan menghapus, menimpa, atau memigrasi data `localStorage` / Firestore** tanpa persetujuan eksplisit. Data riil sudah ada di browser pengguna.
2. **Jangan mengubah kunci `fieldops_inventory_*`** atau format datanya tanpa rencana migrasi yang disetujui.
3. **Jangan menurunkan** jumlah iterasi PBKDF2 atau mengganti algoritma hashing secara diam-diam. Jika perlu ditingkatkan, buat rencana migrasi agar akun lama tetap bisa login.
4. **Jangan mencetak, menyalin ke laporan, atau me-commit secret** (API key, token, service account, password, isi `.env`). Jika menemukan secret, tulis lokasinya (file:baris) dan jenisnya saja, dengan nilai disamarkan (`AIza****`).
5. **Jangan menjalankan serangan nyata** terhadap server produksi (brute force, load test, scanning agresif). Audit bersifat statis dan lokal/staging. Uji dinamis hanya di `localhost` atau staging.
6. **Jangan menambah dependency baru** pada fase audit.
7. Jika ragu, **berhenti dan bertanya**, jangan menebak.
8. **Jangan membuat file laporan audit baru.** Semua hasil masuk ke file audit yang sudah ada (lihat Fase 0 dan Fase 4), dan isi lamanya tidak boleh dihapus.
9. Jangan mengklaim sesuatu "aman" tanpa bukti. Tulis "tidak ditemukan masalah pada X dengan cara pemeriksaan Y" dan sebutkan batasannya.

---

## 4. Alur Kerja

### Fase 0 — Persiapan & Pemetaan (baca saja)

- [ ] Baca `README` dan `REFACTORING_GUIDE.md`.
- [ ] **Tentukan FILE AUDIT UTAMA.** Hasil audit kali ini harus ditulis ke file audit yang **sudah ada dari audit sebelumnya**, bukan file baru. Cari di akar repositori dan folder `docs/` (nama yang mungkin: `AUDIT*.md`, `SECURITY*.md`, `PERFORMANCE*.md`, `*audit*.md`, `*laporan*.md`). Jika ada lebih dari satu kandidat, atau tidak ada yang cocok, **berhenti dan tanyakan** nama file yang benar kepada pemilik. Jangan membuat file baru sebagai pengganti.
- [ ] Baca seluruh isi file audit utama itu dan pahami struktur, gaya penulisan, dan penomoran ID temuan yang dipakai.
- [ ] Petakan struktur proyek: entry point, routing, komponen utama, lapisan data, server Express, konfigurasi Firebase, konfigurasi PWA/Workbox.
- [ ] Buat daftar alur data penting: login, logout, baca/tulis inventaris, sinkronisasi offline, ekspor/impor.
- [ ] Catat versi aktual semua dependency utama.
- [ ] Buat daftar **temuan lama** dari audit sebelumnya (jika ada) untuk diverifikasi ulang di Fase 3.

### Fase 1 — Audit Keamanan

Periksa setiap area berikut. Untuk tiap area tulis: apa yang diperiksa, bukti (file:baris), hasil, dan tingkat keparahan.

**1.1 Autentikasi & sesi**
- Alur login email/password dan Google Auth: validasi, penanganan error, pesan error yang tidak membocorkan informasi (user enumeration).
- Penyimpanan password/hash: pastikan PBKDF2 100.000 iterasi SHA-256 masih dipakai, salt unik per akun, perbandingan hash constant-time, tidak ada password di log atau localStorage.
- Penyimpanan token/sesi: lokasi (localStorage vs cookie), masa berlaku, logout benar-benar menghapus sesi.
- Pembatasan percobaan login (rate limiting/lockout) di sisi server.
- Reset password dan pendaftaran akun baru: siapa yang boleh mendaftar? Apakah ada akun sembarang orang bisa dibuat?

**1.2 Otorisasi & kontrol akses**
- Apakah ada peran (teknisi vs atasan/admin)? Apakah dicek di **server/Firestore Rules**, bukan hanya disembunyikan di UI?
- **Firestore Security Rules** (`firestore.rules`): cari `allow read, write: if true`, aturan yang terlalu longgar, tidak ada pengecekan `request.auth`, tidak ada validasi field.
- Kemungkinan IDOR: apakah pengguna bisa membaca/mengubah data yang bukan haknya dengan mengganti ID?

**1.3 Backend Express (proxy)**
- Validasi dan sanitasi input di setiap endpoint.
- CORS: hindari `*` bersama kredensial; daftar origin yang diizinkan.
- Security headers (cek apakah memakai `helmet` atau setara): CSP, HSTS, X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy.
- Rate limiting, batas ukuran body, penanganan error (tidak membocorkan stack trace).
- Risiko SSRF jika proxy meneruskan URL dari input pengguna.
- Verifikasi ID token Firebase di server untuk endpoint yang butuh login.

**1.4 Sisi klien (browser)**
- XSS: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, rendering data pengguna tanpa escape, link `javascript:`.
- Data sensitif di `localStorage`/`sessionStorage`/IndexedDB; apa yang bisa dibaca script lain di origin yang sama.
- Variabel `VITE_*` yang terekspos ke bundle: pastikan tidak ada secret sungguhan (API key Firebase web memang publik, tetapi harus dilindungi Rules dan pembatasan referrer/domain).
- Impor/ekspor file (CSV/JSON): validasi dan batas ukuran.
- Source map produksi: apakah ikut terpublikasi?

**1.5 PWA & cache**
- Apakah Service Worker meng-cache respons API yang berisi data sensitif atau terautentikasi? Apa yang tersisa setelah logout?
- Strategi Workbox per rute (NetworkFirst/CacheFirst) dan risiko data basi atau bocor di perangkat bersama.
- Cache offline Firestore multi-tab: data apa yang tertinggal di perangkat setelah logout.

**1.6 Dependency & rantai pasok**
- Jalankan `npm audit` (atau `npm audit --omit=dev`) dan catat hasilnya. Jangan menjalankan `npm audit fix --force`.
- Paket yang tidak terawat, tidak terpakai, atau versi sangat tua.
- Keberadaan lockfile, skrip `postinstall` yang mencurigakan.

**1.7 Konfigurasi & deployment**
- `.gitignore` mencakup `.env*`, service account, file kunci. Cari secret yang pernah ter-commit (`git log -p` pada file sensitif jika memungkinkan).
- Pemisahan konfigurasi dev vs produksi, HTTPS wajib, mode debug mati di produksi.
- Cadangan (backup) data: ada atau tidak, dan siapa yang bisa memulihkan.

### Fase 2 — Audit Performa

Ukur sebelum menyimpulkan. Sertakan angka.

**2.1 Build & bundle**
- Jalankan build produksi dan catat ukuran tiap chunk (raw dan gzip). Identifikasi 5 chunk/dependency terbesar.
- Cek code splitting dan lazy loading rute/komponen berat (mis. Recharts, halaman laporan).
- Tree-shaking ikon (Lucide: impor per ikon, bukan seluruh pustaka) dan penggunaan Motion yang berlebihan.
- Aset: gambar/font yang tidak dioptimasi, duplikasi dependency.

**2.2 Runtime React**
- Re-render berlebihan: state terlalu tinggi di pohon komponen, context yang terlalu besar, tidak adanya `memo`/`useMemo`/`useCallback` **hanya** di titik yang terbukti bermasalah (jangan menyarankan optimasi prematur).
- Daftar panjang inventaris: perlu virtualisasi/paginasi/debounce pencarian?
- Efek samping (`useEffect`) yang berulang, listener yang tidak dibersihkan, kebocoran memori.
- Operasi berat di main thread (filter/sort/parse besar, tulis `localStorage` sinkron berulang).

**2.3 Data & jaringan**
- Firestore: query tanpa batas (`limit`), pembacaan penuh koleksi di tiap render, listener `onSnapshot` yang tidak di-unsubscribe, indeks yang hilang, dan estimasi jumlah *read* per sesi (relevan untuk kuota/biaya).
- Efisiensi cache offline multi-tab dan strategi sinkronisasi.
- Latensi server Express proxy; kompresi respons (gzip/brotli), header cache untuk aset statis.

**2.4 PWA & pemuatan**
- Batas cache Workbox 5 MB: apakah precache mendekati batas? Apa saja yang masuk precache?
- Strategi pembaruan Service Worker (pengguna tidak terjebak di versi lama).
- Jika memungkinkan jalankan Lighthouse (mobile) pada build produksi lokal dan catat LCP, INP/TBT, CLS, ukuran transfer. Jika tidak bisa dijalankan, tulis alasannya dan lakukan estimasi dari analisis bundle.

**2.5 Pengalaman perangkat sederhana**
- Pertimbangkan perangkat Android kelas menengah/bawah dan koneksi lambat, karena teknisi bekerja di lapangan.

### Fase 3 — Verifikasi Regresi (Audit Ulang)

- Untuk setiap temuan dari audit sebelumnya, tandai: **Sudah diperbaiki / Sebagian / Belum / Muncul kembali**, dengan bukti.
- Periksa apakah **refaktor arsitektur komponen** (lihat `REFACTORING_GUIDE.md`) dan fitur tema gelap/terang yang baru ditambahkan memunculkan masalah baru: komponen pecah yang kehilangan validasi, state yang bocor antar komponen, bundle yang membengkak, kontras warna/aksesibilitas pada tema gelap.
- Pastikan PBKDF2 100.000 iterasi SHA-256 masih utuh.

### Fase 4 — Laporan

Tulis hasil ke **FILE AUDIT UTAMA yang ditentukan di Fase 0** (file audit yang sudah ada). **Jangan membuat `AUDIT_REPORT_*.md` atau file laporan baru.**

Cara memperbarui file yang sudah ada:
- **Pertahankan seluruh isi lama.** Jangan menghapus atau menulis ulang temuan sebelumnya.
- Tambahkan satu bagian baru di bagian paling atas (setelah judul dan daftar isi, jika ada) berjudul `## Audit Ulang — <tanggal>`, berisi struktur di bawah ini. Turunkan level heading template (`##` menjadi `###`, dan seterusnya) agar menjadi sub-bagian dari heading tersebut.
- Untuk temuan lama, **perbarui status di tempatnya** (mis. tambahkan baris `Status <tanggal>: Sudah diperbaiki / Sebagian / Belum / Muncul kembali`) tanpa mengubah teks aslinya, lalu rujuk ke ID lama di bagian baru.
- Lanjutkan penomoran ID dari yang terakhir dipakai di file tersebut (mis. jika terakhir `SEC-07`, temuan baru mulai `SEC-08`). Ikuti format ID yang sudah ada.
- Jika format file lama berbeda dari templat di bawah, **ikuti format lama** untuk temuan individual, dan pakai templat ini hanya sebagai panduan isi.
- Jika file lama bukan Markdown (mis. `.docx` atau `.pdf`), jangan diubah formatnya: laporkan hal itu kepada pemilik dan tanyakan cara yang diinginkan.

Struktur bagian baru:

```
# Laporan Audit Ulang FieldOps Inventory — <tanggal>

## 1. Ringkasan Eksekutif
- Kondisi keseluruhan dalam 5–7 kalimat, bahasa awam.
- Jumlah temuan per tingkat keparahan.
- 3 hal yang harus dibereskan pertama.

## 2. Ruang Lingkup & Metode
- Apa yang diperiksa, apa yang tidak, alat yang dipakai, batasan audit.

## 3. Status Temuan Audit Sebelumnya
| ID lama | Temuan | Status | Bukti |

## 4. Temuan Baru — Keamanan
## 5. Temuan Baru — Performa
(untuk tiap temuan pakai templat di bawah)

## 6. Metrik Performa (sebelum perbaikan)
| Metrik | Nilai | Catatan |

## 7. Rencana Perbaikan Bertahap
- Urut prioritas, estimasi usaha (kecil/sedang/besar), risiko terhadap data riil.

## 8. Hal yang Perlu Keputusan Pemilik
- Pertanyaan terbuka dan pilihan beserta konsekuensinya.
```

**Templat satu temuan:**

```
### [SEC-01 / PERF-01] Judul singkat
- Tingkat: Kritis | Tinggi | Sedang | Rendah | Info
- Lokasi: path/file.ts:baris
- Deskripsi: apa masalahnya, dalam bahasa sederhana
- Dampak: apa yang bisa terjadi pada kantor/data/pengguna
- Bukti: potongan kode singkat (tanpa secret) atau output perintah
- Rekomendasi: langkah perbaikan konkret
- Risiko perbaikan: apakah menyentuh data riil/login? perlu migrasi?
- Usaha: kecil | sedang | besar
```

**Kriteria keparahan:**
- **Kritis:** data bisa dibaca/diubah orang tak berwenang dari internet, secret bocor, Firestore Rules terbuka.
- **Tinggi:** bypass otorisasi, XSS tersimpan, sesi/token tidak aman, kerentanan dependency yang dapat dieksploitasi.
- **Sedang:** header keamanan kurang, rate limiting tidak ada, performa buruk yang terasa jelas pengguna.
- **Rendah/Info:** hardening tambahan, optimasi kecil, praktik terbaik.

### Fase 5 — Perbaikan (HANYA setelah pemilik menyetujui laporan)

Jangan mulai fase ini sebelum pemilik membalas dengan daftar ID temuan yang boleh dikerjakan.

1. Buat branch baru, mis. `audit/<tanggal>`. Jangan bekerja langsung di `main`.
2. Satu perbaikan = satu commit kecil dengan pesan jelas yang menyebut ID temuan.
3. Urutan: Kritis → Tinggi → Sedang. Perbaikan yang menyentuh data/login harus disertai rencana migrasi dan cara rollback.
4. Setelah tiap perbaikan: jalankan type-check, lint, test (jika ada), dan build produksi. Jika gagal, batalkan perbaikan itu dan laporkan.
5. Ukur ulang metrik performa dan isi bagian "setelah perbaikan" di laporan.
6. Perbarui laporan dengan status akhir tiap temuan.

---

## 5. Perintah yang Disarankan

Sesuaikan dengan skrip di `package.json`. Jalankan hanya yang relevan dan aman.

```bash
# Dependency
npm ls --depth=0
npm audit --omit=dev

# Kualitas kode
npx tsc --noEmit
npm run lint --if-present
npm test --if-present

# Build & ukuran bundle
npm run build
ls -lah dist/assets | sort -k5 -h

# Pencarian pola berisiko (statis)
grep -rnE "dangerouslySetInnerHTML|innerHTML|eval\(|new Function" src/
grep -rnE "localStorage|sessionStorage" src/
grep -rnE "allow (read|write).*if true" .
grep -rnE "(api[_-]?key|secret|token|password)\s*[:=]" --include="*.ts" --include="*.tsx" --include="*.js" src/ server/ 2>/dev/null
```

Jika sebuah perintah tidak bisa dijalankan (tidak ada akses jaringan, alat tidak terpasang), **tulis itu di laporan** sebagai batasan, jangan dilewati diam-diam.

---

## 6. Standar Kualitas Hasil

- Setiap temuan punya **bukti** (file:baris atau output perintah). Tanpa bukti, tandai sebagai "dugaan".
- Pisahkan **fakta** dari **opini/rekomendasi**.
- Jangan membengkakkan laporan dengan temuan sepele; kelompokkan yang serupa.
- Prioritaskan yang relevan untuk skala sebenarnya: 7 pengguna, satu kantor, tetapi terbuka ke internet.
- Akhiri dengan daftar singkat pertanyaan untuk pemilik (mis. apakah aplikasi sudah di-host publik, siapa yang boleh membuat akun, apakah ada backup rutin).

## 7. Pesan Pertama yang Harus Kamu Kirim

Setelah membaca file ini, balas dengan: (1) ringkasan pemahamanmu tentang proyek dalam 5 kalimat, (2) daftar file/folder yang akan kamu periksa lebih dulu, beserta **nama file audit yang akan kamu perbarui** untuk dikonfirmasi pemilik, (3) pertanyaan yang perlu dijawab pemilik sebelum mulai (maksimal 5). **Jangan mengubah kode apa pun pada tahap ini.**
