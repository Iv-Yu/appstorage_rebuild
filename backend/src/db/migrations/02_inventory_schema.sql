-- ==============================================================================
-- 02_inventory_schema.sql
-- FILE 2: SKEMA DATA BISNIS INVENTARIS, MUTASI STOK, & INTEGRASI (TERISOLASI)
-- Catatan: File ini sama sekali TIDAK memuat password_hash, salt, atau kredensial akun.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(36) PRIMARY KEY,
    sku VARCHAR(64) UNIQUE NOT NULL,
    barcode VARCHAR(64) UNIQUE,
    name VARCHAR(256) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    min_stock_alert INT NOT NULL DEFAULT 2,
    unit VARCHAR(32) NOT NULL DEFAULT 'pcs',
    location VARCHAR(128) DEFAULT '',
    specs TEXT,
    unit_cost DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('NORMAL', 'LOW_STOCK', 'OUT_OF_STOCK') NOT NULL DEFAULT 'NORMAL',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_quantity_non_negative CHECK (quantity >= 0),
    CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(is_deleted);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('IN', 'OUT', 'ADJUST') NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    previous_qty INT NOT NULL,
    new_qty INT NOT NULL,
    reference_type VARCHAR(64) DEFAULT 'MANUAL',
    reference_number VARCHAR(128) DEFAULT '',
    recipient_destination VARCHAR(256) DEFAULT '',
    user_id VARCHAR(36) NOT NULL,
    performed_by VARCHAR(128) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transactions_item FOREIGN KEY (item_id) REFERENCES items(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

CREATE TABLE IF NOT EXISTS checklists (
    id VARCHAR(36) PRIMARY KEY,
    technician_id VARCHAR(36) NOT NULL,
    technician_name VARCHAR(128) NOT NULL,
    inspection_type VARCHAR(64) NOT NULL DEFAULT 'TOOLKIT_CHECK',
    vehicle_or_kit_name VARCHAR(128) DEFAULT 'Tas Utama Teknisi',
    notes TEXT,
    items_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    api_key_hash VARCHAR(128) UNIQUE NOT NULL,
    system_name VARCHAR(128) NOT NULL,
    allowed_actions JSON NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS whatsapp_config (
    id INT PRIMARY KEY DEFAULT 1,
    gateway_type ENUM('fonnte', 'wablas', 'custom_webhook') NOT NULL DEFAULT 'fonnte',
    api_url VARCHAR(256) NOT NULL DEFAULT 'https://api.fonnte.com/send',
    api_token VARCHAR(256) DEFAULT '',
    target_phones TEXT,
    auto_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id VARCHAR(36) PRIMARY KEY,
    target_phone VARCHAR(64) NOT NULL,
    message_snippet VARCHAR(256) NOT NULL,
    full_message TEXT NOT NULL,
    items_count INT NOT NULL DEFAULT 0,
    status ENUM('SUCCESS', 'FAILED', 'SIMULATED') NOT NULL,
    gateway_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
