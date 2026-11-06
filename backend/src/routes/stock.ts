/**
 * Stock Router (Tahap 3: Input Stok Kamera/Scanner & Bulk Input)
 * FieldOps Inventory v2
 */

import express from 'express';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/authMiddleware';
import { StockService } from '../services/stockService';

const router = express.Router();

router.get('/check-id/:kode_id', requireAuth, async (req, res) => {
  try {
    const kodeId = String(req.params.kode_id);
    const result = await StockService.checkDuplicateKodeId(kodeId);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  '/single',
  requireAuth,
  requireRole(['developer', 'admin', 'warehouse_admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { tipe_id, box_id, kode_id, catatan } = req.body;
      if (!tipe_id || !box_id || !kode_id) {
        return res.status(400).json({ success: false, message: 'tipe_id, box_id, dan kode_id wajib diisi.' });
      }

      const result = await StockService.inputStokItemSingle({
        tipe_id: Number(tipe_id),
        box_id: String(box_id),
        kode_id: String(kode_id),
        user_id: req.user!.id,
        catatan
      });

      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/bulk',
  requireAuth,
  requireRole(['developer', 'admin', 'warehouse_admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { tipe_id, box_id, kode_ids, auto_count, catatan, confirmation_token } = req.body;
      if (!tipe_id || !box_id) {
        return res.status(400).json({ success: false, message: 'tipe_id dan box_id wajib diisi.' });
      }

      const result = await StockService.inputStokItemBulk({
        tipe_id: Number(tipe_id),
        box_id: String(box_id),
        kode_ids,
        auto_count: auto_count ? Number(auto_count) : undefined,
        user_id: req.user!.id,
        catatan,
        confirmation_token
      });

      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/quantity',
  requireAuth,
  requireRole(['developer', 'admin', 'warehouse_admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { tipe_id, box_id, jumlah, catatan } = req.body;
      if (!tipe_id || !box_id || !jumlah) {
        return res.status(400).json({ success: false, message: 'tipe_id, box_id, dan jumlah wajib diisi.' });
      }

      const result = await StockService.inputStokJumlah({
        tipe_id: Number(tipe_id),
        box_id: String(box_id),
        jumlah: Number(jumlah),
        user_id: req.user!.id,
        catatan
      });

      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
);

export default router;
