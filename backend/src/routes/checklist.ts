/**
 * Field Trip Checklist Router
 * FieldOps IT Inventory Rebuild - MariaDB 11.x
 */

import express from 'express';
import { executeQuery } from '../db/database';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

// GET /api/checklists
router.get('/', async (_req, res) => {
  try {
    const rows = await executeQuery<any>('SELECT * FROM checklists ORDER BY created_at DESC LIMIT 50');
    const checklists = rows.map(r => ({
      ...r,
      items: typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json
    }));
    res.json({ success: true, checklists });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/checklists
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { inspectionType, vehicleOrKitName, items, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Daftar item checklist tidak boleh kosong.' });
    }

    const id = `chk-${Date.now()}`;
    const user = req.user!;

    await executeQuery(
      `INSERT INTO checklists (id, technician_id, technician_name, inspection_type, vehicle_or_kit_name, notes, items_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.id,
        user.name,
        inspectionType || 'TOOLKIT_CHECK',
        vehicleOrKitName || 'Tas Utama Teknisi',
        notes || '',
        JSON.stringify(items)
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Checklist perlengkapan teknisi berhasil disimpan.',
      checklistId: id
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
