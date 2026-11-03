/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { UserRole } from '../types/inventory';
import { X, ShieldCheck, UserCheck, Wrench, Warehouse, Eye, UserPlus, Lock, KeyRound, Building, Mail, CheckCircle2, EyeOff, Clock, Check, ShieldAlert } from 'lucide-react';

interface UserRoleSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserRoleSwitcher: React.FC<UserRoleSwitcherProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, users, switchUser, addUser, approveUser, rejectUser, masterAccount, setupMasterAccount, VERSION } = useInventory();
  
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isMasterSetupOpen, setIsMasterSetupOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [assignedRoles, setAssignedRoles] = useState<Record<string, UserRole>>({});

  const [masterForm, setMasterForm] = useState({
    name: masterAccount?.name || 'Ahmad Alfath (Master Admin)',
    email: masterAccount?.email || 'master@fieldops.co.id',
    password: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'technician' as UserRole,
    department: '',
    phone: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const pendingUsers = users.filter(u => u.status === 'PENDING_APPROVAL');
  const activeUsers = users.filter(u => u.status === 'ACTIVE');

  const handleSubmitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setIsSubmitting(true);
    await addUser({
      name: formData.name,
      email: formData.email,
      role: formData.role,
      department: formData.department || 'Divisi IT Support',
      phone: formData.phone || '0812-9000-8888',
      password: formData.password || 'FieldOps2026!'
    });

    setIsSubmitting(false);
    setIsAddingUser(false);
    setFormData({
      name: '',
      email: '',
      role: 'technician',
      department: '',
      phone: '',
      password: ''
    });
  };

  const handleMasterSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterForm.name.trim() || !masterForm.email.trim()) return;

    setIsSubmitting(true);
    await setupMasterAccount(masterForm.name, masterForm.email, masterForm.password || 'FieldOpsMaster2026!');
    setIsSubmitting(false);
    setIsMasterSetupOpen(false);
    setMasterForm({ ...masterForm, password: '' });
  };

  const handleApprove = (userId: string, defaultRole: UserRole) => {
    const roleToAssign = assignedRoles[userId] || defaultRole || 'technician';
    approveUser(userId, roleToAssign);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  Kelola Akun Pengguna & Master Control (RBAC)
                </h2>
                <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                  v{VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1 Single Master Admin Account & Persetujuan Pendaftaran Akun
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="p-5 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          
          {/* Dedicated Single Master Account Setup Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Akun Master Utama (Tunggal / Single Master)</span>
                <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded font-bold">
                  Akun Tertinggi
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Hanya ada 1 Master Admin di aplikasi yang berhak menyetujui pendaftaran & menetapkan hak akses role.
              </p>
            </div>

            {currentUser.isMasterAdmin && currentUser.status === 'ACTIVE' ? (
              <button
                onClick={() => setIsMasterSetupOpen(!isMasterSetupOpen)}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors shadow-xs"
              >
                {isMasterSetupOpen ? 'Batal Setup' : '⚙️ Setup Master Account'}
              </button>
            ) : (
              <div className="text-[11px] text-amber-300/80 font-mono bg-white/5 border border-amber-400/20 px-2.5 py-1 rounded-lg">
                Hanya Master Admin Aktif
              </div>
            )}
          </div>

          {/* Master Account Setup Form (If Open) */}
          {isMasterSetupOpen && (
            <form onSubmit={handleMasterSetupSubmit} className="bg-slate-800 text-white rounded-xl p-4 space-y-3 border border-slate-700 animate-in fade-in duration-150">
              <div className="font-bold text-xs text-amber-300 flex items-center gap-2 pb-2 border-b border-slate-700">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Atur Nama, Email, & Password Master Account Utama</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Nama Master Admin *</label>
                  <input
                    type="text"
                    required
                    value={masterForm.name}
                    onChange={(e) => setMasterForm({ ...masterForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-400 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Email Master Admin *</label>
                  <input
                    type="email"
                    required
                    value={masterForm.email}
                    onChange={(e) => setMasterForm({ ...masterForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-400 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Kata Sandi Baru Master Admin</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={masterForm.password}
                      onChange={(e) => setMasterForm({ ...masterForm, password: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono focus:ring-1 focus:ring-amber-400 outline-hidden pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMasterSetupOpen(false)}
                  className="px-3 py-1 text-xs text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Kredensial Master</span>
                </button>
              </div>
            </form>
          )}
          
          {/* Master Admin Approval Panel (If there are pending accounts) */}
          {pendingUsers.length > 0 && (
            <div className="bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 font-bold text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                  <span>Permintaan Pendaftaran Akun Baru ({pendingUsers.length} Menunggu Persetujuan Master Admin)</span>
                </div>
                <span className="text-[10px] font-mono bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded font-bold">
                  Persetujuan Master
                </span>
              </div>

              <div className="space-y-2.5">
                {pendingUsers.map((pUser) => {
                  const currentSelectedRole = assignedRoles[pUser.id] || pUser.role || 'technician';

                  return (
                    <div key={pUser.id} className="bg-white dark:bg-slate-800 border border-amber-200/60 dark:border-amber-800/60 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                          <span>{pUser.name}</span>
                          <span className="text-[10px] font-mono bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded">
                            Pending
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{pUser.email}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{pUser.department}</div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                        <div>
                          <label className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block mb-0.5">Tetapkan Role:</label>
                          <select
                            value={currentSelectedRole}
                            onChange={(e) => setAssignedRoles({ ...assignedRoles, [pUser.id]: e.target.value as UserRole })}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-md py-1 px-2 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="technician">Teknisi IT Lapangan</option>
                            <option value="admin">Admin Gudang & PO</option>
                            <option value="supervisor">Supervisor IT</option>
                          </select>
                        </div>

                        {currentUser.isMasterAdmin && currentUser.status === 'ACTIVE' ? (
                          <div className="flex items-center gap-1.5 pt-3 sm:pt-0">
                            <button
                              onClick={() => handleApprove(pUser.id, pUser.role)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors"
                              title="Setujui dan Aktifkan Akun"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Setujui</span>
                            </button>
                            <button
                              onClick={() => rejectUser(pUser.id)}
                              className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors"
                              title="Tolak Pendaftaran Akun"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold bg-amber-100/90 dark:bg-amber-900/60 px-2 py-1 rounded">
                            Menunggu Otorisasi Master Admin
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Daftar Akun Pengguna Aktif ({activeUsers.length})</span>
            </div>
            
            <button
              onClick={() => setIsAddingUser(!isAddingUser)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingUser ? 'Batal Tambah' : '+ Buat Akun Pengguna Baru'}</span>
            </button>
          </div>

          {/* Form Create New User Account (If Active) */}
          {isAddingUser && (
            <form onSubmit={handleSubmitNewUser} className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Form Pendaftaran Akun Pengguna Baru</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300 font-bold px-2 py-0.5 rounded">
                  {currentUser.isMasterAdmin ? 'Otomatis Aktif (Master)' : 'Perlu Persetujuan Master'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alamat Email / Username *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="nama@fieldops.co.id"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Usulan Peran & Hak Akses (Role) *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                  >
                    <option value="technician">Teknisi IT Lapangan (Pemakaian & Tiket)</option>
                    <option value="admin">Admin Gudang & PO (Master Stok & PO)</option>
                    <option value="supervisor">Supervisor IT (Otorisasi & Full Audit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Departemen / Cabang
                  </label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Divisi IT Infrastructure"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi Akun
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kirim Pendaftaran</span>
                </button>
              </div>
            </form>
          )}

          {/* User Card Choices */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeUsers.map((u) => {
              const isCurrent = u.id === currentUser.id;
              const RoleIcon = u.role === 'technician' ? Wrench : u.role === 'admin' ? Warehouse : Eye;

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-xl border transition-all relative ${
                    isCurrent
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}>
                      <RoleIcon className="w-4 h-4" />
                    </div>
                    {isCurrent && (
                      <span className="font-mono text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded">
                        AKTIF
                      </span>
                    )}
                  </div>

                  <h3 className={`font-bold text-sm flex items-center gap-1.5 ${isCurrent ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    <span>{u.name}</span>
                    {u.isMasterAdmin && (
                      <span className="text-[9px] font-mono font-bold bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded">
                        Master
                      </span>
                    )}
                  </h3>
                  <div className={`text-[11px] font-medium mt-0.5 ${isCurrent ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                    {u.roleLabel}
                  </div>
                  <div className={`text-[10px] mt-2 pt-2 border-t font-mono truncate ${isCurrent ? 'border-white/20 text-white/70' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                    {u.email}
                  </div>
                  <div className={`text-[9px] mt-1 font-mono flex items-center gap-1 ${isCurrent ? 'text-emerald-300' : 'text-slate-400'}`}>
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>Terverifikasi Sistem</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Permissions Matrix */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 text-xs">
              Matriks Wewenang & Hak Akses Fitur
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Fitur / Tindakan</th>
                    <th className="py-2.5 px-3 text-center">Teknisi Lapangan</th>
                    <th className="py-2.5 px-3 text-center">Admin Inventori</th>
                    <th className="py-2.5 px-3 text-center">Supervisor IT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800/60">
                  <tr>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Cek Ketersediaan Stok Real-time</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Keluarkan Suku Cadang untuk Tiket</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Tas Kerja & Ceklist Lapangan</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                    <td className="py-2 px-3 text-center text-slate-400">✓ Bisa</td>
                    <td className="py-2 px-3 text-center text-slate-400">✓ Bisa</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Input Barang Masuk (Restock / PO)</td>
                    <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500">- Terbatas</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Tambah / Edit Master Barang & Kategori</td>
                    <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500">- Terbatas</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Penuh</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Unduh & Cetak Laporan Stok Mingguan</td>
                    <td className="py-2 px-3 text-center text-slate-400">✓ Lihat</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Export CSV</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Otorisasi & Cetak</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Kelola API Keys & Integrasi Eksternal</td>
                    <td className="py-2 px-3 text-center text-slate-400">✓ Simulasi Saja</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Buat & Cabut</td>
                    <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓ Audit Log</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
            <span>Profil saat ini: <strong className="text-slate-900 dark:text-slate-100">{currentUser.name}</strong> ({currentUser.roleLabel})</span>
            <span>·</span>
            <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">v{VERSION}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 rounded-lg shadow-xs"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
