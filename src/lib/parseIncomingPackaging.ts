import { IncomingPackagingItem } from '../types/warehouse';
import { formatExcelDate } from './parseDamagedPackaging';

export function parseIncomingPackagingFile(rawRows: any[]): IncomingPackagingItem[] {
  if (!rawRows || rawRows.length === 0) return [];

  let rows: Record<string, any>[] = [];

  const firstRow = rawRows[0];
  const is2DArray = Array.isArray(firstRow);
  const isObjectWithEmptyKeys =
    firstRow &&
    typeof firstRow === 'object' &&
    Object.keys(firstRow).some((k) => k.startsWith('__EMPTY'));

  if (is2DArray) {
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const rowArr = rawRows[i] as any[];
      const rowStr = rowArr.map((c) => String(c || '').toLowerCase()).join(' ');
      if (
        rowStr.includes('customer') ||
        rowStr.includes('type') ||
        rowStr.includes('stock') ||
        rowStr.includes('incoming')
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
      rows = rawRows as Record<string, any>[];
    }
  } else if (isObjectWithEmptyKeys) {
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const r = rawRows[i];
      const vals = Object.values(r).map((v) => String(v || '').toLowerCase()).join(' ');
      if (
        vals.includes('customer') ||
        vals.includes('type') ||
        vals.includes('stock') ||
        vals.includes('incoming')
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

  const items: IncomingPackagingItem[] = [];

  rows.forEach((r, index) => {
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

    const getNum = (possibleKeys: string[]): number => {
      const v = getVal(possibleKeys);
      if (!v || v === '-') return 0;
      const parsed = parseFloat(v.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    const customer = getVal(['Customer', 'Nama Customer', 'Cust', 'Customer Name']);
    const type = getVal(['Type', 'Tipe', 'Packaging Type', 'Jenis', 'Tipe Packaging']);
    const tglIncoming = formatExcelDate(getVal(['Tgl Incoming', 'Tgl', 'Tanggal', 'Incoming Date', 'Date', 'Tanggal Incoming']));
    
    const stockAktualInternal = getNum(['Stock Aktual Internal', 'Stock Awal', 'Stock Internal', 'Aktual Internal', 'Stock Aktual']);
    const outQty = getNum(['OUT', 'Out', 'Keluar', 'Pengeluaran', 'Qty Out']);
    const inQty = getNum(['IN', 'In', 'Masuk', 'Penerimaan', 'Qty In']);

    let stockSaatIni = getNum(['Stock Saat ini', 'Stock Saat Ini', 'Stock Akhir', 'Current Stock', 'Stock Sisa']);
    if (stockSaatIni === 0 && (stockAktualInternal > 0 || outQty > 0 || inQty > 0)) {
      stockSaatIni = stockAktualInternal - outQty + inQty;
    }

    const slotVal = getVal(['Slot', 'NG Slot']);
    const kakiVal = getVal(['Kaki', 'NG Kaki']);
    const dindingVal = getVal(['Dinding', 'NG Dinding']);
    const rangkaVal = getVal(['Rangka', 'NG Rangka']);
    const keterangan = getVal(['Keterangan', 'Remark', 'Catatan', 'Notes']) || '-';

    if (!customer && !type && stockAktualInternal === 0) return;

    items.push({
      id: `INC-PKG-${Date.now()}-${items.length + 1}`,
      no: items.length + 1,
      tglIncoming: tglIncoming || '-',
      customer: customer || 'UNKNOWN CUSTOMER',
      type: type || 'STANDARD',
      stockAktualInternal,
      outQty,
      inQty,
      stockSaatIni,
      detailNG: {
        slot: slotVal && slotVal !== '0' ? slotVal : '-',
        kaki: kakiVal && kakiVal !== '0' ? kakiVal : '-',
        dinding: dindingVal && dindingVal !== '0' ? dindingVal : '-',
        rangka: rangkaVal && rangkaVal !== '0' ? rangkaVal : '-'
      },
      keterangan
    });
  });

  return items;
}
