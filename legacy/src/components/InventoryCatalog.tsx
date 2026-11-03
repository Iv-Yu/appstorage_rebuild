/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem } from '../types';
import { Plus, Briefcase, RotateCcw } from 'lucide-react';
import { CatalogStatusCards } from './catalog/CatalogStatusCards';
import { CatalogToolbar } from './catalog/CatalogToolbar';
import { CatalogItemCard } from './catalog/CatalogItemCard';
import { CatalogItemRow } from './catalog/CatalogItemRow';
import { CatalogEmptyState } from './catalog/CatalogEmptyState';

interface InventoryCatalogProps {
  onOpenAddItem: () => void;
  onOpenStockIn: (item: InventoryItem) => void;
  onOpenStockOut: (item: InventoryItem) => void;
  onOpenDetail: (item: InventoryItem) => void;
  onOpenChecklist: () => void;
  onOpenRestore?: () => void;
}

export const InventoryCatalog: React.FC<InventoryCatalogProps> = ({
  onOpenAddItem,
  onOpenStockIn,
  onOpenStockOut,
  onOpenDetail,
  onOpenChecklist,
  onOpenRestore
}) => {
  const { 
    items, 
    categories, 
    currentUser, 
    searchQuery, 
    setSearchQuery, 
    selectedCategory, 
    setSelectedCategory, 
    stockFilter, 
    setStockFilter 
  } = useInventory();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter items efficiently with memoization
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter(item => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) {
        return false;
      }

      // Stock status filter
      if (stockFilter === 'IN_STOCK' && item.quantity <= item.minStockAlert) return false;
      if (stockFilter === 'LOW_STOCK' && (item.quantity <= 0 || item.quantity > item.minStockAlert)) return false;
      if (stockFilter === 'OUT_OF_STOCK' && item.quantity > 0) return false;

      // Search query filter
      if (query !== '') {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSku = item.sku.toLowerCase().includes(query);
        const matchesBarcode = item.barcode.toLowerCase().includes(query);
        const matchesLocation = item.location.toLowerCase().includes(query);
        const matchesSpecs = item.specs.toLowerCase().includes(query);
        return matchesName || matchesSku || matchesBarcode || matchesLocation || matchesSpecs;
      }

      return true;
    });
  }, [items, selectedCategory, stockFilter, searchQuery]);

  // Stock status counts memoized
  const { totalCount, inStockCount, lowStockCount, outOfStockCount } = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    items.forEach(i => {
      if (i.quantity === 0) outOfStock++;
      else if (i.quantity <= i.minStockAlert) lowStock++;
      else inStock++;
    });

    return {
      totalCount: items.length,
      inStockCount: inStock,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
    };
  }, [items]);

  const isAdminOrSpv = currentUser.role === 'admin' || currentUser.role === 'supervisor';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setStockFilter('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Field Status Briefing */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Sistem IT Lapangan</span>
              <span aria-hidden="true">·</span>
              <span>Pusat Ketersediaan Suku Cadang</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600 dark:text-slate-300">Update Real-time</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
              Katalog Inventori IT & Ketersediaan Lapangan
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              Cek kesiapan suku cadang sebelum menuju lokasi penugasan tiket. Stok otomatis berkurang saat tiket diselesaikan atau dicatat manual.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenChecklist}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Briefcase className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>Simulasi Tas Teknisi</span>
            </button>

            {isAdminOrSpv && onOpenRestore && (
              <button
                onClick={onOpenRestore}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                title="Buka Antarmuka Data Restore & Pemulihan Dokumen Firestore (.JSON)"
              >
                <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Restore Data</span>
              </button>
            )}

            {isAdminOrSpv && (
              <button
                onClick={onOpenAddItem}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Barang Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Stock Status Summary Cards */}
        <CatalogStatusCards
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          totalCount={totalCount}
          inStockCount={inStockCount}
          lowStockCount={lowStockCount}
          outOfStockCount={outOfStockCount}
        />
      </div>

      {/* Filter and Search Controls */}
      <CatalogToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        viewMode={viewMode}
        setViewMode={setViewMode}
        categories={categories}
        items={items}
      />

      {/* Item Display List */}
      {filteredItems.length === 0 ? (
        <CatalogEmptyState onResetFilters={handleResetFilters} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <CatalogItemCard
              key={item.id}
              item={item}
              isAdminOrSpv={isAdminOrSpv}
              onOpenDetail={onOpenDetail}
              onOpenStockIn={onOpenStockIn}
              onOpenStockOut={onOpenStockOut}
            />
          ))}
        </div>
      ) : (
        /* High density data table view */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                <tr>
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-4">Nama Barang & Spek</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Lokasi Rak / Bin</th>
                  <th className="py-3 px-4 text-right">Stok Fisik</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredItems.map((item) => (
                  <CatalogItemRow
                    key={item.id}
                    item={item}
                    onOpenDetail={onOpenDetail}
                    onOpenStockOut={onOpenStockOut}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
