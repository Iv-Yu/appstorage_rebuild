/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import { InventoryItem } from '../../types';
import { 
  MapPin, 
  Barcode, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  XCircle 
} from 'lucide-react';

interface CatalogItemCardProps {
  item: InventoryItem;
  isAdminOrSpv: boolean;
  onOpenDetail: (item: InventoryItem) => void;
  onOpenStockIn: (item: InventoryItem) => void;
  onOpenStockOut: (item: InventoryItem) => void;
}

export const CatalogItemCard: React.FC<CatalogItemCardProps> = memo(({
  item,
  isAdminOrSpv,
  onOpenDetail,
  onOpenStockIn,
  onOpenStockOut,
}) => {
  const getStatus = () => {
    if (item.quantity === 0) {
      return {
        label: 'HABIS',
        textColor: 'text-red-700 dark:text-rose-400',
        icon: XCircle,
      };
    }
    if (item.quantity <= item.minStockAlert) {
      return {
        label: 'MENIPIS',
        textColor: 'text-amber-700 dark:text-amber-400',
        icon: AlertCircle,
      };
    }
    return {
      label: 'TERSEDIA',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      icon: CheckCircle2,
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-2xs hover:shadow-xs group">
      <div>
        {/* Top line metadata: Category & SKU */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 mb-2">
          <span className="truncate">{item.categoryName}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-slate-600 dark:text-slate-300 tracking-wider shrink-0 font-medium">{item.sku}</span>
        </div>

        {/* Item Name */}
        <h3 
          onClick={() => onOpenDetail(item)}
          className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-emerald-400 cursor-pointer transition-colors line-clamp-2"
          title={item.name}
        >
          {item.name}
        </h3>

        {/* Specs & description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 font-normal">
          {item.specs}
        </p>

        {/* Storage Location & Barcode */}
        <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{item.location}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <Barcode className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              {item.barcode}
            </span>
            <span>Min Alert: {item.minStockAlert} {item.unit}</span>
          </div>
        </div>
      </div>

      {/* Stock status indicator & actions */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Ketersediaan Stok</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-2xl font-bold font-mono tabular-nums ${
                item.quantity === 0 ? 'text-red-600 dark:text-rose-400' : item.quantity <= item.minStockAlert ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
              }`}>
                {item.quantity}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium lowercase">{item.unit}</span>
            </div>
          </div>

          <div className={`text-right text-xs font-semibold flex items-center gap-1 ${status.textColor}`}>
            <StatusIcon className="w-4 h-4" />
            <span>{status.label}</span>
          </div>
        </div>

        {/* Technician action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenStockOut(item)}
            disabled={item.quantity === 0}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              item.quantity === 0
                ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white hover:bg-slate-800'
            }`}
            title={item.quantity === 0 ? 'Stok habis, tidak bisa diambil' : 'Ambil barang untuk pekerjaan/tiket lapangan'}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Pakai untuk Tiket</span>
          </button>

          <button
            onClick={() => onOpenDetail(item)}
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            title="Lihat detail spesifikasi dan riwayat mutasi"
          >
            Detail
          </button>

          {isAdminOrSpv && (
            <button
              onClick={() => onOpenStockIn(item)}
              className="px-2.5 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
              title="Tambah stok masuk (Restock)"
            >
              + In
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
