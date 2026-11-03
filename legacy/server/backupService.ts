/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

interface BackupOptions {
  collectionsData: Record<string, any[]>;
  triggeredBy?: string;
}

/**
 * Utility to structure and store Firestore collections data into a JSON backup file in 'backups' path.
 */
export function createBackupSnapshot(options: BackupOptions): { filename: string; filepath: string; sizeBytes: number; timestamp: string } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `firestore-backup-${timestamp}.json`;
  const filepath = path.join(BACKUPS_DIR, filename);

  const backupPayload = {
    version: '0.3.1',
    createdAt: new Date().toISOString(),
    triggeredBy: options.triggeredBy || 'daily-cron-job',
    system: 'FieldOps IT Inventory & Operations',
    collections: options.collectionsData
  };

  const jsonContent = JSON.stringify(backupPayload, null, 2);
  fs.writeFileSync(filepath, jsonContent, 'utf-8');

  const stats = fs.statSync(filepath);
  console.log(`[Backup Service] Backup stored successfully at ${filepath} (${stats.size} bytes)`);

  // Maintain max 30 recent backups (cleanup old ones)
  cleanupOldBackups();

  return {
    filename,
    filepath,
    sizeBytes: stats.size,
    timestamp: backupPayload.createdAt
  };
}

/**
 * Cleanup backups older than 30 days or exceeding 30 files
 */
function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(BACKUPS_DIR, f),
        time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 30) {
      const excess = files.slice(30);
      excess.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`[Backup Service] Removed old backup: ${file.name}`);
      });
    }
  } catch (err) {
    console.error('[Backup Service] Error cleaning up old backups:', err);
  }
}

/**
 * Safe retrieval of a specific backup file by filename from /backups
 */
export function getBackupFile(filename: string): any {
  const safeFilename = path.basename(filename);
  const filePath = path.join(BACKUPS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File backup "${safeFilename}" tidak ditemukan di direktori /backups.`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Save an uploaded or manually created backup file to /backups
 */
export function saveUploadedBackup(filename: string, data: any): { filename: string; sizeBytes: number; createdAt: string } {
  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const finalName = safeFilename.endsWith('.json') ? safeFilename : `${safeFilename}.json`;
  const filePath = path.join(BACKUPS_DIR, finalName);

  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');

  const stats = fs.statSync(filePath);
  cleanupOldBackups();

  return {
    filename: finalName,
    sizeBytes: stats.size,
    createdAt: new Date().toISOString()
  };
}

/**
 * Express 5 Middleware to attach backup utility to request object or check backup status
 */
export function backupMiddleware(req: any, _res: any, next: any) {
  req.backupService = {
    createSnapshot: createBackupSnapshot,
    getBackupFile,
    saveUploadedBackup,
    listBackups: () => {
      try {
        return fs.readdirSync(BACKUPS_DIR)
          .filter(f => f.endsWith('.json'))
          .map(f => {
            const filePath = path.join(BACKUPS_DIR, f);
            const stats = fs.statSync(filePath);
            
            let summary: any = {
              version: '0.3.1',
              system: 'FieldOps IT',
              triggeredBy: 'unknown',
              counts: {
                items: 0,
                transactions: 0,
                categories: 0,
                trash: 0
              }
            };

            try {
              const previewRaw = fs.readFileSync(filePath, 'utf-8');
              const parsed = JSON.parse(previewRaw);
              summary = {
                version: parsed.version || '0.3.1',
                system: parsed.system || 'FieldOps IT',
                triggeredBy: parsed.triggeredBy || 'automated',
                counts: {
                  items: Array.isArray(parsed.collections?.inventory_items) ? parsed.collections.inventory_items.length : (Array.isArray(parsed.collections?.items) ? parsed.collections.items.length : 0),
                  transactions: Array.isArray(parsed.collections?.stock_transactions) ? parsed.collections.stock_transactions.length : (Array.isArray(parsed.collections?.transactions) ? parsed.collections.transactions.length : 0),
                  categories: Array.isArray(parsed.collections?.categories) ? parsed.collections.categories.length : 0,
                  trash: Array.isArray(parsed.collections?.trash_items) ? parsed.collections.trash_items.length : 0,
                }
              };
            } catch {
              // Ignore parse errors on individual previews
            }

            return {
              filename: f,
              sizeBytes: stats.size,
              createdAt: stats.mtime.toISOString(),
              summary
            };
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch {
        return [];
      }
    }
  };
  next();
}

/**
 * Initialize Daily Cron Job (Runs every 24 hours)
 */
export function initDailyBackupCron(getDataCallback: () => Record<string, any[]>) {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  console.log('[Backup Cron] Daily automated Firestore backup cron scheduled (every 24 hours). Target path: /backups');

  // Initial backup on boot after 10 seconds
  setTimeout(() => {
    try {
      const data = getDataCallback();
      createBackupSnapshot({ collectionsData: data, triggeredBy: 'boot-initial-backup' });
    } catch (err) {
      console.error('[Backup Cron] Initial backup failed:', err);
    }
  }, 10000);

  // Recurring daily timer
  setInterval(() => {
    try {
      console.log('[Backup Cron] Executing scheduled daily backup job...');
      const data = getDataCallback();
      createBackupSnapshot({ collectionsData: data, triggeredBy: 'daily-cron-job' });
    } catch (err) {
      console.error('[Backup Cron] Scheduled daily backup failed:', err);
    }
  }, TWENTY_FOUR_HOURS);
}
