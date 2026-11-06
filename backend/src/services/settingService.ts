/**
 * Setting & Configuration Service
 * FieldOps Inventory v2 - Tahap 1: Fondasi
 * Membaca konfigurasi dari database tabel `pengaturan` dengan fallback ke `.env`
 */

import { executeQuery } from '../db/database';

export class SettingService {
  private static cache = new Map<string, { value: string; timestamp: number }>();
  private static CACHE_TTL_MS = 30000; // 30 detik

  // Default values sesuai SECURITY_GUIDE.md
  private static DEFAULTS: Record<string, string> = {
    ACCESS_TOKEN_TTL_DETIK: '900',       // 15 menit
    IDLE_TIMEOUT_MENIT: '30',           // 30 menit
    ABSOLUTE_TIMEOUT_JAM: '12',         // 12 jam
    MAX_SESI_PER_AKUN: '1',             // 1 sesi per user (ponsel+komputer bisa dinaikkan ke 2)
    REAUTH_MENIT: '15',                 // Minta password ulang untuk aksi tingkat 3 jika lewat 15 menit
    RETENSI_SAMPAH_HARI: '14',          // Retensi hapus permanen 14 hari
    CONFIRMATION_TOKEN_TTL_DETIK: '120',// Token konfirmasi sekali pakai (120 detik)
    CONFIRMATION_TIERS: JSON.stringify({
      stock_move_single: 0,
      notes_update: 0,
      stock_out_single: 1,
      restore_single: 1,
      request_approve: 2,
      request_reject: 2,
      bulk_stock_out: 2,
      bulk_stock_in: 2,
      permanent_delete: 3,
      delete_product: 3,
      delete_type: 3,
      delete_kind: 3,
      delete_box: 3,
      correct_item_id: 3,
      change_role: 3,
      change_id_rule: 3
    })
  };

  /**
   * Mengambil nilai konfigurasi string
   */
  static async get(key: string): Promise<string> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.value;
    }

    try {
      const rows = await executeQuery<any>('SELECT nilai FROM pengaturan WHERE kunci = ?', [key]);
      if (rows && rows.length > 0 && rows[0].nilai !== undefined && rows[0].nilai !== null) {
        const val = String(rows[0].nilai);
        this.cache.set(key, { value: val, timestamp: Date.now() });
        return val;
      }
    } catch {
      // Fallback jika database belum termigrasi
    }

    // Cek environment variables
    const envVal = process.env[key];
    if (envVal !== undefined && envVal !== '') {
      this.cache.set(key, { value: envVal, timestamp: Date.now() });
      return envVal;
    }

    // Default fallback
    const defaultVal = this.DEFAULTS[key] ?? '';
    this.cache.set(key, { value: defaultVal, timestamp: Date.now() });
    return defaultVal;
  }

  /**
   * Mengambil nilai konfigurasi dalam bentuk integer
   */
  static async getInt(key: string): Promise<number> {
    const val = await this.get(key);
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      return parseInt(this.DEFAULTS[key] || '0', 10);
    }
    return parsed;
  }

  /**
   * Mengambil nilai konfigurasi JSON
   */
  static async getJSON<T = any>(key: string): Promise<T> {
    const val = await this.get(key);
    try {
      return JSON.parse(val) as T;
    } catch {
      return JSON.parse(this.DEFAULTS[key] || '{}') as T;
    }
  }

  /**
   * Menyimpan / memperbarui konfigurasi (hanya role developer & admin)
   */
  static async set(key: string, value: string, keterangan?: string): Promise<void> {
    await executeQuery(
      `INSERT INTO pengaturan (kunci, nilai, keterangan) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), keterangan = COALESCE(VALUES(keterangan), keterangan)`,
      [key, value, keterangan || null]
    );
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Mengambil seluruh daftar pengaturan untuk dashboard konfigurasi
   */
  static async getAll(): Promise<Array<{ kunci: string; nilai: string; keterangan: string | null }>> {
    try {
      const rows = await executeQuery<any>('SELECT kunci, nilai, keterangan FROM pengaturan ORDER BY kunci ASC');
      if (rows && rows.length > 0) {
        return rows;
      }
    } catch {}

    return Object.entries(this.DEFAULTS).map(([kunci, nilai]) => ({
      kunci,
      nilai,
      keterangan: 'Nilai bawaan sistem'
    }));
  }
}
