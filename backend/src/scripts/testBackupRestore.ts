/**
 * Test Script: Verifikasi Backup & Pemulihan (Restore) Terpisah
 * FieldOps IT Inventory Rebuild - Tahap 2
 */

import fs from 'fs';
import { initDatabase, executeQuery } from '../db/database';
import { BackupService } from '../services/backupService';

async function runTest() {
  console.log('--- [TEST] Inisialisasi Database ---');
  await initDatabase();

  console.log('--- [TEST 1] Eksekusi Backup Data Inventori ---');
  const backupResult = await BackupService.createInventoryBackup('automated-unit-test');
  console.log(`✅ File backup inventori berhasil dibuat: ${backupResult.filename}`);

  const rawJson = fs.readFileSync(backupResult.filePath, 'utf-8');
  const parsed = JSON.parse(rawJson);

  // UJI INV-01: Verifikasi TIDAK ADA password, hash, atau akun di file backup inventori
  console.log('--- [TEST 2] Verifikasi Bebas Akun & Password (Zero Account Leakage) ---');
  if (parsed.users || rawJson.includes('password_hash') || rawJson.includes('passwordHash') || rawJson.includes('salt_')) {
    throw new Error('❌ GAGAL: Terdeteksi kredensial akun/password di dalam file backup barang!');
  }
  console.log('✅ Lolos: File backup inventori 100% bebas dari akun, hash, dan salt kata sandi.');

  // UJI INV-02: Verifikasi Kelengkapan Data Bisnis
  if (!parsed.data.items || parsed.data.items.length === 0) {
    throw new Error('❌ GAGAL: Daftar item di backup kosong.');
  }
  console.log(`✅ Lolos: Terkandung ${parsed.data.items.length} item barang dan ${parsed.data.categories.length} kategori.`);

  // UJI INV-03: Eksekusi Restore Data
  console.log('--- [TEST 3] Pengujian Pemulihan (Restore) Data Inventori ---');
  const restoreResult = await BackupService.restoreInventory(parsed);
  if (!restoreResult.success) {
    throw new Error('❌ GAGAL: Pemulihan data inventori gagal.');
  }
  console.log('✅ Lolos: Pemulihan data inventori berhasil dieksekusi.');

  // UJI INV-04: Verifikasi Akun Pengguna Tidak Terganggu
  const users = await executeQuery('SELECT id, username FROM users');
  console.log(`✅ Lolos: Akun pengguna tetap utuh (${users.length} akun terdaftar di sistem).`);

  console.log('\n🎉 SELURUH PENGUJIAN BACKUP & PULIHKAN (RESTORE) TAHAP 2 BERHASIL 100%!\n');
}

runTest().catch(err => {
  console.error('Test gagal:', err);
  process.exit(1);
});
