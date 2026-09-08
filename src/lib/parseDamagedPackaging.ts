import * as XLSX from 'xlsx';
import { DamagedPackagingItem } from '../types/warehouse';

/**
 * Format Excel serial date number (e.g. 46270 -> "05/09/2026")
 */
export function formatExcelDate(val: any): string {
  if (!val && val !== 0) return '';
  const str = String(val).trim();
  if (str.match(/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/)) {
    return str.replace(/[\-.]/g, '/');
  }
  if (str.match(/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/)) {
    const parts = str.split(/[\/\-.]/);
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  const num = parseFloat(str);
  if (!isNaN(num) && num >= 20000 && num <= 70000) {
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
 * Format Excel serial time (e.g. 0.07596064814815 -> "01:49:23")
 */
export function formatExcelTime(val: any): string {
  if (!val && val !== 0) return '';
  const str = String(val).trim();
  if (str.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
    const parts = str.split(':');
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const s = (parts[2] || '00').padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  const num = parseFloat(str);
  if (!isNaN(num)) {
    // If it's a fractional number (0 <= x < 1) or full serial (e.g. 46270.798)
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

/**
 * Robust parser for RTP Damaged Packaging Excel exports.
 * Supports standard JSON objects, __EMPTY header offsets, and raw rows.
 */
export function parseDamagedPackagingFile(rawRows: any[]): DamagedPackagingItem[] {
  if (!rawRows || rawRows.length === 0) return [];

  let rows: Record<string, any>[] = [];

  // Check if rows have __EMPTY keys (header offset) or is an array of arrays
  const firstRow = rawRows[0];
  const is2DArray = Array.isArray(firstRow);
  const isObjectWithEmptyKeys =
    firstRow &&
    typeof firstRow === 'object' &&
    Object.keys(firstRow).some((k) => k.startsWith('__EMPTY'));

  if (is2DArray) {
    // Find header row index
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const rowArr = rawRows[i] as any[];
      const rowStr = rowArr.map((c) => String(c || '').toLowerCase()).join(' ');
      if (
        rowStr.includes('package') ||
        rowStr.includes('serial') ||
        rowStr.includes('customer') ||
        rowStr.includes('slot') ||
        rowStr.includes('dinding') ||
        rowStr.includes('kondisi')
      ) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx !== -1) {
      const headers = (rawRows[headerIdx] as any[]).map((h) => String(h || '').trim());
      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const rowArr = rawRows[i] as any[];
        if (!rowArr || rowArr.length === 0) continue;
        const obj: Record<string, any> = {};
        headers.forEach((h, hIdx) => {
          if (h) obj[h] = rowArr[hIdx];
        });
        rows.push(obj);
      }
    } else {
      // Fallback
      rows = rawRows as Record<string, any>[];
    }
  } else if (isObjectWithEmptyKeys) {
    // Header might be in one of the first rows
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const r = rawRows[i];
      const vals = Object.values(r).map((v) => String(v || '').toLowerCase()).join(' ');
      if (
        vals.includes('package') ||
        vals.includes('serial') ||
        vals.includes('customer') ||
        vals.includes('slot') ||
        vals.includes('dinding') ||
        vals.includes('kondisi')
      ) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx !== -1) {
      const headerObj = rawRows[headerRowIdx];
      const keyToHeaderMap: Record<string, string> = {};
      Object.entries(headerObj).forEach(([k, v]) => {
        keyToHeaderMap[k] = String(v || '').trim();
      });

      for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        const newObj: Record<string, any> = {};
        Object.entries(r).forEach(([k, v]) => {
          const colName = keyToHeaderMap[k] || k;
          newObj[colName] = v;
        });
        rows.push(newObj);
      }
    } else {
      rows = rawRows;
    }
  } else {
    rows = rawRows;
  }

  const cleanKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const items: DamagedPackagingItem[] = [];

  rows.forEach((r, index) => {
    // Normalisasi key column case-insensitive & trim
    const getVal = (possibleKeys: string[]): string => {
      const cleanedPossible = possibleKeys.map(cleanKey);
      for (const rowKey of Object.keys(r)) {
        const cRowKey = cleanKey(rowKey);
        if (cleanedPossible.includes(cRowKey)) {
          const v = r[rowKey];
          return v !== undefined && v !== null ? String(v).trim() : '';
        }
      }
      return '';
    };

    const packageNo = getVal(['Package No.', 'Package No', 'PackageNo', 'Packaging No', 'No Package', 'No. Package', 'Pkg No', 'Package']);
    const serialNo = getVal(['Serial No.', 'Serial No', 'SerialNo', 'No Serial', 'No. Serial', 'Serial']);
    const plant = getVal(['Plant', 'Plant No', 'Werks', 'Unit']) || '1105';
    const customer = getVal(['Customer', 'Nama Customer', 'Cust', 'Customer Name', 'Nama Pembeli', 'Sold to party', 'Sold-to party']);
    const userScan = getVal(['User Scan', 'UserScan', 'User', 'Scan By', 'Operator', 'Scan User']) || 'GUDANGRTP01';
    
    let tglScanIn = formatExcelDate(getVal(['Tgl Scan In', 'Tgl Scan', 'Tanggal Scan', 'Scan Date', 'Date', 'Tanggal', 'Tgl']));
    let jamScanIn = formatExcelTime(getVal(['Jam Scan In', 'Jam Scan', 'Time', 'Scan Time', 'Jam', 'Waktu']));
    const kondisi = getVal(['Kondisi', 'Status', 'Condition']) || 'NG';

    const slot = getVal(['Slot', 'Kerusakan Slot']);
    const kaki = getVal(['Kaki', 'Kaki Rusak']);
    const rangka = getVal(['Rangka', 'Rangka Rusak', 'Rangka Bengkok']);
    const pengait = getVal(['Pengait', 'Pengait Patah']);
    const dinding = getVal(['Dinding', 'Dinding Pecah', 'Dinding Retak']);
    const labelItem = getVal(['Label Item', 'Label', 'LabelItem', 'Label Rusak']);
    const limbah = getVal(['Limbah', 'Kotoran / Limbah', 'Kotoran']);
    const generalRemark = getVal(['Keterangan', 'Remark', 'Catatan', 'Defect', 'Jenis Kerusakan', 'Temuan']);

    // Check if the row has any meaningful content
    const hasData =
      Boolean(packageNo) ||
      Boolean(serialNo) ||
      Boolean(customer) ||
      Boolean(slot) ||
      Boolean(kaki) ||
      Boolean(rangka) ||
      Boolean(pengait) ||
      Boolean(dinding) ||
      Boolean(labelItem) ||
      Boolean(limbah) ||
      Boolean(generalRemark);

    if (!hasData) return;

    // Detect defect category
    let defectCategory = 'Lain-lain';
    if (slot && slot !== '-' && slot !== '0') defectCategory = 'Slot';
    else if (dinding && dinding !== '-' && dinding !== '0') defectCategory = 'Dinding';
    else if (rangka && rangka !== '-' && rangka !== '0') defectCategory = 'Rangka';
    else if (kaki && kaki !== '-' && kaki !== '0') defectCategory = 'Kaki';
    else if (pengait && pengait !== '-' && pengait !== '0') defectCategory = 'Pengait';
    else if (labelItem && labelItem !== '-' && labelItem !== '0') defectCategory = 'Label Item';
    else if (limbah && limbah !== '-' && limbah !== '0') defectCategory = 'Limbah';
    else if (generalRemark) {
      const gLower = generalRemark.toLowerCase();
      if (gLower.includes('dinding')) defectCategory = 'Dinding';
      else if (gLower.includes('slot')) defectCategory = 'Slot';
      else if (gLower.includes('rangka')) defectCategory = 'Rangka';
      else if (gLower.includes('kaki')) defectCategory = 'Kaki';
      else if (gLower.includes('pengait')) defectCategory = 'Pengait';
      else if (gLower.includes('label')) defectCategory = 'Label Item';
      else if (gLower.includes('limbah') || gLower.includes('kotor')) defectCategory = 'Limbah';
    }

    items.push({
      id: `PKG-${Date.now()}-${items.length + 1}`,
      no: items.length + 1,
      packageNo: packageNo || `PKG-${items.length + 1}`,
      serialNo: serialNo || String(items.length + 1),
      plant,
      customer: customer || 'UNKNOWN CUSTOMER',
      userScan,
      tglScanIn: tglScanIn || new Date().toLocaleDateString('id-ID'),
      jamScanIn: jamScanIn || '00:00:00',
      kondisi,
      slot,
      kaki,
      rangka,
      pengait,
      dinding: dinding || (defectCategory === 'Dinding' ? generalRemark : ''),
      labelItem,
      limbah,
      defectCategory
    });
  });

  return items;
}
