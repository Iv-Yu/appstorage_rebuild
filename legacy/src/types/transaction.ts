/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'IN' | 'OUT';

export type ReferenceType = 
  | 'TICKET_EXTERNAL' 
  | 'PURCHASE_ORDER' 
  | 'ROUTINE_MAINTENANCE' 
  | 'EMERGENCY_REPAIR'
  | 'RETURN_RESTOCK'
  | 'INITIAL_COUNT';

export interface Transaction {
  id: string;
  type: TransactionType;
  itemId: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  unit: string;
  date: string; // ISO string
  referenceType: ReferenceType;
  referenceNumber: string; // e.g. "TCK-2026-9812", "PO-2026-0811"
  performedBy: string; // Technician or Admin name
  technicianId?: string;
  recipientOrDestination: string; // e.g., "Ruang Server Lt 2", "Cabang Bintaro"
  notes: string;
  apiSource?: string; // e.g., "Sistem Tiket Jira / Webhook", "Aplikasi Mobile Teknisi"
}

export interface WeeklySummary {
  weekLabel: string;
  startDate: string;
  endDate: string;
  initialStockCount: number;
  totalInflow: number;
  totalOutflow: number;
  finalStockCount: number;
  ticketConsumptionCount: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
}
