# PANDUAN DEPLOYMENT & OPERASIONAL SERVER LOKAL (DEPLOY.MD)
**Aplikasi**: FieldOps IT Inventory Rebuild  
**Infrastruktur**: Server Fisik / PC Kantor ISP (Local On-Premises)  
**Database**: MariaDB 11.4 LTS (Docker Container Terisolasi)  
**Akses Jarak Jauh**: Cloudflare Tunnel (HTTPS Tanpa Buka Port Firewall)

---

## 📋 1. Prasyarat Perangkat Keras & Lunak
- **Sistem Operasi Server**: Ubuntu Server 22.04 / 24.04 LTS (atau Debian 12).
- **Spesifikasi Minimum**: 2 CPU Core, 4 GB RAM, 50 GB SSD Storage.
- **Perangkat Lunak Wajib**:
  - Docker Engine >= 24.0 & Docker Compose V2
  - Node.js >= 22.0 LTS & npm >= 10.0
  - Git

---

## 🚀 2. Langkah Pemasangan dari Nol (Fresh Installation)

### Langkah 1: Kloning Repositori & Persiapan Direktori
```bash
git clone https://github.com/fath116-arch/App-storage.git /opt/fieldops
cd /opt/fieldops
mkdir -p backups data
```

### Langkah 2: Konfigurasi Variabel Lingkungan (`.env`)
Salin file `.env.example` ke `.env`:
```bash
cp .env.example .env
nano .env
```
Isi konfigurasi berikut:
```ini
# Port & Aplikasi
PORT=3000
NODE_ENV=production
APP_SECRET_KEY=kunci_rahasia_internal_super_panjang_dan_acak_2026

# Database MariaDB Server Kantor
DB_HOST=mariadb
DB_PORT=3306
DB_NAME=fieldops_inventory
DB_USER=fieldops_user
DB_PASSWORD=buat_password_database_rahasia_disini
DB_ROOT_PASSWORD=buat_password_root_mariadb_disini

# WhatsApp Gateway (Fonnte)
WHATSAPP_API_TOKEN=token_fonnte_resmi_anda
WHATSAPP_API_URL=https://api.fonnte.com/send
WHATSAPP_TARGET_PHONES=081299998888,081377776666
WHATSAPP_AUTO_ALERT=true

# Cloudflare Tunnel Token (Akses Jarak Jauh Atasan)
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiY2xvdWRmbGFyZS10b2tlbi1yZXNtaS1hbmRhIn0=
```

### Langkah 3: Menjalankan Container dengan Docker Compose
```bash
docker compose up -d
```
Pastikan seluruh container dalam status sehat (*healthy*):
```bash
docker compose ps
```

### Langkah 4: Membuat Akun Master Admin Pertama
Jalankan skrip inisialisasi akun admin secara interaktif di terminal server:
```bash
docker compose exec backend npm run setup:admin
```
Masukkan username, nama lengkap, email, dan kata sandi kuat (minimal 8 karakter).

---

## 🔒 3. Konfigurasi HTTPS & Akses Jarak Jauh (Cloudflare Tunnel)

### Mengapa Cloudflare Tunnel?
PWA (*Progressive Web App*) pada browser smartphone teknisi lapangan **mewajibkan protokol HTTPS** agar Service Worker dan fitur installable aktif. Cloudflare Tunnel menyediakan:
1. Sertifikat SSL/TLS valid otomatis dari Cloudflare.
2. Akses jarak jauh bagi Supervisor/Atasan tanpa perlu membuka port router (*Zero Open Ports*).
3. Bekerja sempurna meskipun ISP kantor menggunakan IP dinamis atau CGNAT (*Carrier-Grade NAT*).

### Langkah Setup Cloudflare Tunnel:
1. Buka dashboard Cloudflare Zero Trust: `https://one.dash.cloudflare.com/`
2. Masuk ke menu **Networks** > **Tunnels** > **Create a Tunnel**.
3. Pilih tipe **Cloudflared**, beri nama tunnel (misal: `fieldops-kantor`).
4. Salin token tunnel dan masukkan ke variabel `CLOUDFLARE_TUNNEL_TOKEN` di file `.env`.
5. Pada tab **Public Hostname**, tambahkan rute:
   - **Subdomain**: `inventory`
   - **Domain**: `domainkantor.com`
   - **Service**: `HTTP` -> `backend:3000`
6. Restart container tunnel:
   ```bash
   docker compose restart cloudflared
   ```
7. Aplikasi kini dapat diakses secara aman di `https://inventory.domainkantor.com` oleh atasan dari mana saja!

---

## 💾 4. Kebijakan Cadangan (Backup) Terjadwal & Salinan Offsite

### A. Cadangan Otomatis Harian (Lokal)
Backend secara otomatis membuat snapshot data inventori bisnis setiap 24 jam ke folder `/opt/fieldops/backups/`:
- `backup_inventory_items_YYYY-MM-DD.json` (Hanya data master, transaksi, dan kategori — **100% bebas dari akun & kata sandi**).

### B. Salinan Cadangan ke Lokasi Lain (Offsite via Rclone / Cron)
Untuk mencegah kehilangan data jika server kantor mengalami kerusakan fisik, pasang cronjob untuk menyalin folder `backups/` ke Google Drive / S3 / NAS cadangan setiap malam pukul 02:00:
```bash
crontab -e
```
Tambahkan baris berikut:
```cron
0 2 * * * rsync -avz --delete /opt/fieldops/backups/ backupuser@192.168.1.200:/mnt/nas/fieldops_backups/
```

---

## 🔄 5. Skrip Pemulihan (Restore) & Uji Coba

### Menguji Prosedur Restore:
Untuk memastikan berkas cadangan dapat dipulihkan dengan sempurna:
```bash
# Jalankan unit test backup & restore terpisah
docker compose exec backend npm run test:backup
```

### Memulihkan dari File Backup JSON Tertentu:
Jika database mengalami galat dan perlu dikembalikan ke tanggal tertentu:
```bash
docker compose exec backend node -e "
  const { BackupService } = require('./dist/services/backupService');
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('./backups/backup_inventory_items_2026-11-03.json', 'utf-8'));
  BackupService.restoreInventory(data).then(console.log);
"
```
Data inventori akan dipulihkan secara atomik tanpa merusak tabel akun pengguna.

---

## 🔀 6. Panduan Peralihan dari Database Demo ke Database Produksi Riil

Saat aplikasi hendak digunakan secara penuh di kantor dengan data asli, ikuti prosedur berikut:

### 1. Buat Database MariaDB Produksi Bersih:
```bash
docker compose exec mariadb mysql -u root -p -e "CREATE DATABASE fieldops_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. Impor Skema SQL Bersih (3 File Terisolasi):
```bash
# A. Impor Skema Akun & Sesi
docker compose exec -T mariadb mysql -u root -p fieldops_production < backend/src/db/migrations/01_auth_schema.sql

# B. Impor Skema Inventaris & Mutasi
docker compose exec -T mariadb mysql -u root -p fieldops_production < backend/src/db/migrations/02_inventory_schema.sql

# C. Impor Skema Audit Trail
docker compose exec -T mariadb mysql -u root -p fieldops_production < backend/src/db/migrations/03_audit_trail_schema.sql
```

### 3. Buat Akun Master Admin / Dev Superadmin Pertama:
```bash
docker compose exec backend npm run setup:admin
```
Pilih peran `superadmin` (Developer / Master System Governance) atau `supervisor`, lalu masukkan kata sandi kuat riil.

### 4. Perbarui Variabel `.env` Backend:
Ubah nama database di `.env` menjadi database produksi riil:
```ini
DB_NAME=fieldops_production
DB_PASSWORD=PasswordDatabaseProduksiAman123!
```

### 5. Restart Kontainer Backend:
```bash
docker compose restart backend
```
Sistem kini secara penuh terhubung ke database MariaDB produksi riil yang bersih dan aman.

---

## 🪟 7. Panduan Deployment pada Windows Server / Windows PC Kantor

Jika server kantor menggunakan sistem operasi **Windows** (Windows 10/11 Pro atau Windows Server 2019/2022), ikuti salah satu dari 2 opsi deployment berikut:

### 🌟 Opsi A: Deployment via Docker Desktop for Windows (Metode Direkomendasikan)

1. **Prasyarat**:
   - Install **Docker Desktop for Windows** (Aktifkan fitur *WSL 2 Backend*).
   - Install **Git for Windows**.

2. **Kloning Repositori & Buka PowerShell / Command Prompt (CMD)**:
   ```cmd
   git clone https://github.com/fath116-arch/App-storage.git C:\fieldops
   cd C:\fieldops
   ```

3. **Salin & Sesuaikan File Variabel `.env`**:
   ```powershell
   copy .env.example .env
   notepad .env
   ```

4. **Jalankan Aplikasi dengan Docker Compose**:
   ```powershell
   docker compose up -d
   ```

5. **Buat Akun Admin Pertama**:
   ```powershell
   docker compose exec backend npm run setup:admin
   ```

6. **Cloudflare Tunnel di Windows**:
   Jika menggunakan Cloudflare Tunnel, masukkan token `CLOUDFLARE_TUNNEL_TOKEN` pada file `.env`. Container `cloudflared` di Docker Desktop akan otomatis mengamankan koneksi HTTPS.

---

### 🛠️ Opsi B: Deployment Standalone Tanpa Docker (Node.js + MariaDB Native Windows)

Jika PC/Server Windows kantor tidak dapat menginstall Docker Desktop:

1. **Prasyarat Lunak**:
   - Install **Node.js >= 22.0 LTS (Installer .msi)** dari `https://nodejs.org/`.
   - Install **MariaDB Server 11.x for Windows** dari `https://mariadb.org/download/`.
   - Install **Git for Windows**.

2. **Kloning Repositori & Buat Database MariaDB**:
   Buka MariaDB Command Line Client atau tool GUI seperti **HeidiSQL** (bawaan MariaDB Windows):
   ```sql
   CREATE DATABASE fieldops_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Impor Skema SQL ke MariaDB via CMD Windows**:
   ```cmd
   mysql -u root -p fieldops_inventory < backend\src\db\migrations\01_auth_schema.sql
   mysql -u root -p fieldops_inventory < backend\src\db\migrations\02_inventory_schema.sql
   mysql -u root -p fieldops_inventory < backend\src\db\migrations\03_audit_trail_schema.sql
   ```

4. **Install Dependensi & Build Project**:
   ```cmd
   cd C:\fieldops
   copy .env.example .env
   notepad .env
   npm install
   npm run build
   ```
   *(Pastikan variabel `DB_HOST=localhost`, `DB_PORT=3306`, dan `DB_PASSWORD` disesuaikan pada file `.env`)*.

5. **Buat Akun Master Admin & Jalankan Server**:
   ```cmd
   npm run setup:admin
   npm run start
   ```

6. **Otomatisasi Server Berjalan saat Windows Booting (NSSM / PM2)**:
   Agar aplikasi otomatis berjalan tanpa perlu login Windows:
   * **Menggunakan PM2**:
     ```cmd
     npm install -g pm2 pm2-windows-startup
     pm2 start server.ts --name "fieldops-app"
     pm2-startup install
     pm2 save
     ```
   * **Menggunakan NSSM (Non-Sucking Service Manager)**:
     Download NSSM dari `https://nssm.cc/`, lalu daftarkan service Windows:
     ```cmd
     nssm install FieldOpsService "C:\Program Files\nodejs\node.exe" "C:\fieldops\server.ts"
     nssm start FieldOpsService
     ```


