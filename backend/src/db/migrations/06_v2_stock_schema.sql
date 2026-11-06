-- ==============================================================================
-- 06_v2_stock_schema.sql
-- FIELD OPS INVENTORY V2 - TAHAP 3: BOX, ITEM FISIK, & STOK JUMLAH
-- Skema Box Penyimpanan, Item Fisik Ber-ID, dan Stok Jumlah (Bulk)
-- ==============================================================================

-- 1. BOX: Lokasi penyimpanan di gudang (boleh berisi produk campuran)
CREATE TABLE IF NOT EXISTS box (
  id           VARCHAR(36) PRIMARY KEY,
  kode         VARCHAR(32) NOT NULL UNIQUE,
  keterangan   VARCHAR(255) NULL,
  aktif        TINYINT(1)  NOT NULL DEFAULT 1,
  dibuat_pada  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_box_kode ON box(kode);

-- 2. ITEM: Barang fisik ber-ID unik (SN, otomatis, manual) milik satu tipe
CREATE TABLE IF NOT EXISTS item (
  id           VARCHAR(36) PRIMARY KEY,
  kode_id      VARCHAR(120) NOT NULL UNIQUE,
  tipe_id      INT UNSIGNED NOT NULL,
  box_id       VARCHAR(36) NOT NULL,
  status       VARCHAR(32) NOT NULL DEFAULT 'aktif', -- 'aktif', 'keluar'
  dibuat_pada  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_item_tipe (tipe_id),
  KEY idx_item_box (box_id),
  KEY idx_item_status (status),
  CONSTRAINT fk_item_tipe FOREIGN KEY (tipe_id) REFERENCES tipe(id) ON DELETE RESTRICT,
  CONSTRAINT fk_item_box  FOREIGN KEY (box_id)  REFERENCES box(id)  ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. STOK_JUMLAH: Stok tipe yang tidak memakai ID (mode tanpa_id), dicatat per box
CREATE TABLE IF NOT EXISTS stok_jumlah (
  tipe_id      INT UNSIGNED NOT NULL,
  box_id       VARCHAR(36)  NOT NULL,
  jumlah       INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (tipe_id, box_id),
  CONSTRAINT fk_sjumlah_tipe FOREIGN KEY (tipe_id) REFERENCES tipe(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sjumlah_box  FOREIGN KEY (box_id)  REFERENCES box(id)  ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
