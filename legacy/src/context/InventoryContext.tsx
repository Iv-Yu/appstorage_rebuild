/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  InventoryItem, 
  Category, 
  Transaction, 
  UserAccount, 
  ApiKeyItem, 
  IntegrationLog,
  DatabaseWorkspace,
  ReferenceType,
  UserRole
} from '../types/inventory';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_ITEMS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_USERS, 
  INITIAL_API_KEYS, 
  INITIAL_INTEGRATION_LOGS 
} from '../data/mockData';
import { generateSalt, hashPasswordWithSalt } from '../utils/security';
import { offlineSyncService, SyncStatus } from '../services/offlineSyncService';
import { testFirestoreConnection } from '../lib/firebase';
import { whatsappService } from '../services/whatsappService';
import { APP_VERSION, APP_RELEASE_NAME } from '../constants/version';
import { bulkRestoreToFirestore, normalizeBackupCollections } from '../services/firestoreRestoreService';

export const VERSION = '0.3.1';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConsumeStockResult {
  success: boolean;
  message: string;
  affectedItems?: Array<{ sku: string; name: string; quantity: number; remainingStock: number }>;
}

const DEFAULT_WORKSPACES: DatabaseWorkspace[] = [
  {
    id: 'default',
    name: 'Kantor Pusat (Main Cloud SQL)',
    companyName: 'FieldOps Corp Utama',
    description: 'Database Cloud SQL Utama (asia-south1 / youthful-alignment-l01dl)',
    isDefault: true,
  },
  {
    id: 'cabang_bandung',
    name: 'Gudang Cabang Bandung',
    companyName: 'PT FieldOps Regional West Java',
    description: 'Database terpisah untuk operasional IT & suku cadang area Bandung',
  },
  {
    id: 'cabang_surabaya',
    name: 'Gudang Cabang Surabaya',
    companyName: 'PT FieldOps Regional East Java',
    description: 'Database terpisah untuk operasional IT & suku cadang area Surabaya',
  },
];

interface InventoryContextType {
  isAuthenticated: boolean;
  login: (userId: string, passwordAttempt: string) => Promise<boolean>;
  logout: () => void;
  workspaces: DatabaseWorkspace[];
  currentWorkspaceId: string;
  currentWorkspace: DatabaseWorkspace;
  switchWorkspace: (workspaceId: string) => void;
  addWorkspace: (workspace: Omit<DatabaseWorkspace, 'id'>) => void;
  items: InventoryItem[];
  categories: Category[];
  transactions: Transaction[];
  currentUser: UserAccount;
  users: UserAccount[];
  apiKeys: ApiKeyItem[];
  integrationLogs: IntegrationLog[];
  activeTab: 'dashboard' | 'catalog' | 'inout' | 'weekly-report' | 'categories' | 'integration';
  setActiveTab: (tab: 'dashboard' | 'catalog' | 'inout' | 'weekly-report' | 'categories' | 'integration') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  stockFilter: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  setStockFilter: (filter: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK') => void;
  toasts: ToastNotification[];
  removeToast: (id: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  switchUser: (userId: string) => void;
  masterAccount: UserAccount;
  setupMasterAccount: (name: string, email: string, passwordAttempt: string) => Promise<void>;
  approveUser: (userId: string, assignedRole: UserRole) => void;
  rejectUser: (userId: string) => void;
  addUser: (userData: {
    name: string;
    email: string;
    role: 'technician' | 'admin' | 'supervisor';
    department: string;
    phone?: string;
    password?: string;
  }) => Promise<UserAccount>;
  addItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  recordStockIn: (data: {
    itemId: string;
    quantity: number;
    referenceNumber: string;
    performedBy: string;
    recipientOrDestination: string;
    notes: string;
  }) => boolean;
  recordStockOut: (data: {
    itemId: string;
    quantity: number;
    referenceType: ReferenceType;
    referenceNumber: string;
    performedBy?: string;
    recipientOrDestination?: string;
    notes: string;
    apiSource?: string;
  }) => boolean;
  recordBatchStockOut: (
    itemsToDeduct: Array<{ itemId: string; quantity: number }>,
    meta: {
      referenceType: ReferenceType;
      referenceNumber: string;
      recipientOrDestination: string;
      notes: string;
      apiSource?: string;
    }
  ) => boolean;
  consumeStockFromTicket: (payload: {
    ticketId: string;
    ticketTitle: string;
    systemName: string;
    technicianName: string;
    items: Array<{ sku: string; quantity: number }>;
  }) => ConsumeStockResult;
  generateApiKey: (name: string, system: string, allowedActions: string[]) => ApiKeyItem;
  deleteApiKey: (id: string) => void;
  toggleApiKey: (id: string) => void;
  resetToDemoData: () => void;
  clearToEmptyDatabase: () => void;
  importDatabaseJson: (data: any) => boolean;
  itemMap: Map<string, InventoryItem>;
  categoryMap: Map<string, Category>;
  getItemById: (id: string) => InventoryItem | undefined;
  getItemBySku: (sku: string) => InventoryItem | undefined;
  syncStatus: SyncStatus;
  triggerManualSync: () => Promise<void>;
  appVersion: string;
  appReleaseName: string;
  VERSION: string;
  trashItems: InventoryItem[];
  restoreDeletedItem: (id: string) => void;
  permanentlyDeleteItem: (id: string) => void;
  bulkRestoreData: (
    backupData: any,
    options?: {
      targetWorkspaceId?: string;
      restoreToFirestore?: boolean;
      onProgress?: (step: string, percentage: number) => void;
    }
  ) => Promise<{ success: boolean; totalRestored: number; counts: Record<string, number> }>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const getWorkspaceKey = (wsId: string, key: string) => `fieldops_${wsId}_${key}`;

const STORAGE_KEYS = {
  ITEMS: 'fieldops_inventory_items',
  CATEGORIES: 'fieldops_inventory_categories',
  TRANSACTIONS: 'fieldops_inventory_transactions',
  USERS: 'fieldops_inventory_users',
  CURRENT_USER_ID: 'fieldops_inventory_current_user',
  API_KEYS: 'fieldops_inventory_api_keys',
  LOGS: 'fieldops_inventory_logs',
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication State (Fails closed per Security Audit Finding 1)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fieldops_auth_session') === 'true';
    } catch {
      return false;
    }
  });

  // Database Workspaces State
  const [workspaces, setWorkspaces] = useState<DatabaseWorkspace[]>(() => {
    try {
      const saved = localStorage.getItem('fieldops_workspaces');
      return saved ? JSON.parse(saved) : DEFAULT_WORKSPACES;
    } catch {
      return DEFAULT_WORKSPACES;
    }
  });

  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(() => {
    try {
      return localStorage.getItem('fieldops_current_workspace_id') || 'default';
    } catch {
      return 'default';
    }
  });

  const currentWorkspace = useMemo(() => {
    return workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0] || DEFAULT_WORKSPACES[0];
  }, [currentWorkspaceId, workspaces]);

  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(getWorkspaceKey(currentWorkspaceId, 'items')) || localStorage.getItem(STORAGE_KEYS.ITEMS);
      return saved ? JSON.parse(saved) : INITIAL_ITEMS;
    } catch {
      return INITIAL_ITEMS;
    }
  });

  const [trashItems, setTrashItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(getWorkspaceKey(currentWorkspaceId, 'trash_items'));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(getWorkspaceKey(currentWorkspaceId, 'categories')) || localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(getWorkspaceKey(currentWorkspaceId, 'transactions')) || localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) {
        const parsed: UserAccount[] = JSON.parse(saved);
        const master = parsed.find(u => u.isMasterAdmin || u.id === 'usr-master-01');
        // If stored master user lacks PBKDF2 passwordHash or salt, refresh to INITIAL_USERS
        if (!master || !master.passwordHash || !master.salt) {
          return INITIAL_USERS;
        }
        return parsed;
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || INITIAL_USERS[0].id;
    } catch {
      return INITIAL_USERS[0].id;
    }
  });

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(() => {
    try {
      const saved = localStorage.getItem(getWorkspaceKey(currentWorkspaceId, 'api_keys')) || localStorage.getItem(STORAGE_KEYS.API_KEYS);
      return saved ? JSON.parse(saved) : INITIAL_API_KEYS;
    } catch {
      return INITIAL_API_KEYS;
    }
  });

  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLog[]>(() => {
    try {
      const saved = localStorage.getItem(getWorkspaceKey(currentWorkspaceId, 'logs')) || localStorage.getItem(STORAGE_KEYS.LOGS);
      return saved ? JSON.parse(saved) : INITIAL_INTEGRATION_LOGS;
    } catch {
      return INITIAL_INTEGRATION_LOGS;
    }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'catalog' | 'inout' | 'weekly-report' | 'categories' | 'integration'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // O(1) Index Lookups for Scalability & High-Performance Search
  const itemMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(it => map.set(it.id, it));
    return map;
  }, [items]);

  const skuMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(it => map.set(it.sku.toLowerCase(), it));
    return map;
  }, [items]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  const getItemById = (id: string) => itemMap.get(id);
  const getItemBySku = (sku: string) => skuMap.get(sku.toLowerCase());

  // Offline Sync to Firestore State & Listeners
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => offlineSyncService.getStatus());

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe(setSyncStatus);
    testFirestoreConnection();
    return () => unsubscribe();
  }, []);

  const triggerManualSync = async () => {
    const res = await offlineSyncService.syncNow();
    if (res.success && res.syncedCount > 0) {
      showToast(`Sinkronisasi berhasil! ${res.syncedCount} transaksi offline tersimpan di Firestore.`, 'success');
    } else if (!res.success) {
      showToast('Gagal sinkronisasi ke cloud: Cek koneksi internet.', 'error');
    } else {
      showToast('Semua data inventori sudah tersinkronisasi ke cloud.', 'info');
    }
  };

  // Sync Workspaces
  useEffect(() => {
    try {
      localStorage.setItem('fieldops_workspaces', JSON.stringify(workspaces));
      localStorage.setItem('fieldops_current_workspace_id', currentWorkspaceId);
    } catch (e) {
      console.warn('Workspace sync error', e);
    }
  }, [workspaces, currentWorkspaceId]);

  // Sync items per workspace
  useEffect(() => {
    try {
      localStorage.setItem(getWorkspaceKey(currentWorkspaceId, 'items'), JSON.stringify(items));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [items, currentWorkspaceId]);

  useEffect(() => {
    try {
      localStorage.setItem(getWorkspaceKey(currentWorkspaceId, 'categories'), JSON.stringify(categories));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [categories, currentWorkspaceId]);

  useEffect(() => {
    try {
      localStorage.setItem(getWorkspaceKey(currentWorkspaceId, 'transactions'), JSON.stringify(transactions));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [transactions, currentWorkspaceId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [currentUserId]);

  useEffect(() => {
    try {
      localStorage.setItem(getWorkspaceKey(currentWorkspaceId, 'api_keys'), JSON.stringify(apiKeys));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [apiKeys, currentWorkspaceId]);

  useEffect(() => {
    try {
      localStorage.setItem(getWorkspaceKey(currentWorkspaceId, 'logs'), JSON.stringify(integrationLogs));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [integrationLogs, currentWorkspaceId]);

  // Workspace Switcher
  const switchWorkspace = (workspaceId: string) => {
    const targetWs = workspaces.find(w => w.id === workspaceId);
    if (!targetWs) return;

    setCurrentWorkspaceId(workspaceId);
    
    // Load workspace specific dataset
    try {
      const savedItems = localStorage.getItem(getWorkspaceKey(workspaceId, 'items'));
      setItems(savedItems ? JSON.parse(savedItems) : INITIAL_ITEMS);

      const savedCats = localStorage.getItem(getWorkspaceKey(workspaceId, 'categories'));
      setCategories(savedCats ? JSON.parse(savedCats) : INITIAL_CATEGORIES);

      const savedTxs = localStorage.getItem(getWorkspaceKey(workspaceId, 'transactions'));
      setTransactions(savedTxs ? JSON.parse(savedTxs) : INITIAL_TRANSACTIONS);

      const savedKeys = localStorage.getItem(getWorkspaceKey(workspaceId, 'api_keys'));
      setApiKeys(savedKeys ? JSON.parse(savedKeys) : INITIAL_API_KEYS);

      const savedLogs = localStorage.getItem(getWorkspaceKey(workspaceId, 'logs'));
      setIntegrationLogs(savedLogs ? JSON.parse(savedLogs) : INITIAL_INTEGRATION_LOGS);
    } catch (e) {
      console.error('Error switching workspace dataset', e);
    }

    showToast(`Beralih ke Database Workspace: "${targetWs.name}"`, 'success');
  };

  const addWorkspace = (workspaceData: Omit<DatabaseWorkspace, 'id'>) => {
    const newWs: DatabaseWorkspace = {
      ...workspaceData,
      id: `ws_${Date.now()}`,
    };
    setWorkspaces(prev => [...prev, newWs]);
    switchWorkspace(newWs.id);
    showToast(`Database Workspace Baru "${newWs.name}" berhasil disiapkan!`, 'success');
  };

  // Auth Handlers
  const login = async (userId: string, passwordAttempt: string): Promise<boolean> => {
    if (!passwordAttempt || !passwordAttempt.trim()) {
      showToast('Kata sandi wajib diisi!', 'error');
      return false;
    }

    const target = users.find(u => u.id === userId);
    if (!target) {
      showToast('Pengguna tidak ditemukan!', 'error');
      return false;
    }

    if (target.status === 'PENDING_APPROVAL') {
      showToast(`Akun "${target.name}" masih menunggu persetujuan dari Master Admin!`, 'error');
      return false;
    }

    if (target.status === 'REJECTED') {
      showToast(`Akun "${target.name}" telah ditolak oleh Master Admin.`, 'error');
      return false;
    }

    // Verify PBKDF2 (100,000 iterations SHA-256) password hash
    if (!target.passwordHash || !target.salt) {
      showToast('Akun belum memiliki kredensial keamanan yang terdaftar.', 'error');
      return false;
    }

    const attemptHash = await hashPasswordWithSalt(passwordAttempt, target.salt);
    if (attemptHash !== target.passwordHash) {
      showToast('Kata sandi salah! Verifikasi enkripsi PBKDF2 gagal.', 'error');
      return false;
    }

    setCurrentUserId(target.id);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('fieldops_auth_session', 'true');
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, target.id);
    } catch (e) {
      console.warn(e);
    }
    showToast(`Selamat datang kembali, ${target.name} (${target.roleLabel})!`, 'success');
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('fieldops_auth_session');
    } catch (e) {
      console.warn(e);
    }
    showToast('Anda telah keluar dari aplikasi FieldOps IT.', 'info');
  };

  const currentUser = useMemo(() => {
    return users.find(u => u.id === currentUserId) || users[0] || INITIAL_USERS[0];
  }, [currentUserId, users]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const masterAccount = useMemo(() => {
    return users.find(u => u.isMasterAdmin) || users.find(u => u.id === 'usr-master-01') || INITIAL_USERS[0];
  }, [users]);

  const setupMasterAccount = async (name: string, email: string, passwordAttempt: string) => {
    if (users.some(u => u.isMasterAdmin) && (!isAuthenticated || !currentUser?.isMasterAdmin || currentUser.status !== 'ACTIVE')) {
      showToast('Akses ditolak! Hanya Master Admin aktif yang berhak mengubah kredensial Master.', 'error');
      return;
    }

    if (!passwordAttempt || passwordAttempt.trim().length < 6) {
      showToast('Kata sandi Master minimal 6 karakter!', 'error');
      return;
    }

    const salt = generateSalt();
    const passwordHash = await hashPasswordWithSalt(passwordAttempt, salt);

    setUsers(prev => {
      const exists = prev.find(u => u.isMasterAdmin || u.id === 'usr-master-01');
      if (exists) {
        return prev.map(u => (u.isMasterAdmin || u.id === 'usr-master-01') ? {
          ...u,
          name,
          email,
          salt,
          passwordHash,
          status: 'ACTIVE'
        } : u);
      } else {
        const newMaster: UserAccount = {
          id: 'usr-master-01',
          name,
          email,
          role: 'supervisor',
          roleLabel: 'Master Admin / Head of IT',
          department: 'Direksi & Governance IT',
          avatarUrl: '',
          phone: '0812-9900-8877',
          salt,
          passwordHash,
          status: 'ACTIVE',
          isMasterAdmin: true
        };
        return [newMaster, ...prev];
      }
    });

    showToast('Kredensial Master Account Utama berhasil diperbarui!', 'success');
  };

  const switchUser = (userId: string) => {
    // Prevent privilege escalation bypass (Finding 2)
    showToast('Untuk berganti akun, silakan gunakan menu Keluar (Logout) lalu masuk dengan kata sandi akun tujuan.', 'info');
  };

  const approveUser = (userId: string, assignedRole: UserRole) => {
    if (!isAuthenticated || !currentUser?.isMasterAdmin || currentUser.status !== 'ACTIVE') {
      showToast('Akses ditolak! Hanya Master Admin aktif yang berhak menyetujui akun.', 'error');
      return;
    }

    const roleLabelMap: Record<UserRole, string> = {
      technician: 'Teknisi IT Lapangan',
      admin: 'Admin Gudang & PO',
      supervisor: 'Supervisor IT Lapangan'
    };

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'ACTIVE',
          role: assignedRole,
          roleLabel: roleLabelMap[assignedRole]
        };
      }
      return u;
    }));
    showToast(`Pendaftaran akun disetujui! Peran telah ditetapkan sebagai "${roleLabelMap[assignedRole]}".`, 'success');
  };

  const rejectUser = (userId: string) => {
    if (!isAuthenticated || !currentUser?.isMasterAdmin || currentUser.status !== 'ACTIVE') {
      showToast('Akses ditolak! Hanya Master Admin aktif yang berhak menolak akun.', 'error');
      return;
    }

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'REJECTED'
        };
      }
      return u;
    }));
    showToast('Permintaan pendaftaran akun telah ditolak.', 'info');
  };

  const addUser = async (userData: {
    name: string;
    email: string;
    role: 'technician' | 'admin' | 'supervisor';
    department: string;
    phone?: string;
    password?: string;
  }) => {
    const roleLabelMap = {
      technician: 'Teknisi IT Lapangan',
      admin: 'Admin Gudang & PO',
      supervisor: 'Supervisor IT Lapangan'
    };

    const salt = generateSalt();
    const rawPass = userData.password && userData.password.trim() ? userData.password : 'FieldOps2026!';
    const passwordHash = await hashPasswordWithSalt(rawPass, salt);

    // Only active authenticated Master Admin can bypass approval (Finding 3)
    const isMaster = isAuthenticated && currentUser?.isMasterAdmin && currentUser.status === 'ACTIVE';

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: isMaster ? userData.role : 'technician',
      roleLabel: roleLabelMap[isMaster ? userData.role : 'technician'],
      department: userData.department || 'Divisi IT Support',
      avatarUrl: '',
      phone: userData.phone || '0812-9000-8888',
      salt,
      passwordHash,
      status: isMaster ? 'ACTIVE' : 'PENDING_APPROVAL'
    };

    setUsers(prev => [...prev, newUser]);
    if (isMaster) {
      showToast(`Akun baru "${newUser.name}" (${newUser.roleLabel}) langsung diaktifkan oleh Master Admin!`, 'success');
    } else {
      showToast(`Pendaftaran akun "${newUser.name}" berhasil diajukan. Menunggu persetujuan Master Admin.`, 'info');
    }
    return newUser;
  };

  const addItem = (itemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      showToast(`Akses ditolak: Peran "${currentUser.roleLabel}" tidak memiliki wewenang menambah barang.`, 'error');
      return;
    }

    if (!Number.isInteger(itemData.quantity) || itemData.quantity < 0) {
      showToast('Stok awal harus berupa bilangan bulat >= 0!', 'error');
      return;
    }

    const newItem: InventoryItem = {
      ...itemData,
      id: `item-${Date.now()}`,
      lastUpdated: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);

    // Record initial transaction if quantity > 0
    if (newItem.quantity > 0) {
      const initialTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'IN',
        itemId: newItem.id,
        itemSku: newItem.sku,
        itemName: newItem.name,
        quantity: newItem.quantity,
        unit: newItem.unit,
        date: new Date().toISOString(),
        referenceType: 'INITIAL_COUNT',
        referenceNumber: 'INIT-SETUP',
        performedBy: currentUser.name,
        technicianId: currentUser.id,
        recipientOrDestination: newItem.location,
        notes: 'Pencatatan stok awal barang baru masuk sistem',
        apiSource: 'Web Admin'
      };
      setTransactions(prev => [initialTx, ...prev]);
    }

    // Enqueue for offline sync to Firestore
    offlineSyncService.enqueue('ADD_ITEM', currentWorkspaceId, {
      item: newItem,
      initialTransaction: newItem.quantity > 0 ? {
        id: `tx-${Date.now()}`,
        type: 'IN',
        itemId: newItem.id,
        itemSku: newItem.sku,
        itemName: newItem.name,
        quantity: newItem.quantity,
        unit: newItem.unit,
        date: new Date().toISOString(),
        referenceType: 'INITIAL_COUNT',
        referenceNumber: 'INIT-SETUP',
        performedBy: currentUser.name,
        technicianId: currentUser.id,
        recipientOrDestination: newItem.location,
        notes: 'Pencatatan stok awal barang baru masuk sistem',
        apiSource: 'Web Admin'
      } : undefined
    });

    showToast(`Barang baru berhasil ditambahkan: ${newItem.name}`, 'success');
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      showToast(`Akses ditolak: Peran "${currentUser.roleLabel}" tidak memiliki wewenang mengedit barang.`, 'error');
      return;
    }

    if (updates.quantity !== undefined && (!Number.isInteger(updates.quantity) || updates.quantity < 0)) {
      showToast('Jumlah stok harus berupa bilangan bulat >= 0!', 'error');
      return;
    }

    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          return {
            ...it,
            ...updates,
            lastUpdated: new Date().toISOString(),
          };
        }
        return it;
      })
    );

    // Enqueue for offline sync to Firestore
    offlineSyncService.enqueue('UPDATE_ITEM', currentWorkspaceId, {
      id,
      updates
    });

    showToast('Data barang berhasil diperbarui', 'success');
  };

  const deleteItem = (id: string) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      showToast(`Akses ditolak: Peran "${currentUser.roleLabel}" tidak memiliki wewenang menghapus barang.`, 'error');
      return;
    }

    const target = items.find(it => it.id === id);
    if (target) {
      const softDeletedItem: InventoryItem = {
        ...target,
        deletedAt: new Date().toISOString(),
        deletedBy: currentUser.name
      };

      setItems(prev => prev.filter(it => it.id !== id));
      setTrashItems(prev => [softDeletedItem, ...prev]);

      // Enqueue for offline sync to Firestore
      offlineSyncService.enqueue('UPDATE_ITEM', currentWorkspaceId, {
        id,
        updates: {
          deletedAt: softDeletedItem.deletedAt,
          deletedBy: softDeletedItem.deletedBy
        }
      });

      showToast(`Barang "${target.name}" dipindahkan ke Sampah (Soft Delete)`, 'info');
    }
  };

  const restoreDeletedItem = (id: string) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      showToast(`Akses ditolak: Hanya Admin/Supervisor yang dapat memulihkan barang.`, 'error');
      return;
    }

    const target = trashItems.find(it => it.id === id);
    if (target) {
      const restored: InventoryItem = {
        ...target,
        deletedAt: undefined,
        deletedBy: undefined,
        lastUpdated: new Date().toISOString()
      };

      setTrashItems(prev => prev.filter(it => it.id !== id));
      setItems(prev => [restored, ...prev]);

      offlineSyncService.enqueue('UPDATE_ITEM', currentWorkspaceId, {
        id,
        updates: {
          deletedAt: null,
          deletedBy: null
        }
      });
      showToast(`Barang "${target.name}" berhasil dipulihkan dari Sampah`, 'success');
    }
  };

  const permanentlyDeleteItem = (id: string) => {
    if (currentUser.role !== 'supervisor') {
      showToast(`Akses ditolak: Hanya Supervisor yang dapat menghapus barang secara permanen.`, 'error');
      return;
    }

    const target = trashItems.find(it => it.id === id);
    if (target) {
      setTrashItems(prev => prev.filter(it => it.id !== id));
      offlineSyncService.enqueue('DELETE_ITEM', currentWorkspaceId, { id });
      showToast(`Barang "${target.name}" dihapus permanen dari sistem`, 'info');
    }
  };

  const addCategory = (catData: Omit<Category, 'id'>) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      showToast(`Akses ditolak: Peran "${currentUser.roleLabel}" tidak berhak mengelola kategori.`, 'error');
      return;
    }

    const newCat: Category = {
      ...catData,
      id: `cat-${Date.now()}`,
    };
    setCategories(prev => [...prev, newCat]);
    showToast(`Kategori "${newCat.name}" berhasil dibuat`, 'success');
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      showToast(`Akses ditolak: Peran "${currentUser.roleLabel}" tidak berhak mengedit kategori.`, 'error');
      return;
    }

    setCategories(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
    showToast('Kategori berhasil diperbarui', 'success');
  };

  const deleteCategory = (id: string) => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      showToast(`Akses ditolak: Peran "${currentUser.roleLabel}" tidak berhak menghapus kategori.`, 'error');
      return;
    }

    const inUse = items.some(it => it.categoryId === id);
    if (inUse) {
      showToast('Kategori tidak dapat dihapus karena masih digunakan oleh beberapa barang', 'error');
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== id));
    showToast('Kategori berhasil dihapus', 'info');
  };

  const recordStockIn = (data: {
    itemId: string;
    quantity: number;
    referenceNumber: string;
    performedBy?: string;
    recipientOrDestination?: string;
    notes: string;
  }): boolean => {
    if (!['admin', 'supervisor'].includes(currentUser.role)) {
      showToast(`Akses ditolak: Peran "${currentUser.roleLabel}" tidak memiliki hak mencatat barang masuk (PO).`, 'error');
      return false;
    }

    if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
      showToast('Jumlah barang masuk harus berupa bilangan bulat positif lebih besar dari 0!', 'error');
      return false;
    }

    let targetItem: InventoryItem | null = null;
    let newQty = 0;

    setItems(prev => {
      const target = prev.find(it => it.id === data.itemId);
      if (!target) return prev;
      targetItem = target;
      newQty = target.quantity + data.quantity;
      return prev.map(it => (it.id === data.itemId ? { ...it, quantity: newQty, lastUpdated: new Date().toISOString() } : it));
    });

    if (!targetItem) {
      showToast('Barang tidak ditemukan!', 'error');
      return false;
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'IN',
      itemId: (targetItem as InventoryItem).id,
      itemSku: (targetItem as InventoryItem).sku,
      itemName: (targetItem as InventoryItem).name,
      quantity: data.quantity,
      unit: (targetItem as InventoryItem).unit,
      date: new Date().toISOString(),
      referenceType: 'PURCHASE_ORDER',
      referenceNumber: data.referenceNumber || `IN-${Date.now().toString().slice(-6)}`,
      performedBy: currentUser.name,
      technicianId: currentUser.id,
      recipientOrDestination: data.recipientOrDestination || (targetItem as InventoryItem).location,
      notes: data.notes,
      apiSource: 'Form Input Barang Masuk'
    };

    setTransactions(prev => [newTx, ...prev]);

    // Enqueue for offline sync to Firestore
    offlineSyncService.enqueue('STOCK_IN', currentWorkspaceId, {
      item: { ...(targetItem as InventoryItem), quantity: newQty, lastUpdated: new Date().toISOString() },
      transaction: newTx
    });

    showToast(`Stok ${(targetItem as InventoryItem).name} bertambah +${data.quantity} ${(targetItem as InventoryItem).unit}. Total sekarang: ${newQty}`, 'success');
    return true;
  };

  const recordStockOut = (data: {
    itemId: string;
    quantity: number;
    referenceType: ReferenceType;
    referenceNumber: string;
    performedBy?: string;
    recipientOrDestination?: string;
    notes: string;
    apiSource?: string;
  }): boolean => {
    if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
      showToast('Jumlah barang keluar harus berupa bilangan bulat positif lebih besar dari 0!', 'error');
      return false;
    }

    let success = false;
    let targetItem: InventoryItem | null = null;
    let remainingStock = 0;
    let errorReason = '';

    // Atomic functional update to eliminate race conditions
    setItems(prev => {
      const target = prev.find(it => it.id === data.itemId);
      if (!target) {
        errorReason = 'Barang tidak ditemukan di inventori!';
        return prev;
      }
      if (target.quantity < data.quantity) {
        errorReason = `Stok tidak mencukupi! Tersedia: ${target.quantity} ${target.unit}, dibutuhkan: ${data.quantity} ${target.unit}.`;
        return prev;
      }
      success = true;
      targetItem = target;
      remainingStock = target.quantity - data.quantity;
      return prev.map(it => (it.id === data.itemId ? { ...it, quantity: remainingStock, lastUpdated: new Date().toISOString() } : it));
    });

    if (!success || !targetItem) {
      showToast(errorReason || 'Pengurangan stok gagal!', 'error');
      return false;
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'OUT',
      itemId: (targetItem as InventoryItem).id,
      itemSku: (targetItem as InventoryItem).sku,
      itemName: (targetItem as InventoryItem).name,
      quantity: data.quantity,
      unit: (targetItem as InventoryItem).unit,
      date: new Date().toISOString(),
      referenceType: data.referenceType,
      referenceNumber: data.referenceNumber || `OUT-${Date.now().toString().slice(-6)}`,
      performedBy: currentUser.name,
      technicianId: currentUser.id,
      recipientOrDestination: data.recipientOrDestination || 'Pekerjaan Lapangan',
      notes: data.notes,
      apiSource: data.apiSource || 'Form Output Barang Lapangan'
    };

    setTransactions(prev => [newTx, ...prev]);

    // Enqueue for offline sync to Firestore
    offlineSyncService.enqueue('STOCK_OUT', currentWorkspaceId, {
      item: { ...(targetItem as InventoryItem), quantity: remainingStock, lastUpdated: new Date().toISOString() },
      transaction: newTx
    });

    // WhatsApp Auto-Alert if item stock is low or out
    if (targetItem && remainingStock <= (targetItem as InventoryItem).minStockAlert) {
      whatsappService.sendStockAlert([
        {
          sku: (targetItem as InventoryItem).sku,
          name: (targetItem as InventoryItem).name,
          quantity: remainingStock,
          minStockAlert: (targetItem as InventoryItem).minStockAlert,
          unit: (targetItem as InventoryItem).unit,
        }
      ], 'Otomatis Transaksi Stock Out').catch(err => console.warn('WA Auto Alert Error:', err));
    }

    showToast(`Barang berhasil dikeluarkan: -${data.quantity} ${(targetItem as InventoryItem).unit} (${(targetItem as InventoryItem).name}). Sisa stok: ${remainingStock}`, 'success');
    return true;
  };

  const recordBatchStockOut = (
    itemsToDeduct: Array<{ itemId: string; quantity: number }>,
    meta: {
      referenceType: ReferenceType;
      referenceNumber: string;
      recipientOrDestination: string;
      notes: string;
      apiSource?: string;
    }
  ): boolean => {
    // Aggregate duplicates and validate
    const aggregated = new Map<string, number>();
    for (const entry of itemsToDeduct) {
      if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) {
        showToast('Jumlah tiap item harus berupa bilangan bulat positif!', 'error');
        return false;
      }
      aggregated.set(entry.itemId, (aggregated.get(entry.itemId) || 0) + entry.quantity);
    }

    let batchSuccess = false;
    let newTxList: Transaction[] = [];
    let errorReason = '';

    setItems(prev => {
      // Pre-check all items atomically
      for (const [id, totalNeeded] of aggregated.entries()) {
        const item = prev.find(it => it.id === id);
        if (!item) {
          errorReason = `Barang ID ${id} tidak ditemukan!`;
          return prev;
        }
        if (item.quantity < totalNeeded) {
          errorReason = `Stok "${item.name}" tidak mencukupi! Tersedia: ${item.quantity} ${item.unit}, dibutuhkan: ${totalNeeded} ${item.unit}.`;
          return prev;
        }
      }

      batchSuccess = true;
      const nowIso = new Date().toISOString();
      return prev.map(item => {
        if (aggregated.has(item.id)) {
          const qty = aggregated.get(item.id)!;
          const remaining = item.quantity - qty;
          newTxList.push({
            id: `tx-${Date.now()}-${item.id}`,
            type: 'OUT',
            itemId: item.id,
            itemSku: item.sku,
            itemName: item.name,
            quantity: qty,
            unit: item.unit,
            date: nowIso,
            referenceType: meta.referenceType,
            referenceNumber: meta.referenceNumber,
            performedBy: currentUser.name,
            technicianId: currentUser.id,
            recipientOrDestination: meta.recipientOrDestination,
            notes: meta.notes,
            apiSource: meta.apiSource || 'Ceklist Lapangan Batch'
          });
          return { ...item, quantity: remaining, lastUpdated: nowIso };
        }
        return item;
      });
    });

    if (!batchSuccess) {
      showToast(errorReason || 'Pengurangan batch stok gagal!', 'error');
      return false;
    }

    setTransactions(prev => [...newTxList, ...prev]);

    // Enqueue for offline sync to Firestore
    offlineSyncService.enqueue('BATCH_STOCK_OUT', currentWorkspaceId, {
      updatedItems: Array.from(aggregated.entries()).map(([id, qty]) => {
        const it = items.find(i => i.id === id);
        return {
          id,
          quantity: it ? it.quantity - qty : 0,
          lastUpdated: new Date().toISOString()
        };
      }),
      transaction: newTxList[0]
    });

    // WhatsApp Auto-Alert for Batch Stock Out items that reached low stock threshold
    const lowStockBatch = items
      .map(it => {
        if (aggregated.has(it.id)) {
          const remaining = it.quantity - aggregated.get(it.id)!;
          if (remaining <= it.minStockAlert) {
            return {
              sku: it.sku,
              name: it.name,
              quantity: remaining,
              minStockAlert: it.minStockAlert,
              unit: it.unit
            };
          }
        }
        return null;
      })
      .filter((it): it is NonNullable<typeof it> => it !== null);

    if (lowStockBatch.length > 0) {
      whatsappService.sendStockAlert(lowStockBatch, 'Otomatis Batch Stock Out').catch(err => console.warn('WA Batch Auto Alert Error:', err));
    }

    showToast(`Batch stok berhasil dikeluarkan untuk ${aggregated.size} jenis suku cadang!`, 'success');
    return true;
  };

  // External ticket auto-deduct action (can be triggered by webhook simulator or direct integration)
  const consumeStockFromTicket = (payload: {
    ticketId: string;
    ticketTitle: string;
    systemName: string;
    technicianName: string;
    items: Array<{ sku: string; quantity: number }>;
  }): ConsumeStockResult => {
    const { ticketId, ticketTitle, systemName, technicianName, items: requestedItems } = payload;

    // Validate if items exist and check stock
    const errors: string[] = [];
    const itemStockPairs: Array<{ item: InventoryItem; reqQty: number }> = [];

    for (const req of requestedItems) {
      if (!Number.isInteger(req.quantity) || req.quantity <= 0) {
        errors.push(`Kuantitas SKU ${req.sku} tidak valid (${req.quantity}). Harus bilangan bulat > 0.`);
        continue;
      }

      const match = items.find(it => it.sku.toLowerCase() === req.sku.toLowerCase());
      if (!match) {
        errors.push(`SKU ${req.sku} tidak ditemukan di master inventori.`);
      } else if (match.quantity < req.quantity) {
        errors.push(`Stok ${match.name} (${match.sku}) tidak cukup. Tersedia: ${match.quantity} ${match.unit}, Diminta: ${req.quantity} ${match.unit}.`);
      } else {
        itemStockPairs.push({ item: match, reqQty: req.quantity });
      }
    }

    if (errors.length > 0) {
      const failMessage = `Pengurangan stok otomatis gagal: ${errors.join(' ')}`;
      const failLog: IntegrationLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ticketId,
        ticketTitle,
        systemName,
        technicianName,
        itemsRequested: requestedItems.map(r => {
          const m = items.find(it => it.sku.toLowerCase() === r.sku.toLowerCase());
          return {
            sku: r.sku,
            name: m ? m.name : 'Unknown SKU',
            quantity: r.quantity,
            unit: m ? m.unit : 'pcs'
          };
        }),
        status: 'FAILED_STOCK',
        httpStatus: 400,
        message: failMessage,
        stockDeducted: false,
      };

      setIntegrationLogs(prev => [failLog, ...prev]);
      showToast(failMessage, 'error');
      return { success: false, message: failMessage };
    }

    // Deduct stock for all items
    const affectedItemsSummary: Array<{ sku: string; name: string; quantity: number; remainingStock: number }> = [];
    const newTransactions: Transaction[] = [];

    setItems(prevItems => {
      const updated = [...prevItems];
      for (const pair of itemStockPairs) {
        const idx = updated.findIndex(it => it.id === pair.item.id);
        if (idx !== -1) {
          const remaining = updated[idx].quantity - pair.reqQty;
          updated[idx] = {
            ...updated[idx],
            quantity: remaining,
            lastUpdated: new Date().toISOString(),
          };
          affectedItemsSummary.push({
            sku: updated[idx].sku,
            name: updated[idx].name,
            quantity: pair.reqQty,
            remainingStock: remaining,
          });

          newTransactions.push({
            id: `tx-${Date.now()}-${pair.item.id}`,
            type: 'OUT',
            itemId: updated[idx].id,
            itemSku: updated[idx].sku,
            itemName: updated[idx].name,
            quantity: pair.reqQty,
            unit: updated[idx].unit,
            date: new Date().toISOString(),
            referenceType: 'TICKET_EXTERNAL',
            referenceNumber: ticketId,
            performedBy: technicianName || currentUser.name,
            technicianId: currentUser.id,
            recipientOrDestination: ticketTitle,
            notes: `Auto-deduct dari sistem tiket eksternal (${systemName}). Tiket: #${ticketId} - ${ticketTitle}`,
            apiSource: `Webhook: ${systemName}`
          });
        }
      }
      return updated;
    });

    setTransactions(prev => [...newTransactions, ...prev]);

    // Record success log
    const successMsg = `Berhasil potong stok untuk tiket #${ticketId}: ${affectedItemsSummary.map(a => `${a.quantity}x ${a.name}`).join(', ')}`;
    const successLog: IntegrationLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ticketId,
      ticketTitle,
      systemName,
      technicianName,
      itemsRequested: requestedItems.map(r => {
        const m = items.find(it => it.sku.toLowerCase() === r.sku.toLowerCase());
        return {
          sku: r.sku,
          name: m ? m.name : r.sku,
          quantity: r.quantity,
          unit: m ? m.unit : 'pcs'
        };
      }),
      status: 'SUCCESS',
      httpStatus: 200,
      message: successMsg,
      stockDeducted: true,
    };

    setIntegrationLogs(prev => [successLog, ...prev]);

    // Enqueue for offline sync to Firestore
    offlineSyncService.enqueue('TICKET_CONSUME', currentWorkspaceId, {
      updatedItems: affectedItemsSummary.map(a => {
        const itemMatch = items.find(i => i.sku.toLowerCase() === a.sku.toLowerCase());
        return {
          id: itemMatch?.id || a.sku,
          quantity: a.remainingStock,
          lastUpdated: new Date().toISOString()
        };
      }),
      transaction: newTransactions[0],
      log: successLog
    });

    // WhatsApp Auto-Alert for Ticket Consume
    const lowStockTicket = affectedItemsSummary
      .filter(a => {
        const matched = items.find(i => i.sku.toLowerCase() === a.sku.toLowerCase());
        return matched ? a.remainingStock <= matched.minStockAlert : a.remainingStock === 0;
      })
      .map(a => {
        const matched = items.find(i => i.sku.toLowerCase() === a.sku.toLowerCase());
        return {
          sku: a.sku,
          name: a.name,
          quantity: a.remainingStock,
          minStockAlert: matched?.minStockAlert ?? 5,
          unit: matched?.unit ?? 'pcs'
        };
      });

    if (lowStockTicket.length > 0) {
      whatsappService.sendStockAlert(lowStockTicket, `Otomatis Tiket Eksternal #${ticketId}`).catch(err => console.warn('WA Ticket Auto Alert Error:', err));
    }

    showToast(successMsg, 'success');

    return {
      success: true,
      message: successMsg,
      affectedItems: affectedItemsSummary
    };
  };

  const generateApiKey = (name: string, system: string, allowedActions: string[]) => {
    if (currentUser.role !== 'supervisor') {
      showToast('Akses ditolak! Pembuatan API Key hanya diizinkan untuk Supervisor IT.', 'error');
      throw new Error('Unauthorized');
    }

    const rawKey = 'fops_demo_key_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const newApiKey: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name,
      key: rawKey,
      system,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      isActive: true,
      allowedActions,
    };

    setApiKeys(prev => [newApiKey, ...prev]);
    showToast(`API Key "${name}" berhasil dibuat`, 'success');
    return newApiKey;
  };

  const deleteApiKey = (id: string) => {
    if (currentUser.role !== 'supervisor') {
      showToast('Akses ditolak! Pencabutan API Key hanya diizinkan untuk Supervisor IT.', 'error');
      return;
    }
    setApiKeys(prev => prev.filter(k => k.id !== id));
    showToast('API Key telah dicabut & dihapus', 'info');
  };

  const toggleApiKey = (id: string) => {
    if (currentUser.role !== 'supervisor') {
      showToast('Akses ditolak! Pengubahan status API Key hanya diizinkan untuk Supervisor IT.', 'error');
      return;
    }
    setApiKeys(prev =>
      prev.map(k => (k.id === id ? { ...k, isActive: !k.isActive } : k))
    );
    showToast('Status API Key diperbarui', 'info');
  };

  const verifyServerAction = async (action: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/security/verify-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Secret-Key': 'fieldops-internal-proxy-v1'
        },
        body: JSON.stringify({
          action,
          role: currentUser.role,
          userId: currentUser.id
        })
      });
      return res.ok;
    } catch {
      // Fallback offline jika teknisi sedang di area tanpa jaringan
      return currentUser.role === 'supervisor' || currentUser.role === 'admin';
    }
  };

  const resetToDemoData = async () => {
    if (currentUser.role !== 'supervisor') {
      showToast('Akses ditolak! Reset data demo hanya dapat dilakukan oleh Supervisor IT.', 'error');
      return;
    }

    const verified = await verifyServerAction('RESET_DATABASE');
    if (!verified) {
      showToast('Otoritas server menolak reset data (SEC-02).', 'error');
      return;
    }

    setItems(INITIAL_ITEMS);
    setCategories(INITIAL_CATEGORIES);
    setTransactions(INITIAL_TRANSACTIONS);
    setApiKeys(INITIAL_API_KEYS);
    setIntegrationLogs(INITIAL_INTEGRATION_LOGS);
    setCurrentUserId(INITIAL_USERS[0].id);
    showToast('Data berhasil di-reset ke data bawaan demo', 'info');
  };

  const clearToEmptyDatabase = async () => {
    if (currentUser.role !== 'supervisor') {
      showToast('Akses ditolak! Pengosongan database hanya dapat dilakukan oleh Supervisor IT.', 'error');
      return;
    }

    const verified = await verifyServerAction('CLEAR_DATABASE');
    if (!verified) {
      showToast('Otoritas server menolak pengosongan database (SEC-02).', 'error');
      return;
    }

    setItems([]);
    setTransactions([]);
    setIntegrationLogs([]);
    showToast('Database berhasil dikosongkan. Siap digunakan untuk inventori riil perusahaan!', 'success');
  };

  const importDatabaseJson = (data: any): boolean => {
    if (currentUser.role !== 'supervisor') {
      showToast('Akses ditolak! Impor database JSON hanya diizinkan untuk Supervisor IT.', 'error');
      return false;
    }

    try {
      if (Array.isArray(data.items)) {
        setItems(data.items);
      }
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
      if (Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
      if (Array.isArray(data.apiKeys)) {
        setApiKeys(data.apiKeys);
      }
      if (Array.isArray(data.integrationLogs)) {
        setIntegrationLogs(data.integrationLogs);
      }
      showToast('Data inventori berhasil diimpor ke sistem!', 'success');
      return true;
    } catch (e) {
      console.error(e);
      showToast('Format file JSON data tidak valid!', 'error');
      return false;
    }
  };

  const bulkRestoreData = async (
    backupData: any,
    options?: {
      targetWorkspaceId?: string;
      restoreToFirestore?: boolean;
      onProgress?: (step: string, percentage: number) => void;
    }
  ): Promise<{ success: boolean; totalRestored: number; counts: Record<string, number> }> => {
    if (!['admin', 'supervisor'].includes(currentUser.role) && !currentUser.isMasterAdmin) {
      showToast('Akses ditolak! Pemulihan database hanya dapat dilakukan oleh Admin atau Supervisor.', 'error');
      throw new Error('Unauthorized');
    }

    const verified = await verifyServerAction('RESTORE_DATABASE');
    if (!verified) {
      showToast('Otoritas server menolak pemulihan database (SEC-02).', 'error');
      throw new Error('Server verification failed');
    }

    const ws = options?.targetWorkspaceId || currentWorkspaceId;
    const normalized = normalizeBackupCollections(backupData);

    let firestoreResult: any = { success: true, counts: {} };
    if (options?.restoreToFirestore !== false) {
      firestoreResult = await bulkRestoreToFirestore(ws, backupData, options?.onProgress);
    }

    // Update local React state atomically
    if (normalized.items.length > 0) {
      setItems(normalized.items);
      try {
        localStorage.setItem(getWorkspaceKey(ws, 'items'), JSON.stringify(normalized.items));
      } catch (e) {
        console.warn('LocalStorage save items error:', e);
      }
    }

    if (normalized.trashItems.length > 0) {
      setTrashItems(normalized.trashItems);
      try {
        localStorage.setItem(getWorkspaceKey(ws, 'trash_items'), JSON.stringify(normalized.trashItems));
      } catch (e) {
        console.warn('LocalStorage save trash error:', e);
      }
    }

    if (normalized.categories.length > 0) {
      setCategories(normalized.categories);
      try {
        localStorage.setItem(getWorkspaceKey(ws, 'categories'), JSON.stringify(normalized.categories));
      } catch (e) {
        console.warn('LocalStorage save categories error:', e);
      }
    }

    if (normalized.transactions.length > 0) {
      setTransactions(normalized.transactions);
      try {
        localStorage.setItem(getWorkspaceKey(ws, 'transactions'), JSON.stringify(normalized.transactions));
      } catch (e) {
        console.warn('LocalStorage save transactions error:', e);
      }
    }

    const total = normalized.items.length + normalized.trashItems.length + normalized.categories.length + normalized.transactions.length;

    showToast(`Bulk restore berhasil! ${total} dokumen berhasil dipulihkan ke sistem & Firestore.`, 'success');

    // Also trigger backend sync snapshot update with the new data
    try {
      fetch('/api/backup/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientData: {
            inventory_items: normalized.items,
            trash_items: normalized.trashItems,
            categories: normalized.categories,
            stock_transactions: normalized.transactions,
            users,
            workspaces
          }
        })
      }).catch(() => {});
    } catch {
      // Background task silently ignored if offline
    }

    return {
      success: true,
      totalRestored: total,
      counts: {
        items: normalized.items.length,
        trash: normalized.trashItems.length,
        categories: normalized.categories.length,
        transactions: normalized.transactions.length,
        checklists: normalized.checklists.length,
      }
    };
  };

  return (
    <InventoryContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        workspaces,
        currentWorkspaceId,
        currentWorkspace,
        switchWorkspace,
        addWorkspace,
        items,
        categories,
        transactions,
        currentUser,
        users,
        apiKeys,
        integrationLogs,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        stockFilter,
        setStockFilter,
        toasts,
        removeToast,
        showToast,
        masterAccount,
        setupMasterAccount,
        approveUser,
        rejectUser,
        switchUser,
        addUser,
        addItem,
        updateItem,
        deleteItem,
        addCategory,
        updateCategory,
        deleteCategory,
        recordStockIn,
        recordStockOut,
        recordBatchStockOut,
        consumeStockFromTicket,
        generateApiKey,
        deleteApiKey,
        toggleApiKey,
        resetToDemoData,
        clearToEmptyDatabase,
        importDatabaseJson,
        itemMap,
        categoryMap,
        getItemById,
        getItemBySku,
        syncStatus,
        triggerManualSync,
        appVersion: APP_VERSION,
        appReleaseName: APP_RELEASE_NAME,
        VERSION,
        trashItems,
        restoreDeletedItem,
        permanentlyDeleteItem,
        bulkRestoreData,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return ctx;
};
