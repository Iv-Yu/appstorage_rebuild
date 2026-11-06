/**
 * Box Manager Modal (FieldOps Inventory v2 - Tahap 3)
 * Pengelolaan Lokasi Storage Box Gudang
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box as BoxIcon,
  Plus,
  X,
  Search,
  QrCode,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { stockApi, Box } from '../../services/stockApi';
import { useInventory } from '../../context/InventoryContext';

interface BoxManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBox?: (box: Box) => void;
}

export const BoxManagerModal: React.FC<BoxManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectBox
}) => {
  const { showToast } = useInventory();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form Buat Box
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newKode, setNewKode] = useState<string>('');
  const [newKeterangan, setNewKeterangan] = useState<string>('');

  const loadBoxes = useCallback(async () => {
    try {
      setLoading(true);
      const list = await stockApi.listBoxes();
      setBoxes(list);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      loadBoxes();
    }
  }, [isOpen, loadBoxes]);

  if (!isOpen) return null;

  const handleCreateBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim()) {
      showToast('Kode Box wajib diisi.', 'warning');
      return;
    }

    try {
      const created = await stockApi.createBox(newKode.trim(), newKeterangan.trim() || undefined);
      showToast(`Box "${created.kode}" berhasil dibuat.`, 'success');
      setIsAdding(false);
      setNewKode('');
      setNewKeterangan('');
      await loadBoxes();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredBoxes = boxes.filter(b => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return b.kode.toLowerCase().includes(q) || (b.keterangan || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <BoxIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Daftar Lokasi Storage Box
              </h3>
              <p className="text-xs text-slate-500">
                Setiap box dapat menyimpan produk campuran dengan label QR unik
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode box atau lokasi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 font-bold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Tutup Form' : 'Tambah Box'}</span>
          </button>
        </div>

        {/* Form Tambah Box */}
        {isAdding && (
          <form onSubmit={handleCreateBox} className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3 text-xs animate-in fade-in">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              Buat Lokasi Box Baru:
            </span>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Kode Box * (Contoh: BOX-A-01, BIN-22)</label>
              <input
                type="text"
                required
                placeholder="Misal: BOX-C-01"
                value={newKode}
                onChange={e => setNewKode(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Keterangan Lokasi Rak / Posisi</label>
              <input
                type="text"
                placeholder="Misal: Rak C Level 2 Sektor Barat"
                value={newKeterangan}
                onChange={e => setNewKeterangan(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-bold text-white bg-emerald-600 rounded-lg"
              >
                Simpan Box
              </button>
            </div>
          </form>
        )}

        {/* List Box Cards */}
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
            <span>Memuat lokasi storage box...</span>
          </div>
        ) : filteredBoxes.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed rounded-lg">
            Tidak ada lokasi box ditemukan.
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            {filteredBoxes.map(b => (
              <div
                key={b.id}
                className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between hover:border-emerald-500 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200 rounded-md">
                    {b.kode}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {b.keterangan || 'Storage Box General'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Kapasitas Terisi: <strong>{b.total_item || 0} unit</strong>
                    </span>
                  </div>
                </div>

                {onSelectBox && (
                  <button
                    onClick={() => {
                      onSelectBox(b);
                      onClose();
                    }}
                    className="px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 rounded-lg"
                  >
                    Pilih Box Ini
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
