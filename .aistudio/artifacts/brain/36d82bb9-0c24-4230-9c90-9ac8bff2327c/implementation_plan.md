# Rencana Implementasi - Backup Otomatis Firestore Harian & Soft Delete (v0.3.1+)

## Tujuan Utama
1. **Backup Otomatis Firestore Harian ke JSON**: Menambahkan penjadwalan backend Express 5 (`server.ts`) untuk melakukan ekspor/snapshot otomatis koleksi Firestore (`inventory_items`, `stock_transactions`, `categories`, `users`) setiap 24 jam ke dalam file JSON yang dapat diunduh pengguna melalui menu pengaturan/download.
2. **Fitur Soft Delete & Pemulihan (Trash / Recycle Bin)**:
   - Menambahkan status `deletedAt` atau memindahkan item ke koleksi terpisah `trash_items` saat dihapus.
   - Menyediakan fungsi pemulihan (restore) serta penghapusan permanen bagi Admin/Supervisor.

---

## Langkah-Langkah Implementasi

1. **Backend Express 5 (`server.ts`)**:
   - Menambahkan rute `/api/backup/export` untuk menghasilkan file JSON backup snapshot.
   - Menambahkan penjadwalan harian otomatis (`setInterval` atau node cron / timer) untuk mencatat snapshot backup ke memori/penyimpanan server.
   - Menambahkan endpoint unduh file backup JSON.

2. **Frontend Service & Context (`InventoryContext.tsx` & `firebaseService.ts`)**:
   - Menambahkan fungsi `softDeleteItem(itemId)`, `restoreDeletedItem(itemId)`, dan mengambil daftar item terhapus (`trash_items`).
   - Menambahkan UI manajemen sampah (Trash / Soft Delete Bin) pada menu Katalog/Pengaturan bagi Admin & Supervisor.
   - Menambahkan tombol unduh backup JSON otomatis di modal Download / Pengaturan.

3. **Verifikasi & Build**:
   - Menjalankan `npm run lint` dan `npm run build` untuk memastikan tidak ada galat TypeScript.
