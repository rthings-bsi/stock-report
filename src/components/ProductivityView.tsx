'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  Upload,
  Users,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  Gauge,
  BarChart3,
  TrendingUp,
  Table2,
  Calendar,
  Building2,
  SlidersHorizontal,
  ChevronDown,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { tooltipStyleStrong } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';
import { readExcelFileRawMatrix } from '@/lib/parser';
import { parseMB51File } from '@/lib/parseMB51';
import type {
  ShiftName,
  DateMode,
  CalcMode,
  MB51BucketRecord,
  MB51HourlyRecord,
  MB51Dataset,
  HeadcountOverride,
  HeadcountConfig,
} from '@/types/productivity';

ChartJS.register(...registerables);

type SubTab = 'matrix' | 'daily_trend' | 'detail_table' | 'hourly_pivot';

export interface ProductivityViewProps {
  onOpenUploadModal?: () => void;
  refreshTrigger?: number | string;
  activeDate?: string;
  onDateChange?: (date: string) => void;
}

const WAREHOUSE_LIST = [
  'Gd.01', 'Gd.02', 'Gd.03', 'Gd.04', 'Gd.05', 'Gd.06',
  'Gd.08', 'Gd.09', 'Gd.10', 'Gd.11', 'Gd.12', 'Gd.13', 'Gd.14',
];

const SHIFTS: ShiftName[] = ['Shift 1', 'Shift 2', 'Shift 3'];

const SHIFT_HOURS: Record<ShiftName, number[]> = {
  'Shift 1': [7, 8, 9, 10, 11, 12, 13, 14],
  'Shift 2': [15, 16, 17, 18, 19, 20, 21, 22],
  'Shift 3': [23, 0, 1, 2, 3, 4, 5, 6],
};

const SHIFT_TIME_LABELS: Record<ShiftName, string> = {
  'Shift 1': '07:00–15:00',
  'Shift 2': '15:00–23:00',
  'Shift 3': '23:00–07:00',
};

function fmtKg(val: number | null | undefined, decimals = 0): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtTon(kgVal: number | null | undefined, decimals = 1): string {
  if (kgVal === null || kgVal === undefined || Number.isNaN(kgVal)) return '-';
  const ton = kgVal / 1000;
  return `${ton.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} Ton`;
}

function fmtDateShort(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr;
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const mi = parseInt(m, 10) - 1;
  return `${d} ${months[mi] || m} ${y}`;
}

function extractMetrics(rec: MB51BucketRecord, calcMode: CalcMode) {
  if (calcMode === 'handheld_clean') {
    const inKg = rec.hhInKg;
    const outKg = Math.abs(rec.hhOutKg);
    return { inKg, outKg, totalKg: inKg + outKg, tx: rec.hhInTx + rec.hhOutTx };
  }
  if (calcMode === 'all_devices_clean') {
    const inKg = rec.allInKg;
    const outKg = Math.abs(rec.allOutKg);
    return { inKg, outKg, totalKg: inKg + outKg, tx: rec.allInTx + rec.allOutTx };
  }
  return { inKg: 0, outKg: rec.rawAbsKg, totalKg: rec.rawAbsKg, tx: rec.rawTx };
}

function TableCardContainer({
  isFullscreen,
  onCloseFullscreen,
  children,
  className,
}: {
  isFullscreen: boolean;
  onCloseFullscreen: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-3 lg:p-4 animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCloseFullscreen();
        }}
      >
        <div
          className={cn(
            'flex flex-col w-full h-full max-w-[98vw] 2xl:max-w-[1880px] rounded-2xl border border-slate-300 bg-white shadow-2xl overflow-hidden',
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden', className)}>
      {children}
    </div>
  );
}

function FullscreenToggleBtn({
  isFullscreen,
  onToggle,
}: {
  isFullscreen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer active:scale-95 shrink-0',
        isFullscreen
          ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 shadow-2xs font-semibold'
          : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-2xs'
      )}
      title={isFullscreen ? 'Tutup mode layar penuh (Esc)' : 'Tampilkan tabel layar penuh'}
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Tutup Layar Penuh</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Layar Penuh</span>
        </>
      )}
    </button>
  );
}

export default function ProductivityView({
  onOpenUploadModal,
  refreshTrigger,
  activeDate,
  onDateChange,
}: ProductivityViewProps = {}) {
  const [dataset, setDataset] = useState<MB51Dataset | null>(null);
  const [headcount, setHeadcount] = useState<HeadcountConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('matrix');
  const [fullscreenTable, setFullscreenTable] = useState<
    'matrix' | 'daily_tonase' | 'daily_prod' | 'detail_table' | 'hourly_pivot' | null
  >(null);

  useEffect(() => {
    if (!fullscreenTable) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenTable(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreenTable]);

  useEffect(() => {
    setFullscreenTable(null);
  }, [activeSubTab]);
  const dateMode: DateMode = 'posting_date';
  const [calcMode, setCalcMode] = useState<CalcMode>('handheld_clean');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (activeDate && activeDate !== 'latest') return activeDate;
    return '2026-10-26';
  });
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [filterGudang, setFilterGudang] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [sortCol, setSortCol] = useState<string>('totalKg');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const [trendChartType, setTrendChartType] = useState<'area' | 'bar'>('area');
  const [trendMetric, setTrendMetric] = useState<'kg' | 'tx'>('kg');
  const [visibleShifts, setVisibleShifts] = useState<Record<ShiftName, boolean>>({
    'Shift 1': true,
    'Shift 2': true,
    'Shift 3': true,
  });

  const [showHeadcountModal, setShowHeadcountModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [savingHeadcount, setSavingHeadcount] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [draftHeadcount, setDraftHeadcount] = useState<HeadcountConfig | null>(null);
  const [newOverrideDate, setNewOverrideDate] = useState<string>('');
  const [newOverrideGudang, setNewOverrideGudang] = useState<string>('Gd.01');
  const [newOverrideShift, setNewOverrideShift] = useState<ShiftName>('Shift 1');
  const [newOverrideMan, setNewOverrideMan] = useState<string>('4');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sinkronkan filter tanggal saat dipilih dari kalender header navbar
  useEffect(() => {
    if (activeDate && activeDate !== 'latest') {
      setSelectedDate(activeDate);
    }
  }, [activeDate]);

  useEffect(() => {
    let mounted = true;
    async function fetchInitial() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/productivity');
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Gagal memuat data produktivitas');
        }
        if (mounted) {
          setDataset(json.dataset);
          setHeadcount(json.headcount);
          const dates: string[] = json.dataset?.postingDates || [];
          if (dates.length) {
            if (activeDate && activeDate !== 'latest' && dates.includes(activeDate)) {
              setSelectedDate(activeDate);
            } else {
              setSelectedDate(dates[dates.length - 1]);
            }
          }
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Terjadi kesalahan saat memuat data');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchInitial();
    return () => {
      mounted = false;
    };
  }, [refreshTrigger, activeDate]);

  const availableDates = useMemo(() => {
    if (!dataset) return [];
    return dataset.postingDates || [];
  }, [dataset]);

  const handleDateSelect = (newDate: string) => {
    setSelectedDate(newDate);
    if (onDateChange && newDate !== 'ALL') {
      onDateChange(newDate);
    }
  };

  const isAvailableDate = selectedDate === 'ALL' || availableDates.includes(selectedDate);

  const getManpower = useMemo(() => {
    if (!headcount) return (_tgl: string, _gd: string, _sh: ShiftName): number | null => null;
    const overrideMap = new Map<string, number | null>();
    for (const ov of headcount.dateOverrides || []) {
      overrideMap.set(`${ov.tanggal}|${ov.gudang}|${ov.shift}`, ov.man);
    }
    return (tgl: string, gd: string, sh: ShiftName): number | null => {
      if (tgl && tgl !== 'ALL') {
        const key = `${tgl}|${gd}|${sh}`;
        if (overrideMap.has(key)) return overrideMap.get(key) ?? null;
      }
      const val = headcount.defaultManpower[gd]?.[sh];
      return val !== undefined && val !== null && val > 0 ? val : null;
    };
  }, [headcount]);

  const allDetailRows = useMemo(() => {
    if (!dataset || !headcount) return [];
    const th = headcount.thresholds;

    return dataset.records
      .filter((r) => r.dateMode === dateMode)
      .map((r) => {
        const { inKg, outKg, totalKg, tx } = extractMetrics(r, calcMode);
        const man = getManpower(r.tanggal, r.gudang, r.shift);
        const kgPerTx = tx > 0 ? Math.round(totalKg / tx) : 0;
        const kgPerMan = man && man > 0 ? Math.round(totalKg / man) : null;
        const txPerMan = man && man > 0 ? Math.round((tx / man) * 10) / 10 : null;

        const flags: string[] = [];
        let primaryStatus: 'OPTIMAL' | 'IDLE' | 'LOW' | 'NO_MAN' = 'OPTIMAL';

        if (man === null || man <= 0) {
          flags.push('man kosong');
          primaryStatus = 'NO_MAN';
        } else {
          if (kgPerMan !== null && kgPerMan < th.lowKgPerMan) {
            flags.push('sedikit kerja');
            primaryStatus = 'LOW';
          }
          if (txPerMan !== null && txPerMan < th.idleTxPerMan) {
            flags.push('overstaff/idle');
            if (primaryStatus === 'OPTIMAL') primaryStatus = 'IDLE';
          }
        }
        if (kgPerTx > th.heavyKgPerTx) {
          flags.push('barang per-unit berat');
        }

        return {
          tanggal: r.tanggal,
          shift: r.shift,
          gudang: r.gudang,
          inKg,
          outKg,
          totalKg,
          tx,
          kgPerTx,
          man,
          kgPerMan,
          txPerMan,
          coilKg: r.coilKg,
          stripKg: r.stripKg,
          pipaKg: r.pipaKg,
          flags,
          catatan: flags.join(' ; '),
          primaryStatus,
        };
      })
      .filter((r) => r.totalKg > 0 || r.tx > 0);
  }, [dataset, headcount, dateMode, calcMode, getManpower]);

  const filteredDetailRows = useMemo(() => {
    return allDetailRows.filter((r) => {
      if (selectedDate !== 'ALL' && r.tanggal !== selectedDate) return false;
      if (filterShift !== 'ALL' && r.shift !== filterShift) return false;
      if (filterGudang !== 'ALL' && r.gudang !== filterGudang) return false;
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'HEAVY' && !r.flags.includes('barang per-unit berat')) return false;
        if (filterStatus !== 'HEAVY' && r.primaryStatus !== filterStatus) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${r.tanggal} ${r.shift} ${r.gudang} ${r.catatan}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allDetailRows, selectedDate, filterShift, filterGudang, filterStatus, searchQuery]);

  const sortedDetailRows = useMemo(() => {
    const arr = [...filteredDetailRows];
    arr.sort((a, b) => {
      let va: any = (a as any)[sortCol];
      let vb: any = (b as any)[sortCol];
      if (va === null || va === undefined) va = -1;
      if (vb === null || vb === undefined) vb = -1;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [filteredDetailRows, sortCol, sortAsc]);

  const matrixData = useMemo(() => {
    const activeDatesSet = new Set<string>();
    const byGdShift: Record<
      string,
      Record<ShiftName, { totalKg: number; inKg: number; outKg: number; tx: number; daysCount: number }>
    > = {};

    for (const gd of WAREHOUSE_LIST) {
      byGdShift[gd] = {
        'Shift 1': { totalKg: 0, inKg: 0, outKg: 0, tx: 0, daysCount: 0 },
        'Shift 2': { totalKg: 0, inKg: 0, outKg: 0, tx: 0, daysCount: 0 },
        'Shift 3': { totalKg: 0, inKg: 0, outKg: 0, tx: 0, daysCount: 0 },
      };
    }

    for (const r of allDetailRows) {
      if (selectedDate !== 'ALL' && r.tanggal !== selectedDate) continue;
      if (!byGdShift[r.gudang]) continue;
      activeDatesSet.add(r.tanggal);
      const cell = byGdShift[r.gudang][r.shift];
      cell.totalKg += r.totalKg;
      cell.inKg += r.inKg;
      cell.outKg += r.outKg;
      cell.tx += r.tx;
      cell.daysCount += 1;
    }

    const numDays = selectedDate === 'ALL' ? Math.max(1, activeDatesSet.size) : 1;
    const tglForMan = selectedDate === 'ALL' ? '' : selectedDate;

    const perGudang: Record<
      string,
      {
        man: Record<ShiftName, number | null>;
        totalMan: number;
        handlingAllKg: number;
        handlingAllTx: number;
        shifts: Record<ShiftName, { kg: number; tx: number; kgPerMan: number | null; txPerMan: number | null }>;
      }
    > = {};

    for (const gd of WAREHOUSE_LIST) {
      const m1 = getManpower(tglForMan, gd, 'Shift 1');
      const m2 = getManpower(tglForMan, gd, 'Shift 2');
      const m3 = getManpower(tglForMan, gd, 'Shift 3');
      const totalMan = (m1 || 0) + (m2 || 0) + (m3 || 0);

      const s1 = byGdShift[gd]['Shift 1'];
      const s2 = byGdShift[gd]['Shift 2'];
      const s3 = byGdShift[gd]['Shift 3'];

      const effM1 = m1 ? m1 * Math.max(1, s1.daysCount) : null;
      const effM2 = m2 ? m2 * Math.max(1, s2.daysCount) : null;
      const effM3 = m3 ? m3 * Math.max(1, s3.daysCount) : null;

      perGudang[gd] = {
        man: { 'Shift 1': m1, 'Shift 2': m2, 'Shift 3': m3 },
        totalMan,
        handlingAllKg: s1.totalKg + s2.totalKg + s3.totalKg,
        handlingAllTx: s1.tx + s2.tx + s3.tx,
        shifts: {
          'Shift 1': {
            kg: s1.totalKg,
            tx: s1.tx,
            kgPerMan: effM1 ? s1.totalKg / effM1 : null,
            txPerMan: effM1 ? s1.tx / effM1 : null,
          },
          'Shift 2': {
            kg: s2.totalKg,
            tx: s2.tx,
            kgPerMan: effM2 ? s2.totalKg / effM2 : null,
            txPerMan: effM2 ? s2.tx / effM2 : null,
          },
          'Shift 3': {
            kg: s3.totalKg,
            tx: s3.tx,
            kgPerMan: effM3 ? s3.totalKg / effM3 : null,
            txPerMan: effM3 ? s3.tx / effM3 : null,
          },
        },
      };
    }

    return { perGudang, numDays };
  }, [allDetailRows, selectedDate, getManpower]);

  const kpiSummary = useMemo(() => {
    let totalKg = 0;
    let totalInKg = 0;
    let totalOutKg = 0;
    let totalTx = 0;
    let coveredKg = 0;
    let coveredTx = 0;
    let totalManShifts = 0;
    let optimalCount = 0;
    let idleCount = 0;
    let lowCount = 0;

    for (const r of filteredDetailRows) {
      totalKg += r.totalKg;
      totalInKg += r.inKg;
      totalOutKg += r.outKg;
      totalTx += r.tx;
      if (r.man && r.man > 0) {
        coveredKg += r.totalKg;
        coveredTx += r.tx;
        totalManShifts += r.man;
      }
      if (r.primaryStatus === 'OPTIMAL') optimalCount++;
      else if (r.primaryStatus === 'IDLE') idleCount++;
      else if (r.primaryStatus === 'LOW') lowCount++;
    }

    const avgKgPerMan = totalManShifts > 0 ? Math.round(coveredKg / totalManShifts) : 0;
    const avgTxPerMan = totalManShifts > 0 ? Math.round((coveredTx / totalManShifts) * 10) / 10 : 0;
    const avgKgPerTx = totalTx > 0 ? Math.round(totalKg / totalTx) : 0;

    return {
      totalKg,
      totalInKg,
      totalOutKg,
      totalTx,
      avgKgPerMan,
      avgTxPerMan,
      avgKgPerTx,
      totalManShifts,
      optimalCount,
      idleCount,
      lowCount,
    };
  }, [filteredDetailRows]);

  const dailyRecapRows = useMemo(() => {
    const byDate: Record<
      string,
      {
        tanggal: string;
        berat: Record<ShiftName, number>;
        coveredBerat: Record<ShiftName, number>;
        man: Record<ShiftName, number>;
        tx: Record<ShiftName, number>;
      }
    > = {};

    for (const d of availableDates) {
      byDate[d] = {
        tanggal: d,
        berat: { 'Shift 1': 0, 'Shift 2': 0, 'Shift 3': 0 },
        coveredBerat: { 'Shift 1': 0, 'Shift 2': 0, 'Shift 3': 0 },
        man: { 'Shift 1': 0, 'Shift 2': 0, 'Shift 3': 0 },
        tx: { 'Shift 1': 0, 'Shift 2': 0, 'Shift 3': 0 },
      };
    }

    for (const r of allDetailRows) {
      if (filterGudang !== 'ALL' && r.gudang !== filterGudang) continue;
      if (!byDate[r.tanggal]) continue;
      const entry = byDate[r.tanggal];
      entry.berat[r.shift] += r.totalKg;
      entry.tx[r.shift] += r.tx;
      if (r.man && r.man > 0) {
        entry.coveredBerat[r.shift] += r.totalKg;
        entry.man[r.shift] += r.man;
      }
    }

    return Object.values(byDate).map((d) => {
      const totalBerat = d.berat['Shift 1'] + d.berat['Shift 2'] + d.berat['Shift 3'];
      const totalTx = d.tx['Shift 1'] + d.tx['Shift 2'] + d.tx['Shift 3'];
      const totalCovered = d.coveredBerat['Shift 1'] + d.coveredBerat['Shift 2'] + d.coveredBerat['Shift 3'];
      const totalMan = d.man['Shift 1'] + d.man['Shift 2'] + d.man['Shift 3'];
      return {
        tanggal: d.tanggal,
        s1Kg: d.berat['Shift 1'],
        s2Kg: d.berat['Shift 2'],
        s3Kg: d.berat['Shift 3'],
        totalKg: totalBerat,
        s1Tx: d.tx['Shift 1'],
        s2Tx: d.tx['Shift 2'],
        s3Tx: d.tx['Shift 3'],
        totalTx: totalTx,
        s1KgMan: d.man['Shift 1'] > 0 ? Math.round(d.coveredBerat['Shift 1'] / d.man['Shift 1']) : null,
        s2KgMan: d.man['Shift 2'] > 0 ? Math.round(d.coveredBerat['Shift 2'] / d.man['Shift 2']) : null,
        s3KgMan: d.man['Shift 3'] > 0 ? Math.round(d.coveredBerat['Shift 3'] / d.man['Shift 3']) : null,
        avgKgMan: totalMan > 0 ? Math.round(totalCovered / totalMan) : null,
      };
    });
  }, [allDetailRows, availableDates, filterGudang]);

  const hourlyPivotData = useMemo(() => {
    const matrix: Record<number, Record<string, number>> = {};
    for (let h = 0; h < 24; h++) {
      matrix[h] = {};
      for (const gd of WAREHOUSE_LIST) matrix[h][gd] = 0;
    }
    if (!dataset?.hourlyRecords) return matrix;

    for (const hr of dataset.hourlyRecords) {
      if (hr.dateMode !== dateMode) continue;
      if (selectedDate !== 'ALL' && hr.tanggal !== selectedDate) continue;
      if (filterShift !== 'ALL' && hr.shift !== filterShift) continue;
      if (matrix[hr.hour] && matrix[hr.hour][hr.gudang] !== undefined) {
        matrix[hr.hour][hr.gudang] += calcMode === 'handheld_clean' ? hr.hhTx : hr.allTx;
      }
    }
    return matrix;
  }, [dataset, dateMode, selectedDate, filterShift, calcMode]);

  const isKg = trendMetric === 'kg';

  const shiftTotals = useMemo(() => {
    let s1Kg = 0, s2Kg = 0, s3Kg = 0;
    let s1Tx = 0, s2Tx = 0, s3Tx = 0;
    for (const r of dailyRecapRows) {
      s1Kg += r.s1Kg;
      s2Kg += r.s2Kg;
      s3Kg += r.s3Kg;
      s1Tx += r.s1Tx;
      s2Tx += r.s2Tx;
      s3Tx += r.s3Tx;
    }
    const totalKg = s1Kg + s2Kg + s3Kg;
    const totalTx = s1Tx + s2Tx + s3Tx;
    return { s1Kg, s2Kg, s3Kg, s1Tx, s2Tx, s3Tx, totalKg, totalTx };
  }, [dailyRecapRows]);

  const dailyTrendChartData = useMemo(() => {
    const isArea = trendChartType === 'area';
    const datasets = [
      {
        label: isKg ? 'Shift 1 (Kg)' : 'Shift 1 (Tx)',
        data: dailyRecapRows.map((r) => Math.round(isKg ? r.s1Kg : r.s1Tx)),
        borderColor: '#059669',
        backgroundColor: isArea ? 'rgba(5, 150, 105, 0.12)' : 'rgba(5, 150, 105, 0.85)',
        tension: 0.38,
        fill: isArea,
        borderWidth: 2.5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#059669',
        pointBorderWidth: 2.5,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderWidth: 3,
        borderRadius: !isArea ? 6 : undefined,
        maxBarThickness: 52,
        hidden: !visibleShifts['Shift 1'],
      },
      {
        label: isKg ? 'Shift 2 (Kg)' : 'Shift 2 (Tx)',
        data: dailyRecapRows.map((r) => Math.round(isKg ? r.s2Kg : r.s2Tx)),
        borderColor: '#0284c7',
        backgroundColor: isArea ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.85)',
        tension: 0.38,
        fill: isArea,
        borderWidth: 2.5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#0284c7',
        pointBorderWidth: 2.5,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderWidth: 3,
        borderRadius: !isArea ? 6 : undefined,
        maxBarThickness: 52,
        hidden: !visibleShifts['Shift 2'],
      },
      {
        label: isKg ? 'Shift 3 (Kg)' : 'Shift 3 (Tx)',
        data: dailyRecapRows.map((r) => Math.round(isKg ? r.s3Kg : r.s3Tx)),
        borderColor: '#d97706',
        backgroundColor: isArea ? 'rgba(217, 119, 6, 0.12)' : 'rgba(217, 119, 6, 0.85)',
        tension: 0.38,
        fill: isArea,
        borderWidth: 2.5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#d97706',
        pointBorderWidth: 2.5,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderWidth: 3,
        borderRadius: !isArea ? 6 : undefined,
        maxBarThickness: 52,
        hidden: !visibleShifts['Shift 3'],
      },
    ];

    return {
      labels: dailyRecapRows.map((r) => fmtDateShort(r.tanggal)),
      datasets,
    };
  }, [dailyRecapRows, isKg, trendChartType, visibleShifts]);

  const trendChartOptions = useMemo(() => {
    const isArea = trendChartType === 'area';
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyleStrong,
          callbacks: {
            title: (items: any[]) => {
              if (!items?.length) return '';
              const rawDate = dailyRecapRows[items[0].dataIndex]?.tanggal;
              return `Tanggal: ${fmtDateShort(rawDate || items[0].label)}`;
            },
            label: (item: any) => {
              const rawVal = Number(item.raw) || 0;
              const shiftName = item.dataset.label?.split(' ')[0] + ' ' + item.dataset.label?.split(' ')[1];
              if (trendMetric === 'kg') {
                const tonVal = (rawVal / 1000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                return ` ${shiftName}: ${rawVal.toLocaleString('id-ID')} Kg (${tonVal} Ton)`;
              }
              return ` ${shiftName}: ${rawVal.toLocaleString('id-ID')} Tx`;
            },
            footer: (items: any[]) => {
              const sum = items.reduce((acc, curr) => acc + (Number(curr.raw) || 0), 0);
              if (trendMetric === 'kg') {
                const ton = (sum / 1000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                return `Total Hari: ${sum.toLocaleString('id-ID')} Kg (${ton} Ton)`;
              }
              return `Total Hari: ${sum.toLocaleString('id-ID')} Tx`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: !isArea,
          grid: { display: false },
          ticks: {
            font: { family: 'inherit', size: 11, weight: 500 as const },
            color: '#475569',
            padding: 6,
          },
        },
        y: {
          stacked: !isArea,
          beginAtZero: true,
          grid: {
            color: 'rgba(226, 232, 240, 0.75)',
            borderDash: [3, 3],
            drawTicks: false,
          },
          border: { display: false },
          ticks: {
            font: { family: 'inherit', size: 10.5 },
            color: '#94a3b8',
            padding: 8,
            callback: (v: any) => {
              const n = Number(v);
              if (trendMetric === 'kg') {
                if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M Kg`;
                if (n >= 1000) return `${(n / 1000).toLocaleString('id-ID')} Ton`;
                return `${n} Kg`;
              }
              return `${n} Tx`;
            },
          },
        },
      },
    };
  }, [dailyRecapRows, trendChartType, trendMetric]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  const openHeadcountEditor = () => {
    if (!headcount) return;
    setDraftHeadcount(JSON.parse(JSON.stringify(headcount)));
    setNewOverrideDate(
      selectedDate !== 'ALL'
        ? selectedDate
        : availableDates[availableDates.length - 1] || new Date().toISOString().slice(0, 10)
    );
    setShowHeadcountModal(true);
  };

  const handleSaveHeadcount = async () => {
    if (!draftHeadcount) return;
    setSavingHeadcount(true);
    try {
      const res = await fetch('/api/productivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_headcount', headcount: draftHeadcount }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan konfigurasi headcount');
      }
      setHeadcount(json.headcount);
      setShowHeadcountModal(false);
      showToast('Konfigurasi Master Headcount berhasil disimpan');
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan headcount');
    } finally {
      setSavingHeadcount(false);
    }
  };

  const handleResetHeadcount = async () => {
    setSavingHeadcount(true);
    try {
      const res = await fetch('/api/productivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_headcount' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setHeadcount(json.headcount);
        setDraftHeadcount(JSON.parse(JSON.stringify(json.headcount)));
        showToast('Headcount dikembalikan ke standar default');
      }
    } finally {
      setSavingHeadcount(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    setUploadError(null);
    try {
      // Parse client-side dengan raw matrix & parseMB51File (Bebas ketergantungan runtime Python)
      const rawMatrix = await readExcelFileRawMatrix(file);
      const parsedDataset = parseMB51File(rawMatrix, file.name);

      const res = await fetch('/api/productivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_dataset',
          dataset: parsedDataset,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memproses file MB51');
      }
      setDataset(json.dataset);
      const dates: string[] =
        json.dataset?.tanggalKerjaDates?.length
          ? json.dataset.tanggalKerjaDates
          : json.dataset?.postingDates || [];
      const isSingleDaySapSplit =
        (json.dataset?.postingDates?.length || 0) === 1 && (json.dataset?.tanggalKerjaDates?.length || 0) > 1;
      if (dates.length) {
        if (activeDate && activeDate !== 'latest') {
          handleDateSelect(activeDate);
        } else {
          handleDateSelect(isSingleDaySapSplit ? 'ALL' : dates[dates.length - 1]);
        }
      }
      setShowUploadModal(false);
      showToast(`Berhasil memuat ${json.dataset.totalRowsRead.toLocaleString('id-ID')} baris transaksi MB51`);
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal mengunggah file MB51');
    } finally {
      setUploadingFile(false);
    }
  };

  const [resettingData, setResettingData] = useState(false);

  const handleResetProductivity = async () => {
    if (!confirm('Apakah Anda yakin ingin mereset/menghapus seluruh data transaksi produktivitas gudang ini?')) return;
    setResettingData(true);
    try {
      const res = await fetch('/api/productivity', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setDataset({
          sourceFile: '',
          lastUpdated: new Date().toISOString(),
          totalRowsRead: 0,
          postingDates: [],
          tanggalKerjaDates: [],
          records: [],
          hourlyRecords: [],
        });
        showToast('Data transaksi produktivitas berhasil direset.');
      } else {
        alert(json.error || 'Gagal mereset data produktivitas');
      }
    } catch (e: any) {
      alert('Gagal mereset data produktivitas: ' + e?.message);
    } finally {
      setResettingData(false);
    }
  };

  const handleExportExcel = async () => {
    if (!dataset || !headcount) return;
    setExportingExcel(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Spindo Warehouse Productivity Analyzer';
      wb.created = new Date();

      const wsMatrix = wb.addWorksheet('Produktivitas Harian');
      wsMatrix.addRow([
        `REKAP PRODUKTIVITAS HARIAN GUDANG (${selectedDate === 'ALL' ? 'SEMUA TANGGAL' : selectedDate})`,
      ]);
      wsMatrix.addRow([
        `Sumber: ${dataset.sourceFile} | Basis: Posting Date SAP | Mode: ${calcMode}`,
      ]);
      wsMatrix.addRow([]);

      const headerRow = wsMatrix.addRow(['Kategori', 'Metrik / Shift', ...WAREHOUSE_LIST, 'Total / Rata-rata']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };

      for (const sh of SHIFTS) {
        const vals = WAREHOUSE_LIST.map((gd) => matrixData.perGudang[gd].man[sh] ?? '');
        const sumMan = WAREHOUSE_LIST.reduce((acc, gd) => acc + (matrixData.perGudang[gd].man[sh] || 0), 0);
        wsMatrix.addRow(['Man Power', sh, ...vals, sumMan]);
      }
      wsMatrix.addRow([
        'Man Power',
        'Total Man',
        ...WAREHOUSE_LIST.map((gd) => matrixData.perGudang[gd].totalMan),
        WAREHOUSE_LIST.reduce((acc, gd) => acc + matrixData.perGudang[gd].totalMan, 0),
      ]);

      wsMatrix.addRow([
        'Handling All',
        'Total Berat (Kg)',
        ...WAREHOUSE_LIST.map((gd) => Math.round(matrixData.perGudang[gd].handlingAllKg)),
        Math.round(WAREHOUSE_LIST.reduce((acc, gd) => acc + matrixData.perGudang[gd].handlingAllKg, 0)),
      ]);

      for (const sh of SHIFTS) {
        wsMatrix.addRow([
          sh,
          'Tonase (Kg)',
          ...WAREHOUSE_LIST.map((gd) => Math.round(matrixData.perGudang[gd].shifts[sh].kg)),
          Math.round(WAREHOUSE_LIST.reduce((acc, gd) => acc + matrixData.perGudang[gd].shifts[sh].kg, 0)),
        ]);
        wsMatrix.addRow([
          sh,
          'Produktivity (Kg/Man)',
          ...WAREHOUSE_LIST.map((gd) => {
            const v = matrixData.perGudang[gd].shifts[sh].kgPerMan;
            return v !== null ? Math.round(v) : '-';
          }),
          '',
        ]);
      }

      const wsDaily = wb.addWorksheet('Rekap Harian');
      wsDaily.addRow([
        'Tanggal',
        'Shift 1 (Kg)',
        'Shift 2 (Kg)',
        'Shift 3 (Kg)',
        'Total Berat (Kg)',
        'Kg/Man Shift 1',
        'Kg/Man Shift 2',
        'Kg/Man Shift 3',
        'Kg/Man Harian',
      ]);
      wsDaily.getRow(1).font = { bold: true };
      for (const r of dailyRecapRows) {
        wsDaily.addRow([
          r.tanggal,
          Math.round(r.s1Kg),
          Math.round(r.s2Kg),
          Math.round(r.s3Kg),
          Math.round(r.totalKg),
          r.s1KgMan ?? '-',
          r.s2KgMan ?? '-',
          r.s3KgMan ?? '-',
          r.avgKgMan ?? '-',
        ]);
      }

      const wsDetail = wb.addWorksheet('Detail Produktivitas');
      wsDetail.addRow([
        'Tanggal',
        'Shift',
        'Gudang',
        'Berat IN (Kg)',
        'Berat OUT (Kg)',
        'Total Berat (Kg)',
        'Transaksi (Tx)',
        'Kg/Tx',
        'Man Power',
        'Kg/Man',
        'Tx/Man',
        'Catatan / Status',
      ]);
      wsDetail.getRow(1).font = { bold: true };
      for (const r of sortedDetailRows) {
        wsDetail.addRow([
          r.tanggal,
          r.shift,
          r.gudang,
          Math.round(r.inKg),
          Math.round(r.outKg),
          Math.round(r.totalKg),
          r.tx,
          r.kgPerTx,
          r.man ?? '',
          r.kgPerMan ?? '',
          r.txPerMan ?? '',
          r.catatan || 'Optimal',
        ]);
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Produktivitas_Gudang_MB51_${selectedDate === 'ALL' ? 'AllDates' : selectedDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Gagal mengekspor Excel: ' + (err?.message || 'Unknown error'));
    } finally {
      setExportingExcel(false);
    }
  };

  const renderUploadModal = () => (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold">
              Upload File Mentah SAP MB51 / Daily Report WH
            </h3>
            <p className="text-[11px] text-emerald-200">
              Mendukung hasil download langsung SAP MB51 (28 kolom mentah) maupun Excel Daily Report WH (.xlsx, .xls, .csv, .txt, .tsv)
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(false)}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
          />

          <div
            onClick={() => !uploadingFile && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (uploadingFile) return;
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileUpload(f);
            }}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              uploadingFile
                ? 'border-emerald-300 bg-emerald-50/40 cursor-wait'
                : 'border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/20'
            )}
          >
            <FileSpreadsheet className="w-10 h-10 text-emerald-700 mx-auto mb-3" />
            {uploadingFile ? (
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Memproses ribuan baris transaksi MB51...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Menghitung otomatis klasifikasi Gudang, Shift, Tanggal Kerja (H-1 Shift 3), HandHeld/Desktop, dan Work Center + MVT...
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Klik untuk memilih file atau tarik (drag & drop) ke sini
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Langsung upload file mentah hasil download SAP MB51 (28 kolom: <code>Entry Date</code>, <code>Time of Entry</code> / <code>Entry Time</code>, <code>Storage Location</code> / <code>Sloc</code>, <code>Posting Date</code>, <code>Movement Type</code> / <code>Mvt</code>, <code>Material</code>, <code>Qty in Un. of Entry</code>, <code>Quantity</code> / <code>Berat</code>, <code>User name</code>, dst.)
                </p>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-[11px] text-slate-700 space-y-1">
            <p className="font-bold text-emerald-900">Rumus Otomatis dari Data Mentah SAP MB51:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
              <li><strong>Gudang:</strong> Otomatis dari karakter ke-2 <code>Storage Location</code> / <code>Sloc</code> (mis. <code>5M09</code> → <code>Gd.13</code>, <code>5N21</code> → <code>Gd.14</code>, <code>5A21</code> → <code>Gd.01</code>).</li>
              <li><strong>Tonase (Kg) &amp; Qty:</strong> Membaca <code>Quantity</code> / <code>Berat</code> sebagai Kg (termasuk desimal koma seperti <code>-594,00</code> / <code>-133,056</code>) dan <code>Qty in Un. of Entry</code> / <code>Qty</code> sebagai satuan fisik.</li>
              <li><strong>Basis Posting Date SAP:</strong> Mengikuti tanggal posting resmi SAP MB51. Shift 1 (<code>07:00–14:59</code>), Shift 2 (<code>15:00–22:59</code>), dan Shift 3 (<code>23:00–06:59</code>).</li>
              <li><strong>HandHeld vs Desktop:</strong> Otomatis dipetakan dari <code>User name</code> (mis. <code>GUDANG13C</code> → <code>HandHeld</code>) &amp; filter validasi <code>Work Center + Movement Type</code>.</li>
            </ul>
          </div>

          {uploadError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {uploadError}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-900/90 h-16 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-2xl border border-slate-200/80 bg-white p-4 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !dataset || !headcount || !dataset.records || dataset.records.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">Data Produktivitas MB51 Belum Tersedia</h3>
          <p className="text-xs text-slate-600 mb-4">{error || 'Belum ada data transaksi produktivitas atau data telah direset. Silakan unggah file export SAP MB51 (.xlsx / .csv).'}</p>
          <button
            onClick={() => {
              if (onOpenUploadModal) {
                onOpenUploadModal();
              } else {
                setShowUploadModal(true);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File SAP MB51
          </button>
        </div>

        {showUploadModal && renderUploadModal()}
      </div>
    );
  }

  const kgPerManChartData = {
    labels: WAREHOUSE_LIST,
    datasets: [
      {
        label: 'Shift 1 (Kg/Man)',
        data: WAREHOUSE_LIST.map((gd) => Math.round(matrixData.perGudang[gd]?.shifts['Shift 1'].kgPerMan || 0)),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 6,
        maxBarThickness: 28,
      },
      {
        label: 'Shift 2 (Kg/Man)',
        data: WAREHOUSE_LIST.map((gd) => Math.round(matrixData.perGudang[gd]?.shifts['Shift 2'].kgPerMan || 0)),
        backgroundColor: '#0284c7',
        hoverBackgroundColor: '#0369a1',
        borderRadius: 6,
        maxBarThickness: 28,
      },
      {
        label: 'Shift 3 (Kg/Man)',
        data: WAREHOUSE_LIST.map((gd) => Math.round(matrixData.perGudang[gd]?.shifts['Shift 3'].kgPerMan || 0)),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 6,
        maxBarThickness: 28,
      },
    ],
  };

  const tonaseChartData = {
    labels: WAREHOUSE_LIST,
    datasets: [
      {
        label: 'Shift 1 (Kg)',
        data: WAREHOUSE_LIST.map((gd) => Math.round(matrixData.perGudang[gd]?.shifts['Shift 1'].kg || 0)),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 4,
        maxBarThickness: 32,
      },
      {
        label: 'Shift 2 (Kg)',
        data: WAREHOUSE_LIST.map((gd) => Math.round(matrixData.perGudang[gd]?.shifts['Shift 2'].kg || 0)),
        backgroundColor: '#0284c7',
        hoverBackgroundColor: '#0369a1',
        borderRadius: 4,
        maxBarThickness: 32,
      },
      {
        label: 'Shift 3 (Kg)',
        data: WAREHOUSE_LIST.map((gd) => Math.round(matrixData.perGudang[gd]?.shifts['Shift 3'].kg || 0)),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 4,
        maxBarThickness: 32,
      },
    ],
  };

  const inPct =
    kpiSummary.totalKg > 0 ? Math.min(100, Math.round((kpiSummary.totalInKg / kpiSummary.totalKg) * 100)) : 50;
  const totalStatusCount = Math.max(1, kpiSummary.optimalCount + kpiSummary.idleCount + kpiSummary.lowCount);
  const optPct = Math.round((kpiSummary.optimalCount / totalStatusCount) * 100);

  const defaultDate =
    activeDate && activeDate !== 'latest' && availableDates.includes(activeDate)
      ? activeDate
      : availableDates[availableDates.length - 1] || 'ALL';

  const hasActiveFilter =
    selectedDate !== defaultDate ||
    filterShift !== 'ALL' ||
    filterGudang !== 'ALL' ||
    calcMode !== 'handheld_clean';

  const activeFilterCount =
    (selectedDate !== defaultDate ? 1 : 0) +
    (filterShift !== 'ALL' ? 1 : 0) +
    (filterGudang !== 'ALL' ? 1 : 0) +
    (calcMode !== 'handheld_clean' ? 1 : 0);

  const resetFilters = () => {
    handleDateSelect(dataset?.postingDates?.[dataset.postingDates.length - 1] || 'ALL');
    setFilterShift('ALL');
    setFilterGudang('ALL');
    setCalcMode('handheld_clean');
    setFilterStatus('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-3.5 pb-10">
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950 text-white text-xs font-semibold shadow-lg border border-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP BANNER HEADER */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <Users className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <h1 className="text-base font-bold text-white font-sans tracking-tight">
            Produktivitas Gudang
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={openHeadcountEditor}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/90 text-emerald-100 font-semibold text-xs transition-colors border border-emerald-700/80 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Headcount</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/90 text-emerald-100 font-semibold text-xs transition-colors border border-emerald-700/80 disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{exportingExcel ? 'Export...' : 'Excel'}</span>
          </button>
        </div>
      </div>

      {/* 2. UNIFIED OPERATIONAL METRIC LEDGER (Clean, Minimalist & High-Legibility) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-100">
          {/* Metric 1: Total Tonase Handling */}
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">
                Total Tonase
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                  {fmtKg(kpiSummary.totalKg / 1000, 1)}
                </span>
                <span className="text-xs font-semibold text-slate-400">Ton</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
              <span>In <strong className="font-semibold text-slate-700">{fmtKg(kpiSummary.totalInKg / 1000, 1)}T</strong></span>
              <span className="text-slate-300">•</span>
              <span>Out <strong className="font-semibold text-slate-700">{fmtKg(kpiSummary.totalOutKg / 1000, 1)}T</strong></span>
            </div>
          </div>

          {/* Metric 2: Frekuensi Scan Transaksi */}
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">
                Scan Transaksi
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                  {fmtKg(kpiSummary.totalTx)}
                </span>
                <span className="text-xs font-semibold text-slate-400">Tx</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
              <span>{kpiSummary.totalManShifts} shift</span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-700">{fmtKg(kpiSummary.avgKgPerTx)} Kg/Tx</span>
            </div>
          </div>

          {/* Metric 3: Produktivitas (Kg/Man) */}
          <div className="p-4 sm:p-5 flex flex-col justify-between bg-emerald-50/20">
            <div>
              <span className="text-xs font-medium text-emerald-800">
                Produktivitas
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700 tracking-tight tabular-nums">
                  {fmtKg(kpiSummary.avgKgPerMan)}
                </span>
                <span className="text-xs font-semibold text-emerald-600/80">Kg/Man</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-100/80 flex items-center justify-between text-xs text-slate-500">
              <span>Target</span>
              <span className="font-medium text-slate-700">≥ {fmtKg(headcount.thresholds.lowKgPerMan / 1000, 1)} Ton</span>
            </div>
          </div>

          {/* Metric 4: Kecepatan Scan & Status */}
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Kecepatan Scan
                </span>
                <span className={cn(
                  'text-[11px] font-semibold font-mono',
                  optPct >= 70 ? 'text-emerald-700' : 'text-amber-700'
                )}>
                  {optPct}% Optimal
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                  {kpiSummary.avgTxPerMan.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="text-xs font-semibold text-slate-400">Tx/Man</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-medium">{kpiSummary.optimalCount} optimal</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-700 font-medium">{kpiSummary.idleCount} idle</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-600 font-medium">{kpiSummary.lowCount} rendah</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEGMENTED SUB-TABS & STREAMLINED FILTER TOOLBAR (Minimalist & Premium) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-2.5 sm:p-3 space-y-2.5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
          {/* Sub-Tabs: iOS/macOS System Segmented Control */}
          <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 shadow-2xs overflow-x-auto scrollbar-none max-w-full shrink-0">
            {[
              { id: 'matrix', label: 'Matriks Harian', icon: Table2 },
              { id: 'daily_trend', label: 'Tren Harian', icon: TrendingUp },
              { id: 'detail_table', label: 'Detail & Anomali', count: filteredDetailRows.length, icon: BarChart3 },
              { id: 'hourly_pivot', label: 'Scan Per Jam', icon: Clock },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeSubTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveSubTab(t.id as SubTab)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0',
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-emerald-700' : 'text-slate-400')} />
                  <span>{t.label}</span>
                  {t.count !== undefined && (
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums',
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 font-bold'
                          : 'bg-slate-200/80 text-slate-600'
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Date Selector & Pop-up Filter Trigger Button */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {/* Quick Date Selector Dropdown langsung di toolbar */}
            <div className="relative">
              <select
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-2xs pr-7 transition-colors"
                title="Pilih tanggal analisa produktivitas"
              >
                <option value="ALL">Semua Tanggal ({availableDates.length} Hari)</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {fmtDateShort(d)}
                  </option>
                ))}
                {!availableDates.includes(selectedDate) && selectedDate !== 'ALL' && (
                  <option value={selectedDate}>
                    {fmtDateShort(selectedDate)} (0 Transaksi)
                  </option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer shadow-2xs active:scale-95',
                activeFilterCount > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:text-slate-900'
              )}
            >
              <SlidersHorizontal className={cn('w-3.5 h-3.5', activeFilterCount > 0 ? 'text-emerald-700' : 'text-slate-500')} />
              <span className="hidden sm:inline">Filter Detail</span>
              <span className="sm:hidden">Filter</span>
              {activeFilterCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-700 text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                title="Reset filter ke default"
                className="p-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ALERT BANNER: JIKA TANGGAL TERPILIH TIDAK MEMILIKI TRANSAKSI MB51 */}
      {!isAvailableDate && selectedDate !== 'ALL' && (
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-3 sm:p-3.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-amber-950">
                Tidak ada catatan transaksi MB51 untuk tanggal <strong>{fmtDateShort(selectedDate)}</strong> (Tonase: 0 Kg).
              </p>
              <p className="text-[11px] text-amber-800/80 mt-0.5">
                Data MB51 tersedia untuk: {availableDates.slice(-5).map(fmtDateShort).join(', ')}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {availableDates.slice(-3).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDateSelect(d)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 hover:border-amber-400 transition-colors shadow-2xs cursor-pointer"
              >
                {fmtDateShort(d)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleDateSelect('ALL')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-800 text-white hover:bg-amber-900 transition-colors shadow-2xs cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: MATRIKS PRODUKTIVITAS HARIAN */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          <TableCardContainer
            isFullscreen={fullscreenTable === 'matrix'}
            onCloseFullscreen={() => setFullscreenTable(null)}
          >
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Matriks Produktivitas Gudang
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-emerald-100/80 text-emerald-800">
                    {selectedDate === 'ALL' ? `Akumulasi ${matrixData.numDays} Hari` : fmtDateShort(selectedDate)}
                  </span>
                  {filterGudang !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setFilterGudang('ALL')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
                      title="Klik untuk menghapus sorotan"
                    >
                      <span>Sorot: {filterGudang}</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Posting Date SAP · Shift 1, Shift 2 & Shift 3
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Optimal (&ge; {fmtKg(headcount.thresholds.lowKgPerMan)} Kg)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Rendah (&lt; {fmtKg(headcount.thresholds.lowKgPerMan)} Kg)
                </span>
                <FullscreenToggleBtn
                  isFullscreen={fullscreenTable === 'matrix'}
                  onToggle={() => setFullscreenTable(fullscreenTable === 'matrix' ? null : 'matrix')}
                />
              </div>
            </div>

            <div className={cn('overflow-auto', fullscreenTable === 'matrix' ? 'flex-1' : '')}>
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-50 shadow-2xs">
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                    <th className="py-2.5 px-3 text-left font-semibold sticky left-0 top-0 bg-slate-50 z-30 min-w-[100px] sm:min-w-[130px] border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.03)] text-slate-700">
                      Metrik / Shift
                    </th>
                    {WAREHOUSE_LIST.map((gd) => (
                      <th
                        key={gd}
                        onClick={() => setFilterGudang(filterGudang === gd ? 'ALL' : gd)}
                        className={cn(
                          'py-2.5 px-2 text-right font-semibold min-w-[72px] sm:min-w-[80px] cursor-pointer hover:bg-slate-100 transition-colors',
                          filterGudang === gd && 'bg-emerald-50 text-emerald-800 font-bold ring-1 ring-inset ring-emerald-200'
                        )}
                        title={`Klik untuk memfilter ${gd}`}
                      >
                        {gd}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right font-bold bg-slate-100/90 text-slate-800 min-w-[90px] sm:min-w-[110px] border-l border-slate-200">
                      Total / Avg
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* SECTION 1: MAN POWER */}
                  <tr className="bg-slate-100/80 border-y border-slate-200/80">
                    <td
                      colSpan={WAREHOUSE_LIST.length + 2}
                      className="py-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-700 sticky left-0 z-10"
                    >
                      1. Alokasi Tenaga Kerja (Man Power)
                    </td>
                  </tr>
                  {SHIFTS.map((sh) => {
                    const rowSum = WAREHOUSE_LIST.reduce(
                      (acc, gd) => acc + (matrixData.perGudang[gd].man[sh] || 0),
                      0
                    );
                    return (
                      <tr key={`man-${sh}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 text-slate-700 font-medium sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.03)] whitespace-nowrap">
                          {sh}
                        </td>
                        {WAREHOUSE_LIST.map((gd) => {
                          const m = matrixData.perGudang[gd].man[sh];
                          return (
                            <td
                              key={gd}
                              className={cn(
                                'py-2 px-2 text-right font-mono tabular-nums text-slate-600',
                                filterGudang === gd && 'bg-emerald-50/40 font-medium text-slate-900'
                              )}
                            >
                              {m ?? <span className="text-slate-300">-</span>}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-700 bg-slate-50/60 border-l border-slate-200">
                          {rowSum}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-slate-50 font-semibold text-slate-800 border-b border-slate-200">
                    <td className="py-2 px-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.03)]">
                      Total Man Power
                    </td>
                    {WAREHOUSE_LIST.map((gd) => (
                      <td
                        key={gd}
                        className={cn(
                          'py-2 px-2 text-right font-mono tabular-nums',
                          filterGudang === gd && 'bg-emerald-50/60 font-bold text-slate-900'
                        )}
                      >
                        {matrixData.perGudang[gd].totalMan || <span className="text-slate-300">-</span>}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-100/80 border-l border-slate-200">
                      {WAREHOUSE_LIST.reduce((acc, gd) => acc + matrixData.perGudang[gd].totalMan, 0)} Org
                    </td>
                  </tr>

                  {/* SECTION 2: TONASE HANDLING (KG) */}
                  <tr className="bg-sky-50/70 border-y border-sky-100">
                    <td
                      colSpan={WAREHOUSE_LIST.length + 2}
                      className="py-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-sky-900 sticky left-0 z-10"
                    >
                      2. Beban Tonase Handling (Kg)
                    </td>
                  </tr>
                  {SHIFTS.map((sh) => {
                    const sumKg = WAREHOUSE_LIST.reduce(
                      (acc, gd) => acc + matrixData.perGudang[gd].shifts[sh].kg,
                      0
                    );
                    return (
                      <tr key={`ton-${sh}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 text-slate-700 font-medium sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.03)] whitespace-nowrap">
                          {sh}
                        </td>
                        {WAREHOUSE_LIST.map((gd) => {
                          const kg = matrixData.perGudang[gd].shifts[sh].kg;
                          return (
                            <td
                              key={gd}
                              className={cn(
                                'py-2 px-2 text-right font-mono tabular-nums text-slate-700',
                                filterGudang === gd && 'bg-emerald-50/40 font-medium text-slate-900'
                              )}
                            >
                              {kg > 0 ? fmtKg(kg, 0) : <span className="text-slate-300">-</span>}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-800 bg-slate-50/60 border-l border-slate-200">
                          {fmtKg(sumKg, 0)}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-sky-50/50 font-bold text-sky-950 border-b border-slate-200">
                    <td className="py-2 px-3 sticky left-0 bg-sky-50/90 z-10 border-r border-sky-200 shadow-[1px_0_3px_rgba(0,0,0,0.03)]">
                      Total Tonase
                    </td>
                    {WAREHOUSE_LIST.map((gd) => {
                      const totalGdKg = matrixData.perGudang[gd].handlingAllKg;
                      return (
                        <td
                          key={gd}
                          className={cn(
                            'py-2 px-2 text-right font-mono tabular-nums',
                            filterGudang === gd && 'bg-emerald-100/60 text-emerald-950 font-bold'
                          )}
                        >
                          {totalGdKg > 0 ? fmtKg(totalGdKg, 0) : <span className="text-slate-300">-</span>}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right font-mono tabular-nums bg-sky-100/80 text-sky-950 border-l border-sky-200">
                      {fmtKg(
                        WAREHOUSE_LIST.reduce((acc, gd) => acc + matrixData.perGudang[gd].handlingAllKg, 0),
                        0
                      )}
                    </td>
                  </tr>

                  {/* SECTION 3: PRODUKTIVITAS (KG/MAN) */}
                  <tr className="bg-emerald-50/80 border-y border-emerald-100">
                    <td
                      colSpan={WAREHOUSE_LIST.length + 2}
                      className="py-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-emerald-950 sticky left-0 z-10"
                    >
                      3. Produktivitas Tenaga Kerja (Kg / Man)
                    </td>
                  </tr>
                  {SHIFTS.map((sh) => {
                    const sumCoveredKg = WAREHOUSE_LIST.reduce(
                      (acc, gd) =>
                        acc + (matrixData.perGudang[gd].man[sh] ? matrixData.perGudang[gd].shifts[sh].kg : 0),
                      0
                    );
                    const sumMan = WAREHOUSE_LIST.reduce(
                      (acc, gd) => acc + (matrixData.perGudang[gd].man[sh] || 0) * matrixData.numDays,
                      0
                    );
                    const avgShiftKgMan = sumMan > 0 ? sumCoveredKg / sumMan : null;

                    return (
                      <tr key={`prod-${sh}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[1px_0_3px_rgba(0,0,0,0.03)] whitespace-nowrap">
                          {sh}
                        </td>
                        {WAREHOUSE_LIST.map((gd) => {
                          const km = matrixData.perGudang[gd].shifts[sh].kgPerMan;
                          const isLow = km !== null && km > 0 && km < headcount.thresholds.lowKgPerMan;
                          return (
                            <td
                              key={gd}
                              className={cn(
                                'py-2 px-2 text-right font-mono tabular-nums font-semibold',
                                km === null
                                  ? 'text-slate-300 font-normal'
                                  : isLow
                                  ? 'text-rose-700 bg-rose-50/70'
                                  : 'text-emerald-700 bg-emerald-50/40',
                                filterGudang === gd && 'ring-1 ring-inset ring-emerald-300'
                              )}
                            >
                              {km !== null ? fmtKg(km, 0) : '-'}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-50/90 border-l border-slate-200">
                          {avgShiftKgMan !== null ? fmtKg(avgShiftKgMan, 0) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TableCardContainer>

          {/* Side-by-Side Charts: Kg/Man & Total Tonase */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Produktivitas Output (Kg / Man)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rata-rata tonase per orang ({selectedDate === 'ALL' ? 'Akumulasi Periode' : fmtDateShort(selectedDate)})
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />Shift 1</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-600" />Shift 2</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-600" />Shift 3</span>
                </div>
              </div>
              <div className="p-4 h-64">
                <Bar
                  data={kgPerManChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: tooltipStyleStrong,
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, weight: 600 }, color: '#475569' },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        border: { display: false },
                        ticks: {
                          font: { size: 10 },
                          color: '#94a3b8',
                          callback: (v) => {
                            const n = Number(v);
                            return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Distribusi Beban Tonase Handling (Kg)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Akumulasi penerimaan &amp; pengeluaran material per shift
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />Shift 1</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-600" />Shift 2</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-600" />Shift 3</span>
                </div>
              </div>
              <div className="p-4 h-64">
                <Bar
                  data={tonaseChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: tooltipStyleStrong,
                    },
                    scales: {
                      x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 10, weight: 600 }, color: '#475569' },
                      },
                      y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        border: { display: false },
                        ticks: {
                          font: { size: 10 },
                          color: '#94a3b8',
                          callback: (v) => {
                            const n = Number(v);
                            return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REKAP & TREN HARIAN */}
      {activeSubTab === 'daily_trend' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            {/* Header Toolbar */}
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  Tren Performa Harian ({fmtDateShort(availableDates[0])} – {fmtDateShort(availableDates[availableDates.length - 1])})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Perbandingan fluktuasi tonase dan transaksi antar shift (Shift 1, 2, 3)
                </p>
              </div>

              {/* Segmented Controls for Metric and Chart Mode */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Metric Selector: Tonase vs Tx */}
                <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 shadow-2xs text-xs">
                  <button
                    type="button"
                    onClick={() => setTrendMetric('kg')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                      trendMetric === 'kg'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Tonase
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMetric('tx')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                      trendMetric === 'tx'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Scan Tx
                  </button>
                </div>

                {/* Chart Style: Spline Area vs Stacked Bar */}
                <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 shadow-2xs text-xs">
                  <button
                    type="button"
                    onClick={() => setTrendChartType('area')}
                    title="Tampilan Area Garis Halus"
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                      trendChartType === 'area'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Area</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendChartType('bar')}
                    title="Tampilan Bar Bertumpuk"
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                      trendChartType === 'bar'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Bar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Shift Indicator Pills */}
            <div className="px-4 py-2 bg-slate-50/40 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleShifts((p) => ({ ...p, 'Shift 1': !p['Shift 1'] }))
                  }
                  title="Klik untuk menyembunyikan / menampilkan Shift 1"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none',
                    visibleShifts['Shift 1']
                      ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200 shadow-2xs'
                      : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      visibleShifts['Shift 1'] ? 'bg-emerald-600' : 'bg-slate-300'
                    )}
                  />
                  <span>Shift 1</span>
                  <span className="font-mono font-bold ml-0.5">
                    {trendMetric === 'kg' ? fmtTon(shiftTotals.s1Kg) : `${shiftTotals.s1Tx.toLocaleString('id-ID')} Tx`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setVisibleShifts((p) => ({ ...p, 'Shift 2': !p['Shift 2'] }))
                  }
                  title="Klik untuk menyembunyikan / menampilkan Shift 2"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none',
                    visibleShifts['Shift 2']
                      ? 'bg-sky-50/90 text-sky-900 border-sky-200 shadow-2xs'
                      : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      visibleShifts['Shift 2'] ? 'bg-sky-600' : 'bg-slate-300'
                    )}
                  />
                  <span>Shift 2</span>
                  <span className="font-mono font-bold ml-0.5">
                    {trendMetric === 'kg' ? fmtTon(shiftTotals.s2Kg) : `${shiftTotals.s2Tx.toLocaleString('id-ID')} Tx`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setVisibleShifts((p) => ({ ...p, 'Shift 3': !p['Shift 3'] }))
                  }
                  title="Klik untuk menyembunyikan / menampilkan Shift 3"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none',
                    visibleShifts['Shift 3']
                      ? 'bg-amber-50/90 text-amber-900 border-amber-200 shadow-2xs'
                      : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60'
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      visibleShifts['Shift 3'] ? 'bg-amber-600' : 'bg-slate-300'
                    )}
                  />
                  <span>Shift 3</span>
                  <span className="font-mono font-bold ml-0.5">
                    {trendMetric === 'kg' ? fmtTon(shiftTotals.s3Kg) : `${shiftTotals.s3Tx.toLocaleString('id-ID')} Tx`}
                  </span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-slate-500 font-medium">
                Akumulasi: <span className="font-bold text-slate-800">{trendMetric === 'kg' ? fmtTon(shiftTotals.totalKg) : `${shiftTotals.totalTx.toLocaleString('id-ID')} Tx`}</span>
              </div>
            </div>

            {/* Modern Canvas Area */}
            <div className="p-3 sm:p-4 h-72 sm:h-80 relative">
              {trendChartType === 'area' ? (
                <Line data={dailyTrendChartData} options={trendChartOptions} />
              ) : (
                <Bar data={dailyTrendChartData} options={trendChartOptions} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TableCardContainer
              isFullscreen={fullscreenTable === 'daily_tonase'}
              onCloseFullscreen={() => setFullscreenTable(null)}
            >
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2.5 shrink-0">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Rekap Tonase Harian (Kg)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Total pergerakan material IN + OUT</p>
                </div>
                <FullscreenToggleBtn
                  isFullscreen={fullscreenTable === 'daily_tonase'}
                  onToggle={() => setFullscreenTable(fullscreenTable === 'daily_tonase' ? null : 'daily_tonase')}
                />
              </div>
              <div className={cn('overflow-auto', fullscreenTable === 'daily_tonase' ? 'flex-1' : '')}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3.5 text-left font-semibold">Tanggal</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Shift 1</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Shift 2</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Shift 3</th>
                      <th className="py-2.5 px-3.5 text-right font-bold bg-slate-100/80 text-slate-800">Total (Kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyRecapRows.map((r) => (
                      <tr
                        key={r.tanggal}
                        onClick={() => {
                          handleDateSelect(r.tanggal);
                          setActiveSubTab('matrix');
                        }}
                        className={cn(
                          'cursor-pointer hover:bg-slate-50 transition-colors',
                          selectedDate === r.tanggal && 'bg-emerald-50/60 font-semibold'
                        )}
                      >
                        <td className="py-2 px-3.5 font-medium text-slate-800">{fmtDateShort(r.tanggal)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">{fmtKg(r.s1Kg, 0)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">{fmtKg(r.s2Kg, 0)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">{fmtKg(r.s3Kg, 0)}</td>
                        <td className="py-2 px-3.5 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-50/60">
                          {fmtKg(r.totalKg, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableCardContainer>

            <TableCardContainer
              isFullscreen={fullscreenTable === 'daily_prod'}
              onCloseFullscreen={() => setFullscreenTable(null)}
            >
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2.5 shrink-0">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Rata-rata Produktivitas (Kg / Man)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Rasio tonase per tenaga kerja aktif</p>
                </div>
                <FullscreenToggleBtn
                  isFullscreen={fullscreenTable === 'daily_prod'}
                  onToggle={() => setFullscreenTable(fullscreenTable === 'daily_prod' ? null : 'daily_prod')}
                />
              </div>
              <div className={cn('overflow-auto', fullscreenTable === 'daily_prod' ? 'flex-1' : '')}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3.5 text-left font-semibold">Tanggal</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Shift 1</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Shift 2</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Shift 3</th>
                      <th className="py-2.5 px-3.5 text-right font-bold bg-slate-100/80 text-slate-800">Avg Harian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyRecapRows.map((r) => (
                      <tr
                        key={r.tanggal}
                        onClick={() => {
                          handleDateSelect(r.tanggal);
                          setActiveSubTab('matrix');
                        }}
                        className={cn(
                          'cursor-pointer hover:bg-slate-50 transition-colors',
                          selectedDate === r.tanggal && 'bg-emerald-50/60 font-semibold'
                        )}
                      >
                        <td className="py-2 px-3.5 font-medium text-slate-800">{fmtDateShort(r.tanggal)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                          {r.s1KgMan !== null ? fmtKg(r.s1KgMan, 0) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                          {r.s2KgMan !== null ? fmtKg(r.s2KgMan, 0) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                          {r.s3KgMan !== null ? fmtKg(r.s3KgMan, 0) : '-'}
                        </td>
                        <td className="py-2 px-3.5 text-right font-mono tabular-nums font-bold text-emerald-700 bg-slate-50/60">
                          {r.avgKgMan !== null ? fmtKg(r.avgKgMan, 0) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableCardContainer>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TABEL DETAIL PRODUKTIVITAS & ANOMALI */}
      {activeSubTab === 'detail_table' && (
        <TableCardContainer
          isFullscreen={fullscreenTable === 'detail_table'}
          onCloseFullscreen={() => setFullscreenTable(null)}
        >
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap shrink-0">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Detail Transaksi &amp; Deteksi Anomali
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rincian log harian per gudang, shift, dan rasio beban per tenaga kerja
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="text-xs text-slate-500 font-mono">
                Total: <strong className="text-slate-800 font-bold">{sortedDetailRows.length}</strong> baris
              </div>
              <FullscreenToggleBtn
                isFullscreen={fullscreenTable === 'detail_table'}
                onToggle={() => setFullscreenTable(fullscreenTable === 'detail_table' ? null : 'detail_table')}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50/40 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'Semua Status' },
                { id: 'OPTIMAL', label: 'Optimal' },
                { id: 'IDLE', label: `Idle (<${headcount.thresholds.idleTxPerMan} Tx/Man)` },
                { id: 'LOW', label: `Rendah (<${fmtKg(headcount.thresholds.lowKgPerMan)} Kg/Man)` },
                { id: 'HEAVY', label: `Unit Berat (>${fmtKg(headcount.thresholds.heavyKgPerTx)} Kg/Tx)` },
                { id: 'NO_MAN', label: 'Man Kosong' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setFilterStatus(st.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer',
                    filterStatus === st.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari gudang, shift, catatan..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className={cn('overflow-auto', fullscreenTable === 'detail_table' ? 'flex-1 max-h-none' : 'max-h-[560px]')}>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 border-b border-slate-200 text-[11px] shadow-2xs">
                <tr>
                  {[
                    { key: 'tanggal', label: 'Tanggal', align: 'left' },
                    { key: 'shift', label: 'Shift', align: 'left' },
                    { key: 'gudang', label: 'Gudang', align: 'left' },
                    { key: 'inKg', label: 'IN (Kg)', align: 'right' },
                    { key: 'outKg', label: 'OUT (Kg)', align: 'right' },
                    { key: 'totalKg', label: 'Total (Kg)', align: 'right' },
                    { key: 'tx', label: 'Tx', align: 'right' },
                    { key: 'kgPerTx', label: 'Kg/Tx', align: 'right' },
                    { key: 'man', label: 'Man', align: 'right' },
                    { key: 'kgPerMan', label: 'Kg/Man', align: 'right' },
                    { key: 'txPerMan', label: 'Tx/Man', align: 'right' },
                    { key: 'catatan', label: 'Status', align: 'left' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        'py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-slate-100 transition-colors whitespace-nowrap',
                        col.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortCol === col.key ? (
                          sortAsc ? (
                            <ArrowUp className="w-3 h-3 text-emerald-700" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-emerald-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDetailRows.map((r, i) => (
                  <tr key={`${r.tanggal}-${r.shift}-${r.gudang}-${i}`} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{fmtDateShort(r.tanggal)}</td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{r.shift}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">{r.gudang}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-500">{fmtKg(r.inKg, 0)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-500">{fmtKg(r.outKg, 0)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-800">
                      {fmtKg(r.totalKg, 0)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">{fmtKg(r.tx)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">{fmtKg(r.kgPerTx)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                      {r.man ?? <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {r.kgPerMan !== null ? fmtKg(r.kgPerMan) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                      {r.txPerMan !== null ? r.txPerMan.toFixed(1) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {r.flags.length === 0 ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            Optimal
                          </span>
                        ) : (
                          r.flags.map((fl) => {
                            const isLow = fl === 'sedikit kerja';
                            const isIdle = fl === 'overstaff/idle';
                            const isHeavy = fl === 'barang per-unit berat';
                            return (
                              <span
                                key={fl}
                                className={cn(
                                  'px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                                  isLow
                                    ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                                    : isIdle
                                    ? 'bg-amber-50 text-amber-800 border-amber-200/70'
                                    : isHeavy
                                    ? 'bg-sky-50 text-sky-800 border-sky-200/70'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                )}
                              >
                                {fl}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedDetailRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      Tidak ada baris yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TableCardContainer>
      )}

      {/* SUB-TAB 4: FREKUENSI SCAN PER JAM (PIVOT2) */}
      {activeSubTab === 'hourly_pivot' && (
        <TableCardContainer
          isFullscreen={fullscreenTable === 'hourly_pivot'}
          onCloseFullscreen={() => setFullscreenTable(null)}
        >
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap shrink-0">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Frekuensi Scan Transaksi per Jam
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Distribusi intensitas transaksi per jam operasional (00:00 – 23:59) per gudang
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />&ge; 20 Tx</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />&ge; 50 Tx (Padat)</span>
              <FullscreenToggleBtn
                isFullscreen={fullscreenTable === 'hourly_pivot'}
                onToggle={() => setFullscreenTable(fullscreenTable === 'hourly_pivot' ? null : 'hourly_pivot')}
              />
            </div>
          </div>

          <div className={cn('overflow-auto', fullscreenTable === 'hourly_pivot' ? 'flex-1' : '')}>
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3 text-left font-semibold">Shift</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Rentang Jam</th>
                  {WAREHOUSE_LIST.map((gd) => (
                    <th key={gd} className="py-2.5 px-2 text-right font-semibold">
                      {gd}
                    </th>
                  ))}
                  <th className="py-2.5 px-3.5 text-right font-bold bg-slate-100/90 text-slate-800 border-l border-slate-200/80">
                    Total Tx
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SHIFTS.filter((sh) => filterShift === 'ALL' || filterShift === sh).map((sh) =>
                  SHIFT_HOURS[sh].map((hr, idx) => {
                    const rowTotal = WAREHOUSE_LIST.reduce(
                      (acc, gd) => acc + (hourlyPivotData[hr]?.[gd] || 0),
                      0
                    );
                    const nextHr = (hr + 1) % 24;
                    return (
                      <tr key={`${sh}-${hr}`} className="hover:bg-slate-50/80">
                        {idx === 0 && (
                          <td
                            rowSpan={SHIFT_HOURS[sh].length}
                            className="py-2 px-3 font-bold text-slate-800 bg-slate-50/70 border-r border-slate-200/70 align-top whitespace-nowrap"
                          >
                            <div>{sh}</div>
                            <div className="text-[10px] font-mono font-normal text-slate-400 mt-0.5">
                              {SHIFT_TIME_LABELS[sh]}
                            </div>
                          </td>
                        )}
                        <td className="py-1.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {String(hr).padStart(2, '0')}:00–{String(nextHr).padStart(2, '0')}:00
                        </td>
                        {WAREHOUSE_LIST.map((gd) => {
                          const v = hourlyPivotData[hr]?.[gd] || 0;
                          return (
                            <td
                              key={gd}
                              className={cn(
                                'py-1.5 px-2 text-right font-mono tabular-nums',
                                v === 0
                                  ? 'text-slate-300'
                                  : v >= 50
                                  ? 'bg-emerald-50/90 text-emerald-800 font-bold'
                                  : v >= 20
                                  ? 'bg-emerald-50/40 text-slate-800 font-medium'
                                  : 'text-slate-600'
                              )}
                            >
                              {v > 0 ? v.toLocaleString('id-ID') : '-'}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-3.5 text-right font-mono tabular-nums font-bold text-slate-800 bg-slate-50/60 border-l border-slate-200/60">
                          {rowTotal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TableCardContainer>
      )}

      {/* MODAL 1: ATUR MASTER HEADCOUNT (MAN POWER) */}
      {showHeadcountModal && draftHeadcount && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold">
                  Konfigurasi Master Headcount (Man Power) & Ambang Anomali
                </h3>
                <p className="text-[11px] text-emerald-200">
                  Sesuaikan jumlah operator/helper per gudang & shift. Kosongkan jika gudang tidak memiliki alokasi man power.
                </p>
              </div>
              <button
                onClick={() => setShowHeadcountModal(false)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. Default Man Power per Gudang (Gd.01 – Gd.14)
                  </h4>
                  <button
                    onClick={handleResetHeadcount}
                    disabled={savingHeadcount}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset ke Standar Excel
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <th className="py-2 px-3 text-left font-bold">Shift</th>
                        {WAREHOUSE_LIST.map((gd) => (
                          <th key={gd} className="py-2 px-2 text-center font-bold">
                            {gd}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {SHIFTS.map((sh) => (
                        <tr key={sh}>
                          <td className="py-2 px-3 font-bold text-slate-800 bg-slate-50 whitespace-nowrap">
                            {sh}
                          </td>
                          {WAREHOUSE_LIST.map((gd) => {
                            const val = draftHeadcount.defaultManpower[gd]?.[sh];
                            return (
                              <td key={gd} className="p-1.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={50}
                                  value={val === null || val === undefined ? '' : val}
                                  placeholder="-"
                                  onChange={(e) => {
                                    const raw = e.target.value.trim();
                                    const num = raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0);
                                    setDraftHeadcount((prev) => {
                                      if (!prev) return prev;
                                      return {
                                        ...prev,
                                        defaultManpower: {
                                          ...prev.defaultManpower,
                                          [gd]: {
                                            ...prev.defaultManpower[gd],
                                            [sh]: num && num > 0 ? num : null,
                                          },
                                        },
                                      };
                                    });
                                  }}
                                  className="w-12 text-center py-1 px-1 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:border-emerald-600"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  2. Override Headcount Tanggal Tertentu (Opsional — Lembur / Absen)
                </h4>
                <div className="flex flex-wrap items-end gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={newOverrideDate}
                      onChange={(e) => setNewOverrideDate(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Gudang</label>
                    <select
                      value={newOverrideGudang}
                      onChange={(e) => setNewOverrideGudang(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      {WAREHOUSE_LIST.map((gd) => (
                        <option key={gd} value={gd}>
                          {gd}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Shift</label>
                    <select
                      value={newOverrideShift}
                      onChange={(e) => setNewOverrideShift(e.target.value as ShiftName)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      {SHIFTS.map((sh) => (
                        <option key={sh} value={sh}>
                          {sh}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Jumlah Man</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={newOverrideMan}
                      onChange={(e) => setNewOverrideMan(e.target.value)}
                      className="w-20 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newOverrideDate) return;
                      const manVal = parseInt(newOverrideMan, 10);
                      setDraftHeadcount((prev) => {
                        if (!prev) return prev;
                        const filtered = prev.dateOverrides.filter(
                          (o) =>
                            !(
                              o.tanggal === newOverrideDate &&
                              o.gudang === newOverrideGudang &&
                              o.shift === newOverrideShift
                            )
                        );
                        return {
                          ...prev,
                          dateOverrides: [
                            ...filtered,
                            {
                              tanggal: newOverrideDate,
                              gudang: newOverrideGudang,
                              shift: newOverrideShift,
                              man: Number.isNaN(manVal) || manVal <= 0 ? null : manVal,
                            },
                          ],
                        };
                      });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Override
                  </button>
                </div>

                {draftHeadcount.dateOverrides.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draftHeadcount.dateOverrides.map((ov, idx) => (
                      <div
                        key={`${ov.tanggal}-${ov.gudang}-${ov.shift}-${idx}`}
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold"
                      >
                        <span>
                          {ov.tanggal} · {ov.gudang} · {ov.shift}: <strong>{ov.man ?? 'Kosong'} Orang</strong>
                        </span>
                        <button
                          onClick={() =>
                            setDraftHeadcount((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    dateOverrides: prev.dateOverrides.filter((_, i) => i !== idx),
                                  }
                                : prev
                            )
                          }
                          className="text-emerald-600 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  3. Parameter Ambang Batas Anomali (Sesuai analisa.py)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Batas &ldquo;Sedikit Kerja&rdquo; (Kg/Man &lt;)
                    </label>
                    <input
                      type="number"
                      value={draftHeadcount.thresholds.lowKgPerMan}
                      onChange={(e) =>
                        setDraftHeadcount((prev) =>
                          prev
                            ? {
                                ...prev,
                                thresholds: {
                                  ...prev.thresholds,
                                  lowKgPerMan: parseInt(e.target.value, 10) || 0,
                                },
                              }
                            : prev
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Batas &ldquo;Overstaff / Idle&rdquo; (Tx/Man &lt;)
                    </label>
                    <input
                      type="number"
                      value={draftHeadcount.thresholds.idleTxPerMan}
                      onChange={(e) =>
                        setDraftHeadcount((prev) =>
                          prev
                            ? {
                                ...prev,
                                thresholds: {
                                  ...prev.thresholds,
                                  idleTxPerMan: parseInt(e.target.value, 10) || 0,
                                },
                              }
                            : prev
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Batas &ldquo;Barang Per-Unit Berat&rdquo; (Kg/Tx &gt;)
                    </label>
                    <input
                      type="number"
                      value={draftHeadcount.thresholds.heavyKgPerTx}
                      onChange={(e) =>
                        setDraftHeadcount((prev) =>
                          prev
                            ? {
                                ...prev,
                                thresholds: {
                                  ...prev.thresholds,
                                  heavyKgPerTx: parseInt(e.target.value, 10) || 0,
                                },
                              }
                            : prev
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowHeadcountModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSaveHeadcount}
                disabled={savingHeadcount}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingHeadcount ? 'Menyimpan...' : 'Simpan Konfigurasi Headcount'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD FILE SAP MB51 */}
      {showUploadModal && renderUploadModal()}

      {/* MODAL 3: FILTER & PARAMETER PRODUKTIVITAS (Pop-up Ringkas & Terstruktur) */}
      {showFilterModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowFilterModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-emerald-100/80 text-emerald-700 border border-emerald-200/60 shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Filter &amp; Parameter Analisa</span>
                    {activeFilterCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-700 text-white">
                        {activeFilterCount} Aktif
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atur cakupan tanggal, shift, gudang, dan formula kalkulasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Tutup modal filter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Section 1: Cakupan Data Operasional */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                  1. Cakupan Data Operasional
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Tanggal */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tanggal</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDate}
                        onChange={(e) => handleDateSelect(e.target.value)}
                        className="w-full text-xs font-medium text-slate-800 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl px-2.5 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-2xs pr-7 transition-colors"
                      >
                        <option value="ALL">Semua ({availableDates.length} Hari)</option>
                        {availableDates.map((d) => (
                          <option key={d} value={d}>
                            {fmtDateShort(d)}
                          </option>
                        ))}
                        {!availableDates.includes(selectedDate) && selectedDate !== 'ALL' && (
                          <option value={selectedDate}>
                            {fmtDateShort(selectedDate)} (0 Transaksi)
                          </option>
                        )}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Gudang */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Gudang</span>
                    </label>
                    <div className="relative">
                      <select
                        value={filterGudang}
                        onChange={(e) => setFilterGudang(e.target.value)}
                        className="w-full text-xs font-medium text-slate-800 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl px-2.5 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-2xs pr-7 transition-colors"
                      >
                        <option value="ALL">Semua Gudang</option>
                        {WAREHOUSE_LIST.map((gd) => (
                          <option key={gd} value={gd}>
                            {gd}
                          </option>
                        ))}
                        <option value="x Sloc Lama">x Sloc Lama</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Shift */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Shift</span>
                    </label>
                    <div className="relative">
                      <select
                        value={filterShift}
                        onChange={(e) => setFilterShift(e.target.value)}
                        className="w-full text-xs font-medium text-slate-800 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl px-2.5 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-2xs pr-7 transition-colors"
                      >
                        <option value="ALL">Semua Shift</option>
                        <option value="Shift 1">Shift 1 (07–15)</option>
                        <option value="Shift 2">Shift 2 (15–23)</option>
                        <option value="Shift 3">Shift 3 (23–07)</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Mode Formula Perhitungan */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                  2. Mode Formula &amp; Lingkup Device
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalcMode('handheld_clean')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer',
                      calcMode === 'handheld_clean'
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/80 shadow-xs'
                        : 'bg-slate-50/70 hover:bg-white border-slate-200/80 text-slate-700'
                    )}
                  >
                    <span className="text-xs font-bold text-slate-900 block">SOP Handheld</span>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Hanya user scanner barcode lapangan (bersih).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalcMode('all_devices_clean')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer',
                      calcMode === 'all_devices_clean'
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/80 shadow-xs'
                        : 'bg-slate-50/70 hover:bg-white border-slate-200/80 text-slate-700'
                    )}
                  >
                    <span className="text-xs font-bold text-slate-900 block">Semua Device</span>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Scanner handheld + posting desktop SAP.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalcMode('raw_abs')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer',
                      calcMode === 'raw_abs'
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/80 shadow-xs'
                        : 'bg-slate-50/70 hover:bg-white border-slate-200/80 text-slate-700'
                    )}
                  >
                    <span className="text-xs font-bold text-slate-900 block">Raw MB51</span>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Semua baris MB51 tanpa filter SOP.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 shrink-0">
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Filter dalam kondisi default</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors cursor-pointer"
                >
                  Terapkan &amp; Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
