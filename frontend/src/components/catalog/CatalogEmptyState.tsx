/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search } from 'lucide-react';

interface CatalogEmptyStateProps {
  onResetFilters: () => void;
}

export const CatalogEmptyState: React.FC<CatalogEmptyStateProps> = ({ onResetFilters }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <Search className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">Tidak ada barang yang cocok</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
        Coba ubah kata kunci pencarian, sesuaikan filter kategori, atau ubah status ketersediaan stok di atas.
      </p>
      <button
        onClick={onResetFilters}
        className="mt-4 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
      >
        Reset Semua Filter
      </button>
    </div>
  );
};
