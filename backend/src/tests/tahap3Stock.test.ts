/**
 * Test Suite: Tahap 3 - Box, Item Fisik Ber-ID, Stok Jumlah & Input Kamera
 * FieldOps Inventory v2
 */

import { initDatabase } from '../db/database';
import { StockService } from '../services/stockService';
import { CatalogService } from '../services/catalogService';

async function runTahap3Tests() {
  console.log('================================================================');
  console.log('  FIELDOPS IT V2 - PENGUJIAN OTOMATIS TAHAP 3 (STOK & BOX)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  await initDatabase();
  const testUserId = 'test-admin-id';

  try {
    // Setup Data Katalog Terlebih Dahulu
    const adaptorJenis = await CatalogService.createJenis({
      nama: 'Adaptor Charger',
      sumber_id_bawaan: 'scan_sn',
      prefix_id_bawaan: 'ADP',
      atributs: [
        { kode: 'volt', nama: 'Tegangan', tipe_isian: 'angka', satuan: 'V', wajib: true, urutan: 1, masuk_nama: true },
        { kode: 'ampere', nama: 'Arus', tipe_isian: 'pilihan', wajib: true, urutan: 2, masuk_nama: true, opsi: ['1A', '2A', '3A'] }
      ]
    }, testUserId);

    const adaptorProd = await CatalogService.createProduk({
      jenis_id: adaptorJenis.id,
      nama: 'Adaptor Fast Charger',
      kategori: 'fast_moving'
    }, testUserId);

    // Tipe 1: Serial Number Berpola Regex ^SN[0-9]{8}$
    const attrVolt = adaptorJenis.atributs!.find(a => a.kode === 'volt')!;
    const attrAmp = adaptorJenis.atributs!.find(a => a.kode === 'ampere')!;
    const opsi2A = attrAmp.opsi!.find(o => o.nilai === '2A')!;

    const tipeSN = await CatalogService.createTipe({
      produk_id: adaptorProd.id,
      sumber_id: 'scan_sn',
      pola_id: '^SN[0-9]{8}$',
      nilai_atribut: [
        { atribut_id: attrVolt.id, nilai_angka: 12 },
        { atribut_id: attrAmp.id, opsi_id: opsi2A.id }
      ]
    }, testUserId);

    // Tipe 2: Tanpa ID (Mode Stok Jumlah)
    const opsi1A = attrAmp.opsi!.find(o => o.nilai === '1A')!;
    const tipeJumlah = await CatalogService.createTipe({
      produk_id: adaptorProd.id,
      sumber_id: 'tanpa_id',
      nilai_atribut: [
        { atribut_id: attrVolt.id, nilai_angka: 5 },
        { atribut_id: attrAmp.id, opsi_id: opsi1A.id }
      ]
    }, testUserId);

    console.log('\n[1] Pengujian Pengelolaan Box Penyimpanan:');
    const boxA = await StockService.createBox('BOX-TEST-A1', 'Rak A Sektor 1', testUserId);
    const boxB = await StockService.createBox('BOX-TEST-B2', 'Rak B Sektor 2', testUserId);

    assert(!!boxA.id && boxA.kode === 'BOX-TEST-A1', 'Box "BOX-TEST-A1" berhasil dibuat');
    assert(!!boxB.id && boxB.kode === 'BOX-TEST-B2', 'Box "BOX-TEST-B2" berhasil dibuat');

    let dupBoxError = false;
    try {
      await StockService.createBox('BOX-TEST-A1', 'Duplikat', testUserId);
    } catch {
      dupBoxError = true;
    }
    assert(dupBoxError, 'Pembuatan box dengan kode duplikat berhasil ditolak');

    console.log('\n[2] Pengujian Input Stok Item Fisik Tunggal & Validasi Regex:');
    // Uji coba pola regex yang salah
    let invalidRegexError = false;
    try {
      await StockService.inputStokItemSingle({
        tipe_id: tipeSN.id,
        box_id: boxA.id,
        kode_id: 'WRONG-SN-FORMAT',
        user_id: testUserId
      });
    } catch {
      invalidRegexError = true;
    }
    assert(invalidRegexError, 'Input SN yang tidak cocok dengan regex ^SN[0-9]{8}$ berhasil ditolak');

    // Input SN yang benar
    const validSN1 = 'SN12345678';
    const singleRes = await StockService.inputStokItemSingle({
      tipe_id: tipeSN.id,
      box_id: boxA.id,
      kode_id: validSN1,
      user_id: testUserId
    });

    assert(singleRes.success && singleRes.kodeId === validSN1, `Input stok fisik [${validSN1}] ke ${boxA.kode} berhasil`);

    // Uji duplikasi SN di seluruh sistem
    let dupSNError = false;
    try {
      await StockService.inputStokItemSingle({
        tipe_id: tipeSN.id,
        box_id: boxB.id,
        kode_id: validSN1,
        user_id: testUserId
      });
    } catch {
      dupSNError = true;
    }
    assert(dupSNError, 'Duplikasi SN yang sudah ada di sistem berhasil ditolak');

    // Cek penguncian id_dikunci pada tipe
    const tipeAfterStock = await CatalogService.getTipeById(tipeSN.id);
    assert(tipeAfterStock?.id_dikunci === 1 || tipeAfterStock?.id_dikunci === true, 'Aturan ID tipe otomatis DIKUNCI (id_dikunci = 1) setelah stok masuk');

    console.log('\n[3] Pengujian Input Stok Massal 20 SN Beruntun Dalam 1 Transaksi:');
    const batchSNs: string[] = [];
    for (let i = 1; i <= 20; i++) {
      batchSNs.push(`SN88${String(i).padStart(6, '0')}`);
    }

    const bulkRes = await StockService.inputStokItemBulk({
      tipe_id: tipeSN.id,
      box_id: boxA.id,
      kode_ids: batchSNs,
      user_id: testUserId,
      catatan: 'Penerimaan batch 20 unit SN dari vendor'
    });

    assert(bulkRes.success && bulkRes.totalCount === 20, '20 SN beruntun berhasil diproses dalam 1 batch operasi');
    assert(!!bulkRes.activityId && bulkRes.activityId.startsWith('AKT-'), `Batch 20 unit menggunakan 1 ID Aktivitas Tunggal (${bulkRes.activityId})`);

    console.log('\n[4] Pengujian Input Stok Jumlah (Mode tanpa_id):');
    const sjRes = await StockService.inputStokJumlah({
      tipe_id: tipeJumlah.id,
      box_id: boxA.id,
      jumlah: 50,
      user_id: testUserId,
      catatan: 'Pengadaan 50 roll kabel/adaptor mode jumlah'
    });

    assert(sjRes.success, 'Input +50 unit stok jumlah ke BOX-TEST-A1 berhasil');

    console.log('\n[5] Pengujian QR Scan & Kueri Isi Box (Grouped Content):');
    const contents = await StockService.getBoxContents(boxA.id);
    assert(contents.total_items === 21, `Total item fisik ber-ID di ${boxA.kode} = 21 unit (1 single + 20 bulk)`);
    assert(contents.total_stok_jumlah === 50, `Total stok jumlah di ${boxA.kode} = 50 unit`);
    assert(!!contents.contents['Adaptor Fast Charger'], 'Isi box berhasil dikelompokkan secara terstruktur per produk');

    console.log('\n[6] Pengujian Pindah Box Antar Rak (Activity Log Pindah Box):');
    // Pindahkan 1 item ber-ID dari Box A ke Box B
    const moveSingleRes = await StockService.pindahBox({
      itemId: singleRes.itemId,
      boxAsalId: boxA.id,
      boxTujuanId: boxB.id,
      userId: testUserId,
      catatan: 'Relokasi item ke Rak B2'
    });

    assert(moveSingleRes.success, 'Pindah 1 item fisik ber-ID dari Box A ke Box B berhasil');

    // Pindahkan 15 unit stok jumlah dari Box A ke Box B
    const moveSjRes = await StockService.pindahBox({
      tipeId: tipeJumlah.id,
      boxAsalId: boxA.id,
      boxTujuanId: boxB.id,
      jumlah: 15,
      userId: testUserId,
      catatan: 'Relokasi 15 unit stok jumlah'
    });

    assert(moveSjRes.success, 'Pindah 15 unit stok jumlah dari Box A ke Box B berhasil');

    // Verifikasi sisa isi di Box A dan B
    const boxAAfter = await StockService.getBoxContents(boxA.id);
    const boxBAfter = await StockService.getBoxContents(boxB.id);

    assert(boxAAfter.total_items === 20 && boxBAfter.total_items === 1, 'Sisa item fisik: Box A = 20, Box B = 1');
    assert(boxAAfter.total_stok_jumlah === 35 && boxBAfter.total_stok_jumlah === 15, 'Sisa stok jumlah: Box A = 35, Box B = 15');

  } catch (err: any) {
    console.error('Exception during Tahap 3 test:', err);
    failed++;
  }

  console.log('================================================================');
  console.log(`  HASIL TEST TAHAP 3: ${passed} LULUS, ${failed} GAGAL`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTahap3Tests();
