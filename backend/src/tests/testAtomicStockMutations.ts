/**
 * Unit Test: Atomic Stock Mutations & Negative Stock Prevention
 * FieldOps IT Inventory Rebuild - Tahap 3 Iterasi 2
 */

import { initDatabase, executeQuery } from '../db/database';
import { InventoryService } from '../services/inventoryService';
import { TransactionService } from '../services/transactionService';

async function runTest() {
  console.log('--- [TEST ITERASI 2] Inisialisasi Database ---');
  await initDatabase();

  const testOperator = { id: 'usr-tech-01', name: 'Budi Santoso' };

  // 1. Buat item uji dengan stok awal 5
  const item = await InventoryService.createItem({
    sku: `MUT-TEST-${Date.now().toString().slice(-4)}`,
    name: 'Patch Cord Cat6 UTP 3M Test',
    category_id: 'cat-cables',
    quantity: 5,
    min_stock_alert: 2,
    unit: 'pcs',
    unit_cost: 30000
  }, testOperator.id);
  console.log(`✅ Item uji disiapkan: ${item.name} (Stok awal: ${item.quantity})`);

  // 2. Uji Mutasi Masuk (Stock In +10)
  const inRes = await TransactionService.recordStockIn({
    itemId: item.id,
    quantity: 10,
    referenceNumber: 'PO-TEST-001',
    sourceOrVendor: 'PT Belden Indonesia',
    notes: 'Penerimaan restock kabel'
  }, testOperator);

  if (inRes.item?.quantity !== 15) {
    throw new Error(`Kalkulasi Stock In salah. Diharapkan 15, didapat ${inRes.item?.quantity}`);
  }
  console.log(`✅ Stock In sukses: 5 + 10 = ${inRes.item.quantity} ${inRes.item.unit}`);

  // 3. Uji Mutasi Keluar (Stock Out -12 -> Sisa 3)
  const outRes = await TransactionService.recordStockOut({
    itemId: item.id,
    quantity: 12,
    referenceNumber: 'TICKET-TEST-101',
    recipientOrDestination: 'Kantor Cabang ISP',
    notes: 'Penggantian kabel patch'
  }, testOperator);

  if (outRes.item?.quantity !== 3) {
    throw new Error(`Kalkulasi Stock Out salah. Diharapkan 3, didapat ${outRes.item?.quantity}`);
  }
  console.log(`✅ Stock Out sukses: 15 - 12 = ${outRes.item.quantity} ${outRes.item.unit}`);

  // 4. Uji Proteksi Stok Negatif (Mencoba Stock Out 10 padahal sisa hanya 3)
  console.log('--- [TEST PROTEKSI STOK NEGATIF] ---');
  let threwError = false;
  try {
    await TransactionService.recordStockOut({
      itemId: item.id,
      quantity: 10,
      referenceNumber: 'TICKET-FAIL-999',
      recipientOrDestination: 'Gudang'
    }, testOperator);
  } catch (err: any) {
    threwError = true;
    console.log(`✅ Lolos: Mutasi stok berlebih berhasil dicegah oleh server! Pesan error: "${err.message}"`);
  }

  if (!threwError) {
    throw new Error('❌ GAGAL: Server mengizinkan stok negatif!');
  }

  // 5. Uji Batch Stock Out
  const batchRes = await TransactionService.recordBatchStockOut({
    items: [
      { itemId: item.id, quantity: 2 } // sisa 3 - 2 = 1 (memicu LOW_STOCK)
    ],
    referenceNumber: 'BATCH-001',
    recipientOrDestination: 'BTS Utama'
  }, testOperator);

  if (batchRes.processedItems[0].quantity !== 1) {
    throw new Error(`Kalkulasi batch salah. Diharapkan 1, didapat ${batchRes.processedItems[0].quantity}`);
  }
  if (!batchRes.lowStockAlertTriggered) {
    throw new Error('Alert stok menipis (LOW_STOCK) gagal terpicu.');
  }
  console.log(`✅ Batch Stock Out sukses: Sisa 1 pcs dan alert LOW_STOCK terpicu otomatis.`);

  // 6. Verifikasi Transaksi Tercatat di Database
  const txList = await TransactionService.getAllTransactions(10);
  console.log(`✅ Riwayat transaksi mutasi tersimpan: ${txList.length} transaksi terbaru.`);

  console.log('\n🎉 PENGUJIAN ITERASI 2 (MUTASI STOK ATOMIK & PROTEKSI STOK NEGATIF) LOLOS 100%!\n');
}

runTest().catch(err => {
  console.error('Test Iterasi 2 Gagal:', err);
  process.exit(1);
});
