# Panduan Pengguna (User Manual) - FieldOps IT

Panduan ini ditujukan bagi **Staf Operasional / Admin** dan **Teknisi Lapangan** untuk mengoperasikan aplikasi **FieldOps IT**.

---

## 📱 1. Cara Mengakses & Pengaturan Tampilan Tema

1. Buka URL aplikasi di browser web (atau buka dari ikon PWA di layar utama perangkat).
2. **Mengubah Mode Tampilan (Terang / Gelap / Sistem)**:
   - Gulir ke bagian paling bawah dari menu samping (Sidebar).
   - Pada panel **"PILIH MODE TAMPILAN (THEME)"**, pilih salah satu opsi:
     - ☀️ **Terang**: Menggunakan latar belakang putih terang.
     - 🌙 **Gelap**: Menggunakan warna latar gelap nyaman untuk mata.
     - 🖥️ **Sistem**: Mengikuti pengaturan mode otomatis perangkat Anda.

---

## 📦 2. Pengecekan Stok & Lokasi Rak

1. Masuk ke menu **"Katalog Inventaris"**.
2. Gunakan kolom pencarian untuk mengetik Nama Barang, Kode SKU, atau Serial Number.
3. **Indikator Stok**:
   - 🟢 **Stok Aman**: Jumlah barang di atas batas minimum.
   - 🟡 **Stok Menipis (Alert)**: Jumlah barang berada pada atau di bawah batas minimum (`minQuantity`). Wajib segera dilakukan pengadaan ulang (*reorder*).
4. **Lokasi Rak**: Informasi posisi fisik barang di gudang tertera di kolom **"Lokasi Rak"** (contoh: *Rak A-02*).

---

## 🔄 3. Pencatatan Barang Masuk & Barang Keluar

### A. Pencatatan Barang Masuk (Stock In) - [Khusus Admin / Supervisor]
1. Pilih menu **"Barang Masuk / Keluar"** -> Klik tombol **"+ Tambah Barang Masuk"**.
2. Pilih nama barang dari daftar katalog.
3. Masukkan jumlah unit masuk, nama vendor/sumber barang, dan nomor nota/po.
4. Klik **"Simpan Mutasi"**. Stok barang di katalog akan bertambah secara otomatis.

### B. Pencatatan Barang Keluar (Stock Out)
1. Klik tombol **"- Catat Barang Keluar"**.
2. Pilih barang yang akan diambil.
3. Masukkan jumlah unit, nomor tiket pekerjaan/SPK, dan nama teknisi penerima.
4. Klik **"Proses Barang Keluar"**. System akan memverifikasi kecukupan stok sebelum mengurangi jumlah barang.

---

## 🧰 4. Panduan Checklist Tas Lapangan Teknisi

1. Buka menu **"Checklist Tas Lapangan Teknisi"**.
2. Sebelum berangkat ke lokasi pekerjaan, centang daftar peralatan wajib (misal: Tang Crimp, LAN Tester, Patch Cord).
3. Jika terdapat material yang dikonsumsi untuk perbaikan di lokasi pelanggan:
   - Masukkan jumlah barang yang terpakai.
   - Klik **"Konsumsi Item & Update Stok"** untuk langsung memperbarui katalog stok gudang.

---

## 📊 5. Laporan Mingguan & Ekspor Data

1. Buka menu **"Laporan Pergerakan Mingguan"**.
2. Pilih periode minggu yang ingin ditinjau.
3. Klik **"Ekspor ke Excel"** atau **"Ekspor ke PDF"**.
4. File laporan akan terunduh secara otomatis dengan format yang telah diproteksi dari kelemahan injeksi rumus.

---

## ❓ 6. Pertanyaan Sering Diajukan & Troubleshooting

- **Mengapa data tidak langsung muncul di perangkat teman saya?**
  - Pastikan perangkat Anda terhubung ke koneksi internet. Jika Anda sedang offline, transaksi disimpan sementara dalam antrean lokal dan akan tersinkronisasi otomatis saat internet kembali aktif.
- **Tampilan sidebar terpotong di layar ponsel?**
  - Usap (*swipe*) menu samping ke kiri atau tekan ikon hamburger di pojok kiri atas untuk menutup/membuka menu.
