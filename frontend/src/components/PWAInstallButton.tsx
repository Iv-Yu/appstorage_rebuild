/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Download, 
  Smartphone, 
  WifiOff, 
  X, 
  Share, 
  CheckCircle2 
} from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();
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

        {/* PWA Install Button */}
        {isInstallable && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-all animate-pulse"
            title="Pasang FieldOps IT di HP / PC sebagai Aplikasi PWA Native"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}

        {/* iOS PWA Guide Trigger */}
        {isIOS && !isInstalled && (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Install iOS</span>
          </button>
        )}
      </div>

      {/* iOS Modal Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-500" />
                <span>Pasang di iPhone / iPad</span>
              </h3>
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 list-decimal list-inside">
              <li>Buka website ini menggunakan browser <strong>Safari</strong>.</li>
              <li>Ketuk tombol <Share className="w-3.5 h-3.5 inline text-blue-500 mx-1" /> <strong>Bagikan (Share)</strong> di bagian bawah Safari.</li>
              <li>Pilih menu <strong>"Tambah ke Layar Utama"</strong> (Add to Home Screen).</li>
              <li>Ketuk <strong>Tambah</strong> di sudut kanan atas.</li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-slate-900 text-white dark:bg-slate-700 rounded-xl text-xs font-bold"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
