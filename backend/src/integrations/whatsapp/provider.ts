/**
 * WhatsApp Integration Provider Interface
 * FieldOps IT Inventory - Single Consolidated WhatsApp Gateway Module
 */

export interface SendResult {
  success: boolean;
  details: string;
}

export interface WhatsAppProvider {
  sendMessage(to: string, text: string): Promise<SendResult>;
}
