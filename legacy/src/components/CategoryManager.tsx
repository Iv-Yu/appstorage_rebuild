/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Category } from '../types/inventory';
import { Boxes, Plus, Edit2, Trash2, MapPin, Package, Check, X } from 'lucide-react';

export const CategoryManager: React.FC = () => {
  const { categories, items, addCategory, updateCategory, deleteCategory, currentUser } = useInventory();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const isAdminOrSpv = currentUser.role === 'admin' || currentUser.role === 'supervisor';

  const handleStartAdd = () => {
    setName('');
    setCode('');
    setDescription('');
    setEditingId(null);
    setIsAdding(true);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setCode(cat.code);
    setDescription(cat.description);
    setIsAdding(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    if (editingId) {
      updateCategory(editingId, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
      });
      setEditingId(null);
    } else {
      addCategory({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
      });
      setIsAdding(false);
    }
  };

  // Group items by location for technicians
  const locationsMap = React.useMemo(() => {
    const locs: Record<string, number> = {};
    items.forEach(it => {
      const loc = it.location || 'Belum ditentukan';
      locs[loc] = (locs[loc] || 0) + 1;
    });
    return Object.entries(locs).sort((a, b) => b[1] - a[1]);
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Pengelompokan Jenis Barang</span>
              <span aria-hidden="true">·</span>
              <span>Kategori & Lokasi Fisik Rak</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600 dark:text-slate-300">Standardisasi Klasifikasi IT</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
              Kategori Barang & Denah Lokasi Rak Suku Cadang
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              Pengelompokan barang membantu teknisi lapangan mencari suku cadang dengan cepat berdasarkan jenis perangkat dan lokasi penyimpanan fisik rak/kotak kerja.
            </p>
          </div>

          {isAdminOrSpv && (
            <button
              onClick={handleStartAdd}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap self-start md:self-auto shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kategori Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Form Modal/Card */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 p-5 shadow-sm space-y-4 text-xs animate-in fade-in transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {editingId ? 'Edit Kategori Barang' : 'Buat Kategori Barang Baru'}
            </h3>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Kategori <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Fiber Optik & FTTH"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Kode Awalan SKU (3-4 Huruf) <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                maxLength={5}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: FO"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi & Ruang Lingkup</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Patchcord SC-LC, dropcore, SFP modul"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700 rounded-md font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-md font-semibold"
            >
              Simpan Kategori
            </button>
          </div>
        </form>
      )}

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const categoryItems = items.filter(it => it.categoryId === cat.id);
          const totalStock = categoryItems.reduce((acc, cur) => acc + cur.quantity, 0);

          return (
            <div
              key={cat.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-colors"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                    Prefix: {cat.code}
                  </span>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {categoryItems.length} jenis SKU
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                  {cat.description || 'Tidak ada deskripsi.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total Kuantitas Fisik:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm tabular-nums">
                    {totalStock} item
                  </span>
                </div>
              </div>

              {isAdminOrSpv && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2 text-xs">
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Edit Kategori"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                    title="Hapus Kategori"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Physical Storage & Bin Locations Directory */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-3 transition-colors">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Peta Lokasi Fisik Rak & Kendaraan Operasional Lapangan</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftar rak penyimpanan di gudang IT pusat dan unit kendaraan teknisi untuk memudahkan penjemputan barang sebelum bertugas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {locationsMap.map(([loc, count], i) => (
            <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white truncate" title={loc}>
                {loc}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                <span>Ditempati:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{count} jenis suku cadang</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
