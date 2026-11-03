/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useInventory } from '../context/InventoryContext';
import { 
  Download, 
  Smartphone, 
  WifiOff, 
  X, 
  Share, 
  RefreshCw, 
  Cloud 
} from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();
  const { syncStatus, triggerManualSync } = useInventory();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Offline Cache Ready Badge */}
        {!isOnline && (
          <span 
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
            title="Aplikasi berjalan offline dengan cache lokal Service Worker"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline Mode</span>
          </span>
        )}

        {/* Offline Queue Sync Indicator & Trigger */}
        {syncStatus.pendingCount > 0 ? (
          <button
            onClick={() => triggerManualSync()}
            disabled={syncStatus.isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border border-amber-500/30 transition-colors"
            title={`${syncStatus.pendingCount} transaksi tersimpan di antrean offline. Klik untuk sinkronkan sekarang ke Firestore.`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin text-amber-600' : ''}`} />
            <span>{syncStatus.isSyncing ? 'Menyinkronkan...' : `${syncStatus.pendingCount} Tertunda`}</span>
          </button>
        ) : isOnline ? (
          <span
            className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200"
            title="Tersinkronisasi otomatis dengan database Firestore Cloud"
          >
            <Cloud className="w-3 h-3 text-emerald-600" />
            <span>Cloud Synced</span>
          </span>
        ) : null}

        {/* In-App Install Trigger for Chromium / Android */}
        {!isInstalled && isInstallable && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
            title="Install FieldOps IT ke Layar Utama HP / Komputer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}

        {/* iOS Safari Install Guide Trigger */}
        {!isInstalled && isIOS && (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Panduan install di iPhone / iPad Safari"
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Install iOS</span>
          </button>
        )}
      </div>

      {/* iOS Installation Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Pasang di iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Jalankan seperti aplikasi asli dari Home Screen</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-emerald-400">
                  1
                </span>
                <span>
                  Buka menu <strong className="text-white">Share</strong> (ikon <Share className="inline w-3.5 h-3.5 mx-0.5 text-blue-400" /> di Safari bawah).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-emerald-400">
                  2
                </span>
                <span>
                  Gulir ke bawah dan pilih opsi <strong className="text-white">Add to Home Screen</strong> (<strong className="text-white">Tambah ke Layar Utama</strong>).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-emerald-400">
                  3
                </span>
                <span>
                  Tekan <strong className="text-white">Add</strong> di pojok kanan atas. Ikon FieldOps IT akan langsung tersedia di layar depan perangkat Anda.
                </span>
              </li>
            </ol>

            <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
