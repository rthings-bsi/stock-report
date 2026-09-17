/**
 * Parser & Helper untuk Data Stock Opname (STO) Rekonsiliasi Actual vs SAP
 * Sesuai format ekspor laporan SAP STO (MI04 / MI07 / ZSTO / MB52).
 */

import {
  StockOpnameItem,
  StockOpnameSummary,
  StockOpnameGudangRecap,
  StockOpnameSLocRecap,
  StockOpnamePeriodSummary,
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

    // Deviasi Actual vs Stock SAP:
    // Actual > SAP -> Surplus (+)
    // Actual < SAP -> Defisit (-) (misal 5M17 tidak ada STO / actual 0, stock SAP 14 -> defisit -14)
    // Actual === SAP -> Sesuai (0)
    const differencesFinalQty = actualFinalQty - sapFinalQty;

    let status: STODifferenceStatus = 'SESUAI';
    let diffSign = '(0)';
    if (differencesFinalQty < 0) {
      status = 'SELISIH_MINUS';
      diffSign = '(-)';
    } else if (differencesFinalQty > 0) {
      status = 'SELISIH_PLUS';
      diffSign = '(+)';
    }

    const gudang = normalizeSLocGudang(rawSloc);
    const uom = sapEomWeight > 0 ? 'Ton' : 'Btg';

    // Estimasi KG / Ton selisih final (konsisten: bernilai negatif jika defisit, positif jika surplus)
    let kgDiffFinal = 0;
    if (differencesFinalQty !== 0) {
      if (kgDiff !== 0) {
        // Kolom KG Difference di SAP dihitung SAP - Actual, sehingga dibalik untuk Actual - SAP
        kgDiffFinal = -kgDiff;
      } else if (sapInitialQty !== 0 && sapEomWeight !== 0) {
        kgDiffFinal = (differencesFinalQty / Math.abs(sapInitialQty)) * sapEomWeight;
      } else if (qtySTO > 0 && kgSTO > 0) {
        kgDiffFinal = differencesFinalQty * (kgSTO / qtySTO);
      } else if (qtyIn > 0 && kgIn > 0) {
        kgDiffFinal = differencesFinalQty * (kgIn / qtyIn);
      } else if (qtyOut > 0 && kgOut > 0) {
        kgDiffFinal = differencesFinalQty * (kgOut / qtyOut);
      } else {
        kgDiffFinal = differencesFinalQty * 2.5;
      }
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
      diffSign,
      kgDiffFinal,
      tonDiffFinal,
      status,
      remarks: cellVal(22) || '',
    });
  }

  return result;
}

/**
 * Helper untuk menghitung berat dan tonase item STO secara presisi
 * Menggunakan berat per batang riil dari file (KG STO / Qty STO, KG Difference, atau Mutasi)
 * bukan fallback statis 0.05 Ton (50 kg) yang mendistorsi gudang pipa kecil.
 */
export function getItemWeights(item: StockOpnameItem): {
  unitWeightKg: number;
  actualWeightKg: number;
  sapWeightKg: number;
  actualTon: number;
  sapTon: number;
  diffTon: number;
} {
  // 1. Dapatkan berat satuan (kg/pcs) dari data yang tersedia
  let unitWeightKg = 0;
  if (item.qtySTO > 0 && item.kgSTO > 0) {
    unitWeightKg = item.kgSTO / item.qtySTO;
  } else if (item.sapInitialQty > 0 && (item.kgSTO + item.kgDifference) > 0) {
    unitWeightKg = (item.kgSTO + item.kgDifference) / item.sapInitialQty;
  } else if (item.differencesQty !== 0 && item.kgDifference !== 0) {
    unitWeightKg = Math.abs(item.kgDifference / item.differencesQty);
  } else if (item.qtyIn > 0 && item.kgIn > 0) {
    unitWeightKg = item.kgIn / item.qtyIn;
  } else if (item.qtyOut > 0 && item.kgOut > 0) {
    unitWeightKg = item.kgOut / item.qtyOut;
  }

  // 2. Hitung berat Actual (KG)
  let actualWeightKg = 0;
  if (item.kgSTO > 0 || item.kgAdditionalSTO > 0 || item.kgIn > 0 || item.kgOut > 0) {
    actualWeightKg = (item.kgSTO + item.kgAdditionalSTO) + item.kgIn - item.kgOut;
  } else if (unitWeightKg > 0) {
    actualWeightKg = item.actualFinalQty * unitWeightKg;
  }

  // 3. Hitung berat SAP (KG)
  let sapWeightKg = 0;
  if (item.kgDifference !== 0 || item.kgSTO > 0) {
    const sapInitialKg = (item.kgSTO + item.kgAdditionalSTO) + item.kgDifference;
    sapWeightKg = sapInitialKg + item.kgIn - item.kgOut;
  } else if (unitWeightKg > 0) {
    sapWeightKg = item.sapFinalQty * unitWeightKg;
  }

  // 4. Hitung selisih berat (Actual - SAP)
  let diffWeightKg = 0;
  if (item.differencesFinalQty === 0) {
    diffWeightKg = 0;
    if (actualWeightKg > 0 && sapWeightKg === 0) sapWeightKg = actualWeightKg;
    if (sapWeightKg > 0 && actualWeightKg === 0) actualWeightKg = sapWeightKg;
  } else {
    diffWeightKg = actualWeightKg - sapWeightKg;
  }

  const actualTon = Math.abs(actualWeightKg) / 1000;
  const sapTon = Math.abs(sapWeightKg) / 1000;
  const diffTon = item.tonDiffFinal !== undefined && item.tonDiffFinal !== 0 ? item.tonDiffFinal : (diffWeightKg / 1000);

  return { unitWeightKg, actualWeightKg, sapWeightKg, actualTon, sapTon, diffTon };
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

    const weights = getItemWeights(item);
    totalSapTon += weights.sapTon;
    totalActualTon += weights.actualTon;

    if (item.status === 'SESUAI') {
      matchingItems++;
    } else if (item.status === 'SELISIH_MINUS') {
      minusItems++;
      totalMinusTon += Math.abs(weights.diffTon);
    } else if (item.status === 'SELISIH_PLUS') {
      plusItems++;
      totalPlusTon += Math.abs(weights.diffTon);
    }
  }

  const accuracyRate = totalItems > 0 ? (matchingItems / totalItems) * 100 : 0;
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
    matchingTon: number;
    minusTon: number;
    plusTon: number;
    matchingQty: number;
    minusQty: number;
    plusQty: number;
    sapItemCount: number;
    actualItemCount: number;
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
      matchingTon: 0,
      minusTon: 0,
      plusTon: 0,
      matchingQty: 0,
      minusQty: 0,
      plusQty: 0,
      sapItemCount: 0,
      actualItemCount: 0,
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
        matchingTon: 0,
        minusTon: 0,
        plusTon: 0,
        matchingQty: 0,
        minusQty: 0,
        plusQty: 0,
        sapItemCount: 0,
        actualItemCount: 0,
      };
      map.set(item.gudang, entry);
    }

    const weights = getItemWeights(item);
    const diffTon = Math.abs(weights.diffTon);
    const diffQty = Math.abs(item.differencesFinalQty);

    if (item.status === 'SESUAI') {
      entry.matchingCount++;
      entry.matchingQty += item.actualFinalQty;
      entry.matchingTon += weights.actualTon;
    } else if (item.status === 'SELISIH_MINUS') {
      entry.minusCount++;
      entry.minusQty += diffQty;
      entry.minusTon += diffTon;
    } else if (item.status === 'SELISIH_PLUS') {
      entry.plusCount++;
      entry.plusQty += diffQty;
      entry.plusTon += diffTon;
    }

    entry.sapQty += item.sapFinalQty;
    entry.actualQty += item.actualFinalQty;

    if (item.sapFinalQty !== 0 || item.sapInitialQty > 0) {
      entry.sapItemCount++;
    }
    if (item.actualFinalQty !== 0 || item.qtySTO > 0 || item.additionalSTO > 0) {
      entry.actualItemCount++;
    }

    entry.actualTon += weights.actualTon;
    entry.sapTon += weights.sapTon;
    entry.varianceTon += weights.diffTon;
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
      matchingTon: val.matchingTon,
      minusTon: val.minusTon,
      plusTon: val.plusTon,
      matchingQty: val.matchingQty,
      minusQty: val.minusQty,
      plusQty: val.plusQty,
      sapItemCount: val.sapItemCount,
      actualItemCount: val.actualItemCount,
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
    sapQty: number;
    actualQty: number;
    sapTon: number;
    actualTon: number;
    sapItemCount: number;
    actualItemCount: number;
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
        sapQty: 0,
        actualQty: 0,
        sapTon: 0,
        actualTon: 0,
        sapItemCount: 0,
        actualItemCount: 0,
      };
      map.set(key, entry);
    }

    const weights = getItemWeights(item);

    if (item.status === 'SESUAI') entry.matchingCount++;
    else if (item.status === 'SELISIH_MINUS') entry.minusCount++;
    else if (item.status === 'SELISIH_PLUS') entry.plusCount++;

    if (item.sapFinalQty !== 0 || item.sapInitialQty > 0) entry.sapItemCount++;
    if (item.actualFinalQty !== 0 || item.qtySTO > 0 || item.additionalSTO > 0) entry.actualItemCount++;

    entry.varianceQty += item.differencesFinalQty;
    entry.varianceTon += weights.diffTon;
    entry.sapQty += item.sapFinalQty;
    entry.actualQty += item.actualFinalQty;
    entry.actualTon += weights.actualTon;
    entry.sapTon += weights.sapTon;
  }

  const result: StockOpnameSLocRecap[] = [];
  for (const [sloc, val] of map.entries()) {
    const totalCount = val.matchingCount + val.minusCount + val.plusCount;
    result.push({
      sloc,
      gudang: val.gudang,
      itemCount: totalCount,
      matchingCount: val.matchingCount,
      minusCount: val.minusCount,
      plusCount: val.plusCount,
      accuracyRate: totalCount > 0 ? (val.matchingCount / totalCount) * 100 : 100,
      varianceQty: val.varianceQty,
      varianceTon: val.varianceTon,
      sapQty: val.sapQty,
      actualQty: val.actualQty,
      sapTon: val.sapTon,
      actualTon: val.actualTon,
      sapItemCount: val.sapItemCount,
      actualItemCount: val.actualItemCount,
    });
  }

  // Urutkan berdasarkan selisih absolut terbesar
  return result.sort((a, b) => Math.abs(b.varianceQty) - Math.abs(a.varianceQty));
}

/**
 * Hitung ringkasan STO per Periode (untuk grafik tren & komparasi antar periode/snapshot)
 */
export function calculateSTOPeriodSummary(
  items: StockOpnameItem[],
  periodKey: string,
  lastUpdated: string,
  customLabel?: string
): StockOpnamePeriodSummary {
  const summary = calculateSTOSummary(items);
  const gudangs = calculateSTOGudangRecap(items);

  let sapItems = 0;
  let actualItems = 0;
  for (const g of gudangs) {
    sapItems += g.sapItemCount ?? 0;
    actualItems += g.actualItemCount ?? 0;
  }

  const gudangBreakdown: Record<string, {
    itemCount: number;
    matchingCount: number;
    accuracyRate: number;
    sapQty: number;
    actualQty: number;
    sapTon: number;
    actualTon: number;
    varianceTon: number;
  }> = {};

  for (const g of gudangs) {
    gudangBreakdown[g.gudang] = {
      itemCount: g.itemCount,
      matchingCount: g.matchingCount,
      accuracyRate: Number(g.accuracyRate.toFixed(1)),
      sapQty: g.sapQty,
      actualQty: g.actualQty,
      sapTon: Number(g.sapTon.toFixed(2)),
      actualTon: Number(g.actualTon.toFixed(2)),
      varianceTon: Number(g.varianceTon.toFixed(2)),
    };
  }

  // Format label periode: "17 Sep 2026", "19 Jul 2026", dst.
  let label = customLabel || '';
  if (!label) {
    const match = periodKey.match(/snap_(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, yr, mo, da] = match;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthName = months[parseInt(mo, 10) - 1] || mo;
      label = `${parseInt(da, 10)} ${monthName} ${yr}`;
    } else if (lastUpdated) {
      const parts = lastUpdated.split(/[/, ]/);
      if (parts.length >= 3) {
        const [d, m, y] = parts;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const monthName = months[parseInt(m, 10) - 1] || m;
        if (y && monthName) label = `${d} ${monthName} ${y}`;
      }
    }
    if (!label) label = periodKey.replace('snap_', '');
  }

  return {
    periodKey,
    label,
    lastUpdated,
    totalItems: summary.totalItems,
    matchingCount: summary.matchingItems,
    minusCount: summary.minusItems,
    plusCount: summary.plusItems,
    accuracyRate: Number(summary.accuracyRate.toFixed(1)),
    sapQty: summary.totalSapQty,
    actualQty: summary.totalActualQty,
    varianceQty: summary.netVarianceQty,
    sapTon: Number(summary.totalSapTon.toFixed(2)),
    actualTon: Number(summary.totalActualTon.toFixed(2)),
    varianceTon: Number(summary.netVarianceTon.toFixed(2)),
    sapItemCount: sapItems,
    actualItemCount: actualItems,
    gudangBreakdown,
  };
}

/**
 * Data dummy dinonaktifkan (kosong).
 */
export function generateMockStockOpnameData(): StockOpnameItem[] {
  return [];
}
