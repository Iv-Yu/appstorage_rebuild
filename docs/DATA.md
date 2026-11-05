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

### C. Skema Audit Trail (`03_audit_trail_schema.sql`)

#### Tabel `audit_logs`
Mencatat seluruh aksi administratif sensitif (penambahan, pembaruan, soft delete, pemulihan, dan hapus permanen).

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `BIGINT AUTO_INCREMENT` | Primary Key log audit |
| `user_id` | `VARCHAR(36)` | Operator yang melakukan aksi |
| `action` | `VARCHAR(64)` | Aksi: `'DELETE_ITEM'`, `'RESTORE_ITEM'`, `'PERMANENT_DELETE_ITEM'`, dsb. |
| `table_name` | `VARCHAR(64)` | Tabel yang terdampak |
| `record_id` | `VARCHAR(64)` | ID baris rekaman |
| `before_state` | `JSON / TEXT` | Snapshot data sebelum perubahan |
| `after_state` | `JSON / TEXT` | Snapshot data sesudah perubahan |
| `ip_address` | `VARCHAR(45)` | Alamat IP operator |
| `created_at` | `TIMESTAMP` | Waktu eksekusi aksi |

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
