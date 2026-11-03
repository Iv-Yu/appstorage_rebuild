/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InventoryItem, Transaction } from '../types/inventory';
import { escapeHtml, sanitizeFormulaInput } from './security';
import { APP_VERSION } from '../constants/version';

/**
 * Format currency to IDR string for Excel presentation
 */
function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Safely format cell text escaping HTML and neutralizing formula injection
 */
function safeCell(value: unknown): string {
  return escapeHtml(sanitizeFormulaInput(value));
}

/**
 * Helper to download an HTML/XML Excel document with .xlsx extension
 */
function downloadExcelFile(htmlContent: string, filename: string) {
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Inventory Items Catalog to Excel (.xlsx) with sanitized cells & formulas
 */
export function exportInventoryToExcel(items: InventoryItem[], filename = 'fieldops-inventory-catalog.xlsx') {
  const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const rowsHtml = items.map((item, idx) => {
    const isLow = item.quantity <= item.minStockAlert && item.quantity > 0;
    const isOut = item.quantity === 0;
    const statusText = isOut ? 'HABIS' : isLow ? 'STOK TIPIS' : 'AMAN';
    const statusBg = isOut ? '#FEE2E2' : isLow ? '#FEF3C7' : '#D1FAE5';
    const statusColor = isOut ? '#991B1B' : isLow ? '#92400E' : '#065F46';

    return `
      <tr style="height: 24px;">
        <td style="text-align: center; border: 1px solid #E2E8F0;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: bold; border: 1px solid #E2E8F0;">${safeCell(item.sku)}</td>
        <td style="font-family: monospace; border: 1px solid #E2E8F0;">${safeCell(item.barcode)}</td>
        <td style="font-weight: 500; border: 1px solid #E2E8F0;">${safeCell(item.name)}</td>
        <td style="border: 1px solid #E2E8F0;">${safeCell(item.categoryName)}</td>
        <td style="text-align: right; font-weight: bold; border: 1px solid #E2E8F0;">${item.quantity.toLocaleString('id-ID')}</td>
        <td style="text-align: center; border: 1px solid #E2E8F0;">${safeCell(item.unit)}</td>
        <td style="text-align: right; border: 1px solid #E2E8F0;">${item.minStockAlert}</td>
        <td style="text-align: right; border: 1px solid #E2E8F0;">${formatIDR(item.unitCost)}</td>
        <td style="text-align: right; font-weight: bold; border: 1px solid #E2E8F0;">${formatIDR(item.quantity * item.unitCost)}</td>
        <td style="border: 1px solid #E2E8F0;">${safeCell(item.location)}</td>
        <td style="text-align: center; background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; border: 1px solid #E2E8F0;">${statusText}</td>
        <td style="border: 1px solid #E2E8F0;">${safeCell(item.specs || '-')}</td>
        <td style="border: 1px solid #E2E8F0;">${safeCell(new Date(item.lastUpdated).toLocaleString('id-ID'))}</td>
      </tr>
    `;
  }).join('');

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Katalog Inventori IT</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
          .title-hdr { font-size: 16pt; font-weight: bold; color: #0F172A; margin-bottom: 4px; }
          .sub-hdr { font-size: 10pt; color: #64748B; margin-bottom: 12px; }
          th { background-color: #0F172A; color: #FFFFFF; font-weight: bold; padding: 8px; border: 1px solid #334155; }
          td { padding: 6px; vertical-align: middle; }
          .summary-row { background-color: #F8FAFC; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="title-hdr">LAPORAN KATALOG INVENTORI LAPANGAN IT (FieldOps v${APP_VERSION})</div>
        <div class="sub-hdr">Tanggal Ditarik: ${new Date().toLocaleString('id-ID')} | Total Item: ${items.length} Barang</div>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th>Kode SKU</th>
              <th>Barcode Barcode</th>
              <th>Nama Barang Suku Cadang</th>
              <th>Kategori / Rak</th>
              <th>Jumlah Stok</th>
              <th>Satuan</th>
              <th>Batas Min Alert</th>
              <th>Harga Satuan (IDR)</th>
              <th>Total Nilai Aset (IDR)</th>
              <th>Lokasi Penyimpanan</th>
              <th>Status Stok</th>
              <th>Spesifikasi Teknis</th>
              <th>Terakhir Diperbarui</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="summary-row" style="height: 28px; background-color: #E2E8F0;">
              <td colspan="5" style="text-align: right; font-weight: bold; border: 1px solid #CBD5E1;">TOTAL KESELURUHAN:</td>
              <td style="text-align: right; font-weight: bold; border: 1px solid #CBD5E1;">${totalItemsCount.toLocaleString('id-ID')}</td>
              <td style="border: 1px solid #CBD5E1;">unit</td>
              <td colspan="2" style="border: 1px solid #CBD5E1;"></td>
              <td style="text-align: right; font-weight: bold; color: #0F172A; border: 1px solid #CBD5E1;">${formatIDR(totalValue)}</td>
              <td colspan="4" style="border: 1px solid #CBD5E1;"></td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  downloadExcelFile(template, filename);
}

/**
 * Export Weekly Report & Transactions to Excel (.xlsx) with sanitized cells
 */
export function exportWeeklyReportToExcel(transactions: Transaction[], filename = 'fieldops-laporan-transaksi.xlsx') {
  const rowsHtml = transactions.map((tx, idx) => {
    const isOut = tx.type === 'OUT';
    const typeLabel = isOut ? 'BARANG KELUAR' : 'BARANG MASUK';
    const typeBg = isOut ? '#FEE2E2' : '#D1FAE5';
    const typeColor = isOut ? '#991B1B' : '#065F46';

    return `
      <tr style="height: 24px;">
        <td style="text-align: center; border: 1px solid #E2E8F0;">${idx + 1}</td>
        <td style="border: 1px solid #E2E8F0;">${safeCell(new Date(tx.date).toLocaleString('id-ID'))}</td>
        <td style="text-align: center; background-color: ${typeBg}; color: ${typeColor}; font-weight: bold; border: 1px solid #E2E8F0;">${typeLabel}</td>
        <td style="font-family: monospace; font-weight: bold; border: 1px solid #E2E8F0;">${safeCell(tx.itemSku)}</td>
        <td style="font-weight: 500; border: 1px solid #E2E8F0;">${safeCell(tx.itemName)}</td>
        <td style="text-align: right; font-weight: bold; border: 1px solid #E2E8F0;">${isOut ? '-' : '+'}${tx.quantity}</td>
        <td style="text-align: center; border: 1px solid #E2E8F0;">${safeCell(tx.unit)}</td>
        <td style="font-family: monospace; border: 1px solid #E2E8F0;">${safeCell(tx.referenceNumber)}</td>
        <td style="border: 1px solid #E2E8F0;">${safeCell(tx.performedBy)}</td>
        <td style="border: 1px solid #E2E8F0;">${safeCell(tx.recipientOrDestination)}</td>
        <td style="border: 1px solid #E2E8F0;">${safeCell(tx.notes || '-')}</td>
        <td style="border: 1px solid #E2E8F0;">${safeCell(tx.apiSource || 'Manual')}</td>
      </tr>
    `;
  }).join('');

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan Mutasi Barang</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
          .title-hdr { font-size: 16pt; font-weight: bold; color: #0F172A; margin-bottom: 4px; }
          .sub-hdr { font-size: 10pt; color: #64748B; margin-bottom: 12px; }
          th { background-color: #1E293B; color: #FFFFFF; font-weight: bold; padding: 8px; border: 1px solid #334155; }
          td { padding: 6px; vertical-align: middle; }
        </style>
      </head>
      <body>
        <div class="title-hdr">LAPORAN MUTASI BARANG IT LAPANGAN (FieldOps v${APP_VERSION})</div>
        <div class="sub-hdr">Tanggal Ditarik: ${new Date().toLocaleString('id-ID')} | Total Transaksi: ${transactions.length} Entri</div>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th>Waktu Transaksi</th>
              <th>Jenis Transaksi</th>
              <th>Kode SKU</th>
              <th>Nama Barang / Suku Cadang</th>
              <th>Jumlah</th>
              <th>Satuan</th>
              <th>No. Referensi / Tiket</th>
              <th>Teknisi / Petugas</th>
              <th>Tujuan / Unit Lokasi</th>
              <th>Catatan Lapangan</th>
              <th>Sumber Entri</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  downloadExcelFile(template, filename);
}
