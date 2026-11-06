/**
 * Box Router (Tahap 3: Box Penyimpanan & QR Scan Isi)
 * FieldOps Inventory v2
 */

import express from 'express';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/authMiddleware';
import { StockService } from '../services/stockService';

const router = express.Router();

router.get('/', requireAuth, async (_req, res) => {
  try {
    const list = await StockService.listBoxes();
    return res.json({ success: true, boxes: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const boxId = String(req.params.id);
    let contents;
    if (boxId.startsWith('BOX-') || boxId.startsWith('box-') || !boxId.includes('-')) {
      const boxByKode = await StockService.getBoxByKode(boxId);
      if (boxByKode) {
        contents = await StockService.getBoxContents(boxByKode.id);
      } else {
        contents = await StockService.getBoxContents(boxId);
      }
    } else {
      contents = await StockService.getBoxContents(boxId);
    }

    return res.json({ success: true, ...contents });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  '/',
  requireAuth,
  requireRole(['developer', 'admin', 'warehouse_admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { kode, keterangan } = req.body;
      if (!kode || String(kode).trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Kode Box wajib diisi (contoh: BOX-A-01).' });
      }

      const created = await StockService.createBox(String(kode), keterangan, req.user!.id);
      return res.status(201).json({ success: true, message: 'Box berhasil dibuat.', box: created });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/move',
  requireAuth,
  requireRole(['developer', 'admin', 'warehouse_admin']),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { item_id, tipe_id, box_asal_id, box_tujuan_id, jumlah, catatan } = req.body;
      if (!box_asal_id || !box_tujuan_id) {
        return res.status(400).json({ success: false, message: 'box_asal_id dan box_tujuan_id wajib diisi.' });
      }

      const result = await StockService.pindahBox({
        itemId: item_id,
        tipeId: tipe_id ? Number(tipe_id) : undefined,
        boxAsalId: String(box_asal_id),
        boxTujuanId: String(box_tujuan_id),
        jumlah: jumlah ? Number(jumlah) : undefined,
        userId: req.user!.id,
        catatan
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
);

export default router;
