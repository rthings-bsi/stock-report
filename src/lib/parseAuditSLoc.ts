/**
 * Parser & Helper untuk Data Audit SLoc (Rekonsiliasi 14 Kolom SAP)
 * Sesuai format laporan SAP:
 * [0: Label, 1: Plant, 2: SLoc, 3: Material, 4: Batch, 5: SAP (Awal), 6: Eom (KG EOM),
 *  7: Qty Audit, 8: KG Audit, 9: Diff KG Audit, 10: Diff (Qty Diff Awal),
 *  11: SAP (Final), 12: Actual (Final), 13: Diff Audit (Final Qty Diff)]
 */

import {
  AuditSLocItem,
  AuditSLocDifferenceStatus,
  AuditSLocSummary,
  AuditSLocGudangRecap,
  AuditSLocRecap,
  AuditSLocPeriodSummary,
  ALL_SPINDO_GUDANGS,
} from '@/types/warehouse';
import {
  parseSapNumber,
  parseSapWeight,
  normalizeSLocGudang,
  extractPipeUkuran,
} from './parseStockOpname';

export {
  parseSapNumber,
  parseSapWeight,
  normalizeSLocGudang,
  extractPipeUkuran,
};

/**
 * Helper untuk menghitung bobot dan tonase item Audit SLoc secara presisi
 */
export function getAuditSLocItemWeights(item: AuditSLocItem): {
  unitWeightKg: number;
  actualWeightKg: number;
  sapWeightKg: number;
  actualTon: number;
  sapTon: number;
  diffTon: number;
} {
  const absQtyAudit = Math.abs(item.qtyAudit || 0);
  const absKgAudit = Math.abs(item.kgAudit || 0);
  const absSapInit = Math.abs(item.sapInitialQty || 0);
  const absEomWeight = Math.abs(item.eomWeight || 0);
  const absDiffQtyInit = Math.abs(item.diffQtyInitial || 0);
  const absDiffKgAudit = Math.abs(item.diffKgAudit || 0);
  const absDiffFinalQty = Math.abs(item.diffAuditFinalQty || 0);
  const absKgDiffFinal = Math.abs(item.kgDiffFinal || 0);

  // 1. Tentukan bobot per unit (kg/btg atau kg/pcs)
  let unitWeightKg = 0;
  if (absQtyAudit > 0 && absKgAudit > 0) {
    unitWeightKg = absKgAudit / absQtyAudit;
  } else if (absSapInit > 0 && absEomWeight > 0) {
    unitWeightKg = absEomWeight / absSapInit;
  } else if (absDiffQtyInit > 0 && absDiffKgAudit > 0) {
    unitWeightKg = absDiffKgAudit / absDiffQtyInit;
  } else if (absDiffFinalQty > 0 && absKgDiffFinal > 0) {
    unitWeightKg = absKgDiffFinal / absDiffFinalQty;
  }

  // Fallback estimasi bobot jika tidak ada bobot di kolom awal (standar pipa Spindo ~15-45 kg)
  if (unitWeightKg === 0) {
    const ukuran = item.ukuran || '';
    if (ukuran.includes('4"') || ukuran.includes('4 INCH') || ukuran.includes('114')) {
      unitWeightKg = 45;
    } else if (ukuran.includes('3"') || ukuran.includes('3 INCH') || ukuran.includes('89')) {
      unitWeightKg = 30;
    } else if (ukuran.includes('2"') || ukuran.includes('2 INCH') || ukuran.includes('60')) {
      unitWeightKg = 20;
    } else if (ukuran.includes('1"') || ukuran.includes('1 INCH') || ukuran.includes('33') || ukuran.includes('42')) {
      unitWeightKg = 12;
    } else if (ukuran.includes('1/2') || ukuran.includes('3/4') || ukuran.includes('21') || ukuran.includes('27')) {
      unitWeightKg = 7;
    } else {
      unitWeightKg = 20; // Default standar pipa Spindo
    }
  }

  // 2. Bobot aktual final dan SAP final berdasarkan kuantitas rekonsiliasi final
  let actualWeightKg = 0;
  if (item.actualFinalQty !== 0 && unitWeightKg > 0) {
    actualWeightKg = item.actualFinalQty * unitWeightKg;
  } else if (item.kgAudit !== 0) {
    actualWeightKg = item.kgAudit;
  }

  let sapWeightKg = 0;
  if (item.sapFinalQty !== 0 && unitWeightKg > 0) {
    sapWeightKg = item.sapFinalQty * unitWeightKg;
  } else if (item.eomWeight !== 0) {
    sapWeightKg = item.eomWeight;
  }

  // 3. Selisih bobot (kg)
  let diffWeightKg = 0;
  if (item.status === 'SESUAI' || item.diffAuditFinalQty === 0) {
    diffWeightKg = 0;
    if (actualWeightKg !== 0 && sapWeightKg === 0) sapWeightKg = actualWeightKg;
    if (sapWeightKg !== 0 && actualWeightKg === 0) actualWeightKg = sapWeightKg;
  } else if (item.kgDiffFinal !== undefined && item.kgDiffFinal !== 0) {
    diffWeightKg = item.kgDiffFinal;
  } else if (unitWeightKg > 0 && item.diffAuditFinalQty !== 0) {
    diffWeightKg = item.diffAuditFinalQty * unitWeightKg;
  } else {
    diffWeightKg = actualWeightKg - sapWeightKg;
  }

  // Pastikan arah tanda diffWeightKg selalu konsisten dengan diffAuditFinalQty
  if (item.diffAuditFinalQty < 0 && diffWeightKg > 0) {
    diffWeightKg = -diffWeightKg;
  } else if (item.diffAuditFinalQty > 0 && diffWeightKg < 0) {
    diffWeightKg = Math.abs(diffWeightKg);
  } else if (item.diffAuditFinalQty === 0) {
    diffWeightKg = 0;
  }

  const actualTon = Math.abs(actualWeightKg) / 1000;
  const sapTon = Math.abs(sapWeightKg) / 1000;

  // 4. Selisih tonase final
  let diffTon = 0;
  if (item.diffAuditFinalQty === 0) {
    diffTon = 0;
  } else if (item.tonDiffFinal !== undefined && item.tonDiffFinal !== 0) {
    diffTon = item.tonDiffFinal;
  } else {
    diffTon = diffWeightKg / 1000;
  }

  if (item.diffAuditFinalQty < 0 && diffTon > 0) {
    diffTon = -diffTon;
  } else if (item.diffAuditFinalQty > 0 && diffTon < 0) {
    diffTon = Math.abs(diffTon);
  } else if (item.diffAuditFinalQty === 0) {
    diffTon = 0;
  }

  return { unitWeightKg, actualWeightKg, sapWeightKg, actualTon, sapTon, diffTon };
}

/**
 * Normalisasi item Audit SLoc agar status dan tanda selisih konsisten
 */
export function normalizeAuditSLocItem(item: any): AuditSLocItem {
  const actualFinalQty = item.actualFinalQty !== undefined
    ? Number(item.actualFinalQty)
    : Number(item.qtyAudit ?? 0);
  const sapFinalQty = item.sapFinalQty !== undefined
    ? Number(item.sapFinalQty)
    : Number(item.sapInitialQty ?? 0);
  const diffAuditFinalQty = item.diffAuditFinalQty !== undefined
    ? Number(item.diffAuditFinalQty)
    : (actualFinalQty - sapFinalQty);

  let status: AuditSLocDifferenceStatus = 'SESUAI';
  let diffSign = '(0)';
  if (diffAuditFinalQty < 0) {
    status = 'SELISIH_MINUS';
    diffSign = '(-)';
  } else if (diffAuditFinalQty > 0) {
    status = 'SELISIH_PLUS';
    diffSign = '(+)';
  }

  // Hitung unit weight jika tersedia untuk derivasi kgDiffFinal
  const absQtyAudit = Math.abs(Number(item.qtyAudit ?? 0));
  const absKgAudit = Math.abs(Number(item.kgAudit ?? 0));
  const absSapInit = Math.abs(Number(item.sapInitialQty ?? 0));
  const absEomWeight = Math.abs(Number(item.eomWeight ?? 0));
  const absDiffQtyInit = Math.abs(Number(item.diffQtyInitial ?? 0));
  const absDiffKgAudit = Math.abs(Number(item.diffKgAudit ?? 0));

  let unitWeight = 0;
  if (absQtyAudit > 0 && absKgAudit > 0) {
    unitWeight = absKgAudit / absQtyAudit;
  } else if (absSapInit > 0 && absEomWeight > 0) {
    unitWeight = absEomWeight / absSapInit;
  } else if (absDiffQtyInit > 0 && absDiffKgAudit > 0) {
    unitWeight = absDiffKgAudit / absDiffQtyInit;
  }

  let kgDiffFinal = Number(item.kgDiffFinal ?? 0);
  if (diffAuditFinalQty === 0) {
    kgDiffFinal = 0;
  } else if (kgDiffFinal === 0) {
    if (item.diffKgAudit && Number(item.diffKgAudit) !== 0) {
      kgDiffFinal = Math.abs(Number(item.diffKgAudit)) * (diffAuditFinalQty < 0 ? -1 : 1);
    } else if (unitWeight > 0) {
      kgDiffFinal = diffAuditFinalQty * unitWeight;
    } else {
      kgDiffFinal = diffAuditFinalQty * 20; // Fallback standar pipa Spindo 20 kg
    }
  }

  if (diffAuditFinalQty < 0 && kgDiffFinal > 0) {
    kgDiffFinal = -kgDiffFinal;
  } else if (diffAuditFinalQty > 0 && kgDiffFinal < 0) {
    kgDiffFinal = Math.abs(kgDiffFinal);
  } else if (diffAuditFinalQty === 0) {
    kgDiffFinal = 0;
  }

  const tonDiffFinal = kgDiffFinal / 1000;
  const gudang = item.gudang ? item.gudang : normalizeSLocGudang(item.sloc);

  return {
    id: item.id || `audit-${item.sloc || ''}-${item.material || ''}-${item.batch || ''}-${Math.random().toString(36).substring(2, 7)}`,
    label: String(item.label || item.labelId || ''),
    labelId: String(item.labelId || item.label || ''),
    plant: String(item.plant || '1105'),
    sloc: String(item.sloc || '').toUpperCase(),
    gudang,
    material: String(item.material || '').toUpperCase(),
    materialDescription: item.materialDescription || '',
    ukuran: item.ukuran || extractPipeUkuran(item.material || '', item.materialDescription || ''),
    batch: String(item.batch || '').toUpperCase(),
    sapInitialQty: Number(item.sapInitialQty ?? 0),
    eomWeight: Number(item.eomWeight ?? 0),
    qtyAudit: Number(item.qtyAudit ?? 0),
    kgAudit: Number(item.kgAudit ?? 0),
    diffKgAudit: Number(item.diffKgAudit ?? 0),
    diffQtyInitial: Number(item.diffQtyInitial ?? 0),
    sapFinalQty,
    actualFinalQty,
    diffAuditFinalQty,
    diffSign,
    kgDiffFinal,
    tonDiffFinal,
    status,
    uom: item.uom || (item.eomWeight > 0 ? 'Ton' : 'Btg'),
    remarks: item.remarks || '',
  };
}

/**
 * Parser file spreadsheet SAP Audit SLoc (14 Kolom)
 */
export function parseAuditSLocFile(rawRows: unknown[][]): AuditSLocItem[] {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

  // 1. Cari baris header (pindai s/d 25 baris awal)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
    const row = rawRows[i];
    if (Array.isArray(row)) {
      const rowStr = row.map((cell) => String(cell || '').toLowerCase()).join(' ');
      if (
        (rowStr.includes('sloc') || rowStr.includes('plant') || rowStr.includes('gudang')) &&
        (rowStr.includes('material') || rowStr.includes('batch') || rowStr.includes('matnr')) &&
        (rowStr.includes('sap') || rowStr.includes('audit') || rowStr.includes('diff') || rowStr.includes('actual') || rowStr.includes('eom'))
      ) {
        headerIndex = i;
        break;
      }
    }
  }

  // 2. Pemetaan kolom dinamis dari baris header jika ditemukan
  let colLabel = -1;
  let colPlant = -1;
  let colSloc = -1;
  let colMaterial = -1;
  let colDesc = -1;
  let colBatch = -1;
  let colSapInit = -1;
  let colEom = -1;
  let colQtyAudit = -1;
  let colKgAudit = -1;
  let colDiffKgAudit = -1;
  let colDiffQtyInit = -1;
  let colSapFinal = -1;
  let colActualFinal = -1;
  let colDiffAuditFinal = -1;
  let colRemarks = -1;

  if (headerIndex >= 0 && Array.isArray(rawRows[headerIndex])) {
    const headers = (rawRows[headerIndex] as unknown[]).map((c) => String(c || '').toLowerCase().trim());
    headers.forEach((h, idx) => {
      if (!h) return;
      if (h.includes('label') || h.includes('nomor') || h === 'no' || h === 'no.') colLabel = idx;
      else if (h.includes('plant') || h.includes('werks') || h.includes('pabrik')) colPlant = idx;
      else if (h.includes('sloc') || h.includes('storage') || h.includes('gudang') || h.includes('lokasi')) colSloc = idx;
      else if ((h.includes('material') || h.includes('matnr') || h.includes('kode')) && !h.includes('desc') && !h.includes('nama')) colMaterial = idx;
      else if (h.includes('desc') || h.includes('nama') || h.includes('deskripsi') || h.includes('maktx')) colDesc = idx;
      else if (h.includes('batch') || h.includes('charg') || h.includes('lot')) colBatch = idx;
      else if (h.includes('sap (awal)') || h.includes('sap awal') || h.includes('sap (initial)') || h.includes('sap initial')) colSapInit = idx;
      else if (h.includes('eom') || h.includes('kg eom') || h.includes('berat sap') || h.includes('sap kg')) colEom = idx;
      else if (h.includes('qty audit') || h.includes('audit qty') || h.includes('qty sto') || (h.includes('audit') && h.includes('qty'))) colQtyAudit = idx;
      else if (h.includes('kg audit') || h.includes('audit kg') || h.includes('berat audit') || (h.includes('audit') && h.includes('kg'))) colKgAudit = idx;
      else if (h.includes('diff kg audit') || h.includes('diff kg') || h.includes('selisih kg')) colDiffKgAudit = idx;
      else if (h.includes('diff') && (h.includes('awal') || h.includes('init') || !h.includes('final')) && !h.includes('kg')) colDiffQtyInit = idx;
      else if (h.includes('sap (final)') || h.includes('sap final') || h.includes('final sap')) colSapFinal = idx;
      else if (h.includes('actual (final)') || h.includes('actual final') || h.includes('final actual') || h.includes('fisik final')) colActualFinal = idx;
      else if (h.includes('diff audit') || h.includes('diff final') || h.includes('selisih final') || h.includes('final diff')) colDiffAuditFinal = idx;
      else if (h.includes('remark') || h.includes('catatan') || h.includes('keterangan')) colRemarks = idx;
    });
  }

  // 3. Fallback indeks jika mapping tidak menemukan (sesuai spesifikasi 14 kolom SAP):
  // Col 0: Label, 1: Plant, 2: SLoc, 3: Material, 4: Batch, 5: SAP Awal, 6: Eom / KG EOM,
  // Col 7: Qty Audit, 8: KG Audit, 9: Diff KG Audit, 10: Diff Qty Awal,
  // Col 11: SAP Final, 12: Actual Final, 13: Diff Audit Final
  const idxLabel = colLabel >= 0 ? colLabel : 0;
  const idxPlant = colPlant >= 0 ? colPlant : 1;
  const idxSloc = colSloc >= 0 ? colSloc : 2;
  const idxMaterial = colMaterial >= 0 ? colMaterial : 3;
  const idxBatch = colBatch >= 0 ? colBatch : 4;
  const idxSapInit = colSapInit >= 0 ? colSapInit : 5;
  const idxEom = colEom >= 0 ? colEom : 6;
  const idxQtyAudit = colQtyAudit >= 0 ? colQtyAudit : 7;
  const idxKgAudit = colKgAudit >= 0 ? colKgAudit : 8;
  const idxDiffKgAudit = colDiffKgAudit >= 0 ? colDiffKgAudit : 9;
  const idxDiffQtyInit = colDiffQtyInit >= 0 ? colDiffQtyInit : 10;
  const idxSapFinal = colSapFinal >= 0 ? colSapFinal : 11;
  const idxActualFinal = colActualFinal >= 0 ? colActualFinal : 12;
  const idxDiffAuditFinal = colDiffAuditFinal >= 0 ? colDiffAuditFinal : 13;
  const idxDesc = colDesc >= 0 ? colDesc : 14;
  const idxRemarks = colRemarks >= 0 ? colRemarks : 15;

  const dataRows = headerIndex >= 0 ? rawRows.slice(headerIndex + 1) : rawRows;
  const result: AuditSLocItem[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    if (!Array.isArray(r) || r.length < 4) continue;

    const cellVal = (idx: number): string => (r[idx] !== null && r[idx] !== undefined ? String(r[idx]).trim() : '');

    const rawMaterial = cellVal(idxMaterial) || cellVal(3) || cellVal(2);
    const rawBatch = cellVal(idxBatch) || cellVal(4) || cellVal(3);
    const rawSloc = cellVal(idxSloc) || cellVal(2) || cellVal(1) || '5A01';
    const rawPlant = cellVal(idxPlant) || cellVal(1) || '1105';
    const rawLabel = cellVal(idxLabel) || `LBL-${i + 1}`;

    if (!rawMaterial && !rawBatch) continue;
    const lowerMat = rawMaterial.toLowerCase();
    if (lowerMat === 'material' || lowerMat === 'plant' || lowerMat === 'kode material' || lowerMat === 'label') continue;

    const sapInitialQty = parseSapNumber(r[idxSapInit]);
    const eomWeight = parseSapWeight(r[idxEom]);
    const qtyAudit = parseSapNumber(r[idxQtyAudit]);
    const kgAudit = parseSapWeight(r[idxKgAudit]);
    const diffKgAudit = parseSapWeight(r[idxDiffKgAudit]);
    const diffQtyInitial = parseSapNumber(r[idxDiffQtyInit]);
    const sapFinalQty = r[idxSapFinal] !== undefined ? parseSapNumber(r[idxSapFinal]) : sapInitialQty;
    const actualFinalQty = r[idxActualFinal] !== undefined ? parseSapNumber(r[idxActualFinal]) : qtyAudit;

    // Selisih final aktual vs SAP:
    // Actual > SAP -> Surplus (+)
    // Actual < SAP -> Defisit (-)
    // Actual === SAP -> Sesuai (0)
    const diffAuditFinalQty = actualFinalQty - sapFinalQty;

    let status: AuditSLocDifferenceStatus = 'SESUAI';
    let diffSign = '(0)';
    if (diffAuditFinalQty < 0) {
      status = 'SELISIH_MINUS';
      diffSign = '(-)';
    } else if (diffAuditFinalQty > 0) {
      status = 'SELISIH_PLUS';
      diffSign = '(+)';
    }

    const gudang = normalizeSLocGudang(rawSloc);
    const uom = eomWeight > 0 ? 'Ton' : 'Btg';

    // Estimasi KG / Ton selisih final (berdasarkan bobot per unit aktual)
    let kgDiffFinal = 0;
    if (diffAuditFinalQty !== 0) {
      if (qtyAudit > 0 && kgAudit > 0) {
        kgDiffFinal = diffAuditFinalQty * (kgAudit / qtyAudit);
      } else if (sapInitialQty !== 0 && eomWeight !== 0) {
        kgDiffFinal = (diffAuditFinalQty / Math.abs(sapInitialQty)) * eomWeight;
      } else if (diffQtyInitial !== 0 && diffKgAudit !== 0) {
        kgDiffFinal = diffAuditFinalQty * Math.abs(diffKgAudit / diffQtyInitial);
      } else if (diffKgAudit !== 0) {
        kgDiffFinal = diffAuditFinalQty < 0 ? -Math.abs(diffKgAudit) : Math.abs(diffKgAudit);
      } else {
        kgDiffFinal = diffAuditFinalQty * 20; // Fallback standar pipa Spindo
      }
    }

    // Pastikan tanda kgDiffFinal selalu konsisten dengan diffAuditFinalQty
    if (diffAuditFinalQty < 0 && kgDiffFinal > 0) {
      kgDiffFinal = -kgDiffFinal;
    } else if (diffAuditFinalQty > 0 && kgDiffFinal < 0) {
      kgDiffFinal = Math.abs(kgDiffFinal);
    } else if (diffAuditFinalQty === 0) {
      kgDiffFinal = 0;
    }
    const tonDiffFinal = kgDiffFinal / 1000;
    const desc = cellVal(idxDesc) || `Pipa Spindo ${rawMaterial}`;

    result.push({
      id: `audit-${rawSloc}-${rawMaterial}-${rawBatch}-${i}`,
      label: rawLabel,
      labelId: rawLabel,
      plant: rawPlant,
      sloc: rawSloc.toUpperCase(),
      gudang,
      material: rawMaterial.toUpperCase(),
      materialDescription: desc,
      ukuran: extractPipeUkuran(rawMaterial, desc),
      batch: rawBatch.toUpperCase(),
      sapInitialQty,
      eomWeight,
      qtyAudit,
      kgAudit,
      diffKgAudit,
      diffQtyInitial,
      sapFinalQty,
      actualFinalQty,
      diffAuditFinalQty,
      diffSign,
      kgDiffFinal,
      tonDiffFinal,
      status,
      uom,
      remarks: cellVal(idxRemarks) || '',
    });
  }

  return result;
}

/**
 * Hitung ringkasan statistik KPI Audit SLoc
 */
export function calculateAuditSLocSummary(items: AuditSLocItem[]): AuditSLocSummary {
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

    const weights = getAuditSLocItemWeights(item);
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
 * Hitung ringkasan Audit SLoc per Gudang (Gd.01 - Gd.14)
 */
export function calculateAuditSLocGudangRecap(items: AuditSLocItem[]): AuditSLocGudangRecap[] {
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

    const weights = getAuditSLocItemWeights(item);
    const diffTon = Math.abs(weights.diffTon);
    const diffQty = Math.abs(item.diffAuditFinalQty);

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
    if (item.actualFinalQty !== 0 || item.qtyAudit > 0) {
      entry.actualItemCount++;
    }

    entry.actualTon += weights.actualTon;
    entry.sapTon += weights.sapTon;
    entry.varianceTon += weights.diffTon;
  }

  const result: AuditSLocGudangRecap[] = [];
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
 * Hitung ringkasan Audit SLoc per SLoc
 */
export function calculateAuditSLocRecap(items: AuditSLocItem[]): AuditSLocRecap[] {
  const map = new Map<string, {
    gudang: string;
    matchingCount: number;
    minusCount: number;
    plusCount: number;
    varianceQty: number;
    varianceTon: number;
    minusQty: number;
    plusQty: number;
    minusTon: number;
    plusTon: number;
    matchingQty: number;
    matchingTon: number;
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
        minusQty: 0,
        plusQty: 0,
        minusTon: 0,
        plusTon: 0,
        matchingQty: 0,
        matchingTon: 0,
        sapQty: 0,
        actualQty: 0,
        sapTon: 0,
        actualTon: 0,
        sapItemCount: 0,
        actualItemCount: 0,
      };
      map.set(key, entry);
    }

    const weights = getAuditSLocItemWeights(item);
    const diffTon = Math.abs(weights.diffTon);
    const diffQty = Math.abs(item.diffAuditFinalQty);

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

    if (item.sapFinalQty !== 0 || item.sapInitialQty > 0) entry.sapItemCount++;
    if (item.actualFinalQty !== 0 || item.qtyAudit > 0) entry.actualItemCount++;

    entry.varianceQty += item.diffAuditFinalQty;
    entry.varianceTon += weights.diffTon;
    entry.sapQty += item.sapFinalQty;
    entry.actualQty += item.actualFinalQty;
    entry.actualTon += weights.actualTon;
    entry.sapTon += weights.sapTon;
  }

  const result: AuditSLocRecap[] = [];
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
      minusQty: val.minusQty,
      plusQty: val.plusQty,
      minusTon: val.minusTon,
      plusTon: val.plusTon,
      matchingQty: val.matchingQty,
      matchingTon: val.matchingTon,
      sapQty: val.sapQty,
      actualQty: val.actualQty,
      sapTon: val.sapTon,
      actualTon: val.actualTon,
      sapItemCount: val.sapItemCount,
      actualItemCount: val.actualItemCount,
    });
  }

  return result.sort((a, b) => (b.minusTon + b.plusTon) - (a.minusTon + a.plusTon) || Math.abs(b.varianceQty) - Math.abs(a.varianceQty));
}

/**
 * Hitung ringkasan Audit SLoc per Periode (untuk tren & komparasi antar snapshot)
 */
export function calculateAuditSLocPeriodSummary(
  items: AuditSLocItem[],
  periodKey: string,
  lastUpdated: string,
  customLabel?: string
): AuditSLocPeriodSummary {
  const summary = calculateAuditSLocSummary(items);
  const gudangs = calculateAuditSLocGudangRecap(items);

  let sapItems = 0;
  let actualItems = 0;
  for (const g of gudangs) {
    sapItems += g.sapItemCount ?? 0;
    actualItems += g.actualItemCount ?? 0;
  }

  const breakdown: Record<string, {
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
    breakdown[g.gudang] = {
      itemCount: g.itemCount,
      matchingCount: g.matchingCount,
      accuracyRate: g.accuracyRate,
      sapQty: g.sapQty,
      actualQty: g.actualQty,
      sapTon: g.sapTon,
      actualTon: g.actualTon,
      varianceTon: g.varianceTon,
    };
  }

  const dateParts = periodKey.replace('snap_', '').split('-');
  const formattedLabel = customLabel || (dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : periodKey);

  return {
    periodKey,
    label: formattedLabel,
    lastUpdated,
    totalItems: summary.totalItems,
    matchingCount: summary.matchingItems,
    minusCount: summary.minusItems,
    plusCount: summary.plusItems,
    accuracyRate: summary.accuracyRate,
    sapQty: summary.totalSapQty,
    actualQty: summary.totalActualQty,
    varianceQty: summary.netVarianceQty,
    sapTon: summary.totalSapTon,
    actualTon: summary.totalActualTon,
    varianceTon: summary.netVarianceTon,
    sapItemCount: sapItems,
    actualItemCount: actualItems,
    gudangBreakdown: breakdown,
  };
}
