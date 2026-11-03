/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InventoryItem as ApiInventoryItem } from '../services/api';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NORMAL';

export type InventoryItem = ApiInventoryItem;

export interface Category {
  id: string;
  name: string;
  description?: string;
  code: string;
}

// Re-export domain-specific types for clean backwards compatibility
export * from './transaction';
export * from './auth';
export * from './ticket';
