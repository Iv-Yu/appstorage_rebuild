-- ==============================================================================
-- 04_v2_foundation_schema.sql
-- FIELD OPS INVENTORY V2 - TAHAP 1: FONDASI
-- Sesi Server, Pengaturan, Log Transaksi ID Aktivitas, & Sampah Hapus (14 Hari)
-- ==============================================================================

-- 1. Tabel SESI: Sesi Server-Authoritative dengan Rotasi Token & Device ID
CREATE TABLE IF NOT EXISTS sesi (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    refresh_hash VARCHAR(128) NOT NULL,
    device_id_hash VARCHAR(128) NOT NULL,
    user_agent TEXT,
    ip VARCHAR(45) DEFAULT '',
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aktivitas_terakhir TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    kedaluwarsa_mutlak TIMESTAMP NOT NULL,
    dicabut_pada TIMESTAMP NULL,
    CONSTRAINT fk_sesi_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_sesi_user_id ON sesi(user_id);
CREATE INDEX IF NOT EXISTS idx_sesi_refresh_hash ON sesi(refresh_hash);
CREATE INDEX IF NOT EXISTS idx_sesi_device_hash ON sesi(device_id_hash);

-- 2. Tabel PENGATURAN: Konfigurasi Parameter Sistem (Bebas Hardcode)
CREATE TABLE IF NOT EXISTS pengaturan (
    kunci VARCHAR(80) PRIMARY KEY,
    nilai TEXT NOT NULL,
    keterangan TEXT NULL,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nilai Bawaan Pengaturan Sistem
INSERT IGNORE INTO pengaturan (kunci, nilai, keterangan) VALUES
('ACCESS_TOKEN_TTL_DETIK', '900', 'Masa berlaku access token (15 menit)'),
('IDLE_TIMEOUT_MENIT', '30', 'Sesi mati bila tidak ada aktivitas (30 menit)'),
('ABSOLUTE_TIMEOUT_JAM', '12', 'Sesi mati mutlak setelah 12 jam'),
('MAX_SESI_PER_AKUN', '1', 'Batas sesi aktif per akun (login baru mencabut sesi lama)'),
('REAUTH_MENIT', '15', 'Batas waktu re-autentikasi password untuk aksi tingkat 3'),
('RETENSI_SAMPAH_HARI', '14', 'Masa simpan sampah hapus permanen sebelum dibersihkan'),
('CONFIRMATION_TOKEN_TTL_DETIK', '120', 'Masa berlaku token konfirmasi bertingkat sekali pakai'),
('CONFIRMATION_TIERS', '{"stock_move_single":0,"notes_update":0,"stock_out_single":1,"restore_single":1,"request_approve":2,"request_reject":2,"bulk_stock_out":2,"bulk_stock_in":2,"permanent_delete":3,"delete_product":3,"delete_type":3,"delete_kind":3,"delete_box":3,"correct_item_id":3,"change_role":3,"change_id_rule":3}', 'Pemetaan tingkat konfirmasi bertingkat (Tingkat 0-3)');

-- 3. Tabel TRANSAKSI & TRANSAKSI_DETAIL: Log Mutasi Append-Only dengan ID Aktivitas
CREATE TABLE IF NOT EXISTS transaksi (
    id VARCHAR(36) PRIMARY KEY,
    id_aktivitas VARCHAR(32) UNIQUE NOT NULL,
    aksi VARCHAR(64) NOT NULL,
    pelaku_id VARCHAR(36) NOT NULL,
    penyetuju_id VARCHAR(36) NULL,
    request_id VARCHAR(36) NULL,
    box_asal VARCHAR(32) NULL,
    box_tujuan VARCHAR(32) NULL,
    catatan TEXT NULL,
    waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_transaksi_id_aktivitas ON transaksi(id_aktivitas);
CREATE INDEX IF NOT EXISTS idx_transaksi_pelaku ON transaksi(pelaku_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_aksi ON transaksi(aksi);
CREATE INDEX IF NOT EXISTS idx_transaksi_waktu ON transaksi(waktu);

CREATE TABLE IF NOT EXISTS transaksi_detail (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaksi_id VARCHAR(36) NOT NULL,
    tipe_id INT UNSIGNED NULL,
    item_id VARCHAR(36) NULL,
    kode_id VARCHAR(120) NULL,
    nama_snapshot VARCHAR(255) NOT NULL,
    jumlah INT NOT NULL DEFAULT 1,
    status_sebelum VARCHAR(32) NULL,
    status_sesudah VARCHAR(32) NULL,
    CONSTRAINT fk_detail_transaksi FOREIGN KEY (transaksi_id) REFERENCES transaksi(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_tdetail_transaksi_id ON transaksi_detail(transaksi_id);
CREATE INDEX IF NOT EXISTS idx_tdetail_kode_id ON transaksi_detail(kode_id);
CREATE INDEX IF NOT EXISTS idx_tdetail_item_id ON transaksi_detail(item_id);

-- 4. Tabel SAMPAH_HAPUS: Hapus Permanen Snapshot Lapis 2 dengan Retensi 14 Hari
CREATE TABLE IF NOT EXISTS sampah_hapus (
    id VARCHAR(36) PRIMARY KEY,
    jenis_objek VARCHAR(32) NOT NULL,
    objek_id VARCHAR(64) NOT NULL,
    snapshot LONGTEXT NOT NULL,
    dihapus_oleh VARCHAR(36) NOT NULL,
    dihapus_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aktivitas_id VARCHAR(32) NOT NULL,
    purge_setelah TIMESTAMP NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'menunggu'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_sampah_jenis_objek ON sampah_hapus(jenis_objek);
CREATE INDEX IF NOT EXISTS idx_sampah_objek_id ON sampah_hapus(objek_id);
CREATE INDEX IF NOT EXISTS idx_sampah_purge_setelah ON sampah_hapus(purge_setelah);
CREATE INDEX IF NOT EXISTS idx_sampah_status ON sampah_hapus(status);

-- 5. Tabel TOKEN_KONFIRMASI: Token Konfirmasi Bertingkat Sekali Pakai (Tingkat 2 & 3)
CREATE TABLE IF NOT EXISTS token_konfirmasi (
    id VARCHAR(64) PRIMARY KEY,
    token_hash VARCHAR(128) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    tier INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_tkonfirm_token_hash ON token_konfirmasi(token_hash);
CREATE INDEX IF NOT EXISTS idx_tkonfirm_user_id ON token_konfirmasi(user_id);
CREATE INDEX IF NOT EXISTS idx_tkonfirm_expires_at ON token_konfirmasi(expires_at);
