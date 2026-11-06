-- ==============================================================================
-- 05_v2_catalog_schema.sql
-- FIELD OPS INVENTORY V2 - TAHAP 2: KATALOG BERTIENGKAT
-- Skema Jenis, Atribut, Atribut Opsi, Produk, Tipe, dan Nilai Atribut
-- ==============================================================================

-- 1. JENIS: golongan besar (Adaptor, Kabel, Modem/ONU, Router, ...)
CREATE TABLE IF NOT EXISTS jenis (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama               VARCHAR(80)  NOT NULL,
  sumber_id_bawaan   VARCHAR(32)  NOT NULL DEFAULT 'manual',
  prefix_id_bawaan   VARCHAR(10)  NULL,
  aktif              TINYINT(1)   NOT NULL DEFAULT 1,
  dibuat_pada        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jenis_nama (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ATRIBUT: definisi kolom spesifikasi per jenis (Tegangan, Arus, Jenis jack, ...)
CREATE TABLE IF NOT EXISTS atribut (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jenis_id       INT UNSIGNED NOT NULL,
  kode           VARCHAR(40)  NOT NULL,
  nama           VARCHAR(80)  NOT NULL,
  tipe_isian     VARCHAR(20)  NOT NULL, -- 'angka', 'pilihan', 'teks'
  satuan         VARCHAR(16)  NULL,     -- 'V', 'A', 'm', dsb.
  wajib          TINYINT(1)   NOT NULL DEFAULT 1,
  urutan         SMALLINT     NOT NULL DEFAULT 0,
  masuk_nama     TINYINT(1)   NOT NULL DEFAULT 1,
  dibuat_pada    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_atribut_kode (jenis_id, kode),
  CONSTRAINT fk_atribut_jenis FOREIGN KEY (jenis_id) REFERENCES jenis(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2b. ATRIBUT_OPSI: Opsi untuk atribut bertipe 'pilihan'
CREATE TABLE IF NOT EXISTS atribut_opsi (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  atribut_id  INT UNSIGNED NOT NULL,
  nilai       VARCHAR(80)  NOT NULL,
  urutan      SMALLINT     NOT NULL DEFAULT 0,
  UNIQUE KEY uq_opsi (atribut_id, nilai),
  CONSTRAINT fk_opsi_atribut FOREIGN KEY (atribut_id) REFERENCES atribut(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PRODUK: induk di katalog (Adaptor 12V, Kabel LAN, MikroTik RB750, ...)
CREATE TABLE IF NOT EXISTS produk (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jenis_id    INT UNSIGNED NOT NULL,
  nama        VARCHAR(120) NOT NULL,
  kategori    VARCHAR(32)  NOT NULL DEFAULT 'fast_moving', -- 'fast_moving', 'recycle'
  catatan     TEXT         NULL,
  aktif       TINYINT(1)   NOT NULL DEFAULT 1,
  dibuat_oleh VARCHAR(36)  NULL,
  dibuat_pada DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_produk (jenis_id, nama),
  KEY idx_produk_kategori (kategori),
  CONSTRAINT fk_produk_jenis FOREIGN KEY (jenis_id) REFERENCES jenis(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TIPE: varian spesifik produk (12V / 1A, 12V / 3A). Stok dihitung per tipe.
CREATE TABLE IF NOT EXISTS tipe (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  produk_id      INT UNSIGNED NOT NULL,
  nama_tipe      VARCHAR(160) NOT NULL,
  catatan        VARCHAR(255) NULL,
  sumber_id      VARCHAR(32)  NOT NULL DEFAULT 'manual', -- 'scan_sn', 'otomatis', 'manual', 'tanpa_id'
  mode_stok      VARCHAR(32)  NOT NULL DEFAULT 'per_id', -- 'per_id', 'jumlah'
  prefix_id      VARCHAR(10)  NULL,
  pola_id        VARCHAR(200) NULL,
  id_dikunci     TINYINT(1)   NOT NULL DEFAULT 0,
  aktif          TINYINT(1)   NOT NULL DEFAULT 1,
  dibuat_pada    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tipe_nama (produk_id, nama_tipe),
  CONSTRAINT fk_tipe_produk FOREIGN KEY (produk_id) REFERENCES produk(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TIPE_NILAI: nilai atribut spesifik per tipe
CREATE TABLE IF NOT EXISTS tipe_nilai (
  tipe_id      INT UNSIGNED NOT NULL,
  atribut_id   INT UNSIGNED NOT NULL,
  nilai_angka  DECIMAL(12,3) NULL,
  opsi_id      INT UNSIGNED  NULL,
  nilai_teks   VARCHAR(160)  NULL,
  PRIMARY KEY (tipe_id, atribut_id),
  KEY idx_nilai_angka (atribut_id, nilai_angka),
  KEY idx_nilai_opsi  (atribut_id, opsi_id),
  CONSTRAINT fk_nilai_tipe    FOREIGN KEY (tipe_id)    REFERENCES tipe(id) ON DELETE CASCADE,
  CONSTRAINT fk_nilai_atribut FOREIGN KEY (atribut_id) REFERENCES atribut(id) ON DELETE RESTRICT,
  CONSTRAINT fk_nilai_opsi    FOREIGN KEY (opsi_id)    REFERENCES atribut_opsi(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
