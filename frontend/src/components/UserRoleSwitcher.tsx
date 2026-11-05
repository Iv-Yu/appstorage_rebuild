/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, UserProfile } from '../services/api';
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
  LogOut,
  UserPlus,
  Users,
  AlertCircle
} from 'lucide-react';

interface UserRoleSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserRoleSwitcher: React.FC<UserRoleSwitcherProps> = ({
  isOpen,
  onClose
}) => {
  const { user, logout, register } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'matrix' | 'users' | 'add'>('matrix');
  
  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'supervisor' | 'technician'>('technician');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const isAdminOrSpv = user?.role === 'admin' || user?.role === 'supervisor' || (user?.role as any) === 'superadmin';

  useEffect(() => {
    if (isOpen && isAdminOrSpv) {
      api.getUsers()
        .then(res => setUsersList(res))
        .catch(() => {});
    }
  }, [isOpen, isAdminOrSpv]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    if (!newUsername.trim() || !newPassword.trim()) {
      setFormMsg({ type: 'error', text: 'Username dan kata sandi wajib diisi.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.register({
        username: newUsername.trim(),
        name: newName.trim() || newUsername.trim(),
        role: newRole,
        password: newPassword
      });

      if (res.success) {
        setFormMsg({ type: 'success', text: `Akun "${newUsername}" berhasil dibuat dan aktif!` });
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        // Refresh users list
        api.getUsers().then(res => setUsersList(res)).catch(() => {});
        setTimeout(() => setActiveTab('users'), 1000);
      } else {
        setFormMsg({ type: 'error', text: res.message || 'Gagal membuat akun.' });
      }
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Gagal menghubungi server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  Manajemen Akun &amp; Hak Akses
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                  v1.1.0 Ready
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
          <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm">
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

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Matriks Hak Akses</span>
          </button>

          {isAdminOrSpv && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'users'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Daftar Pengguna ({usersList.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('add')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'add'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tambah Pengguna Baru</span>
              </button>
            </>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[55vh] overflow-y-auto space-y-6">
          
          {/* TAB 1: Matriks Hak Akses */}
          {activeTab === 'matrix' && (
            <>
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
                    Manajemen Akun Server-Side &amp; CLI
                  </div>
                  <p className="text-slate-400 leading-relaxed mb-2">
                    Akun baru dapat dibuat langsung melalui tab <strong>"+ Tambah Pengguna Baru"</strong> di atas, atau melalui perintah terminal di server:
                  </p>
                  <code className="inline-block bg-slate-800 text-emerald-300 px-3 py-1.5 rounded-lg font-mono text-[11px] border border-slate-700">
                    npm run setup:admin
                  </code>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: Daftar Pengguna Aktif */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Daftar Akun Pengguna Terdaftar
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah Pengguna</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {usersList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Memuat daftar pengguna...
                  </div>
                ) : (
                  usersList.map((u) => (
                    <div key={u.id} className="p-3.5 bg-white dark:bg-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 dark:text-white">{u.name}</strong>
                          <span className="font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                            @{u.username}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{u.email}</span>
                          <span>·</span>
                          <span>{u.department}</span>
                        </div>
                      </div>
                      <span className="capitalize px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {u.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Tambah Pengguna Baru */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreateUser} className="space-y-4 max-w-lg mx-auto">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                Pendaftaran Akun Pengguna Baru
              </h4>

              {formMsg && (
                <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  formMsg.type === 'error'
                    ? 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {formMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{formMsg.text}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Contoh: ahmad"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Ahmad Alfath"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Peran Pengguna
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="admin">Admin Gudang IT (Kelola Barang &amp; Stok)</option>
                  <option value="supervisor">Supervisor (Pengawasan &amp; Laporan)</option>
                  <option value="technician">Teknisi Lapangan (Pengambilan Suku Cadang &amp; Checklist)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kata Sandi *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan & Daftarkan Akun Pengguna'}
              </button>
            </form>
          )}

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
