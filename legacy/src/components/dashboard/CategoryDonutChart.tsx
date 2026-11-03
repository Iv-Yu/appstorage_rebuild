/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip 
} from 'recharts';
import { Package } from 'lucide-react';

interface CategoryVolumeItem {
  name: string;
  code: string;
  value: number;
  itemCount: number;
  color: string;
}

interface CategoryDonutChartProps {
  categoryData: CategoryVolumeItem[];
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    const cat = entry.payload;
    return (
      <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl border border-slate-700 text-xs pointer-events-none select-none z-50 max-w-[210px]">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/30"
            style={{ backgroundColor: cat.color }}
          />
          <span className="font-bold text-slate-100 text-[11px] truncate">{cat.name}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px] pt-1.5 border-t border-slate-800">
          <span className="text-slate-400">Total Stok Fisik:</span>
          <span className="font-mono font-bold text-emerald-400 tabular-nums">
            {cat.value} item
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ categoryData }) => {
  return (
    <div className="lg:col-span-5 glass rounded-xl p-5 flex flex-col justify-between transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
            Porsi Kuantitas Fisik per Kategori
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Distribusi total stok barang yang tersimpan di gudang saat ini.
          </p>
        </div>
        <Package className="w-4 h-4 text-slate-400 dark:text-slate-500" />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
        <div className="w-44 h-44 shrink-0 select-none outline-none focus:outline-none focus-visible:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ outline: 'none', border: 'none' }} tabIndex={-1}>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cat-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomPieTooltip />}
                isAnimationActive={false}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ pointerEvents: 'none', outline: 'none', zIndex: 50 }}
                cursor={false}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-1.5 text-xs w-full">
          {categoryData.map(cat => (
            <div key={cat.code} className="flex items-center justify-between text-slate-700 dark:text-slate-300 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700/60">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                <span className="truncate">{cat.name}</span>
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {cat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
