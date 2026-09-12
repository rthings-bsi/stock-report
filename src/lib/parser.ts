import { normalizeNCRNumber, extractNCRAndRemark } from './parseNCProgress';
import * as XLSX from 'xlsx';
import {
  WarehousePipeCapacity,
  FastSlowPipe,
  CoilStripArea,
  PipeNCWarehouse,
  PipeNCItem,
  LooComparisonItem,
  UnfifoItem,
  UnfifoCoilItem,
  UnfifoPipeItem,
  DamagedPackagingItem,
  IncomingPackagingItem,
  NCProgressTransaction
} from '../types/warehouse';

export interface ParsedWarehouseState {
  pipeCapacities?: WarehousePipeCapacity[];
  fastSlowData?: FastSlowPipe[];
  coilStripData?: CoilStripArea[];
  ncWarehouseData?: PipeNCWarehouse[];
  ncItems?: PipeNCItem[];
  looSTData?: LooComparisonItem[];
  looLTData?: LooComparisonItem[];
  unfifoData?: UnfifoItem[];
  unfifoCoilData?: UnfifoCoilItem[];
  unfifoPipeData?: UnfifoPipeItem[];
  damagedPackagingData?: DamagedPackagingItem[];
  incomingPackagingData?: IncomingPackagingItem[];
  ncProgressData?: NCProgressTransaction[];
  customerBreakdown?: Record<string, Array<{ customer: string; qty: number; tonase: number }>>;
  lastUpdated: string;
  snapshotKey?: string;
  targetDate?: string;
  uploadedCategories?: ('pipe' | 'coil' | 'loo' | 'damaged_pkg' | 'incoming_pkg' | 'progress_nc')[];
}

const PIPE_CAPACITY_MAP: Record<string, number> = {
  'Gd.01': 930.0,
  'Gd.02': 755.0,
  'Gd.03': 580.0,
  'Gd.04': 450.0,
  'Gd.05': 450.0,
  'Gd.10': 350.0,
  'Gd.11': 860.0,
  'Gd.12': 750.0,
  'Gd.13': 354.0,
  'Gd.14': 255.0,
};

const COIL_CAPACITY_MAP: Record<string, number> = {
  'Gd.02': 7000.0,
  'Gd.03': 7000.0,
  'Gd.06': 8500.0,
  'Gd.07': 8500.0,
  'Gd.08': 8500.0,
  'Gd.09': 8500.0,
  'Gd.10': 7000.0,
  'Gd.11': 7000.0,
};

const COIL_AREA_LABELS: Record<string, string> = {
  'Gd.02': 'Area K1, K2, K3',
  'Gd.03': 'Area K5, K6',
  'Gd.06': 'Gd.06 (Main Coil)',
  'Gd.07': 'Gd.07 (Main Coil)',
  'Gd.08': 'Gd.08 (Main Coil)',
  'Gd.09': 'Gd.09 (Main Coil)',
  'Gd.10': 'Area K9',
  'Gd.11': 'Area K7 & K8',
};

const DIAMETER_MAP: Record<string, string> = {
  BAA: '25.4',
  BCA: '28.6',
  BEA: '31.8',
  BFH: '34.0',
  BIA: '38.1',
  BOK: '48.6',
  CAA: '50.8',
  CCA: '54.0',
  CGC: '60.5',
  AMA: '19.1',
  AOA: '22.2',
  AKO: '17.3',
  CBG: '53.0',
  BGB: '35.0',
  BKO: '42.7',
  AAW: '21.3',
  BBB: '26.7',
  DBP: '42.2',
  EBR: '60.3',
  GAH: '73.0',
  HBE: '88.9',
  ABG: '50x100',
  ABF: '50x50',
  ACW: '26x50',
  AKA: '15.9',
};

function normalizeGudang(sloc: string | undefined): string {
  if (!sloc) return 'Gd.01';
  const s = String(sloc).toUpperCase().trim();

  // Pola Standar SAP Spindo: 5A* = Gd.01 s/d 5N* = Gd.14
  const match5Letter = s.match(/^5([A-N])/);
  if (match5Letter) {
    const charCode = match5Letter[1].charCodeAt(0);
    const whNumber = charCode - 65 + 1; // 'A' = 65 -> 1
    const padNum = whNumber < 10 ? `0${whNumber}` : `${whNumber}`;
    return `Gd.${padNum}`;
  }

  // Cek jika mengandung pola Gd.01 - Gd.14 langsung
  const matchGd = s.match(/GD\.?(\d{1,2})/);
  if (matchGd) {
    const num = parseInt(matchGd[1], 10);
    const padNum = num < 10 ? `0${num}` : `${num}`;
    return `Gd.${padNum}`;
  }

  // Fallback cek langsung huruf
  if (s.startsWith('5N')) return 'Gd.14';
  if (s.startsWith('5M')) return 'Gd.13';
  if (s.startsWith('5L')) return 'Gd.12';
  if (s.startsWith('5K')) return 'Gd.11';
  if (s.startsWith('5J')) return 'Gd.10';
  if (s.startsWith('5I')) return 'Gd.09';
  if (s.startsWith('5H')) return 'Gd.08';
  if (s.startsWith('5G')) return 'Gd.07';
  if (s.startsWith('5F')) return 'Gd.06';
  if (s.startsWith('5E')) return 'Gd.05';
  if (s.startsWith('5D')) return 'Gd.04';
  if (s.startsWith('5C')) return 'Gd.03';
  if (s.startsWith('5B')) return 'Gd.02';
  if (s.startsWith('5A')) return 'Gd.01';

  return 'Gd.01';
}

function parseNumber(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim().replace(/[^\d.,-]/g, '');
  if (!str) return 0;
  // Format Indonesia: 1.234,56 -> 1234.56
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

/**
 * Format tanggal dari Excel serial date / SAP date ke DD.MM.YYYY
 */
export function formatSapDate(val: unknown, batchStr: string = ''): string {
  if (!val) {
    if (batchStr) {
      const matchBatch = batchStr.match(/^[1-9](\d{2})/);
      if (matchBatch) {
        return `01.01.20${matchBatch[1]}`;
      }
    }
    return '-';
  }

  const s = String(val).trim();
  const num = parseFloat(s);

  if (!isNaN(num) && num >= 30000 && num <= 60000) {
    const excelBase = new Date(1899, 11, 30);
    const dateObj = new Date(excelBase.getTime() + num * 86400000);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}.${month}.${year}`;
  }

  if (!isNaN(num) && num >= 1990 && num <= 2050) {
    return `01.01.${Math.round(num)}`;
  }

  if (s.includes('-') && s.length >= 8) {
    const parts = s.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
    }
  }

  if (/^\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}$/.test(s)) {
    const parts = s.split(/[\.\/\-]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    let y = parts[2];
    if (y.length === 2) {
      y = parseInt(y, 10) >= 70 ? `19${y}` : `20${y}`;
    }
    return `${d}.${m}.${y}`;
  }

  if (batchStr) {
    const matchBatch = batchStr.match(/^[1-9](\d{2})/);
    if (matchBatch) {
      return `01.01.20${matchBatch[1]}`;
    }
  }

  return s;
}

/**
 * Ekstrak tahun produksi (Prod. Year) dari baris data Excel SAP
 */
export function extractProductionYear(row: Record<string, unknown>, batchStr: string = ''): string {
  // 1. Cek kolom Prod. Year / Tahun Produksi secara eksplisit
  const rawProdYear = getRowValue(row, [
    'Prod. Year',
    'Prod.Year',
    'Prod Year',
    'PROD. YEAR',
    'Production Year',
    'PROD YEAR',
    'ProdYear',
    'Tahun Produksi',
    'Tahun',
    'Thn Produksi',
    'THN PRODUKSI',
    'Year',
    'YEAR'
  ]);

  if (rawProdYear !== undefined && rawProdYear !== null && String(rawProdYear).trim() !== '') {
    const s = String(rawProdYear).trim();
    const num = parseFloat(s);

    if (!isNaN(num) && num >= 1990 && num <= 2050) {
      return String(Math.round(num));
    }

    if (!isNaN(num) && num >= 10 && num <= 50) {
      return `20${Math.round(num)}`;
    }

    const match4 = s.match(/\b(19\d{2}|20\d{2})\b/);
    if (match4) return match4[1];

    if (!isNaN(num) && num >= 30000 && num <= 60000) {
      const excelBase = new Date(1899, 11, 30);
      const d = new Date(excelBase.getTime() + num * 86400000);
      return String(d.getFullYear());
    }
  }

  // 2. Cek Inc.Date / Posting Date / Tgl Masuk
  const rawDate = getRowValue(row, [
    'Inc.Date',
    'Inc Date',
    'IncDate',
    'Posting Date',
    'PostingDate',
    'TPTP Inc.Date',
    'Tgl Masuk',
    'Tgl. Masuk',
    'GR Date',
    'Doc. Date'
  ]);

  if (rawDate !== undefined && rawDate !== null && String(rawDate).trim() !== '') {
    const s = String(rawDate).trim();
    const num = parseFloat(s);

    if (!isNaN(num) && num >= 30000 && num <= 60000) {
      const excelBase = new Date(1899, 11, 30);
      const d = new Date(excelBase.getTime() + num * 86400000);
      return String(d.getFullYear());
    }

    const match4 = s.match(/\b(19\d{2}|20\d{2})\b/);
    if (match4) return match4[1];

    const match2 = s.match(/[\.\/\-](\d{2})$/);
    if (match2) {
      const y2 = parseInt(match2[1], 10);
      if (y2 >= 0 && y2 <= 50) return `20${match2[1]}`;
      if (y2 >= 80 && y2 <= 99) return `19${match2[1]}`;
    }
  }

  // 3. Ekstrak dari Format Batch Spindo
  if (batchStr) {
    const cleanBatch = batchStr.trim().toUpperCase();

    // Pola Spindo standard: Plant(1 digit) + Tahun(2 digit) + Seq (misal: 4241012D0C -> 2024, 5233195F0A -> 2023, 5200112 -> 2020)
    const matchSpindoBatch = cleanBatch.match(/^[1-9](\d{2})\d{3,}/);
    if (matchSpindoBatch) {
      const y2 = parseInt(matchSpindoBatch[1], 10);
      if (y2 >= 10 && y2 <= 40) {
        return `20${matchSpindoBatch[1]}`;
      }
    }

    // Pola Batch YYYYMMDD (misal: 20240510A)
    const matchYYYY = cleanBatch.match(/^(19\d{2}|20\d{2})/);
    if (matchYYYY) {
      return matchYYYY[1];
    }
  }

  return 'Tidak Diketahui';
}

function getRowValue(row: Record<string, unknown>, keys: string[]): unknown {
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    if (row[k] !== undefined) return row[k];
    const cleanTarget = k.toLowerCase().replace(/[\s._-]/g, '');
    const foundKey = rowKeys.find(rk => rk.toLowerCase().replace(/[\s._-]/g, '') === cleanTarget);
    if (foundKey && row[foundKey] !== undefined) return row[foundKey];
  }
  return undefined;
}

/**
 * Filter untuk memisahkan bahan baku Coil / Strip dari produk pipa
 */
export function isCoilOrStripMaterial(desc: string | undefined | null, matNum: string = ''): boolean {
  const d = String(desc || '').toUpperCase();
  const m = String(matNum || '').toUpperCase();

  // Pipa / Tubing / Hollow jangan dikategorikan sebagai coil/strip
  if (
    d.includes('PIPA') ||
    d.includes('PIPE') ||
    d.includes('TUB') ||
    d.includes('HOLLOW') ||
    d.includes('SCH') ||
    d.includes('SCH40') ||
    d.includes('BLACK') ||
    d.includes('GALV') ||
    d.includes('BENTUK')
  ) {
    return false;
  }

  if (
    d.includes('STRIP') ||
    d.includes('COIL') ||
    d.includes('SLIT') ||
    d.includes('HRC') ||
    d.includes('CRC') ||
    d.includes('PO COIL') ||
    d.includes('SKP')
  ) {
    return true;
  }
  if (
    m.startsWith('C1') ||
    m.startsWith('C2') ||
    m.startsWith('C3') ||
    m.startsWith('S1') ||
    m.startsWith('S2') ||
    m.startsWith('C-') ||
    m.startsWith('S-')
  ) {
    return true;
  }
  return false;
}

/**
 * Normalisasi kode material SAP ke Base Key Wildcard (*)
 * Format Spindo SAP standar: 3 karakter prefix (e.g. YAB, XCB, YBB, YDB) + 2 digit proses (00 s/d 99) + sisa kode
 * Contoh: YAB01A0A0400+40000 (FG) dan YAB00A0A0400+40000 (WIP) -> YAB*A0A0400+40000
 */
export function getMaterialBaseKey(matCode: string): string {
  if (!matCode) return '';
  let clean = matCode.trim().toUpperCase();
  // Normalisasi karakter O (Oh) ke 0 (Nol) pada token tengah kode material SAP (misal AOA0400 -> A0A0400)
  clean = clean.replace(/([A-Z])O([A-Z])/g, '$10$2');
  const match = clean.match(/^([A-Z0-9]{3})\d{2}([A-Z0-9+.\-_]+)$/);
  if (match) {
    return `${match[1]}*${match[2]}`;
  }
  return clean;
}

/**
 * Ekstraksi spesifikasi dimensi pipa: Diameter x Tebal x Panjang
 */
export function extractPipeDimension(
  desc: string | undefined | null,
  matNum: string = '',
  rawPanjang: string = ''
): { dimension: string; panjangMm: number } {
  const descClean = String(desc || '').replace(/[\"\']/g, '').trim();
  const matClean = String(matNum || '').trim();

  // Ekstraksi parameter tebal dan panjang dari kode material SAP Spindo
  // Pola: [Prefix A-Z0-9]+[Tebal 4 digit: 0455=4.55][-+][Panjang 5 digit: 06000=6000 atau 60000=6000 atau A6000=6000/10600]
  const matchMat = matClean.match(/([A-Z0-9]+?)(\d{4})([-+])([A-Z0-9]{5})/);
  let tDecoded: string | null = null;
  let pDecoded: string | null = null;
  let pMmVal = 6000;
  let prefix = '';

  if (matchMat) {
    prefix = matchMat[1];
    const tVal = parseInt(matchMat[2], 10) / 100;
    tDecoded = (tVal * 100) % 10 === 0 && tVal < 10 ? tVal.toFixed(2) : String(tVal);

    const sign = matchMat[3];
    const pRaw = matchMat[4];
    if (/^\d+$/.test(pRaw)) {
      const pNum = parseInt(pRaw, 10);
      if (sign === '-') {
        // Format pipa standar (-): satuan mm langsung (misal 06000 = 6000, 00720 = 720, 12000 = 12000)
        pMmVal = pNum;
      } else {
        // Format pipa presisi / mekanikal / automotive (+):
        // 5 digit berakhiran 0 atau >= 7000: satuan 0.1 mm (misal 07420=742, 07750=775, 11700=1170, 11670=1167, 21760=2176, 60000=6000)
        if (pRaw.startsWith('0')) {
          if (pNum >= 7000) {
            pMmVal = pNum / 10;
          } else {
            pMmVal = pNum;
          }
        } else {
          pMmVal = pNum / 10;
        }
      }
    } else if (pRaw.startsWith('A') && /^\d+$/.test(pRaw.slice(1))) {
      pMmVal = parseInt(pRaw.slice(1), 10);
    } else {
      pMmVal = parseNumber(rawPanjang) || 6000;
    }
    pDecoded = pMmVal % 1 === 0 ? String(parseInt(String(pMmVal), 10)) : String(pMmVal);
  }

  // 1. Pipa Kotak/Hollow di Deskripsi: 100x50x3,20x6220 atau 50x100x1,70x6000
  const matchKotak = descClean.match(/(\d+[\.,]?\d*)\s*[xX]\s*(\d+[\.,]?\d*)\s*[xX]\s*(\d+[\.,]?\d*)\s*[xX]\s*(\d+[\.,]?\d*)/);
  if (matchKotak) {
    const d1 = matchKotak[1].replace(',', '.');
    const d2 = matchKotak[2].replace(',', '.');
    const t = tDecoded || matchKotak[3].replace(',', '.');
    let p = pDecoded || matchKotak[4].replace(',', '.').replace(/\.+$/, '');
    if (p.endsWith('.0') || p.endsWith('.00')) {
      p = String(parseInt(p, 10));
    }
    const pNum = parseFloat(p) || pMmVal;
    return { dimension: `${d1}x${d2} x ${t} x ${p}`, panjangMm: pNum };
  }

  // 2. Pipa Bulat Lengkap 3 Angka di Deskripsi: 60,3x4,55x6000 atau 73x5,16x12000
  const matchBulat = descClean.match(/(\d+[\.,]?\d*)\s*[xX]\s*(\d+[\.,]?\d*)\s*[xX]\s*(\d+[\.,]?\d*)/);
  if (matchBulat) {
    const d = matchBulat[1].replace(',', '.');
    const t = tDecoded || matchBulat[2].replace(',', '.');
    let pStr = pDecoded || matchBulat[3].replace(',', '.').replace(/\.+$/, '');
    if (pStr.endsWith('.0') || pStr.endsWith('.00')) {
      pStr = String(parseInt(pStr, 10));
    }
    const pNum = parseFloat(pStr) || pMmVal;
    return { dimension: `${d} x ${t} x ${pStr}`, panjangMm: pNum };
  }

  // 3. Cari diameter dari deskripsi teks (contoh '38,1x' atau '73x') + tebal & panjang kode material
  if (tDecoded && pDecoded) {
    const matchDInDesc = descClean.match(/(\d+[\.,]\d+|\d+)\s*[xX]/);
    if (matchDInDesc) {
      const dStr = matchDInDesc[1].replace(',', '.');
      return { dimension: `${dStr} x ${tDecoded} x ${pDecoded}`, panjangMm: pMmVal };
    }

    // 4. Lookup diameter dari mapping kode family SAP
    for (const [k, dVal] of Object.entries(DIAMETER_MAP)) {
      if (prefix.endsWith(k)) {
        return { dimension: `${dVal} x ${tDecoded} x ${pDecoded}`, panjangMm: pMmVal };
      }
    }

    return { dimension: `${tDecoded} x ${pDecoded}`, panjangMm: pMmVal };
  }

  return { dimension: descClean || matClean || 'N/A', panjangMm: parseNumber(rawPanjang) || 6000 };
}

export function parseExcelFiles(
  pipeRows: Record<string, unknown>[],
  coilRows: Record<string, unknown>[],
  looRows: Record<string, unknown>[]
): ParsedWarehouseState {
  const gudangMap: Record<string, {
    kapasitas: number;
    wipLt: number;
    fgLt: number;
    wipSt: number;
    fgSt: number;
    customerStock: number;
    freeStock: number;
    fastTon: number;
    slowTon: number;
    fgLtSlow: number;
    fgStSlow: number;
    wipLtSlow: number;
    wipStSlow: number;
    primeTon: number;
    gradeETon: number;
    gradeCTon: number;
    yearlySlowTon: Record<string, number>;
  }> = {};

  const allGudangs = ['Gd.01', 'Gd.02', 'Gd.03', 'Gd.04', 'Gd.05', 'Gd.10', 'Gd.11', 'Gd.12', 'Gd.13', 'Gd.14'];
  allGudangs.forEach(g => {
    gudangMap[g] = {
      kapasitas: PIPE_CAPACITY_MAP[g] || 500,
      wipLt: 0,
      fgLt: 0,
      wipSt: 0,
      fgSt: 0,
      customerStock: 0,
      freeStock: 0,
      fastTon: 0,
      slowTon: 0,
      fgLtSlow: 0,
      fgStSlow: 0,
      wipLtSlow: 0,
      wipStSlow: 0,
      primeTon: 0,
      gradeETon: 0,
      gradeCTon: 0,
      yearlySlowTon: {},
    };
  });

  const ncItemAggMap: Record<string, {
    gudang: string;
    ukuran: string;
    customer: string;
    kodeMaterial: string;
    type: 'LT' | 'ST';
    grade: 'Grade C' | 'Grade E';
    fgTon: number;
    wipTon: number;
    totalTon: number;
    noNCList: Set<string>;
    remarksList: Set<string>;
    noNC?: string;
    remarks: string;
  }> = {};

  const customerBreakdownMap: Record<string, Record<string, { qty: number; tonase: number }>> = {};
  const stockByMaterial: Record<string, {
    fgTon: number;
    wipTon: number;
    fgQty: number;
    wipQty: number;
    primeTon: number;
    gradeCTon: number;
    gradeETon: number;
    customer: string;
    ukuran: string;
    type: 'LT' | 'ST';
    gudang: string;
    gudangList: Set<string>;
    gudangBreakdown: Record<string, {
      fgTon: number;
      wipTon: number;
      totalStockTon: number;
      fgQty: number;
      wipQty: number;
      totalStockQty: number;
      primeTon: number;
      gradeCTon: number;
      gradeETon: number;
    }>;
    batches: Array<{ batch: string; date: string; rawDate: unknown; qty: number; tonase: number }>;
  }> = {};

  const unfifoPipeList: UnfifoPipeItem[] = [];

  // 1. Process Raw Pipe Stock
  pipeRows.forEach((row, idx) => {
    const sloc = String(getRowValue(row, ['SLOC', 'Gudang', 'Storage Location', 'SLoc', 'Sloc']) || '');
    const g = normalizeGudang(sloc);

    const rawBerat = parseNumber(
      getRowValue(row, [
        'TTL STOCK EOm',
        'TTL STOCK EOM',
        'TTL STOK EOm',
        'TTL STOK EOM',
        'Berat',
        'Sum of Tonase',
        'Tonase',
        'Weight',
        'Stock (KG)',
        'Qty (KG)'
      ]) || 0
    );

    const tonase = rawBerat / 1000;
    if (tonase <= 0) return;

    const rawPanjang = String(getRowValue(row, ['PANJANG', 'Panjang', 'Length', 'Length(mm)']) || '');
    const matNum = String(getRowValue(row, ['MATERIAL NUMBER', 'Material Number', 'Material', 'Kode Material', 'Material No']) || '');
    const desc = String(getRowValue(row, ['DESCRIPTION', 'Description', 'Deskripsi']) || '');

    const { dimension: cleanDim, panjangMm: extractedPanjang } = extractPipeDimension(desc, matNum, rawPanjang);

    const isST = extractedPanjang < 3000;
    const isLT = !isST;

    const status = String(getRowValue(row, ['Status', 'STATUS', 'Proses', 'Process', 'Status Proses', 'Jenis Proses', 'STAT', 'Kategori', 'Status Barang']) || '').toUpperCase().trim();
    const upperDesc = desc.toUpperCase();

    // Klasifikasi status FG vs WIP (Aturan Resmi Spindo):
    // Jika pada kolom DESCRIPTION terdapat kata kunci "MP" -> FG (Finished Goods), selain itu -> WIP (Work In Process)
    const hasMPKeyword = /\bMP\b/i.test(desc) || /\bMP\s/i.test(desc) || /\sMP\b/i.test(desc);
    const isExplicitFG = status === 'FG' || status.includes('FINISHED') || status.includes('SUDAH');
    const isExplicitWIP = status === 'WIP' || status.includes('BELUM');

    const isFG = isExplicitWIP ? false : (isExplicitFG || hasMPKeyword);
    const isWIP = !isFG;

    const customer = String(getRowValue(row, ['Customer', 'CUSTOMER', 'Nama Customer', 'Pelanggan', 'Customers Gabungan']) || '').trim();
    const hasCustomer = customer !== '' && !customer.toUpperCase().includes('GENERAL') && customer !== '0';

    const pasm = String(getRowValue(row, ['PASM', 'PASM Status', 'Status PASM']) || '').toUpperCase();
    const isSlow = pasm.includes('SLOW') || pasm === 'S';

    const pasg = String(getRowValue(row, ['PASG', 'PASG Status', 'Status PASG']) || '').toUpperCase();
    const rawBatch = String(getRowValue(row, ['BATCH', 'Batch', 'Lot', 'No. Batch', 'No Batch']) || '').trim();
    const upperBatch = rawBatch.toUpperCase();

    // Kolom CUST.REMARK / No NC dari file SAP raw
    const rawCustRemark = String(
      getRowValue(row, [
        'CUST.REMARK',
        'CUST. REMARK',
        'CUST_REMARK',
        'Cust. Remarks',
        'Cust. Remark',
        'Cust Remarks',
        'CUSTOMER REMARK',
        'REMARKS',
        'Remarks',
        'Catatan Mutu',
        'Keterangan',
        'Alasan NC',
        'ALASAN',
        'Alasan',
        'STATUS MUTU'
      ]) || ''
    ).trim();

    const rawNoNC = String(
      getRowValue(row, [
        'NO NC',
        'No NC',
        'No. NC',
        'NO_NC',
        'No_NC',
        'NO NCR',
        'No NCR',
        'No. NCR',
        'NCR',
        'NO DOKUMEN',
        'No Dokumen',
        'No. Dokumen',
        'NO NC/NCR',
        'No NC/NCR'
      ]) || ''
    ).trim();

    // Ekstrak dan standardisasi pola nomor dokumen NC jika tertulis di dalam CUST.REMARK atau kolom NO NC
    const extractedFromRemark = extractNCRAndRemark(rawCustRemark);
    const extractedNoNC = rawNoNC ? normalizeNCRNumber(rawNoNC) : (extractedFromRemark.ncrNumber || '');
    const finalNoNC = extractedNoNC ? normalizeNCRNumber(extractedNoNC) : '';

    const upperCust = rawCustRemark.toUpperCase();

    // Deteksi UNFIFO Pipa: Hanya jika kolom UNFIFO atau PASM secara eksplisit berisi penanda
    const rawUnfifo = String(getRowValue(row, ['UNFIFO', 'Unfifo', 'STATUS UNFIFO', 'Status UNFIFO']) || '').toUpperCase().trim();
    const isUnfifoPipe = Boolean(rawUnfifo) || isSlow;

    // Suffix A / 0A / F0A = Prime (bukan NC), harus dicek SEBELUM grade C/E
    const endsWithPrime = upperBatch.endsWith('A') || upperBatch.endsWith('0A') || upperBatch.endsWith('F0A');

    const endsWithC = !endsWithPrime && (upperBatch.endsWith('C') || upperBatch.endsWith('0C') || upperBatch.endsWith('L0C'));
    const endsWithE = !endsWithPrime && (upperBatch.endsWith('E') || upperBatch.endsWith('0E') || upperBatch.endsWith('L0E'));

    const isGradeC = endsWithC || upperCust.includes('GRADE C') || pasg.includes('GRADE C') || pasg.includes('MUTU C') || pasg.includes('GRD C') || upperCust.includes('REPAIR');
    const isGradeE = endsWithE || upperCust.includes('GRADE E') || pasg.includes('GRADE E') || pasg.includes('MUTU E') || pasg.includes('GRD E') || upperCust.includes('HOLD');

    const isNC = !endsWithPrime && (
      isGradeC ||
      isGradeE ||
      pasg.includes('NON') ||
      pasg.includes('NC') ||
      upperCust.includes('NCR') ||
      upperCust.includes('DEPORMASI') ||
      upperCust.includes('DEFORMASI') ||
      upperCust.includes('KARAT') ||
      upperCust.includes('CACAT') ||
      upperCust.includes('RETURN') ||
      upperCust.includes('OVER') ||
      upperCust.includes('KL') ||
      upperCust.includes('KD') ||
      upperCust.includes('KLD') ||
      Boolean(finalNoNC) ||
      (rawCustRemark !== '' && rawCustRemark !== '-' && rawCustRemark !== '0' && rawCustRemark !== 'PRIME' && !rawCustRemark.startsWith('OK'))
    );

    const target = gudangMap[g] || gudangMap['Gd.01'];

    if (isLT && isWIP) target.wipLt += tonase;
    if (isLT && isFG) target.fgLt += tonase;
    if (isST && isWIP) target.wipSt += tonase;
    if (isST && isFG) target.fgSt += tonase;

    const rowQty = parseNumber(getRowValue(row, ['TTL STOK BOm', 'TTL STOK BOM', 'TTL STOCK BOm', 'Qty', 'Qty (Btg)']) || 0);

    if (hasCustomer) {
      target.customerStock += tonase;
      if (!customerBreakdownMap[g]) customerBreakdownMap[g] = {};
      if (!customerBreakdownMap['ALL']) customerBreakdownMap['ALL'] = {};

      const custKey = customer;
      if (!customerBreakdownMap[g][custKey]) customerBreakdownMap[g][custKey] = { qty: 0, tonase: 0 };
      customerBreakdownMap[g][custKey].qty += rowQty;
      customerBreakdownMap[g][custKey].tonase += tonase;

      if (!customerBreakdownMap['ALL'][custKey]) customerBreakdownMap['ALL'][custKey] = { qty: 0, tonase: 0 };
      customerBreakdownMap['ALL'][custKey].qty += rowQty;
      customerBreakdownMap['ALL'][custKey].tonase += tonase;
    } else {
      target.freeStock += tonase;
    }

    if (isSlow) {
      target.slowTon += tonase;
      if (isLT && isFG) target.fgLtSlow += tonase;
      if (isST && isFG) target.fgStSlow += tonase;
      if (isLT && isWIP) target.wipLtSlow += tonase;
      if (isST && isWIP) target.wipStSlow += tonase;
    } else {
      target.fastTon += tonase;
    }

    // Tahun produksi (Prod. Year) — dipakai agregasi slow per tahun + drilldown UNFIFO
    const extractedYear = extractProductionYear(row, rawBatch);

    if (isSlow) {
      if (!target.yearlySlowTon[extractedYear]) target.yearlySlowTon[extractedYear] = 0;
      target.yearlySlowTon[extractedYear] += tonase;
    }

    if (isNC) {
      const assignedGrade: 'Grade C' | 'Grade E' = isGradeC ? 'Grade C' : isGradeE ? 'Grade E' : (endsWithPrime ? 'Grade C' : 'Grade E');
      if (isGradeC) {
        target.gradeCTon += tonase;
      } else if (isGradeE) {
        target.gradeETon += tonase;
      } else {
        // NC tanpa grade eksplisit (dari cust remark catch-all) — default Grade C (less severe)
        target.gradeCTon += tonase;
      }

      const custName = customer || 'General Stock';
      // Agregasi Pipa NC per: Gudang + Ukuran + Customer + Tipe (LT/ST) + Grade
      const aggKey = `${g}|${cleanDim}|${custName}|${isLT ? 'LT' : 'ST'}|${assignedGrade}`;

      if (!ncItemAggMap[aggKey]) {
        ncItemAggMap[aggKey] = {
          gudang: g,
          ukuran: cleanDim,
          customer: custName,
          kodeMaterial: matNum || 'N/A',
          type: isLT ? 'LT' : 'ST',
          grade: assignedGrade,
          fgTon: 0,
          wipTon: 0,
          totalTon: 0,
          noNCList: new Set<string>(),
          remarksList: new Set<string>(),
          remarks: rawCustRemark || '-'
        };
      }

      if (finalNoNC) ncItemAggMap[aggKey].noNCList.add(finalNoNC);
      if (rawCustRemark && rawCustRemark !== '-' && rawCustRemark !== '0') {
        ncItemAggMap[aggKey].remarksList.add(rawCustRemark);
      }

      if (isFG) ncItemAggMap[aggKey].fgTon += tonase;
      if (isWIP) ncItemAggMap[aggKey].wipTon += tonase;
      ncItemAggMap[aggKey].totalTon += tonase;
    } else {
      target.primeTon += tonase;
    }

    const rawKodeMat = matNum || `MAT-${idx}`;
    const baseKodeMat = getMaterialBaseKey(rawKodeMat);
    const pipeGrade: 'PRIME' | 'Grade C' | 'Grade E' = isGradeE ? 'Grade E' : (isGradeC ? 'Grade C' : 'PRIME');

    if (!stockByMaterial[baseKodeMat]) {
      stockByMaterial[baseKodeMat] = {
        fgTon: 0,
        wipTon: 0,
        fgQty: 0,
        wipQty: 0,
        primeTon: 0,
        gradeCTon: 0,
        gradeETon: 0,
        customer: customer || 'General Stock',
        ukuran: cleanDim,
        type: isLT ? 'LT' : 'ST',
        gudang: g,
        gudangList: new Set<string>(),
        gudangBreakdown: {},
        batches: []
      };
    }
    stockByMaterial[baseKodeMat].gudangList.add(g);
    if (!stockByMaterial[baseKodeMat].gudangBreakdown[g]) {
      stockByMaterial[baseKodeMat].gudangBreakdown[g] = {
        fgTon: 0,
        wipTon: 0,
        totalStockTon: 0,
        fgQty: 0,
        wipQty: 0,
        totalStockQty: 0,
        primeTon: 0,
        gradeCTon: 0,
        gradeETon: 0
      };
    }

    if (pipeGrade === 'PRIME') {
      stockByMaterial[baseKodeMat].primeTon += tonase;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].primeTon += tonase;
    } else if (pipeGrade === 'Grade C') {
      stockByMaterial[baseKodeMat].gradeCTon += tonase;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].gradeCTon += tonase;
    } else {
      stockByMaterial[baseKodeMat].gradeETon += tonase;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].gradeETon += tonase;
    }

    if (isFG) {
      stockByMaterial[baseKodeMat].fgTon += tonase;
      stockByMaterial[baseKodeMat].fgQty += rowQty;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].fgTon += tonase;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].fgQty += rowQty;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].totalStockTon += tonase;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].totalStockQty += rowQty;
    }
    if (isWIP) {
      stockByMaterial[baseKodeMat].wipTon += tonase;
      stockByMaterial[baseKodeMat].wipQty += rowQty;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].wipTon += tonase;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].wipQty += rowQty;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].totalStockTon += tonase;
      stockByMaterial[baseKodeMat].gudangBreakdown[g].totalStockQty += rowQty;
    }

    const rawIncDate = getRowValue(row, ['Inc.Date', 'Posting Date', 'TPTP Inc.Date', 'Prod. Year']);
    const formattedDate = formatSapDate(rawIncDate, rawBatch);
    const qty = parseNumber(row['TTL STOK BOm'] || row['TTL STOK BOM'] || row['Qty'] || 1);
    stockByMaterial[baseKodeMat].batches.push({
      batch: rawBatch,
      date: formattedDate,
      rawDate: rawIncDate,
      qty,
      tonase
    });

    if (isUnfifoPipe) {
      unfifoPipeList.push({
        gudang: g,
        kodeMaterial: matNum || rawKodeMat,
        ukuran: cleanDim,
        customer: customer || 'General Stock',
        batch: rawBatch,
        qtyBtg: Math.round(rowQty || qty),
        tonase: Number(tonase.toFixed(3)),
        incDate: formattedDate,
        prodYear: extractedYear,
        unfifoStatus: isSlow ? 'SLOW MOVING' : (rawUnfifo || 'UNFIFO')
      });
    }
  });

  const pipeCapacities: WarehousePipeCapacity[] = allGudangs.map(g => {
    const d = gudangMap[g];
    const totalStock = d.wipLt + d.fgLt + d.wipSt + d.fgSt;
    const persenTerisi = d.kapasitas > 0 ? (totalStock / d.kapasitas) * 100 : 0;
    const selisih = d.kapasitas - totalStock;
    const persenFreeStock = totalStock > 0 ? (d.freeStock / totalStock) * 100 : 0;

    return {
      gudang: g,
      kapasitas: Number(d.kapasitas.toFixed(1)),
      stock: Number(totalStock.toFixed(1)),
      persenTerisi: Number(persenTerisi.toFixed(1)),
      selisih: Number(selisih.toFixed(1)),
      wipLt: Number(d.wipLt.toFixed(1)),
      fgLt: Number(d.fgLt.toFixed(1)),
      wipSt: Number(d.wipSt.toFixed(1)),
      fgSt: Number(d.fgSt.toFixed(1)),
      customerStock: Number(d.customerStock.toFixed(2)),
      freeStock: Number(d.freeStock.toFixed(2)),
      persenFreeStock: Number(persenFreeStock.toFixed(1)),
    };
  });

  const fastSlowData: FastSlowPipe[] = allGudangs.map(g => {
    const d = gudangMap[g];
    const total = d.fastTon + d.slowTon;
    const fastPersen = total > 0 ? (d.fastTon / total) * 100 : 0;
    const slowPersen = total > 0 ? (d.slowTon / total) * 100 : 0;

    return {
      gudang: g,
      fastTon: Number(d.fastTon.toFixed(1)),
      fastPersen: Number(fastPersen.toFixed(1)),
      slowTon: Number(d.slowTon.toFixed(1)),
      slowPersen: Number(slowPersen.toFixed(1)),
      totalTon: Number(total.toFixed(1)),
      fgLtSlow: Number(d.fgLtSlow.toFixed(2)),
      fgStSlow: Number(d.fgStSlow.toFixed(2)),
      wipLtSlow: Number(d.wipLtSlow.toFixed(2)),
      wipStSlow: Number(d.wipStSlow.toFixed(2)),
      yearlySlowTon: Object.fromEntries(
        Object.entries(d.yearlySlowTon).map(([k, v]) => [k, Number(v.toFixed(1))])
      ),
    };
  });

  const ncWarehouseData: PipeNCWarehouse[] = allGudangs.map(g => {
    const d = gudangMap[g];
    const total = d.primeTon + d.gradeETon + d.gradeCTon;
    const persenGradeE = total > 0 ? (d.gradeETon / total) * 100 : 0;
    return {
      gudang: g,
      prime: Number(d.primeTon.toFixed(1)),
      gradeE: Number(d.gradeETon.toFixed(1)),
      gradeC: Number(d.gradeCTon.toFixed(1)),
      persenGradeE: Number(persenGradeE.toFixed(1)),
    };
  });

  const parsedNCItems: PipeNCItem[] = Object.values(ncItemAggMap)
    .sort((a, b) => b.totalTon - a.totalTon)
    .map((item, idx) => {
      const noNCJoined = Array.from(item.noNCList).filter(Boolean).join(', ');
      const rawRemarks = Array.from(item.remarksList).filter((r) => r && r !== '-' && r !== '0');
      const remarksJoined = rawRemarks.join('; ');
      return {
        id: `nc-${idx + 1}`,
        gudang: item.gudang,
        ukuran: item.ukuran,
        customer: item.customer,
        kodeMaterial: item.kodeMaterial,
        type: item.type,
        grade: item.grade,
        fgTon: Number(item.fgTon.toFixed(3)),
        wipTon: Number(item.wipTon.toFixed(3)),
        totalTon: Number(item.totalTon.toFixed(3)),
        noNC: noNCJoined || undefined,
        remarks: remarksJoined || (item.remarks !== '-' ? item.remarks : (item.grade === 'Grade C' ? 'Grade C Repair' : 'Hold Mutu Grade E')),
      };
    });

  // 2. Process Coil & Strip
  const coilAreaMap: Record<string, { coilQty: number; coilTon: number; stripQty: number; stripTon: number; kap: number }> = {};
  const unfifoCoilList: UnfifoCoilItem[] = [];

  Object.keys(COIL_CAPACITY_MAP).forEach((g) => {
    coilAreaMap[g] = { coilQty: 0, coilTon: 0, stripQty: 0, stripTon: 0, kap: COIL_CAPACITY_MAP[g] || 7000 };
  });

  coilRows.forEach(row => {
    const sloc = String(getRowValue(row, ['SLOC', 'Gudang', 'Storage Location', 'SLoc', 'Sloc']) || '');
    const g = normalizeGudang(sloc);
    const desc = String(getRowValue(row, ['DESCRIPTION', 'Description', 'Deskripsi', 'Kode Material', 'Coil Specification']) || '').toUpperCase();
    const isStrip = desc.includes('STRIP') || desc.includes('SLIT');

    const rawBeratKg = parseNumber(
      getRowValue(row, [
        'TTL STOK BOm',
        'TTL STOK BOM',
        'TTL STOCK BOm',
        'S.AKHIR BOm FREE',
        'S.AWAL BOm FREE',
        'Berat',
        'Weight',
        'Stock (KG)'
      ]) || 0
    );

    const tonase = rawBeratKg > 0 ? rawBeratKg / 1000 : parseNumber(getRowValue(row, ['Sum of Tonase', 'Tonase']) || 0);

    const rawQty = parseNumber(
      getRowValue(row, [
        'TTL STOCK EOm',
        'TTL STOCK EOM',
        'TTL STOK EOm',
        'TTL STOK EOM',
        'S.AKHIR EOm FREE',
        'Qty',
        'Roll'
      ]) || 1
    );

    if (!coilAreaMap[g]) {
      coilAreaMap[g] = { coilQty: 0, coilTon: 0, stripQty: 0, stripTon: 0, kap: 7500 };
    }

    const target = coilAreaMap[g];
    if (isStrip) {
      target.stripQty += rawQty;
      target.stripTon += tonase;
    } else {
      target.coilQty += rawQty;
      target.coilTon += tonase;
    }

    // Deteksi UNFIFO Coil: Gunakan kolom PASM (SLOW/S atau terisi status non-kosong/non-FAST) atau kolom UNFIFO
    const rawUnfifo = String(getRowValue(row, ['UNFIFO', 'Unfifo', 'STATUS UNFIFO', 'Status UNFIFO']) || '').toUpperCase().trim();
    const rawPasm = String(getRowValue(row, ['PASM', 'PASM Status', 'Status PASM']) || '').toUpperCase().trim();
    const rawMatNum = String(getRowValue(row, ['MATERIAL NUMBER', 'Material Number', 'Kode Material']) || '');
    const rawSpec = String(getRowValue(row, ['Coil Specification', 'Specification', 'Spec']) || desc);
    const rawManuf = String(getRowValue(row, ['C.MANUFAKTUR', 'Manufaktur', 'Manufacturer']) || '-');
    const rawBatch = String(getRowValue(row, ['BATCH', 'Batch', 'Lot']) || '');
    const tebal = parseNumber(getRowValue(row, ['TEBAL', 'Tebal', 'Thickness']) || 0);
    const lebar = parseNumber(getRowValue(row, ['LEBAR', 'Lebar', 'Width']) || 0);
    const rawIncDate = getRowValue(row, ['Inc.Date', 'Posting Date', 'REMARKS', 'Remarks']);
    const formattedIncDate = formatSapDate(rawIncDate, rawBatch);

    const isPasmUnfifo = rawPasm !== '' && !rawPasm.includes('FAST') && rawPasm !== 'F';
    const isUnfifoCoil = Boolean(rawUnfifo) || isPasmUnfifo;

    if (isUnfifoCoil) {
      unfifoCoilList.push({
        gudang: g,
        kodeMaterial: rawMatNum,
        specification: rawSpec,
        manufaktur: rawManuf,
        batch: rawBatch,
        tebal,
        lebar,
        qtyRoll: Math.round(rawQty),
        tonase: Number(tonase.toFixed(3)),
        incDate: formattedIncDate,
        unfifoStatus: rawPasm || rawUnfifo || 'UNFIFO'
      });
    }
  });

  const coilStripData: CoilStripArea[] = Object.keys(coilAreaMap).map(g => {
    const d = coilAreaMap[g];
    const totalQty = d.coilQty + d.stripQty;
    const totalTon = d.coilTon + d.stripTon;
    const persenTerisi = d.kap > 0 ? (totalTon / d.kap) * 100 : 0;

    return {
      gudang: g,
      area: COIL_AREA_LABELS[g] || `Area ${g}`,
      coilQty: Math.round(d.coilQty),
      coilTon: Number(d.coilTon.toFixed(1)),
      stripQty: Math.round(d.stripQty),
      stripTon: Number(d.stripTon.toFixed(1)),
      totalQty: Math.round(totalQty),
      totalTon: Number(totalTon.toFixed(1)),
      kapasitas: d.kap,
      persenTerisi: Number(persenTerisi.toFixed(1)),
    };
  });

  // 3. Process LOO
  const looSTList: LooComparisonItem[] = [];
  const looLTList: LooComparisonItem[] = [];

  const looAggMap: Record<string, {
    customer: string;
    customerList: Set<string>;
    ukuran: string;
    kodeMaterial: string;
    looTon: number;
    looQty: number;
    type: 'LT' | 'ST';
  }> = {};

  looRows.forEach(row => {
    let rawKodeMat = String(
      getRowValue(row, [
        'Material',
        'Material Number',
        'Material Code',
        'Material No',
        'Mat. No',
        'Mat. Number',
        'Item Code',
        'Item',
        'Item No',
        'Kode Material',
        'Kode Barang',
        'Kode',
        'Matnr',
        'Part Number',
        'Part No',
        'Materialnummer',
        'Material / Ukuran',
        'Ukuran'
      ]) || ''
    ).trim();

    const desc = String(
      getRowValue(row, [
        'Description',
        'Material Description',
        'Item Description',
        'DESCRIPTION',
        'Deskripsi',
        'Deskripsi Material',
        'Nama Barang',
        'Nama Material',
        'Ukuran',
        'Spec',
        'Specification',
        'Dimensi',
        'Dimension'
      ]) || rawKodeMat
    ).trim();

    if (!rawKodeMat && !desc) return;
    if (!rawKodeMat) rawKodeMat = desc;

    if (isCoilOrStripMaterial(desc, rawKodeMat)) {
      return;
    }

    const rawBeratKurang = parseNumber(
      getRowValue(row, [
        'Kurang (KG)',
        'Berat Kurang (KG)',
        'Berat Kurang',
        'Order (KG)',
        'Berat Order (KG)',
        'Berat Order',
        'Qty.Kurang',
        'Qty Kurang',
        'Qty Kurang (KG)',
        'Open Qty (KG)',
        'Open Quantity (KG)',
        'Open Weight (KG)',
        'Open Weight',
        'Open KG',
        'Open Ton',
        'Outs (KG)',
        'Outs Qty (KG)',
        'Outs Qty',
        'Outs Weight',
        'Outstanding (KG)',
        'Outstanding',
        'Sisa (KG)',
        'Sisa Order (KG)',
        'Sisa Order',
        'Sisa Qty',
        'Total Kurang',
        'Total Kurang (KG)',
        'Total Order (KG)',
        'Total Order',
        'KURANG (KG)',
        'ORDER (KG)',
        'Weight',
        'Tonase',
        'Berat',
        'Net Weight',
        'Total Weight',
        'Quantity',
        'Kuantitas',
        'Qty',
        'Jumlah'
      ]) || 0
    );

    let looTon = rawBeratKurang / 1000;
    // Jika kolom langsung satuan Ton
    if (rawBeratKurang > 0 && rawBeratKurang < 100) {
      const tonHeader = getRowValue(row, ['Tonase', 'Open Ton', 'LOO Ton', 'Order (Ton)', 'Kurang (Ton)']);
      if (tonHeader) {
        looTon = rawBeratKurang;
      }
    }

    const looQty = parseNumber(
      getRowValue(row, [
        'Qty.Kurang',
        'Qty Kurang',
        'Qty. Order',
        'Qty Order',
        'Qty Btg',
        'Qty Pcs',
        'Outs Btg',
        'Outs Pcs',
        'Sisa Btg',
        'Sisa Pcs',
        'Open Btg',
        'Open Pcs',
        'Btg',
        'Pcs',
        'Batang',
        'QTY.KURANG',
        'QTY ORDER',
        'Quantity',
        'Qty',
        'Kuantitas',
        'Jumlah'
      ]) || 0
    );

    const custName = String(
      getRowValue(row, [
        'Pelanggan',
        'Nama Pelanggan',
        'Pelanggan                    .',
        'Customers Gabungan',
        'Customer',
        'Customer Name',
        'Nama Customer',
        'Nama Pemesan',
        'Pemesan',
        'CUSTOMER',
        'Sold to party',
        'Sold-to party',
        'Ship to party',
        'Ship-to party',
        'Sold To',
        'Ship To',
        'Name 1',
        'Name 2',
        'Nama 1',
        'Nama 2',
        'Cust Name',
        'Cust',
        'Client',
        'Buyer'
      ]) || ''
    ).trim();

    const baseLooMat = getMaterialBaseKey(rawKodeMat);
    const { dimension: looCleanDim, panjangMm: looPanjang } = extractPipeDimension(desc, rawKodeMat);
    const type: 'LT' | 'ST' = looPanjang < 3000 ? 'ST' : 'LT';

    if (!looAggMap[baseLooMat]) {
      looAggMap[baseLooMat] = {
        customer: custName || 'General Customer',
        customerList: new Set<string>(),
        ukuran: looCleanDim,
        kodeMaterial: baseLooMat,
        looTon: 0,
        looQty: 0,
        type
      };
    }
    if (custName && custName !== '0' && custName !== '-' && !custName.toUpperCase().includes('GENERAL')) {
      looAggMap[baseLooMat].customerList.add(custName);
    }
    looAggMap[baseLooMat].looTon += looTon;
    looAggMap[baseLooMat].looQty += looQty;
  });

  const combinedMatKeys = Array.from(new Set([...Object.keys(stockByMaterial), ...Object.keys(looAggMap)]));

  combinedMatKeys.forEach((k) => {
    const stock = stockByMaterial[k];
    const loo = looAggMap[k];

    if (isCoilOrStripMaterial(stock?.ukuran, k) || isCoilOrStripMaterial(loo?.ukuran, k)) {
      return;
    }

    if (!loo && (!stock || (stock.fgTon + stock.wipTon) <= 0)) {
      return;
    }

    const looCustStr = loo?.customerList && loo.customerList.size > 0
      ? Array.from(loo.customerList).join(', ')
      : (loo?.customer && loo.customer !== 'General Customer' ? loo.customer : '');

    const customer = looCustStr || (stock?.customer && stock.customer !== 'General Stock' ? stock.customer : (loo?.customer || 'General Customer'));

    const ukuran = stock?.ukuran || loo?.ukuran || k;
    const type: 'LT' | 'ST' = stock?.type || loo?.type || 'LT';

    const fgTon = stock?.fgTon || 0;
    const wipTon = stock?.wipTon || 0;
    const totalStockTon = fgTon + wipTon;
    const fgQty = stock?.fgQty || 0;
    const wipQty = stock?.wipQty || 0;
    const totalStockQty = fgQty + wipQty;

    const looTon = loo?.looTon || 0;
    const looQty = loo?.looQty || 0;
    const persenFulfillment = looTon > 0 ? (totalStockTon / looTon) * 100 : (totalStockTon > 0 ? 100 : 0);

    const gudangsArr = stock?.gudangList ? Array.from(stock.gudangList) : (stock?.gudang ? [stock.gudang] : []);
    const gudangDisplay = gudangsArr.length > 0 ? gudangsArr.join(', ') : '-';
    const primeTon = stock?.primeTon || 0;
    const gradeCTon = stock?.gradeCTon || 0;
    const gradeETon = stock?.gradeETon || 0;

    let dominantGrade: 'PRIME' | 'Grade C' | 'Grade E' | 'Campur' = 'PRIME';
    if (gradeETon > 0 && primeTon === 0 && gradeCTon === 0) dominantGrade = 'Grade E';
    else if (gradeCTon > 0 && primeTon === 0 && gradeETon === 0) dominantGrade = 'Grade C';
    else if ((primeTon > 0 && (gradeCTon > 0 || gradeETon > 0)) || (gradeCTon > 0 && gradeETon > 0)) dominantGrade = 'Campur';

    const primeFulfill = looTon > 0 ? (primeTon / looTon) * 100 : (primeTon > 0 ? 100 : 0);

    const item: LooComparisonItem = {
      no: 0,
      customer,
      ukuran,
      kodeMaterial: k,
      type,
      grade: dominantGrade,
      primeTon: Number(primeTon.toFixed(2)),
      gradeCTon: Number(gradeCTon.toFixed(2)),
      gradeETon: Number(gradeETon.toFixed(2)),
      gudang: gudangDisplay,
      gudangs: gudangsArr,
      fgTon: Number(fgTon.toFixed(2)),
      wipTon: Number(wipTon.toFixed(2)),
      totalStockTon: Number(totalStockTon.toFixed(2)),
      looTon: Number(looTon.toFixed(2)),
      persenFulfillment: Number(persenFulfillment.toFixed(1)),
      primeFulfillment: Number(primeFulfill.toFixed(1)),
      fgQty: Math.round(fgQty),
      wipQty: Math.round(wipQty),
      totalQty: Math.round(totalStockQty),
      looQty: Math.round(looQty),
      gudangBreakdown: stock?.gudangBreakdown || {}
    };

    if (type === 'ST') {
      looSTList.push(item);
    } else {
      looLTList.push(item);
    }
  });

  looSTList.sort((a, b) => b.looTon - a.looTon || b.totalStockTon - a.totalStockTon);
  const looSTData = looSTList.slice(0, 200).map((item, idx) => ({ ...item, no: idx + 1 }));

  looLTList.sort((a, b) => b.looTon - a.looTon || b.totalStockTon - a.totalStockTon);
  const looLTData = looLTList.slice(0, 200).map((item, idx) => ({ ...item, no: idx + 1 }));

  // 4. Calculate UNFIFO Violations
  const unfifoData: UnfifoItem[] = [];
  Object.keys(stockByMaterial).forEach(k => {
    const entry = stockByMaterial[k];
    if (entry.batches.length >= 2) {
      entry.batches.sort((a, b) => {
        const yrA = parseInt(a.batch.slice(1, 3), 10) || 20;
        const yrB = parseInt(b.batch.slice(1, 3), 10) || 20;
        return yrA - yrB;
      });

      const oldest = entry.batches[0];
      const newest = entry.batches[entry.batches.length - 1];

      const matchOld = oldest.batch.match(/^\d(\d{2})/);
      const matchNew = newest.batch.match(/^\d(\d{2})/);
      let diffDays = 365;

      if (matchOld && matchNew) {
        const yrOld = 2000 + parseInt(matchOld[1], 10);
        const yrNew = 2000 + parseInt(matchNew[1], 10);
        diffDays = Math.max((yrNew - yrOld) * 365, 90);
      }

      if (diffDays >= 90 && oldest.qty > 0) {
        unfifoData.push({
          gudang: entry.gudang,
          kodeMaterial: k,
          ukuran: entry.ukuran,
          customer: entry.customer,
          batchOld: oldest.batch,
          batchNew: newest.batch,
          dateOld: oldest.date,
          dateNew: newest.date,
          qtyOld: oldest.qty,
          tonaseOld: Number(oldest.tonase.toFixed(2)),
          agingDays: diffDays
        });
      }
    }
  });

  unfifoData.sort((a, b) => b.agingDays - a.agingDays);

  const finalCustomerBreakdown: Record<string, Array<{ customer: string; qty: number; tonase: number }>> = {};
  Object.keys(customerBreakdownMap).forEach(g => {
    finalCustomerBreakdown[g] = Object.keys(customerBreakdownMap[g])
      .map(cust => ({
        customer: cust,
        qty: customerBreakdownMap[g][cust].qty,
        tonase: Number(customerBreakdownMap[g][cust].tonase.toFixed(3))
      }))
      .sort((a, b) => b.tonase - a.tonase);
  });

  const result: ParsedWarehouseState = {
    lastUpdated: new Date().toLocaleString('id-ID'),
  };

  const hasPipe = Boolean(pipeRows && pipeRows.length > 0);
  const hasCoil = Boolean(coilRows && coilRows.length > 0);
  const hasLoo = Boolean(looRows && looRows.length > 0);

  if (hasPipe) {
    result.pipeCapacities = pipeCapacities;
    result.fastSlowData = fastSlowData;
    result.ncWarehouseData = ncWarehouseData;
    result.ncItems = parsedNCItems;
    result.unfifoPipeData = unfifoPipeList;
    result.customerBreakdown = finalCustomerBreakdown;
  }

  if (hasCoil) {
    result.coilStripData = coilStripData;
    result.unfifoCoilData = unfifoCoilList;
  }

  if (hasLoo || hasPipe) {
    result.looSTData = looSTData;
    result.looLTData = looLTData;
  }

  if (hasPipe || hasCoil) {
    result.unfifoData = unfifoData.slice(0, 10);
  }

  return result;
}

export async function readExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuf = e.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuf);
        let workbook: XLSX.WorkBook | null = null;
        let lastError: unknown = null;

        // Strategi 1: Array buffer standard
        try {
          workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });
        } catch (err1) {
          lastError = err1;
        }

        // Strategi 2: Array buffer raw tanpa date parsing
        if (!workbook) {
          try {
            workbook = XLSX.read(data, { type: 'array', raw: true });
          } catch (err2) {
            lastError = err2;
          }
        }

        // Strategi 3: Text decode (jika SAP export menghasilkan HTML / XML Spreadsheet / TSV / CSV dengan ekstensi .xlsx/.xls)
        if (!workbook) {
          try {
            const textUtf8 = new TextDecoder('utf-8').decode(data);
            workbook = XLSX.read(textUtf8, { type: 'string' });
          } catch (err3) {
            lastError = err3;
          }
        }

        // Strategi 4: Windows-1252 / ANSI decode (format standar export lama SAP GUI)
        if (!workbook) {
          try {
            const textAnsi = new TextDecoder('windows-1252').decode(data);
            workbook = XLSX.read(textAnsi, { type: 'string' });
          } catch (err4) {
            lastError = err4;
          }
        }

        if (!workbook) {
          const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
          if (errMsg.includes('Bad compressed size') || errMsg.includes('corrupted') || errMsg.includes('end of central directory')) {
            throw new Error(`File korup atau belum selesai diexport dari SAP (ukuran byte tidak utuh). Silakan buka file di Excel lalu klik "Save As" (.xlsx), atau export ulang dari SAP.`);
          }
          throw new Error(`Gagal membuka file Excel: ${errMsg}`);
        }

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Workbook tidak memiliki lembar kerja (sheet).');
        }

        // Cari sheet pertama yang memiliki data
        let worksheet: XLSX.WorkSheet | null = null;
        for (const sName of workbook.SheetNames) {
          const ws = workbook.Sheets[sName];
          if (ws && ws['!ref']) {
            worksheet = ws;
            break;
          }
        }

        if (!worksheet) {
          worksheet = workbook.Sheets[workbook.SheetNames[0]];
        }

        if (!worksheet) {
          throw new Error('Sheet kosong atau tidak ditemukan.');
        }

        // Ambil data dalam format 2D Array untuk deteksi baris header secara dinamis
        const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
        if (!rawMatrix || rawMatrix.length === 0) {
          resolve([]);
          return;
        }

        // Kata kunci penanda kolom header SAP (case-insensitive)
        const headerKeywords = [
          'material', 'sloc', 'storage location', 'batch', 'unrestricted', 'unrestricted use',
          'sum of tonase', 'ttl stock', 'ttl stok', 'berat', 'weight', 'tonase', 'mvt',
          'movement type', 'posting date', 'entry date', 'time of entry', 'order', 'package',
          'serial', 'customer', 'name 2', 'bwart', 'deskripsi', 'description', 'kondisi',
          'slot', 'dinding', 'segel', 'tgl', 'date', 'plant', 'werk', 'unfifo', 'fast', 'slow',
          'ukuran', 'dimension', 'qty', 'kuantitas', 'alasan nc', 'problem', 'text'
        ];

        // Deteksi baris header dalam 30 baris pertama
        let bestHeaderIdx = -1;
        let maxScore = 0;

        const scanLimit = Math.min(rawMatrix.length, 30);
        for (let i = 0; i < scanLimit; i++) {
          const rowArr = rawMatrix[i];
          if (!Array.isArray(rowArr) || rowArr.length === 0) continue;

          let score = 0;
          let filledCols = 0;

          rowArr.forEach((cell) => {
            const strVal = String(cell || '').trim().toLowerCase();
            if (strVal.length > 0) {
              filledCols++;
              if (headerKeywords.some((kw) => strVal.includes(kw) || kw.includes(strVal))) {
                score += 3;
              }
            }
          });

          if (filledCols >= 2 && score > maxScore) {
            maxScore = score;
            bestHeaderIdx = i;
          }
        }

        // Jika ditemukan baris header spesifik
        if (bestHeaderIdx !== -1 && maxScore >= 3) {
          const headerRow = rawMatrix[bestHeaderIdx] as unknown[];
          const headers = headerRow.map((h, colIdx) => {
            const cleanH = String(h || '').trim();
            return cleanH || `__EMPTY_${colIdx}`;
          });

          const parsedRows: Record<string, unknown>[] = [];
          for (let r = bestHeaderIdx + 1; r < rawMatrix.length; r++) {
            const rowArr = rawMatrix[r] as unknown[];
            if (!Array.isArray(rowArr)) continue;

            const isAllEmpty = rowArr.every((c) => c === undefined || c === null || String(c).trim() === '');
            if (isAllEmpty) continue;

            const rowObj: Record<string, unknown> = {};
            let hasAnyVal = false;
            headers.forEach((hdr, colIdx) => {
              const val = rowArr[colIdx];
              if (val !== undefined && val !== null && String(val).trim() !== '') {
                hasAnyVal = true;
              }
              rowObj[hdr] = val ?? '';
            });

            if (hasAnyVal) {
              parsedRows.push(rowObj);
            }
          }

          resolve(parsedRows);
          return;
        }

        // Fallback ke standar sheet_to_json jika tidak ada header khusus terdeteksi
        const standardJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
        resolve(standardJson);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(new Error(`Gagal membaca berkas: ${err}`));
    reader.readAsArrayBuffer(file);
  });
}
