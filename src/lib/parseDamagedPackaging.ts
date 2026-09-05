import * as XLSX from 'xlsx';
import { DamagedPackagingItem } from '../types/warehouse';

export function parseDamagedPackagingFile(rows: Record<string, any>[]): DamagedPackagingItem[] {
  if (!rows || rows.length === 0) return [];

  return rows.map((r, index) => {
    // Normalisasi key column case-insensitive & trim
    const getVal = (possibleKeys: string[]): string => {
      for (const k of possibleKeys) {
        for (const rowKey of Object.keys(r)) {
          if (rowKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
            const v = r[rowKey];
            return v !== undefined && v !== null ? String(v).trim() : '';
          }
        }
      }
      return '';
    };

    const packageNo = getVal(['Package No.', 'Package No', 'PackageNo', 'Packaging No']);
    const serialNo = getVal(['Serial No.', 'Serial No', 'SerialNo']);
    const plant = getVal(['Plant', 'Plant No', 'Werks']) || '1105';
    const customer = getVal(['Customer', 'Nama Customer', 'Cust', 'Customer Name']);
    const userScan = getVal(['User Scan', 'UserScan', 'User', 'Scan By']) || 'GUDANGRTP01';
    const tglScanIn = getVal(['Tgl Scan In', 'Tgl Scan', 'Tanggal Scan', 'Scan Date', 'Date']);
    const jamScanIn = getVal(['Jam Scan In', 'Jam Scan', 'Time', 'Scan Time']);
    const kondisi = getVal(['Kondisi', 'Status', 'Condition']) || 'NG';

    const slot = getVal(['Slot']);
    const kaki = getVal(['Kaki']);
    const rangka = getVal(['Rangka']);
    const pengait = getVal(['Pengait']);
    const dinding = getVal(['Dinding']);
    const labelItem = getVal(['Label Item', 'Label', 'LabelItem']);
    const limbah = getVal(['Limbah']);

    // Detect defect category
    let defectCategory = 'Lain-lain';
    if (slot) defectCategory = 'Slot';
    else if (dinding) defectCategory = 'Dinding';
    else if (rangka) defectCategory = 'Rangka';
    else if (kaki) defectCategory = 'Kaki';
    else if (pengait) defectCategory = 'Pengait';
    else if (labelItem) defectCategory = 'Label Item';
    else if (limbah) defectCategory = 'Limbah';

    return {
      id: `PKG-${Date.now()}-${index + 1}`,
      no: index + 1,
      packageNo: packageNo || `PKG-${index + 1}`,
      serialNo: serialNo || String(index + 1),
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
      dinding,
      labelItem,
      limbah,
      defectCategory
    };
  });
}
