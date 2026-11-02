/**
 * Utility & Aggregation Engine for Weekly Warehouse Analytics
 * Mengagregasi data lintas modul: Progres NC, Produktivitas MB51, & Kapasitas Stok
 */

import { NCProgressTransaction } from '@/types/warehouse';
import { MB51Dataset, MB51BucketRecord } from '@/types/productivity';
import { normalizeGudang, parseMaterialUkuran, classifyTransaction } from '@/lib/parseNCProgress';

export interface WeeklyPeriod {
  id: string; // e.g. "2026-W44"
  label: string; // e.g. "Minggu 44 (26 Okt - 01 Nov 2026)"
  year: number;
  weekNumber: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  snapshotKeys: string[];
  dates: string[];
}

export interface WeeklyNCSummary {
  total309Qty: number;
  total309Kg: number;
  total261Qty: number;
  total261Kg: number;
  total262Qty: number;
  total262Kg: number;
  netRepairIssuedQty: number;
  netRepairIssuedKg: number;
  total101Qty: number;
  total101Kg: number;
  netOutstandingQty: number;
  netOutstandingKg: number;
  recoveryRate: number; // %
  dailyBreakdown: Array<{
    date: string;
    dayName: string;
    inNcKg: number;
    inNcQty: number;
    issuedRepairKg: number;
    issuedRepairQty: number;
    completedPrimeKg: number;
    completedPrimeQty: number;
  }>;
  workCenterBreakdown: Array<{
    workCenter: string;
    issuedKg: number;
    issuedQty: number;
    completedKg: number;
    completedQty: number;
    recoveryRate: number;
  }>;
  storageLocationBreakdown: Array<{
    gudang: string;
    inNcKg: number;
    inNcQty: number;
    issuedKg: number;
    completedKg: number;
  }>;
  topMaterials: Array<{
    material: string;
    description: string;
    ukuran: string;
    inNcKg: number;
    inNcQty: number;
    completedKg: number;
    completedQty: number;
  }>;
}

export interface WeeklyProductivitySummary {
  totalTonase: number; // in Kg
  totalTransaksi: number;
  avgKgPerMan: number;
  avgTxPerMan: number;
  totalHeadcountDays: number;
  shiftBreakdown: {
    'Shift 1': { tonase: number; transaksi: number; avgKgPerMan: number };
    'Shift 2': { tonase: number; transaksi: number; avgKgPerMan: number };
    'Shift 3': { tonase: number; transaksi: number; avgKgPerMan: number };
  };
  warehouseBreakdown: Array<{
    warehouse: string;
    tonase: number;
    transaksi: number;
    avgKgPerMan: number;
    sharePercent: number;
  }>;
  dailyTrend: Array<{
    date: string;
    dayName: string;
    tonase: number;
    transaksi: number;
  }>;
}

export interface WeeklyCapacitySummary {
  startSnapshotKey: string;
  endSnapshotKey: string;
  startPipeStock: number;
  endPipeStock: number;
  deltaPipeStock: number;
  avgPipeOccupancy: number;
  startCoilStock: number;
  endCoilStock: number;
  deltaCoilStock: number;
  warehouseMovement: Array<{
    gudang: string;
    kapasitas: number;
    stockStart: number;
    stockEnd: number;
    deltaStock: number;
    occupancyEnd: number;
  }>;
}

export interface WeeklyAnalyticsReport {
  period: WeeklyPeriod;
  ncSummary: WeeklyNCSummary;
  productivitySummary: WeeklyProductivitySummary;
  capacitySummary: WeeklyCapacitySummary;
  keyInsights: string[];
}

export type WeeklyReportData = WeeklyAnalyticsReport;

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Normalisasi format tanggal apapun (DD/MM/YYYY atau YYYY-MM-DD) ke Date objek
 */
export function parseDateSafe(val: string): Date | null {
  if (!val) return null;
  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(Date.UTC(y, m, d, 12, 0, 0));
      }
    }
  } else if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(Date.UTC(y, m, d, 12, 0, 0));
      }
    }
  }
  return null;
}

export function formatDateToYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatHumanDate(ymd: string): string {
  const dt = parseDateSafe(ymd);
  if (!dt) return ymd;
  const d = dt.getUTCDate();
  const m = INDO_MONTHS_SHORT[dt.getUTCMonth()];
  const y = dt.getUTCFullYear();
  return `${d} ${m} ${y}`;
}

/**
 * Dapatkan informasi ISO Week dan rentang hari Senin-Minggu dari suatu tanggal
 */
export function getWeekDetails(dateObj: Date): {
  id: string;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  label: string;
} {
  const target = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 12, 0, 0));

  // ISO Week Calculation: Thursday in current week decides the year.
  const dayNr = (target.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = new Date(firstThursday).getUTCFullYear();

  // Dapatkan hari Senin dan Minggu
  const monday = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 12, 0, 0));
  monday.setUTCDate(monday.getUTCDate() - dayNr);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  const startDate = formatDateToYmd(monday);
  const endDate = formatDateToYmd(sunday);
  const padWeek = weekNumber < 10 ? `0${weekNumber}` : `${weekNumber}`;
  const id = `${year}-W${padWeek}`;
  const label = `Minggu ${weekNumber} (${formatHumanDate(startDate)} - ${formatHumanDate(endDate)})`;

  return { id, year, weekNumber, startDate, endDate, label };
}

/**
 * Ekstraksi seluruh pekan unik dari snapshot dan data produktivitas
 */
export function detectAvailableWeeks(
  snapshotKeys: string[],
  productivityDates: string[] = []
): WeeklyPeriod[] {
  const weekMap = new Map<string, {
    period: WeeklyPeriod;
    snapKeysSet: Set<string>;
    datesSet: Set<string>;
  }>();

  const processDateStr = (dateStr: string, snapKey?: string) => {
    const dt = parseDateSafe(dateStr);
    if (!dt) return;
    const info = getWeekDetails(dt);
    const ymd = formatDateToYmd(dt);

    if (!weekMap.has(info.id)) {
      weekMap.set(info.id, {
        period: {
          id: info.id,
          label: info.label,
          year: info.year,
          weekNumber: info.weekNumber,
          startDate: info.startDate,
          endDate: info.endDate,
          snapshotKeys: [],
          dates: [],
        },
        snapKeysSet: new Set(),
        datesSet: new Set(),
      });
    }

    const item = weekMap.get(info.id)!;
    if (snapKey) item.snapKeysSet.add(snapKey);
    item.datesSet.add(ymd);
  };

  // 1. Dari snapshot keys (format "snap_YYYY-MM-DD")
  snapshotKeys.forEach((k) => {
    const cleanDate = k.replace(/^snap_/, '');
    processDateStr(cleanDate, k);
  });

  // 2. Dari tanggal produktivitas
  productivityDates.forEach((d) => {
    processDateStr(d);
  });

  const result: WeeklyPeriod[] = [];
  weekMap.forEach((val) => {
    val.period.snapshotKeys = Array.from(val.snapKeysSet).sort();
    val.period.dates = Array.from(val.datesSet).sort();
    result.push(val.period);
  });

  // Urutkan dari pekan terbaru ke terlama
  return result.sort((a, b) => b.id.localeCompare(a.id));
}

/**
 * Hitung Analisis Mingguan untuk Modul Progres NC & Repair
 */
export function computeWeeklyNCAnalysis(
  transactions: NCProgressTransaction[],
  weekPeriod: WeeklyPeriod
): WeeklyNCSummary {
  // Filter transaksi yang tanggal posting atau tanggal entry jatuh dalam rentang pekan
  const weekTxs = transactions.filter((tx) => {
    const dStr = tx.postingDate || tx.entryDate || '';
    const dt = parseDateSafe(dStr);
    if (!dt) return false;
    const ymd = formatDateToYmd(dt);
    return ymd >= weekPeriod.startDate && ymd <= weekPeriod.endDate;
  });

  let total309Qty = 0;
  let total309Kg = 0;
  let total261Qty = 0;
  let total261Kg = 0;
  let total262Qty = 0;
  let total262Kg = 0;
  let total101Qty = 0;
  let total101Kg = 0;

  const dailyMap = new Map<string, {
    date: string;
    dayName: string;
    inNcKg: number;
    inNcQty: number;
    issuedRepairKg: number;
    issuedRepairQty: number;
    completedPrimeKg: number;
    completedPrimeQty: number;
  }>();

  // Siapkan map Senin s/d Minggu
  const startDt = parseDateSafe(weekPeriod.startDate);
  if (startDt) {
    for (let i = 0; i < 7; i++) {
      const cur = new Date(startDt);
      cur.setUTCDate(cur.getUTCDate() + i);
      const ymd = formatDateToYmd(cur);
      const dayName = INDO_DAYS[cur.getUTCDay()];
      dailyMap.set(ymd, {
        date: ymd,
        dayName,
        inNcKg: 0,
        inNcQty: 0,
        issuedRepairKg: 0,
        issuedRepairQty: 0,
        completedPrimeKg: 0,
        completedPrimeQty: 0,
      });
    }
  }

  const workCenterMap = new Map<string, {
    issuedKg: number;
    issuedQty: number;
    completedKg: number;
    completedQty: number;
  }>();

  const slocMap = new Map<string, {
    inNcKg: number;
    inNcQty: number;
    issuedKg: number;
    completedKg: number;
  }>();

  const materialMap = new Map<string, {
    material: string;
    description: string;
    ukuran: string;
    inNcKg: number;
    inNcQty: number;
    completedKg: number;
    completedQty: number;
  }>();

  weekTxs.forEach((tx) => {
    const dStr = tx.postingDate || tx.entryDate || '';
    const dt = parseDateSafe(dStr);
    const ymd = dt ? formatDateToYmd(dt) : '';
    const dayEntry = dailyMap.get(ymd);

    const mvt = String(tx.movementType || '').trim();
    const qty = Math.abs(tx.qtyInUnOfEntry || 0);
    const kg = Math.abs(tx.quantity || tx.kgGI || tx.kgGR || 0);
    const wc = String(tx.workCenter || 'Lainnya').trim().toUpperCase() || 'Lainnya';
    const gd = normalizeGudang(tx.storageLocation);
    const mat = String(tx.material || '-').trim();
    const desc = String(tx.materialDescription || '').trim();

    if (!workCenterMap.has(wc)) {
      workCenterMap.set(wc, { issuedKg: 0, issuedQty: 0, completedKg: 0, completedQty: 0 });
    }
    const wcEntry = workCenterMap.get(wc)!;

    if (!slocMap.has(gd)) {
      slocMap.set(gd, { inNcKg: 0, inNcQty: 0, issuedKg: 0, completedKg: 0 });
    }
    const slocEntry = slocMap.get(gd)!;

    if (!materialMap.has(mat) && mat !== '-') {
      materialMap.set(mat, {
        material: mat,
        description: desc,
        ukuran: parseMaterialUkuran(mat, desc),
        inNcKg: 0,
        inNcQty: 0,
        completedKg: 0,
        completedQty: 0,
      });
    }
    const matEntry = materialMap.get(mat);

    if (mvt === '309') {
      total309Qty += qty;
      total309Kg += kg;
      if (dayEntry) {
        dayEntry.inNcKg += kg;
        dayEntry.inNcQty += qty;
      }
      slocEntry.inNcKg += kg;
      slocEntry.inNcQty += qty;
      if (matEntry) {
        matEntry.inNcKg += kg;
        matEntry.inNcQty += qty;
      }
    } else if (mvt === '261') {
      total261Qty += qty;
      total261Kg += kg;
      if (dayEntry) {
        dayEntry.issuedRepairKg += kg;
        dayEntry.issuedRepairQty += qty;
      }
      wcEntry.issuedKg += kg;
      wcEntry.issuedQty += qty;
      slocEntry.issuedKg += kg;
    } else if (mvt === '262') {
      total262Qty += qty;
      total262Kg += kg;
      if (dayEntry) {
        dayEntry.issuedRepairKg = Math.max(0, dayEntry.issuedRepairKg - kg);
        dayEntry.issuedRepairQty = Math.max(0, dayEntry.issuedRepairQty - qty);
      }
      wcEntry.issuedKg = Math.max(0, wcEntry.issuedKg - kg);
      wcEntry.issuedQty = Math.max(0, wcEntry.issuedQty - qty);
      slocEntry.issuedKg = Math.max(0, slocEntry.issuedKg - kg);
    } else if (mvt === '101') {
      total101Qty += qty;
      total101Kg += kg;
      if (dayEntry) {
        dayEntry.completedPrimeKg += kg;
        dayEntry.completedPrimeQty += qty;
      }
      wcEntry.completedKg += kg;
      wcEntry.completedQty += qty;
      slocEntry.completedKg += kg;
      if (matEntry) {
        matEntry.completedKg += kg;
        matEntry.completedQty += qty;
      }
    }
  });

  const netRepairIssuedQty = Math.max(0, total261Qty - total262Qty);
  const netRepairIssuedKg = Math.max(0, total261Kg - total262Kg);
  const netOutstandingQty = Math.max(0, total309Qty - total101Qty);
  const netOutstandingKg = Math.max(0, total309Kg - total101Kg);

  const baseRecovery = netRepairIssuedKg > 0 ? netRepairIssuedKg : total309Kg;
  const recoveryRate = baseRecovery > 0 ? (total101Kg / baseRecovery) * 100 : 0;

  const workCenterBreakdown = Array.from(workCenterMap.entries())
    .map(([wc, data]) => ({
      workCenter: wc,
      issuedKg: Math.round(data.issuedKg),
      issuedQty: data.issuedQty,
      completedKg: Math.round(data.completedKg),
      completedQty: data.completedQty,
      recoveryRate: data.issuedKg > 0 ? (data.completedKg / data.issuedKg) * 100 : 0,
    }))
    .filter((w) => w.issuedKg > 0 || w.completedKg > 0)
    .sort((a, b) => b.completedKg - a.completedKg);

  const storageLocationBreakdown = Array.from(slocMap.entries())
    .map(([gd, data]) => ({
      gudang: gd,
      inNcKg: Math.round(data.inNcKg),
      inNcQty: data.inNcQty,
      issuedKg: Math.round(data.issuedKg),
      completedKg: Math.round(data.completedKg),
    }))
    .filter((s) => s.inNcKg > 0 || s.completedKg > 0)
    .sort((a, b) => b.inNcKg - a.inNcKg);

  const topMaterials = Array.from(materialMap.values())
    .filter((m) => m.inNcKg > 0 || m.completedKg > 0)
    .sort((a, b) => b.inNcKg - a.inNcKg)
    .slice(0, 10);

  return {
    total309Qty,
    total309Kg: Math.round(total309Kg),
    total261Qty,
    total261Kg: Math.round(total261Kg),
    total262Qty,
    total262Kg: Math.round(total262Kg),
    netRepairIssuedQty,
    netRepairIssuedKg: Math.round(netRepairIssuedKg),
    total101Qty,
    total101Kg: Math.round(total101Kg),
    netOutstandingQty,
    netOutstandingKg: Math.round(netOutstandingKg),
    recoveryRate: Number(recoveryRate.toFixed(1)),
    dailyBreakdown: Array.from(dailyMap.values()),
    workCenterBreakdown,
    storageLocationBreakdown,
    topMaterials,
  };
}

const DEFAULT_MANPOWER: Record<string, Record<string, number>> = {
  'Gd.01': { 'Shift 1': 4, 'Shift 2': 3, 'Shift 3': 1 },
  'Gd.02': { 'Shift 1': 6, 'Shift 2': 5, 'Shift 3': 1 },
  'Gd.03': { 'Shift 1': 3, 'Shift 2': 3, 'Shift 3': 1 },
  'Gd.04': { 'Shift 1': 4, 'Shift 2': 4, 'Shift 3': 1 },
  'Gd.05': { 'Shift 1': 6, 'Shift 2': 5, 'Shift 3': 3 },
  'Gd.06': { 'Shift 1': 4, 'Shift 2': 3, 'Shift 3': 0 },
  'Gd.08': { 'Shift 1': 4, 'Shift 2': 3, 'Shift 3': 0 },
  'Gd.09': { 'Shift 1': 0, 'Shift 2': 0, 'Shift 3': 0 },
  'Gd.10': { 'Shift 1': 6, 'Shift 2': 5, 'Shift 3': 5 },
  'Gd.11': { 'Shift 1': 6, 'Shift 2': 5, 'Shift 3': 5 },
};

/**
 * Hitung Analisis Mingguan untuk Produktivitas MB51
 */
export function computeWeeklyProductivity(
  dataset: MB51Dataset | null,
  weekPeriod: WeeklyPeriod
): WeeklyProductivitySummary {
  const emptySummary: WeeklyProductivitySummary = {
    totalTonase: 0,
    totalTransaksi: 0,
    avgKgPerMan: 0,
    avgTxPerMan: 0,
    totalHeadcountDays: 0,
    shiftBreakdown: {
      'Shift 1': { tonase: 0, transaksi: 0, avgKgPerMan: 0 },
      'Shift 2': { tonase: 0, transaksi: 0, avgKgPerMan: 0 },
      'Shift 3': { tonase: 0, transaksi: 0, avgKgPerMan: 0 },
    },
    warehouseBreakdown: [],
    dailyTrend: [],
  };

  if (!dataset || !Array.isArray(dataset.records) || dataset.records.length === 0) {
    return emptySummary;
  }

  // Cek apakah ada record dengan dateMode 'tanggal_kerja', jika tidak pakai 'posting_date'
  const hasTkMode = dataset.records.some((r) => r.dateMode === 'tanggal_kerja');
  const targetMode = hasTkMode ? 'tanggal_kerja' : 'posting_date';

  // Filter record produktivitas yang tanggalnya ada di pekan ini sesuai dateMode
  const weekRecords = dataset.records.filter((r) => {
    if (r.dateMode !== targetMode) return false;
    return r.tanggal >= weekPeriod.startDate && r.tanggal <= weekPeriod.endDate;
  });

  if (weekRecords.length === 0) {
    return emptySummary;
  }

  let totalTonase = 0;
  let totalTransaksi = 0;
  let totalManpowerSum = 0;

  const shiftMap: Record<string, { tonase: number; transaksi: number; man: number }> = {
    'Shift 1': { tonase: 0, transaksi: 0, man: 0 },
    'Shift 2': { tonase: 0, transaksi: 0, man: 0 },
    'Shift 3': { tonase: 0, transaksi: 0, man: 0 },
  };

  const whMap = new Map<string, { tonase: number; transaksi: number; man: number }>();
  const dailyMap = new Map<string, { tonase: number; transaksi: number }>();

  // Inisialisasi hari Senin s/d Minggu
  const startDt = parseDateSafe(weekPeriod.startDate);
  if (startDt) {
    for (let i = 0; i < 7; i++) {
      const cur = new Date(startDt);
      cur.setUTCDate(cur.getUTCDate() + i);
      const ymd = formatDateToYmd(cur);
      dailyMap.set(ymd, { tonase: 0, transaksi: 0 });
    }
  }

  weekRecords.forEach((r) => {
    const ton = (r.hhInKg || 0) + Math.abs(r.hhOutKg || 0);
    const tx = (r.hhInTx || 0) + (r.hhOutTx || 0);
    const s = r.shift;
    const wh = r.gudang;
    const man = DEFAULT_MANPOWER[wh]?.[s] ?? 0;
    const dateStr = r.tanggal;

    totalTonase += ton;
    totalTransaksi += tx;
    totalManpowerSum += man;

    if (shiftMap[s]) {
      shiftMap[s].tonase += ton;
      shiftMap[s].transaksi += tx;
      shiftMap[s].man += man;
    }

    if (!whMap.has(wh)) {
      whMap.set(wh, { tonase: 0, transaksi: 0, man: 0 });
    }
    const whEntry = whMap.get(wh)!;
    whEntry.tonase += ton;
    whEntry.transaksi += tx;
    whEntry.man += man;

    if (dailyMap.has(dateStr)) {
      const dEntry = dailyMap.get(dateStr)!;
      dEntry.tonase += ton;
      dEntry.transaksi += tx;
    }
  });

  const avgKgPerMan = totalManpowerSum > 0 ? Math.round(totalTonase / totalManpowerSum) : 0;
  const avgTxPerMan = totalManpowerSum > 0 ? Number((totalTransaksi / totalManpowerSum).toFixed(1)) : 0;

  const warehouseBreakdown = Array.from(whMap.entries())
    .map(([wh, d]) => ({
      warehouse: wh,
      tonase: Math.round(d.tonase),
      transaksi: d.transaksi,
      avgKgPerMan: d.man > 0 ? Math.round(d.tonase / d.man) : 0,
      sharePercent: totalTonase > 0 ? Number(((d.tonase / totalTonase) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.tonase - a.tonase);

  const dailyTrend = Array.from(dailyMap.entries()).map(([dateStr, d]) => {
    const dt = parseDateSafe(dateStr);
    const dayName = dt ? INDO_DAYS[dt.getUTCDay()] : '';
    return {
      date: dateStr,
      dayName,
      tonase: Math.round(d.tonase),
      transaksi: d.transaksi,
    };
  });

  return {
    totalTonase: Math.round(totalTonase),
    totalTransaksi,
    avgKgPerMan,
    avgTxPerMan,
    totalHeadcountDays: totalManpowerSum,
    shiftBreakdown: {
      'Shift 1': {
        tonase: Math.round(shiftMap['Shift 1'].tonase),
        transaksi: shiftMap['Shift 1'].transaksi,
        avgKgPerMan: shiftMap['Shift 1'].man > 0 ? Math.round(shiftMap['Shift 1'].tonase / shiftMap['Shift 1'].man) : 0,
      },
      'Shift 2': {
        tonase: Math.round(shiftMap['Shift 2'].tonase),
        transaksi: shiftMap['Shift 2'].transaksi,
        avgKgPerMan: shiftMap['Shift 2'].man > 0 ? Math.round(shiftMap['Shift 2'].tonase / shiftMap['Shift 2'].man) : 0,
      },
      'Shift 3': {
        tonase: Math.round(shiftMap['Shift 3'].tonase),
        transaksi: shiftMap['Shift 3'].transaksi,
        avgKgPerMan: shiftMap['Shift 3'].man > 0 ? Math.round(shiftMap['Shift 3'].tonase / shiftMap['Shift 3'].man) : 0,
      },
    },
    warehouseBreakdown,
    dailyTrend,
  };
}

/**
 * Generate Executive Insights Otomatis
 */
export function generateWeeklyInsights(
  nc: WeeklyNCSummary,
  prod: WeeklyProductivitySummary,
  cap: WeeklyCapacitySummary
): string[] {
  const insights: string[] = [];

  // 1. Insight Progres NC
  if (nc.total309Kg > 0 || nc.total101Kg > 0) {
    if (nc.recoveryRate >= 85) {
      insights.push(`Tingkat pemulihan (Recovery Rate) NC sangat baik mencapai ${nc.recoveryRate}% (${(nc.total101Kg / 1000).toFixed(1)} Ton pipa berhasil di-repair kembali ke Grade Prime).`);
    } else if (nc.recoveryRate > 0) {
      insights.push(`Recovery Rate NC tercatat ${nc.recoveryRate}%. Terdapat sisa ${(nc.netOutstandingKg / 1000).toFixed(1)} Ton pipa NC yang masih dalam antrean order perbaikan.`);
    }

    if (nc.workCenterBreakdown.length > 0) {
      const topWc = nc.workCenterBreakdown[0];
      insights.push(`Stasiun perbaikan paling aktif adalah ${topWc.workCenter} dengan output selesai ${(topWc.completedKg / 1000).toFixed(1)} Ton.`);
    }
  }

  // 2. Insight Produktivitas
  if (prod.totalTonase > 0) {
    insights.push(`Total aktivitas penanganan material gudang (MB51) pekan ini sebesar ${(prod.totalTonase / 1000).toFixed(1)} Ton dengan ${prod.totalTransaksi.toLocaleString('id-ID')} transaksi ritase.`);
    if (prod.warehouseBreakdown.length > 0) {
      const topWh = prod.warehouseBreakdown[0];
      insights.push(`Gudang dengan beban tonase tertinggi adalah ${topWh.warehouse} (${(topWh.tonase / 1000).toFixed(1)} Ton, kontribusi ${topWh.sharePercent}% dari total pabrik).`);
    }
    const s1Ton = prod.shiftBreakdown['Shift 1'].tonase;
    const s2Ton = prod.shiftBreakdown['Shift 2'].tonase;
    const dominantShift = s1Ton >= s2Ton ? 'Shift 1' : 'Shift 2';
    insights.push(`Beban operasional terbesar berada pada ${dominantShift} (${((Math.max(s1Ton, s2Ton) / prod.totalTonase) * 100).toFixed(1)}% dari total tonase mingguan).`);
  }

  // 3. Insight Kapasitas
  if (cap.deltaPipeStock !== 0) {
    const arah = cap.deltaPipeStock > 0 ? 'kenaikan' : 'penurunan';
    insights.push(`Stok pipa mengalami ${arah} neto sebesar ${Math.abs(Math.round(cap.deltaPipeStock / 1000)).toLocaleString('id-ID')} Ton selama pekan ini.`);
  }

  if (insights.length === 0) {
    insights.push('Belum ada transaksi atau snapshot tercatat untuk pekan yang dipilih.');
  }

  return insights;
}
