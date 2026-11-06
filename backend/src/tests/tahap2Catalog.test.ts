/**
 * Test Suite: Tahap 2 - Katalog Bertingkat (Jenis, Atribut, Produk, Tipe)
 * FieldOps Inventory v2
 */

import { initDatabase } from '../db/database';
import { CatalogService } from '../services/catalogService';

async function runTahap2Tests() {
  console.log('--- MEMULAI PENGUJIAN TAHAP 2: KATALOG BERTINGKAT ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  await initDatabase();
  const testUserId = 'test-admin-id';

  try {
    // 1. Buat Jenis "Adaptor" dengan 3 atribut
    const adaptorJenis = await CatalogService.createJenis({
      nama: 'Adaptor Listrik',
      sumber_id_bawaan: 'manual',
      prefix_id_bawaan: 'ADP',
      atributs: [
        { kode: 'tegangan', nama: 'Tegangan', tipe_isian: 'angka', satuan: 'V', wajib: true, urutan: 1, masuk_nama: true },
        { kode: 'arus', nama: 'Arus', tipe_isian: 'pilihan', satuan: 'A', wajib: true, urutan: 2, masuk_nama: true, opsi: ['1A', '2A', '3A'] },
        { kode: 'jack', nama: 'Jenis Jack', tipe_isian: 'pilihan', wajib: false, urutan: 3, masuk_nama: true, opsi: ['Jack 5.5mm', 'Jack 3.5mm'] }
      ]
    }, testUserId);

    assert(adaptorJenis.id > 0 && adaptorJenis.nama === 'Adaptor Listrik', 'Jenis "Adaptor Listrik" berhasil dibuat dengan ID unik');
    assert(adaptorJenis.atributs?.length === 3, 'Ketiga atribut (Tegangan, Arus, Jack) berhasil dihubungkan ke Jenis');

    // 2. Buat Produk "Adaptor 12V" di bawah jenis Adaptor
    const adaptor12V = await CatalogService.createProduk({
      jenis_id: adaptorJenis.id,
      nama: 'Adaptor 12V Standar',
      kategori: 'fast_moving',
      catatan: 'Untuk ONU dan Router rumahan'
    }, testUserId);

    assert(adaptor12V.id > 0 && adaptor12V.jenis_id === adaptorJenis.id, 'Produk "Adaptor 12V Standar" berhasil dibuat');

    // 3. Buat Tipe 1: 12V / 1A (Atribut wajib terisi, jack dikosongkan)
    const attrTegangan = adaptorJenis.atributs!.find(a => a.kode === 'tegangan')!;
    const attrArus = adaptorJenis.atributs!.find(a => a.kode === 'arus')!;
    const attrJack = adaptorJenis.atributs!.find(a => a.kode === 'jack')!;
    const opsi1A = attrArus.opsi!.find(o => o.nilai === '1A')!;

    const tipe1 = await CatalogService.createTipe({
      produk_id: adaptor12V.id,
      sumber_id: 'otomatis',
      prefix_id: 'ADP12-1A',
      nilai_atribut: [
        { atribut_id: attrTegangan.id, nilai_angka: 12 },
        { atribut_id: attrArus.id, opsi_id: opsi1A.id }
      ]
    }, testUserId);

    assert(tipe1.nama_tipe === '12V / 1A', `Nama tipe otomatis terbentuk: "${tipe1.nama_tipe}" (ekspektasi: 12V / 1A)`);
    assert(tipe1.mode_stok === 'per_id', 'Mode stok otomatis ditentukan sebagai "per_id" untuk sumber_id = "otomatis"');

    // 4. Buat Tipe 2: 12V / 3A / Jack 5.5mm
    const opsi3A = attrArus.opsi!.find(o => o.nilai === '3A')!;
    const opsiJack55 = attrJack.opsi!.find(o => o.nilai === 'Jack 5.5mm')!;

    const tipe2 = await CatalogService.createTipe({
      produk_id: adaptor12V.id,
      sumber_id: 'scan_sn',
      pola_id: '^SN[0-9]{8}$',
      nilai_atribut: [
        { atribut_id: attrTegangan.id, nilai_angka: 12 },
        { atribut_id: attrArus.id, opsi_id: opsi3A.id },
        { atribut_id: attrJack.id, opsi_id: opsiJack55.id }
      ]
    }, testUserId);

    assert(tipe2.nama_tipe === '12V / 3A / Jack 5.5mm', `Nama tipe otomatis 3 atribut: "${tipe2.nama_tipe}"`);

    // 5. Cek duplikasi tipe ditolak
    let duplicateErrorThrown = false;
    try {
      await CatalogService.createTipe({
        produk_id: adaptor12V.id,
        nilai_atribut: [
          { atribut_id: attrTegangan.id, nilai_angka: 12 },
          { atribut_id: attrArus.id, opsi_id: opsi1A.id }
        ]
      }, testUserId);
    } catch (err: any) {
      duplicateErrorThrown = true;
    }
    assert(duplicateErrorThrown, 'Duplikasi tipe dengan nama yang sama di produk yang sama berhasil ditolak');

    // 6. Cek validasi atribut wajib: Buat tipe tanpa atribut wajib (Arus kosong) ditolak
    let missingMandatoryThrown = false;
    try {
      await CatalogService.createTipe({
        produk_id: adaptor12V.id,
        nilai_atribut: [
          { atribut_id: attrTegangan.id, nilai_angka: 12 }
        ]
      }, testUserId);
    } catch (err: any) {
      missingMandatoryThrown = true;
    }
    assert(missingMandatoryThrown, 'Pembuatan tipe tanpa atribut wajib (Arus) berhasil ditolak dengan benar');

    // 7. Pengisian opsi baru dinamis (opsi_baru) saat membuat tipe
    const tipe3 = await CatalogService.createTipe({
      produk_id: adaptor12V.id,
      sumber_id: 'tanpa_id',
      nilai_atribut: [
        { atribut_id: attrTegangan.id, nilai_angka: 12 },
        { atribut_id: attrArus.id, opsi_baru: '5A' }
      ]
    }, testUserId);

    assert(tipe3.nama_tipe === '12V / 5A', `Opsi baru "5A" langsung terintegrasi ke nama tipe: "${tipe3.nama_tipe}"`);
    assert(tipe3.mode_stok === 'jumlah', 'Mode stok "tanpa_id" otomatis menjadi "jumlah"');

    // 8. Filter Produk & Tipe
    const prods = await CatalogService.listProduk({ jenis_id: adaptorJenis.id });
    assert(prods.length === 1 && prods[0].total_tipe === 3, 'List produk menampilkan produk beserta total 3 tipe aktif');

    // 9. Cek pemblokiran hapus Jenis yang masih memiliki produk aktif
    const deleteAttempt = await CatalogService.deleteJenis(adaptorJenis.id, testUserId);
    assert(deleteAttempt.success === false, 'Hapus Jenis ditolak saat masih memiliki produk aktif');

    // 10. Update Aturan ID dengan pencatatan alasan
    const updatedRule = await CatalogService.updateAturanId(tipe1.id, {
      sumber_id: 'scan_sn',
      pola_id: '^ADP[A-Z0-9]{6}$',
      alasan: 'Standardisasi barcode pabrik baru'
    }, testUserId);

    assert(updatedRule.sumber_id === 'scan_sn' && updatedRule.pola_id === '^ADP[A-Z0-9]{6}$', 'Koreksi aturan ID tipe berhasil diperbarui');

  } catch (err: any) {
    console.error('Exception during test:', err);
    failed++;
  }

  console.log(`\n--- HASIL TEST TAHAP 2: ${passed} LULUS, ${failed} GAGAL ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTahap2Tests();
