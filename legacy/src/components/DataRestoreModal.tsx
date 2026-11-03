/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  RotateCcw, 
  X, 
  Database, 
  HardDrive, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Package, 
  Layers, 
  RefreshCw,
  FolderArchive,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  FileCheck2
} from 'lucide-react';
import { normalizeBackupCollections } from '../services/firestoreRestoreService';

interface DataRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BackupListItem {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  summary?: {
    version: string;
    system: string;
    triggeredBy: string;
    counts: {
      items: number;
      transactions: number;
      categories: number;
      trash: number;
    };
  };
}

export const DataRestoreModal: React.FC<DataRestoreModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { 
    currentUser, 
    workspaces, 
    currentWorkspaceId, 
    bulkRestoreData, 
    showToast,
    items,
    transactions,
    categories,
    trashItems,
    users
  } = useInventory();

  const [activeSourceTab, setActiveSourceTab] = useState<'STORAGE' | 'UPLOAD' | 'SNAPSHOT'>('STORAGE');
  const [backupsList, setBackupsList] = useState<BackupListItem[]>([]);
  const [storagePath, setStoragePath] = useState<string>('/backups');
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);

  // Selected backup to restore
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [selectedBackupData, setSelectedBackupData] = useState<any | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  // Restore options
  const [targetWsId, setTargetWsId] = useState<string>(currentWorkspaceId);
  const [syncToFirestore, setSyncToFirestore] = useState<boolean>(true);

  // Execution state
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [restoreStepMessage, setRestoreStepMessage] = useState<string>('');
  const [restoreCompleteResult, setRestoreCompleteResult] = useState<any | null>(null);

  // Snapshot generation
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState<boolean>(false);

  const isAuthorized = currentUser.role === 'admin' || currentUser.role === 'supervisor' || currentUser.isMasterAdmin;

  useEffect(() => {
    if (isOpen) {
      setTargetWsId(currentWorkspaceId);
      setRestoreCompleteResult(null);
      fetchBackupsList();
    }
  }, [isOpen, currentWorkspaceId]);

  const fetchBackupsList = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch('/api/backup/list');
      const data = await res.json();
      if (data.success && Array.isArray(data.backups)) {
        setBackupsList(data.backups);
        if (data.storagePath) setStoragePath(data.storagePath);
      }
    } catch (err) {
      console.error('Failed to fetch backups list:', err);
      showToast('Gagal memuat daftar backup dari backend storage.', 'error');
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSelectServerBackup = async (filename: string) => {
    setSelectedFilename(filename);
    setIsLoadingFile(true);
    try {
      const res = await fetch(`/api/backup/file/${encodeURIComponent(filename)}`);
      const result = await res.json();
      if (result.success && result.data) {
        setSelectedBackupData(result.data);
      } else {
        showToast(result.message || 'Gagal membaca isi file backup.', 'error');
        setSelectedBackupData(null);
      }
    } catch (err: any) {
      console.error('Error fetching backup file:', err);
      showToast('Gagal memuat berkas backup.', 'error');
      setSelectedBackupData(null);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showToast('Harap pilih file dengan ekstensi .json', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        setSelectedFilename(file.name);
        setSelectedBackupData(parsed);
        showToast(`File "${file.name}" berhasil dimuat!`, 'success');

        // Also offer to save it into /backups path via API
        fetch('/api/backup/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            data: parsed
          })
        }).then(res => res.json()).then(resp => {
          if (resp.success) {
            fetchBackupsList();
          }
        }).catch(() => {});

      } catch (err) {
        showToast('Format JSON pada file tidak valid.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateNewSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggeredBy: `manual-admin-${currentUser.name}`,
          clientData: {
            inventory_items: items,
            trash_items: trashItems,
            categories,
            stock_transactions: transactions,
            users,
            workspaces
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Snapshot backup baru berhasil dibuat dan disimpan di /backups!', 'success');
        await fetchBackupsList();
        if (data.snapshot?.filename) {
          handleSelectServerBackup(data.snapshot.filename);
        }
      } else {
        showToast(data.message || 'Gagal membuat snapshot cadangan.', 'error');
      }
    } catch (err: any) {
      showToast('Gagal menghubungi backend backup service.', 'error');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupData) {
      showToast('Pilih atau unggah file backup terlebih dahulu.', 'error');
      return;
    }

    setIsRestoring(true);
    setRestoreProgress(5);
    setRestoreStepMessage('Memulai verifikasi izin dan struktur cadangan...');

    try {
      const result = await bulkRestoreData(selectedBackupData, {
        targetWorkspaceId: targetWsId,
        restoreToFirestore: syncToFirestore,
        onProgress: (step, pct) => {
          setRestoreStepMessage(step);
          setRestoreProgress(pct);
        }
      });

      setRestoreCompleteResult(result);
      showToast(`Data Restore sukses! ${result.totalRestored} dokumen berhasil dipulihkan.`, 'success');
      onSuccess?.();
    } catch (err: any) {
      console.error('Restore error:', err);
      showToast(`Pemulihan gagal: ${err.message || 'Kesalahan sistem.'}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  // Normalized preview info
  const preview = selectedBackupData ? normalizeBackupCollections(selectedBackupData) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col glass rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-800/80 overflow-hidden text-slate-800 dark:text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-display">
                  Data Restore & Bulk Sync Firestore
                </h2>
                <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Storage Path: {storagePath}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih berkas cadangan JSON untuk pemulihan dokumen massal ke Cloud Firestore dan katalog inventori.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRestoring}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* Access Control Check */}
          {!isAuthorized ? (
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 space-y-3 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Hak Akses Terbatas (Otorisasi Ditolak)</h3>
                <p className="text-xs mt-1 max-w-md text-amber-700 dark:text-amber-400/90 leading-relaxed">
                  Peran akun aktif Anda adalah <strong className="font-semibold">{currentUser.roleLabel}</strong>. Operasi pemulihan basis data massal (Bulk Restore) hanya dapat dijalankan oleh akun dengan peran <strong className="font-semibold">Admin Gudang</strong> atau <strong className="font-semibold">Supervisor IT</strong>.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Silakan beralih akun melalui menu profil atas untuk menguji fitur ini.
              </div>
            </div>
          ) : restoreCompleteResult ? (
            /* Success Completion State */
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-slate-800 dark:text-slate-200 text-center flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-display">
                  Bulk Restore Berhasil Diselesaikan!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-lg">
                  Sebanyak <strong>{restoreCompleteResult.totalRestored} dokumen</strong> telah berhasil dipulihkan secara sinkron ke dalam koleksi database Cloud Firestore dan memori sistem.
                </p>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg text-xs font-mono">
                <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-emerald-500/20 text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Katalog Barang</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {restoreCompleteResult.counts?.items || 0}
                  </div>
                </div>
                <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-emerald-500/20 text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Sampah (Soft Del)</div>
                  <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                    {restoreCompleteResult.counts?.trash || 0}
                  </div>
                </div>
                <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-emerald-500/20 text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Kategori</div>
                  <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                    {restoreCompleteResult.counts?.categories || 0}
                  </div>
                </div>
                <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-emerald-500/20 text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Transaksi Mutasi</div>
                  <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {restoreCompleteResult.counts?.transactions || 0}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors shadow-sm"
                >
                  Tutup & Lihat Katalog
                </button>
                <button
                  onClick={() => {
                    setRestoreCompleteResult(null);
                    setSelectedFilename(null);
                    setSelectedBackupData(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Restore Berkas Lain
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Source Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-3 text-xs font-semibold">
                <button
                  onClick={() => setActiveSourceTab('STORAGE')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                    activeSourceTab === 'STORAGE'
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>Pilih dari Storage Path ({backupsList.length})</span>
                </button>

                <button
                  onClick={() => setActiveSourceTab('UPLOAD')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                    activeSourceTab === 'UPLOAD'
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Unggah Berkas Eksternal</span>
                </button>

                <button
                  onClick={() => setActiveSourceTab('SNAPSHOT')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                    activeSourceTab === 'SNAPSHOT'
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Buat Snapshot Baru</span>
                </button>
              </div>

              {/* Tab 1: Server Storage List */}
              {activeSourceTab === 'STORAGE' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Berkas Cadangan di Direktori Backend: <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{storagePath}</code></span>
                    </span>
                    <button
                      onClick={fetchBackupsList}
                      disabled={isLoadingList}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px] font-medium"
                      title="Perbarui daftar file backup"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {isLoadingList ? (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                      <span>Memuat daftar berkas dari storage...</span>
                    </div>
                  ) : backupsList.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                      Belum ada berkas backup di storage path <code className="font-mono">/backups</code>. Klik tab "Buat Snapshot Baru" untuk membuat cadangan pertama.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {backupsList.map((bk) => {
                        const isSelected = selectedFilename === bk.filename;
                        const dateFormatted = new Date(bk.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        });
                        const sizeKb = (bk.sizeBytes / 1024).toFixed(1);

                        return (
                          <div
                            key={bk.filename}
                            onClick={() => handleSelectServerBackup(bk.filename)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500 dark:border-emerald-500/80 shadow-xs'
                                : 'bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/80 hover:bg-white/80 dark:hover:bg-slate-900/80'
                            }`}
                          >
                            <div className="flex items-start gap-3 truncate">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}>
                                <FileCheck2 className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <div className="font-bold text-slate-900 dark:text-white font-mono truncate">
                                  {bk.filename}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{dateFormatted}</span>
                                  </span>
                                  <span>&middot;</span>
                                  <span className="font-mono">{sizeKb} KB</span>
                                  {bk.summary?.triggeredBy && (
                                    <>
                                      <span>&middot;</span>
                                      <span className="font-mono text-[10px] bg-slate-200/60 dark:bg-slate-800 px-1 rounded">
                                        {bk.summary.triggeredBy}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {bk.summary && (
                                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {bk.summary.counts.items} Item
                                  </span>
                                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {bk.summary.counts.transactions} Tx
                                  </span>
                                </div>
                              )}
                              <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {isSelected ? 'Terpilih' : 'Pilih'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Upload External File */}
              {activeSourceTab === 'UPLOAD' && (
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Pilih berkas JSON backup dari komputer Anda
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Berkas harus berupa ekspor cadangan valid dari sistem FieldOps IT.
                    </div>
                  </div>
                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">
                      <FolderArchive className="w-4 h-4" />
                      <span>Cari Berkas .JSON...</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 3: Create Snapshot */}
              {activeSourceTab === 'SNAPSHOT' && (
                <div className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Buat Cadangan Baru Sebelum Memulihkan
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Sangat disarankan membuat snapshot kondisi data terkini sebelum melakukan restore dari file lama.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateNewSnapshot}
                      disabled={isCreatingSnapshot}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                    >
                      <HardDrive className="w-4 h-4" />
                      <span>{isCreatingSnapshot ? 'Menyimpan...' : 'Cadangkan Sekarang'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs font-mono">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Stok Aktif</div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{items.length} Barang</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Item Sampah</div>
                      <div className="font-bold text-amber-600 dark:text-amber-400 text-sm">{trashItems.length} Soft Del</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Kategori</div>
                      <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">{categories.length} Kat</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Mutasi</div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{transactions.length} Tx</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview & Inspection Section (When backup is loaded) */}
              {isLoadingFile ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Membaca dan memvalidasi berkas cadangan...</span>
                </div>
              ) : preview ? (
                <div className="p-4 sm:p-5 rounded-2xl glass border border-emerald-500/40 dark:border-emerald-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                          {selectedFilename}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Versi Snapshot: <strong>v{preview.meta.version}</strong> &middot; Dibuat: {new Date(preview.meta.createdAt).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full self-start sm:self-center">
                      Valid Backup JSON
                    </span>
                  </div>

                  {/* Document Breakdown Preview */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase font-mono tracking-wider block mb-2">
                      Rincian Dokumen yang Akan Dipulihkan:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                      <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Suku Cadang</span>
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{preview.items.length}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">item aktif</span>
                      </div>
                      <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Sampah (Trash)</span>
                        <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{preview.trashItems.length}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">soft delete</span>
                      </div>
                      <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Kategori</span>
                        <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{preview.categories.length}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">kelompok</span>
                      </div>
                      <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Log Mutasi</span>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">{preview.transactions.length}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">transaksi</span>
                      </div>
                    </div>
                  </div>

                  {/* Restore Target Workspace & Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Workspace Database Target:
                      </label>
                      <select
                        value={targetWsId}
                        onChange={(e) => setTargetWsId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl text-xs py-2 px-3 focus:ring-1 focus:ring-emerald-500 outline-hidden font-medium"
                      >
                        {workspaces.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.companyName})
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                        Dokumen akan disinkronkan ke path <code className="font-mono">workspaces/{targetWsId}/**</code>
                      </span>
                    </div>

                    <div className="flex flex-col justify-center space-y-2 pt-2 sm:pt-0">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncToFirestore}
                          onChange={(e) => setSyncToFirestore(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
                        />
                        <span>Sinkronisasi Massal ke Cloud Firestore</span>
                      </label>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                        Mengunggah dokumen ke koleksi Firestore secara batch (350 dokumen per commit) dengan autentikasi aman.
                      </p>
                    </div>
                  </div>

                  {/* Warning Note */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Konfirmasi Eksekusi:</span> Dokumen dari berkas backup akan menimpa/memperbarui data pada workspace target yang dipilih. Pastikan Anda telah membuat snapshot cadangan jika diperlukan.
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Progress Display during execution */}
              {isRestoring && (
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>{restoreStepMessage}</span>
                    </span>
                    <span className="font-bold">{restoreProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-2 transition-all duration-300 rounded-full"
                      style={{ width: `${restoreProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>FieldOps IT &middot; Standard Security ABAC (SEC-01 & SEC-02)</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isRestoring}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              {restoreCompleteResult ? 'Selesai' : 'Batal'}
            </button>

            {isAuthorized && !restoreCompleteResult && (
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={!selectedBackupData || isRestoring}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Memulihkan Data...' : 'Jalankan Bulk Restore'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
