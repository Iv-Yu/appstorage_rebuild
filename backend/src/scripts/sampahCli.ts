/**
 * FieldOps IT - CLI Pemulihan Sampah Hapus (14-Day Trash Retention)
 * Jalankan di terminal server:
 *   npm run sampah -- --list
 *   npm run sampah -- --pulihkan <id> --dry-run
 *   npm run sampah -- --pulihkan <id>
 *   npm run sampah -- --purge
 */

import { initDatabase } from '../db/database';
import { TrashService } from '../services/trashService';

async function main() {
  const args = process.argv.slice(2);

  console.log('================================================================');
  console.log('  FIELDOPS IT - MANAJEMEN SAMPAH HAPUS PERMANEN (14 HARI)');
  console.log('================================================================\n');

  await initDatabase();

  if (args.includes('--list') || args.length === 0) {
    const list = await TrashService.listTrash();
    if (list.length === 0) {
      console.log('ℹ️ Tidak ada data di tempat sampah yang sedang menunggu pemulihan.');
      process.exit(0);
    }

    console.log(`Menemukan ${list.length} entri di tempat sampah (masa simpan 14 hari):\n`);
    console.log('---------------------------------------------------------------------------------------------------------');
    console.log('| ID Sampah             | Jenis   | Objek ID      | Dihapus Oleh | Dihapus Pada        | Sisa Hari |');
    console.log('---------------------------------------------------------------------------------------------------------');

    for (const item of list) {
      const idPad = item.id.padEnd(21);
      const jenisPad = item.jenis_objek.padEnd(7);
      const objekPad = item.objek_id.slice(0, 13).padEnd(13);
      const penghapusPad = (item.nama_penghapus || item.dihapus_oleh).slice(0, 12).padEnd(12);
      const waktuPad = new Date(item.dihapus_pada).toLocaleString('id-ID').slice(0, 19).padEnd(19);
      const sisaPad = `${item.sisa_hari || 0} hari`.padEnd(9);

      console.log(`| ${idPad} | ${jenisPad} | ${objekPad} | ${penghapusPad} | ${waktuPad} | ${sisaPad} |`);
    }
    console.log('---------------------------------------------------------------------------------------------------------\n');
    console.log('Perintah pemulihan:');
    console.log('  Uji coba tanpa ubah data : npm run sampah -- --pulihkan <ID> --dry-run');
    console.log('  Pulihkan data sungguhan  : npm run sampah -- --pulihkan <ID>\n');
    process.exit(0);
  }

  if (args.includes('--purge')) {
    console.log('Menjalankan pembersihan sampah yang telah melewati 14 hari...');
    const result = await TrashService.purgeExpiredTrash();
    console.log(`✅ Selesai. Sebanyak ${result.purgedCount} entri dibersihkan permanen.`);
    process.exit(0);
  }

  const pulihkanIdx = args.indexOf('--pulihkan');
  if (pulihkanIdx !== -1) {
    const targetId = args[pulihkanIdx + 1];
    if (!targetId || targetId.startsWith('--')) {
      console.error('❌ Harap cantumkan ID entri sampah yang ingin dipulihkan.');
      console.error('Contoh: npm run sampah -- --pulihkan trash-1793936000000-abcd');
      process.exit(1);
    }

    const isDryRun = args.includes('--dry-run');
    console.log(`Memproses pemulihan untuk ID: "${targetId}" (Mode: ${isDryRun ? 'DRY-RUN / Uji Coba' : 'EKSEKUSI PENUH'})...\n`);

    const result = await TrashService.restoreTrash(targetId, isDryRun);

    if (!result.success) {
      console.error(`❌ Gagal: ${result.message}`);
      if (result.conflicts && result.conflicts.length > 0) {
        console.error('Daftar konflik:');
        result.conflicts.forEach(c => console.error(`  - ${c}`));
      }
      process.exit(1);
    }

    console.log(`✅ ${result.message}`);
    if (result.restoredObject) {
      console.log('Ringkasan Objek yang Dipulihkan:');
      console.log(JSON.stringify(result.restoredObject, null, 2));
    }
    process.exit(0);
  }

  console.log('Argumen tidak dikenali. Opsi yang tersedia:');
  console.log('  --list                      : Melihat daftar entri sampah');
  console.log('  --pulihkan <id> [--dry-run] : Memulihkan entri sampah');
  console.log('  --purge                     : Membersihkan entri yang sudah lewat masa retensi');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
