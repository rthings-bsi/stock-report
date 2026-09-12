import {
  NCProgressTransaction,
  NCProgressPipelineItem,
  NCProgressSummary,
  NCProgressTransactionType
} from '../types/warehouse';

/**
 * Format Excel serial date number (e.g. 46276 -> "10/09/2026")
 */
export function formatExcelDate(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }

  let str = String(val).trim();
  if (!str) return '';

  // Standard DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  if (str.match(/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/)) {
    const parts = str.split(/[\/\-.]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${day}/${month}/${year}`;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  if (str.match(/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/)) {
    const parts = str.split(/[\/\-.]/);
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }

  // Excel serial number (e.g. 46276 or "46276")
  const num = parseFloat(str);
  if (!isNaN(num) && num >= 20000 && num <= 80000) {
    const intPart = Math.floor(num);
    const date = new Date(Math.round((intPart - 25569) * 86400 * 1000));
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

/**
 * Format Excel serial time (e.g. 0.28306712962963 -> "06:47:37")
 */
export function formatExcelTime(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    const s = String(val.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  let str = String(val).trim();
  if (!str || str === '0' || str === '-') return '-';

  // Already standard HH:mm or HH:mm:ss
  if (str.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
    const parts = str.split(':');
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const s = (parts[2] || '00').padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Excel serial time fraction (e.g. 0.28306712962963)
  const num = parseFloat(str.replace(',', '.'));
  if (!isNaN(num)) {
    // If it's full serial like 46276.283067, take fractional part
    const frac = num >= 1 ? num - Math.floor(num) : num;
    if (frac > 0 && frac < 1) {
      const totalSeconds = Math.round(frac * 86400);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
  }

  return str;
}

export const DIAMETER_MAP: Record<string, string> = {
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

/**
 * Normalisasi SLoc ke Format Standar Gudang Spindo (5A* = Gd.01 s/d 5N* = Gd.14)
 */
export function normalizeGudang(sloc?: string): string {
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

  const matchGd = s.match(/GD\.?(\d{1,2})/i);
  if (matchGd) {
    const num = parseInt(matchGd[1], 10);
    const padNum = num < 10 ? `0${num}` : `${num}`;
    return `Gd.${padNum}`;
  }

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

/**
 * Parsing ukuran pipa standar (contoh: "34.0 x 2.5 x 179.6") dari kode material dan deskripsi SAP
 */
export function parseMaterialUkuran(matNum?: string, desc?: string): string {
  const matClean = cleanStr(matNum);
  const descClean = cleanStr(desc);

  if (!matClean && !descClean) return '-';

  let dDecoded: string | null = null;
  let tDecoded: string | null = null;
  let pDecoded: string | null = null;

  // 1. Coba decode dari kode material SAP Spindo
  // Pola: [Prefix]+[4 digit tebal: 0250=2.5][-+][5 digit panjang: 01796=179.6 atau 06000=6000]
  const matchMat = matClean.match(/([A-Z0-9]+?)(\d{4})([-+])([A-Z0-9]{5})/);
  if (matchMat) {
    const prefix = matchMat[1];
    const tNum = parseInt(matchMat[2], 10) / 100;
    tDecoded = tNum % 1 === 0 ? String(tNum) : (tNum * 10) % 1 === 0 ? tNum.toFixed(1) : tNum.toFixed(2);

    for (const [k, dVal] of Object.entries(DIAMETER_MAP)) {
      if (prefix.endsWith(k)) {
        dDecoded = dVal;
        break;
      }
    }

    const sign = matchMat[3];
    const pRaw = matchMat[4];
    if (/^\d+$/.test(pRaw)) {
      const pNum = parseInt(pRaw, 10);
      if (sign === '-') {
        pDecoded = String(pNum);
      } else {
        // Tipe + (panjang potong presisi / automotive dalam satuan 0.1 mm)
        const pMm = pNum / 10;
        pDecoded = pMm % 1 === 0 ? String(pMm) : String(pMm);
      }
    }
  }

  // 2. Jika diameter belum dapat, cari di deskripsi teks (contoh "34,0x" atau "34.0x")
  if (!dDecoded && descClean) {
    const matchDDesc = descClean.match(/(\d+[\.,]\d+|\d+)\s*[xX]/);
    if (matchDDesc) {
      dDecoded = matchDDesc[1].replace(',', '.');
    }
  }

  // 3. Cek pola kotak 4 angka di deskripsi: 50x100x1,70x6000
  const matchKotak = descClean.match(/(\d+[\.,]?\d*)\s*[xX]\s*(\d+[\.,]?\d*)\s*[xX]\s*(\d+[\.,]?\d*)\s*[xX]\s*(\d+[\.,]?\d*)/);
  if (matchKotak) {
    const d1 = matchKotak[1].replace(',', '.');
    const d2 = matchKotak[2].replace(',', '.');
    const t = tDecoded || matchKotak[3].replace(',', '.');
    const p = pDecoded || matchKotak[4].replace(',', '.');
    return `${d1}x${d2} x ${t} x ${p}`;
  }

  // 4. Cek pola 3 angka di deskripsi: 34,0x2,5x179,6
  const matchBulat3 = descClean.match(/(\d+[\.,]?\d*)\s*[xX]\s*(\d+[\.,]?\d*)\s*[xX]\s*(\d+[\.,]?\d*)/);
  if (matchBulat3 && matchBulat3[3].length >= 3) {
    const d = dDecoded || matchBulat3[1].replace(',', '.');
    const t = tDecoded || matchBulat3[2].replace(',', '.');
    const p = pDecoded || matchBulat3[3].replace(',', '.');
    return `${d} x ${t} x ${p}`;
  }

  if (dDecoded && tDecoded && pDecoded) {
    return `${dDecoded} x ${tDecoded} x ${pDecoded}`;
  }

  if (dDecoded && tDecoded) {
    return `${dDecoded} x ${tDecoded}`;
  }

  return matClean || descClean || '-';
}

/**
 * Pembersih string dari data SAP
 */
export function cleanStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Parsing angka format SAP Indonesia / Jerman (titik ribuan, koma desimal atau sebaliknya)
 */
export function parseSapNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let s = String(val).trim();
  if (!s || s === '-' || s === '0,00' || s === '0.00') return 0;

  // Hapus spasi dan tanda kutip
  s = s.replace(/["'\s]/g, '');

  // Handle format negatif "-2599" atau "2599-"
  let isNegative = false;
  if (s.startsWith('-')) {
    isNegative = true;
    s = s.slice(1);
  } else if (s.endsWith('-')) {
    isNegative = true;
    s = s.slice(0, -1);
  }

  // Cek apakah ada koma desimal khas SAP Indonesia (contoh: "119,358" atau "-907,051" atau "1.234,56")
  if (s.includes(',') && s.includes('.')) {
    // 1.234,56 -> hapus titik, ubah koma jadi titik
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    // Hanya ada koma: "119,358" -> "119.358"
    s = s.replace(',', '.');
  }

  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

/**
 * Normalisasi format nomor NCR ke standar SPK/SAP: <NOMOR>/NCR-SKF/<BULAN_ROMAWI>/<TAHUN>
 * Contoh standar: "21/NCR-SKF/IX/2026"
 * Mengubah anomali seperti "18/NCR-AOP/IX/2026", "25/NCR-TOY/IX/2026", "29/NCR-DEN/IX/2026", "21/NCR/IX/2026", dll.
 * Yang membedakan hanya nomor urut di awal sebelum /NCR.
 */
export function normalizeNCRNumber(rawNcr: string, fallbackMonth = 'IX', fallbackYear = '2026'): string {
  if (!rawNcr || !rawNcr.trim()) return '';

  const clean = rawNcr.trim();

  // Helper konversi angka bulan (1-12 atau 01-12) ke Romawi
  const monthMap: Record<string, string> = {
    '1': 'I', '01': 'I', 'I': 'I',
    '2': 'II', '02': 'II', 'II': 'II',
    '3': 'III', '03': 'III', 'III': 'III',
    '4': 'IV', '04': 'IV', 'IV': 'IV',
    '5': 'V', '05': 'V', 'V': 'V',
    '6': 'VI', '06': 'VI', 'VI': 'VI',
    '7': 'VII', '07': 'VII', 'VII': 'VII',
    '8': 'VIII', '08': 'VIII', 'VIII': 'VIII',
    '9': 'IX', '09': 'IX', 'IX': 'IX',
    '10': 'X', 'X': 'X',
    '11': 'XI', 'XI': 'XI',
    '12': 'XII', 'XII': 'XII'
  };

  // 1. Pola standar / variasi: <NOMOR>/NCR.../<BULAN>/<TAHUN>
  // Contoh: "21/NCR-SKF/IX/2026", "18/NCR-AOP/IX/2026", "25/NCR-TOY/09/2026", "29/NCR-DEN/IX/2026", "12/NCR/IX/2026"
  const standardPattern = /^(\d+)[\/\-_\s]*NCR(?:-[A-Za-z0-9]+)?(?:[\/\-_\s]+([A-Za-z0-9]+))?(?:[\/\-_\s]+(\d{4}))?/i;
  const match = clean.match(standardPattern);

  if (match) {
    const num = match[1];
    let month = match[2] ? match[2].toUpperCase() : fallbackMonth;
    if (monthMap[month]) {
      month = monthMap[month];
    } else if (!/^[IVXLCDM]+$/i.test(month)) {
      month = fallbackMonth;
    }
    const year = match[3] || fallbackYear;
    return `${num}/NCR-SKF/${month}/${year}`;
  }

  // 2. Pola prefix NCR: "NCR/21/IX/2026" atau "NCR-21" atau "NCR 21"
  const prefixPattern = /^NCR[\/\-_\s]+(\d+)(?:[\/\-_\s]+([A-Za-z0-9]+))?(?:[\/\-_\s]+(\d{4}))?/i;
  const prefixMatch = clean.match(prefixPattern);
  if (prefixMatch) {
    const num = prefixMatch[1];
    let month = prefixMatch[2] ? prefixMatch[2].toUpperCase() : fallbackMonth;
    if (monthMap[month]) {
      month = monthMap[month];
    } else if (!/^[IVXLCDM]+$/i.test(month)) {
      month = fallbackMonth;
    }
    const year = prefixMatch[3] || fallbackYear;
    return `${num}/NCR-SKF/${month}/${year}`;
  }

  // 3. Pola digit yang diikuti NCR di mana saja: "21/NCR"
  const digitNcr = clean.match(/(\d+)[\/\s\-]*NCR/i);
  if (digitNcr) {
    const num = digitNcr[1];
    const yearMatch = clean.match(/\b(20\d{2})\b/);
    const year = yearMatch ? yearMatch[1] : fallbackYear;
    const romMatch = clean.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\b/i);
    const month = romMatch ? romMatch[1].toUpperCase() : fallbackMonth;
    return `${num}/NCR-SKF/${month}/${year}`;
  }

  return clean;
}

/**
 * Ekstraksi Nomor NCR dan Keterangan Masalah dari kolom Text / Keterangan SAP
 * Contoh: "21/NCR-SKF/IX/2026 KARAT LUAR DALAM SEBAGIAN"
 * -> ncrNumber: "21/NCR-SKF/IX/2026", problemRemark: "KARAT LUAR DALAM SEBAGIAN"
 */
export function extractNCRAndRemark(text?: string): { ncrNumber?: string; problemRemark?: string } {
  if (!text) return {};
  const cleaned = cleanStr(text);
  if (!cleaned) return {};

  // Regex mencari pattern NCR (misal: 21/NCR-SKF/IX/2026 atau 18/NCR-AOP/IX/2026 atau NCR/2026/001 atau 123/NCR/...)
  const ncrMatch = cleaned.match(/(\d+[\/\-_\s]*NCR[\/A-Za-z0-9_\-]+|\bNCR[\/\-_\s]*[\/A-Za-z0-9_\-]+)/i);
  if (ncrMatch) {
    const rawNcr = ncrMatch[0].trim();
    const ncrNumber = normalizeNCRNumber(rawNcr);
    const problemRemark = cleaned.replace(ncrMatch[0], '').replace(/^[\s\-–:/]+|[\s\-–:/]+$/g, '').trim();
    return {
      ncrNumber,
      problemRemark: problemRemark || cleaned
    };
  }

  return {
    problemRemark: cleaned
  };
}

/**
 * Klasifikasi tipe transaksi Progres NC:
 * 1. IN_NC: Movement Type = 309
 * 2. OUT_REPAIR: Movement Type = 261 AND Work Center mengandung REP (REP-501 dsb)
 * 3. IN_OK_PRIME: Movement Type = 101 AND Work Center mengandung REP
 */
export function classifyTransaction(
  mvt: string,
  workCenter?: string,
  order?: string
): NCProgressTransactionType {
  const m = cleanStr(mvt);
  const wc = cleanStr(workCenter).toUpperCase();
  const ord = cleanStr(order);

  const isRepWorkcenter = wc.includes('REP') || wc.startsWith('REP-');

  if (m === '309' || m.startsWith('309')) {
    return 'IN_NC';
  }

  if (m === '261' || m.startsWith('261')) {
    if (isRepWorkcenter || (ord && ord.length > 5 && isRepWorkcenter)) {
      return 'OUT_REPAIR';
    }
    // Fallback jika ada work center REP di field lain
    if (isRepWorkcenter) return 'OUT_REPAIR';
  }

  if (m === '101' || m.startsWith('101')) {
    if (isRepWorkcenter) {
      return 'IN_OK_PRIME';
    }
  }

  // Jika mvt 261 tapi workcenter kosong namun ada order repair khusus
  if (m === '261' && isRepWorkcenter) return 'OUT_REPAIR';
  if (m === '101' && isRepWorkcenter) return 'IN_OK_PRIME';

  return 'OTHER';
}

/**
 * Parse baris Excel / Objek JSON hasil import SAP MB51 / ZMM
 */
export function parseNCProgressRows(rows: Record<string, unknown>[]): NCProgressTransaction[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const results: NCProgressTransaction[] = [];

  rows.forEach((row, idx) => {
    // Helper fleksibel untuk mencari key terlepas dari casing / variasi nama kolom
    const getVal = (candidates: string[]): string => {
      for (const key of Object.keys(row)) {
        const normKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const cand of candidates) {
          const normCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normKey === normCand || normKey.includes(normCand)) {
            const val = row[key];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return String(val).trim();
            }
          }
        }
      }
      return '';
    };

    const rawEntryDate = getVal(['Entry Date', 'Tgl Entry', 'EntryDate', 'Posting Date', 'Tgl Posting']);
    const rawTime = getVal(['Time of Entry', 'Jam Entry', 'Time', 'TimeOfEntry', 'Entry Time', 'Time of day']);
    const rawPostingDate = getVal(['Posting Date', 'PostingDate', 'Tgl Posting', 'Entry Date']);

    const entryDate = formatExcelDate(rawEntryDate) || new Date().toLocaleDateString('id-ID');
    const timeOfEntry = formatExcelTime(rawTime) || '00:00:00';
    const postingDate = formatExcelDate(rawPostingDate) || entryDate;
    const plant = getVal(['Plant', 'PrcPlant', 'Plnt']) || '1105';
    const storageLocation = getVal(['Storage Location', 'StorageLocation', 'SLoc', 'S.Loc', 'Gudang', 'Lokasi Simpan']) || '5M08';
    const movementType = getVal(['Movement Type', 'MovementType', 'Mvt', 'BwA', 'Tipe Mutasi']) || '309';
    const customer = getVal(['Name 2', 'Customer', 'Cust', 'Customer Name', 'Nama Pelanggan', 'Nama 2', 'Nama Customer']) || '';
    const purchaseOrder = getVal(['Purchase Order', 'PO', 'No PO']) || '';
    const order = getVal(['Order', 'No Order', 'Order No', 'Work Order', 'SPK']) || '';
    const workCenter = getVal(['Work center', 'WorkCenter', 'Work Center', 'W.Ctr', 'Stasiun']) || '';
    const material = getVal(['Material', 'Kode Material', 'Item Code', 'Material Number']) || '';
    const materialDescription = getVal(['Material Description', 'Description', 'Desc', 'Nama Barang', 'Deskripsi Material']) || '';
    const batch = getVal(['Batch', 'No Batch', 'Lot']) || '';

    // Quantity / KG
    const rawQtyEntry = getVal(['Qty in Un. of Entry', 'Qty in Un of Entry', 'Qty Entry', 'Qty Pcs', 'Qty Btg', 'Qty']);
    const rawQuantity = getVal(['Quantity', 'Kuantitas', 'KG', 'Tonase', 'Berat']);
    const rawAmount = getVal(['Amount in LC', 'Amount', 'Nilai']);
    const docHeaderText = getVal(['Document Header Text', 'Header Text']);
    const materialDocument = getVal(['Material Document', 'Mat. Doc.', 'MaterialDoc', 'No Dokumen']) || `DOC-${Date.now()}-${idx}`;
    const materialDocItem = getVal(['Material Doc.Item', 'Material Doc Item', 'Item', 'Doc Item']) || '1';
    const reference = getVal(['Reference', 'No Referensi', 'Ref']) || '';
    const grGiSlip = getVal(['Goods Receipt/Issue Slip', 'GR/GI Slip', 'Slip']) || '';
    const userName = getVal(['User name', 'UserName', 'User', 'Operator', 'Petugas']) || 'SYSTEM';
    const text = getVal(['Text', 'Keterangan', 'Remark', 'Catatan', 'Problem', 'Alasan NC']) || '';
    const unloadingPoint = getVal(['Unloading Point', 'UnloadingPoint', 'Titik Bongkar', 'UP']) || '';
    const salesOrder = getVal(['Sales Order', 'SalesOrder', 'SO', 'No SO']) || '';
    const salesOrderItem = getVal(['Sales order item', 'Sales Order Item', 'SO Item', 'Item SO']) || '10';
    const rawKgGI = getVal(['KG GI', 'KG_GI', 'GI KG', 'Pengeluaran KG']);
    const rawKgGR = getVal(['KG GR', 'KG_GR', 'GR KG', 'Pemasukan KG']);

    if (!material && !batch && !materialDocument) {
      return; // Baris kosong / footer
    }

    const qtyInUnOfEntry = Math.abs(parseSapNumber(rawQtyEntry));
    let quantityKg = Math.abs(parseSapNumber(rawQuantity));
    const kgGI = Math.abs(parseSapNumber(rawKgGI));
    const kgGR = Math.abs(parseSapNumber(rawKgGR));

    if (quantityKg === 0) {
      if (kgGI > 0) quantityKg = kgGI;
      else if (kgGR > 0) quantityKg = kgGR;
    }

    const transactionType = classifyTransaction(movementType, workCenter, order);

    // Filter khusus IN NC (MVT 309): Hanya ambil data batch NC yang berakhiran 'C' atau 'E'
    // (Abaikan baris pasangan asal 'A'/Prime yang ter-ekspor ganda dari transaksi SAP 309)
    if (transactionType === 'IN_NC' || movementType === '309' || movementType.startsWith('309')) {
      const batchUpper = batch.trim().toUpperCase();
      const isNCBatch = batchUpper.endsWith('C') || batchUpper.endsWith('E');
      if (!isNCBatch) {
        return;
      }
    }

    const { ncrNumber, problemRemark } = extractNCRAndRemark(text);

    results.push({
      id: `${materialDocument}_${materialDocItem}_${idx}`,
      entryDate,
      timeOfEntry,
      plant,
      storageLocation,
      postingDate,
      movementType,
      customer,
      purchaseOrder,
      order,
      workCenter,
      material,
      materialDescription,
      batch,
      qtyInUnOfEntry,
      quantity: quantityKg,
      amountInLC: parseSapNumber(rawAmount),
      documentHeaderText: docHeaderText,
      materialDocument,
      materialDocItem,
      reference,
      grGiSlip,
      userName,
      text,
      unloadingPoint,
      salesOrder,
      salesOrderItem,
      kgGI,
      kgGR,
      transactionType,
      ncrNumber,
      problemRemark
    });
  });

  return results;
}

/**
 * Parse teks Tab-Separated Values (TSV / Copy-Paste dari SAP GUI / Excel)
 */
export function parseNCProgressTsv(tsvText: string): NCProgressTransaction[] {
  if (!tsvText || !tsvText.trim()) return [];

  const lines = tsvText.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const isHeader =
    firstLine.toLowerCase().includes('entry date') ||
    firstLine.toLowerCase().includes('movement type') ||
    firstLine.toLowerCase().includes('material') ||
    firstLine.toLowerCase().includes('mvt') ||
    firstLine.toLowerCase().includes('batch');

  let headers: string[] = [];
  let dataLines: string[] = [];

  if (isHeader) {
    headers = firstLine.split('\t').map((h) => h.trim());
    dataLines = lines.slice(1);
  } else {
    // Default standard columns jika user mem-paste data mentah tanpa header
    headers = [
      'Entry Date', 'Time of Entry', 'Plant', 'Storage Location', 'Posting Date',
      'Movement Type', 'Name 2', 'Purchase Order', 'Order', 'Work center',
      'Material', 'Material Description', 'Batch', 'Qty in Un. of Entry', 'Quantity',
      'Amount in LC', 'Document Header Text', 'Material Document', 'Material Doc.Item',
      'Reference', 'Goods Receipt/Issue Slip', 'User name', 'Text', 'Unloading Point',
      'Sales Order', 'Sales order item', 'KG GI', 'KG GR'
    ];
    dataLines = lines;
  }

  const rows: Record<string, unknown>[] = [];

  dataLines.forEach((line) => {
    if (!line.trim()) return;
    const cols = line.split('\t');
    const rowObj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      rowObj[h] = cols[i] !== undefined ? cols[i].trim() : '';
    });
    rows.push(rowObj);
  });

  return parseNCProgressRows(rows);
}

/**
 * Mengelompokkan transaksi SAP menjadi Alur Pelacakan (Pipeline Progress)
 * Alur: IN NC (309) -> OUT REPAIR (261 REP) -> IN OK / PRIME (101 REP)
 */
export function buildNCProgressPipeline(transactions: NCProgressTransaction[]): NCProgressPipelineItem[] {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  const groups: Record<string, NCProgressTransaction[]> = {};

  transactions.forEach((tx) => {
    // Tentukan group key yang paling akurat
    // 1. Jika ada Order nomor repair (e.g. 500000408790), pakai Order
    // 2. Jika ada Unloading Point (e.g. 4002161591), gabungkan dengan Material
    // 3. Jika ada No NCR, pakai No NCR + Material
    // 4. Fallback ke Material + Customer / Base Batch
    let groupKey = '';
    if (tx.order && tx.order.trim() !== '') {
      groupKey = `ORD_${tx.order.trim()}`;
    } else if (tx.unloadingPoint && tx.unloadingPoint.trim() !== '') {
      groupKey = `UP_${tx.unloadingPoint.trim()}_${tx.material.trim()}`;
    } else if (tx.ncrNumber && tx.ncrNumber.trim() !== '') {
      groupKey = `NCR_${tx.ncrNumber.trim()}_${tx.material.trim()}`;
    } else if (tx.customer && tx.customer.trim() !== '') {
      groupKey = `CUST_${tx.customer.trim()}_${tx.material.trim()}`;
    } else {
      groupKey = `MAT_${tx.material.trim()}_${tx.batch.slice(0, 7)}`;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(tx);
  });

  const pipelineItems: NCProgressPipelineItem[] = Object.entries(groups).map(([key, txList]) => {
    // Sort transactions by date & time ascending
    txList.sort((a, b) => {
      const dateA = a.postingDate || a.entryDate || '';
      const dateB = b.postingDate || b.entryDate || '';
      return dateA.localeCompare(dateB);
    });

    let customer = '';
    let material = '';
    let materialDescription = '';
    let order = '';
    let workCenter = '';
    let unloadingPoint = '';
    let salesOrder = '';
    let ncrNumber = '';
    let problemRemark = '';
    let batchNC = '';
    let batchPrime = '';
    let slocNC = '';
    let slocPrime = '';

    let qtyNCIn = 0;
    let kgNCIn = 0;
    let qtyOutRepair = 0;
    let kgOutRepair = 0;
    let qtyInPrime = 0;
    let kgInPrime = 0;
    let lastDate = '';

    txList.forEach((tx) => {
      if (!material && tx.material) material = tx.material;
      if (!materialDescription && tx.materialDescription) materialDescription = tx.materialDescription;
      if (!customer && tx.customer) customer = tx.customer;
      if (!order && tx.order) order = tx.order;
      if (!workCenter && tx.workCenter) workCenter = tx.workCenter;
      if (!unloadingPoint && tx.unloadingPoint) unloadingPoint = tx.unloadingPoint;
      if (!salesOrder && tx.salesOrder) salesOrder = tx.salesOrder;
      if (!ncrNumber && tx.ncrNumber) ncrNumber = tx.ncrNumber;
      if (!problemRemark && tx.problemRemark) problemRemark = tx.problemRemark;

      lastDate = formatExcelDate(tx.postingDate || tx.entryDate) || lastDate;

      if (tx.transactionType === 'IN_NC') {
        qtyNCIn += tx.qtyInUnOfEntry;
        kgNCIn += tx.quantity || tx.kgGI || tx.kgGR || 0;
        if (!batchNC && tx.batch) batchNC = tx.batch;
        if (!slocNC && tx.storageLocation) slocNC = tx.storageLocation;
      } else if (tx.transactionType === 'OUT_REPAIR') {
        qtyOutRepair += tx.qtyInUnOfEntry;
        kgOutRepair += tx.kgGI || tx.quantity || 0;
        if (!batchNC && tx.batch) batchNC = tx.batch;
        if (!order && tx.order) order = tx.order;
        if (!workCenter && tx.workCenter) workCenter = tx.workCenter;
      } else if (tx.transactionType === 'IN_OK_PRIME') {
        qtyInPrime += tx.qtyInUnOfEntry;
        kgInPrime += tx.kgGR || tx.quantity || 0;
        if (!batchPrime && tx.batch) batchPrime = tx.batch;
        if (!slocPrime && tx.storageLocation) slocPrime = tx.storageLocation;
        if (!order && tx.order) order = tx.order;
        if (!workCenter && tx.workCenter) workCenter = tx.workCenter;
      }
    });

    // Tentukan Status Progress
    let status: NCProgressPipelineItem['status'] = 'TERDAFTAR NC';
    if (qtyInPrime >= (qtyOutRepair || qtyNCIn) && (qtyOutRepair > 0 || qtyInPrime > 0)) {
      status = 'SELESAI OK';
    } else if (qtyInPrime > 0 && qtyInPrime < (qtyOutRepair || qtyNCIn)) {
      status = 'PARTIAL REPAIR';
    } else if (qtyOutRepair > 0) {
      status = 'DALAM REPAIR';
    } else if (qtyNCIn > 0) {
      status = 'TERDAFTAR NC';
    }

    // Hitung Recovery Rate %
    const baseTargetQty = qtyOutRepair > 0 ? qtyOutRepair : qtyNCIn;
    const recoveryRate = baseTargetQty > 0 ? Math.min(100, (qtyInPrime / baseTargetQty) * 100) : 0;

    return {
      key,
      material: material || 'MATERIAL-NC',
      materialDescription: materialDescription || 'Item Pipa Spindo',
      customer: customer || 'PT. SETIA GUNA SEJATI',
      order,
      workCenter: workCenter || 'REP-501',
      unloadingPoint,
      salesOrder,
      ncrNumber,
      problemRemark: problemRemark || 'Karat / Cacat Permukaan',
      batchNC: batchNC || (txList[0]?.batch ?? '-'),
      batchPrime: batchPrime || (txList.find((t) => t.transactionType === 'IN_OK_PRIME')?.batch || '-'),
      slocNC: slocNC || '5M13',
      slocPrime: slocPrime || '5M08',
      qtyNCIn,
      kgNCIn,
      qtyOutRepair,
      kgOutRepair,
      qtyInPrime,
      kgInPrime,
      status,
      recoveryRate,
      transactions: txList,
      lastDate
    };
  });

  return pipelineItems;
}

/**
 * Hitung Ringkasan KPI Global Progres NC
 */
export function computeNCProgressSummary(
  transactions: NCProgressTransaction[],
  pipeline: NCProgressPipelineItem[]
): NCProgressSummary {
  let totalNCInQty = 0;
  let totalNCInKg = 0;
  let totalOutRepairQty = 0;
  let totalOutRepairKg = 0;
  let totalInPrimeQty = 0;
  let totalInPrimeKg = 0;

  transactions.forEach((tx) => {
    if (tx.transactionType === 'IN_NC') {
      totalNCInQty += tx.qtyInUnOfEntry;
      totalNCInKg += tx.quantity || tx.kgGI || tx.kgGR || 0;
    } else if (tx.transactionType === 'OUT_REPAIR') {
      totalOutRepairQty += tx.qtyInUnOfEntry;
      totalOutRepairKg += tx.kgGI || tx.quantity || 0;
    } else if (tx.transactionType === 'IN_OK_PRIME') {
      totalInPrimeQty += tx.qtyInUnOfEntry;
      totalInPrimeKg += tx.kgGR || tx.quantity || 0;
    }
  });

  // Outstanding NC yang belum di-issue ke order repair
  const outstandingRepairQty = Math.max(0, totalNCInQty - totalOutRepairQty);
  const outstandingRepairKg = Math.max(0, totalNCInKg - totalOutRepairKg);

  // WIP dalam pengerjaan repair yang belum GR 101 selesai
  const wipRepairQty = Math.max(0, totalOutRepairQty - totalInPrimeQty);
  const wipRepairKg = Math.max(0, totalOutRepairKg - totalInPrimeKg);

  const baseForRecovery = totalOutRepairQty > 0 ? totalOutRepairQty : totalNCInQty;
  const overallRecoveryRate = baseForRecovery > 0 ? (totalInPrimeQty / baseForRecovery) * 100 : 0;

  const ncrSet = new Set(
    transactions
      .map((t) => t.ncrNumber)
      .filter((n): n is string => Boolean(n && n.trim()))
  );

  return {
    totalNCInQty,
    totalNCInKg,
    totalOutRepairQty,
    totalOutRepairKg,
    totalInPrimeQty,
    totalInPrimeKg,
    outstandingRepairQty,
    outstandingRepairKg,
    wipRepairQty,
    wipRepairKg,
    overallRecoveryRate,
    totalTransactions: transactions.length,
    totalNCRCount: ncrSet.size || pipeline.length
  };
}
