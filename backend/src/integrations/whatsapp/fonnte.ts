/**
 * Fonnte WhatsApp Gateway Provider Implementation
 * FieldOps IT Inventory
 */

import { WhatsAppProvider, SendResult } from './provider';

export class FonnteProvider implements WhatsAppProvider {
  private apiUrl: string;
  private apiToken: string;

  constructor(apiUrl?: string, apiToken?: string) {
    this.apiUrl = apiUrl || process.env.WHATSAPP_API_URL || 'https://api.fonnte.com/send';
    this.apiToken = apiToken || process.env.WHATSAPP_API_TOKEN || '';
  }

  async sendMessage(to: string, text: string): Promise<SendResult> {
    if (!this.apiToken) {
      return {
        success: false,
        details: 'Simulasi pengiriman backend (Token API Fonnte belum dikonfigurasi di env/database).'
      };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': this.apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target: to,
          message: text
        })
      });

      const data = await response.text();
      return {
        success: response.ok,
        details: `Fonnte Response (${response.status}): ${data}`
      };
    } catch (err: any) {
      return {
        success: false,
        details: `HTTP Connection Error ke Fonnte API: ${err.message || String(err)}`
      };
    }
  }
}
