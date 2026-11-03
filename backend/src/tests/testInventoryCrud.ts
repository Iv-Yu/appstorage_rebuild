/**
 * Unit Test: Inventory & Category CRUD
 * FieldOps IT Inventory Rebuild - Tahap 3 Iterasi 1
 */

import { initDatabase, executeQuery } from '../db/database';
import { InventoryService } from '../services/inventoryService';

async function runTest() {
  console.log('--- [TEST ITERASI 1] Inisialisasi Database ---');
  await initDatabase();

  const testOperatorId = 'usr-admin-test';

  // 1. Uji Ambil Kategori
  const categories = await InventoryService.getAllCategories();
  console.log(`✅ Kategori awal terambil: ${categories.length} kategori.`);
  if (categories.length === 0) throw new Error('Kategori awal kosong.');

  // 2. Uji Tambah Kategori Baru
  const newCat = await InventoryService.createCategory('OPT', 'Fiber Optik Lapangan', 'Patchcord SC-UPC, SFP, pigtail');
  console.log(`✅ Sukses buat kategori baru: [${newCat.code}] ${newCat.name}`);

  // 3. Uji Tambah Item Baru
  const newItem = await InventoryService.createItem({
    sku: `TEST-SFP-1G-${Date.now().toString().slice(-4)}`,
    name: 'SFP Transceiver 1.25G 20KM 1310nm Single Mode',
    category_id: newCat.id,
    quantity: 10,
    min_stock_alert: 3,
    unit: 'pcs',
    location: 'Rak B-04',
    unit_cost: 95000
  }, testOperatorId);
  console.log(`✅ Sukses tambah barang baru: [${newItem.sku}] ${newItem.name} (Qty: ${newItem.quantity})`);

  // 4. Uji Update Item
  const updated = await InventoryService.updateItem(newItem.id, {
    quantity: 2, // Seharusnya memicu status LOW_STOCK
    unit_cost: 99000
  }, testOperatorId);
  if (updated.status !== 'LOW_STOCK') {
    throw new Error(`Status stok salah: Diharapkan LOW_STOCK, didapat ${updated.status}`);
  }
  console.log(`✅ Sukses update barang. Status otomatis berubah menjadi: ${updated.status}`);

  // 5. Uji Soft Delete
  await InventoryService.deleteItem(newItem.id, testOperatorId);
  const activeItems = await InventoryService.getAllItems(false);
  if (activeItems.some(it => it.id === newItem.id)) {
    throw new Error('Barang yang di-soft-delete masih muncul di daftar aktif.');
  }
  console.log('✅ Sukses soft delete: Barang tidak muncul di daftar aktif.');

  // 6. Uji Restore
  await InventoryService.restoreItem(newItem.id, testOperatorId);
  const restoredItems = await InventoryService.getAllItems(false);
  if (!restoredItems.some(it => it.id === newItem.id)) {
    throw new Error('Barang gagal dipulihkan.');
  }
  console.log('✅ Sukses restore: Barang kembali muncul di daftar aktif.');

  console.log('\n🎉 PENGUJIAN ITERASI 1 (MASTER BARANG & KATEGORI) LOLOS 100%!\n');
}

runTest().catch(err => {
  console.error('Test Iterasi 1 Gagal:', err);
  process.exit(1);
});
