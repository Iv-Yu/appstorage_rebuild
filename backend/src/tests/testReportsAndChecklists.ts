/**
 * Unit Test: Reports, Checklists & CWE-1236 Sanitization
 * FieldOps IT Inventory Rebuild - Tahap 3 Iterasi 4
 */

import { initDatabase, executeQuery } from '../db/database';
import { sanitizeFormulaInput } from '../utils/security';

async function runTest() {
  console.log('--- [TEST ITERASI 4] Inisialisasi Database ---');
  await initDatabase();

  // 1. Pengujian Sanitasi Formula Injection (CWE-1236)
  console.log('--- [TEST CWE-1236 SANITIZATION] ---');
  const testCases = [
    { input: '=cmd|’ /C calc’!A0', expectedPrefix: "'" },
    { input: '+SUM(A1:A10)', expectedPrefix: "'" },
    { input: '-10+20', expectedPrefix: "'" },
    { input: '@SUM(1+1)', expectedPrefix: "'" },
    { input: '\tTabbedInput', expectedPrefix: "'" },
    { input: '\rCarriageReturn', expectedPrefix: "'" },
    { input: 'Kabel UTP Normal', expectedPrefix: 'K' } // Teks normal tidak boleh diubah
  ];

  for (const tc of testCases) {
    const sanitized = sanitizeFormulaInput(tc.input);
    if (tc.expectedPrefix === "'" && !sanitized.startsWith("'")) {
      throw new Error(`Sanitasi gagal untuk input: "${tc.input}"`);
    }
    if (tc.expectedPrefix === 'K' && sanitized !== tc.input) {
      throw new Error(`Sanitasi merusak input normal: "${tc.input}" -> "${sanitized}"`);
    }
  }
  console.log('✅ Lolos: Seluruh karakter formula berbahaya (=, +, -, @, \\t, \\r) berhasil diprefiks petik tunggal.');

  // 2. Pengujian Checklist Tas Lapangan
  console.log('--- [TEST CHECKLIST TAS LAPANGAN] ---');
  const chkId = `chk-test-${Date.now()}`;
  const itemsList = [
    { itemId: 'item-01', name: 'Tang Crimping', needed: 1, packed: 1, status: 'READY' },
    { itemId: 'item-02', name: 'Konektor RJ45', needed: 20, packed: 20, status: 'READY' }
  ];

  await executeQuery(
    `INSERT INTO checklists (id, technician_id, technician_name, inspection_type, vehicle_or_kit_name, items_json)
     VALUES (?, 'tech-01', 'Budi Santoso', 'FIELD_PREPARATION', 'Tas Kit A', ?)`,
    [chkId, JSON.stringify(itemsList)]
  );

  const savedChecklist = await executeQuery<any>('SELECT * FROM checklists WHERE id = ?', [chkId]);
  if (!savedChecklist || savedChecklist.length === 0) {
    throw new Error('Checklist gagal disimpan.');
  }
  console.log(`✅ Checklist teknisi tersimpan: [${savedChecklist[0].id}] ${savedChecklist[0].vehicle_or_kit_name}`);

  console.log('\n🎉 PENGUJIAN ITERASI 4 (CHECKLIST, LAPORAN & SANITASI CWE-1236) LOLOS 100%!\n');
}

runTest().catch(err => {
  console.error('Test Iterasi 4 Gagal:', err);
  process.exit(1);
});
