/**
 * Transaction Repository
 * FieldOps IT Inventory Rebuild - MariaDB 11.x
 */

import { executeQuery } from '../db/database';

export interface TransactionRecord {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  item_id: string;
  quantity: number;
  previous_qty: number;
  new_qty: number;
  reference_type: string;
  reference_number: string;
  recipient_destination: string;
  user_id: string;
  performed_by: string;
  notes?: string;
  created_at?: string;
  item_name?: string;
  item_sku?: string;
  item_unit?: string;
}

export class TransactionRepository {
  static async findAll(limit: number = 100): Promise<TransactionRecord[]> {
    const sql = `
      SELECT t.*, i.name as item_name, i.sku as item_sku, i.unit as item_unit
      FROM transactions t
      LEFT JOIN items i ON t.item_id = i.id
      ORDER BY t.created_at DESC
      LIMIT ?
    `;
    return executeQuery<TransactionRecord>(sql, [limit]);
  }

  static async findByItemId(itemId: string, limit: number = 50): Promise<TransactionRecord[]> {
    const sql = `
      SELECT t.*, i.name as item_name, i.sku as item_sku, i.unit as item_unit
      FROM transactions t
      LEFT JOIN items i ON t.item_id = i.id
      WHERE t.item_id = ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `;
    return executeQuery<TransactionRecord>(sql, [itemId, limit]);
  }
}
