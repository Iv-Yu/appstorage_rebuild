/**
 * Frontend API Service Layer
 * Single communication gateway to FieldOps IT Express backend
 */

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'technician' | 'admin' | 'supervisor';
  department: string;
  phone?: string;
  status: string;
  is_master_admin?: boolean;
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category_id?: string;
  categoryId?: string;
  categoryName?: string;
  quantity: number;
  min_stock_alert?: number;
  minStockAlert?: number;
  unit: string;
  location?: string;
  specs?: string;
  unit_cost?: number;
  unitCost?: number;
  status?: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK';
  is_deleted?: boolean;
  deleted_at?: string | null;
  notes?: string;
  lastUpdated?: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  item_id?: string;
  itemId?: string;
  item_name?: string;
  itemName?: string;
  item_sku?: string;
  itemSku?: string;
  item_unit?: string;
  unit?: string;
  quantity: number;
  previous_qty?: number;
  new_qty?: number;
  reference_type?: string;
  referenceType?: string;
  reference_number?: string;
  referenceNumber?: string;
  recipient_destination?: string;
  recipientOrDestination?: string;
  performed_by?: string;
  performedBy?: string;
  notes?: string;
  apiSource?: string;
  created_at?: string;
  date?: string;
}

// Token fallback for browser contexts where third-party iframe cookies are restricted
let authToken: string | null = null;
try {
  authToken = localStorage.getItem('fieldops_token');
} catch {}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

export const api = {
  // Auth API
  async login(username: string, passwordAttempt: string): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: passwordAttempt }),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.token) {
      authToken = data.token;
      try { localStorage.setItem('fieldops_token', data.token); } catch {}
    }
    return data;
  },

  async register(userData: { username: string; name?: string; email?: string; role?: string; department?: string; password: string }): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.token) {
      authToken = data.token;
      try { localStorage.setItem('fieldops_token', data.token); } catch {}
    }
    return data;
  },

  async getMe(): Promise<{ success: boolean; user?: UserProfile }> {
    const res = await fetch('/api/auth/me', {
      headers: getHeaders(),
      credentials: 'include'
    });
    if (!res.ok) return { success: false };
    return res.json();
  },

  async logout(): Promise<void> {
    authToken = null;
    try { localStorage.removeItem('fieldops_token'); } catch {}
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include'
    });
  },

  async getUsers(): Promise<UserProfile[]> {
    const res = await fetch('/api/auth/users', { headers: getHeaders(), credentials: 'include' });
    const data = await res.json();
    return data.users || [];
  },

  // Inventory API
  async getItems(includeDeleted: boolean = false): Promise<InventoryItem[]> {
    const res = await fetch(`/api/inventory/items?includeDeleted=${includeDeleted}`, { headers: getHeaders(), credentials: 'include' });
    const data = await res.json();
    return data.items || [];
  },

  async getCategories(): Promise<Category[]> {
    const res = await fetch('/api/inventory/categories', { headers: getHeaders(), credentials: 'include' });
    const data = await res.json();
    return data.categories || [];
  },

  async createItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    const res = await fetch('/api/inventory/items', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(item),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menambahkan barang.');
    return data.item;
  },

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const res = await fetch(`/api/inventory/items/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memperbarui barang.');
    return data.item;
  },

  async deleteItem(id: string): Promise<void> {
    const res = await fetch(`/api/inventory/items/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menghapus barang.');
  },

  async restoreItem(id: string): Promise<void> {
    const res = await fetch(`/api/inventory/items/${id}/restore`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memulihkan barang.');
  },

  async permanentDeleteItem(id: string): Promise<void> {
    const res = await fetch(`/api/inventory/items/${id}/permanent`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menghapus barang permanen.');
  },

  async createCategory(cat: { code: string; name: string; description?: string }): Promise<Category> {
    const res = await fetch('/api/inventory/categories', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(cat),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal membuat kategori.');
    return data.category;
  },

  // Transactions API
  async getTransactions(limit: number = 100): Promise<Transaction[]> {
    const res = await fetch(`/api/transactions?limit=${limit}`, { headers: getHeaders(), credentials: 'include' });
    const data = await res.json();
    return data.transactions || [];
  },

  async stockIn(payload: { itemId: string; quantity: number; referenceNumber?: string; sourceOrVendor?: string; notes?: string }): Promise<any> {
    const res = await fetch('/api/transactions/in', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mencatat stok masuk.');
    return data;
  },

  async stockOut(payload: { itemId: string; quantity: number; referenceNumber?: string; recipientOrDestination?: string; notes?: string }): Promise<any> {
    const res = await fetch('/api/transactions/out', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mencatat stok keluar.');
    return data;
  },

  async batchStockOut(payload: { items: Array<{ itemId: string; quantity: number }>; referenceNumber?: string; recipientOrDestination?: string; notes?: string }): Promise<any> {
    const res = await fetch('/api/transactions/batch-out', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mencatat batch stok keluar.');
    return data;
  },

  // Weekly Reports
  async getWeeklyReport(): Promise<any> {
    const res = await fetch('/api/reports/weekly', { headers: getHeaders(), credentials: 'include' });
    return res.json();
  },

  // Checklists
  async getChecklists(): Promise<any[]> {
    const res = await fetch('/api/checklists', { headers: getHeaders(), credentials: 'include' });
    const data = await res.json();
    return data.checklists || [];
  },

  async createChecklist(payload: any): Promise<any> {
    const res = await fetch('/api/checklists', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menyimpan checklist.');
    return data;
  }
};
