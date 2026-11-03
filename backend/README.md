# FieldOps IT Backend Service

Backend Express 5 server-authoritative dengan database MariaDB 11.x untuk sistem inventaris suku cadang IT kantor ISP.

## Fitur Utama
1. **Otentikasi Server**: Sesi aman via HTTP-only cookie, hashing kata sandi PBKDF2 (SHA-256 100.000 iterasi + 16-byte random salt).
2. **Skema Database Dua File Terpisah**:
   - `01_auth_schema.sql`: Khusus akun dan sesi pengguna.
   - `02_inventory_schema.sql`: Khusus data bisnis (master barang, kategori, mutasi, checklist).
   - `03_audit_trail_schema.sql`: Log perubahan audit trail.
3. **Backup Terpisah**: File backup data barang 100% bebas dari akun, hash, dan salt kata sandi.

## Menjalankan Backend
```bash
# Inisialisasi akun Master Admin pertama
npm run setup:admin

# Menjalankan pengujian backup & restore
npm run test:backup

# Mode Development
npm run dev
```
