export type ShiftName = 'Shift 1' | 'Shift 2' | 'Shift 3';
export type DateMode = 'posting_date' | 'tanggal_kerja';
export type CalcMode = 'handheld_clean' | 'all_devices_clean' | 'raw_abs';

export interface MB51BucketRecord {
  dateMode: DateMode;
  tanggal: string; // 'YYYY-MM-DD'
  shift: ShiftName;
  gudang: string; // 'Gd.01', 'Gd.02', ...
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
}

export interface MB51HourlyRecord {
  dateMode: DateMode;
  tanggal: string;
  shift: ShiftName;
  hour: number;
  gudang: string;
  hhTx: number;
  allTx: number;
  hhKg: number;
}

export interface MB51Dataset {
  sourceFile: string;
  lastUpdated: string;
  totalRowsRead: number;
  postingDates: string[];
  tanggalKerjaDates: string[];
  records: MB51BucketRecord[];
  hourlyRecords: MB51HourlyRecord[];
}

export interface HeadcountOverride {
  tanggal: string;
  gudang: string;
  shift: ShiftName;
  man: number | null;
}

export interface HeadcountConfig {
  defaultManpower: Record<string, { 'Shift 1': number | null; 'Shift 2': number | null; 'Shift 3': number | null }>;
  dateOverrides: HeadcountOverride[];
  thresholds: {
    lowKgPerMan: number;
    idleTxPerMan: number;
    heavyKgPerTx: number;
  };
}
