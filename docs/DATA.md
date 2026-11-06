# Struktur Data & Skema Database MariaDB 11.x - FieldOps IT (v1.1.0)

Dokumen ini menjelaskan model data relasional, skema tabel MariaDB 11.x, mekanisme **Soft Delete**, aturan kalkulasi stok mutasi atomik, dan kebijakan proteksi data pada **FieldOps IT**.

---

## 🗄️ 1. Skema Database Relasional MariaDB 11.x

Penyimpanan sistem menggunakan database relasional **MariaDB 11.4 LTS** on-premises yang terbagi ke dalam skema terisolasi:

### A. Skema Data Akun & Sesi (`01_auth_schema.sql`)

#### 1. Tabel `users`
Menyimpan akun pengguna internal kantor (Superadmin, Supervisor, Admin, Teknisi).

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Primary Key unik pengguna |
| `username` | `VARCHAR(64)` | Username unik untuk login (case-insensitive) |
| `name` | `VARCHAR(128)` | Nama lengkap pengguna |
| `email` | `VARCHAR(128)` | Alamat email unik pengguna |
| `role` | `ENUM(...)` | Peran: `'technician'`, `'admin'`, `'supervisor'`, `'superadmin'` |
| `department` | `VARCHAR(128)` | Departemen / divisi kantor |
| `phone` | `VARCHAR(32)` | Nomor telepon / WhatsApp staf |
| `password_hash` | `VARCHAR(256)` | Hash PBKDF2 atau plain-text terenkripsi internal |
| `salt` | `VARCHAR(64)` | Salt acak 16-byte |
| `status` | `ENUM(...)` | Status akun: `'ACTIVE'`, `'SUSPENDED'`, `'PENDING_APPROVAL'` |
| `created_at` | `TIMESTAMP` | Waktu pembuatan akun |
| `updated_at` | `TIMESTAMP` | Waktu pembaruan akun terakhir |

#### 2. Tabel `sessions`
Menyimpan sesi aktif pengguna berbasis cookie HTTP-Only server-authoritative.

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `session_id` | `VARCHAR(64)` | Primary Key token sesi 32-byte acak |
| `user_id` | `VARCHAR(36)` | Foreign Key terhubung ke tabel `users(id)` |
| `ip_address` | `VARCHAR(45)` | Alamat IP klien saat masuk |
| `user_agent` | `TEXT` | Perangkat / browser klien |
| `expires_at` | `TIMESTAMP` | Waktu kedaluwarsa sesi (7 hari) |
| `created_at` | `TIMESTAMP` | Waktu login pengguna |

---

### B. Skema Master Inventori & Transaksi (`02_inventory_schema.sql`)

#### 1. Tabel `items` (Dukungan Soft Delete)
Menyimpan katalog suku cadang dan material IT.

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Primary Key unik barang |
| `sku` | `VARCHAR(64)` | Stock Keeping Unit / Kode SKU barang |
| `barcode` | `VARCHAR(64)` | Barcode fisik scanner |
| `name` | `VARCHAR(191)` | Nama suku cadang / material |
| `category_id` | `VARCHAR(36)` | Foreign Key ke tabel `categories(id)` |
| `quantity` | `INT` | Sisa stok fisik tersedia saat ini |
| `min_stock_alert`| `INT` | Ambang batas peringatan stok kritis |
| `unit` | `VARCHAR(32)` | Satuan barang (Pcs, Roll, Box, dsb.) |
| `location` | `VARCHAR(64)` | Posisi rak / gudang penyimpanan |
| `specs` | `TEXT` | Spesifikasi detail suku cadang |
| `unit_cost` | `DECIMAL(12,2)` | Estimasi harga satuan pengadaan |
| `status` | `ENUM(...)` | Status: `'NORMAL'`, `'LOW_STOCK'`, `'OUT_OF_STOCK'` |
| `is_deleted` | `BOOLEAN` | **Flag Soft Delete**: `TRUE` jika berada di Kotak Sampah |
| `deleted_at` | `TIMESTAMP NULL`| **Timestamp Soft Delete**: Waktu barang dinonaktifkan |
| `created_at` | `TIMESTAMP` | Waktu barang ditambahkan |
| `updated_at` | `TIMESTAMP` | Waktu data barang diubah |

> 💡 **Prinsip Soft Delete**: Ketika barang dihapus dari katalog, sistem mengeksekusi `UPDATE items SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE id = ?`. Barang dipindahkan ke antarmuka **Kotak Sampah** dan tidak dapat digunakan untuk mutasi baru, namun seluruh data historis mutasi tetap valid dan utuh.

#### 2. Tabel `categories`
Kategori suku cadang (Fiber Optic, Wireless Radio, Router/Switch, CCTV, dsb.).

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Primary Key kategori |
| `code` | `VARCHAR(32)` | Kode kategori unik (misal: `FO`, `NET`) |
| `name` | `VARCHAR(128)` | Nama lengkap kategori |
| `description` | `TEXT` | Penjelasan isi kategori |

#### 3. Tabel `transactions`
Log mutasi atomik pergerakan barang.

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Primary Key transaksi mutasi |
| `type` | `ENUM('IN','OUT','ADJUST')` | Tipe mutasi (Masuk, Keluar, Penyesuaian) |
| `item_id` | `VARCHAR(36)` | Referensi ke tabel `items(id)` |
| `quantity` | `INT` | Jumlah unit yang dimutasi |
| `previous_qty` | `INT` | Sisa stok sebelum mutasi |
| `new_qty` | `INT` | Sisa stok sesudah mutasi |
| `reference_type` | `VARCHAR(32)` | Sumber: `'TICKET'`, `'MANUAL'`, `'PO'`, `'AUDIT'` |
| `reference_number` | `VARCHAR(64)` | Nomor tiket SPK / surat jalan |
| `recipient_destination` | `VARCHAR(128)` | Nama teknisi / lokasi pemasangan pelanggan |
| `user_id` | `VARCHAR(36)` | User yang mencatat transaksi |
| `notes` | `TEXT` | Catatan transaksi |
| `created_at` | `TIMESTAMP` | Waktu pencatatan mutasi |

---

### D. Skema Fondasi v2 & Keamanan (`04_v2_foundation_schema.sql`)

#### 1. Tabel `sesi` (Server-Authoritative Sesi & Rotasi Token)
Menyimpan catatan sesi server terisolasi dengan rotasi refresh token dan validasi perangkat (Device ID Hash).

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | Primary Key unik token sesi |
| `user_id` | `VARCHAR(36)` | Foreign Key terhubung ke tabel `users(id)` |
| `refresh_hash` | `VARCHAR(128)` | Hash SHA-256 token penyegar aktif |
| `device_id_hash` | `VARCHAR(128)` | Hash SHA-256 ID perangkat peramban |
| `user_agent` | `TEXT` | Informasi peramban & OS pengguna |
| `ip` | `VARCHAR(45)` | Alamat IP koneksi terakhir |
| `dibuat_pada` | `TIMESTAMP` | Waktu sesi pertama kali dibuat |
| `aktivitas_terakhir` | `TIMESTAMP` | Waktu aktivitas mutasi/kueri terakhir |
| `kedaluwarsa_mutlak` | `TIMESTAMP` | Batas kedaluwarsa mutlak sesi (12 jam) |
| `dicabut_pada` | `TIMESTAMP NULL` | Waktu sesi dicabut (logout / kuota / token reuse) |

#### 2. Tabel `pengaturan` (Konfigurasi Dinamis Bebas Hardcode)
Menyimpan parameter konfigurasi dan ambang batas sistem.

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `kunci` | `VARCHAR(80)` | Primary Key nama konfigurasi |
| `nilai` | `TEXT` | Nilai konfigurasi (string/angka/JSON) |
| `keterangan` | `TEXT` | Penjelasan fungsi parameter |
| `diperbarui_pada` | `TIMESTAMP` | Waktu pembaruan terakhir |

#### 3. Tabel `transaksi` & `transaksi_detail` (Append-Only Mutasi Format AKT)
Mencatat seluruh transaksi perpindahan/mutasi suku cadang dengan format ID Aktivitas `AKT-YYYYMMDD-NNNN`.

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Primary Key transaksi |
| `id_aktivitas` | `VARCHAR(32)` | ID Aktivitas unik harian (`AKT-YYYYMMDD-NNNN`) |
| `aksi` | `VARCHAR(64)` | Jenis aksi mutasi (`tambah`, `keluar`, `pindah_box`, dsb.) |
| `pelaku_id` | `VARCHAR(36)` | ID pengguna yang mengeksekusi mutasi |
| `penyetuju_id` | `VARCHAR(36) NULL` | ID pengguna yang menyetujui mutasi (jika ada) |
| `request_id` | `VARCHAR(36) NULL` | ID permintaan teknisi terkait |
| `box_asal` / `box_tujuan` | `VARCHAR(32) NULL` | Kode box penyimpanan asal & tujuan |
| `catatan` | `TEXT NULL` | Keterangan pekerjaan / tiket |
| `waktu` | `TIMESTAMP` | Waktu pencatatan mutasi di server |

#### 4. Tabel `sampah_hapus` (Permanent Delete Lapis 2 dengan Retensi 14 Hari)
Menyimpan snapshot data terhapus permanen sebelum dimusnahkan secara otomatis.

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Primary Key unik entri sampah |
| `jenis_objek` | `VARCHAR(32)` | Jenis entri: `'item'`, `'produk'`, `'tipe'`, `'box'`, `'akun'` |
| `objek_id` | `VARCHAR(64)` | ID asli objek saat aktif |
| `snapshot` | `LONGTEXT` | Snapshot JSON objek asli dan seluruh relasi turunannya |
| `dihapus_oleh` | `VARCHAR(36)` | Pengguna yang melakukan penghapusan |
| `dihapus_pada` | `TIMESTAMP` | Waktu eksekusi penghapusan |
| `aktivitas_id` | `VARCHAR(32)` | ID Aktivitas log transaksi terkait |
| `purge_setelah` | `TIMESTAMP` | Batas kedaluwarsa simpan (`dihapus_pada` + 14 hari) |
| `status` | `VARCHAR(32)` | Status: `'menunggu'`, `'dipulihkan'`, `'dibersihkan'` |

#### 5. Tabel `token_konfirmasi` (Konfirmasi Sensitif Bertingkat)
Menyimpan token verifikasi sekali pakai (*single-use*, TTL 120 detik) untuk penegakan keamanan di server.

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | Primary Key ID token |
| `token_hash` | `VARCHAR(128)` | Hash SHA-256 token rahasia |
| `user_id` | `VARCHAR(36)` | ID pengguna yang meminta konfirmasi |
| `action_type` | `VARCHAR(64)` | Jenis aksi (`request_approve`, `permanent_delete`, dsb.) |
| `target_id` | `VARCHAR(64)` | ID objek sasaran aksi |
| `tier` | `INT` | Tingkat konfirmasi (`2` atau `3`) |
| `expires_at` | `TIMESTAMP` | Waktu kedaluwarsa token (120 detik) |
| `used_at` | `TIMESTAMP NULL` | Waktu token dikonsumsi (anti-replay) |

---

### E. Skema Katalog Bertingkat v2 (`05_v2_catalog_schema.sql`)

Struktur katalog bertingkat menggantikan kategori datar menjadi hierarki dinamis: `Jenis` -> `Atribut` -> `Produk` -> `Tipe` (Varian) -> `Item` (Fisik) / `Stok Jumlah`.

#### 1. Tabel `jenis` (Golongan Besar Katalog)
Menyimpan pengelompokan utama suku cadang (Adaptor, Kabel, Modem/ONU, Router, SFP, dsb.).

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `INT UNSIGNED AUTO_INCREMENT` | Primary Key unik jenis |
| `nama` | `VARCHAR(80)` | Nama jenis (unik) |
| `sumber_id_bawaan` | `VARCHAR(32)` | Sumber ID bawaan (`scan_sn`, `otomatis`, `manual`, `tanpa_id`) |
| `prefix_id_bawaan` | `VARCHAR(10) NULL` | Prefix ID bawaan (misal: `ADP`, `MOD`) |
| `aktif` | `TINYINT(1)` | Status aktif (`1` = aktif, `0` = nonaktif) |
| `dibuat_pada` | `DATETIME` | Waktu pembuatan jenis |

#### 2. Tabel `atribut` & `atribut_opsi` (Definisi Spesifikasi Dinamis)
Kolom spesifikasi yang didefinisikan per Jenis (Tegangan, Arus, Jenis Jack, Jaringan, dsb.).

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `INT UNSIGNED AUTO_INCREMENT` | Primary Key unik atribut |
| `jenis_id` | `INT UNSIGNED` | Foreign Key ke `jenis(id)` |
| `kode` | `VARCHAR(40)` | Kode teknis atribut (misal: `tegangan`, `arus`) |
| `nama` | `VARCHAR(80)` | Nama label tampilan (misal: "Tegangan", "Arus Listrik") |
| `tipe_isian` | `VARCHAR(20)` | Tipe data isian: `'angka'`, `'pilihan'`, `'teks'` |
| `satuan` | `VARCHAR(16) NULL` | Satuan nilai numerik (`V`, `A`, `m`, `dBm`, dsb.) |
| `wajib` | `TINYINT(1)` | Wajib diisi saat membuat tipe baru (`1` = wajib) |
| `urutan` | `SMALLINT` | Urutan tampilan dan urutan nama tipe |
| `masuk_nama` | `TINYINT(1)` | Apakah nilai atribut digabungkan ke nama tipe otomatis |

Untuk `tipe_isian = 'pilihan'`, opsi nilai disimpan di `atribut_opsi`:
- `id`: Primary key opsi
- `atribut_id`: Foreign key ke `atribut(id)`
- `nilai`: Nilai opsi (misal: `1A`, `2A`, `3A`, `Jack 5.5mm`, `5G`)
- `urutan`: Urutan sorting opsi

#### 3. Tabel `produk` (Induk di Katalog)
Menyimpan produk payung (misal: Adaptor 12V, Kabel UTP Cat6, MikroTik RB750Gr3).

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `INT UNSIGNED AUTO_INCREMENT` | Primary Key unik produk |
| `jenis_id` | `INT UNSIGNED` | Foreign Key ke `jenis(id)` |
| `nama` | `VARCHAR(120)` | Nama produk (unik per jenis) |
| `kategori` | `VARCHAR(32)` | Kategori perputaran: `'fast_moving'` atau `'recycle'` |
| `catatan` | `TEXT NULL` | Keterangan produk |
| `aktif` | `TINYINT(1)` | Status aktif |
| `dibuat_oleh` | `VARCHAR(36) NULL` | User pembuat produk |
| `dibuat_pada` | `DATETIME` | Waktu dibuat |

#### 4. Tabel `tipe` (Varian Spesifik Produk)
Varian konkret tempat stok dihitung (misal: `12V / 1A`, `12V / 3A / jack 5.5mm`).

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `INT UNSIGNED AUTO_INCREMENT` | Primary Key varian tipe |
| `produk_id` | `INT UNSIGNED` | Foreign Key ke `produk(id)` |
| `nama_tipe` | `VARCHAR(160)` | Nama varian (dibuat otomatis dari atribut yang `masuk_nama`) |
| `catatan` | `VARCHAR(255) NULL` | Catatan khusus varian |
| `sumber_id` | `VARCHAR(32)` | Aturan ID: `'scan_sn'`, `'otomatis'`, `'manual'`, `'tanpa_id'` |
| `mode_stok` | `VARCHAR(32)` | Mode pencatatan stok: `'per_id'` atau `'jumlah'` |
| `prefix_id` | `VARCHAR(10) NULL` | Awalan kode otomatis (misal: `ADP12-`) |
| `pola_id` | `VARCHAR(200) NULL` | Regex validasi ID item fisik (misal: `^SN[0-9]{8}$`) |
| `id_dikunci` | `TINYINT(1)` | Penguncian aturan ID setelah ada stok masuk (`1` = terkunci) |
| `aktif` | `TINYINT(1)` | Status aktif |

#### 5. Tabel `tipe_nilai` (Penyimpanan Nilai Atribut Spesifik)
Menyimpan relasi nilai EAV (Entity-Attribute-Value) per tipe:
- `tipe_id`: Foreign key ke `tipe(id)`
- `atribut_id`: Foreign key ke `atribut(id)`
- `nilai_angka`: Nilai desimal (jika tipe atribut `'angka'`)
- `opsi_id`: Foreign key ke `atribut_opsi(id)` (jika tipe atribut `'pilihan'`)
- `nilai_teks`: Nilai teks bebas (jika tipe atribut `'teks'`)

---

### F. Skema Box, Item Fisik & Stok Jumlah v2 (`06_v2_stock_schema.sql`)

Struktur penyimpanan fisik berbasis Box campuran, pemindaian ID item unik, dan stok jumlah bulk.

#### 1. Tabel `box` (Storage Box Penyimpanan)
Menyimpan lokasi storage box di gudang kantor (dapat berisi produk campuran).

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Primary Key unik box |
| `kode` | `VARCHAR(32)` | Kode box unik (misal: `BOX-A-01`, `BIN-22`) |
| `keterangan` | `VARCHAR(255) NULL` | Keterangan posisi rak / lokasi fisik |
| `aktif` | `TINYINT(1)` | Status aktif |
| `dibuat_pada` | `DATETIME` | Waktu pembuatan box |

#### 2. Tabel `item` (Barang Fisik Ber-ID Unik)
Menyimpan fisik unit barang yang memiliki ID unik (Serial Number, Otomatis, atau Manual).

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Primary Key unik unit item |
| `kode_id` | `VARCHAR(120)` | ID/SN item fisik (Unik di seluruh sistem) |
| `tipe_id` | `INT UNSIGNED` | Foreign Key ke `tipe(id)` |
| `box_id` | `VARCHAR(36)` | Foreign Key ke `box(id)` |
| `status` | `VARCHAR(32)` | Status unit: `'aktif'` atau `'keluar'` |
| `dibuat_pada` | `DATETIME` | Waktu pendaftaran stok |

#### 3. Tabel `stok_jumlah` (Stok Non-SN Mode Jumlah)
Menyimpan jumlah stok untuk tipe dengan mode `tanpa_id` per box.

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `tipe_id` | `INT UNSIGNED` | Composite Primary Key `tipe(id)` |
| `box_id` | `VARCHAR(36)` | Composite Primary Key `box(id)` |
| `jumlah` | `INT UNSIGNED` | Jumlah unit stok fisik tersedia |

---

## 📐 2. Aturan Mutasi Stok Atomik

1. **Mutasi Barang Masuk (`IN`)**:
   $$\text{Stok Baru} = \text{Stok Lama} + \text{Jumlah Masuk}$$

2. **Mutasi Barang Keluar (`OUT`)**:
   $$\text{Stok Baru} = \text{Stok Lama} - \text{Jumlah Keluar}$$
   - **Invarian Validasi**: $\text{Jumlah Keluar} \le \text{Stok Lama}$. Jika stok tidak mencukupi, transaksi ditolak dan dibatalkan secara atomik (*Rollback*).

---

## 🛡️ 3. Kebijakan Keamanan Ekspor Data (CWE-1236)

Setiap nilai string yang diekspor ke format CSV, Excel, atau PDF wajib melalui fungsi pembersih:
```typescript
export function sanitizeFormulaInput(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}
```
Karakter pemicu formula eksekusi spreadsheet (`=`, `+`, `-`, `@`, `\t`, `\r`) diprefiks tanda petik tunggal (`'`).
