/**
 * Permanent Trash Service with 14-Day Retention (Sampah Hapus)
 * FieldOps Inventory v2 - Tahap 1: Fondasi (SECURITY_GUIDE.md Bagian 3)
 * Menangani snapshot hapus permanen, masa tenggang 14 hari, dan pemulihan CLI terminal
 */

import crypto from 'crypto';
import { executeQuery, runTransaction } from '../db/database';
import { SettingService } from './settingService';
import { ActivityLogService } from './activityLogService';

export interface TrashItem {
  id: string;
  jenis_objek: 'item' | 'produk' | 'tipe' | 'jenis' | 'box' | 'akun';
  objek_id: string;
  snapshot: string;
  dihapus_oleh: string;
  nama_penghapus?: string;
  dihapus_pada: string;
  aktivitas_id: string;
  purge_setelah: string;
  status: 'menunggu' | 'dipulihkan' | 'dibersihkan';
  sisa_hari?: number;
}

export class TrashService {
  /**
   * Memindahkan objek dan turunannya ke tempat sampah (Permanent Delete Lapis 2)
   */
  static async moveToTrash(input: {
    jenis_objek: 'item' | 'produk' | 'tipe' | 'jenis' | 'box' | 'akun';
    objek_id: string;
    snapshot: any;
    dihapus_oleh: string;
    catatan?: string;
  }): Promise<{ trashId: string; aktivitasId: string }> {
    const retensiHari = await SettingService.getInt('RETENSI_SAMPAH_HARI');
    const purgeSetelah = new Date(Date.now() + retensiHari * 24 * 3600 * 1000);
    const trashId = `trash-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    return await runTransaction(async (conn) => {
      // 1. Catat log aktivitas mutasi
      const { idAktivitas } = await ActivityLogService.recordActivity({
        aksi: 'hapus_permanen',
        pelaku_id: input.dihapus_oleh,
        catatan: input.catatan || `Hapus permanen ${input.jenis_objek} ID: ${input.objek_id} (Retensi ${retensiHari} hari)`,
        details: [
          {
            item_id: input.jenis_objek === 'item' ? input.objek_id : null,
            nama_snapshot: input.snapshot?.name || input.snapshot?.nama || `${input.jenis_objek} #${input.objek_id}`,
            status_sebelum: 'aktif',
            status_sesudah: 'dihapus_permanen'
          }
        ]
      });

      // 2. Simpan snapshot objek dan turunannya ke tabel sampah_hapus
      const snapshotJson = typeof input.snapshot === 'string' ? input.snapshot : JSON.stringify(input.snapshot);

      await conn.query(
        `INSERT INTO sampah_hapus (id, jenis_objek, objek_id, snapshot, dihapus_oleh, dihapus_pada, aktivitas_id, purge_setelah, status)
         VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, 'menunggu')`,
        [trashId, input.jenis_objek, input.objek_id, snapshotJson, input.dihapus_oleh, idAktivitas, purgeSetelah]
      );

      return { trashId, aktivitasId: idAktivitas };
    });
  }

  /**
   * Mengambil daftar sampah yang masih bisa dipulihkan
   */
  static async listTrash(): Promise<TrashItem[]> {
    const rows = await executeQuery<any>(
      `SELECT s.id, s.jenis_objek, s.objek_id, s.snapshot, s.dihapus_oleh, u.name as nama_penghapus,
              s.dihapus_pada, s.aktivitas_id, s.purge_setelah, s.status
       FROM sampah_hapus s
       LEFT JOIN users u ON s.dihapus_oleh = u.id
       WHERE s.status = 'menunggu'
       ORDER BY s.dihapus_pada DESC`
    );

    const now = Date.now();
    return rows.map(r => {
      const purgeTime = new Date(r.purge_setelah).getTime();
      const diffMs = purgeTime - now;
      const sisaHari = Math.max(0, Math.ceil(diffMs / (24 * 3600 * 1000)));
      return {
        ...r,
        sisa_hari: sisaHari
      };
    });
  }

  /**
   * Mengambil detail satu entri sampah berdasarkan ID
   */
  static async getTrashById(trashId: string): Promise<TrashItem | null> {
    const rows = await executeQuery<any>(
      `SELECT s.id, s.jenis_objek, s.objek_id, s.snapshot, s.dihapus_oleh, u.name as nama_penghapus,
              s.dihapus_pada, s.aktivitas_id, s.purge_setelah, s.status
       FROM sampah_hapus s
       LEFT JOIN users u ON s.dihapus_oleh = u.id
       WHERE s.id = ?`,
      [trashId]
    );

    if (!rows || rows.length === 0) return null;
    return rows[0];
  }

  /**
   * Memulihkan objek dari tempat sampah (Hanya via Terminal CLI server)
   */
  static async restoreTrash(trashId: string, dryRun: boolean = false): Promise<{
    success: boolean;
    message: string;
    conflicts?: string[];
    restoredObject?: any;
  }> {
    const trash = await this.getTrashById(trashId);
    if (!trash) {
      return { success: false, message: `Entri sampah ID "${trashId}" tidak ditemukan.` };
    }

    if (trash.status !== 'menunggu') {
      return { success: false, message: `Entri sampah ini sudah berstatus "${trash.status}" dan tidak dapat dipulihkan lagi.` };
    }

    let snapshotData: any;
    try {
      snapshotData = JSON.parse(trash.snapshot);
    } catch (err: any) {
      return { success: false, message: `Gagal membaca snapshot data: ${err.message}` };
    }

    const conflicts: string[] = [];

    // Validasi konflik berdasarkan jenis objek
    if (trash.jenis_objek === 'item') {
      const existing = await executeQuery<any>('SELECT id FROM items WHERE id = ? AND is_deleted = 0', [trash.objek_id]);
      if (existing.length > 0) {
        conflicts.push(`Item ID ${trash.objek_id} sudah ada barang aktif yang menggunakan ID ini.`);
      }
      if (snapshotData.sku) {
        const skuConflict = await executeQuery<any>('SELECT id FROM items WHERE sku = ? AND is_deleted = 0', [snapshotData.sku]);
        if (skuConflict.length > 0) {
          conflicts.push(`SKU / Kode "${snapshotData.sku}" saat ini sudah dipakai oleh item aktif lain.`);
        }
      }
    } else if (trash.jenis_objek === 'akun') {
      const userConflict = await executeQuery<any>('SELECT id FROM users WHERE username = ? OR email = ?', [snapshotData.username, snapshotData.email]);
      if (userConflict.length > 0) {
        conflicts.push(`Username "${snapshotData.username}" atau Email "${snapshotData.email}" sudah digunakan akun aktif.`);
      }
    }

    if (conflicts.length > 0) {
      return {
        success: false,
        message: 'Konflik data terdeteksi saat pemulihan:',
        conflicts
      };
    }

    if (dryRun) {
      return {
        success: true,
        message: '[DRY-RUN] Entri valid dan siap dipulihkan tanpa konflik.',
        restoredObject: snapshotData
      };
    }

    // Eksekusi pemulihan dalam transaksi database
    return await runTransaction(async (conn) => {
      // 1. Masukkan ulang data sesuai jenis objek
      if (trash.jenis_objek === 'item') {
        await conn.query(
          `INSERT INTO items (id, sku, barcode, name, category_id, quantity, min_stock_alert, unit, location, specs, unit_cost, status, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
           ON DUPLICATE KEY UPDATE is_deleted = 0, name = VALUES(name), quantity = VALUES(quantity)`,
          [
            snapshotData.id,
            snapshotData.sku,
            snapshotData.barcode || '',
            snapshotData.name,
            snapshotData.category_id,
            snapshotData.quantity || 0,
            snapshotData.min_stock_alert || 0,
            snapshotData.unit || 'pcs',
            snapshotData.location || '',
            snapshotData.specs || '',
            snapshotData.unit_cost || 0,
            snapshotData.status || 'NORMAL'
          ]
        );
      } else if (trash.jenis_objek === 'akun') {
        await conn.query(
          `INSERT INTO users (id, username, name, email, role, department, phone, password_hash, salt, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = 'ACTIVE'`,
          [
            snapshotData.id,
            snapshotData.username,
            snapshotData.name,
            snapshotData.email,
            snapshotData.role,
            snapshotData.department || '',
            snapshotData.phone || '',
            snapshotData.password_hash,
            snapshotData.salt,
            'ACTIVE'
          ]
        );
      }

      // 2. Perbarui status entri sampah menjadi 'dipulihkan'
      await conn.query(
        'UPDATE sampah_hapus SET status = "dipulihkan" WHERE id = ?',
        [trashId]
      );

      // 3. Catat di log aktivitas dengan pelaku 'terminal'
      await ActivityLogService.recordActivity({
        aksi: 'pulihkan',
        pelaku_id: 'terminal',
        catatan: `Pemulihan data dari sampah_hapus ID: ${trashId} (${trash.jenis_objek} #${trash.objek_id}) via CLI terminal`,
        details: [
          {
            item_id: trash.jenis_objek === 'item' ? trash.objek_id : null,
            nama_snapshot: snapshotData.name || snapshotData.nama || `${trash.jenis_objek} #${trash.objek_id}`,
            status_sebelum: 'dihapus_permanen',
            status_sesudah: 'aktif'
          }
        ]
      });

      return {
        success: true,
        message: `Berhasil memulihkan ${trash.jenis_objek} "${snapshotData.name || snapshotData.username || trash.objek_id}" ke sistem aktif.`,
        restoredObject: snapshotData
      };
    });
  }

  /**
   * Job terjadwal untuk membersihkan entri sampah yang telah melewati masa retensi (purge_setelah)
   */
  static async purgeExpiredTrash(): Promise<{ purgedCount: number }> {
    const expired = await executeQuery<any>(
      `SELECT id, jenis_objek, objek_id FROM sampah_hapus 
       WHERE status = 'menunggu' AND purge_setelah <= NOW()`
    );

    if (!expired || expired.length === 0) {
      return { purgedCount: 0 };
    }

    for (const item of expired) {
      await runTransaction(async (conn) => {
        // Kosongkan snapshot dan ubah status menjadi dibersihkan
        await conn.query(
          `UPDATE sampah_hapus SET status = 'dibersihkan', snapshot = '' WHERE id = ?`,
          [item.id]
        );

        // Catat di log aktivitas
        await ActivityLogService.recordActivity({
          aksi: 'dibersihkan_otomatis',
          pelaku_id: 'system_cron',
          catatan: `Retensi 14 hari kedaluwarsa. Snapshot ${item.jenis_objek} #${item.objek_id} telah dibersihkan permanen dari server.`
        });
      });
    }

    console.log(`[FieldOps Trash Purge] Sebanyak ${expired.length} entri sampah kedaluwarsa berhasil dibersihkan.`);
    return { purgedCount: expired.length };
  }
}
