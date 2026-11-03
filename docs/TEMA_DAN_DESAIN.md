# Sistem Tema, Desain & Responsivitas - FieldOps IT

Dokumen ini memuat spesifikasi sistem desain, sistem token warna, panduan *Dark Mode*, dan aturan responsivitas layout pada **FieldOps IT**.

---

## 🎨 1. Palette Warna & Token Desain

Aplikasi menggunakan **Tailwind CSS v4** dengan pemetaan warna slate & primary blue:

### A. Tema Terang (Light Mode)
- **Background Utama**: `bg-slate-50` (`#f8fafc`)
- **Card / Surface**: `bg-white` (`#ffffff`)
- **Teks Utama**: `text-slate-900` (`#0f172a`)
- **Teks Muted**: `text-slate-600` (`#475569`)
- **Border**: `border-slate-200` (`#e2e8f0`)

### B. Tema Gelap (Dark Mode)
- **Background Utama**: `dark:bg-slate-950` (`#020617`)
- **Card / Surface**: `dark:bg-slate-900` (`#0f172a`)
- **Elevated Surface**: `dark:bg-slate-800` (`#1e293b`)
- **Teks Utama**: `dark:text-slate-100` (`#f8fafc`)
- **Teks Muted**: `dark:text-slate-400` (`#94a3b8`)
- **Border**: `dark:border-slate-800` (`#1e293b`)

### C. Accent & Status Color
- **Primary / Action**: `bg-blue-600` / `hover:bg-blue-700` (`text-white`)
- **Alert / Low Stock**: `bg-amber-500` / `text-amber-600`
- **Success**: `bg-emerald-500` / `text-emerald-600`
- **Danger**: `bg-rose-500` / `text-rose-600`

---

## 🚫 2. Disiplin Zero-Pill & Perbaikan Border Gelap

### Kasus Masalah Visual Sebelumnya (v0.2.4)
1. **Garis Putih Menu Samping**: Terlihat garis pemisah putih tebal yang tajam di antara kelompok menu sidebar saat tema gelap aktif.
2. **Avatar Profil Pengguna (User Pill)**: Menu profil pengguna memiliki latar belakang putih terang yang kontras tajam dengan header gelap, tampak seperti pill putih terputus.

### Solusi Desain (Diimplementasikan pada v0.2.9)
1. **Pembersihan Garis Pemisah (Zero-Pill Border)**:
   - Mengganti border tebal putih dengan `dark:border-slate-800/60` yang lembut.
   - Menghapus outline/ring putih acak pada submenu item.
2. **Refaktorisasi Avatar Profil**:
   - Komponen profil pengguna di header menggunakan `dark:bg-slate-800/80` dengan teks `dark:text-slate-200` dan hover state `dark:hover:bg-slate-700/80`.
   - Menghilangkan kontras putih terang yang menyilaukan mata saat mode gelap aktif.

---

## 📱 3. Responsivitas & Viewport Seluler

- **Breakpoints**:
  - `sm`: 640px (Ponsel Lanskap)
  - `md`: 768px (Tablet)
  - `lg`: 1024px (Desktop/Laptop)
- **Sidebar Navigation**:
  - Layar Desktop (`lg` ke atas): Sidebar tetap terbuka (*sticky sidebar*).
  - Layar Seluler (`< lg`): Sidebar tersembunyi (*collapsible drawer*). Tombol hamburger di header digunakan untuk membuka overlay menu.
- **Tabel Data & Modal**:
  - Tabel menggunakan pembungkus `overflow-x-auto` agar dapat digeser horizontal tanpa merusak layout halaman.
  - Modal dialog menggunakan lebar responsif `w-full max-w-lg mx-4` dengan batas tinggi maksimum `max-h-[90vh]` dan scroll internal.
