/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, ReferenceType } from '../types/inventory';
import { X, ArrowDownLeft, ArrowUpRight, AlertCircle, FileCheck } from 'lucide-react';

interface StockInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'IN' | 'OUT';
  initialItem?: InventoryItem | null;
  onSuccessPrint?: (txData: {
    type: 'IN' | 'OUT';
    itemName: string;
    itemSku: string;
    quantity: number;
    unit: string;
    referenceNumber: string;
    recipientOrDestination: string;
    performedBy: string;
    notes: string;
    date: string;
  }) => void;
}

export const StockInOutModal: React.FC<StockInOutModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialItem,
  onSuccessPrint
}) => {
  const { items, currentUser, recordStockIn, recordStockOut } = useInventory();

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [referenceType, setReferenceType] = useState<ReferenceType>('TICKET_EXTERNAL');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [performedBy, setPerformedBy] = useState<string>('');
  const [recipientOrDestination, setRecipientOrDestination] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialItem) {
      setSelectedItemId(initialItem.id);
    } else if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0].id);
    }
  }, [initialItem, items, selectedItemId]);

  useEffect(() => {
    if (currentUser) {
      setPerformedBy(currentUser.name);
    }
    if (mode === 'OUT') {
      setReferenceType('TICKET_EXTERNAL');
      setReferenceNumber(`TCK-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setRecipientOrDestination('');
      setNotes('Penggantian suku cadang saat perbaikan lapangan');
    } else {
      setReferenceType('PURCHASE_ORDER');
      setReferenceNumber(`PO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setRecipientOrDestination('Gudang Utama IT');
      setNotes('Penerimaan pengadaan suku cadang baru');
    }
    setQuantity(1);
  }, [mode, currentUser, isOpen]);

  if (!isOpen) return null;

  const currentItem = items.find(it => it.id === selectedItemId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;

    if (quantity <= 0) {
      alert('Jumlah harus lebih besar dari 0');
      return;
    }

    let success = false;
    const nowIso = new Date().toISOString();

    if (mode === 'IN') {
      success = recordStockIn({
        itemId: currentItem.id,
        quantity: Number(quantity),
        referenceNumber: referenceNumber.trim() || `IN-${Date.now().toString().slice(-6)}`,
        performedBy: performedBy.trim() || currentUser.name,
        recipientOrDestination: recipientOrDestination.trim() || currentItem.location,
        notes: notes.trim()
      });
    } else {
      if (currentItem.quantity < quantity) {
        return; // already handled by context toast
      }
      success = recordStockOut({
        itemId: currentItem.id,
        quantity: Number(quantity),
        referenceType,
        referenceNumber: referenceNumber.trim() || `OUT-${Date.now().toString().slice(-6)}`,
        performedBy: performedBy.trim() || currentUser.name,
        recipientOrDestination: recipientOrDestination.trim() || 'Lokasi Pekerjaan Lapangan',
        notes: notes.trim(),
        apiSource: 'Form Input Manual Teknisi'
      });
    }

    if (success) {
      if (onSuccessPrint) {
        onSuccessPrint({
          type: mode,
          itemName: currentItem.name,
          itemSku: currentItem.sku,
          quantity: Number(quantity),
          unit: currentItem.unit,
          referenceNumber: referenceNumber.trim(),
          recipientOrDestination: recipientOrDestination.trim(),
          performedBy: performedBy.trim() || currentUser.name,
          notes: notes.trim(),
          date: nowIso
        });
      }
      onClose();
    }
  };

  const isStockOut = mode === 'OUT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isStockOut ? 'bg-slate-900 text-white border-slate-800' : 'bg-emerald-800 text-white border-emerald-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {isStockOut ? (
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold">
                {isStockOut ? 'Catat Barang Keluar (Pekerjaan / Tiket)' : 'Catat Barang Masuk (Restock / Pembelian)'}
              </h2>
              <p className="text-xs text-white/80">
                {isStockOut ? 'Kurangi stok untuk tiket perbaikan lapangan' : 'Tambah jumlah stok fisik ke gudang'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Item Selector */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Pilih Barang / Suku Cadang <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.sku}] {it.name} (Stok: {it.quantity} {it.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock Banner */}
          {currentItem && (
            <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              currentItem.quantity === 0
                ? 'bg-red-50 dark:bg-rose-950/40 border-red-200 dark:border-rose-800 text-red-800 dark:text-rose-300'
                : currentItem.quantity <= currentItem.minStockAlert
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
            }`}>
              <div>
                <span className="font-semibold">Stok Saat Ini:</span>{' '}
                <span className="font-mono font-bold tabular-nums text-sm">
                  {currentItem.quantity} {currentItem.unit}
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Lokasi: {currentItem.location}
                </span>
              </div>
              {isStockOut && currentItem.quantity === 0 && (
                <span className="text-red-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Stok Habis!
                </span>
              )}
            </div>
          )}

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Jumlah {isStockOut ? 'Keluar' : 'Masuk'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={isStockOut && currentItem ? currentItem.quantity : undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-sans text-xs">
                  {currentItem?.unit || 'unit'}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipe Keperluan / Referensi
              </label>
              <select
                value={referenceType}
                onChange={(e) => setReferenceType(e.target.value as ReferenceType)}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              >
                {isStockOut ? (
                  <>
                    <option value="TICKET_EXTERNAL">Tiket Insiden / Gangguan</option>
                    <option value="ROUTINE_MAINTENANCE">Pemeliharaan Rutin (Preventive)</option>
                    <option value="EMERGENCY_REPAIR">Perbaikan Darurat (Emergency)</option>
                  </>
                ) : (
                  <>
                    <option value="PURCHASE_ORDER">Purchase Order / Pengadaan Baru</option>
                    <option value="RETURN_RESTOCK">Retur Sisa Pemakaian Lapangan</option>
                    <option value="INITIAL_COUNT">Penyesuaian Stok / Audit Fisik</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Reference Number & Performed By */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isStockOut ? 'Nomor Tiket Insiden' : 'Nomor PO / Surat Jalan'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={isStockOut ? 'Contoh: TCK-2026-9480' : 'Contoh: PO-2026-0811'}
                required
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nama Teknisi / Petugas (Otentikasi Akun) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={`${currentUser.name} (${currentUser.roleLabel})`}
                  readOnly
                  disabled
                  className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed select-none"
                />
              </div>
            </div>
          </div>

          {/* Destination / Location */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isStockOut ? 'Tujuan Pemasangan / Ruangan / Cabang' : 'Lokasi Simpan di Gudang'}
            </label>
            <input
              type="text"
              value={recipientOrDestination}
              onChange={(e) => setRecipientOrDestination(e.target.value)}
              placeholder={isStockOut ? 'Contoh: Ruang Rapat Lt 3 / Cabang Sudirman' : 'Contoh: Rak A-02 Gudang Utama'}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Catatan Lapangan / Keterangan Masalah
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jelaskan detail perbaikan, penyebab penggantian, atau kondisi barang..."
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isStockOut && currentItem && currentItem.quantity < quantity}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs ${
                isStockOut
                  ? 'bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>{isStockOut ? 'Konfirmasi Pengeluaran Barang' : 'Simpan Barang Masuk'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
