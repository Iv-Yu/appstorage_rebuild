/**
 * Backup & Restore Service (Separated Business vs Account Snapshots)
 * FieldOps IT Inventory Rebuild
 */

import fs from 'fs';
import path from 'path';
import { executeQuery, runTransaction } from '../db/database';

export class BackupService {
  private static backupsDir = path.resolve(process.cwd(), 'backups');

  static ensureBackupDir(): string {
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }
    return this.backupsDir;
  }

  /**
   * Ekspor Khusus Data Bisnis Inventaris (FILE BARANG - BEBAS AKUN & PASSWORD)
   */
  static async createInventoryBackup(triggeredBy: string = 'system-cron'): Promise<{ filename: string; filePath: string; summary: any }> {
    this.ensureBackupDir();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_inventory_items_${dateStr}.json`;
    const filePath = path.join(this.backupsDir, filename);

    const categories = await executeQuery('SELECT * FROM categories ORDER BY id ASC');
    const items = await executeQuery('SELECT * FROM items WHERE is_deleted = FALSE ORDER BY sku ASC');
    const transactions = await executeQuery('SELECT * FROM transactions ORDER BY created_at DESC');
    const checklists = await executeQuery('SELECT * FROM checklists ORDER BY created_at DESC');
    const whatsappConfig = await executeQuery('SELECT id, gateway_type, api_url, target_phones, auto_alert_enabled FROM whatsapp_config');
    const whatsappLogs = await executeQuery('SELECT * FROM whatsapp_logs ORDER BY created_at DESC LIMIT 100');

    const payload = {
      system: 'FieldOps IT Inventory',
      dataType: 'BUSINESS_INVENTORY_ONLY',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      triggeredBy,
      data: {
        categories,
        items,
        transactions,
        checklists,
        whatsappConfig: whatsappConfig[0] || null,
        whatsappLogs
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    return {
      filename,
      filePath,
      summary: {
        categoriesCount: categories.length,
        itemsCount: items.length,
        transactionsCount: transactions.length,
        checklistsCount: checklists.length
      }
    };
  }

  /**
   * Ekspor Khusus Data Akun Pengguna (FILE AKUN TERISOLASI - HANYA SUPERVISOR)
   */
  static async createAccountsBackup(operatorUserId: string): Promise<{ filename: string; filePath: string; count: number }> {
    this.ensureBackupDir();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_accounts_${dateStr}.json`;
    const filePath = path.join(this.backupsDir, filename);

    const users = await executeQuery('SELECT id, username, name, email, role, department, phone, password_hash, salt, status, created_at FROM users');

    const payload = {
      system: 'FieldOps IT Security Governance',
      dataType: 'ACCOUNTS_CREDENTIALS_BACKUP',
      exportedBy: operatorUserId,
      createdAt: new Date().toISOString(),
      users
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return { filename, filePath, count: users.length };
  }

  /**
   * Pulihkan Data Bisnis dari File Cadangan (Tanpa Menyentuh Akun Pengguna)
   */
  static async restoreInventory(jsonData: any): Promise<{ success: boolean; message: string; counts: any }> {
    if (!jsonData || jsonData.dataType !== 'BUSINESS_INVENTORY_ONLY' || !jsonData.data) {
      throw new Error('Format file backup tidak valid. Hanya file backup khusus data bisnis (BUSINESS_INVENTORY_ONLY) yang diterima.');
    }

    const { categories, items, transactions } = jsonData.data;

    return await runTransaction(async (conn) => {
      // 1. Pulihkan kategori
      if (Array.isArray(categories)) {
        for (const cat of categories) {
          await conn.query(
            `INSERT INTO categories (id, code, name, description) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
            [cat.id, cat.code, cat.name, cat.description || '']
          );
        }
      }

      // 2. Pulihkan barang
      if (Array.isArray(items)) {
        for (const it of items) {
          await conn.query(
            `INSERT INTO items (id, sku, barcode, name, category_id, quantity, min_stock_alert, unit, location, specs, unit_cost, status, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               name = VALUES(name), category_id = VALUES(category_id), quantity = VALUES(quantity), 
               min_stock_alert = VALUES(min_stock_alert), location = VALUES(location), specs = VALUES(specs), status = VALUES(status)`,
            [
              it.id, it.sku, it.barcode || null, it.name, it.category_id, it.quantity || 0,
              it.min_stock_alert || 2, it.unit || 'pcs', it.location || '', it.specs || '',
              it.unit_cost || 0, it.status || 'NORMAL', it.is_deleted ? 1 : 0
            ]
          );
        }
      }

      // 3. Pulihkan transaksi
      if (Array.isArray(transactions)) {
        for (const tx of transactions) {
          await conn.query(
            `INSERT INTO transactions (id, type, item_id, quantity, previous_qty, new_qty, reference_type, reference_number, recipient_destination, user_id, performed_by, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE notes = VALUES(notes)`,
            [
              tx.id, tx.type, tx.item_id, tx.quantity, tx.previous_qty, tx.new_qty,
              tx.reference_type || 'MANUAL', tx.reference_number || '', tx.recipient_destination || '',
              tx.user_id || 'system', tx.performed_by || 'Admin', tx.notes || ''
            ]
          );
        }
      }

      return {
        success: true,
        message: 'Pemulihan data inventori berhasil diselesaikan.',
        counts: {
          categories: categories?.length || 0,
          items: items?.length || 0,
          transactions: transactions?.length || 0
        }
      };
    });
  }

  /**
   * Inisialisasi backup harian terjadwal (Setiap 24 jam)
   */
  static initDailyBackupCron() {
    // 24 jam = 86400000 ms
    setInterval(async () => {
      try {
        const res = await this.createInventoryBackup('scheduled-daily-cron');
        console.log(`[Backup Service] Backup harian inventori berhasil dibuat: ${res.filename}`);
      } catch (err) {
        console.error('[Backup Service Error]:', err);
      }
    }, 24 * 3600 * 1000);
  }
}
