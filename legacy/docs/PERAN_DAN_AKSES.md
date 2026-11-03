# Peran, Hak Akses & Keamanan Sesi - FieldOps IT

Dokumen ini mendefinisikan Role-Based Access Control (RBAC), alur autentikasi, manajemen sesi, serta analisis enforce keamanan pada **FieldOps IT**.

---

## 👥 1. Matriks Hak Akses (RBAC Matrix)

Aplikasi membagi pengguna menjadi 3 tingkat hak akses (*Role*):

| Fitur / Modul | Teknisi Lapangan (`technician`) | Admin Operasional (`admin`) | Supervisor (`supervisor`) |
| :--- | :---: | :---: | :---: |
| **Lihat Katalog Stok & Rak** | ✅ | ✅ | ✅ |
| **Checklist Tas Lapangan** | ✅ (Milik Sendiri) | ✅ | ✅ |
| **Barang Masuk (Stock In)** | ❌ | ✅ | ✅ |
| **Barang Keluar (Stock Out)** | ✅ (Sesuai Tiket) | ✅ | ✅ |
| **Batch Stock Out** | ❌ | ✅ | ✅ |
| **Kelola Kategori & Lokasi Rak**| ❌ | ✅ | ✅ |
| **Verifikasi Checklist Teknisi**| ❌ | ❌ | ✅ |
| **Ekspor Laporan (Excel/PDF)**  | ❌ | ✅ | ✅ |
| **Kelola Akun & Keamanan Role**| ❌ | ❌ | ✅ |
| **Reset / Cleardown System Data**| ❌ | ❌ | ✅ |

---

## 🔐 2. Alur Autentikasi & Hashing PBKDF2

### A. Mekanisme Login
1. Pengguna memasukkan `username` dan `password` pada form login.
2. Aplikasi mengambil data profil pengguna dan `salt` tersimpan.
3. Password di-hash menggunakan algoritma **PBKDF2**:
   - **Iterasi**: 100.000 kali
   - **Digest**: SHA-256
   - **Salt Length**: 16 bytes
4. Hasil hash dibandingkan dengan hash yang tersimpan. Jika cocok, sesi pengguna dibuat.

### B. Struktur Sesi Pengguna
Sesi disimpan di `localStorage` (`fieldops_user_session`) dengan format:
```json
{
  "uid": "usr_tech_01",
  "username": "budi_teknisi",
  "name": "Budi Santoso",
  "role": "technician",
  "token": "bearer_token_string",
  "loginAt": "2026-10-30T08:00:00Z",
  "expiresAt": "2026-10-30T20:00:00Z"
}
```

---

## 🛡️ 3. Analisis Enforce Keamanan Client vs Server (Status: Tuntas di v0.3.1)

### Status Remidiasi (v0.3.1)
- **Aturan Firestore Berbasis Autentikasi (`[SEC-01]`)**: Aturan keamanan `firestore.rules` mewajibkan `isSignedIn()` (`request.auth != null`) pada seluruh sub-koleksi inventori, transaksi, kategori, dan antrean sinkronisasi.
- **Enforce Otoritas Server-Side (`[SEC-02]`)**: Operasi sensitif (seperti reset database dan clear data) kini divalidasi oleh Express backend melalui endpoint `POST /api/security/verify-action` dengan header `X-App-Secret-Key`.
- **Menu UI & Perlindungan Ganda**: Tombol UI disembunyikan berdasarkan peran pengguna, dan eksekusi aksi dilindungi oleh backend authority sehingga manipulasi `localStorage` di DevTools ditolak oleh server.
