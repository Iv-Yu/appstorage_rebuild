/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StockStatus } from '../../types';

interface CatalogStatusCardsProps {
  stockFilter: 'ALL' | StockStatus;
  setStockFilter: (filter: 'ALL' | StockStatus) => void;
  totalCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export const CatalogStatusCards: React.FC<CatalogStatusCardsProps> = ({
  stockFilter,
  setStockFilter,
  totalCount,
  inStockCount,
  lowStockCount,
  outOfStockCount,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-700/60">
      <button
        onClick={() => setStockFilter('ALL')}
        className={`text-left p-3.5 rounded-xl border transition-all ${
          stockFilter === 'ALL' 
            ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900 dark:border-slate-600 shadow-xs font-semibold' 
            : 'bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <div className="text-xs font-medium opacity-80">Total Jenis Barang</div>
        <div className="text-2xl font-bold font-mono tabular-nums mt-1">{totalCount}</div>
        <div className="text-[11px] opacity-70 mt-0.5">Semua katalog aktif</div>
      </button>

      <button
        onClick={() => setStockFilter('IN_STOCK')}
        className={`text-left p-3.5 rounded-xl border transition-all ${
          stockFilter === 'IN_STOCK' 
            ? 'bg-emerald-900 dark:bg-emerald-700 text-white border-emerald-900 dark:border-emerald-600 shadow-sm' 
            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50'
        }`}
      >
        <div className={`text-xs font-semibold ${stockFilter === 'IN_STOCK' ? 'text-emerald-200' : 'text-emerald-800 dark:text-emerald-300'}`}>
          Stok Aman / Tersedia
        </div>
        <div className={`text-2xl font-bold font-mono tabular-nums mt-1 ${stockFilter === 'IN_STOCK' ? 'text-white' : 'text-emerald-900 dark:text-emerald-200'}`}>
          {inStockCount}
        </div>
        <div className={`text-[11px] mt-0.5 ${stockFilter === 'IN_STOCK' ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-400 font-medium'}`}>
          Siap digunakan teknisi
        </div>
      </button>

      <button
        onClick={() => setStockFilter('LOW_STOCK')}
        className={`text-left p-3.5 rounded-xl border transition-all ${
          stockFilter === 'LOW_STOCK' 
            ? 'bg-amber-800 dark:bg-amber-700 text-white border-amber-800 dark:border-amber-600 shadow-sm' 
            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 hover:bg-amber-100/70 dark:hover:bg-amber-900/50'
        }`}
      >
        <div className={`text-xs font-semibold ${stockFilter === 'LOW_STOCK' ? 'text-amber-200' : 'text-amber-800 dark:text-amber-300'}`}>
          Stok Menipis
        </div>
        <div className={`text-2xl font-bold font-mono tabular-nums mt-1 ${stockFilter === 'LOW_STOCK' ? 'text-white' : 'text-amber-950 dark:text-amber-200'}`}>
          {lowStockCount}
        </div>
        <div className={`text-[11px] mt-0.5 ${stockFilter === 'LOW_STOCK' ? 'text-amber-300' : 'text-amber-800 dark:text-amber-400 font-medium'}`}>
          Di bawah batas minimum
        </div>
      </button>

      <button
        onClick={() => setStockFilter('OUT_OF_STOCK')}
        className={`text-left p-3.5 rounded-xl border transition-all ${
          stockFilter === 'OUT_OF_STOCK' 
            ? 'bg-rose-900 dark:bg-rose-700 text-white border-rose-900 dark:border-rose-600 shadow-sm' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800/80 hover:bg-rose-100/70 dark:hover:bg-rose-900/50'
        }`}
      >
        <div className={`text-xs font-semibold ${stockFilter === 'OUT_OF_STOCK' ? 'text-rose-200' : 'text-rose-800 dark:text-rose-300'}`}>
          Stok Habis (Kosong)
        </div>
        <div className={`text-2xl font-bold font-mono tabular-nums mt-1 ${stockFilter === 'OUT_OF_STOCK' ? 'text-white' : 'text-rose-950 dark:text-rose-200'}`}>
          {outOfStockCount}
        </div>
        <div className={`text-[11px] mt-0.5 ${stockFilter === 'OUT_OF_STOCK' ? 'text-rose-300' : 'text-rose-800 dark:text-rose-400 font-medium'}`}>
          Perlu PO segera
        </div>
      </button>
    </div>
  );
};
