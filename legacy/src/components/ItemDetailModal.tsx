/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem } from '../types/inventory';
import { 
  X, 
  MapPin, 
  Barcode, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Edit, 
  Trash2,
  FileText
} from 'lucide-react';

interface ItemDetailModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenStockOut: (item: InventoryItem) => void;
  onOpenStockIn: (item: InventoryItem) => void;
  onOpenEdit: (item: InventoryItem) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onOpenStockOut,
  onOpenStockIn,
  onOpenEdit
}) => {
  const { transactions, deleteItem, currentUser } = useInventory();

  if (!isOpen || !item) return null;

  // Recent transactions for this specific item
  const itemTransactions = transactions.filter(t => t.itemId === item.id).slice(0, 5);

  const isOutOfStock = item.quantity === 0;
  const isLowStock = item.quantity <= item.minStockAlert;
  const isAdminOrSpv = currentUser.role === 'admin' || currentUser.role === 'supervisor';

  const handleDelete = () => {
    if (confirm(`Yakin ingin menghapus ${item.name} dari sistem inventori?`)) {
      deleteItem(item.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{item.categoryName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{item.sku}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
              {item.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Stock Availability Card */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isOutOfStock 
              ? 'bg-red-50/70 dark:bg-rose-950/40 border-red-200 dark:border-rose-800 text-red-900 dark:text-rose-300' 
              : isLowStock 
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300' 
              : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
          }`}>
            <div>
              <span className="text-[11px] font-medium opacity-80 uppercase tracking-wider">
                Status Ketersediaan Fisik
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold font-mono tabular-nums">
                  {item.quantity}
                </span>
                <span className="text-sm font-semibold lowercase">{item.unit}</span>
                <span className="text-xs font-bold ml-2">
                  ({isOutOfStock ? 'HABIS' : isLowStock ? 'MENIPIS' : 'AMAN TERSEDIA'})
                </span>
              </div>
              <p className="text-[11px] mt-1 opacity-80">
                Batas Minimum Peringatan: {item.minStockAlert} {item.unit}
              </p>
            </div>

            <div className="text-right">
              <button
                onClick={() => {
                  onClose();
                  onOpenStockOut(item);
                }}
                disabled={isOutOfStock}
                className={`py-2 px-3 rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-xs ${
                  isOutOfStock
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white hover:bg-slate-800'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Pakai untuk Tiket</span>
              </button>
            </div>
          </div>

          {/* Location and Barcode Box */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Lokasi Rak / Bin:
              </span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {item.location}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5" /> Barcode Scanner ID:
              </span>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                {item.barcode}
              </div>
            </div>
          </div>

          {/* Technical Specs */}
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Spesifikasi Teknis & Keterangan Lapangan:
            </span>
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {item.specs}
            </div>
          </div>

          {/* Item Notes */}
          {item.notes && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Catatan Khusus:</span>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/60 text-slate-600 dark:text-slate-400">
                {item.notes}
              </div>
            </div>
          )}

          {/* Recent Item Movements (Audit Trail for this specific sparepart) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Riwayat 5 Pemakaian / Mutasi Terakhir Suku Cadang Ini:</span>
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                {itemTransactions.length} tercatat
              </span>
            </div>

            {itemTransactions.length === 0 ? (
              <div className="p-4 text-center bg-slate-50 dark:bg-slate-900/60 rounded-lg text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700/60">
                Belum ada transaksi mutasi untuk barang ini.
              </div>
            ) : (
              <div className="space-y-1.5">
                {itemTransactions.map((tx) => (
                  <div key={tx.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${tx.type === 'IN' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                          {tx.type === 'IN' ? '+ ' : '- '}{tx.quantity} {tx.unit}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{tx.referenceNumber}</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {tx.recipientOrDestination} · Teknisi: {tx.performedBy}
                      </div>
                    </div>
                    <div className="text-right text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                      {new Date(tx.date).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAdminOrSpv && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onOpenEdit(item);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Data</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-xs text-red-600 dark:text-rose-400 hover:text-red-700 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-red-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdminOrSpv && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStockIn(item);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 rounded-lg transition-colors"
              >
                + Tambah Stok Masuk
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
