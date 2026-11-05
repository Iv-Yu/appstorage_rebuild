/**
 * WhatsApp Gateway Service Helper
 * Handles communication with Express backend /api/whatsapp endpoints
 * Sends authorized X-App-Secret-Key header per SEC-03 remediation
 */

export interface WhatsAppConfigData {
  gatewayType: 'fonnte' | 'wablas' | 'custom_webhook';
  apiUrl: string;
  apiToken: string;
  targetPhones: string;
  autoAlertEnabled: boolean;
  maskedToken?: string;
}

export interface WaLogItem {
  id: string;
  timestamp: string;
  target: string;
  messageSnippet: string;
  itemsCount: number;
  status: 'SUCCESS' | 'FAILED' | 'SIMULATED';
  details: string;
}

const CONFIG_STORAGE_KEY = 'fieldops_wa_config';
const INTERNAL_SECRET = 'fieldops-internal-proxy-v1';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'X-App-Secret-Key': INTERNAL_SECRET,
});

export class WhatsAppService {
  /**
   * Load stored config or fetch from Express backend with authorization
   */
  async getConfig(): Promise<WhatsAppConfigData> {
    try {
      const res = await fetch('/api/whatsapp/config', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(data.config));
          return data.config;
        }
      }
    } catch {
      // Fallback to localStorage if offline
    }

    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}

    return {
      gatewayType: 'fonnte',
      apiUrl: 'https://api.fonnte.com/send',
      apiToken: '',
      targetPhones: '081290008888',
      autoAlertEnabled: true,
    };
  }

  /**
   * Save config to backend Express server & local storage
   */
  async updateConfig(config: WhatsAppConfigData): Promise<boolean> {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to update WA config on backend:', err);
      return false;
    }
  }

  /**
   * Send WhatsApp Alert for Out-Of-Stock or Low-Stock items via Backend Proxy
   */
  async sendStockAlert(
    items: Array<{
      sku: string;
      name: string;
      quantity: number;
      minStockAlert: number;
      unit: string;
    }>,
    triggerSource: string = 'Pengurangan Stok'
  ): Promise<{ success: boolean; message: string; log?: WaLogItem }> {
    try {
      const config = await this.getConfig();
      if (!config.autoAlertEnabled && triggerSource.includes('Otomatis')) {
        return {
          success: false,
          message: 'Otomatisasi notifikasi WhatsApp sedang dinonaktifkan di pengaturan.',
        };
      }

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          targetPhone: config.targetPhones,
          items,
          triggerSource,
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: `Server mengembalikan status HTTP ${res.status} (${res.statusText})` };
      }

      if (!res.ok) {
        return {
          success: false,
          message: data.message || `Gagal mengirim notifikasi (HTTP ${res.status}).`,
        };
      }

      return {
        success: data.success ?? res.ok,
        message: data.message || 'Sinyal WhatsApp terkirim',
        log: data.log,
      };
    } catch (err: any) {
      console.error('WhatsApp send error:', err);
      return {
        success: false,
        message: `Gagal mengirim notifikasi WhatsApp: ${err.message || err}`,
      };
    }
  }

  /**
   * Test WhatsApp Gateway Connection
   */
  async testConnection(targetPhone?: string): Promise<{ success: boolean; message: string; details?: string }> {
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ targetPhone }),
      });
      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: `Server mengembalikan status HTTP ${res.status} (${res.statusText})` };
      }
      return {
        success: data.success ?? res.ok,
        message: data.message || (res.ok ? 'Uji koneksi terkirim' : `Gagal HTTP ${res.status}`),
        details: data.details,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal menghubungi server backend: ${err.message || err}`,
      };
    }
  }

  /**
   * Fetch WhatsApp Log History
   */
  async getLogs(): Promise<WaLogItem[]> {
    try {
      const res = await fetch('/api/whatsapp/logs', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
    } catch {}
    return [];
  }
}

export const whatsappService = new WhatsAppService();
