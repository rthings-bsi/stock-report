/**
 * Parser & Helper untuk Data Stock Opname (STO) Rekonsiliasi Fisik vs SAP
 * Sesuai format ekspor laporan SAP STO (MI04 / MI07 / ZSTO / MB52).
 */

import {
  StockOpnameItem,
  StockOpnameSummary,
  StockOpnameGudangRecap,
  StockOpnameSLocRecap,
  STODifferenceStatus,
  ALL_SPINDO_GUDANGS,
} from '@/types/warehouse';

/**
 * Pembersih angka SAP:
 * - Menangani minus di belakang ("5-", "0,77-", "45-", "2,295-")
 * - Menangani format desimal koma dan pemisah ribuan titik ("2.452", "176,544", "1.234,56")
 */
export function parseSapNumber(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val === null || val === undefined) return 0;
  let s = String(val).trim();
  if (!s || s === '-' || s === '0' || s === '0,00' || s === '0.00') return 0;

  // 1. Cek tanda minus di belakang (format klasik SAP) atau depan
  let isNegative = false;
  if (s.endsWith('-')) {
    isNegative = true;
    s = s.slice(0, -1).trim();
  } else if (s.startsWith('-')) {
    isNegative = true;
    s = s.slice(1).trim();
  }

  // Bersihkan karakter non-angka kecuali titik dan koma
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return 0;

  // 2. Format SAP Indonesia / Jerman:
  // Kasus a: "1.234,56" -> Titik ribuan, koma desimal
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    // "176,544" -> desimal koma
    s = s.replace(',', '.');
  } else if (s.includes('.')) {
    // Bisa desimal atau ribuan: "2.452" (pada SAP jika 3 digit desimal atau integer ribuan)
    const parts = s.split('.');
    if (parts.length > 2) {
      // Lebih dari 1 titik -> titik ribuan
      s = s.replace(/\./g, '');
    } else if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      // e.g. "2.452" batang -> integer ribuan
      // Namun jika ada kemungkinan desimal 3 digit pada kg, cek apakah input dari kolom Qty atau Ton
      // Untuk amannya, kita cek jika parts[0] <= 3 digit dan integer
      s = parts[0] + parts[1];
    }
  }

  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

/**
 * Pembersih angka berat SAP (dengan presisi desimal 3 digit):
 * e.g. "0,77", "11,232", "176,544"
 */
export function parseSapWeight(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val === null || val === undefined) return 0;
  let s = String(val).trim();
  if (!s || s === '-' || s === '0' || s === '0,00' || s === '0.00') return 0;

  let isNegative = false;
  if (s.endsWith('-')) {
    isNegative = true;
    s = s.slice(0, -1).trim();
  } else if (s.startsWith('-')) {
    isNegative = true;
    s = s.slice(1).trim();
  }

  s = s.replace(/[^\d.,]/g, '');
  if (!s) return 0;

  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

/**
 * Normalisasi SLoc ke Kode Gudang Spindo (Gd.01 - Gd.14)
 */
export function normalizeSLocGudang(sloc: string | undefined): string {
  if (!sloc) return 'Gd.01';
  const s = String(sloc).toUpperCase().trim();

  // 5A* -> Gd.01 s/d 5N* -> Gd.14
  const match5Letter = s.match(/^5([A-N])/);
  if (match5Letter) {
    const charCode = match5Letter[1].charCodeAt(0);
    const whNumber = charCode - 65 + 1; // 'A' = 65 -> 1
    return `Gd.${String(whNumber).padStart(2, '0')}`;
  }

  // Pola GD01, GD.01, GUDANG 1, dsb.
  const matchGd = s.match(/GD\.?\s*(\d{1,2})/i);
  if (matchGd) {
    const num = parseInt(matchGd[1], 10);
    if (num >= 1 && num <= 14) {
      return `Gd.${String(num).padStart(2, '0')}`;
    }
  }

  return 'Gd.01';
}

/**
 * Ekstraksi estimasi ukuran pipa dari kode material / deskripsi
 */
export function extractPipeUkuran(material: string, desc?: string): string {
  if (desc && desc.includes('x')) {
    const matchDesc = desc.match(/(\d+[.,]?\d*)\s*x\s*(\d+[.,]?\d*)\s*(?:x\s*(\d+[.,]?\d*))?/i);
    if (matchDesc) {
      return matchDesc[0].trim();
    }
  }

  if (material) {
    const cleanMat = material.toUpperCase().trim();
    const plusSplit = cleanMat.split('+');
    if (plusSplit.length === 2 && plusSplit[1].length >= 4) {
      const lengthMm = parseInt(plusSplit[1].slice(0, 5), 10);
      if (!isNaN(lengthMm)) {
        return `L: ${(lengthMm / 10).toFixed(1)} cm`;
      }
    }
  }

  return '-';
}

/**
 * Parser file spreadsheet SAP Stock Opname
 */
export function parseStockOpnameFile(rawRows: unknown[][]): StockOpnameItem[] {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

  // Cari baris header (biasanya baris 0 s/d 10)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i];
    if (Array.isArray(row)) {
      const rowStr = row.map((cell) => String(cell || '').toLowerCase()).join(' ');
      if (
        (rowStr.includes('sloc') || rowStr.includes('storage')) &&
        (rowStr.includes('material') || rowStr.includes('batch')) &&
        (rowStr.includes('sap') || rowStr.includes('sto') || rowStr.includes('actual') || rowStr.includes('difference'))
      ) {
        headerIndex = i;
        break;
      }
    }
  }

  const dataRows = headerIndex >= 0 ? rawRows.slice(headerIndex + 1) : rawRows;
  const result: StockOpnameItem[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    if (!Array.isArray(r) || r.length < 5) continue;

    // Bersihkan nilai cell
    const cellVal = (idx: number): string => (r[idx] !== null && r[idx] !== undefined ? String(r[idx]).trim() : '');

    // Cek kolom Material & Batch tidak kosong
    const rawMaterial = cellVal(3) || cellVal(2);
    const rawBatch = cellVal(4) || cellVal(3);
    const rawSloc = cellVal(2) || cellVal(1) || '5A01';
    const rawPlant = cellVal(1) || '1105';
    const rawLabelId = cellVal(0) || `LBL-${i + 1}`;

    if (!rawMaterial && !rawBatch) continue;
    if (rawMaterial.toLowerCase() === 'material' || rawMaterial.toLowerCase() === 'plant') continue;

    // Kolom-kolom sesuai urutan SAP screenshot:
    // 5: SAP (Initial)
    // 6: Eom / Berat SAP
    // 7: Qty STO
    // 8: KG STO
    // 9: Additional STO
    // 10: KG Additional STO
    // 11: KG Difference
    // 12: Differences (Initial)
    // 13: IN
    // 14: Berat IN
    // 15: OUT
    // 16: Berat OUT
    // 17: SAP (Final)
    // 18: Actual (Final)
    // 19: Differences (Final)
    // 20: Diff Sign
    const sapInitialQty = parseSapNumber(r[5]);
    const sapEomWeight = parseSapWeight(r[6]);
    const qtySTO = parseSapNumber(r[7]);
    const kgSTO = parseSapWeight(r[8]);
    const additionalSTO = parseSapNumber(r[9]);
    const kgAdditionalSTO = parseSapWeight(r[10]);
    const kgDiff = parseSapWeight(r[11]);
    const differencesQty = parseSapNumber(r[12]);
    const qtyIn = parseSapNumber(r[13]);
    const kgIn = parseSapWeight(r[14]);
    const qtyOut = parseSapNumber(r[15]);
    const kgOut = parseSapWeight(r[16]);
    const sapFinalQty = r[17] !== undefined ? parseSapNumber(r[17]) : sapInitialQty;
    const actualFinalQty = r[18] !== undefined ? parseSapNumber(r[18]) : qtySTO + additionalSTO;
    const differencesFinalQty = r[19] !== undefined ? parseSapNumber(r[19]) : actualFinalQty - sapFinalQty;
    const diffSignRaw = cellVal(20);

    // Penentuan Status:
    // Jika diff < 0 atau ada tanda (-) -> SELISIH_MINUS
    // Jika diff > 0 atau ada tanda (+) -> SELISIH_PLUS
    // Jika diff === 0 -> SESUAI
    let status: STODifferenceStatus = 'SESUAI';
    if (differencesFinalQty < 0 || diffSignRaw.includes('(-)') || (diffSignRaw === '-' && differencesFinalQty !== 0)) {
      status = 'SELISIH_MINUS';
    } else if (differencesFinalQty > 0 || (diffSignRaw.includes('(+)') && differencesFinalQty !== 0)) {
      status = 'SELISIH_PLUS';
    } else {
      status = 'SESUAI';
    }

    const gudang = normalizeSLocGudang(rawSloc);
    const uom = sapEomWeight > 0 ? 'Ton' : 'Btg';

    // Estimasi KG / Ton selisih final
    let kgDiffFinal = kgDiff;
    if (kgDiffFinal === 0 && differencesFinalQty !== 0 && sapInitialQty !== 0 && sapEomWeight !== 0) {
      kgDiffFinal = (differencesFinalQty / Math.abs(sapInitialQty)) * sapEomWeight;
    }
    const tonDiffFinal = kgDiffFinal / 1000;

    result.push({
      id: `sto-${rawSloc}-${rawMaterial}-${rawBatch}-${i}`,
      labelId: rawLabelId,
      plant: rawPlant,
      sloc: rawSloc.toUpperCase(),
      gudang,
      material: rawMaterial.toUpperCase(),
      materialDescription: cellVal(21) || `Pipa Spindo ${rawMaterial}`,
      ukuran: extractPipeUkuran(rawMaterial, cellVal(21)),
      batch: rawBatch.toUpperCase(),
      sapInitialQty,
      uom,
      qtySTO,
      kgSTO,
      additionalSTO,
      kgAdditionalSTO,
      kgDifference: kgDiff,
      differencesQty,
      qtyIn,
      kgIn,
      qtyOut,
      kgOut,
      sapFinalQty,
      actualFinalQty,
      differencesFinalQty,
      diffSign: diffSignRaw || (status === 'SESUAI' ? '(0)' : status === 'SELISIH_MINUS' ? '(-)' : '(+)'),
      kgDiffFinal,
      tonDiffFinal,
      status,
      remarks: cellVal(22) || '',
    });
  }

  return result;
}

/**
 * Hitung ringkasan statistik KPI Stock Opname
 */
export function calculateSTOSummary(items: StockOpnameItem[]): StockOpnameSummary {
  const totalItems = items.length;
  let matchingItems = 0;
  let minusItems = 0;
  let plusItems = 0;
  let totalSapQty = 0;
  let totalActualQty = 0;
  let totalSapTon = 0;
  let totalActualTon = 0;
  let totalMinusTon = 0;
  let totalPlusTon = 0;

  for (const item of items) {
    totalSapQty += item.sapFinalQty;
    totalActualQty += item.actualFinalQty;

    // Tonase estimasi
    const sapTon = Math.abs(item.kgSTO > 0 ? (item.kgSTO / 1000) * (item.sapFinalQty / Math.max(item.actualFinalQty, 1)) : item.sapInitialQty * 0.05);
    const actualTon = Math.abs(item.kgSTO > 0 ? item.kgSTO / 1000 : item.actualFinalQty * 0.05);
    totalSapTon += sapTon;
    totalActualTon += actualTon;

    if (item.status === 'SESUAI') {
      matchingItems++;
    } else if (item.status === 'SELISIH_MINUS') {
      minusItems++;
      totalMinusTon += Math.abs(item.tonDiffFinal || (item.differencesFinalQty * 0.05));
    } else if (item.status === 'SELISIH_PLUS') {
      plusItems++;
      totalPlusTon += Math.abs(item.tonDiffFinal || (item.differencesFinalQty * 0.05));
    }
  }

  const accuracyRate = totalItems > 0 ? (matchingItems / totalItems) * 100 : 100;
  const netVarianceQty = totalActualQty - totalSapQty;
  const netVarianceTon = totalActualTon - totalSapTon;

  return {
    totalItems,
    matchingItems,
    minusItems,
    plusItems,
    accuracyRate,
    totalSapQty,
    totalActualQty,
    netVarianceQty,
    totalSapTon,
    totalActualTon,
    netVarianceTon,
    totalMinusTon,
    totalPlusTon,
  };
}

/**
 * Hitung ringkasan STO per Gudang (Gd.01 - Gd.14)
 */
export function calculateSTOGudangRecap(items: StockOpnameItem[]): StockOpnameGudangRecap[] {
  const map = new Map<string, {
    matchingCount: number;
    minusCount: number;
    plusCount: number;
    sapQty: number;
    actualQty: number;
    sapTon: number;
    actualTon: number;
    varianceTon: number;
  }>();

  // Inisialisasi seluruh gudang Spindo
  for (const g of ALL_SPINDO_GUDANGS) {
    map.set(g, {
      matchingCount: 0,
      minusCount: 0,
      plusCount: 0,
      sapQty: 0,
      actualQty: 0,
      sapTon: 0,
      actualTon: 0,
      varianceTon: 0,
    });
  }

  for (const item of items) {
    let entry = map.get(item.gudang);
    if (!entry) {
      entry = {
        matchingCount: 0,
        minusCount: 0,
        plusCount: 0,
        sapQty: 0,
        actualQty: 0,
        sapTon: 0,
        actualTon: 0,
        varianceTon: 0,
      };
      map.set(item.gudang, entry);
    }

    if (item.status === 'SESUAI') entry.matchingCount++;
    else if (item.status === 'SELISIH_MINUS') entry.minusCount++;
    else if (item.status === 'SELISIH_PLUS') entry.plusCount++;

    entry.sapQty += item.sapFinalQty;
    entry.actualQty += item.actualFinalQty;

    const approxWeightTon = Math.abs(item.kgSTO > 0 ? item.kgSTO / 1000 : item.actualFinalQty * 0.05);
    entry.actualTon += approxWeightTon;
    entry.sapTon += Math.abs(item.sapFinalQty * (item.actualFinalQty > 0 ? approxWeightTon / item.actualFinalQty : 0.05));
    entry.varianceTon += item.tonDiffFinal || (item.differencesFinalQty * 0.05);
  }

  const result: StockOpnameGudangRecap[] = [];
  for (const [gudang, val] of map.entries()) {
    const totalCount = val.matchingCount + val.minusCount + val.plusCount;
    result.push({
      gudang,
      itemCount: totalCount,
      matchingCount: val.matchingCount,
      minusCount: val.minusCount,
      plusCount: val.plusCount,
      accuracyRate: totalCount > 0 ? (val.matchingCount / totalCount) * 100 : 100,
      sapQty: val.sapQty,
      actualQty: val.actualQty,
      varianceQty: val.actualQty - val.sapQty,
      sapTon: val.sapTon,
      actualTon: val.actualTon,
      varianceTon: val.varianceTon,
    });
  }

  return result.sort((a, b) => a.gudang.localeCompare(b.gudang));
}

/**
 * Hitung ringkasan STO per SLoc
 */
export function calculateSTOSLocRecap(items: StockOpnameItem[]): StockOpnameSLocRecap[] {
  const map = new Map<string, {
    gudang: string;
    matchingCount: number;
    minusCount: number;
    plusCount: number;
    varianceQty: number;
    varianceTon: number;
  }>();

  for (const item of items) {
    const key = item.sloc;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        gudang: item.gudang,
        matchingCount: 0,
        minusCount: 0,
        plusCount: 0,
        varianceQty: 0,
        varianceTon: 0,
      };
      map.set(key, entry);
    }

    if (item.status === 'SESUAI') entry.matchingCount++;
    else if (item.status === 'SELISIH_MINUS') entry.minusCount++;
    else if (item.status === 'SELISIH_PLUS') entry.plusCount++;

    entry.varianceQty += item.differencesFinalQty;
    entry.varianceTon += item.tonDiffFinal;
  }

  const result: StockOpnameSLocRecap[] = [];
  for (const [sloc, val] of map.entries()) {
    result.push({
      sloc,
      gudang: val.gudang,
      itemCount: val.matchingCount + val.minusCount + val.plusCount,
      matchingCount: val.matchingCount,
      minusCount: val.minusCount,
      plusCount: val.plusCount,
      varianceQty: val.varianceQty,
      varianceTon: val.varianceTon,
    });
  }

  // Urutkan berdasarkan selisih absolut terbesar
  return result.sort((a, b) => Math.abs(b.varianceQty) - Math.abs(a.varianceQty));
}

/**
 * Generator data awal realistis untuk menu Stock Opname
 * Berdasarkan sample konkret dari screenshot pengguna (Plant 1105, SLoc 5M08)
 * dan sebaran item di gudang-gudang lain.
 */
export function generateMockStockOpnameData(): StockOpnameItem[] {
  const screenshotRows: Omit<StockOpnameItem, 'id' | 'gudang' | 'uom' | 'tonDiffFinal'>[] = [
    {
      labelId: 'LBL-01',
      plant: '1105',
      sloc: '5M08',
      material: 'UAB12AOA0100+02920',
      materialDescription: 'PM 11ACB MILL CUTL 22,2x1,00x2920',
      ukuran: '22,2x1,00x2920',
      batch: '5252894HIA',
      sapInitialQty: 5,
      qtySTO: 5,
      kgSTO: 0.770,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 0,
      differencesQty: 0,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 5,
      actualFinalQty: 5,
      differencesFinalQty: 0,
      diffSign: '(+)',
      kgDiffFinal: 0,
      status: 'SESUAI',
    },
    {
      labelId: 'LBL-02',
      plant: '1105',
      sloc: '5M08',
      material: 'UAB12AOA0100+02920',
      materialDescription: 'PM 11ACB MILL CUTL 22,2x1,00x2920',
      ukuran: '22,2x1,00x2920',
      batch: '5252894HIC',
      sapInitialQty: -5,
      qtySTO: 0,
      kgSTO: 0,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: -0.770,
      differencesQty: -5,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: -5,
      actualFinalQty: 0,
      differencesFinalQty: -5,
      diffSign: '(-)',
      kgDiffFinal: -0.770,
      status: 'SELISIH_MINUS',
    },
    {
      labelId: 'LBL-03',
      plant: '1105',
      sloc: '5M08',
      material: 'UAB12BAA0120+00715',
      materialDescription: 'PM 11ACB MILL CUTL 25,4x1,20x715',
      ukuran: '25,4x1,20x715',
      batch: '5260205S0C',
      sapInitialQty: 216,
      qtySTO: 216,
      kgSTO: 11.232,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 0,
      differencesQty: 0,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 216,
      actualFinalQty: 216,
      differencesFinalQty: 0,
      diffSign: '(+)',
      kgDiffFinal: 0,
      status: 'SESUAI',
    },
    {
      labelId: 'LBL-04',
      plant: '1105',
      sloc: '5M08',
      material: 'UAB12BAA0120+00755',
      materialDescription: 'PM 11ACB MILL CUTL 25,4x1,20x755',
      ukuran: '25,4x1,20x755',
      batch: '5260205S0C',
      sapInitialQty: 69,
      qtySTO: 0,
      kgSTO: 0,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 3.795,
      differencesQty: 69,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 69,
      actualFinalQty: 0,
      differencesFinalQty: 69,
      diffSign: '(+)',
      kgDiffFinal: 3.795,
      status: 'SELISIH_PLUS',
    },
    {
      labelId: 'LBL-05',
      plant: '1105',
      sloc: '5M08',
      material: 'UAB12BCA0120+00920',
      materialDescription: 'PM 11ACB MILL CUTL 28,6x1,20x920',
      ukuran: '28,6x1,20x920',
      batch: '5252899S0C',
      sapInitialQty: 170,
      qtySTO: 170,
      kgSTO: 12.750,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 0,
      differencesQty: 0,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 170,
      actualFinalQty: 170,
      differencesFinalQty: 0,
      diffSign: '(+)',
      kgDiffFinal: 0,
      status: 'SESUAI',
    },
    {
      labelId: 'LBL-06',
      plant: '1105',
      sloc: '5M08',
      material: 'X1B12BAA0050+01650',
      materialDescription: 'PM 11ACB MILL CUTL 25,4x0,50x1650',
      ukuran: '25,4x0,50x1650',
      batch: '5240973S0C',
      sapInitialQty: -45,
      qtySTO: 0,
      kgSTO: 0,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: -2.295,
      differencesQty: -45,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: -45,
      actualFinalQty: 0,
      differencesFinalQty: -45,
      diffSign: '(-)',
      kgDiffFinal: -2.295,
      status: 'SELISIH_MINUS',
    },
    {
      labelId: 'LBL-07',
      plant: '1105',
      sloc: '5M08',
      material: 'X1B12BAA0110+02640',
      materialDescription: 'PM 11ACB MILL CUTL 25,4x1,10x2640',
      ukuran: '25,4x1,10x2640',
      batch: '5242302HJC',
      sapInitialQty: 130,
      qtySTO: 0,
      kgSTO: 0,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 22.620,
      differencesQty: 130,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 130,
      actualFinalQty: 0,
      differencesFinalQty: 130,
      diffSign: '(+)',
      kgDiffFinal: 22.620,
      status: 'SELISIH_PLUS',
    },
    {
      labelId: 'LBL-08',
      plant: '1105',
      sloc: '5M08',
      material: 'X1B12BAA0110+02710',
      materialDescription: 'PM 11ACB MILL CUTL 25,4x1,10x2710',
      ukuran: '25,4x1,10x2710',
      batch: '5242463HJA',
      sapInitialQty: 69,
      qtySTO: 69,
      kgSTO: 12.351,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 0,
      differencesQty: 0,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 69,
      actualFinalQty: 69,
      differencesFinalQty: 0,
      diffSign: '(+)',
      kgDiffFinal: 0,
      status: 'SESUAI',
    },
    {
      labelId: 'LBL-09',
      plant: '1105',
      sloc: '5M08',
      material: 'X1B13AKA0100+00850',
      materialDescription: 'PM 11ACB MILL CUTL 15,9x1,00x850',
      ukuran: '15,9x1,00x850',
      batch: '5250646S0A',
      sapInitialQty: 165,
      qtySTO: 0,
      kgSTO: 0,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 5.115,
      differencesQty: 165,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 165,
      actualFinalQty: 0,
      differencesFinalQty: 165,
      diffSign: '(+)',
      kgDiffFinal: 5.115,
      status: 'SELISIH_PLUS',
    },
    {
      labelId: 'LBL-10',
      plant: '1105',
      sloc: '5M08',
      material: 'X1B13AKA0100+00850',
      materialDescription: 'PM 11ACB MILL CUTL 15,9x1,00x850',
      ukuran: '15,9x1,00x850',
      batch: '5250646S0C',
      sapInitialQty: 160,
      qtySTO: 160,
      kgSTO: 4.960,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 0,
      differencesQty: 0,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 160,
      actualFinalQty: 160,
      differencesFinalQty: 0,
      diffSign: '(+)',
      kgDiffFinal: 0,
      status: 'SESUAI',
    },
    {
      labelId: 'LBL-11',
      plant: '1105',
      sloc: '5M08',
      material: 'X1B13AKA0110+01800',
      materialDescription: 'PM 11ACB MILL CUTL 15,9x1,10x1800',
      ukuran: '15,9x1,10x1800',
      batch: '5242446S0A',
      sapInitialQty: 2452,
      qtySTO: 2452,
      kgSTO: 176.544,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 0,
      differencesQty: 0,
      qtyIn: 1,
      kgIn: 0.072,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 2453,
      actualFinalQty: 2453,
      differencesFinalQty: 0,
      diffSign: '(+)',
      kgDiffFinal: 0,
      status: 'SESUAI',
    },
    {
      labelId: 'LBL-12',
      plant: '1105',
      sloc: '5M08',
      material: 'X1K13AAL0150+04810',
      materialDescription: 'PM 11ACB MILL CUTL 38,1x1,50x4810',
      ukuran: '38,1x1,50x4810',
      batch: '5250754B0A',
      sapInitialQty: 73,
      qtySTO: 0,
      kgSTO: 0,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 47.669,
      differencesQty: 73,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 73,
      actualFinalQty: 0,
      differencesFinalQty: 73,
      diffSign: '(+)',
      kgDiffFinal: 47.669,
      status: 'SELISIH_PLUS',
    },
    {
      labelId: 'LBL-13',
      plant: '1105',
      sloc: '5M08',
      material: 'X1K13AAL0150+04810',
      materialDescription: 'PM 11ACB MILL CUTL 38,1x1,50x4810',
      ukuran: '38,1x1,50x4810',
      batch: '5251626B0A',
      sapInitialQty: 47,
      qtySTO: 0,
      kgSTO: 0,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 30.691,
      differencesQty: 47,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 47,
      actualFinalQty: 0,
      differencesFinalQty: 47,
      diffSign: '(+)',
      kgDiffFinal: 30.691,
      status: 'SELISIH_PLUS',
    },
    {
      labelId: 'LBL-14',
      plant: '1105',
      sloc: '5M08',
      material: 'X3B12AKA0140+00310',
      materialDescription: 'PM 11ACB MILL CUTL 15,9x1,40x310',
      ukuran: '15,9x1,40x310',
      batch: '5261290S0C',
      sapInitialQty: 997,
      qtySTO: 997,
      kgSTO: 15.952,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 0,
      differencesQty: 0,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 997,
      actualFinalQty: 997,
      differencesFinalQty: 0,
      diffSign: '(+)',
      kgDiffFinal: 0,
      status: 'SESUAI',
    },
    {
      labelId: 'LBL-15',
      plant: '1105',
      sloc: '5M08',
      material: 'XAB10BAA0150+02500',
      materialDescription: 'PM 11ACB MILL CUTL 25,4x1,50x2500',
      ukuran: '25,4x1,50x2500',
      batch: '5253017HLA',
      sapInitialQty: 69,
      qtySTO: 69,
      kgSTO: 15.249,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: 0,
      differencesQty: 0,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: 69,
      actualFinalQty: 69,
      differencesFinalQty: 0,
      diffSign: '(+)',
      kgDiffFinal: 0,
      status: 'SESUAI',
    },
  ];

  // Tambahkan variasi untuk gudang lain (Gd.01, Gd.02, Gd.03, Gd.04, Gd.05, Gd.10, Gd.11, Gd.12, Gd.14)
  const otherGudangs = [
    { sloc: '5A01', wh: 'Gd.01', mat: 'X1B26AKO0150+04410', desc: 'PM 11ACB MILL CUTL 17,3x1,50x441,0', qty: 26, ton: 6.708 },
    { sloc: '5A02', wh: 'Gd.01', mat: 'X1B26CBG0070+01650', desc: 'PM 11ACB MILL CUTL 53,0x0,70x165,0', qty: 40, ton: 5.960 },
    { sloc: '5B01', wh: 'Gd.02', mat: 'X1B26CBG0070+02000', desc: 'PM 11ACB MILL CUTL 53,0x0,70x200,0', qty: 137, ton: 24.797 },
    { sloc: '5B02', wh: 'Gd.02', mat: 'X1B26CBG0070+02090', desc: 'PM 11ACB MILL CUTL 53,0x0,70x209,0', qty: 111, ton: 20.979 },
    { sloc: '5C01', wh: 'Gd.03', mat: 'X1B26CBG0070+02200', desc: 'PM 11ACB MILL CUTL 53,0x0,70x220,0', qty: 50, ton: 10.250 },
    { sloc: '5C02', wh: 'Gd.03', mat: 'X1B26CBG0070+02270', desc: 'PM 11ACB MILL CUTL 53,0x0,70x227,0', qty: 59, ton: 12.095, isDiffMinus: true },
    { sloc: '5D01', wh: 'Gd.04', mat: 'X1B26CBG0070+02320', desc: 'PM 11ACB MILL CUTL 53,0x0,70x232,0', qty: 143, ton: 29.887 },
    { sloc: '5E01', wh: 'Gd.05', mat: 'X1B26CBG0070+02400', desc: 'PM 11ACB MILL CUTL 53,0x0,70x240,0', qty: 980, ton: 212.660 },
    { sloc: '5J01', wh: 'Gd.10', mat: 'UAB12BAA0120+01500', desc: 'PM 11ACB MILL CUTL 25,4x1,20x1500', qty: 180, ton: 25.400 },
    { sloc: '5K01', wh: 'Gd.11', mat: 'UAB12BAA0120+02000', desc: 'PM 11ACB MILL CUTL 25,4x1,20x2000', qty: 320, ton: 48.200 },
    { sloc: '5K02', wh: 'Gd.11', mat: 'UAB12BCA0120+01800', desc: 'PM 11ACB MILL CUTL 28,6x1,20x1800', qty: 85, ton: 14.800, isDiffPlus: true },
    { sloc: '5L01', wh: 'Gd.12', mat: 'X1B12BAA0110+03000', desc: 'PM 11ACB MILL CUTL 25,4x1,10x3000', qty: 240, ton: 38.500 },
    { sloc: '5N01', wh: 'Gd.14', mat: 'X1B13AKA0100+02500', desc: 'PM 11ACB MILL CUTL 15,9x1,00x2500', qty: 150, ton: 18.200 },
  ];

  const fullItems: StockOpnameItem[] = [];

  // Konversi screenshot items
  screenshotRows.forEach((row, idx) => {
    fullItems.push({
      ...row,
      id: `sto-mock-ss-${idx + 1}`,
      gudang: 'Gd.13',
      uom: 'Ton',
      tonDiffFinal: row.kgDiffFinal / 1000,
    });
  });

  // Tambahkan item gudang lain
  otherGudangs.forEach((og, idx) => {
    const isMinus = og.isDiffMinus;
    const isPlus = og.isDiffPlus;
    const diffQty = isMinus ? -Math.round(og.qty * 0.1) : isPlus ? Math.round(og.qty * 0.15) : 0;
    const status: STODifferenceStatus = isMinus ? 'SELISIH_MINUS' : isPlus ? 'SELISIH_PLUS' : 'SESUAI';
    const diffTon = (diffQty / og.qty) * og.ton;

    fullItems.push({
      id: `sto-mock-og-${idx + 1}`,
      labelId: `LBL-${20 + idx}`,
      plant: '1105',
      sloc: og.sloc,
      gudang: og.wh,
      material: og.mat,
      materialDescription: og.desc,
      ukuran: extractPipeUkuran(og.mat, og.desc),
      batch: `526${String(1000 + idx)}S0C`,
      sapInitialQty: og.qty,
      uom: 'Ton',
      qtySTO: og.qty + diffQty,
      kgSTO: (og.ton + diffTon) * 1000,
      additionalSTO: 0,
      kgAdditionalSTO: 0,
      kgDifference: diffTon * 1000,
      differencesQty: diffQty,
      qtyIn: 0,
      kgIn: 0,
      qtyOut: 0,
      kgOut: 0,
      sapFinalQty: og.qty,
      actualFinalQty: og.qty + diffQty,
      differencesFinalQty: diffQty,
      diffSign: status === 'SESUAI' ? '(0)' : status === 'SELISIH_MINUS' ? '(-)' : '(+)',
      kgDiffFinal: diffTon * 1000,
      tonDiffFinal: diffTon,
      status,
      remarks: status === 'SESUAI' ? 'Stock Akurat' : status === 'SELISIH_MINUS' ? 'Kurang di fisik' : 'Lebih di fisik',
    });
  });

  return fullItems;
}
