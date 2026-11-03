/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  Wrench, 
  Warehouse, 
  Eye, 
  CheckCircle2, 
  Lock, 
  Server,
  Terminal,
  LogOut
} from 'lucide-react';

interface UserRoleSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserRoleSwitcher: React.FC<UserRoleSwitcherProps> = ({
  isOpen,
  onClose
}) => {
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  const roleMatrices = [
    {
      role: 'technician',
      title: 'Teknisi Lapangan',
      icon: Wrench,
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      description: 'Akses lapangan untuk pengambilan stok kabel/perangkat, checklist tas lapangan, dan ekspor kebutuhan servis.',
      permissions: [
        { label: 'Lihat Katalog & Stok', allowed: true },
        { label: 'Pencatatan Barang Keluar (Stock Out)', allowed: true },
        { label: 'Checklist Tas Lapangan Teknisi', allowed: true },
        { label: 'Integrasi Tiket Lapangan', allowed: true },
        { label: 'Pencatatan Barang Masuk (Stock In)', allowed: false },
        { label: 'Tambah / Hapus / Edit Barang Master', allowed: false },
        { label: 'Download Backup & Restore Data', allowed: false },
      ]
    },
    {
      role: 'admin',
      title: 'Admin Gudang IT',
      icon: Warehouse,
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      description: 'Pengelola penuh operasional gudang, mutasi masuk/keluar, manajemen barang, master kategori, dan restore.',
      permissions: [
        { label: 'Lihat Katalog & Stok', allowed: true },
        { label: 'Pencatatan Barang Keluar (Stock Out)', allowed: true },
        { label: 'Checklist Tas Lapangan Teknisi', allowed: true },
        { label: 'Integrasi Tiket Lapangan', allowed: true },
        { label: 'Pencatatan Barang Masuk (Stock In)', allowed: true },
        { label: 'Tambah / Hapus / Edit Barang Master', allowed: true },
        { label: 'Download Backup & Restore Data', allowed: true },
      ]
    },
    {
      role: 'superadmin',
      title: 'Developer Superadmin',
      icon: ShieldCheck,
      badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      description: 'Akses tingkat pengembang & IT Master Governance dengan hak istimewa tertinggi lintas seluruh sistem dan pemeliharaan DB.',
      permissions: [
        { label: 'Lihat Katalog & Stok', allowed: true },
        { label: 'Mutasi Stok Masuk & Keluar', allowed: true },
        { label: 'Akses REST API Tiket Lapangan', allowed: true },
        { label: 'Manajemen Akun & Reset Pass CLI', allowed: true },
        { label: 'Download & Restore Database', allowed: true },
        { label: 'Audit System & Log Server-Side', allowed: true },
        { label: 'Konfigurasi WhatsApp Gateway', allowed: true },
      ]
    },
    {
      role: 'supervisor',
      title: 'Supervisor / Atasan',
      icon: Eye,
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      description: 'Pengawasan menyeluruh lintas kantor dari luar via Cloudflare Tunnel, laporan mingguan, dan audit mutasi.',
      permissions: [
        { label: 'Lihat Katalog & Stok', allowed: true },
        { label: 'Laporan Pergerakan Mingguan', allowed: true },
        { label: 'Pantau Log Mutasi & Audit Trail', allowed: true },
        { label: 'Checklist Tas Lapangan Teknisi', allowed: true },
        { label: 'Akses Remote Cloudflare Tunnel', allowed: true },
        { label: 'Pencatatan Barang Masuk / Keluar', allowed: true },
        { label: 'Download Backup Data', allowed: true },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base font-display">
                  Matriks Hak Akses &amp; Keamanan Sesi Server
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                  PBKDF2 SHA-256
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Otorisasi peran ditegakkan secara server-authoritative oleh backend MariaDB.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Session Info */}
        {user && (
          <div className="p-5 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-sm">
                {user.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    @{user.username}
                  </span>
                  {user.is_master_admin && (
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-300">
                      Master Admin
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-3">
                  <span>Divisi: <strong>{user.department}</strong></span>
                  <span>Peran: <strong className="capitalize">{user.role}</strong></span>
                  <span>Status: <strong className="text-emerald-600 dark:text-emerald-400">{user.status}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout Sesi</span>
            </button>
          </div>
        )}

        {/* Content: Role Matrix */}
        <div className="p-6 max-h-[58vh] overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roleMatrices.map((matrix) => {
              const Icon = matrix.icon;
              const isCurrentRole = user?.role === matrix.role;
              return (
                <div 
                  key={matrix.role}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrentRole 
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500' 
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${matrix.badgeColor}`}>
                      {matrix.title}
                    </span>
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 min-h-[36px]">
                    {matrix.description}
                  </p>
                  
                  <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-3">
                    {matrix.permissions.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className={p.allowed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500 line-through'}>
                          {p.label}
                        </span>
                        {p.allowed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Admin CLI Setup Notice */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs flex items-start gap-3 border border-slate-800">
            <Terminal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white mb-1">
                Manajemen Akun Server-Side (Keamanan Server Lokal)
              </div>
              <p className="text-slate-400 leading-relaxed mb-2">
                Sesuai prinsip keamanan Zero Trust, kata sandi pengguna tidak disimpan di browser dan tidak dapat diedit secara sewenang-wenang dari klien.
                Untuk mendaftarkan atau menyetel ulang kata sandi admin kantor, gunakan perintah CLI interaktif di server:
              </p>
              <code className="inline-block bg-slate-800 text-emerald-300 px-3 py-1.5 rounded-lg font-mono text-[11px] border border-slate-700">
                npm run setup:admin
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-500" />
            <span>Satu Kantor Tunggal &bull; MariaDB 11.x Server</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-700 hover:bg-slate-800 transition-colors font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
