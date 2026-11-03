/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, testFirestoreConnection, ensureFirebaseAuthSession } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  collection 
} from 'firebase/firestore';
import { InventoryItem, Transaction } from '../types';

export type SyncActionType = 
  | 'STOCK_IN' 
  | 'STOCK_OUT' 
  | 'BATCH_STOCK_OUT' 
  | 'ADD_ITEM' 
  | 'UPDATE_ITEM' 
  | 'DELETE_ITEM' 
  | 'TICKET_CONSUME'
  | 'ADD_INSPECTION_LOG';

export interface QueuedSyncAction {
  id: string;
  actionType: SyncActionType;
  workspaceId: string;
  payload: any;
  createdAt: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
  error?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
}

const QUEUE_STORAGE_KEY = 'fieldops_offline_sync_queue';
const LAST_SYNC_KEY = 'fieldops_last_firestore_sync';

class OfflineSyncService {
  private queue: QueuedSyncAction[] = [];
  private isSyncing = false;
  private lastSyncTime: string | null = null;
  private lastError: string | null = null;
  private listeners: Array<(status: SyncStatus) => void> = [];
  private syncTimer: any = null;

  constructor() {
    this.loadQueue();
    this.setupListeners();
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      this.queue = saved ? JSON.parse(saved) : [];
      this.lastSyncTime = localStorage.getItem(LAST_SYNC_KEY) || null;
    } catch (e) {
      console.warn('Failed to load offline sync queue', e);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.warn('Failed to save offline sync queue', e);
    }
    this.notifyListeners();
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    // Automatic trigger when network connectivity is restored
    window.addEventListener('online', () => {
      console.log('Network restored. Triggering offline sync to Firestore...');
      this.syncNow();
    });

    // Listen for Service Worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_REQUEST') {
          this.syncNow();
        }
      });
    }

    // Periodic check every 30 seconds if online and there are pending actions
    this.syncTimer = setInterval(() => {
      if (navigator.onLine && this.queue.some(q => q.status === 'PENDING')) {
        this.syncNow();
      }
    }, 30000);
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(l => l(status));
  }

  public getStatus(): SyncStatus {
    return {
      isSyncing: this.isSyncing,
      pendingCount: this.queue.filter(q => q.status === 'PENDING').length,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }

  public getPendingQueue(): QueuedSyncAction[] {
    return [...this.queue];
  }

  /**
   * Enqueue a new mutation action performed while offline (or online for backup sync)
   */
  public enqueue(actionType: SyncActionType, workspaceId: string, payload: any) {
    const action: QueuedSyncAction = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actionType,
      workspaceId: workspaceId || 'default',
      payload,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0,
    };

    this.queue.push(action);
    this.saveQueue();

    // If online, immediately try to sync the queue in background
    if (navigator.onLine) {
      this.syncNow();
    }
  }

  /**
   * Process all pending actions and commit them to Firestore
   */
  public async syncNow(): Promise<{ success: boolean; syncedCount: number; errors: any[] }> {
    if (this.isSyncing) {
      return { success: true, syncedCount: 0, errors: [] };
    }

    if (!navigator.onLine) {
      this.lastError = 'Tidak ada koneksi internet. Perubahan tersimpan di antrean offline.';
      this.notifyListeners();
      return { success: false, syncedCount: 0, errors: [new Error('Offline')] };
    }

    const pendingActions = this.queue.filter(a => a.status === 'PENDING');
    if (pendingActions.length === 0) {
      return { success: true, syncedCount: 0, errors: [] };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notifyListeners();

    let syncedCount = 0;
    const errors: any[] = [];

    try {
      await ensureFirebaseAuthSession();
      for (const action of pendingActions) {
        action.status = 'SYNCING';
        this.saveQueue();

        try {
          await this.executeActionOnFirestore(action);
          // Action succeeded: remove from queue
          this.queue = this.queue.filter(a => a.id !== action.id);
          syncedCount++;
        } catch (err: any) {
          console.error(`Failed to sync action ${action.id} (${action.actionType}):`, err);
          action.status = 'PENDING';
          action.retryCount += 1;
          action.error = err?.message || 'Sync failed';
          errors.push(err);
        }

        this.saveQueue();
      }

      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, this.lastSyncTime);
    } catch (globalErr: any) {
      console.error('Offline sync service encountered an error:', globalErr);
      this.lastError = globalErr?.message || 'Gagal sinkronisasi';
      errors.push(globalErr);
    } finally {
      this.isSyncing = false;
      this.saveQueue();
    }

    return {
      success: errors.length === 0,
      syncedCount,
      errors,
    };
  }

  /**
   * Execute single action onto Firestore database
   */
  private async executeActionOnFirestore(action: QueuedSyncAction): Promise<void> {
    const ws = action.workspaceId || 'default';
    const { actionType, payload } = action;

    switch (actionType) {
      case 'ADD_ITEM': {
        const item: InventoryItem = payload.item;
        const itemRef = doc(db, 'workspaces', ws, 'items', item.id);
        await setDoc(itemRef, item, { merge: true });

        if (payload.initialTransaction) {
          const tx: Transaction = payload.initialTransaction;
          const txRef = doc(db, 'workspaces', ws, 'transactions', tx.id);
          await setDoc(txRef, tx, { merge: true });
        }
        break;
      }

      case 'UPDATE_ITEM': {
        const { id, updates } = payload;
        const itemRef = doc(db, 'workspaces', ws, 'items', id);
        await updateDoc(itemRef, {
          ...updates,
          lastUpdated: new Date().toISOString(),
        });
        break;
      }

      case 'DELETE_ITEM': {
        const { id } = payload;
        const itemRef = doc(db, 'workspaces', ws, 'items', id);
        await deleteDoc(itemRef);
        break;
      }

      case 'STOCK_IN': {
        const { item, transaction } = payload;
        const batch = writeBatch(db);

        // Update item quantity
        const itemRef = doc(db, 'workspaces', ws, 'items', item.id);
        batch.set(itemRef, item, { merge: true });

        // Record Inflow transaction
        const txRef = doc(db, 'workspaces', ws, 'transactions', transaction.id);
        batch.set(txRef, transaction, { merge: true });

        await batch.commit();
        break;
      }

      case 'STOCK_OUT': {
        const { item, transaction } = payload;
        const batch = writeBatch(db);

        // Update item quantity
        const itemRef = doc(db, 'workspaces', ws, 'items', item.id);
        batch.set(itemRef, item, { merge: true });

        // Record Outflow transaction
        const txRef = doc(db, 'workspaces', ws, 'transactions', transaction.id);
        batch.set(txRef, transaction, { merge: true });

        await batch.commit();
        break;
      }

      case 'BATCH_STOCK_OUT': {
        const { updatedItems, transaction } = payload;
        const batch = writeBatch(db);

        // Deduct all items in batch
        for (const item of updatedItems) {
          const itemRef = doc(db, 'workspaces', ws, 'items', item.id);
          batch.set(itemRef, item, { merge: true });
        }

        // Record transaction
        const txRef = doc(db, 'workspaces', ws, 'transactions', transaction.id);
        batch.set(txRef, transaction, { merge: true });

        await batch.commit();
        break;
      }

      case 'TICKET_CONSUME': {
        const { updatedItems, transaction, log } = payload;
        const batch = writeBatch(db);

        for (const item of updatedItems) {
          const itemRef = doc(db, 'workspaces', ws, 'items', item.id);
          batch.set(itemRef, item, { merge: true });
        }

        if (transaction) {
          const txRef = doc(db, 'workspaces', ws, 'transactions', transaction.id);
          batch.set(txRef, transaction, { merge: true });
        }

        if (log) {
          const logRef = doc(db, 'workspaces', ws, 'integration_logs', log.id);
          batch.set(logRef, log, { merge: true });
        }

        await batch.commit();
        break;
      }

      case 'ADD_INSPECTION_LOG': {
        const { inspectionLog } = payload;
        if (inspectionLog && inspectionLog.id) {
          const logRef = doc(db, 'workspaces', ws, 'inspections', inspectionLog.id);
          await setDoc(logRef, inspectionLog, { merge: true });
        }
        break;
      }

      default:
        console.warn(`Unknown action type: ${actionType}`);
    }
  }

  public clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const offlineSyncService = new OfflineSyncService();
