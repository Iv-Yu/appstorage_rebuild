/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ArrowUpRight } from 'lucide-react';
import { DashboardKpiCards } from './dashboard/DashboardKpiCards';
import { TrendAreaChart } from './dashboard/TrendAreaChart';
import { TopMovingBarChart } from './dashboard/TopMovingBarChart';
import { CategoryDonutChart } from './dashboard/CategoryDonutChart';

interface DashboardProps {
  onOpenStockIn: () => void;
  onOpenStockOut: () => void;
  onOpenChecklist: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenStockOut,
  onOpenChecklist
}) => {
  const { items, categories, transactions, setActiveTab } = useInventory();

  // Timeframe selector for trends: 30 days (default), 14 days, 7 days
  const [timeRangeDays, setTimeRangeDays] = useState<30 | 14 | 7>(30);

  // Reference today date: Oct 26, 2026 (or dynamic)
  const refDate = useMemo(() => new Date(2026, 9, 26), []);

  // Filter transactions within the selected range (default 30 days)
  const rangeTransactions = useMemo(() => {
    const cutoff = new Date(refDate);
    cutoff.setDate(cutoff.getDate() - timeRangeDays);
    return transactions.filter((tx: any) => {
      const txDate = new Date(tx.created_at || tx.date || Date.now());
      return txDate >= cutoff && txDate <= refDate;
    });
  }, [transactions, refDate, timeRangeDays]);

  // Aggregate daily Inflow and Outflow trends over the selected timeframe
  const trendData = useMemo(() => {
    const daysMap: Record<string, { dateLabel: string; fullDate: string; inflow: number; outflow: number; net: number }> = {};

    // Initialize all days in the range so the chart has continuous points
    for (let i = timeRangeDays - 1; i >= 0; i--) {
      const d = new Date(refDate);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayNum = d.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const dateLabel = `${dayNum} ${monthNames[d.getMonth()]}`;

      daysMap[dateKey] = {
        dateLabel,
        fullDate: dateKey,
        inflow: 0,
        outflow: 0,
        net: 0,
      };
    }

    // Populate from transactions
    rangeTransactions.forEach((tx: any) => {
      const dateStr = tx.created_at || tx.date || new Date().toISOString();
      const dateKey = String(dateStr).slice(0, 10);
      if (daysMap[dateKey]) {
        if (tx.type === 'IN') {
          daysMap[dateKey].inflow += tx.quantity;
        } else {
          daysMap[dateKey].outflow += tx.quantity;
        }
        daysMap[dateKey].net = daysMap[dateKey].inflow - daysMap[dateKey].outflow;
      }
    });

    return Object.values(daysMap);
  }, [rangeTransactions, refDate, timeRangeDays]);

  // Aggregate Top-Moving Items (suku cadang paling aktif keluar / dikonsumsi untuk tiket)
  const topMovingItems = useMemo(() => {
    const itemMap: Record<string, {
      id: string;
      sku: string;
      name: string;
      categoryName: string;
      unit: string;
      totalConsumed: number;
      ticketCount: number;
      currentStock: number;
      minStockAlert: number;
    }> = {};

    rangeTransactions
      .filter((tx: any) => tx.type === 'OUT')
      .forEach((tx: any) => {
        const itemId = tx.item_id || tx.itemId || '';
        if (!itemMap[itemId]) {
          const originalItem = items.find((i: any) => i.id === itemId);
          itemMap[itemId] = {
            id: itemId,
            sku: tx.item_sku || tx.itemSku || originalItem?.sku || '-',
            name: tx.item_name || tx.itemName || originalItem?.name || '-',
            categoryName: (originalItem && originalItem.categoryName) ? originalItem.categoryName : 'Suku Cadang',
            unit: tx.item_unit || tx.unit || originalItem?.unit || 'pcs',
            totalConsumed: 0,
            ticketCount: 0,
            currentStock: originalItem ? originalItem.quantity : 0,
            minStockAlert: (originalItem && (originalItem.min_stock_alert ?? originalItem.minStockAlert)) ?? 2,
          };
        }
        itemMap[itemId].totalConsumed += tx.quantity;
        itemMap[itemId].ticketCount += 1;
      });

    const sorted = Object.values(itemMap).sort((a, b) => b.totalConsumed - a.totalConsumed);

    return sorted.slice(0, 7).map(item => ({
      name: item.name.length > 24 ? item.name.slice(0, 22) + '...' : item.name,
      fullName: item.name,
      sku: item.sku,
      consumed: item.totalConsumed,
      unit: item.unit,
      tickets: item.ticketCount,
      stock: item.currentStock,
      isLow: item.currentStock <= item.minStockAlert,
    }));
  }, [rangeTransactions, items]);

  // Category Stock Volume Distribution for Donut Chart
  const categoryData = useMemo(() => {
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
    return categories.map((cat, idx) => {
      const catItems = items.filter(i => i.categoryId === cat.id);
      const totalQuantity = catItems.reduce((sum, i) => sum + i.quantity, 0);
      return {
        name: cat.name,
        code: cat.code,
        value: totalQuantity,
        itemCount: catItems.length,
        color: colors[idx % colors.length],
      };
    }).filter(c => c.value > 0);
  }, [categories, items]);

  // KPI Metrics Calculations
  const totalInflow = useMemo(() => {
    return rangeTransactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.quantity, 0);
  }, [rangeTransactions]);

  const totalOutflow = useMemo(() => {
    return rangeTransactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.quantity, 0);
  }, [rangeTransactions]);

  const ticketTransactionsCount = useMemo(() => {
    return rangeTransactions.filter((t: any) => t.type === 'OUT' && (t.reference_type === 'TICKET_EXTERNAL' || t.referenceType === 'TICKET_EXTERNAL')).length;
  }, [rangeTransactions]);

  const criticalItems = useMemo(() => {
    return items.filter((i: any) => i.quantity <= (i.min_stock_alert ?? i.minStockAlert ?? 0));
  }, [items]);

  return (
    <div className="space-y-5">
      {/* Hero Banner with Glass Styling */}
      <div className="glass rounded-2xl p-5 sm:p-6 transition-all shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>VISUALISASI ANALITIK</span>
              <span aria-hidden="true">·</span>
              <span>TREN MUTASI {timeRangeDays} HARI TERAKHIR</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-600 dark:text-slate-300">RECHARTS ENGINE</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1.5 font-display">
              Dashboard Tren Inventori & Suku Cadang Lapangan
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Pantau arus pergerakan barang masuk (restock PO) vs barang keluar (tiket lapangan), serta identifikasi suku cadang paling cepat terpakai (top-moving items).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Timeframe segmented glass buttons */}
            <div className="flex items-center bg-slate-900/5 dark:bg-slate-900/60 p-1 rounded-xl text-xs font-semibold border border-slate-200/50 dark:border-slate-700/50">
              <button
                onClick={() => setTimeRangeDays(7)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRangeDays === 7 
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setTimeRangeDays(14)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRangeDays === 14 
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                14 Hari
              </button>
              <button
                onClick={() => setTimeRangeDays(30)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRangeDays === 30 
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                30 Hari
              </button>
            </div>

            <button
              onClick={onOpenStockOut}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Keluarkan Barang</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards (Grid) */}
      <DashboardKpiCards
        totalInflow={totalInflow}
        totalOutflow={totalOutflow}
        ticketTransactionsCount={ticketTransactionsCount}
        mutationCount={rangeTransactions.length}
        criticalItemsCount={criticalItems.length}
        timeRangeDays={timeRangeDays}
      />

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <TrendAreaChart
          trendData={trendData}
          timeRangeDays={timeRangeDays}
          onViewDetails={() => setActiveTab('inout')}
        />

        <TopMovingBarChart
          topMovingItems={topMovingItems}
          timeRangeDays={timeRangeDays}
          onViewReport={() => setActiveTab('weekly-report')}
        />
      </div>

      {/* Secondary Row: Category Volume Breakdown & Quick Action Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <CategoryDonutChart categoryData={categoryData} />

        {/* Field Ops Readiness & Action Feed (Glass Card) */}
        <div className="lg:col-span-7 glass rounded-xl p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  Aktivitas Pengeluaran Tiket Terbaru
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pemakaian suku cadang terkini oleh teknisi lapangan.
                </p>
              </div>
              <button
                onClick={onOpenChecklist}
                className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-900/5 dark:bg-slate-800 hover:bg-slate-900/10 dark:hover:bg-slate-700/80 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200/50 dark:border-slate-700/50"
              >
                <span>Cek Tas Lapangan</span>
              </button>
            </div>

            <div className="space-y-2 mt-3">
              {rangeTransactions
                .filter(t => t.type === 'OUT')
                .slice(0, 4)
                .map(tx => (
                  <div
                    key={tx.id}
                    className="p-3 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs hover:bg-white/80 dark:hover:bg-slate-900/80 transition-all"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-9 h-9 rounded-lg bg-slate-900/5 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-center font-mono font-bold text-slate-800 dark:text-slate-200 text-xs shrink-0">
                        {tx.quantity}x
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {tx.item_name || tx.itemName || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">{tx.reference_number || tx.referenceNumber || '-'}</span>
                          <span>&middot;</span>
                          <span className="font-sans text-slate-500 dark:text-slate-400">{tx.recipient_destination || tx.recipientOrDestination || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{tx.performed_by || tx.performedBy || '-'}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(tx.created_at || tx.date || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="text-[11px]">Sinkronisasi otomatis dengan formulir checklist & tiket API.</span>
            <button
              onClick={() => setActiveTab('inout')}
              className="text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold transition-colors"
            >
              Semua Riwayat &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
