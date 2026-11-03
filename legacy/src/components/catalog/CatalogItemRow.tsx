/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import { InventoryItem } from '../../types';
import { MapPin } from 'lucide-react';

interface CatalogItemRowProps {
  item: InventoryItem;
  onOpenDetail: (item: InventoryItem) => void;
  onOpenStockOut: (item: InventoryItem) => void;
}

export const CatalogItemRow: React.FC<CatalogItemRowProps> = memo(({
  item,
  onOpenDetail,
  onOpenStockOut,
}) => {
  const getStatusColor = () => {
    if (item.quantity === 0) return 'text-red-700 dark:text-rose-400';
    if (item.quantity <= item.minStockAlert) return 'text-amber-700 dark:text-amber-400';
    return 'text-emerald-700 dark:text-emerald-400';
  };

  const getStatusText = () => {
    if (item.quantity === 0) return 'HABIS';
    if (item.quantity <= item.minStockAlert) return 'MENIPIS';
    return 'TERSEDIA';
  };

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
      <td className="py-3 px-4">
        <div className="font-mono font-medium text-slate-900 dark:text-white">{item.sku}</div>
        <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{item.barcode}</div>
      </td>
      <td className="py-3 px-4 max-w-xs">
        <div 
          onClick={() => onOpenDetail(item)}
          className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-emerald-400 cursor-pointer truncate"
        >
          {item.name}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.specs}</div>
      </td>
      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
        {item.categoryName}
      </td>
      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span>{item.location}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-right font-mono tabular-nums">
        <span className={`font-bold text-sm ${
          item.quantity === 0 ? 'text-red-600 dark:text-rose-400' : item.quantity <= item.minStockAlert ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
        }`}>
          {item.quantity}
        </span>
        <span className="text-slate-500 dark:text-slate-400 ml-1 font-sans">{item.unit}</span>
      </td>
      <td className="py-3 px-4 text-center whitespace-nowrap">
        <span className={`text-xs font-semibold ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </td>
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onOpenStockOut(item)}
            disabled={item.quantity === 0}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              item.quantity === 0 
                ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white hover:bg-slate-800'
            }`}
          >
            Ambil
          </button>
          <button
            onClick={() => onOpenDetail(item)}
            className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md"
          >
            Info
          </button>
        </div>
      </td>
    </tr>
  );
});
