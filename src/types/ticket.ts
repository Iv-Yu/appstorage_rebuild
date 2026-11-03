/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  system: string; // e.g. "Jira Service Desk", "Zendesk IT Helpdesk", "GLPI Helpdesk", "Custom ERP"
  createdAt: string;
  lastUsedAt: string | null;
  isActive: boolean;
  allowedActions: string[];
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  ticketId: string;
  ticketTitle: string;
  systemName: string;
  technicianName: string;
  itemsRequested: Array<{ sku: string; name: string; quantity: number; unit: string }>;
  status: 'SUCCESS' | 'FAILED_STOCK' | 'INVALID_PARAMS';
  httpStatus: number;
  message: string;
  stockDeducted: boolean;
}
