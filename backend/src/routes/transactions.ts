/**
 * Transactions Router (Stock In, Stock Out, Batch Out Endpoints)
 * FieldOps IT Inventory Rebuild
 */

import express from 'express';
import { TransactionService } from '../services/transactionService';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit || '100'), 10);
    const transactions = await TransactionService.getAllTransactions(limit);
    res.json({ success: true, transactions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/transactions/in
router.post('/in', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const operator = { id: req.user!.id, name: req.user!.name };
    const result = await TransactionService.recordStockIn(req.body, operator);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/transactions/out
router.post('/out', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const operator = { id: req.user!.id, name: req.user!.name };
    const result = await TransactionService.recordStockOut(req.body, operator);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/transactions/batch-out
router.post('/batch-out', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const operator = { id: req.user!.id, name: req.user!.name };
    const result = await TransactionService.recordBatchStockOut(req.body, operator);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
