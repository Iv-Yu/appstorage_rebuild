/**
 * Standalone Migration Runner for MariaDB
 */

import { initDatabase } from './database';

async function run() {
  console.log('[Migration] Menjalankan migrasi skema MariaDB...');
  const res = await initDatabase();
  console.log(`[Migration] Selesai. Mode: ${res.isMariaDb ? 'MariaDB Connection Pool' : 'Local Development Adapter'}`);
  process.exit(0);
}

run().catch(err => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
