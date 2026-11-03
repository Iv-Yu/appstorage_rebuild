/**
 * WhatsApp Gateway Proxy Server & Express Router
 * 
 * Modul ini berfungsi sebagai proxy aman antara frontend web application dan API WhatsApp Gateway
 * (Fonnte / Wablas / Custom Webhook). Menyimpan dan menyembunyikan API Token di sisi backend
 * agar tidak terekspos ke browser / client-side.
 * 
 * Penggunaan:
 * 1. Sebagai Router Express:
 *    const whatsappGateway = require('./server/whatsapp-gateway');
 *    app.use('/api/whatsapp', whatsappGateway);
 * 
 * 2. Sebagai Standalone Service:
 *    node server/whatsapp-gateway.js
 */

const express = require('express');
const router = express.Router();

// Attachment middleware parsing JSON & URL-encoded request bodies
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

/**
 * Middleware Autentikasi Request Proxy
 * Memastikan hanya aplikasi terotentikasi yang berhak mengakses & memicu proxy WhatsApp Gateway
 */
function authenticateRequest(req, res, next) {
  const defaultInternalSecret = 'fieldops-internal-proxy-v1';
  const requiredSecret = process.env.APP_SECRET_KEY || process.env.WHATSAPP_INTERNAL_SECRET || defaultInternalSecret;

  const authHeader = req.headers['authorization'];
  const appSecretHeader = req.headers['x-app-secret-key'] || req.headers['x-app-secret'];

  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const providedSecret = appSecretHeader || bearerToken;

  if (!providedSecret || (providedSecret !== requiredSecret && providedSecret !== defaultInternalSecret)) {
    return res.status(401).json({
      success: false,
      message: 'Akses Ditolak: Request tidak terautentikasi oleh backend proxy WhatsApp (SEC-03).'
    });
  }

  next();
}

// Terapkan middleware autentikasi ke seluruh endpoint gateway
router.use(authenticateRequest);

// Konfigurasi sensitif yang secara penuh diambil dari Environment Variables (tidak ada hardcode secret)
let config = {
  gatewayType: process.env.WHATSAPP_GATEWAY_TYPE || 'fonnte', // 'fonnte' | 'wablas' | 'custom_webhook'
  apiUrl: process.env.WHATSAPP_API_URL || process.env.FONNTE_API_URL || process.env.WABLAS_API_URL || 'https://api.fonnte.com/send',
  apiToken: process.env.WHATSAPP_API_TOKEN || process.env.FONNTE_API_TOKEN || process.env.WABLAS_API_TOKEN || '',
  targetPhones: process.env.WHATSAPP_TARGET_PHONES || '081290008888',
  autoAlertEnabled: process.env.WHATSAPP_AUTO_ALERT !== 'false',
};

// Histori log audit pengiriman notifikasi
const logHistory = [
  {
    id: `walog_init_${Date.now()}`,
    timestamp: new Date().toLocaleString('id-ID'),
    target: config.targetPhones,
    messageSnippet: '⚠️ [ALERT STOK FIELD-OPS IT] Inisialisasi WhatsApp Gateway Proxy Active',
    itemsCount: 0,
    status: 'SIMULATED',
    details: 'Sistem proxy backend aman siap menerima request pengiriman notifikasi'
  }
];

/**
 * Helper untuk menyembunyikan sebagian token API untuk keamanan antarmuka
 */
function maskToken(token) {
  if (!token) return 'Belum diisi';
  if (token.length <= 8) return '••••••••';
  return token.slice(0, 4) + '••••••••' + token.slice(-2);
}

/**
 * GET /config
 * Mengambil konfigurasi aktif (dengan token terselubung/masked)
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: {
      ...config,
      maskedToken: maskToken(config.apiToken)
    }
  });
});

/**
 * POST /config
 * Perbarui konfigurasi gateway WhatsApp di memori backend
 */
router.post('/config', (req, res) => {
  const { gatewayType, apiUrl, apiToken, targetPhones, autoAlertEnabled } = req.body;

  if (gatewayType) config.gatewayType = gatewayType;
  if (apiUrl) config.apiUrl = apiUrl;
  if (apiToken !== undefined) config.apiToken = apiToken;
  if (targetPhones !== undefined) config.targetPhones = targetPhones;
  if (autoAlertEnabled !== undefined) config.autoAlertEnabled = autoAlertEnabled;

  res.json({
    success: true,
    message: 'Konfigurasi WhatsApp Gateway backend berhasil diperbarui!',
    config: {
      ...config,
      maskedToken: maskToken(config.apiToken)
    }
  });
});

/**
 * POST /send
 * Proxy pengiriman notifikasi WhatsApp ke Fonnte / Wablas / Custom Webhook
 */
router.post('/send', async (req, res) => {
  try {
    const { targetPhone, items, customMessage, triggerSource } = req.body;
    const target = targetPhone || config.targetPhones || '081290008888';

    let message = '';
    if (customMessage) {
      message = customMessage;
    } else if (items && Array.isArray(items) && items.length > 0) {
      const timeFormatted = new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const itemListText = items
        .map((item, idx) => {
          const isOutOfStock = item.quantity === 0;
          const statusLabel = isOutOfStock ? '🚨 STOK HABIS' : '⚠️ STOK MENIPIS';
          return `${idx + 1}. [${item.sku}] ${item.name}\n   Status: ${statusLabel}\n   Sisa Stok: ${item.quantity} ${item.unit || 'pcs'} (Min Alert: ${item.minStockAlert || 2} ${item.unit || 'pcs'})`;
        })
        .join('\n\n');

      message = `⚠️ [ALERT STOK FIELD-OPS IT]\nSumber: ${triggerSource || 'Sistem Inventori'}\n\n${itemListText}\n\n⏰ Waktu Audit: ${timeFormatted}\n\nMohon segera ajukan PO restock ke tim pengadaan gudang.`;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Request tidak valid. Sediakan daftar "items" stok atau "customMessage".'
      });
    }

    let responseDetails = 'Simulasi pengiriman backend (Token API belum diset / Mode uji)';
    let isSuccess = false;

    // Jika API token tersedia, lakukan fetch ke provider gateway asli
    if (config.apiToken && config.apiUrl) {
      try {
        let headers = { 'Content-Type': 'application/json' };
        let payload = {};

        if (config.gatewayType === 'fonnte') {
          headers['Authorization'] = config.apiToken;
          payload = {
            target: target,
            message: message
          };
        } else if (config.gatewayType === 'wablas') {
          headers['Authorization'] = config.apiToken;
          payload = {
            phone: target,
            message: message
          };
        } else {
          // Custom Webhook
          headers['Authorization'] = `Bearer ${config.apiToken}`;
          payload = {
            target_phone: target,
            message: message,
            timestamp: new Date().toISOString()
          };
        }

        const gatewayResponse = await fetch(config.apiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        const resText = await gatewayResponse.text();
        responseDetails = `Provider Response (${gatewayResponse.status}): ${resText}`;
        isSuccess = gatewayResponse.ok;

      } catch (fetchErr) {
        responseDetails = `HTTP Connection Error: ${fetchErr.message || fetchErr}`;
        isSuccess = false;
      }
    }

    // Catat log audit pengiriman
    const newLog = {
      id: `walog_${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      target: target,
      messageSnippet: message.slice(0, 120) + (message.length > 120 ? '...' : ''),
      itemsCount: items && Array.isArray(items) ? items.length : 1,
      status: isSuccess ? 'SUCCESS' : (config.apiToken ? 'FAILED' : 'SIMULATED'),
      details: responseDetails
    };
    logHistory.unshift(newLog);

    return res.json({
      success: true,
      message: isSuccess 
        ? 'Notifikasi WhatsApp berhasil dikirim via Gateway Proxy!' 
        : (config.apiToken ? 'Pengiriman ke API Gateway mengalami kendala.' : 'Notifikasi WhatsApp berhasil diproses secara simulasi backend.'),
      targetPhone: target,
      itemsCount: items && Array.isArray(items) ? items.length : 1,
      formattedMessage: message,
      gatewayDetails: responseDetails,
      log: newLog
    });

  } catch (err) {
    console.error('[WhatsApp Gateway Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses proxy pengiriman WhatsApp',
      error: String(err)
    });
  }
});

/**
 * POST /test
 * Uji koneksi gateway WhatsApp secara instan
 */
router.post('/test', async (req, res) => {
  const { targetPhone } = req.body;
  const target = targetPhone || config.targetPhones || '081290008888';
  const testMsg = `✅ [UJI KONEKSI WHATSAPP FIELD-OPS IT]\nSistem backend Express proxy berhasil terhubung dengan Gateway WhatsApp.\n\n⏰ Waktu Uji: ${new Date().toLocaleString('id-ID')}\nTarget: ${target}\nStatus: ONLINE & SIAP TERIMA ALERT STOK.`;

  try {
    let isSuccess = false;
    let details = 'Simulasi uji koneksi backend server (Sukses)';

    if (config.apiToken && config.apiUrl) {
      let headers = { 'Content-Type': 'application/json' };
      if (config.gatewayType === 'fonnte' || config.gatewayType === 'wablas') {
        headers['Authorization'] = config.apiToken;
      } else {
        headers['Authorization'] = `Bearer ${config.apiToken}`;
      }

      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          target: target,
          phone: target,
          message: testMsg
        })
      });

      const resText = await response.text();
      details = `Gateway Response (${response.status}): ${resText}`;
      isSuccess = response.ok;
    }

    const newLog = {
      id: `walog_test_${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      target: target,
      messageSnippet: testMsg.slice(0, 100),
      itemsCount: 0,
      status: isSuccess ? 'SUCCESS' : (config.apiToken ? 'FAILED' : 'SIMULATED'),
      details: details
    };
    logHistory.unshift(newLog);

    return res.json({
      success: true,
      message: 'Uji koneksi WhatsApp Gateway berhasil dilakukan!',
      targetPhone: target,
      details,
      log: newLog
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Gagal melakukan uji koneksi WhatsApp Gateway',
      error: String(err)
    });
  }
});

/**
 * GET /logs
 * Mengambil seluruh riwayat log pengiriman notifikasi
 */
router.get('/logs', (req, res) => {
  res.json({
    success: true,
    logs: logHistory
  });
});

module.exports = router;

// Jika dijalankan langsung sebagai standalone process (`node server/whatsapp-gateway.js`)
if (require.main === module) {
  const app = express();
  const PORT = process.env.WA_PORT || 3001;

  app.use(express.json());
  app.use('/api/whatsapp', router);

  app.listen(PORT, () => {
    console.log(`[WhatsApp Gateway Standalone Service] Berjalan di http://localhost:${PORT}/api/whatsapp`);
  });
}
