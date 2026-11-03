/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Core Inventory Types
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  minStockAlert: number;
  unit: string; // 'pcs', 'meter', 'roll', 'box', 'unit', 'set'
  location: string; // e.g., 'Rak A-02 Gudang Utama', 'Mobil Service Unit 1'
  specs: string;
  unitCost: number; // in IDR
  lastUpdated: string;
  notes?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  code: string;
}

export interface DatabaseWorkspace {
  id: string;
  name: string;
  companyName: string;
  description: string;
  isDefault?: boolean;
}

// Re-export domain-specific types for clean backwards compatibility
export * from './transaction';
export * from './auth';
export * from './ticket';
