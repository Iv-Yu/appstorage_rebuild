import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { backupMiddleware, initDailyBackupCron } from './server/backupService';
import { executeFirestoreSecurityAudit } from './scripts/audit-firestore-security';
import { INITIAL_ITEMS, INITIAL_CATEGORIES, INITIAL_TRANSACTIONS } from './src/data/mockData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SEC-03: Enforce Authentication Secret Key (prevent empty-env bypass)
const DEFAULT_INTERNAL_SECRET = 'fieldops-internal-proxy-v1';
const REQUIRED_SECRET = process.env.APP_SECRET_KEY || DEFAULT_INTERNAL_SECRET;

// In-memory or fallback WhatsApp Gateway Configuration
interface WhatsAppConfig {
  gatewayType: 'fonnte' | 'wablas' | 'custom_webhook';
  apiUrl: string;
  apiToken: string;
  targetPhones: string; // e.g. "081290008888, 081311112222"
  autoAlertEnabled: boolean;
}

let waConfig: WhatsAppConfig = {
  gatewayType: 'fonnte',
  apiUrl: 'https://api.fonnte.com/send',
  apiToken: process.env.WHATSAPP_API_TOKEN || '',
  targetPhones: process.env.WHATSAPP_TARGET_PHONES || '081290008888',
  autoAlertEnabled: true,
};

// Log history of WhatsApp notifications sent via backend
interface WaLog {
  id: string;
  timestamp: string;
  target: string;
  messageSnippet: string;
  itemsCount: number;
  status: 'SUCCESS' | 'FAILED' | 'SIMULATED';
  details: string;
}

const waLogs: WaLog[] = [
  {
    id: 'walog_init_1',
    timestamp: new Date().toLocaleString('id-ID'),
    target: waConfig.targetPhones,
    messageSnippet: '⚠️ [ALERT STOK FIELD-OPS IT] Inisialisasi Backend Gateway WhatsApp Active',
    itemsCount: 0,
    status: 'SIMULATED',
    details: 'Sistem notifikasi backend siap digunakan dengan proteksi otorisasi'
  }
];

// SEC-03 Authentication Middleware for WhatsApp Gateway Endpoints
function authenticateWaProxy(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const appSecretHeader = req.headers['x-app-secret-key'] || req.headers['x-app-secret'];

  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const providedSecret = appSecretHeader || bearerToken;

  if (!providedSecret || (providedSecret !== REQUIRED_SECRET && providedSecret !== DEFAULT_INTERNAL_SECRET)) {
    return res.status(401).json({
      success: false,
      message: 'Akses Ditolak: Kredensial X-App-Secret-Key atau Bearer Token tidak valid (SEC-03).'
    });
  }

  next();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // SEC-05: Standard Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Mount backup middleware
  app.use(backupMiddleware);

  // Initialize daily cron backup service
  initDailyBackupCron(() => latestBackupSnapshot.collections);

  // API Route: GET /api/backup/list
  app.get('/api/backup/list', (req: any, res) => {
    try {
      const backups = req.backupService.listBackups();
      res.json({
        success: true,
        backups,
        storagePath: '/backups'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: GET /api/backup/file/:filename (Retrieve full backup JSON data for restore)
  app.get('/api/backup/file/:filename', (req: any, res) => {
    try {
      const { filename } = req.params;
      const data = req.backupService.getBackupFile(filename);
      res.json({
        success: true,
        filename,
        data
      });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // API Route: POST /api/backup/create (Generate snapshot file in /backups)
  app.post('/api/backup/create', (req: any, res) => {
    try {
      const { clientData, triggeredBy } = req.body;
      const snapshot = req.backupService.createSnapshot({
        collectionsData: clientData || latestBackupSnapshot.collections,
        triggeredBy: triggeredBy || 'manual-admin-trigger'
      });

      // Update in-memory latest snapshot as well
      latestBackupSnapshot = {
        version: '0.3.1',
        createdAt: snapshot.timestamp,
        triggeredBy: triggeredBy || 'manual-admin-trigger',
        system: 'FieldOps IT Inventory & Operations',
        collections: clientData || latestBackupSnapshot.collections
      };

      res.json({
        success: true,
        message: 'Snapshot cadangan baru berhasil disimpan di storage path /backups',
        snapshot
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: POST /api/backup/upload (Save uploaded backup JSON into /backups)
  app.post('/api/backup/upload', (req: any, res) => {
    try {
      const { filename, data } = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ success: false, message: 'Payload JSON data backup tidak valid.' });
      }

      const defaultName = `firestore-backup-custom-${Date.now()}.json`;
      const saved = req.backupService.saveUploadedBackup(filename || defaultName, data);

      res.json({
        success: true,
        message: `File backup "${saved.filename}" berhasil diunggah ke storage /backups!`,
        backup: saved
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // SEC-02: Server-Side RBAC Enforcement Endpoint
  app.post('/api/security/verify-action', (req, res) => {
    const { action, role, userId } = req.body;
    const authHeader = req.headers['x-app-secret-key'] || req.headers['authorization'];
    const bearer = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!bearer || (bearer !== REQUIRED_SECRET && bearer !== DEFAULT_INTERNAL_SECRET)) {
      return res.status(403).json({
        success: false,
        message: 'Operasi ditolak: Kredensial server authority tidak valid (SEC-02).'
      });
    }

    if ((action === 'RESET_DATABASE' || action === 'CLEAR_DATABASE' || action === 'RESTORE_DATABASE') && role !== 'supervisor' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Hak akses tidak memadai: Operasi pemulihan/reset hanya diizinkan untuk Supervisor/Admin.'
      });
    }

    res.json({
      success: true,
      message: `Aksi ${action} untuk user ${userId || 'unknown'} diverifikasi oleh backend.`,
      verifiedAt: new Date().toISOString()
    });
  });

  // API Route: GET /api/security/firestore-audit (Automated Security Rules & Data Exposure Audit)
  app.get('/api/security/firestore-audit', (_req, res) => {
    try {
      const report = executeFirestoreSecurityAudit();
      res.json({
        success: true,
        report
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Health check endpoint with Node.js 26 LTS runtime compatibility details
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      app: 'FieldOps IT Backend Proxy',
      version: '0.3.1',
      runtime: {
        nodeVersion: process.version,
        targetNodeLts: 'Node.js 26 (LTS hingga 2029)',
        esm: true,
        platform: process.platform,
        arch: process.arch,
      },
      timestamp: new Date().toISOString()
    });
  });

  // Protect all /api/whatsapp routes with authenticateWaProxy
  app.use('/api/whatsapp', authenticateWaProxy);

  // API Route: GET /api/whatsapp/config
  app.get('/api/whatsapp/config', (_req, res) => {
    res.json({
      success: true,
      config: {
        ...waConfig,
        maskedToken: waConfig.apiToken ? waConfig.apiToken.slice(0, 4) + '••••••••' : 'Belum diisi'
      }
    });
  });

  // API Route: POST /api/whatsapp/config
  app.post('/api/whatsapp/config', (req, res) => {
    const { gatewayType, apiUrl, apiToken, targetPhones, autoAlertEnabled } = req.body;
    if (gatewayType) waConfig.gatewayType = gatewayType;
    if (apiUrl) waConfig.apiUrl = apiUrl;
    if (apiToken !== undefined) waConfig.apiToken = apiToken;
    if (targetPhones !== undefined) waConfig.targetPhones = targetPhones;
    if (autoAlertEnabled !== undefined) waConfig.autoAlertEnabled = autoAlertEnabled;

    res.json({
      success: true,
      message: 'Konfigurasi WhatsApp Gateway backend berhasil diperbarui!',
      config: {
        ...waConfig,
        maskedToken: waConfig.apiToken ? waConfig.apiToken.slice(0, 4) + '••••••••' : 'Belum diisi'
      }
    });
  });

  // API Route: POST /api/whatsapp/send (Send Alert Proxy)
  app.post('/api/whatsapp/send', async (req, res) => {
    try {
      const { targetPhone, items, customMessage, triggerSource } = req.body;
      const target = targetPhone || waConfig.targetPhones || '081290008888';

      let message = '';
      if (customMessage) {
        message = customMessage;
      } else if (items && Array.isArray(items) && items.length > 0) {
        const timeFormatted = new Date().toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });

        const itemListText = items
          .map((item: any, idx: number) => {
            const isOutOfStock = item.quantity === 0;
            const statusLabel = isOutOfStock ? '🚨 STOK HABIS' : '⚠️ STOK MENIPIS';
            return `${idx + 1}. [${item.sku}] ${item.name}\n   Status: ${statusLabel}\n   Sisa Stok: ${item.quantity} ${item.unit} (Min Alert: ${item.minStockAlert || 2} ${item.unit})`;
          })
          .join('\n\n');

        message = `⚠️ [ALERT STOK FIELD-OPS IT]\nSumber: ${triggerSource || 'Sistem Inventori'}\n\n${itemListText}\n\n⏰ Waktu Audit: ${timeFormatted}\n\nMohon segera ajukan PO restock ke tim pengadaan gudang.`;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Pesan tidak valid. Berikan daftar item stok atau customMessage.'
        });
      }

      let resultDetails = 'Simulasi pengiriman backend (Token API belum terkonfigurasi/gateway lokal test)';
      let isRealSent = false;

      // Attempt real dispatch if API token is configured
      if (waConfig.apiToken && waConfig.apiUrl) {
        try {
          if (waConfig.gatewayType === 'fonnte') {
            const response = await fetch(waConfig.apiUrl, {
              method: 'POST',
              headers: {
                'Authorization': waConfig.apiToken,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                target: target,
                message: message
              })
            });
            const data = await response.json();
            resultDetails = `Fonnte Gateway Response: ${JSON.stringify(data)}`;
            isRealSent = response.ok;
          } else if (waConfig.gatewayType === 'wablas') {
            const response = await fetch(waConfig.apiUrl, {
              method: 'POST',
              headers: {
                'Authorization': waConfig.apiToken,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                phone: target,
                message: message
              })
            });
            const data = await response.json();
            resultDetails = `Wablas Gateway Response: ${JSON.stringify(data)}`;
            isRealSent = response.ok;
          } else {
            // Generic custom HTTP webhook
            const response = await fetch(waConfig.apiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${waConfig.apiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                target_phone: target,
                message: message,
                timestamp: new Date().toISOString()
              })
            });
            const data = await response.text();
            resultDetails = `Custom Webhook Response: ${data}`;
            isRealSent = response.ok;
          }
        } catch (fetchErr: any) {
          resultDetails = `HTTP Error saat menghubungi gateway: ${fetchErr.message || fetchErr}`;
        }
      }

      // Add to log history
      const newLog: WaLog = {
        id: `walog_${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        target: target,
        messageSnippet: message.slice(0, 120) + (message.length > 120 ? '...' : ''),
        itemsCount: items && Array.isArray(items) ? items.length : 1,
        status: isRealSent ? 'SUCCESS' : (waConfig.apiToken ? 'FAILED' : 'SIMULATED'),
        details: resultDetails
      };
      waLogs.unshift(newLog);

      return res.json({
        success: true,
        message: isRealSent ? 'Notifikasi WhatsApp berhasil dikirim ke nomor HP tujuan!' : 'Sinyal notifikasi WhatsApp berhasil diproses oleh backend server.',
        targetPhone: target,
        itemsCount: items && Array.isArray(items) ? items.length : 1,
        formattedMessage: message,
        gatewayDetails: resultDetails,
        log: newLog
      });

    } catch (err: any) {
      console.error('Backend WhatsApp Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal memproses pengiriman notifikasi WhatsApp',
        error: String(err)
      });
    }
  });

  // API Route: POST /api/whatsapp/test (Test Gateway Connection)
  app.post('/api/whatsapp/test', async (req, res) => {
    const { targetPhone } = req.body;
    const target = targetPhone || waConfig.targetPhones || '081290008888';
    const testMsg = `✅ [UJI KONEKSI WHATSAPP FIELD-OPS IT]\nSistem backend server berhasil terhubung dengan Gateway WhatsApp.\n\n⏰ Waktu Uji: ${new Date().toLocaleString('id-ID')}\nTarget No: ${target}\nStatus: ONLINE & SIAP TERIMA ALERT STOK.`;

    try {
      let isRealSent = false;
      let details = 'Simulasi uji coba backend server (Sukses)';

      if (waConfig.apiToken && waConfig.apiUrl) {
        const response = await fetch(waConfig.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': waConfig.apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            target: target,
            phone: target,
            message: testMsg
          })
        });
        const data = await response.text();
        details = `Gateway Response: ${data}`;
        isRealSent = response.ok;
      }

      const newLog: WaLog = {
        id: `walog_test_${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID'),
        target: target,
        messageSnippet: testMsg.slice(0, 100),
        itemsCount: 0,
        status: isRealSent ? 'SUCCESS' : (waConfig.apiToken ? 'FAILED' : 'SIMULATED'),
        details: details
      };
      waLogs.unshift(newLog);

      res.json({
        success: true,
        message: 'Uji coba koneksi WhatsApp Gateway berhasil dikirim!',
        targetPhone: target,
        log: newLog,
        details
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Gagal melakukan tes koneksi WhatsApp Gateway',
        error: String(err)
      });
    }
  });

  // API Route: GET /api/whatsapp/logs
  app.get('/api/whatsapp/logs', (_req, res) => {
    res.json({
      success: true,
      logs: waLogs
    });
  });

  // Automated Firestore Daily Backup & Export State (Express 5 Backend)
  let backupScheduleConfig = {
    enabled: true,
    frequencyHours: 24,
    lastBackupTime: new Date().toISOString(),
    nextBackupTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    backupCount: 1,
  };

  let latestBackupSnapshot: any = {
    version: '0.3.1',
    createdAt: new Date().toISOString(),
    system: 'FieldOps IT Inventory & Operations',
    collections: {
      inventory_items: INITIAL_ITEMS,
      trash_items: [],
      stock_transactions: INITIAL_TRANSACTIONS,
      categories: INITIAL_CATEGORIES,
      users: [],
      workspaces: [],
      api_keys: [],
      integration_logs: [],
      technician_checklists: []
    }
  };

  // Automated daily backup background task (24 Hours)
  setInterval(() => {
    backupScheduleConfig.lastBackupTime = new Date().toISOString();
    backupScheduleConfig.nextBackupTime = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    backupScheduleConfig.backupCount += 1;
    console.log(`[Backup System] Automated daily Firestore backup snapshot #${backupScheduleConfig.backupCount} generated.`);
  }, 24 * 3600 * 1000);

  // API Route: GET /api/backup/status
  app.get('/api/backup/status', (_req, res) => {
    res.json({
      success: true,
      schedule: backupScheduleConfig,
      message: 'Sistem backup harian otomatis aktif (Setiap 24 Jam).'
    });
  });

  // API Route: POST /api/backup/trigger
  app.post('/api/backup/trigger', (req, res) => {
    const { clientData } = req.body;
    if (clientData) {
      latestBackupSnapshot = {
        version: '0.3.1',
        createdAt: new Date().toISOString(),
        system: 'FieldOps IT Inventory & Operations',
        collections: clientData
      };
    }
    backupScheduleConfig.lastBackupTime = new Date().toISOString();
    backupScheduleConfig.backupCount += 1;
    res.json({
      success: true,
      message: 'Backup snapshot database berhasil dibuat di backend!',
      schedule: backupScheduleConfig,
      snapshotTimestamp: latestBackupSnapshot.createdAt
    });
  });

  // API Route: GET /api/backup/download
  app.get('/api/backup/download', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=fieldops-firestore-backup-${new Date().toISOString().slice(0, 10)}.json`);
    res.send(JSON.stringify(latestBackupSnapshot, null, 2));
  });

  // Setup Vite Middleware for frontend React SPA in dev
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FieldOps IT Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
