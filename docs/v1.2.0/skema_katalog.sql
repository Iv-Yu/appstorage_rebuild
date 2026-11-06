-- FieldOps Inventory v2 - Skema katalog (MariaDB 10.5+)
-- Cakupan: Jenis, Atribut, Produk, Tipe, Nilai atribut.
-- Tahap berikutnya: Box, Item ber-ID, Stok jumlah, Transaksi, Request.

SET NAMES utf8mb4;

-- 1. JENIS: golongan besar (Adaptor, Kabel, Modem/ONU, ...)
CREATE TABLE jenis (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama               VARCHAR(80)  NOT NULL,
  -- Nilai bawaan yang disalin ke tipe baru supaya input lebih cepat
  sumber_id_bawaan   ENUM('scan_sn','otomatis','manual','tanpa_id') NOT NULL DEFAULT 'manual',
  prefix_id_bawaan   VARCHAR(10)  NULL,
  aktif              TINYINT(1)   NOT NULL DEFAULT 1,
  dibuat_pada        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jenis_nama (nama)
) ENGINE=InnoDB;

-- 2. ATRIBUT: definisi kolom per jenis (Tegangan, Arus, Jenis jack, ...)
CREATE TABLE atribut (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jenis_id       INT UNSIGNED NOT NULL,
  kode           VARCHAR(40)  NOT NULL,            -- 'tegangan', 'arus'
  nama           VARCHAR(80)  NOT NULL,            -- 'Tegangan', 'Arus'
  tipe_isian     ENUM('angka','pilihan','teks') NOT NULL,
  satuan         VARCHAR(16)  NULL,                -- 'V', 'A', 'm' (untuk angka)
  wajib          TINYINT(1)   NOT NULL DEFAULT 1,
  urutan         SMALLINT     NOT NULL DEFAULT 0,  -- urutan tampil & urutan di nama tipe
  masuk_nama     TINYINT(1)   NOT NULL DEFAULT 1,  -- ikut membentuk nama tipe otomatis
  dibuat_pada    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_atribut_kode (jenis_id, kode),
  CONSTRAINT fk_atribut_jenis FOREIGN KEY (jenis_id) REFERENCES jenis(id)
) ENGINE=InnoDB;

-- 2b. Opsi untuk atribut bertipe 'pilihan' (jack 5.5mm, jack 3.5mm, ...)
CREATE TABLE atribut_opsi (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  atribut_id  INT UNSIGNED NOT NULL,
  nilai       VARCHAR(80)  NOT NULL,
  urutan      SMALLINT     NOT NULL DEFAULT 0,
  UNIQUE KEY uq_opsi (atribut_id, nilai),
  CONSTRAINT fk_opsi_atribut FOREIGN KEY (atribut_id) REFERENCES atribut(id)
) ENGINE=InnoDB;

-- 3. PRODUK: induk di katalog (Adaptor 12V)
CREATE TABLE produk (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jenis_id    INT UNSIGNED NOT NULL,
  nama        VARCHAR(120) NOT NULL,
  kategori    ENUM('fast_moving','recycle') NOT NULL,
  catatan     TEXT         NULL,
  aktif       TINYINT(1)   NOT NULL DEFAULT 1,
  dibuat_oleh INT UNSIGNED NULL,                   -- FK ke tabel akun (tahap fondasi)
  dibuat_pada DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_produk (jenis_id, nama),
  KEY idx_produk_kategori (kategori),
  CONSTRAINT fk_produk_jenis FOREIGN KEY (jenis_id) REFERENCES jenis(id)
) ENGINE=InnoDB;

-- 4. TIPE: varian produk (12V / 1A, 12V / 3A). Stok dihitung per tipe.
CREATE TABLE tipe (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  produk_id      INT UNSIGNED NOT NULL,
  nama_tipe      VARCHAR(160) NOT NULL,            -- dibentuk aplikasi dari nilai atribut
  catatan        VARCHAR(255) NULL,
  -- Aturan ID per tipe
  sumber_id      ENUM('scan_sn','otomatis','manual','tanpa_id') NOT NULL,
  mode_stok      ENUM('per_id','jumlah') NOT NULL,  -- 'tanpa_id' => 'jumlah'
  prefix_id      VARCHAR(10)  NULL,                -- untuk sumber 'otomatis'
  pola_id        VARCHAR(200) NULL,                -- regex validasi format SN/ID
  id_dikunci     TINYINT(1)   NOT NULL DEFAULT 0,  -- jadi 1 setelah stok pertama masuk
  aktif          TINYINT(1)   NOT NULL DEFAULT 1,
  dibuat_pada    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tipe_nama (produk_id, nama_tipe),
  CONSTRAINT fk_tipe_produk FOREIGN KEY (produk_id) REFERENCES produk(id),
  CONSTRAINT ck_tipe_mode CHECK (
    (sumber_id = 'tanpa_id' AND mode_stok = 'jumlah') OR
    (sumber_id <> 'tanpa_id' AND mode_stok = 'per_id')
  )
) ENGINE=InnoDB;

-- 5. NILAI ATRIBUT per tipe. Tepat satu kolom nilai terisi.
CREATE TABLE tipe_nilai (
  tipe_id      INT UNSIGNED NOT NULL,
  atribut_id   INT UNSIGNED NOT NULL,
  nilai_angka  DECIMAL(12,3) NULL,
  opsi_id      INT UNSIGNED  NULL,
  nilai_teks   VARCHAR(160)  NULL,
  PRIMARY KEY (tipe_id, atribut_id),
  KEY idx_nilai_angka (atribut_id, nilai_angka),
  KEY idx_nilai_opsi  (atribut_id, opsi_id),
  CONSTRAINT fk_nilai_tipe   FOREIGN KEY (tipe_id)    REFERENCES tipe(id) ON DELETE CASCADE,
  CONSTRAINT fk_nilai_atribut FOREIGN KEY (atribut_id) REFERENCES atribut(id),
  CONSTRAINT fk_nilai_opsi   FOREIGN KEY (opsi_id)    REFERENCES atribut_opsi(id),
  CONSTRAINT ck_nilai_satu CHECK (
    (nilai_angka IS NOT NULL) + (opsi_id IS NOT NULL) + (nilai_teks IS NOT NULL) = 1
  )
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- Aturan yang dijaga di aplikasi (bukan di database):
--  * atribut_id pada tipe_nilai harus milik jenis dari produk tipe tersebut
--  * nilai wajib terisi untuk atribut dengan wajib = 1
--  * atribut yang sudah punya nilai tidak boleh dihapus / diubah tipe isiannya
--  * pola_id dan sumber_id tidak boleh diubah bila id_dikunci = 1
--    (perubahan lewat fitur koreksi yang tercatat di log)
-- ---------------------------------------------------------------

-- Contoh filter lintas produk: semua tipe adaptor bertegangan 12 V dan arus >= 2 A
-- SELECT t.id, p.nama, t.nama_tipe
-- FROM tipe t
-- JOIN produk p ON p.id = t.produk_id
-- JOIN atribut a_v ON a_v.jenis_id = p.jenis_id AND a_v.kode = 'tegangan'
-- JOIN atribut a_a ON a_a.jenis_id = p.jenis_id AND a_a.kode = 'arus'
-- JOIN tipe_nilai v ON v.tipe_id = t.id AND v.atribut_id = a_v.id AND v.nilai_angka = 12
-- JOIN tipe_nilai r ON r.tipe_id = t.id AND r.atribut_id = a_a.id AND r.nilai_angka >= 2
-- WHERE p.jenis_id = (SELECT id FROM jenis WHERE nama = 'Adaptor');
