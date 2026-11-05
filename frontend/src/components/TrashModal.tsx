/**
 * Kotak Sampah Modal (Soft-Deleted Inventory Management)
 * FieldOps IT - Memungkinkan pemulihan (restore) barang atau penghapusan permanen
 */

import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, RotateCcw, X, Search, AlertTriangle, PackageOpen, ShieldAlert } from 'lucide-react';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
  const { trashItems, restoreItem, permanentDeleteItem } = useInventory();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdminOrSpv = user?.role === 'admin' || user?.role === 'supervisor' || (user?.role as any) === 'superadmin';

  const filteredTrash = trashItems.filter(item => {
    const q = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.categoryName?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q)
    );
  });

  const handleRestore = async (id: string, name: string) => {
    try {
      setActionLoadingId(id);
      await restoreItem(id);
    } catch {
      // Toast already handled by context
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePermanentDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS PERMANEN "${name}"?\n\nData barang akan dimusnahkan selamanya dari database dan tidak dapat dipulihkan kembali.`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(id);
      await permanentDeleteItem(id);
    } catch {
      // Toast already handled by context
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDeletedDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Baru saja';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Kotak Sampah Inventori (Soft Delete)
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {trashItems.length} item
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Barang yang dihapus sementara dinonaktifkan dari katalog aktif dan dapat dipulihkan sewaktu-waktu.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama, SKU, atau kategori..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Riwayat mutasi transaksi tetap tersimpan utuh saat pemulihan.</span>
          </div>
        </div>

        {/* List of Trash Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredTrash.length === 0 ? (
            <div className="py-16 text-center">
              <PackageOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {trashItems.length === 0 ? 'Kotak Sampah Kosong' : 'Tidak Ada Hasil yang Cocok'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {trashItems.length === 0
                  ? 'Belum ada barang inventori yang dihapus sementara. Semua data barang aktif berada di katalog.'
                  : 'Coba ubah kata kunci pencarian Anda untuk menemukan barang yang dicari.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {filteredTrash.map((item) => {
                const isLoading = actionLoadingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                          {item.sku}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.categoryName || 'Kategori Umum'}
                        </span>
                        {item.location && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            · Rak: {item.location}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>
                          Sisa Stok Terakhir:{' '}
                          <strong className="text-slate-800 dark:text-slate-200 font-mono">
                            {item.quantity} {item.unit || 'Unit'}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Dihapus: <span className="font-medium text-slate-600 dark:text-slate-300">{formatDeletedDate(item.deleted_at)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isAdminOrSpv ? (
                        <>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleRestore(item.id, item.name)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                            title="Pulihkan barang ini kembali ke katalog aktif"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Pulihkan</span>
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handlePermanentDelete(item.id, item.name)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                            title="Hapus permanen dari database"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Hapus Permanen</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Hanya Admin/Supervisor yang dapat memulihkan
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Soft Delete melindungi barang dari ketidaksengajaan tanpa merusak integritas laporan bulanan.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium text-xs text-slate-800 dark:text-slate-200 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
