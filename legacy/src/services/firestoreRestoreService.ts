/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, ensureFirebaseAuthSession, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { InventoryItem, Category, Transaction } from '../types';

export interface RestoreProgressCallback {
  (step: string, percentage: number): void;
}

export interface RestoreResult {
  success: boolean;
  totalRestored: number;
  counts: {
    items: number;
    trash: number;
    categories: number;
    transactions: number;
    checklists: number;
  };
  errors: string[];
  restoredAt: string;
}

/**
 * Parses and extracts normalized collections from raw backup JSON payloads
 */
export function normalizeBackupCollections(rawData: any): {
  items: InventoryItem[];
  trashItems: InventoryItem[];
  categories: Category[];
  transactions: Transaction[];
  checklists: any[];
  meta: {
    version: string;
    system: string;
    createdAt: string;
    triggeredBy?: string;
  };
} {
  const root = rawData?.collections || rawData;

  const items: InventoryItem[] = Array.isArray(root?.inventory_items) 
    ? root.inventory_items 
    : (Array.isArray(root?.items) ? root.items : []);

  const trashItems: InventoryItem[] = Array.isArray(root?.trash_items) 
    ? root.trash_items 
    : (Array.isArray(root?.trash) ? root.trash : []);

  const categories: Category[] = Array.isArray(root?.categories) 
    ? root.categories 
    : [];

  const transactions: Transaction[] = Array.isArray(root?.stock_transactions) 
    ? root.stock_transactions 
    : (Array.isArray(root?.transactions) ? root.transactions : []);

  const checklists: any[] = Array.isArray(root?.technician_checklists) 
    ? root.technician_checklists 
    : (Array.isArray(root?.checklists) ? root.checklists : []);

  return {
    items,
    trashItems,
    categories,
    transactions,
    checklists,
    meta: {
      version: rawData?.version || '0.3.1',
      system: rawData?.system || 'FieldOps IT Inventory & Operations',
      createdAt: rawData?.createdAt || new Date().toISOString(),
      triggeredBy: rawData?.triggeredBy
    }
  };
}

/**
 * Performs a bulk restore of Firestore documents under the selected workspace in batched operations
 */
export async function bulkRestoreToFirestore(
  workspaceId: string,
  backupData: any,
  onProgress?: RestoreProgressCallback
): Promise<RestoreResult> {
  const errors: string[] = [];
  const ws = workspaceId || 'default';

  onProgress?.('Memeriksa autentikasi Firestore...', 5);
  await ensureFirebaseAuthSession();

  const normalized = normalizeBackupCollections(backupData);
  const { items, trashItems, categories, transactions, checklists } = normalized;

  const counts = {
    items: 0,
    trash: 0,
    categories: 0,
    transactions: 0,
    checklists: 0,
  };

  try {
    // Firestore allows max 500 operations per batch commit. We keep batches at 350 for safety.
    const BATCH_LIMIT = 350;
    let currentBatch = writeBatch(db);
    let currentBatchOps = 0;

    const commitBatchIfNeeded = async (force = false) => {
      if (currentBatchOps >= BATCH_LIMIT || (force && currentBatchOps > 0)) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        currentBatchOps = 0;
      }
    };

    // Step 1: Categories
    onProgress?.(`Memulihkan ${categories.length} data kategori...`, 20);
    for (const cat of categories) {
      if (!cat.id) continue;
      const ref = doc(db, 'workspaces', ws, 'categories', cat.id);
      currentBatch.set(ref, cat, { merge: true });
      currentBatchOps++;
      counts.categories++;
      await commitBatchIfNeeded();
    }

    // Step 2: Inventory Items
    onProgress?.(`Memulihkan ${items.length} katalog suku cadang...`, 45);
    for (const item of items) {
      if (!item.id) continue;
      const ref = doc(db, 'workspaces', ws, 'items', item.id);
      currentBatch.set(ref, item, { merge: true });
      currentBatchOps++;
      counts.items++;
      await commitBatchIfNeeded();
    }

    // Step 3: Trash Items (Soft Delete)
    onProgress?.(`Memulihkan ${trashItems.length} item sampah (soft delete)...`, 65);
    for (const trash of trashItems) {
      if (!trash.id) continue;
      const ref = doc(db, 'workspaces', ws, 'trash', trash.id);
      currentBatch.set(ref, trash, { merge: true });
      currentBatchOps++;
      counts.trash++;
      await commitBatchIfNeeded();
    }

    // Step 4: Transactions
    onProgress?.(`Memulihkan ${transactions.length} riwayat transaksi mutasi...`, 80);
    for (const tx of transactions) {
      if (!tx.id) continue;
      const ref = doc(db, 'workspaces', ws, 'transactions', tx.id);
      currentBatch.set(ref, tx, { merge: true });
      currentBatchOps++;
      counts.transactions++;
      await commitBatchIfNeeded();
    }

    // Step 5: Checklists
    onProgress?.(`Memulihkan ${checklists.length} checklist teknisi...`, 90);
    for (const ch of checklists) {
      const id = ch.id || ch.date || `chk-${Date.now()}`;
      const ref = doc(db, 'workspaces', ws, 'checklists', id);
      currentBatch.set(ref, ch, { merge: true });
      currentBatchOps++;
      counts.checklists++;
      await commitBatchIfNeeded();
    }

    // Final Commit of remaining items
    await commitBatchIfNeeded(true);

    // Update workspace metadata marker
    try {
      const metaRef = doc(db, 'workspaces', ws);
      const metaBatch = writeBatch(db);
      metaBatch.set(metaRef, {
        lastRestoredAt: new Date().toISOString(),
        restoredBackupVersion: normalized.meta.version,
        restoredSummary: counts
      }, { merge: true });
      await metaBatch.commit();
    } catch (metaErr) {
      console.warn('[Restore Service] Could not update workspace meta doc:', metaErr);
    }

    onProgress?.('Pemulihan dokumen Firestore selesai!', 100);

    const totalRestored = counts.items + counts.trash + counts.categories + counts.transactions + counts.checklists;

    return {
      success: true,
      totalRestored,
      counts,
      errors,
      restoredAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[Restore Service] Bulk Firestore Restore Error:', err);
    errors.push(err.message || String(err));
    handleFirestoreError(err, OperationType.WRITE, `workspaces/${ws}`);
  }
}
