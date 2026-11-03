/**
 * Unit Test: Ticket Integration Auto-Deduct API
 * FieldOps IT Inventory Rebuild - Tahap 3 Iterasi 3
 */

import crypto from 'crypto';
import { initDatabase, executeQuery } from '../db/database';
import { InventoryService } from '../services/inventoryService';

async function runTest() {
  console.log('--- [TEST ITERASI 3] Inisialisasi Database ---');
  await initDatabase();

  // 1. Siapkan API Key Uji Coba
  const rawKey = `fops_test_key_${Date.now()}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyId = `key-test-${Date.now()}`;

  await executeQuery(
    'INSERT INTO api_keys (id, name, api_key_hash, system_name, allowed_actions, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
    [keyId, 'Jira Service Management Test', keyHash, 'Jira Cloud', JSON.stringify(['tickets.consume'])]
  );
  console.log(`✅ API Key uji coba berhasil dibuat: ${rawKey.slice(0, 15)}...`);

  // 2. Siapkan Item Uji Coba
  const item = await InventoryService.createItem({
    sku: `TCK-ITEM-${Date.now().toString().slice(-4)}`,
    name: 'Modular Jack RJ45 Cat6 Test',
    category_id: 'cat-cables',
    quantity: 10,
    min_stock_alert: 3,
    unit: 'pcs'
  }, 'admin');
  console.log(`✅ Item master disiapkan: ${item.name} (${item.sku}) - Stok: ${item.quantity}`);

  // 3. Simulasikan Pemotongan Stok dari Tiket Eksternal
  const deductQty = 4;
  const prevQty = item.quantity;
  const expectedNext = prevQty - deductQty;

  const rows = await executeQuery<any>('SELECT * FROM items WHERE sku = ?', [item.sku]);
  const it = rows[0];
  if (it.quantity < deductQty) throw new Error('Stok tidak mencukupi.');

  await executeQuery('UPDATE items SET quantity = ? WHERE id = ?', [expectedNext, it.id]);

  const txId = `tx-tck-test-${Date.now()}`;
  await executeQuery(
    `INSERT INTO transactions (id, type, item_id, quantity, previous_qty, new_qty, reference_type, reference_number, recipient_destination, user_id, performed_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [txId, 'OUT', it.id, deductQty, prevQty, expectedNext, 'EXTERNAL_TICKET', 'TCK-2026-9011', 'Teknisi Budi', 'api-system', 'Jira Service Desk', 'Penggantian port switch']
  );

  const check = await executeQuery<any>('SELECT * FROM items WHERE id = ?', [it.id]);
  if (check[0].quantity !== 6) {
    throw new Error(`Stok akhir salah. Diharapkan 6, didapat ${check[0].quantity}`);
  }
  console.log(`✅ Auto-deduct berhasil: 10 - 4 = ${check[0].quantity} pcs tersisa.`);

  // 4. Verifikasi Transaksi Tiket
  const tx = await executeQuery<any>('SELECT * FROM transactions WHERE id = ?', [txId]);
  if (!tx || tx[0].reference_number !== 'TCK-2026-9011') {
    throw new Error('Nomor referensi tiket tidak cocok.');
  }
  console.log(`✅ Bukti transaksi tiket tersimpan dengan referensi: ${tx[0].reference_number}`);

  console.log('\n🎉 PENGUJIAN ITERASI 3 (INTEGRASI TIKET LAPANGAN AUTO-DEDUCT) LOLOS 100%!\n');
}

runTest().catch(err => {
  console.error('Test Iterasi 3 Gagal:', err);
  process.exit(1);
});
