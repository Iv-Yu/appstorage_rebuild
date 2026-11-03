/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { whatsappService, WhatsAppConfigData, WaLogItem } from '../services/whatsappService';
import { 
  X, 
  Send, 
  Settings, 
  PhoneCall, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Globe, 
  History, 
  Sparkles,
  Layers,
  Copy,
  Check,
  Power
} from 'lucide-react';

interface WhatsAppConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppConfigModal: React.FC<WhatsAppConfigModalProps> = ({
  isOpen,
  onClose
}) => {
  const { items, showToast } = useInventory();

  const [activeTab, setActiveTab] = useState<'config' | 'manual_send' | 'logs'>('config');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // Configuration state
  const [config, setConfig] = useState<WhatsAppConfigData>({
    gatewayType: 'fonnte',
    apiUrl: 'https://api.fonnte.com/send',
    apiToken: '',
    targetPhones: '081290008888',
    autoAlertEnabled: true,
  });

  // Logs state
  const [logs, setLogs] = useState<WaLogItem[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load configuration & logs
    whatsappService.getConfig().then((cfg) => setConfig(cfg));
    whatsappService.getLogs().then((lg) => setLogs(lg));
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter low stock and out of stock items for manual alert
  const criticalItems = items.filter(i => i.quantity <= (i.min_stock_alert ?? i.minStockAlert ?? 0));
  const outOfStockItems = items.filter(i => i.quantity === 0);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await whatsappService.updateConfig(config);
    setLoading(false);
    if (success) {
      showToast('Konfigurasi WhatsApp Gateway berhasil disimpan!', 'success');
    } else {
      showToast('Tersimpan di lokal. Backend server akan disinkronkan.', 'info');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await whatsappService.testConnection(config.targetPhones);
    setTesting(false);
    if (result.success) {
      setTestResult(`Sukses! ${result.message}`);
      showToast('Uji pengiriman pesan WhatsApp berhasil!', 'success');
      whatsappService.getLogs().then((lg) => setLogs(lg));
    } else {
      setTestResult(`Gagal: ${result.message}`);
      showToast('Gagal mengirim pesan uji coba', 'error');
    }
  };

  const handleManualSendBatchAlert = async () => {
    if (criticalItems.length === 0) {
      showToast('Tidak ada barang dengan stok menipis/habis saat ini.', 'info');
      return;
    }

    setLoading(true);
    const result = await whatsappService.sendStockAlert(
      criticalItems.map(i => ({
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        minStockAlert: i.min_stock_alert ?? i.minStockAlert ?? 0,
        unit: i.unit,
      })),
      'Pengiriman Manual Admin'
    );
    setLoading(false);

    if (result.success) {
      showToast('Pesan notifikasi ringkasan stok berhasil dikirim!', 'success');
      whatsappService.getLogs().then((lg) => setLogs(lg));
      setActiveTab('logs');
    } else {
      showToast(`Gagal: ${result.message}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-emerald-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Notifikasi WhatsApp Stok Menipis & Habis
                </h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  HTTP Gateway
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Konfigurasi Gateway API, nomor tujuan, & pemicu otomatis alert ke WhatsApp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'config'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Pengaturan Gateway</span>
            </button>

            <button
              onClick={() => setActiveTab('manual_send')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'manual_send'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Kirim Alert Ringkasan ({criticalItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Riwayat Kirim ({logs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${config.autoAlertEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
              {config.autoAlertEnabled ? 'Auto-Alert ON' : 'Auto-Alert OFF'}
            </span>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          
          {/* TAB 1: GATEWAY CONFIGURATION */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              
              {/* Preset Provider Selector */}
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
                <div className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Pilih Penyedia Gateway WhatsApp (HTTP API)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({
                      ...config,
                      gatewayType: 'fonnte',
                      apiUrl: 'https://api.fonnte.com/send'
                    })}
                    className={`p-2 rounded-lg border text-center font-bold text-xs transition-all ${
                      config.gatewayType === 'fonnte'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Fonnte
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({
                      ...config,
                      gatewayType: 'wablas',
                      apiUrl: 'https://wablas.com/api/send-message'
                    })}
                    className={`p-2 rounded-lg border text-center font-bold text-xs transition-all ${
                      config.gatewayType === 'wablas'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Wablas
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({
                      ...config,
                      gatewayType: 'custom_webhook',
                      apiUrl: 'https://api.perusahaan-anda.id/wa-send'
                    })}
                    className={`p-2 rounded-lg border text-center font-bold text-xs transition-all ${
                      config.gatewayType === 'custom_webhook'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Custom Webhook
                  </button>
                </div>
              </div>

              {/* Target Phone Numbers */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Nomor HP WhatsApp Tujuan Notifikasi (Pisahkan dengan koma jika &gt; 1) *
                </label>
                <input
                  type="text"
                  required
                  value={config.targetPhones}
                  onChange={(e) => setConfig({ ...config, targetPhones: e.target.value })}
                  placeholder="Contoh: 081290008888, 081311112222"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Nomor HP Supervisor IT atau Admin Logistik yang menerima peringatan stok menipis/habis.
                </span>
              </div>

              {/* API Token Key */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Token API / Secret Key WhatsApp Gateway *
                </label>
                <input
                  type="password"
                  value={config.apiToken}
                  onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                  placeholder="Masukkan Token Fonnte / Wablas / Authorization Key..."
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Token disimpan aman di backend Express server proxy untuk pengiriman otomatis.
                </span>
              </div>

              {/* Gateway API Endpoint URL */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Endpoint URL Gateway HTTP
                </label>
                <input
                  type="text"
                  required
                  value={config.apiUrl}
                  onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              {/* Auto Alert Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Pemicu Otomatis Saat Transaksi Keluar (*Stock Out*)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Otomatis kirim notifikasi WA seketika saat stok barang menjadi &le; batas minimum.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, autoAlertEnabled: !config.autoAlertEnabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                    config.autoAlertEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    config.autoAlertEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Test Result Banner */}
              {testResult && (
                <div className={`p-3 rounded-lg border text-xs font-mono leading-relaxed ${
                  testResult.startsWith('Sukses')
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}>
                  {testResult}
                </div>
              )}

              {/* Actions Footer inside tab */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{testing ? 'Menguji...' : 'Uji Coba Pengiriman WA'}</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MANUAL BATCH ALERT DISPATCH */}
          {activeTab === 'manual_send' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1 text-amber-900 dark:text-amber-200">
                <div className="font-bold text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Ringkasan Barang Perlu Restock ({criticalItems.length} Jenis)</span>
                </div>
                <p className="text-[11px] opacity-90">
                  Daftar di bawah ini akan dirangkum dalam 1 pesan WhatsApp ringkas dan dikirimkan ke nomor HP <strong className="font-mono">{config.targetPhones}</strong>.
                </p>
              </div>

              {criticalItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Semua Stok Suku Cadang AMAN!</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Tidak ada barang yang berada di bawah batas minimum alert saat ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {criticalItems.map((item) => {
                    const isOutOfStock = item.quantity === 0;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                          isOutOfStock
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
                            : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">{item.sku}</span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              isOutOfStock ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                            }`}>
                              {isOutOfStock ? 'HABIS' : 'MENIPIS'}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5" title={item.name}>
                            {item.name}
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                            Sisa: {item.quantity} {item.unit}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Min: {item.min_stock_alert ?? item.minStockAlert ?? 0} {item.unit}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sample Preview Message Box */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Pratinjau Pesan Ringkas WhatsApp yang Akan Dikirim:
                </label>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800 whitespace-pre-wrap">
{`⚠️ [ALERT STOK FIELD-OPS IT]
Sumber: Pengiriman Manual Admin

${criticalItems.slice(0, 3).map((item: any, idx) => `${idx + 1}. [${item.sku}] ${item.name}\n   Status: ${item.quantity === 0 ? '🚨 STOK HABIS' : '⚠️ STOK MENIPIS'}\n   Sisa Stok: ${item.quantity} ${item.unit} (Min Alert: ${item.min_stock_alert ?? item.minStockAlert ?? 0} ${item.unit})`).join('\n\n')}
${criticalItems.length > 3 ? `\n... dan ${criticalItems.length - 3} barang kritis lainnya.` : ''}

⏰ Waktu Audit: ${new Date().toLocaleString('id-ID')}
Mohon segera ajukan PO restock ke tim pengadaan gudang.`}
                </pre>
              </div>

              {/* Action Submit */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleManualSendBatchAlert}
                  disabled={loading || criticalItems.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Mengirim WhatsApp...' : 'Kirim Notifikasi WA Sekarang'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Riwayat Aktivitas Notifikasi WhatsApp Server
                </span>
                <button
                  type="button"
                  onClick={() => whatsappService.getLogs().then(lg => setLogs(lg))}
                  className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Refresh Logs
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium">
                  Belum ada log pengiriman WhatsApp.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{log.target}</span>
                        <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.status === 'SUCCESS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : log.status === 'SIMULATED' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px] truncate">
                        {log.messageSnippet}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span>{log.timestamp}</span>
                        <span className="truncate max-w-[200px]" title={log.details}>{log.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            FieldOps IT · WhatsApp Notification Proxy Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
