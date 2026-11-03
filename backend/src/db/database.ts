/**
 * Database Connection & Migration Engine
 * FieldOps IT Inventory - MariaDB 11.x Local Driver with Autonomous Development Fallback
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  connectionLimit: number;
}

export const dbConfig: DbConfig = {
  host: process.env.DB_HOST || process.env.MARIADB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.MARIADB_PORT || '3306', 10),
  user: process.env.DB_USER || process.env.MARIADB_USER || 'fieldops_user',
  password: process.env.DB_PASSWORD || process.env.MARIADB_PASSWORD || 'fieldops_secret',
  database: process.env.DB_NAME || process.env.MARIADB_DATABASE || 'fieldops_inventory',
  connectionLimit: 10,
};

let pool: mysql.Pool | null = null;
let isMariaDbActive = false;

// Fallback in-memory database storage for preview/development when MariaDB is offline
class MemoryDbStore {
  users: Map<string, any> = new Map();
  sessions: Map<string, any> = new Map();
  categories: Map<string, any> = new Map();
  items: Map<string, any> = new Map();
  transactions: Map<string, any> = new Map();
  checklists: Map<string, any> = new Map();
  api_keys: Map<string, any> = new Map();
  whatsapp_config: Map<string, any> = new Map();
  whatsapp_logs: Map<string, any> = new Map();
  audit_logs: any[] = [];
}

const memoryStore = new MemoryDbStore();

/**
 * Inisialisasi Database & Eksekusi Migrasi Dua File Skema
 */
export async function initDatabase(): Promise<{ isMariaDb: boolean }> {
  try {
    const testPool = mysql.createPool(dbConfig);
    const conn = await testPool.getConnection();
    await conn.ping();
    conn.release();
    pool = testPool;
    isMariaDbActive = true;
    console.log(`[FieldOps Database] Terhubung ke MariaDB di ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // Jalankan migrasi file skema berversi
    await runMigrations(pool);
    return { isMariaDb: true };
  } catch (err: any) {
    console.warn(`[FieldOps Database] MariaDB (${dbConfig.host}:${dbConfig.port}) belum terhubung. Mengaktifkan adapter lokal mandiri.`);
    isMariaDbActive = false;
    await seedMemoryDb();
    return { isMariaDb: false };
  }
}

/**
 * Menjalankan migrasi SQL berurutan (File 1: Auth, File 2: Inventory, File 3: Audit)
 */
async function runMigrations(dbPool: mysql.Pool) {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = ['01_auth_schema.sql', '02_inventory_schema.sql', '03_audit_trail_schema.sql'];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        try {
          await dbPool.query(statement);
        } catch (e: any) {
          // Ignore index already exists error
          if (!e.message.includes('Duplicate key name')) {
            console.warn(`[Migration Warning] ${file}: ${e.message}`);
          }
        }
      }
      console.log(`[FieldOps Migration] Berhasil menjalankan: ${file}`);
    }
  }
}

/**
 * Seeding data awal ke memory store (jika MariaDB offline saat preview)
 */
async function seedMemoryDb() {
  const seedsDir = path.join(__dirname, 'seeds');
  const authSeedPath = path.join(seedsDir, 'auth_seed.json');
  const itemsSeedPath = path.join(seedsDir, 'items_seed.json');

  if (fs.existsSync(authSeedPath)) {
    const users: any[] = JSON.parse(fs.readFileSync(authSeedPath, 'utf-8'));
    users.forEach(u => memoryStore.users.set(u.id, { ...u, created_at: new Date().toISOString() }));
  }

  if (fs.existsSync(itemsSeedPath)) {
    const data: { categories: any[]; items: any[] } = JSON.parse(fs.readFileSync(itemsSeedPath, 'utf-8'));
    data.categories.forEach(c => memoryStore.categories.set(c.id, { ...c, created_at: new Date().toISOString() }));
    data.items.forEach(it => memoryStore.items.set(it.id, { ...it, is_deleted: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
  }

  // Set default WhatsApp Config
  memoryStore.whatsapp_config.set('1', {
    id: 1,
    gateway_type: process.env.WHATSAPP_GATEWAY_TYPE || 'fonnte',
    api_url: process.env.WHATSAPP_API_URL || 'https://api.fonnte.com/send',
    api_token: process.env.WHATSAPP_API_TOKEN || '',
    target_phones: process.env.WHATSAPP_TARGET_PHONES || '',
    auto_alert_enabled: process.env.WHATSAPP_AUTO_ALERT !== 'false',
    updated_at: new Date().toISOString()
  });
}

/**
 * Unified Query Executor
 */
export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (isMariaDbActive && pool) {
    const [rows] = await pool.query(sql, params);
    return rows as T[];
  }

  // Simulated query parser for development fallback
  return runMemoryQuery(sql, params);
}

/**
 * Transaksi Atomik Database Wrapper
 */
export async function runTransaction<T>(callback: (conn: { query: (sql: string, params?: any[]) => Promise<any> }) => Promise<T>): Promise<T> {
  if (isMariaDbActive && pool) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const result = await callback({
        query: async (sql, params) => {
          const [res] = await conn.query(sql, params);
          return res;
        }
      });
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // In-memory atomic block
  return await callback({
    query: async (sql, params) => runMemoryQuery(sql, params || [])
  });
}

/**
 * Memory query router for preview development
 */
function runMemoryQuery(sql: string, params: any[]): any {
  const cleanSql = sql.trim();
  const upper = cleanSql.toUpperCase();

  // SELECT items
  if (upper.startsWith('SELECT') && upper.includes('FROM ITEMS')) {
    let list = Array.from(memoryStore.items.values()).filter(it => !it.is_deleted);
    if (upper.includes('WHERE ID = ?')) {
      const match = memoryStore.items.get(params[0]);
      return match && !match.is_deleted ? [match] : [];
    }
    if (upper.includes('WHERE SKU = ?')) {
      const match = list.find(it => it.sku.toLowerCase() === String(params[0]).toLowerCase());
      return match ? [match] : [];
    }
    return list;
  }

  // SELECT categories
  if (upper.startsWith('SELECT') && upper.includes('FROM CATEGORIES')) {
    if (upper.includes('WHERE ID = ?')) {
      const match = memoryStore.categories.get(params[0]);
      return match ? [match] : [];
    }
    return Array.from(memoryStore.categories.values());
  }

  // SELECT transactions
  if (upper.startsWith('SELECT') && upper.includes('FROM TRANSACTIONS')) {
    if (upper.includes('WHERE ID = ?') || upper.includes('WHERE T.ID = ?')) {
      const match = memoryStore.transactions.get(params[0]);
      return match ? [match] : [];
    }
    if (upper.includes('WHERE ITEM_ID = ?') || upper.includes('WHERE T.ITEM_ID = ?')) {
      const filtered = Array.from(memoryStore.transactions.values()).filter(t => t.item_id === params[0]);
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return filtered;
    }
    let list = Array.from(memoryStore.transactions.values());
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }

  // SELECT api_keys
  if (upper.startsWith('SELECT') && upper.includes('FROM API_KEYS')) {
    if (upper.includes('WHERE API_KEY_HASH = ?')) {
      const match = Array.from(memoryStore.api_keys.values()).find(k => k.api_key_hash === params[0] && k.is_active);
      return match ? [match] : [];
    }
    return Array.from(memoryStore.api_keys.values());
  }

  // SELECT users
  if (upper.startsWith('SELECT') && upper.includes('FROM USERS')) {
    if (upper.includes('WHERE USERNAME = ?')) {
      const match = Array.from(memoryStore.users.values()).find(u => u.username === params[0]);
      return match ? [match] : [];
    }
    if (upper.includes('WHERE ID = ?')) {
      const match = memoryStore.users.get(params[0]);
      return match ? [match] : [];
    }
    return Array.from(memoryStore.users.values());
  }

  // SELECT sessions
  if (upper.startsWith('SELECT') && upper.includes('FROM SESSIONS')) {
    if (upper.includes('WHERE SESSION_ID = ?')) {
      const s = memoryStore.sessions.get(params[0]);
      if (!s) return [];
      if (new Date(s.expires_at).getTime() < Date.now()) {
        memoryStore.sessions.delete(params[0]);
        return [];
      }
      return [s];
    }
  }

  // SELECT checklists
  if (upper.startsWith('SELECT') && upper.includes('FROM CHECKLISTS')) {
    if (upper.includes('WHERE ID = ?')) {
      const match = memoryStore.checklists.get(params[0]);
      return match ? [match] : [];
    }
    return Array.from(memoryStore.checklists.values()).reverse();
  }

  // SELECT whatsapp_config
  if (upper.startsWith('SELECT') && upper.includes('FROM WHATSAPP_CONFIG')) {
    const cfg = memoryStore.whatsapp_config.get('1') || {
      id: 1,
      gateway_type: 'fonnte',
      api_url: 'https://api.fonnte.com/send',
      api_token: '',
      target_phones: '',
      auto_alert_enabled: true
    };
    return [cfg];
  }

  // SELECT whatsapp_logs
  if (upper.startsWith('SELECT') && upper.includes('FROM WHATSAPP_LOGS')) {
    return Array.from(memoryStore.whatsapp_logs.values()).reverse();
  }

  // INSERT / UPDATE handlers
  if (upper.startsWith('INSERT INTO SESSIONS')) {
    memoryStore.sessions.set(params[0], {
      session_id: params[0],
      user_id: params[1],
      ip_address: params[2],
      user_agent: params[3],
      expires_at: params[4],
      created_at: new Date().toISOString()
    });
    return { affectedRows: 1 };
  }

  if (upper.startsWith('DELETE FROM SESSIONS WHERE SESSION_ID = ?')) {
    memoryStore.sessions.delete(params[0]);
    return { affectedRows: 1 };
  }

  if (upper.startsWith('INSERT INTO USERS')) {
    const user = {
      id: params[0],
      username: params[1],
      name: params[2],
      email: params[3],
      role: params[4],
      department: params[5],
      phone: params[6],
      password_hash: params[7],
      salt: params[8],
      status: params[9] || 'ACTIVE',
      created_at: new Date().toISOString()
    };
    memoryStore.users.set(user.id, user);
    return { affectedRows: 1 };
  }

  if (upper.startsWith('INSERT INTO ITEMS')) {
    const item = {
      id: params[0],
      sku: params[1],
      barcode: params[2],
      name: params[3],
      category_id: params[4],
      quantity: params[5],
      min_stock_alert: params[6],
      unit: params[7],
      location: params[8],
      specs: params[9],
      unit_cost: params[10],
      status: params[11],
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryStore.items.set(item.id, item);
    return { affectedRows: 1 };
  }

  if (upper.startsWith('INSERT INTO CATEGORIES')) {
    memoryStore.categories.set(params[0], {
      id: params[0],
      code: params[1],
      name: params[2],
      description: params[3] || '',
      created_at: new Date().toISOString()
    });
    return { affectedRows: 1 };
  }

  if (upper.startsWith('UPDATE ITEMS SET')) {
    if (upper.includes('IS_DELETED = TRUE')) {
      const item = memoryStore.items.get(params[0]);
      if (item) {
        item.is_deleted = true;
        item.deleted_at = new Date().toISOString();
      }
      return { affectedRows: 1 };
    }
    if (upper.includes('IS_DELETED = FALSE')) {
      const item = memoryStore.items.get(params[0]);
      if (item) {
        item.is_deleted = false;
        item.deleted_at = null;
      }
      return { affectedRows: 1 };
    }
    if (upper.includes('QUANTITY = ?')) {
      const item = memoryStore.items.get(params[params.length - 1]);
      if (item) {
        item.quantity = params[0];
        item.status = params[1];
        item.updated_at = new Date().toISOString();
      }
      return { affectedRows: 1 };
    }
    if (upper.includes('NAME = ?')) {
      const itemId = params[params.length - 1];
      const item = memoryStore.items.get(itemId);
      if (item) {
        item.name = params[0];
        item.category_id = params[1];
        item.quantity = params[2];
        item.min_stock_alert = params[3];
        item.unit = params[4];
        item.location = params[5];
        item.specs = params[6];
        item.unit_cost = params[7];
        item.status = params[8];
        item.updated_at = new Date().toISOString();
      }
      return { affectedRows: 1 };
    }
  }

  if (upper.startsWith('INSERT INTO TRANSACTIONS')) {
    const tx = {
      id: params[0],
      type: params[1],
      item_id: params[2],
      quantity: params[3],
      previous_qty: params[4],
      new_qty: params[5],
      reference_type: params[6],
      reference_number: params[7],
      recipient_destination: params[8],
      user_id: params[9],
      performed_by: params[10],
      notes: params[11],
      created_at: new Date().toISOString()
    };
    memoryStore.transactions.set(tx.id, tx);
    return { affectedRows: 1 };
  }

  if (upper.startsWith('INSERT INTO API_KEYS')) {
    memoryStore.api_keys.set(params[0], {
      id: params[0],
      name: params[1],
      api_key_hash: params[2],
      system_name: params[3],
      allowed_actions: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4],
      is_active: true,
      created_at: new Date().toISOString()
    });
    return { affectedRows: 1 };
  }

  if (upper.startsWith('INSERT INTO CHECKLISTS')) {
    memoryStore.checklists.set(params[0], {
      id: params[0],
      technician_id: params[1],
      technician_name: params[2],
      inspection_type: params[3],
      vehicle_or_kit_name: params[4],
      notes: params[5] || '',
      items_json: params[6],
      created_at: new Date().toISOString()
    });
    return { affectedRows: 1 };
  }

  if (upper.startsWith('INSERT INTO AUDIT_LOGS')) {
    memoryStore.audit_logs.push({
      id: memoryStore.audit_logs.length + 1,
      user_id: params[0],
      action: params[1],
      table_name: params[2],
      record_id: params[3],
      before_state: params[4],
      after_state: params[5],
      ip_address: params[6],
      created_at: new Date().toISOString()
    });
    return { affectedRows: 1 };
  }

  return [];
}

export { memoryStore };
