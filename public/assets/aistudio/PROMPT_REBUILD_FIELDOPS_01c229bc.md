# TUGAS: Bangun ulang FieldOps IT Inventory (repo App-storage)

## 1. Konteks
Webapp inventaris barang kantor ISP. Pengguna ~7 orang (teknisi, admin,
supervisor/atasan), satu kantor, tanpa cabang. Aplikasi dijalankan di
SERVER LOKAL kantor dan harus bisa diakses dari mana saja (termasuk oleh
atasan dari luar kantor).

Kode lama ada di `legacy/` (HANYA BACA, jangan diubah). Kamu bekerja di
branch `rebuild`. Bangun ulang hampir dari nol: `legacy/` adalah referensi
fitur, aturan bisnis, dan skema data. Kode lama boleh dipakai ulang HANYA
jika tercatat di docs/LEGACY_AUDIT.md dan punya tes.

Masalah di versi lama (buktikan atau koreksi di audit):
1. Akun (passwordHash+salt) tersimpan di localStorage bersama data barang;
   login diverifikasi di browser; users ikut di payload backup/restore.
2. Firebase Auth hanya anonim dan firestore.rules hanya cek
   `request.auth != null`, sehingga tidak ada pembatasan akses nyata.
3. Rahasia `fieldops-internal-proxy-v1` ada di server.ts DAN di
   src/services/whatsappService.ts (terkirim ke browser); server selalu
   menerimanya walau APP_SECRET_KEY diisi; /api/security/verify-action
   mempercayai `role` dari body request klien.
4. Frontend dan backend satu package.json; InventoryContext.tsx 1.600+ baris
   (stok, transaksi, akun, API key, log, workspace, sinkronisasi jadi satu).
5. Fonnte diimplementasikan dua kali (server.ts dan server/whatsapp-gateway.js);
   konfigurasi dan log WA hanya di memori; nomor tujuan di-hardcode.
6. Dokumentasi tidak sesuai kode (AuthContext.tsx, firebaseService.ts,
   komponen modals/layout/common, nama koleksi DATA.md, kunci localStorage).
7. Progres pengerjaan fitur tidak bisa dilacak.

## 2. Aturan tetap
- Firebase TIDAK dipakai lagi (tanpa Firebase Auth, Firestore, atau layanan
  cloud untuk data). Semua berjalan di server lokal.
- Fitur memilih/berganti database atau workspace DIHAPUS. Aplikasi baru
  memakai satu database tunggal untuk satu kantor. Jangan membuat kolom
  workspace_id, selector workspace di UI, maupun konsep multi-tenant.
- Jangan tambah dependency baru tanpa bertanya. Jangan tambah fitur di luar
  daftar yang saya setujui. Jangan ubah file di luar lingkup tugas.
- Tidak ada rahasia di kode atau frontend (token Fonnte, secret API,
  kredensial database). Semua dari env di backend. Tidak ada secret atau
  kata sandi bawaan di produksi.
- Database tidak boleh dapat diakses langsung dari internet atau frontend;
  hanya backend yang terhubung ke database.
- Peran/otorisasi ditegakkan di server dari identitas yang diverifikasi
  server (sesi), BUKAN dari data yang dikirim klien. UI hanya menyembunyikan
  menu.
- Pertahankan dari AGENTS.md lama: sanitasi ekspor CSV/Excel/PDF
  (`sanitizeFormulaInput`), panduan tema docs/TEMA_DAN_DESAIN.md, aturan
  isolasi log mutasi stok. Jika hashing kata sandi dilakukan sendiri:
  minimal setara PBKDF2 SHA-256 100.000 iterasi + salt acak 16 byte (boleh
  usul argon2/bcrypt).
- Jangan sertakan `App-storage-0.4-qr.zip`, `.aistudio/`, dan
  `public/assets/aistudio/` di proyek baru. Data contoh (mockData) hanya
  untuk dev/test.

## 3. Struktur target
```
fieldops/
├── frontend/    React + Vite + TS + Tailwind; package.json, .env.example, README
├── backend/     Express; package.json, .env.example, README
│   └── src/
│       ├── routes/  services/  repositories/  middleware/  config/
│       ├── db/{migrations,schema}/       migrasi berversi
│       └── integrations/whatsapp/        provider.ts, fonnte.ts, templates.ts
├── docs/
├── docker-compose.yml                    database + backend (+ reverse proxy)
└── legacy/                               baca-saja
```
- Frontend hanya berkomunikasi dengan backend lewat satu lapisan
  `services/`; tidak memanggil Fonnte atau database langsung.
- Pecah InventoryContext.tsx menjadi modul per domain. Tidak ada
  komponen/context > ~300 baris tanpa justifikasi di ARCHITECTURE.md.
- Usulkan struktur final di Tahap 1; tunggu persetujuan.

## 4. Desain data dan autentikasi (wajib)
- Database: [PostgreSQL / SQLite; usulkan di Tahap 1 dengan alasan].
- Satu kantor, satu database. Hapus konsep workspace seluruhnya (tipe
  DatabaseWorkspace, kunci fieldops_workspaces dan
  fieldops_current_workspace_id, UI pemilih database, parameter workspaceId
  pada backup/restore). Pertahankan hanya pengaturan yang memang dipakai
  (mis. nama perusahaan) di tabel pengaturan.
- Tiga lapisan terpisah: (1) akun/autentikasi (users, peran, status),
  (2) data bisnis (barang, kategori, transaksi, checklist, dst.) yang hanya
  menyimpan user_id, (3) log perubahan/audit trail (user_id, aksi,
  sebelum/sesudah, waktu).
- Hash/kredensial tidak boleh ada di ekspor, backup data bisnis, respons API,
  maupun localStorage.
- Perubahan stok memakai transaksi database atomik (cegah dua pengguna
  mengubah stok yang sama bersamaan); transaksi IN/OUT dan stok
  sebelum/sesudah dicatat dalam satu transaksi.
- Autentikasi di backend: sesi lewat cookie httpOnly+Secure+SameSite, batas
  percobaan login, peran dicek di setiap endpoint. Akun admin pertama dibuat
  lewat skrip setup, bukan akun bawaan.
- Konfirmasi di Tahap 1: mode offline dipertahankan atau tidak (jika tidak,
  hapus offlineSyncService); mekanisme pembaruan antar pengguna (polling
  atau SSE).
- Daftar status barang/progres terdefinisi jelas (disetujui di Tahap 1).

## 5. Server lokal dan akses jarak jauh
- Sediakan docker-compose (database + backend + reverse proxy) dan
  docs/DEPLOY.md: pemasangan dari nol, HTTPS (wajib untuk PWA), backup
  terjadwal + salinan di lokasi lain, skrip pulihkan dan uji pulihkan.
- Di Tahap 1, sajikan dua opsi akses jarak jauh (mis. Cloudflare Tunnel vs
  VPN) dengan kelebihan/kekurangan untuk kasus ini. Saya yang memilih.
  Jangan membuka port database ke internet.

## 6. Notifikasi WhatsApp (Fonnte)
- Satu modul `backend/src/integrations/whatsapp/` dengan antarmuka
  `sendMessage(to, text)`; logika bisnis tidak memanggil Fonnte langsung.
  Hapus duplikasi server.ts vs whatsapp-gateway.js.
- Konfigurasi dan nomor penerima disimpan persisten di database (bukan
  memori, bukan hardcode); log notifikasi persisten (penerima, jenis,
  status, waktu).
- Asinkron dengan antrean dan percobaan ulang (server bisa kehilangan
  internet); kegagalan tidak menggagalkan operasi stok. Cegah pesan berulang
  untuk kejadian yang sama.
- Pemicu awal: stok <= minimum setelah stock out / batch out / tiket
  (perilaku yang sudah ada). Tambahan: [isi atau kosong]. Jangan tambah
  pemicu lain tanpa persetujuan.
- Rujuk dokumentasi resmi Fonnte; tandai asumsi yang belum pasti.

## 7. Standar kode
Satu file satu tanggung jawab; fungsi maks ~40 baris; konfigurasi lewat env;
error eksplisit; validasi semua input di backend; migrasi database berversi.

## 8. Dokumentasi (wajib)
README (root, frontend, backend), docs/LEGACY_AUDIT.md, docs/PROGRESS.md
[Fitur | Status | Modul baru | Dites? | Catatan] dengan status:
belum / dikerjakan / selesai / terverifikasi, docs/ARCHITECTURE.md (Mermaid),
docs/DATA.md, docs/API.md, docs/DEPLOY.md, .env.example di tiap sisi,
CHANGELOG.md, AGENTS.md baru.
- Dokumen wajib sesuai kode: sebutkan hanya file, tabel, kunci, dan endpoint
  yang benar-benar ada. Di akhir tiap tahap, lakukan pemeriksaan silang
  dokumen vs kode dan laporkan selisihnya.
- Dokumentasi diperbarui di perubahan yang sama dengan kodenya.

## 9. Cara kerja (berhenti dan tunggu persetujuan di akhir tiap tahap)

**Tahap 0 - Audit (tanpa kode baru).** Baca `legacy/`, buat LEGACY_AUDIT.md:
- Daftar fitur + lokasi kode (tandai yang dipakai/mati/hanya mock).
- Semua kunci localStorage (termasuk yang per-workspace), koleksi Firestore
  nyata, bentuk data, dan selisihnya dengan docs lama.
- Daftar semua workspace yang ada di kode (default, contoh, mock) dan di
  mana data riil berada, berdasarkan ekspor data yang saya berikan (jumlah
  barang, transaksi, kategori per workspace). Jangan menebak. Daftar juga
  semua file/komponen terkait pemilih workspace yang akan dihapus.
- Titik tepat akun bercampur dengan data; cara penyimpanan dan verifikasi
  kata sandi; akun/peran bawaan (INITIAL_USERS) dan kredensial awalnya.
- Semua endpoint backend, siapa yang boleh memanggil, dan di mana rahasia
  muncul.
- Semua penggunaan Firebase (auth, Firestore, rules, SDK, config) dan
  padanannya di arsitektur baru; kebutuhan offline/real-time yang benar-
  benar dipakai.
- Alur WA yang ada (kedua implementasi) dan semua pemicunya.
- Bagian tidak jelas/berisiko (tandai, jangan menebak).

**Tahap 1 - Spesifikasi dan rencana:** fitur dipertahankan/diubah/dibuang,
struktur final, pilihan database dan autentikasi, opsi akses jarak jauh,
skema tiga lapis, daftar status, PROGRESS.md awal. Konfirmasi workspace
mana yang menjadi sumber data tunggal; jika ada data riil di lebih dari
satu workspace, usulkan cara menggabungkannya (termasuk ID/SKU bentrok)
dan tunggu keputusan saya.

**Tahap 2 - Fondasi:** frontend/ dan backend/, database + migrasi,
docker-compose, autentikasi, skrip admin pertama, log perubahan, backup
terjadwal + skrip pulihkan (diuji).

**Tahap 3 - Fitur per iterasi:** satu fitur per iterasi; tes; perbarui
PROGRESS.md dan docs; satu commit jelas. "Selesai" hanya jika perilakunya
sama dengan versi lama (perbedaan dicatat).

**Tahap 4 - Konsolidasi WhatsApp.**

**Tahap 5 - Migrasi data:** sumber ekspor JSON localStorage dan/atau
ekspor Firestore lama, HANYA dari workspace yang saya setujui di Tahap 1
(laporkan jumlah data workspace lain yang ditinggalkan). Skrip impor:
dry-run, laporan jumlah sebelum/sesudah, akun dipisah dari data bisnis.
Jangan salin hash lama kecuali saya pilih [pertahankan hash / buat akun
baru + reset kata sandi]. Jangan commit data riil.

**Tahap 6 - Uji paritas dan verifikasi akhir.**

## 10. Kriteria selesai
- Semua baris PROGRESS.md berstatus terverifikasi.
- Data lama termigrasi tanpa selisih; akun terpisah dari data bisnis.
- Tidak ada ketergantungan Firebase/cloud (cek package.json dan kode).
- Tidak ada sisa konsep workspace/pemilih database di kode, skema, API,
  UI, maupun dokumentasi (dibuktikan dengan pencarian kata "workspace").
- Tidak ada rahasia di frontend/repo; tidak ada secret bawaan; peran
  ditegakkan server-side (dibuktikan tes: klien tanpa hak ditolak).
- Satu modul WA; konfigurasi dan log persisten.
- frontend/ dan backend/ terpisah; build dan lint lolos masing-masing.
- Aplikasi bisa dipasang dari nol di server lokal hanya dengan DEPLOY.md;
  backup terjadwal berjalan dan pemulihan sudah diuji; database tidak
  terpapar ke jaringan publik.
- Docs 100% sesuai kode (laporan pemeriksaan silang bersih).
- Di akhir, periksa tiap poin dan laporkan yang terpenuhi.

Mulai dari Tahap 0 sekarang. Jangan lanjut ke Tahap 1 sebelum saya setujui.
