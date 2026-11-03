# Struktur Data & Model Persistensi - FieldOps IT

Dokumen ini menjelaskan model data, skema koleksi Firestore, struktur kunci `localStorage`, aturan matematika kalkulasi stok, dan kebijakan pengamanan ekspor data pada **FieldOps IT**.

---

## 🗄️ 1. Skema Koleksi Firestore

Penyimpanan jarak jauh menggunakan **Firebase Firestore** dengan koleksi utama sebagai berikut:

### A. Koleksi `inventory_items`
Penyimpanan master barang/suku cadang.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique ID barang (misal: `item_001`) |
| `name` | `string` | Nama barang (misal: "Kabel UTP Cat6 305m") |
| `category` | `string` | Kategori barang ("Network", "Hardware", "CCTV") |
| `sku` | `string` | Stock Keeping Unit / Kode Barang |
| `serialNumber` | `string` | Serial number opsional |
| `quantity` | `number` | Jumlah stok fisik saat ini |
| `minQuantity` | `number` | Ambang batas alert stok minimum |
| `unit` | `string` | Satuan ("Roll", "Pcs", "Box", "Unit") |
| `rackLocation` | `string` | Lokasi posisi rak penyimpanan (misal: "Rak A-02") |
| `description` | `string` | Catatan/deskripsi spesifikasi |
| `imageUrl` | `string` | URL foto barang opsional |
| `updatedAt` | `string` | Timestamp ISO8601 pembaruan terakhir |

---

### B. Koleksi `stock_transactions`
Pencatatan log riwayat mutasi barang masuk, barang keluar, dan penyesuaian stok.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique ID transaksi |
| `itemId` | `string` | ID referensi barang dari `inventory_items` |
| `itemName` | `string` | Snapshot nama barang saat transaksi |
| `type` | `string` | Jenis mutasi: `"IN"` (Masuk), `"OUT"` (Keluar), `"ADJUST"` |
| `quantity` | `number` | Jumlah unit yang dimutasi |
| `previousQty` | `number` | Stok sebelum transaksi |
| `newQty` | `number` | Stok sesudah transaksi (`previousQty ± quantity`) |
| `recipientOrSource`| `string` | Penerima (untuk OUT) atau Vendor/Sumber (untuk IN) |
| `ticketId` | `string` | Nomor tiket/spk terkait (opsional) |
| `notes` | `string` | Catatan/alasan mutasi |
| `createdBy` | `string` | Nama/ID pengguna yang mencatat |
| `timestamp` | `string` | Timestamp ISO8601 waktu mutasi |

---

### C. Koleksi `technician_checklists`
Pencatatan status peralatan dan suku cadang dalam tas lapangan teknisi.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique ID checklist |
| `technicianId` | `string` | ID teknisi pemilik tas |
| `technicianName` | `string` | Nama teknisi |
| `items` | `array` | List object: `{ itemId, itemName, qtyNeeded, qtyPacked, status }` |
| `date` | `string` | Tanggal checklist (YYYY-MM-DD) |
| `isVerified` | `boolean` | Flag verifikasi oleh Supervisor |

---

### D. Koleksi `weekly_reports`
Arsip ringkasan pergerakan stok mingguan.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique ID laporan |
| `weekPeriod` | `string` | Periode minggu (misal: "2026-W42") |
| `totalStockIn` | `number` | Total unit masuk selama 1 minggu |
| `totalStockOut` | `number` | Total unit keluar selama 1 minggu |
| `topMovedItems` | `array` | Ringkasan item paling banyak bergerak |
| `generatedAt` | `string` | Timestamp ISO8601 pembuatan laporan |

---

## 💾 2. Kunci & Struktur `localStorage`

Aplikasi menyimpan state lokal untuk mendukung fungsi offline-first dengan kunci berikut:

| Key Name | Content Structure | Purpose |
| :--- | :--- | :--- |
| `fieldops_inventory_v2` | Array dari object `InventoryItem` | Cache lokal master barang untuk respon UI instan |
| `fieldops_transactions_v2` | Array dari object `StockTransaction` | Cache lokal log mutasi stok |
| `fieldops_theme` | String: `"light"` \| `"dark"` \| `"system"` | Mode preferensi tema tampilan |
| `fieldops_user_session` | Object `{ user, token, role, expiresAt }` | Sesi aktif pengguna setelah login |
| `fieldops_offline_queue` | Array dari object `{ action, payload, timestamp }` | Antrean mutasi offline untuk diautosinkronisasi |

---

## 📐 3. Matematika Stok & Hukum Bisnis

1. **Aturan Mutasi Barang Masuk (Stock In)**:
   $$\text{Stok Baru} = \text{Stok Lama} + \text{Jumlah Masuk}$$
   - `quantity` transaksi bernilai positif.
   - Mengubah status alert `isLowStock = (Stok Baru <= minQuantity)`.

2. **Aturan Mutasi Barang Keluar (Stock Out / Batch Out)**:
   $$\text{Stok Baru} = \text{Stok Lama} - \text{Jumlah Keluar}$$
   - Validasi: $\text{Jumlah Keluar} \le \text{Stok Lama}$. Transaksi ditolak jika stok tidak mencukupi.
   - Peringatan (*Warning Alert*) dipicu otomatis jika $\text{Stok Baru} \le \text{minQuantity}$.

3. **Injeksi Formula Excel/CSV Sanitization (CWE-1236)**:
   Setiap pencetakan kolom teks pada file `.csv` atau `.xlsx` wajib mematuhi sanitasi berikut:
   ```typescript
   export function sanitizeFormulaInput(value: string): string {
     if (typeof value !== 'string') return value;
     const unsafePrefixes = ['=', '+', '-', '@', '\t', '\r'];
     if (unsafePrefixes.some(prefix => value.startsWith(prefix))) {
       return `'${value}`;
     }
     return value;
   }
   ```

---

## 📦 4. Skema File Backup JSON & Restorasi Massal

Cadangan data terstruktur disimpan dalam format JSON pada direktori `/backups` backend dengan skema berikut:

### Format Schema JSON (`fieldops-backup-*.json`)
```json
{
  "version": "0.3.1",
  "timestamp": "2026-11-02T10:00:00.000Z",
  "workspaceId": "default",
  "data": {
    "inventory_items": [ ... ],
    "stock_transactions": [ ... ],
    "technician_checklists": [ ... ],
    "categories": [ ... ],
    "weekly_reports": [ ... ]
  },
  "summary": {
    "totalItems": 15,
    "totalTransactions": 42,
    "totalChecklists": 8,
    "totalCategories": 6
  }
}
```

### Prosedur Batched Writes Restorasi
Restorasi massal diproses melalui `firestoreRestoreService.ts` dengan penulisan batch berukuran maks 350 operasi per transaksi Firestore, disinkronkan langsung ke `workspaces/{workspaceId}/**` dan cache `localStorage` lokal.
