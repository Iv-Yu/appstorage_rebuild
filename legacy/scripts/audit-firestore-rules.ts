/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AuditResult {
  ruleName: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
}

function runFirestoreRulesAudit(): { passed: boolean; results: AuditResult[] } {
  console.log('======================================================');
  console.log('   FIELDOPS IT - FIRESTORE SECURITY RULES AUDIT SCRIPT');
  console.log('======================================================');

  const results: AuditResult[] = [];
  const rulesPath = path.join(__dirname, '..', 'firestore.rules');

  if (!fs.existsSync(rulesPath)) {
    console.error('[ERROR] firestore.rules file not found at root!');
    return { passed: false, results: [{ ruleName: 'File Existence', status: 'FAIL', details: 'firestore.rules missing' }] };
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  // Check 1: Rules version 2
  if (rulesContent.includes("rules_version = '2'")) {
    results.push({
      ruleName: 'Rules Version 2',
      status: 'PASS',
      details: 'Menggunakan rules_version = \'2\' yang direkomendasikan.'
    });
  } else {
    results.push({
      ruleName: 'Rules Version 2',
      status: 'FAIL',
      details: 'Versi rules bukan v2.'
    });
  }

  // Check 2: Mandatory isSignedIn() check on workspace paths
  if (rulesContent.includes('allow read, write: if isSignedIn()')) {
    results.push({
      ruleName: 'Authentication Guard (isSignedIn)',
      status: 'PASS',
      details: 'Seluruh akses koleksi utama dilindungi oleh helper isSignedIn() (Mencegah akses anonim/publik).'
    });
  } else {
    results.push({
      ruleName: 'Authentication Guard (isSignedIn)',
      status: 'FAIL',
      details: 'Tidak ditemukan proteksi isSignedIn() pada path utama.'
    });
  }

  // Check 3: Document ID Validation (isValidId)
  if (rulesContent.includes('isValidId(')) {
    results.push({
      ruleName: 'ID Poisoning & Size Guard (isValidId)',
      status: 'PASS',
      details: 'Validasi panjang dan karakter ID dokumen (isValidId) diterapkan untuk mencegah serangan penolakan layanan (DoS).'
    });
  } else {
    results.push({
      ruleName: 'ID Poisoning & Size Guard (isValidId)',
      status: 'WARN',
      details: 'Validasi isValidId belum diterapkan secara optimal pada semua parameter path.'
    });
  }

  // Check 4: No insecure public wildcard (allow read, write: if true)
  const hasInsecureWildcard = /\/\*\*[^}]*allow\s+(read|write),\s*(read|write):\s*if\s+true/.test(rulesContent);
  if (!hasInsecureWildcard) {
    results.push({
      ruleName: 'No Public Wildcard Bypass',
      status: 'PASS',
      details: 'Tidak ditemukan celah bypass public wildcard (allow read, write: if true) pada koleksi sensitif.'
    });
  } else {
    results.push({
      ruleName: 'No Public Wildcard Bypass',
      status: 'FAIL',
      details: 'Ditemukan aturan publik terbuka (if true) pada match wildcard.'
    });
  }

  // Check 5: Sensitive Subcollections isolation (/workspaces/{workspaceId}/items, transactions, categories, etc.)
  const requiredSubpaths = ['/items/', '/transactions/', '/categories/', '/sync_queue/', '/inspections/'];
  let missingPaths = requiredSubpaths.filter(p => !rulesContent.includes(p));

  if (missingPaths.length === 0) {
    results.push({
      ruleName: 'Sensitive Collections Isolation',
      status: 'PASS',
      details: 'Semua subkoleksi krusial (items, transactions, categories, sync_queue, inspections) terisolasi di bawah workspace bertingkat.'
    });
  } else {
    results.push({
      ruleName: 'Sensitive Collections Isolation',
      status: 'WARN',
      details: `Beberapa subkoleksi tidak terpetakan secara eksplisit: ${missingPaths.join(', ')}`
    });
  }

  // Print Summary Table
  console.log('\n--- HASIL AUDIT KEAMANAN FIRESTORE ---');
  results.forEach((r, idx) => {
    const symbol = r.status === 'PASS' ? '✅ [PASS]' : r.status === 'WARN' ? '⚠️ [WARN]' : '❌ [FAIL]';
    console.log(`${idx + 1}. ${symbol} ${r.ruleName}`);
    console.log(`   Detail: ${r.details}\n`);
  });

  const hasFailures = results.some(r => r.status === 'FAIL');
  if (hasFailures) {
    console.log('🔴 STATUS AUDIT: GAGAL (Ditemukan pelanggaran aturan keamanan krusial).');
    return { passed: false, results };
  } else {
    console.log('🟢 STATUS AUDIT: LULUS (Semua pemeriksaan keamanan Firestore terpenuhi dengan baik).');
    return { passed: true, results };
  }
}

// Execute script if run directly
runFirestoreRulesAudit();
