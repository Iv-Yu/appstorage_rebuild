/**
 * Setup Master Admin Script
 * Jalankan di server lokal: npx tsx backend/src/scripts/setupAdmin.ts
 */

import crypto from 'crypto';
import readline from 'readline';
import { executeQuery, initDatabase } from '../db/database';
import { AuthService } from '../services/authService';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('================================================================');
  console.log('  FIELDOPS IT - INISIALISASI AKUN MASTER ADMIN PERTAMA');
  console.log('================================================================\n');

  await initDatabase();

  // Parsing CLI args jika diberikan (--username, --name, --password, --email)
  const args = process.argv.slice(2);
  const argMap: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      argMap[args[i].replace(/^--/, '')] = args[i + 1] || '';
    }
  }

  const username = argMap.username || (await prompt('Masukkan Username [developer / admin]: ')) || 'developer';
  const name = argMap.name || (await prompt('Masukkan Nama Lengkap [Lead System Developer]: ')) || 'Lead System Developer';
  const email = argMap.email || (await prompt('Masukkan Email [developer@fieldops.local]: ')) || 'developer@fieldops.local';
  
  const roleInput = argMap.role || (await prompt('Masukkan Peran Akun [developer / admin / warehouse_admin / technician] (default: developer): ')) || 'developer';
  const role = ['developer', 'admin', 'warehouse_admin', 'technician', 'superadmin', 'supervisor'].includes(roleInput.toLowerCase()) 
    ? (roleInput.toLowerCase() === 'superadmin' ? 'developer' : (roleInput.toLowerCase() === 'supervisor' ? 'admin' : roleInput.toLowerCase()))
    : 'developer';

  let password = argMap.password;
  while (!password || password.trim().length === 0) {
    password = await prompt('Masukkan Kata Sandi: ');
  }

  const existing = await executeQuery<any>('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing.length > 0) {
    console.log(`\n⚠️ User dengan username "${username}" atau email "${email}" sudah ada.`);
    const overwrite = await prompt('Apakah Anda ingin mereset kata sandi dan menetapkan peran ini? (y/N): ');
    if (overwrite.toLowerCase() === 'y') {
      const { hash, salt } = AuthService.hashPassword(password);
      await executeQuery(
        'UPDATE users SET password_hash = ?, salt = ?, role = ?, status = "ACTIVE" WHERE id = ?',
        [hash, salt, role, existing[0].id]
      );
      console.log(`\n✅ Kata sandi & peran (${role}) akun berhasil direset dan langsung AKTIF.`);
    }
    process.exit(0);
  }

  const userId = `usr-master-${Date.now()}`;
  const { hash, salt } = AuthService.hashPassword(password);

  await executeQuery(
    `INSERT INTO users (id, username, name, email, role, department, phone, password_hash, salt, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, username, name, email, role, role === 'developer' ? 'Core Architecture & System Engineering' : 'IT Operations & Warehouse', '', hash, salt, 'ACTIVE']
  );

  console.log('\n✅ Akun Server-Side Berhasil Dibuat!');
  console.log(`   User ID  : ${userId}`);
  console.log(`   Username : ${username}`);
  console.log(`   Email    : ${email}`);
  console.log(`   Peran    : ${role} (Hak Akses Penuh ke Seluruh Fitur)\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('Gagal menjalankan setup admin:', err);
  process.exit(1);
});
