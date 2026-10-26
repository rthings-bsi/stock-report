import {
  MB51Dataset,
  MB51BucketRecord,
  MB51HourlyRecord,
  ShiftName,
  DateMode,
} from '@/types/productivity';

export const GUDANG_ORDER = [
  'Gd.01', 'Gd.02', 'Gd.03', 'Gd.04', 'Gd.05', 'Gd.06',
  'Gd.08', 'Gd.09', 'Gd.10', 'Gd.11', 'Gd.12', 'Gd.13', 'Gd.14',
  'x Sloc Lama', 'x Packaging', 'x Transit',
];

// Tabel VLOOKUP(LEFT(Kode Material, 2), ah!D:E, 2, FALSE)
export const KODMAT_PREFIX_MAP: Record<string, string> = {
  C1: '1. Coil',
  C2: '2. Strip',
  C3: '2. Strip',
  A2: '3. Pipa', A4: '3. Pipa', G1: '3. Pipa', G5: '3. Pipa',
  H1: '3. Pipa', H2: '3. Pipa', H3: '3. Pipa', J1: '3. Pipa',
  P3: '3. Pipa', U1: '3. Pipa', UA: '3. Pipa', UB: '3. Pipa',
  X1: '3. Pipa', X3: '3. Pipa', X4: '3. Pipa', XA: '3. Pipa',
  XB: '3. Pipa', XC: '3. Pipa', XD: '3. Pipa', XF: '3. Pipa',
  XG: '3. Pipa', XH: '3. Pipa', XJ: '3. Pipa', Y1: '3. Pipa',
  Y3: '3. Pipa', YA: '3. Pipa', YB: '3. Pipa', YC: '3. Pipa',
  YD: '3. Pipa', YE: '3. Pipa', YG: '3. Pipa', YH: '3. Pipa',
  Z1: '3. Pipa', Z5: '3. Pipa', ZA: '3. Pipa', ZC: '3. Pipa',
};

// Tabel VLOOKUP(MID(Sloc, 2, 1), ah!J:K, 2, FALSE)
export const SLOC_TO_GUDANG: Record<string, string> = {
  A: 'Gd.01',
  B: 'Gd.02',
  C: 'Gd.03',
  D: 'Gd.04',
  E: 'Gd.05',
  F: 'Gd.06',
  G: 'Gd.08',
  H: 'Gd.09',
  I: '-',
  J: 'Gd.10',
  K: 'Gd.11',
  L: 'Gd.12',
  M: 'Gd.13',
  N: 'Gd.14',
  O: 'x Packaging',
  T: 'x Transit',
  5: 'x Sloc Lama',
};

// Tabel VLOOKUP(User name, ah!R:S, 2, FALSE)
export const USER_TO_DEVICE: Record<string, string> = {
  ADMWHBARCODE: 'Desktop',
  ADMWHEXISTNG: 'Desktop',
  ADMWHEXPANSI: 'Desktop',
  ADMWHRTP: 'Desktop',
  AHADI: 'Desktop',
  ARONI: 'Desktop',
  DFIRDAUS: 'Desktop',
  DTARIGAN: 'Desktop',
  ERINALDY: 'Desktop',
  FARDIAWAN: 'Desktop',
  FPERDANA: 'Desktop',
  'GIGR-03': 'Desktop',
  GIPURWAKA: 'Desktop',
  GUDANG01A: 'HandHeld',
  GUDANG01B: 'HandHeld',
  GUDANG02A: 'HandHeld',
  GUDANG02B: 'HandHeld',
  GUDANG02C: 'HandHeld',
  GUDANG02D: 'HandHeld',
  GUDANG03A: 'HandHeld',
  GUDANG03B: 'HandHeld',
  GUDANG04B: 'HandHeld',
  GUDANG04C: 'HandHeld',
  GUDANG05A: 'HandHeld',
  GUDANG05B: 'HandHeld',
  GUDANG05C: 'HandHeld',
  GUDANG05D: 'HandHeld',
  GUDANG05E: 'HandHeld',
  GUDANG10A: 'HandHeld',
  GUDANG11A: 'HandHeld',
  GUDANG11B: 'HandHeld',
  GUDANG11C: 'HandHeld',
  GUDANG12A: 'HandHeld',
  GUDANG12B: 'HandHeld',
  GUDANG13A: 'HandHeld',
  GUDANG13B: 'HandHeld',
  GUDANG13C: 'HandHeld',
  GUDANG14A: 'HandHeld',
  GUDANG14B: 'HandHeld',
  GUDANG14C: 'HandHeld',
  GUDANGADM01: 'Desktop',
  GUDANGADM02: 'Desktop',
  GUDANGADM03: 'Desktop',
  GUDANGADM04: 'Desktop',
  GUDANGADM05: 'Desktop',
  GUDANGADM08: 'Desktop',
  GUDANGRM1: 'HandHeld',
  GUDANGRM2: 'HandHeld',
  GUDANGRM3: 'HandHeld',
  GUDANGRTP01: 'HandHeld',
  GUDANGRTP02: 'HandHeld',
  HSAPUTRA: 'Desktop',
  IHAKIM: 'Desktop',
  IRAFIANSYAH: 'Desktop',
  ISETYAWAN: 'Desktop',
  OMARYANTO: 'Desktop',
  'QC_SKF-001': 'Desktop',
  RHAMID: 'Desktop',
  RMAULIDA: 'Desktop',
  RPURBA: 'Desktop',
  'RRUD-01': 'Desktop',
  'RRUD-02': 'Desktop',
  'RRUD-04': 'Desktop',
  SRACHIM: 'Desktop',
  TSEPTIADI: 'Desktop',
};

// Tabel VLOOKUP(Mvt & " - " & IF(Qty<0,"OUT","IN"), ah!U:V, 2, FALSE)
export const MVT_DIR_MAP: Record<string, string> = {
  '101_IN': '1. Penerimaan',
  '102_OUT': '1. Penerimaan',
  '261_OUT': '2. Pengeluaran',
  '262_IN': '2. Pengeluaran',
  '309_IN': '-',
  '309_OUT': '-',
  '310_IN': '-',
  '310_OUT': '-',
  '311_IN': '1. Penerimaan',
  '311_OUT': '2. Pengeluaran',
  '312_IN': '1. Penerimaan',
  '312_OUT': '2. Pengeluaran',
  '601_OUT': '2. Pengeluaran',
  '602_IN': '2. Pengeluaran',
  '641_IN': '2. Pengeluaran',
  '641_OUT': '2. Pengeluaran',
  '642_OUT': '2. Pengeluaran',
  '901_IN': '1. Penerimaan',
  '902_OUT': '1. Penerimaan',
  '541_OUT': '2. Pengeluaran',
  '542_IN': '2. Pengeluaran',
};

// Tabel VLOOKUP(Kode Work Center, ah!X:Y, 2, FALSE)
export const WC_LOOKUP_MAP: Record<string, string> = {
  '-': '-',
  '- 4800': '0. SPINDO Unit Lain',
  '- 4900': '0. SPINDO Unit Lain',
  '- 5000': 'no',
  'ALUMINIUM EXTRUSION INDONESIA - 4500': '6. Subcont Alexindo',
  'BAOSTEEL SINGAPORE PTE LTD. - 4700': '0. Vendor Import',
  'CUTC - 5000': '3.b Cut. CIRCLE',
  'CUTH - 5000': '3.c Cut. HELLES',
  'CUTL - 5000': '3.d Cut. LASER',
  'CUTP - 5000': '3.a Cut. HAVEN',
  'CUTS - 5000': '3.e Cut. SAW',
  'CV. CAHAYA SINAR GEMILANG - 4500': '6. Subcont CSG',
  'DEB- - 5000': '4.c DEBURING',
  'EBR- - 5000': '4.b ENDBRUSHING',
  'EFC- - 5000': 'no',
  'EXSW - 5000': '4.a SWADGING',
  'HYD- - 5000': 'no',
  'M&P- - 5000': '5. Marking Packing',
  'MILL - 5000': '2. Prod. MILL',
  'PT. RAJAWALI KARYA PERKASA - 4500': '6. Subcont RKP',
  'PT. VASTEX INTI MULIA - 4500': '6. Subcont VASTEX',
  'PT. WELDPART INDONESIA - 4500': '6. Subcont WPI',
  'PT.BAOSTEEL INDONESIA STEEL - 4500': '6. Subcont BISC',
  'REP- - 5000': 'no',
  'SINO GLORY METAL RESOURCES INTERNAT - 4700': '0. Vendor Import',
  'SLIT - 5000': '1. Prod. SLITTER',
  'UTF- - 5000': 'no',
  'POSCO INTERNATIONAL CORPORATION - 4700': '0. Vendor Import',
  'PT. LAUTAN BAJA INDONESIA - 4500': '0. Vendor LOCAL',
  'PT. PDF PRESISI ENGINEERING - 4500': '6. Subcont PDF Presisi',
  'PT UNIVERSAL METAL INVESTMENT - 4500': '0. Vendor LOCAL',
};

// Tabel VLOOKUP(Kode Work Center & " / " & Mvt, ah!AA:AB, 2, FALSE)
export const WC_MVT_LOOKUP_MAP: Record<string, string> = {
  '- / 309': 'no',
  '- / 310': 'no',
  '- / 311': '5. Transfer SLOC',
  '- / 312': '5. Transfer SLOC',
  '- / 601': '4. Kirim Customer',
  '- / 602': '4. Kirim Customer',
  '0. SPINDO UNIT LAIN / 101': '0. SPINDO Unit Lain',
  '0. SPINDO UNIT LAIN / 641': '0. SPINDO Unit Lain',
  '0. SPINDO UNIT LAIN / 642': '0. SPINDO Unit Lain',
  '0. VENDOR IMPORT / 901': '3. Vendor',
  '1. PROD. SLITTER / 101': '1. Hasil Produksi',
  '1. PROD. SLITTER / 102': '1. Hasil Produksi',
  '1. PROD. SLITTER / 261': '2. Bahan Produksi',
  '1. PROD. SLITTER / 262': '2. Bahan Produksi',
  '2. PROD. MILL / 101': '1. Hasil Produksi',
  '2. PROD. MILL / 102': '1. Hasil Produksi',
  '2. PROD. MILL / 261': '2. Bahan Produksi',
  '2. PROD. MILL / 262': '2. Bahan Produksi',
  '3.A CUT. HAVEN / 101': '1. Hasil Produksi',
  '3.A CUT. HAVEN / 102': '1. Hasil Produksi',
  '3.A CUT. HAVEN / 261': '2. Bahan Produksi',
  '3.A CUT. HAVEN / 262': '2. Bahan Produksi',
  '3.B CUT. CIRCLE / 101': '1. Hasil Produksi',
  '3.B CUT. CIRCLE / 102': '1. Hasil Produksi',
  '3.B CUT. CIRCLE / 261': '2. Bahan Produksi',
  '3.B CUT. CIRCLE / 262': '2. Bahan Produksi',
  '3.C CUT. HELLES / 101': '1. Hasil Produksi',
  '3.C CUT. HELLES / 102': '1. Hasil Produksi',
  '3.C CUT. HELLES / 261': '2. Bahan Produksi',
  '3.C CUT. HELLES / 262': '2. Bahan Produksi',
  '3.D CUT. LASER / 101': '1. Hasil Produksi',
  '3.D CUT. LASER / 102': '1. Hasil Produksi',
  '3.D CUT. LASER / 261': '2. Bahan Produksi',
  '3.D CUT. LASER / 262': '2. Bahan Produksi',
  '3.E CUT. SAW / 101': '1. Hasil Produksi',
  '3.E CUT. SAW / 102': '1. Hasil Produksi',
  '3.E CUT. SAW / 261': '2. Bahan Produksi',
  '3.E CUT. SAW / 262': '2. Bahan Produksi',
  '4.A SWADGING / 101': '1. Hasil Produksi',
  '4.A SWADGING / 102': '1. Hasil Produksi',
  '4.A SWADGING / 261': '2. Bahan Produksi',
  '4.A SWADGING / 262': '2. Bahan Produksi',
  '4.B ENDBRUSHING / 101': '1. Hasil Produksi',
  '4.B ENDBRUSHING / 261': '2. Bahan Produksi',
  '4.B ENDBRUSHING / 262': '2. Bahan Produksi',
  '4.C DEBURING / 101': '1. Hasil Produksi',
  '4.C DEBURING / 261': '2. Bahan Produksi',
  '4.C DEBURING / 262': '2. Bahan Produksi',
  '5. MARKING PACKING / 101': '1. Hasil Produksi',
  '5. MARKING PACKING / 102': '1. Hasil Produksi',
  '5. MARKING PACKING / 261': '2. Bahan Produksi',
  '5. MARKING PACKING / 262': '2. Bahan Produksi',
  '6. SUBCONT ALEXINDO / 901': '3. Subcont',
  '6. SUBCONT BISC / 901': '3. Subcont',
  '6. SUBCONT BISC / 902': '3. Subcont',
  '6. SUBCONT CSG / 901': '3. Subcont',
  '6. SUBCONT CSG / 902': '3. Subcont',
  '6. SUBCONT RKP / 901': '3. Subcont',
  '6. SUBCONT RKP / 902': '3. Subcont',
  '6. SUBCONT VASTEX / 901': '3. Subcont',
  '6. SUBCONT VASTEX / 902': '3. Subcont',
  '6. SUBCONT WPI / 901': '3. Subcont',
  '6. SUBCONT WPI / 902': '3. Subcont',
  '6. SUBCONT PDF PRESISI / 901': '3. Subcont',
  '0. VENDOR LOCAL / 901': '3. Vendor',
  '0. VENDOR LOCAL / 902': '3. Vendor',
  'NO / 101': 'no',
  'NO / 102': 'no',
  'NO / 261': 'no',
  'NO / 262': 'no',
  '- / 541': '4. Kirim SUBCONT',
  '- / 542': '4. Kirim SUBCONT',
};

export function normCodeStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : String(val);
  }
  const s = String(val).trim();
  if (!s || s === 'None' || s.startsWith('#')) return '';
  if (s.endsWith('.0') && /^-?\d+$/.test(s.slice(0, -2))) {
    return s.slice(0, -2);
  }
  return s;
}

export function formatDate(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    // Excel serial date (e.g. 45627 = ~2024-12-01)
    if (val > 30000 && val < 60000) {
      const dt = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(dt.getTime())) {
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  const s = String(val).trim();
  if (!s || s.startsWith('#')) return '';
  const s10 = s.slice(0, 10).trim();
  if (s10.length === 10 && s10[4] === '-' && s10[7] === '-') {
    return s10;
  }

  // Coba parse format DD.MM.YYYY, DD/MM/YYYY, DD:MM:YYYY, YYYY/MM/DD
  const m = s10.match(/^(\d{1,4})[./:-](\d{1,2})[./:-](\d{1,4})$/);
  if (m) {
    let p1 = parseInt(m[1], 10);
    let p2 = parseInt(m[2], 10);
    let p3 = parseInt(m[3], 10);
    if (p1 > 1000) {
      // YYYY-MM-DD
      return `${p1}-${String(p2).padStart(2, '0')}-${String(p3).padStart(2, '0')}`;
    }
    if (p3 > 1000) {
      // DD-MM-YYYY
      return `${p3}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
  }

  return '';
}

export function parseHour(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    return val.getHours();
  }
  if (typeof val === 'number') {
    if (val >= 0.0 && val < 1.0) {
      return Math.floor(Math.round(val * 86400) / 3600) % 24;
    }
    if (val >= 0 && val <= 23 && Number.isInteger(val)) {
      return val;
    }
  }
  const s = String(val).trim();
  if (s.includes(':')) {
    const h = parseInt(s.split(':')[0], 10);
    if (!isNaN(h) && h >= 0 && h <= 23) return h;
  }
  if (s.includes('.')) {
    const h = parseInt(s.split('.')[0], 10);
    if (!isNaN(h) && h >= 0 && h <= 23) return h;
  }
  return null;
}

export function parseFloatValue(val: unknown): number {
  if (val === null || val === undefined) return 0.0;
  if (typeof val === 'number') return isNaN(val) ? 0.0 : val;
  let s = String(val).trim();
  if (!s || s.startsWith('#') || s === '-') return 0.0;

  let isNeg = false;
  if (s.startsWith('-') || s.endsWith('-')) {
    isNeg = true;
    s = s.replace(/^-+|-+$/g, '').trim();
  } else if (s.startsWith('(') && s.endsWith(')')) {
    isNeg = true;
    s = s.slice(1, -1).trim();
  }

  s = s.replace(/[\s ]/g, '');
  if (!s) return 0.0;

  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 3) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }

  const res = parseFloat(s);
  if (isNaN(res)) return 0.0;
  return isNeg ? -res : res;
}

export function deriveJenisMatr(kodeMaterialVal: unknown): string {
  const km = normCodeStr(kodeMaterialVal).toUpperCase();
  if (km.length >= 2) {
    const prefix = km.slice(0, 2);
    if (KODMAT_PREFIX_MAP[prefix]) {
      return KODMAT_PREFIX_MAP[prefix];
    }
  }
  return '3. Pipa';
}

export function deriveGudang(slocVal: unknown): string {
  const s = normCodeStr(slocVal).toUpperCase();
  if (s.length >= 2) {
    return SLOC_TO_GUDANG[s[1]] || '';
  }
  return '';
}

export function deriveDevice(usernameVal: unknown): string {
  const u = normCodeStr(usernameVal).toUpperCase();
  if (!u) return '';
  if (USER_TO_DEVICE[u]) return USER_TO_DEVICE[u];
  if (u.startsWith('GUDANG') && !u.startsWith('GUDANGADM')) return 'HandHeld';
  return '';
}

export function deriveShiftAndTk(entryDateStr: string, hour: number | null): { shift: ShiftName; tkStr: string } {
  if (hour === null) {
    return { shift: 'Shift 1', tkStr: entryDateStr };
  }
  if (hour >= 7 && hour <= 14) {
    return { shift: 'Shift 1', tkStr: entryDateStr };
  }
  if (hour >= 15 && hour <= 22) {
    return { shift: 'Shift 2', tkStr: entryDateStr };
  }
  // Cutoff 24 jam shift 3 (23:00 - 06:59): jam 00:00 - 06:59 adalah tanggal kerja hari sebelumnya (Day-1)
  if (hour >= 0 && hour <= 6 && entryDateStr) {
    try {
      const dt = new Date(`${entryDateStr}T12:00:00Z`);
      dt.setUTCDate(dt.getUTCDate() - 1);
      const prevStr = dt.toISOString().slice(0, 10);
      return { shift: 'Shift 3', tkStr: prevStr };
    } catch {
      // fallback
    }
  }
  return { shift: 'Shift 3', tkStr: entryDateStr };
}

export function deriveMasukKeluar(mvtVal: unknown, qtyVal: number): string {
  const mvt = normCodeStr(mvtVal);
  const dir = qtyVal < 0 ? 'OUT' : 'IN';
  return MVT_DIR_MAP[`${mvt}_${dir}`] || '';
}

export function deriveWcAndMvt(
  name2Val: unknown,
  poVal: unknown,
  orderVal: unknown,
  wcVal: unknown,
  mvtVal: unknown
): { kodeWc: string; kodeWcMvt: string } {
  const name2 = normCodeStr(name2Val);
  const po = normCodeStr(poVal);
  const order = normCodeStr(orderVal);
  const wc = normCodeStr(wcVal);
  const mvt = normCodeStr(mvtVal);

  const leftPart = (po ? name2 : '') + wc.slice(0, 4);
  const rightPart = order.slice(0, 4) + po.slice(0, 4);
  const wcKey = `${leftPart} - ${rightPart}`.trim().toUpperCase();
  const kodeWc = WC_LOOKUP_MAP[wcKey] || wcKey;
  const wcMvtKey = `${kodeWc} / ${mvt}`.trim().toUpperCase();
  const kodeWcMvt = WC_MVT_LOOKUP_MAP[wcMvtKey] || 'no data';
  return { kodeWc, kodeWcMvt };
}

function findHeaderMap(row: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < row.length; i++) {
    const val = row[i];
    if (val !== null && val !== undefined) {
      const key = String(val).trim().toLowerCase().replace(/\s+/g, ' ');
      if (key && !(key in map)) {
        map[key] = i;
      }
    }
  }
  return map;
}

function getColIdx(normMap: Record<string, number>, candidates: string[]): number | undefined {
  for (const c of candidates) {
    const k = c.trim().toLowerCase().replace(/\s+/g, ' ');
    if (k in normMap) {
      return normMap[k];
    }
  }
  return undefined;
}

export function parseMB51File(
  matrix: unknown[][],
  sourceFilename = 'SAP_MB51_Export.xlsx',
  fallbackDate = ''
): MB51Dataset {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new Error('File tidak memuat baris data yang dapat dibaca.');
  }

  let headerMap: Record<string, number> | null = null;
  let colIndices: Record<string, number | undefined> = {};
  let headerRowIndex = -1;

  // Scan hingga 30 baris awal untuk mendeteksi baris header
  for (let r = 0; r < Math.min(matrix.length, 30); r++) {
    const candMap = findHeaderMap(matrix[r]);
    const hasDate = getColIdx(candMap, [
      'entry date', 'posting date', 'pstng date', 'tanggal kerja', 'entered on', 'cpudt', 'budat',
    ]) !== undefined;
    const hasBeratOrQty = getColIdx(candMap, [
      'berat', 'weight', 'qty', 'quantity', 'quantity in une', 'qty in un. of entry', 'qty in un.of entry',
    ]) !== undefined;

    if (hasDate && hasBeratOrQty) {
      headerMap = candMap;
      headerRowIndex = r;
      colIndices = {
        // Kolom helper jika file sudah di-enrich
        jenis_matr: getColIdx(headerMap, ['jenis matr.', 'jenis material', 'jenis mtr.2']),
        gudang: getColIdx(headerMap, ['gudang', 'warehouse']),
        device: getColIdx(headerMap, ['handheld / desktop', 'hh / desktop', 'device']),
        tanggal_kerja: getColIdx(headerMap, ['tanggal kerja']),
        shift: getColIdx(headerMap, ['shift']),
        jam: getColIdx(headerMap, ['jam', 'jam kerja']),
        masuk_keluar: getColIdx(headerMap, ['masuk / keluar', 'in / out']),
        kode_wc: getColIdx(headerMap, ['kode work center']),
        kode_wc_mvt: getColIdx(headerMap, ['kode work center + mvt']),
        // Kolom raw SAP MB51
        entry_date: getColIdx(headerMap, ['entry date', 'entered on', 'cpudt']),
        entry_time: getColIdx(headerMap, ['entry time', 'time of entry', 'entered at', 'cputm']),
        plant: getColIdx(headerMap, ['plant', 'werks']),
        sloc: getColIdx(headerMap, ['sloc', 'storage location', 'stor. loc.', 'lgort']),
        posting_date: getColIdx(headerMap, ['posting date', 'pstng date', 'budat']),
        mvt: getColIdx(headerMap, ['mvt', 'movement type', 'mov.type', 'bwart']),
        name2: getColIdx(headerMap, ['name 2', 'name 1', 'vendor', 'customer']),
        po: getColIdx(headerMap, ['purchase order', 'po', 'ebeln']),
        order: getColIdx(headerMap, ['order', 'aufnr']),
        work_center: getColIdx(headerMap, ['work center', 'work ctr', 'arbpl']),
        kode_material: getColIdx(headerMap, ['kode material', 'material', 'matnr']),
        material_desc: getColIdx(headerMap, ['material description', 'material desc', 'maktx']),
        batch: getColIdx(headerMap, ['batch', 'charg']),
        qty: getColIdx(headerMap, [
          'qty in un. of entry', 'qty in un.of entry', 'quantity in une', 'qty in unit of entry', 'qty', 'erfmg',
        ]),
        berat: getColIdx(headerMap, [
          'berat', 'weight', 'net weight', 'ntgew', 'brgew', 'quantity', 'menge',
        ]),
        username: getColIdx(headerMap, ['user name', 'username', 'created by', 'usnam']),
      };

      if (colIndices.berat === undefined) {
        colIndices.berat = colIndices.qty;
      }
      break;
    }
  }

  if (!headerMap || headerRowIndex === -1) {
    throw new Error(
      'Header kolom MB51 tidak ditemukan. Pastikan file memiliki kolom tanggal (Entry Date / Posting Date) dan kuantitas (Qty / Berat).'
    );
  }

  type BucketKey = string;
  const buckets: Record<BucketKey, {
    dateMode: DateMode;
    tanggal: string;
    shift: ShiftName;
    gudang: string;
    hhInKg: number;
    hhOutKg: number;
    hhInTx: number;
    hhOutTx: number;
    allInKg: number;
    allOutKg: number;
    allInTx: number;
    allOutTx: number;
    rawAbsKg: number;
    rawTx: number;
    coilKg: number;
    stripKg: number;
    pipaKg: number;
  }> = {};

  type HourlyKey = string;
  const hourlyBuckets: Record<HourlyKey, {
    dateMode: DateMode;
    tanggal: string;
    shift: ShiftName;
    hour: number;
    gudang: string;
    hhTx: number;
    allTx: number;
    hhKg: number;
  }> = {};

  let totalRowsRead = 0;
  const datesPdSet = new Set<string>();
  const datesTkSet = new Set<string>();

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const val = (k: string) => {
      const idx = colIndices[k];
      return idx !== undefined && idx < row.length ? row[idx] : undefined;
    };

    const rawBerat = val('berat');
    const rawTk = val('tanggal_kerja');
    const rawPd = val('posting_date');
    const rawEd = val('entry_date');

    if (rawBerat === undefined && rawTk === undefined && rawPd === undefined && rawEd === undefined) {
      continue;
    }

    const berat = parseFloatValue(rawBerat);
    const qtyVal = parseFloatValue(val('qty'));

    let edStr = formatDate(rawEd);
    let pdStr = formatDate(rawPd);
    let tkStr = formatDate(rawTk);

    if (!pdStr && edStr) pdStr = edStr;
    if (!edStr && pdStr) edStr = pdStr;
    if (!pdStr && fallbackDate) pdStr = fallbackDate;
    if (!edStr && fallbackDate) edStr = fallbackDate;

    let hour = parseHour(val('jam'));
    if (hour === null) {
      hour = parseHour(val('entry_time'));
    }

    const shRaw = normCodeStr(val('shift'));
    let sh: ShiftName = 'Shift 1';

    if (!shRaw || !tkStr) {
      const derived = deriveShiftAndTk(edStr, hour);
      if (!shRaw) {
        sh = derived.shift;
      } else {
        const u = shRaw.toUpperCase();
        if (u.includes('1')) sh = 'Shift 1';
        else if (u.includes('2')) sh = 'Shift 2';
        else if (u.includes('3')) sh = 'Shift 3';
      }
      if (!tkStr) {
        tkStr = derived.tkStr;
      }
    } else {
      const u = shRaw.toUpperCase();
      if (u.includes('1')) sh = 'Shift 1';
      else if (u.includes('2')) sh = 'Shift 2';
      else if (u.includes('3')) sh = 'Shift 3';
    }

    if (!tkStr && pdStr) tkStr = pdStr;
    if (!pdStr && tkStr) pdStr = tkStr;
    if (!tkStr && !pdStr) continue;

    totalRowsRead++;

    // 1. Gudang
    let gd = normCodeStr(val('gudang'));
    if (!gd) {
      gd = deriveGudang(val('sloc'));
    }
    if (!gd || gd === '-') continue;

    // 2. Device (HandHeld vs Desktop)
    let dev = normCodeStr(val('device'));
    if (!dev) {
      dev = deriveDevice(val('username'));
    }
    const isHandheld = dev.toLowerCase() === 'handheld';

    // 3. Masuk / Keluar
    let mk = normCodeStr(val('masuk_keluar'));
    if (!mk) {
      const signRef = qtyVal !== 0 ? qtyVal : berat;
      mk = deriveMasukKeluar(val('mvt'), signRef);
    }

    // 4. Kode Work Center + MVT
    let wcMvt = normCodeStr(val('kode_wc_mvt'));
    if (!wcMvt) {
      const derivedWc = deriveWcAndMvt(val('name2'), val('po'), val('order'), val('work_center'), val('mvt'));
      wcMvt = derivedWc.kodeWcMvt;
    }
    const isMvtValid = wcMvt.toLowerCase() !== 'no';

    // 5. Jenis Material
    let jm = normCodeStr(val('jenis_matr'));
    if (!jm) {
      jm = deriveJenisMatr(val('kode_material'));
    }

    if (pdStr) datesPdSet.add(pdStr);
    if (tkStr) datesTkSet.add(tkStr);

    const modes: [DateMode, string][] = [
      ['posting_date', pdStr],
      ['tanggal_kerja', tkStr],
    ];

    for (const [dMode, dStr] of modes) {
      if (!dStr) continue;
      const bKey = `${dMode}_${dStr}_${sh}_${gd}`;
      if (!buckets[bKey]) {
        buckets[bKey] = {
          dateMode: dMode,
          tanggal: dStr,
          shift: sh,
          gudang: gd,
          hhInKg: 0,
          hhOutKg: 0,
          hhInTx: 0,
          hhOutTx: 0,
          allInKg: 0,
          allOutKg: 0,
          allInTx: 0,
          allOutTx: 0,
          rawAbsKg: 0,
          rawTx: 0,
          coilKg: 0,
          stripKg: 0,
          pipaKg: 0,
        };
      }
      const b = buckets[bKey];
      b.rawAbsKg += Math.abs(berat);
      b.rawTx += 1;

      if (isMvtValid) {
        if (mk === '1. Penerimaan') {
          b.allInKg += berat;
          b.allInTx += 1;
          if (isHandheld) {
            b.hhInKg += berat;
            b.hhInTx += 1;
          }
        } else if (mk === '2. Pengeluaran') {
          b.allOutKg += berat;
          b.allOutTx += 1;
          if (isHandheld) {
            b.hhOutKg += berat;
            b.hhOutTx += 1;
          }
        }

        if (isHandheld && (mk === '1. Penerimaan' || mk === '2. Pengeluaran')) {
          const absB = Math.abs(berat);
          const jmLower = jm.toLowerCase();
          if (jmLower.includes('coil')) {
            b.coilKg += absB;
          } else if (jmLower.includes('strip')) {
            b.stripKg += absB;
          } else {
            b.pipaKg += absB;
          }
        }
      }

      if (hour !== null && isMvtValid && (mk === '1. Penerimaan' || mk === '2. Pengeluaran')) {
        const hKey = `${dMode}_${dStr}_${sh}_${hour}_${gd}`;
        if (!hourlyBuckets[hKey]) {
          hourlyBuckets[hKey] = {
            dateMode: dMode,
            tanggal: dStr,
            shift: sh,
            hour,
            gudang: gd,
            hhTx: 0,
            allTx: 0,
            hhKg: 0,
          };
        }
        const hb = hourlyBuckets[hKey];
        hb.allTx += 1;
        if (isHandheld) {
          hb.hhTx += 1;
          hb.hhKg += Math.abs(berat);
        }
      }
    }
  }

  const records: MB51BucketRecord[] = Object.values(buckets).map((b) => ({
    dateMode: b.dateMode,
    tanggal: b.tanggal,
    shift: b.shift,
    gudang: b.gudang,
    hhInKg: Math.round(b.hhInKg * 1000) / 1000,
    hhOutKg: Math.round(b.hhOutKg * 1000) / 1000,
    hhInTx: b.hhInTx,
    hhOutTx: b.hhOutTx,
    allInKg: Math.round(b.allInKg * 1000) / 1000,
    allOutKg: Math.round(b.allOutKg * 1000) / 1000,
    allInTx: b.allInTx,
    allOutTx: b.allOutTx,
    rawAbsKg: Math.round(b.rawAbsKg * 1000) / 1000,
    rawTx: b.rawTx,
    coilKg: Math.round(b.coilKg * 10) / 10,
    stripKg: Math.round(b.stripKg * 10) / 10,
    pipaKg: Math.round(b.pipaKg * 10) / 10,
  }));

  const hourlyRecords: MB51HourlyRecord[] = Object.values(hourlyBuckets).map((hb) => ({
    dateMode: hb.dateMode,
    tanggal: hb.tanggal,
    shift: hb.shift,
    hour: hb.hour,
    gudang: hb.gudang,
    hhTx: hb.hhTx,
    allTx: hb.allTx,
    hhKg: Math.round(hb.hhKg * 10) / 10,
  }));

  records.sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    if (a.shift !== b.shift) return a.shift.localeCompare(b.shift);
    return a.gudang.localeCompare(b.gudang);
  });

  hourlyRecords.sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    if (a.shift !== b.shift) return a.shift.localeCompare(b.shift);
    if (a.hour !== b.hour) return a.hour - b.hour;
    return a.gudang.localeCompare(b.gudang);
  });

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowFormatted = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} - ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;

  return {
    sourceFile: sourceFilename,
    lastUpdated: nowFormatted,
    totalRowsRead,
    postingDates: Array.from(datesPdSet).sort(),
    tanggalKerjaDates: Array.from(datesTkSet).sort(),
    records,
    hourlyRecords,
  };
}
