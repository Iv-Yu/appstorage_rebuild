/**
 * Weekly Reports & Data Export Router (with CWE-1236 Sanitization)
 * FieldOps IT Inventory Rebuild - MariaDB 11.x
 */

import express from 'express';
import { executeQuery } from '../db/database';
import { sanitizeFormulaInput } from '../utils/security';

const router = express.Router();

/**
 * GET /api/reports/weekly
 * Rekap data mutasi 7 hari terakhir, total barang masuk, keluar, dan top moving items
 */
router.get('/weekly', async (_req, res) => {
  try {
    const transactions = await executeQuery<any>('SELECT * FROM transactions ORDER BY created_at DESC');
    const items = await executeQuery<any>('SELECT * FROM items WHERE is_deleted = FALSE');
    const categories = await executeQuery<any>('SELECT * FROM categories');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyTxs = transactions.filter(t => new Date(t.created_at).getTime() >= sevenDaysAgo.getTime());

    let totalInQty = 0;
    let totalOutQty = 0;
    let totalInTxCount = 0;
    let totalOutTxCount = 0;

    const movingStats = new Map<string, { itemId: string; name: string; sku: string; outQty: number; inQty: number }>();

    for (const tx of weeklyTxs) {
      if (tx.type === 'IN') {
        totalInQty += tx.quantity;
        totalInTxCount += 1;
      } else if (tx.type === 'OUT') {
        totalOutQty += tx.quantity;
        totalOutTxCount += 1;
      }

      const existing = movingStats.get(tx.item_id) || {
        itemId: tx.item_id,
        name: tx.item_name || 'Item',
        sku: tx.item_sku || '',
        outQty: 0,
        inQty: 0
      };

      if (tx.type === 'OUT') existing.outQty += tx.quantity;
      if (tx.type === 'IN') existing.inQty += tx.quantity;
      movingStats.set(tx.item_id, existing);
    }

    const topMoving = Array.from(movingStats.values())
      .sort((a, b) => b.outQty - a.outQty)
      .slice(0, 5);

    // Hitung status stok saat ini
    const normalCount = items.filter(it => it.status === 'NORMAL').length;
    const lowCount = items.filter(it => it.status === 'LOW_STOCK').length;
    const outCount = items.filter(it => it.status === 'OUT_OF_STOCK').length;

    res.json({
      success: true,
      reportPeriod: {
        startDate: sevenDaysAgo.toISOString(),
        endDate: new Date().toISOString()
      },
      summary: {
        totalInQty,
        totalOutQty,
        totalInTxCount,
        totalOutTxCount,
        activeItemsCount: items.length,
        categoriesCount: categories.length,
        stockStatusBreakdown: {
          normal: normalCount,
          lowStock: lowCount,
          outOfStock: outCount
        }
      },
      topMovingItems: topMoving
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/reports/export/csv
 * Ekspor CSV Tersanitasi Penuh (CWE-1236 Prevention)
 */
router.get('/export/csv', async (_req, res) => {
  try {
    const items = await executeQuery<any>(
      `SELECT i.sku, i.barcode, i.name, c.name as category_name, i.quantity, i.unit, i.min_stock_alert, i.location, i.status, i.unit_cost
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.is_deleted = FALSE
       ORDER BY i.sku ASC`
    );

    const headers = ['SKU', 'Barcode', 'Nama Barang', 'Kategori', 'Stok', 'Satuan', 'Min Alert', 'Lokasi Rak', 'Status', 'Harga Satuan (Rp)'];
    
    const rows = items.map(it => [
      sanitizeFormulaInput(it.sku),
      sanitizeFormulaInput(it.barcode || ''),
      sanitizeFormulaInput(it.name),
      sanitizeFormulaInput(it.category_name || ''),
      it.quantity,
      sanitizeFormulaInput(it.unit),
      it.min_stock_alert,
      sanitizeFormulaInput(it.location || ''),
      sanitizeFormulaInput(it.status),
      it.unit_cost
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=fieldops-inventory-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
