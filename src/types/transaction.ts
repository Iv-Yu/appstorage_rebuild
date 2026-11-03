/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'IN' | 'OUT' | 'ADJUST';

export type ReferenceType = 
  | 'TICKET_EXTERNAL' 
  | 'PURCHASE_ORDER' 
  | 'ROUTINE_MAINTENANCE' 
  | 'EMERGENCY_REPAIR'
  | 'RETURN_RESTOCK'
  | 'INITIAL_COUNT'
  | string;

export interface Transaction {
  id: string;
  type: TransactionType;
  item_id?: string;
  itemId?: string;
  item_sku?: string;
  itemSku?: string;
  item_name?: string;
  itemName?: string;
  quantity: number;
  unit?: string;
  item_unit?: string;
  date?: string;
  created_at?: string;
  reference_type?: ReferenceType;
  referenceType?: ReferenceType;
  reference_number?: string;
  referenceNumber?: string;
  performed_by?: string;
  performedBy?: string;
  technicianId?: string;
  recipient_destination?: string;
  recipientOrDestination?: string;
  notes?: string;
  apiSource?: string;
  previous_qty?: number;
  new_qty?: number;
}

export interface WeeklySummary {
  weekLabel: string;
  startDate: string;
  endDate: string;
  initialStockCount: number;
  totalInflow: number;
  totalOutflow: number;
  endingStockCount: number;
  topMovingItems: Array<{
    itemId: string;
    itemName: string;
    sku: string;
    outflowCount: number;
  }>;
}
