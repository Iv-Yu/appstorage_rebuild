/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  ShieldCheck, 
  KeyRound, 
  Building, 
  Mail, 
  Lock, 
  UserPlus, 
  CheckCircle2, 
  Wrench, 
  Warehouse, 
  Eye, 
  Database, 
  Plus, 
  Sparkles,
  ArrowRight,
  Layers,
  Globe
} from 'lucide-react';
import { verifyPassword } from '../utils/security';
import { APP_VERSION } from '../constants/version';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { 
    users, 
    switchUser, 
    addUser, 
    login,
    workspaces, 
    currentWorkspaceId, 
    switchWorkspace, 
    addWorkspace,
    showToast 
  } = useInventory();

  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || 'user-tech-1');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [regSuccessNotice, setRegSuccessNotice] = useState('');

  // Register / Add User Mode
  const [isRegistering, setIsRegistering] = useState(false);
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    role: 'technician' as 'technician' | 'admin' | 'supervisor',
    department: '',
    password: ''
  });

  // Create Workspace Mode
  const [isCreatingDb, setIsCreatingDb] = useState(false);
  const [dbName, setDbName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const targetUser = users.find(u => u.id === selectedUserId) || users[0];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setRegSuccessNotice('');
    setIsLoading(true);

    try {
      const success = await login(selectedUserId, password);
      if (success) {
        onLoginSuccess?.();
      } else {
        setLoginError('Kata sandi salah atau akun belum diaktifkan! Verifikasi PBKDF2 gagal.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Terjadi kesalahan otentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (userId: string) => {
    setLoginError('');
    setRegSuccessNotice('');
    const u = users.find(x => x.id === userId);
    const demoPass = u?.isMasterAdmin ? 'FieldOpsMaster2026!' : 'FieldOps2026!';
    const success = await login(userId, demoPass);
    if (success) {
      onLoginSuccess?.();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.name.trim() || !regData.email.trim()) return;

    setIsLoading(true);
    setLoginError('');
    await addUser({
      name: regData.name,
      email: regData.email,
      role: regData.role,
      department: regData.department || 'Divisi IT Support',
      password: regData.password || 'FieldOps2026!'
    });

    setIsLoading(false);
    setIsRegistering(false);
    setRegSuccessNotice(`Pendaftaran akun "${regData.name}" berhasil dikirim! Status akun: MENUNGGU PERSETUJUAN Master Admin. Silakan hubungi Master Admin untuk mengaktifkan akun Anda.`);
  };

  const handleCreateWorkspaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbName.trim()) return;

    addWorkspace({
      name: dbName,
      companyName: companyName || 'PT Perusahaan Mandiri',
      description: `Database terisolasi untuk ${dbName}`
    });

    setIsCreatingDb(false);
    setDbName('');
    setCompanyName('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
      
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Banner Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-900 font-black text-xl flex items-center justify-center shadow-lg font-display shrink-0">
              FO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display tracking-tight text-white">
                  FieldOps IT
                </h1>
                <span className="font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Sistem Inventarisasi & Integrasi Tiket Lapangan
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SHA-256 Web Crypto</span>
            </span>
          </div>
        </div>

        {/* Database Workspace Switcher Bar */}
        <div className="bg-slate-100/80 dark:bg-slate-900/80 px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Database Workspace:</span>
            <select
              value={currentWorkspaceId}
              onChange={(e) => switchWorkspace(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold px-2.5 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.companyName})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsCreatingDb(!isCreatingDb)}
            className="text-blue-700 dark:text-blue-400 hover:text-blue-900 font-bold flex items-center gap-1 text-[11px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Buat Database Baru</span>
          </button>
        </div>

        {/* Modal/Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Create New Database Form (If Active) */}
          {isCreatingDb && (
            <form onSubmit={handleCreateWorkspaceSubmit} className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
              <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Buat Database Workspace Terisolasi Baru</span>
              </div>
              <p className="text-[11px] text-blue-800 dark:text-blue-300/80">
                Setiap database terisolasi untuk cabang/perusahaan yang berbeda sehingga dapat digunakan oleh tim tanpa mencampur data inventori.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Database / Cabang *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Gudang Cabang Surabaya"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Perusahaan / Organisasi</label>
                  <input
                    type="text"
                    placeholder="Contoh: PT Sinergi IT Utama"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingDb(false)}
                  className="px-3 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aktifkan Database Baru</span>
                </button>
              </div>
            </form>
          )}

          {/* Quick Instant Demo Login Cards */}
          {!isRegistering && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Akses Cepat Demo Profile (1-Klik Masuk)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {users.slice(0, 3).map((u) => {
                  const RoleIcon = u.role === 'technician' ? Wrench : u.role === 'admin' ? Warehouse : Eye;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickDemoLogin(u.id)}
                      className="p-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white ${
                          u.role === 'technician' ? 'bg-blue-600' : u.role === 'admin' ? 'bg-emerald-600' : 'bg-purple-600'
                        }`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white flex items-center gap-0.5">
                          Masuk <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{u.roleLabel}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Switch: Login vs Register */}
          {isRegistering ? (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Form Registrasi Pengguna Baru</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold"
                >
                  Sudah Punya Akun? Login
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ahmad Alfath"
                    value={regData.name}
                    onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email / NIP *</label>
                  <input
                    type="email"
                    required
                    placeholder="ahmad@fieldops.co.id"
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Peran & Wewenang (Role) *</label>
                  <select
                    value={regData.role}
                    onChange={(e) => setRegData({ ...regData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="technician">Teknisi IT Lapangan (Pemakaian & Tiket)</option>
                    <option value="admin">Admin Gudang & PO (Master Stok & PO)</option>
                    <option value="supervisor">Supervisor IT (Otorisasi & Audit Log)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Departemen / Cabang</label>
                  <input
                    type="text"
                    placeholder="Divisi IT Infrastructure"
                    value={regData.department}
                    onChange={(e) => setRegData({ ...regData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kata Sandi (Salted SHA-256 Encrypted)</label>
                  <input
                    type="password"
                    placeholder="Masukkan password akun baru..."
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                    Password dienkripsi dengan 256-bit salt per pengguna menggunakan Web Crypto API.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold"
                >
                  Kembali ke Login
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Daftarkan & Masuk Aplikasi</span>
                </button>
              </div>
            </form>
          ) : (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>Masuk Akun Pengguna</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-bold"
                >
                  + Buat Akun Baru
                </button>
              </div>

              {regSuccessNotice && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{regSuccessNotice}</span>
                </div>
              )}

              {loginError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl font-medium">
                  {loginError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Akun Pengguna *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.roleLabel} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Kata Sandi *
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      PBKDF2-SHA256
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      placeholder="Masukkan kata sandi akun..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Demo Teknisi/Admin: <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.2 rounded font-mono text-slate-700 dark:text-slate-300">FieldOps2026!</code></span>
                    <span>Master: <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.2 rounded font-mono text-slate-700 dark:text-slate-300">FieldOpsMaster2026!</code></span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Enkripsi PBKDF2 (100k Iterasi)
                </span>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2"
                >
                  <span>{isLoading ? 'Memproses...' : 'Masuk ke Aplikasi'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-slate-900/60 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>FieldOps IT · Database Multi-Tenant Ready</span>
          <span className="font-mono">v{APP_VERSION}</span>
        </div>

      </div>
    </div>
  );
};
