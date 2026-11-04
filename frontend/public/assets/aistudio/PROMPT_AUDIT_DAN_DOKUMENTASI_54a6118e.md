# TUGAS: Audit Menyeluruh + Dokumentasi Program FieldOps IT

Lakukan audit terhadap aplikasi FieldOps IT yang mencakup KEAMANAN, PERFORMA, KUALITAS, dan SEMUA TEKNOLOGI yang dipakai. Setelah itu, buat DOKUMENTASI lengkap tentang program ini.

## KONTEKS

- Aplikasi inventaris barang kantor sebuah ISP, dipakai sekitar 7 orang (teknisi dan atasan), satu kantor, tanpa cabang, dan harus bisa diakses dari mana saja.
- Memiliki sistem akun dan peran pengguna. Hash password memakai PBKDF2 100.000 iterasi SHA-256 (hasil audit sebelumnya, jangan diturunkan).
- Data sedang berpindah dari localStorage (kunci `fieldops_inventory_*`, sudah berisi data riil) menuju penyimpanan server/Firestore.
- Teknologi yang diketahui: React + TypeScript, Tailwind, Recharts, Firestore. Verifikasi dan lengkapi dari kode yang sebenarnya.
- Jika ada `REFACTORING_GUIDE.md`, baca dan hormati isinya.

## ATURAN MUTLAK

- Jangan ubah, hapus, atau buat file KODE aplikasi. File baru yang boleh dibuat hanya: `AUDIT_REPORT.md`, file dokumentasi di folder `docs/`, serta `README.md` dan `AGENTS.md` di root.
- Jangan menjalankan perintah yang mengubah data, menulis ke database produksi, atau mengirim data keluar.
- Setiap temuan WAJIB disertai bukti: path file + nomor baris, atau output perintah. Tanpa bukti, jangan dilaporkan sebagai temuan. Jangan menebak; jika tidak bisa diverifikasi, tulis "perlu dicek manual".
- Jika menemukan secret (API key, password, token), JANGAN tulis nilai lengkapnya di laporan atau dokumentasi. Cukup sebut lokasi dan 4 karakter pertama.
- Temuan keamanan hanya boleh ada di `AUDIT_REPORT.md`, tidak di dokumentasi biasa.
- Kerjakan per fase. Setelah Fase 2 (keamanan) selesai, berikan ringkasan singkat temuan KRITIS/TINGGI sebelum lanjut, agar saya bisa menanggapi jika ada yang perlu diprioritaskan.

---

## FASE 1 - INVENTARISASI TEKNOLOGI

- Daftar semua teknologi: bahasa, framework, library (dari `package.json` dan lockfile), build tool, layanan cloud (Firebase/Firestore, hosting, dll.), integrasi eksternal (mis. TicketIntegrationHub), dan konfigurasi deploy.
- Untuk tiap teknologi: versi terpasang, versi terbaru yang stabil, fungsinya di aplikasi, dan apakah masih dipelihara.
- Tandai: library yang tidak dipakai, duplikat fungsi antar library, dependency yang deprecated/tidak dipelihara, dan dependency yang bisa diganti dengan fitur bawaan browser/framework.

## FASE 2 - AUDIT KEAMANAN

### A. Autentikasi & Otorisasi
- Bagaimana login bekerja? Di mana password di-hash dan diverifikasi (klien atau server)? Apakah ada salt unik per pengguna?
- Apakah peran (mis. teknisi vs atasan, UserRoleSwitcher) ditegakkan di SERVER/aturan database, atau hanya disembunyikan di tampilan? Telusuri: apakah pengguna biasa bisa mengakses atau mengubah data/peran lain lewat DevTools atau permintaan langsung?
- Manajemen sesi: penyimpanan token, masa berlaku, logout, pembatasan percobaan login (brute force).

### B. Data & Database
- Periksa aturan keamanan Firestore (`firestore.rules`) jika ada: aturan terbuka (`allow read, write: if true`), aturan tanpa cek autentikasi/peran, atau validasi data yang lemah.
- Data sensitif apa saja yang tersimpan, dan di mana (localStorage, Firestore, log)? Apakah data riil lama di localStorage termigrasi dengan aman tanpa duplikat atau kebocoran?

### C. Secret & Konfigurasi
- Cari secret yang tertanam di kode atau riwayat Git (API key, token, kredensial). Periksa file `.env` dan apakah masuk `.gitignore`.
- Bedakan konfigurasi publik yang memang aman di klien (mis. config web Firebase) dari secret yang tidak boleh ada di klien.

### D. Kerentanan Aplikasi Web
- XSS (penggunaan `dangerouslySetInnerHTML`, render input pengguna tanpa sanitasi), injeksi, CSRF, open redirect.
- Validasi dan sanitasi input di form dan di sisi server.
- Header keamanan dan CSP, konfigurasi CORS, HTTPS.
- Upload file (jika ada): validasi tipe dan ukuran.

### E. Dependency
- Jalankan `npm audit` (atau padanannya) dan laporkan kerentanan beserta tingkat keparahan, paket yang terdampak, dan versi perbaikannya.

### F. Integrasi Eksternal
- Periksa TicketIntegrationHub dan integrasi lain: bagaimana kredensial disimpan, data apa yang dikirim keluar, apakah ada validasi respons.

## FASE 3 - AUDIT PERFORMA

- Ukuran bundle: jalankan build produksi, laporkan ukuran total dan per chunk, dependency terbesar, dan peluang code splitting / lazy loading (per halaman dan modal).
- Render React: komponen yang sering render ulang tanpa perlu, state yang terlalu tinggi, list panjang tanpa virtualisasi/pagination, penggunaan `useMemo`/`useCallback` yang tepat atau berlebihan.
- Data & Firestore: query tanpa filter/limit, pembacaan berulang, listener real-time yang tidak dibersihkan (memory leak), potensi biaya baca berlebihan, kebutuhan index.
- Aset: ukuran gambar/font, caching, kompresi.
- Recharts dan tabel besar: biaya render pada data banyak.
- Tema gelap/terang: apakah transisi warna menimbulkan lag.
- Jika memungkinkan, jalankan Lighthouse dan laporkan skor serta metrik utama (LCP, CLS, TBT).

## FASE 4 - KUALITAS & KEANDALAN

- Penanganan error (error boundary, kegagalan jaringan, status offline).
- Backup dan pemulihan data: apakah ada, dan seberapa mudah data hilang karena kesalahan pengguna?
- Konsistensi data saat banyak pengguna mengubah barang yang sama (race condition stok masuk/keluar). Apakah memakai transaksi?
- Log/audit trail: apakah perubahan stok bisa ditelusuri siapa yang melakukan?
- Aksesibilitas dasar dan penggunaan di HP (teknisi di lapangan).

## FASE 4B - DOKUMENTASI PROGRAM

Buat dokumentasi berdasarkan kode yang BENAR-BENAR ada. Jangan mengarang: jika sesuatu tidak bisa diverifikasi dari kode, tulis "Belum diketahui, perlu dikonfirmasi" di tempatnya. Tulis dalam Bahasa Indonesia yang sederhana; bagian panduan pengguna harus mudah dipahami orang non-programmer.

File yang dibuat:

1. **README.md** (root)
   - Apa itu FieldOps IT dan masalah yang diselesaikan.
   - Fitur utama dan teknologi yang dipakai (ringkas).
   - Cara menjalankan di komputer lokal, langkah demi langkah: prasyarat, instalasi, variabel lingkungan, perintah jalan/build.
   - Tautan ke dokumen lain di `docs/`.

2. **docs/ARSITEKTUR.md**
   - Gambaran besar sistem (diagram teks/Mermaid): klien, server/Firestore, integrasi eksternal.
   - Struktur folder dan fungsi tiap folder/file penting.
   - Alur data: dari aksi pengguna sampai tersimpan, termasuk proses migrasi dari localStorage ke server.
   - Peran tiap komponen utama dan hubungan antar komponen.
   - State management dan ThemeContext.

3. **docs/DATA.md**
   - Model data: koleksi/tabel, field, tipe, dan relasinya.
   - Kunci localStorage (`fieldops_inventory_*`) dan fungsinya.
   - Aturan bisnis: cara stok masuk/keluar dihitung, status barang, checklist tas lapangan, dan laporan mingguan.

4. **docs/PERAN_DAN_AKSES.md**
   - Daftar peran (mis. teknisi, atasan/bos) dan apa yang boleh/tidak boleh dilakukan tiap peran.
   - Di mana aturan itu ditegakkan (tampilan saja atau juga server).
   - Alur login, penyimpanan sesi, dan penanganan password (tanpa nilai rahasia apa pun).

5. **docs/PANDUAN_PENGGUNA.md**
   - Untuk pengguna kantor, bukan programmer.
   - Cara login, melihat stok, mencatat barang masuk/keluar, memakai checklist tas lapangan, melihat laporan mingguan, mengganti tema terang/gelap.
   - Pertanyaan yang sering muncul dan cara mengatasinya.

6. **docs/DEPLOY_DAN_OPERASIONAL.md**
   - Cara build dan deploy, lingkungan yang dipakai, dan daftar variabel lingkungan (nama dan fungsinya saja, TANPA nilai).
   - Cara backup dan memulihkan data.
   - Langkah saat terjadi masalah umum (tidak bisa login, data tidak muncul, build gagal).

7. **docs/TEMA_DAN_DESAIN.md**
   - Sistem design tokens dan tema terang/gelap: daftar token, artinya, dan cara memakainya.
   - Aturan: semua warna baru WAJIB memakai token, tidak boleh hardcoded.

8. **AGENTS.md** (root)
   - Panduan khusus untuk agent AI yang bekerja di proyek ini: struktur proyek, perintah penting, konvensi kode, aturan warna (wajib token), hal yang tidak boleh diubah (mis. PBKDF2 100.000 iterasi SHA-256, struktur data yang sudah dipakai data riil), dan cara memverifikasi pekerjaan sebelum dianggap selesai.
   - Rujuk `REFACTORING_GUIDE.md` bila ada, jangan menggandakan isinya.

9. **docs/CHANGELOG.md**
   - Riwayat perubahan besar yang bisa ditelusuri dari Git (refaktor arsitektur, tema gelap/terang, dll.).

Aturan dokumentasi:
- Setiap klaim teknis harus bisa ditelusuri ke kode. Cantumkan rujukan path file untuk bagian teknis penting.
- Jangan mencantumkan secret, kredensial, atau temuan kerentanan.
- Jangan menyalin isi kode panjang; cukup potongan pendek yang perlu.
- Di akhir tiap dokumen tulis tanggal terakhir diperbarui.
- Beri daftar bagian yang berstatus "Belum diketahui" agar saya bisa melengkapinya.

## FASE 5 - LAPORAN (AUDIT_REPORT.md)

Struktur laporan:

1. **Ringkasan eksekutif**: 5-10 baris, kondisi umum dan 3 risiko terbesar.
2. **Inventaris teknologi** (tabel: nama, versi, versi terbaru, status).
3. **Temuan keamanan, performa, dan kualitas.** Tiap temuan berisi: ID, judul, tingkat (KRITIS / TINGGI / SEDANG / RENDAH), bukti (file:baris atau output), dampak nyata untuk aplikasi ini, saran perbaikan, dan perkiraan usaha (kecil/sedang/besar).
4. **Hal yang sudah baik** (agar tidak dirombak tanpa perlu).
5. **Rencana perbaikan berurutan** berdasarkan prioritas (dampak tinggi, usaha kecil lebih dulu), dikelompokkan menjadi: "Kerjakan sekarang", "Kerjakan bulan ini", "Opsional".
6. **Hal yang tidak bisa diverifikasi** dan perlu saya cek manual.
7. **Daftar dokumentasi yang dibuat**, bagian yang berstatus "Belum diketahui", dan ketidaksesuaian yang ditemukan antara kode dan dokumentasi/panduan lama (mis. `REFACTORING_GUIDE.md`).

---

## SETELAH LAPORAN SELESAI

Berhenti. Jangan memperbaiki apa pun pada kode sampai saya memilih temuan mana yang dikerjakan.
