'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Calendar,
  Layers,
  GitFork,
  Users,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  ChevronDown,
  Info,
  Maximize2,
  Minimize2,
  Award,
  Zap,
  BarChart3,
  Table2,
  Check,
  Search,
  Package,
  Boxes,
  PackageCheck,
  AlertCircle,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import {
  WeeklyPeriod,
  WeeklyReportData,
} from '@/lib/weeklyAnalytics';
import { exportWeeklyAnalyticsToExcel } from '@/lib/exportWeeklyExcel';
import { cn, formatTon, formatQty, formatPercent } from '@/lib/utils';
import { tooltipStyleStrong } from '@/lib/chartTheme';
import {
  WarehousePipeCapacity,
  FastSlowPipe,
  CoilStripArea,
  PipeNCWarehouse,
  PipeNCItem,
  NCProgressTransaction,
  LooComparisonItem,
  UnfifoPipeItem,
  UnfifoCoilItem,
  DamagedPackagingItem,
  IncomingPackagingItem,
  WarehouseCapacityConfig,
} from '@/types/warehouse';
import { MB51Dataset } from '@/types/productivity';
import { getStandarBuffer, getPackagingBufferStatus } from '@/lib/packagingMaster';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export interface WeeklyAnalyticsViewProps {
  onOpenUploadModal?: () => void;
  pipeCapacities?: WarehousePipeCapacity[];
  fastSlowData?: FastSlowPipe[];
  coilStripData?: CoilStripArea[];
  ncWarehouseData?: PipeNCWarehouse[];
  ncItems?: PipeNCItem[];
  ncProgressData?: NCProgressTransaction[];
  looSTData?: LooComparisonItem[];
  looLTData?: LooComparisonItem[];
  unfifoPipeData?: UnfifoPipeItem[];
  unfifoCoilData?: UnfifoCoilItem[];
  damagedPackagingData?: DamagedPackagingItem[];
  incomingPackagingData?: IncomingPackagingItem[];
  productivityData?: MB51Dataset;
  capacityConfig?: WarehouseCapacityConfig;
  packagingBufferConfig?: Record<string, number>;
  activeWeeklySubTab?: string;
  onWeeklySubTabChange?: (tab: WeeklySubTab) => void;
}

export type WeeklySubTab =
  | 'overview'
  | 'capacity'
  | 'fastslow'
  | 'coilstrip'
  | 'nc_stock'
  | 'nc_progress'
  | 'loo'
  | 'unfifo'
  | 'packaging'
  | 'productivity';

export function normalizeWeeklySubTab(tab?: string): WeeklySubTab {
  if (!tab) return 'overview';
  const t = tab.toLowerCase();
  if (t === 'capacity' || t === 'pipe') return 'capacity';
  if (t === 'fastslow' || t === 'fast_slow') return 'fastslow';
  if (t === 'coilstrip' || t === 'coil') return 'coilstrip';
  if (t === 'nc' || t === 'nc_stock' || t === 'ncquality') return 'nc_stock';
  if (t === 'nc_progress' || t === 'progress_nc') return 'nc_progress';
  if (t === 'loo') return 'loo';
  if (t === 'unfifo') return 'unfifo';
  if (t === 'packaging' || t === 'damaged_pkg' || t === 'incoming_pkg') return 'packaging';
  if (t === 'productivity' || t === 'mb51') return 'productivity';
  if (t === 'overview') return 'overview';
  return 'overview';
}

/** Wrapper kontainer tabel yang mendukung mode fullscreen per-tabel */
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-3 lg:p-4 animate-in fade-in duration-150"
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

export default function WeeklyAnalyticsView({
  onOpenUploadModal,
  pipeCapacities = [],
  fastSlowData = [],
  coilStripData = [],
  ncWarehouseData = [],
  ncItems = [],
  ncProgressData = [],
  looSTData = [],
  looLTData = [],
  unfifoPipeData = [],
  unfifoCoilData = [],
  damagedPackagingData = [],
  incomingPackagingData = [],
  productivityData,
  capacityConfig,
  packagingBufferConfig,
  activeWeeklySubTab,
  onWeeklySubTabChange,
}: WeeklyAnalyticsViewProps) {
  const [availableWeeks, setAvailableWeeks] = useState<WeeklyPeriod[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<WeeklySubTab>(() => normalizeWeeklySubTab(activeWeeklySubTab));

  useEffect(() => {
    if (activeWeeklySubTab) {
      setActiveSubTab(normalizeWeeklySubTab(activeWeeklySubTab));
    }
  }, [activeWeeklySubTab]);

  const handleSelectSubTab = (tabId: WeeklySubTab) => {
    setActiveSubTab(tabId);
    onWeeklySubTabChange?.(tabId);
  };
  const [fullscreenTable, setFullscreenTable] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Search states for tables
  const [searchQuery, setSearchQuery] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch data mingguan dari API /api/weekly
  const fetchWeeklyData = async (weekId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = weekId ? `/api/weekly?week=${encodeURIComponent(weekId)}` : '/api/weekly';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal memuat analisis mingguan`);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Gagal memproses data mingguan');
      }

      setAvailableWeeks(json.availableWeeks || []);
      setSelectedWeekId(json.selectedWeek || '');
      setReport(json.report || null);
    } catch (err: any) {
      console.error('Error fetching weekly analytics:', err);
      setError(err?.message || 'Terjadi kesalahan sistem saat memuat data mingguan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const handleWeekChange = (newWeekId: string) => {
    setSelectedWeekId(newWeekId);
    fetchWeeklyData(newWeekId);
  };

  const handleExportExcel = () => {
    if (!report) return;
    try {
      exportWeeklyAnalyticsToExcel(report);
      showToast(`Laporan Excel pekan ${report.period.label} berhasil diunduh`);
    } catch (err: any) {
      alert('Gagal mengekspor Excel: ' + (err?.message || 'Unknown error'));
    }
  };

  // Reset search query saat berganti sub-tab
  useEffect(() => {
    setSearchQuery('');
  }, [activeSubTab]);

  // =========================================================================
  // METRIC COMPUTATIONS ACROSS ALL MODULES
  // =========================================================================

  // 1. Kapasitas & Stok Pipa
  const capacityMetrics = useMemo(() => {
    const list = report?.capacitySummary?.warehouseMovement && report.capacitySummary.warehouseMovement.length > 0
      ? report.capacitySummary.warehouseMovement
      : pipeCapacities.map((p) => ({
          gudang: p.gudang,
          kapasitas: p.kapasitas || 0,
          stockStart: p.stock || 0,
          stockEnd: p.stock || 0,
          deltaStock: 0,
          occupancyEnd: p.persenTerisi || 0,
        }));

    const totalCap = list.reduce((acc, c) => acc + c.kapasitas, 0);
    const totalStock = list.reduce((acc, c) => acc + c.stockEnd, 0);
    const totalStart = list.reduce((acc, c) => acc + c.stockStart, 0);
    const totalDelta = list.reduce((acc, c) => acc + c.deltaStock, 0);
    const avgOcc = totalCap > 0 ? Number(((totalStock / totalCap) * 100).toFixed(1)) : 0;

    // WIP vs FG dari live state jika tersedia
    const totalWipTon = pipeCapacities.reduce((acc, p) => acc + (p.wipLt || 0) + (p.wipSt || 0), 0);
    const totalFgTon = pipeCapacities.reduce((acc, p) => acc + (p.fgLt || 0) + (p.fgSt || 0), 0);
    const fgRatio = totalStock > 0 ? Number(((totalFgTon / totalStock) * 100).toFixed(1)) : 0;
    const wipRatio = totalStock > 0 ? Number(((totalWipTon / totalStock) * 100).toFixed(1)) : 0;

    return {
      list,
      totalCap,
      totalStock,
      totalStart,
      totalDelta,
      avgOcc,
      totalWipTon,
      totalFgTon,
      fgRatio,
      wipRatio,
    };
  }, [report, pipeCapacities]);

  // 2. Fast vs Slow Moving
  const fastSlowMetrics = useMemo(() => {
    const totalStok = fastSlowData.reduce((acc, f) => acc + (f.totalTon || 0), 0);
    const totalFast = fastSlowData.reduce((acc, f) => acc + (f.fastTon || 0), 0);
    const totalSlow = fastSlowData.reduce((acc, f) => acc + (f.slowTon || 0), 0);
    const slowRatio = totalStok > 0 ? Number(((totalSlow / totalStok) * 100).toFixed(1)) : 0;
    const fastRatio = totalStok > 0 ? Number(((totalFast / totalStok) * 100).toFixed(1)) : 0;

    // Estimasi aging slow moving (PASM 1-3 bln, 3-6 bln, >6 bln)
    const slow1to3 = Math.round(totalSlow * 0.45);
    const slow3to6 = Math.round(totalSlow * 0.35);
    const slowAbove6 = totalSlow - slow1to3 - slow3to6;

    return {
      totalStok,
      totalFast,
      totalSlow,
      slowRatio,
      fastRatio,
      slow1to3,
      slow3to6,
      slowAbove6,
    };
  }, [fastSlowData]);

  // 3. Coil & Strip (Bahan Baku)
  const coilStripMetrics = useMemo(() => {
    const totalTon = coilStripData.reduce((acc, c) => acc + (c.totalTon || 0), 0);
    const totalQty = coilStripData.reduce((acc, c) => acc + (c.totalQty || 0), 0);
    const coilTon = coilStripData.reduce((acc, c) => acc + (c.coilTon || 0), 0);
    const coilQty = coilStripData.reduce((acc, c) => acc + (c.coilQty || 0), 0);
    const stripTon = coilStripData.reduce((acc, c) => acc + (c.stripTon || 0), 0);
    const stripQty = coilStripData.reduce((acc, c) => acc + (c.stripQty || 0), 0);
    const totalCap = coilStripData.reduce((acc, c) => acc + (c.kapasitas || 0), 0);
    const occ = totalCap > 0 ? Number(((totalTon / totalCap) * 100).toFixed(1)) : 0;
    const deltaTon = report?.capacitySummary?.deltaCoilStock ?? 0;

    return {
      totalTon,
      totalQty,
      coilTon,
      coilQty,
      stripTon,
      stripQty,
      totalCap,
      occ,
      deltaTon,
    };
  }, [coilStripData, report]);

  // 4. Stock NC & Karantina Mutu
  const ncStockMetrics = useMemo(() => {
    const totalGradeE = ncWarehouseData.reduce((acc, w) => acc + (w.gradeE || 0), 0);
    const totalGradeC = ncWarehouseData.reduce((acc, w) => acc + (w.gradeC || 0), 0);
    const totalPrime = ncWarehouseData.reduce((acc, w) => acc + (w.prime || 0), 0);
    const totalNC = totalGradeE + totalGradeC;
    const totalAll = totalPrime + totalNC;
    const ncRatio = totalAll > 0 ? Number(((totalNC / totalAll) * 100).toFixed(2)) : 0;
    const totalItemsCount = ncItems.length;

    return {
      totalGradeE,
      totalGradeC,
      totalPrime,
      totalNC,
      totalAll,
      ncRatio,
      totalItemsCount,
    };
  }, [ncWarehouseData, ncItems]);

  // 5. Stock Pipa vs LOO Fulfillment
  const looMetrics = useMemo(() => {
    const combined = [...looSTData, ...looLTData];
    const totalLooTon = combined.reduce((acc, item) => acc + (item.looTon || 0), 0);
    const totalStockTon = combined.reduce((acc, item) => acc + (item.totalStockTon || 0), 0);
    const totalKurangTon = combined.reduce((acc, item) => {
      const diff = (item.looTon || 0) - (item.totalStockTon || 0);
      return acc + (diff > 0 ? diff : 0);
    }, 0);
    const fulfillmentRate = totalLooTon > 0
      ? Number((Math.min(100, (totalStockTon / totalLooTon) * 100)).toFixed(1))
      : 100;
    const fulfilledItems = combined.filter((i) => (i.persenFulfillment || 0) >= 100).length;
    const deficitItems = combined.filter((i) => (i.persenFulfillment || 0) < 100).length;

    return {
      combined,
      totalLooTon,
      totalStockTon,
      totalKurangTon,
      fulfillmentRate,
      fulfilledItems,
      deficitItems,
      count: combined.length,
    };
  }, [looSTData, looLTData]);

  // 6. UNFIFO Audit Pelanggaran
  const unfifoMetrics = useMemo(() => {
    const pipeCount = unfifoPipeData.length;
    const coilCount = unfifoCoilData.length;
    const totalCases = pipeCount + coilCount;
    const pipeTon = unfifoPipeData.reduce((acc, p) => acc + (p.tonase || 0), 0);
    const coilTon = unfifoCoilData.reduce((acc, c) => acc + (c.tonase || 0), 0);
    // Score kepatuhan: 100% minus pinalti 1.5% per temuan kasus (min 0)
    const complianceScore = Math.max(0, Math.min(100, Math.round(100 - totalCases * 1.5)));

    return {
      pipeCount,
      coilCount,
      totalCases,
      pipeTon,
      coilTon,
      complianceScore,
    };
  }, [unfifoPipeData, unfifoCoilData]);

  // 7. Packaging RTP & Box Rusak
  const packagingMetrics = useMemo(() => {
    let surplusCount = 0;
    let sesuaiCount = 0;
    let defisitCount = 0;
    let totalStockBox = 0;
    let totalOutBox = 0;
    let totalInBox = 0;
    let totalKebutuhan = 0;

    incomingPackagingData.forEach((item) => {
      const std = getStandarBuffer(packagingBufferConfig, item.customer, item.type, item.qtyBoxKirimHari);
      const stock = Number(item.stockSaatIni !== undefined ? item.stockSaatIni : (item.stockAktualInternal || 0));
      totalStockBox += stock;
      totalOutBox += Number(item.outQty || 0);
      totalInBox += Number(item.inQty || 0);
      totalKebutuhan += std;

      const st = item.statusKategori || getPackagingBufferStatus(stock, std);
      if (st === 'SURPLUS') surplusCount++;
      else if (st === 'SESUAI') sesuaiCount++;
      else defisitCount++;
    });

    const damagedCount = damagedPackagingData.length;

    return {
      surplusCount,
      sesuaiCount,
      defisitCount,
      totalStockBox,
      totalOutBox,
      totalInBox,
      totalKebutuhan,
      damagedCount,
    };
  }, [incomingPackagingData, damagedPackagingData, packagingBufferConfig]);

  // =========================================================================
  // CHART CONFIGURATIONS
  // =========================================================================

  // 1. Chart NC Harian
  const ncDailyChartData = useMemo(() => {
    if (!report?.ncSummary?.dailyBreakdown) return { labels: [], datasets: [] };
    const days = report.ncSummary.dailyBreakdown;
    return {
      labels: days.map((d) => `${d.dayName} (${d.date.slice(8, 10)})`),
      datasets: [
        {
          label: 'NC Masuk (MVT 309)',
          data: days.map((d) => Number((d.inNcKg / 1000).toFixed(2))),
          backgroundColor: '#ef4444',
          borderRadius: 4,
          maxBarThickness: 28,
        },
        {
          label: 'Kirim Repair (MVT 261)',
          data: days.map((d) => Number((d.issuedRepairKg / 1000).toFixed(2))),
          backgroundColor: '#f59e0b',
          borderRadius: 4,
          maxBarThickness: 28,
        },
        {
          label: 'Selesai Prime (MVT 101)',
          data: days.map((d) => Number((d.completedPrimeKg / 1000).toFixed(2))),
          backgroundColor: '#059669',
          borderRadius: 4,
          maxBarThickness: 28,
        },
      ],
    };
  }, [report]);

  // 2. Chart Shift MB51
  const shiftChartData = useMemo(() => {
    if (!report?.productivitySummary?.shiftBreakdown) return { labels: [], datasets: [] };
    const shifts = report.productivitySummary.shiftBreakdown;
    return {
      labels: ['Shift 1 (Pagi)', 'Shift 2 (Sore)', 'Shift 3 (Malam)'],
      datasets: [
        {
          label: 'Tonase (Ton)',
          data: [
            Number((shifts['Shift 1'].tonase / 1000).toFixed(2)),
            Number((shifts['Shift 2'].tonase / 1000).toFixed(2)),
            Number((shifts['Shift 3'].tonase / 1000).toFixed(2)),
          ],
          backgroundColor: ['#059669', '#0284c7', '#d97706'],
          borderRadius: 6,
          maxBarThickness: 44,
        },
      ],
    };
  }, [report]);

  // 3. Chart Kapasitas Gudang (Horizontal Bar)
  const capacityChartData = useMemo(() => {
    const list = capacityMetrics.list.slice(0, 10);
    return {
      labels: list.map((c) => c.gudang),
      datasets: [
        {
          label: 'Stok Akhir (Ton)',
          data: list.map((c) => Math.round(c.stockEnd)),
          backgroundColor: '#0284c7',
          borderRadius: 4,
          maxBarThickness: 24,
        },
        {
          label: 'Kapasitas Maks (Ton)',
          data: list.map((c) => Math.round(c.kapasitas)),
          backgroundColor: '#cbd5e1',
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    };
  }, [capacityMetrics]);

  // 4. Chart Fast vs Slow Doughnut
  const fastSlowDoughnutData = useMemo(() => {
    return {
      labels: ['Fast Moving (Aktif)', 'Slow Moving (PASM)'],
      datasets: [
        {
          data: [Math.round(fastSlowMetrics.totalFast), Math.round(fastSlowMetrics.totalSlow)],
          backgroundColor: ['#059669', '#f59e0b'],
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  }, [fastSlowMetrics]);

  // 5. Chart Coil & Strip Area
  const coilAreaChartData = useMemo(() => {
    const topAreas = coilStripData.slice(0, 8);
    return {
      labels: topAreas.map((a) => a.area || a.gudang),
      datasets: [
        {
          label: 'Coil (Ton)',
          data: topAreas.map((a) => Math.round(a.coilTon)),
          backgroundColor: '#0284c7',
          borderRadius: 4,
          maxBarThickness: 24,
        },
        {
          label: 'Strip (Ton)',
          data: topAreas.map((a) => Math.round(a.stripTon)),
          backgroundColor: '#059669',
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    };
  }, [coilStripData]);

  // 6. Chart Mutu NC Stacked
  const ncStackedChartData = useMemo(() => {
    const topWh = ncWarehouseData.slice(0, 10);
    return {
      labels: topWh.map((w) => w.gudang),
      datasets: [
        {
          label: 'Prime OK (Ton)',
          data: topWh.map((w) => Math.round(w.prime)),
          backgroundColor: '#059669',
          maxBarThickness: 28,
        },
        {
          label: 'Grade C (Mutu) Ton',
          data: topWh.map((w) => Math.round(w.gradeC)),
          backgroundColor: '#f59e0b',
          maxBarThickness: 28,
        },
        {
          label: 'Grade E (Reject) Ton',
          data: topWh.map((w) => Math.round(w.gradeE)),
          backgroundColor: '#ef4444',
          maxBarThickness: 28,
        },
      ],
    };
  }, [ncWarehouseData]);

  // =========================================================================
  // SUB-TABS DEFINITIONS
  // =========================================================================
  const SUB_TABS = [
    { id: 'overview', label: 'Ringkasan Eksekutif', icon: Award, badge: 'Ikhtisar' },
    { id: 'capacity', label: 'Stock Pipa vs Kapasitas', icon: Building2, badge: `${capacityMetrics.list.length} Gudang` },
    { id: 'fastslow', label: 'Fast vs Slow Moving', icon: TrendingUp, badge: `${fastSlowMetrics.slowRatio}% Slow` },
    { id: 'coilstrip', label: 'Coil & Strip', icon: Boxes, badge: `${formatTon(coilStripMetrics.totalTon, { decimals: 0 })} Ton` },
    { id: 'nc_stock', label: 'Stock NC', icon: ShieldAlert, badge: `${formatTon(ncStockMetrics.totalNC, { decimals: 1 })} Ton` },
    { id: 'nc_progress', label: 'Progres NC & Repair', icon: GitFork, badge: `${report?.ncSummary?.recoveryRate ?? 0}% Selesai` },
    { id: 'loo', label: 'Stock Pipa vs LOO', icon: FileText, badge: `${looMetrics.fulfillmentRate}% Terpenuhi` },
    { id: 'unfifo', label: 'UNFIFO', icon: Clock, badge: `${unfifoMetrics.totalCases} Kasus` },
    { id: 'packaging', label: 'Packaging (RTP & Rusak)', icon: PackageCheck, badge: `${packagingMetrics.defisitCount} Defisit` },
    { id: 'productivity', label: 'Produktivitas Gudang', icon: Users, badge: `${formatTon((report?.productivitySummary?.totalTonase ?? 0) / 1000, { decimals: 0 })} Ton` },
  ] as const;

  return (
    <div className="space-y-3.5 pb-12">
      {/* Toast Notifikasi */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950 text-white text-xs font-semibold shadow-lg border border-emerald-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP BANNER HEADER (Design System Spindo Deep Pine Green) */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200 shadow-2xs">
            <BarChart3 className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-sans tracking-tight">
              Analisis Mingguan
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Week Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedWeekId}
              onChange={(e) => handleWeekChange(e.target.value)}
              disabled={isLoading || availableWeeks.length === 0}
              className="text-xs font-semibold text-emerald-100 bg-emerald-800/90 hover:bg-emerald-700/90 border border-emerald-700/80 rounded-xl px-3 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400/30 cursor-pointer shadow-2xs pr-8 transition-colors disabled:opacity-50"
              title="Pilih pekan analisa"
            >
              {availableWeeks.map((w) => (
                <option key={w.id} value={w.id} className="text-slate-900 bg-white font-sans">
                  {w.label}
                </option>
              ))}
              {availableWeeks.length === 0 && (
                <option value="" className="text-slate-900 bg-white">Belum Ada Data Pekan</option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchWeeklyData(selectedWeekId)}
            disabled={isLoading}
            title="Segarkan data analisis"
            className="p-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/90 text-emerald-100 border border-emerald-700/80 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={isLoading || !report}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/90 text-emerald-100 font-semibold text-xs transition-colors border border-emerald-700/80 disabled:opacity-40 cursor-pointer shadow-2xs"
            title="Download Laporan Excel Mingguan Komprehensif"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Error state banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Mengagregasi data multi-modul mingguan...</p>
        </div>
      )}

      {/* Main Content Area */}
      {!isLoading && (
        <>
          {/* 2. TOP KPI COCKPIT LEDGER (5 Core Operational Pillars) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {/* Cockpit Card 1: Handling MB51 */}
              <div className="p-3.5 sm:p-4 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Handling MB51</span>
                    <span className="text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/60">
                      {(report?.productivitySummary?.totalTransaksi ?? 0).toLocaleString('id-ID')} Tx
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                      {formatTon((report?.productivitySummary?.totalTonase ?? 0) / 1000, { decimals: 1 })}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Ton</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Efisiensi</span>
                  <strong className="text-emerald-700 font-bold">
                    {(report?.productivitySummary?.avgKgPerMan ?? 0).toLocaleString('id-ID')} Kg/Man
                  </strong>
                </div>
              </div>

              {/* Cockpit Card 2: Net Pergerakan Stok Pipa */}
              <div className="p-3.5 sm:p-4 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Delta Stok Pipa</span>
                    <span className="text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      {capacityMetrics.avgOcc}% Okupansi
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={cn(
                      'text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums',
                      Math.abs(capacityMetrics.totalDelta) < 50 ? 'text-slate-900' : capacityMetrics.totalDelta > 0 ? 'text-emerald-700' : 'text-rose-600'
                    )}>
                      {(() => {
                        const dTon = Math.round((capacityMetrics.totalDelta / 1000) * 10) / 10;
                        if (Math.abs(dTon) < 0.05) return '0,0';
                        return `${dTon > 0 ? '+' : ''}${dTon.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
                      })()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Ton</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Stok Akhir</span>
                  <strong className="text-slate-800 font-bold">
                    {formatTon(capacityMetrics.totalStock / 1000, { decimals: 1 })} Ton
                  </strong>
                </div>
              </div>

              {/* Cockpit Card 3: Stok Coil & Strip */}
              <div className="p-3.5 sm:p-4 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Stok Coil &amp; Strip</span>
                    <span className="text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                      {coilStripMetrics.totalQty.toLocaleString('id-ID')} Roll
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                      {formatTon(coilStripMetrics.totalTon, { decimals: 1 })}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Ton</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Mutasi Pekan Ini</span>
                  <strong className={cn(
                    'font-bold',
                    Math.abs(coilStripMetrics.deltaTon) < 50 ? 'text-slate-700' : coilStripMetrics.deltaTon > 0 ? 'text-emerald-700' : 'text-rose-600'
                  )}>
                    {(() => {
                      const dTon = Math.round((coilStripMetrics.deltaTon / 1000) * 10) / 10;
                      if (Math.abs(dTon) < 0.05) return '0,0 Ton';
                      return `${dTon > 0 ? '+' : ''}${dTon.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Ton`;
                    })()}
                  </strong>
                </div>
              </div>

              {/* Cockpit Card 4: NC Recovery Rate */}
              <div className="p-3.5 sm:p-4 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">NC Recovery Rate</span>
                    {(() => {
                      const total309 = report?.ncSummary?.total309Qty ?? 0;
                      const total261 = report?.ncSummary?.netRepairIssuedQty ?? 0;
                      const hasNC = total309 > 0 || total261 > 0;
                      const recRate = report?.ncSummary?.recoveryRate ?? 0;

                      if (!hasNC) {
                        return (
                          <span className="text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md border bg-slate-100 text-slate-600 border-slate-200/60">
                            Nihil Kasus
                          </span>
                        );
                      }
                      if (recRate >= 85) {
                        return (
                          <span className="text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200/60">
                            Target Tercapai
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200/60">
                          Perlu Optimasi
                        </span>
                      );
                    })()}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                      {report?.ncSummary?.recoveryRate ?? 0}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">%</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Antrean Sisa</span>
                  <strong className="text-amber-700 font-bold">
                    {formatTon((report?.ncSummary?.netOutstandingKg ?? 0) / 1000, { decimals: 1 })} Ton
                  </strong>
                </div>
              </div>

              {/* Cockpit Card 5: Pemenuhan LOO */}
              <div className="p-3.5 sm:p-4 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Pemenuhan LOO</span>
                    <span className={cn(
                      'text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md border',
                      looMetrics.totalLooTon === 0
                        ? 'bg-slate-100 text-slate-600 border-slate-200/60'
                        : looMetrics.fulfillmentRate >= 90
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                        : 'bg-amber-50 text-amber-700 border-amber-200/60'
                    )}>
                      {looMetrics.totalLooTon === 0 ? 'Nihil Order' : looMetrics.fulfillmentRate >= 90 ? 'Optimal' : 'Kurang'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                      {looMetrics.totalLooTon > 0 ? looMetrics.fulfillmentRate : 100}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">%</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Total Order LOO</span>
                  <strong className="text-slate-800 font-bold">
                    {formatTon(looMetrics.totalLooTon, { decimals: 1 })} Ton
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SEGMENTED SUB-TAB NAVIGATION (Horizontal Scroll with Status Badges) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-2 sm:p-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {SUB_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectSubTab(tab.id as WeeklySubTab)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0',
                      isActive
                        ? 'bg-emerald-900 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 bg-slate-50/60 border border-slate-200/50'
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-emerald-300' : 'text-slate-400')} />
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold',
                        isActive
                          ? 'bg-emerald-800 text-emerald-100 border border-emerald-700/60'
                          : 'bg-white text-slate-500 border border-slate-200/60'
                      )}
                    >
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SUB-TAB 1: RINGKASAN EKSEKUTIF (OVERVIEW)                                 */}
          {/* ========================================================================= */}
          {activeSubTab === 'overview' && (
            <div className="space-y-4">
              {/* Dual Column: Tren Pemulihan NC & Performa Shift MB51 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Tren NC Harian */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                        Tren Pemulihan NC Harian
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        NC Masuk (309) vs Kirim Repair (261) vs Selesai Prime (101)
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                      7 Hari Siklus
                    </span>
                  </div>
                  <div className="p-4 h-64">
                    <Bar
                      data={ncDailyChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              boxWidth: 10,
                              boxHeight: 10,
                              font: { size: 10, weight: 'bold' as const },
                              color: '#475569',
                            },
                          },
                          tooltip: { ...tooltipStyleStrong },
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { font: { family: 'ui-monospace, monospace', size: 10 } } },
                          y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'ui-monospace, monospace', size: 10 }, callback: (v) => `${v} T` } },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Performa Shift MB51 */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                        Volume Handling per Shift MB51
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Distribusi beban kerja penanganan material Shift 1, Shift 2, & Shift 3
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                      Akumulasi
                    </span>
                  </div>
                  <div className="p-4 h-64">
                    <Bar
                      data={shiftChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: { ...tooltipStyleStrong },
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' as const } } },
                          y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'ui-monospace, monospace', size: 10 }, callback: (v) => `${v} T` } },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Module Quick Health Matrix (Peta Status 9 Modul Operasional) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                        Matriks Status 9 Modul Operasional
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Peta kesehatan menyeluruh dan shortcut navigasi langsung ke modul terkait
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">Klik kartu untuk detail</span>
                </div>

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Module 1: Stock Pipa vs Kapasitas */}
                  <div
                    onClick={() => handleSelectSubTab('capacity')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/40 hover:bg-white flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        Stock Pipa vs Kapasitas
                      </span>
                      <span className={cn(
                        'text-[10px] font-bold font-mono px-1.5 py-0.2 rounded',
                        capacityMetrics.avgOcc > 85 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      )}>
                        {capacityMetrics.avgOcc}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Stok Akhir <strong className="font-mono text-slate-900">{formatTon(capacityMetrics.totalStock / 1000, { decimals: 1 })} T</strong> (Net: {capacityMetrics.totalDelta >= 0 ? '+' : ''}{formatTon(capacityMetrics.totalDelta / 1000, { decimals: 1 })} T)
                    </p>
                  </div>

                  {/* Module 2: Fast vs Slow Moving */}
                  <div
                    onClick={() => handleSelectSubTab('fastslow')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/40 hover:bg-white flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                        Fast vs Slow Moving
                      </span>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        {fastSlowMetrics.slowRatio}% Slow
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Slow Moving <strong className="font-mono text-amber-700">{formatTon(fastSlowMetrics.totalSlow, { decimals: 0 })} Ton</strong> ({fastSlowMetrics.slowAbove6.toLocaleString('id-ID')} T &gt;6 bln)
                    </p>
                  </div>

                  {/* Module 3: Coil & Strip */}
                  <div
                    onClick={() => handleSelectSubTab('coilstrip')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/40 hover:bg-white flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-sky-600" />
                        Coil &amp; Strip
                      </span>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-sky-100 text-sky-800">
                        {coilStripMetrics.occ}% Area
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Stok Total <strong className="font-mono text-slate-900">{formatTon(coilStripMetrics.totalTon, { decimals: 0 })} Ton</strong> ({coilStripMetrics.totalQty} Roll)
                    </p>
                  </div>

                  {/* Module 4: Stock NC */}
                  <div
                    onClick={() => handleSelectSubTab('nc_stock')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/40 hover:bg-white flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        Stock NC
                      </span>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                        {ncStockMetrics.ncRatio}% Pipa
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Tertahan <strong className="font-mono text-rose-700">{formatTon(ncStockMetrics.totalNC, { decimals: 1 })} T</strong> (E: {formatTon(ncStockMetrics.totalGradeE, { decimals: 1 })} T, C: {formatTon(ncStockMetrics.totalGradeC, { decimals: 1 })} T)
                    </p>
                  </div>

                  {/* Module 5: Progres NC & Repair */}
                  <div
                    onClick={() => handleSelectSubTab('nc_progress')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/40 hover:bg-white flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <GitFork className="w-3.5 h-3.5 text-emerald-600" />
                        Progres NC &amp; Repair
                      </span>
                      <span className={cn(
                        'text-[10px] font-bold font-mono px-1.5 py-0.2 rounded',
                        (report?.ncSummary?.recoveryRate ?? 0) >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      )}>
                        {report?.ncSummary?.recoveryRate ?? 0}% Recovery
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Selesai Prime <strong className="font-mono text-emerald-700">{formatTon((report?.ncSummary?.total101Kg ?? 0) / 1000, { decimals: 1 })} T</strong> | Sisa: {formatTon((report?.ncSummary?.netOutstandingKg ?? 0) / 1000, { decimals: 1 })} T
                    </p>
                  </div>

                  {/* Module 6: Stock Pipa vs LOO */}
                  <div
                    onClick={() => handleSelectSubTab('loo')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/40 hover:bg-white flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Stock Pipa vs LOO
                      </span>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                        {looMetrics.fulfillmentRate}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Order <strong className="font-mono text-slate-900">{formatTon(looMetrics.totalLooTon, { decimals: 1 })} T</strong> | Defisit: <span className="text-rose-600 font-mono font-bold">{formatTon(looMetrics.totalKurangTon, { decimals: 1 })} T</span>
                    </p>
                  </div>

                  {/* Module 7: UNFIFO */}
                  <div
                    onClick={() => handleSelectSubTab('unfifo')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/40 hover:bg-white flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        UNFIFO
                      </span>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-800">
                        {unfifoMetrics.totalCases} Kasus
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Kepatuhan FIFO <strong className="font-mono text-emerald-700">{unfifoMetrics.complianceScore}%</strong> (Pipa: {unfifoMetrics.pipeCount}, Coil: {unfifoMetrics.coilCount})
                    </p>
                  </div>

                  {/* Module 8: Packaging (RTP & Rusak) */}
                  <div
                    onClick={() => handleSelectSubTab('packaging')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/40 hover:bg-white flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-700" />
                        Packaging (RTP &amp; Rusak)
                      </span>
                      <span className={cn(
                        'text-[10px] font-bold font-mono px-1.5 py-0.2 rounded',
                        packagingMetrics.defisitCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      )}>
                        {packagingMetrics.defisitCount} Defisit
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Aktual <strong className="font-mono text-slate-900">{packagingMetrics.totalStockBox.toLocaleString('id-ID')} Box</strong> | NG: {packagingMetrics.damagedCount} Box
                    </p>
                  </div>

                  {/* Module 9: Produktivitas Gudang (MB51) */}
                  <div
                    onClick={() => handleSelectSubTab('productivity')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/40 hover:bg-white flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-sky-700" />
                        Produktivitas Gudang (MB51)
                      </span>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-sky-100 text-sky-800">
                        {report?.productivitySummary?.avgTxPerMan ?? 0} Tx/Man
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Beban <strong className="font-mono text-slate-900">{formatTon((report?.productivitySummary?.totalTonase ?? 0) / 1000, { decimals: 1 })} Ton</strong> | {report?.productivitySummary?.totalHeadcountDays ?? 0} Man Days
                    </p>
                  </div>
                </div>
              </div>

              {/* Executive Insights Highlights Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                        Poin Evaluasi &amp; Rekomendasi Cerdas
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Sintesis analitik performa operasional pekan {report?.period?.label ?? 'Aktif'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {report?.period?.startDate} s/d {report?.period?.endDate}
                  </span>
                </div>

                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(report?.keyInsights && report.keyInsights.length > 0) ? (
                    report.keyInsights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 rounded-xl flex items-start gap-3 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold font-mono">
                          {idx + 1}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                          {insight}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic p-3 col-span-2 text-center">
                      Belum ada cukup data aktivitas pada pekan ini untuk menghasilkan kesimpulan otomatis.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 2: STOK PIPA & KAPASITAS (CAPACITY)                              */}
          {/* ========================================================================= */}
          {activeSubTab === 'capacity' && (
            <div className="space-y-4">
              {/* Metric bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Kapasitas Pabrik</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{formatTon(capacityMetrics.totalCap / 1000, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Stok Akhir Pipa</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{formatTon(capacityMetrics.totalStock / 1000, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Delta Pergerakan Stok</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={cn('text-xl font-bold font-mono', capacityMetrics.totalDelta >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                      {capacityMetrics.totalDelta >= 0 ? '+' : ''}{formatTon(capacityMetrics.totalDelta / 1000, { decimals: 1 })}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Ton</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Rata-rata Okupansi</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{capacityMetrics.avgOcc}</span>
                    <span className="text-xs text-slate-400 font-semibold">%</span>
                  </div>
                </div>
              </div>

              {/* Chart Kapasitas vs Stok */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Perbandingan Kapasitas Maksimal vs Stok Akhir per Gudang
                  </h3>
                  <span className="text-[11px] font-mono text-slate-600 font-semibold">10 Gudang Pipa</span>
                </div>
                <div className="p-4 h-64">
                  <Bar
                    data={capacityChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' as const } } },
                        tooltip: { ...tooltipStyleStrong },
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' as const } } },
                        y: { grid: { color: '#f1f5f9' }, ticks: { callback: (v) => `${v} T` } },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Table Pergerakan Kapasitas */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'capacity'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Rekapitulasi Pergerakan Stok &amp; Okupansi per Gudang
                    </h3>
                    <p className="text-[11px] text-slate-500">Perubahan stok awal pekan vs akhir pekan</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFullscreenTable(fullscreenTable === 'capacity' ? null : 'capacity')}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {fullscreenTable === 'capacity' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-3">Gudang</th>
                        <th className="py-2.5 px-3 text-right">Kapasitas (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Stok Awal (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Stok Akhir (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Net Delta (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Okupansi (%)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {capacityMetrics.list.map((c) => {
                        const isOver = c.occupancyEnd >= 90;
                        const isWarning = c.occupancyEnd >= 75 && c.occupancyEnd < 90;
                        return (
                          <tr key={c.gudang} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{c.gudang}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatTon(c.kapasitas, { decimals: 1 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">{formatTon(c.stockStart, { decimals: 1 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatTon(c.stockEnd, { decimals: 1 })}</td>
                            <td className={cn('py-2.5 px-3 text-right font-mono font-semibold', c.deltaStock > 0 ? 'text-emerald-700' : c.deltaStock < 0 ? 'text-rose-600' : 'text-slate-600')}>
                              {c.deltaStock > 0 ? '+' : ''}{formatTon(c.deltaStock, { decimals: 1 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">{c.occupancyEnd}%</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={cn(
                                'px-2 py-0.5 rounded-md text-[10.5px] font-bold',
                                isOver ? 'bg-rose-50 text-rose-700 border border-rose-200' : isWarning ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              )}>
                                {isOver ? 'Kritis' : isWarning ? 'Waspada' : 'Aman'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 3: FAST VS SLOW MOVING                                            */}
          {/* ========================================================================= */}
          {activeSubTab === 'fastslow' && (
            <div className="space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Stok Teranalisis</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{formatTon(fastSlowMetrics.totalStok, { decimals: 0 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Fast Moving (Aktif)</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-emerald-700">{formatTon(fastSlowMetrics.totalFast, { decimals: 0 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton ({fastSlowMetrics.fastRatio}%)</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Slow Moving (PASM)</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-amber-700">{formatTon(fastSlowMetrics.totalSlow, { decimals: 0 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton ({fastSlowMetrics.slowRatio}%)</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Aging Kritis &gt;6 Bulan</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-rose-700">{formatTon(fastSlowMetrics.slowAbove6, { decimals: 0 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton</span>
                  </div>
                </div>
              </div>

              {/* Chart Komposisi */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col items-center justify-center">
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Rasio Fast vs Slow Pabrik</h4>
                  <div className="w-48 h-48 relative">
                    <Doughnut data={fastSlowDoughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                </div>
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-1">Rekomendasi Penanganan Slow Moving (PASM)</h4>
                    <p className="text-[11px] text-slate-500 mb-3">Distribusi estimasi aging material slow moving per kategori</p>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Aging 1–3 Bulan (Waspada Awal)</span>
                        <span className="font-mono font-bold text-slate-900">{formatTon(fastSlowMetrics.slow1to3, { decimals: 0 })} Ton</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/60 flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-900">Aging 3–6 Bulan (Perlu Program Penjualan/Rework)</span>
                        <span className="font-mono font-bold text-amber-800">{formatTon(fastSlowMetrics.slow3to6, { decimals: 0 })} Ton</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-200/60 flex items-center justify-between text-xs">
                        <span className="font-semibold text-rose-900">Aging &gt;6 Bulan (Kritis: Risiko Korosi &amp; Dead Stock)</span>
                        <span className="font-mono font-bold text-rose-800">{formatTon(fastSlowMetrics.slowAbove6, { decimals: 0 })} Ton</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-400 italic mt-3">
                    *Strategi: Prioritaskan alokasi stok slow moving untuk order LOO dengan toleransi spek setara.
                  </p>
                </div>
              </div>

              {/* Table Fast vs Slow per Gudang */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'fastslow'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Rincian Fast vs Slow Moving per Gudang
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFullscreenTable(fullscreenTable === 'fastslow' ? null : 'fastslow')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {fullscreenTable === 'fastslow' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-3">Gudang</th>
                        <th className="py-2.5 px-3 text-right">Total Stok (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Fast Moving (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Slow Moving (Ton)</th>
                        <th className="py-2.5 px-3 text-right">% Slow</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {fastSlowData.map((f) => (
                        <tr key={f.gudang} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{f.gudang}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatTon(f.totalTon, { decimals: 1 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{formatTon(f.fastTon, { decimals: 1 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">{formatTon(f.slowTon, { decimals: 1 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">{f.slowPersen?.toFixed(1) ?? '0.0'}%</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={cn(
                              'px-2 py-0.5 rounded-md text-[10.5px] font-bold',
                              (f.slowPersen || 0) > 30 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            )}>
                              {(f.slowPersen || 0) > 30 ? 'Tinggi' : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 4: COIL & STRIP (BAHAN BAKU INDUK)                               */}
          {/* ========================================================================= */}
          {activeSubTab === 'coilstrip' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Bahan Baku Induk</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{formatTon(coilStripMetrics.totalTon, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton ({coilStripMetrics.totalQty} Roll)</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Saldo Induk Coil</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-sky-700">{formatTon(coilStripMetrics.coilTon, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton ({coilStripMetrics.coilQty} Roll)</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Saldo Strip Siap Mill</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-emerald-700">{formatTon(coilStripMetrics.stripTon, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton ({coilStripMetrics.stripQty} Roll)</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Okupansi Area Induk</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{coilStripMetrics.occ}</span>
                    <span className="text-xs text-slate-400 font-semibold">%</span>
                  </div>
                </div>
              </div>

              {/* Chart Coil Area */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-3">Distribusi Bahan Baku per Area Gudang</h4>
                <div className="h-64">
                  <Bar
                    data={coilAreaChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' }, tooltip: { ...tooltipStyleStrong } },
                      scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => `${v} T` } } },
                    }}
                  />
                </div>
              </div>

              {/* Table Coil & Strip per Area */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'coilstrip'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Rincian Saldo Coil &amp; Strip per Area Gudang
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFullscreenTable(fullscreenTable === 'coilstrip' ? null : 'coilstrip')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {fullscreenTable === 'coilstrip' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-3">Area / Gudang</th>
                        <th className="py-2.5 px-3 text-right">Kapasitas (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Coil (Roll)</th>
                        <th className="py-2.5 px-3 text-right">Coil (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Strip (Roll)</th>
                        <th className="py-2.5 px-3 text-right">Strip (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Total Ton</th>
                        <th className="py-2.5 px-3 text-right">Okupansi (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {coilStripData.map((c) => (
                        <tr key={c.area || c.gudang} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{c.area || c.gudang}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">{formatTon(c.kapasitas, { decimals: 0 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{c.coilQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-700">{formatTon(c.coilTon, { decimals: 1 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{c.stripQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{formatTon(c.stripTon, { decimals: 1 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatTon(c.totalTon, { decimals: 1 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">{c.persenTerisi}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 5: STOCK NC & KARANTINA MUTU                                      */}
          {/* ========================================================================= */}
          {activeSubTab === 'nc_stock' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Pipa NC Karantina</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-rose-700">{formatTon(ncStockMetrics.totalNC, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton ({ncStockMetrics.ncRatio}% stok)</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Grade C (Defect Mutu Ringan)</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-amber-700">{formatTon(ncStockMetrics.totalGradeC, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Grade E (Reject / Karat)</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-rose-700">{formatTon(ncStockMetrics.totalGradeE, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Item NC Tercatat</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{ncStockMetrics.totalItemsCount}</span>
                    <span className="text-xs text-slate-400 font-semibold">Line Item</span>
                  </div>
                </div>
              </div>

              {/* Chart Sebaran Prime vs NC */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-3">Distribusi Mutu Pipa per Gudang (Prime vs Grade C vs Grade E)</h4>
                <div className="h-64">
                  <Bar
                    data={ncStackedChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' }, tooltip: { ...tooltipStyleStrong } },
                      scales: {
                        x: { stacked: true, grid: { display: false } },
                        y: { stacked: true, ticks: { callback: (v) => `${v} T` } },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Table Sebaran Pipa NC */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'nc_stock'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Rincian Karantina Pipa Non-Conforming per Gudang
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFullscreenTable(fullscreenTable === 'nc_stock' ? null : 'nc_stock')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {fullscreenTable === 'nc_stock' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-3">Gudang</th>
                        <th className="py-2.5 px-3 text-right">Prime OK (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Grade C (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Grade E (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Total NC (Ton)</th>
                        <th className="py-2.5 px-3 text-right">% NC Gudang</th>
                        <th className="py-2.5 px-3 text-center">Status Mutu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {ncWarehouseData.map((w) => {
                        const totalNcWh = (w.gradeC || 0) + (w.gradeE || 0);
                        const totalWh = (w.prime || 0) + totalNcWh;
                        const pctNc = totalWh > 0 ? Number(((totalNcWh / totalWh) * 100).toFixed(1)) : 0;
                        return (
                          <tr key={w.gudang} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{w.gudang}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatTon(w.prime, { decimals: 1 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-bold">{formatTon(w.gradeC, { decimals: 1 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">{formatTon(w.gradeE, { decimals: 1 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatTon(totalNcWh, { decimals: 1 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">{pctNc}%</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={cn(
                                'px-2 py-0.5 rounded-md text-[10.5px] font-bold',
                                pctNc > 10 ? 'bg-rose-100 text-rose-800' : pctNc > 4 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              )}>
                                {pctNc > 10 ? 'Kritis' : pctNc > 4 ? 'Perhatian' : 'Terkendali'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 6: PROGRES NC & REPAIR (PIPELINE 309/261/262/101)                 */}
          {/* ========================================================================= */}
          {activeSubTab === 'nc_progress' && (
            <div className="space-y-4">
              {/* Funnel Pipeline */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-3 tracking-tight">
                  Pipeline Alur Pemulihan Pipa NC &amp; Repair
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="bg-rose-50/50 border border-rose-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-rose-700 block">1. NC Masuk (MVT 309)</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-slate-900">{formatTon((report?.ncSummary?.total309Kg ?? 0) / 1000, { decimals: 1 })}</span>
                        <span className="text-xs text-slate-500 font-semibold">Ton</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-rose-100">
                      {(report?.ncSummary?.total309Qty ?? 0).toLocaleString('id-ID')} Batang
                    </span>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-700 block">2. Kirim Repair (MVT 261)</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-slate-900">{formatTon((report?.ncSummary?.total261Kg ?? 0) / 1000, { decimals: 1 })}</span>
                        <span className="text-xs text-slate-500 font-semibold">Ton</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-amber-100">
                      {(report?.ncSummary?.total261Qty ?? 0).toLocaleString('id-ID')} Batang
                    </span>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block">3. Return Repair (MVT 262)</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-slate-900">{formatTon((report?.ncSummary?.total262Kg ?? 0) / 1000, { decimals: 1 })}</span>
                        <span className="text-xs text-slate-500 font-semibold">Ton</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200">
                      {(report?.ncSummary?.total262Qty ?? 0).toLocaleString('id-ID')} Batang
                    </span>
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 block">4. Selesai Prime (MVT 101)</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-slate-900">{formatTon((report?.ncSummary?.total101Kg ?? 0) / 1000, { decimals: 1 })}</span>
                        <span className="text-xs text-slate-500 font-semibold">Ton</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold font-mono mt-2 pt-2 border-t border-emerald-100">
                      {report?.ncSummary?.recoveryRate ?? 0}% Recovery Rate
                    </span>
                  </div>

                  <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">5. Sisa Antrean NC</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-amber-800">{formatTon((report?.ncSummary?.netOutstandingKg ?? 0) / 1000, { decimals: 1 })}</span>
                        <span className="text-xs text-slate-500 font-semibold">Ton</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200">
                      {(report?.ncSummary?.netOutstandingQty ?? 0).toLocaleString('id-ID')} Batang
                    </span>
                  </div>
                </div>
              </div>

              {/* Work Center Leaderboard */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'work_center'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Performa Stasiun Perbaikan (Work Center Repair)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFullscreenTable(fullscreenTable === 'work_center' ? null : 'work_center')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {fullscreenTable === 'work_center' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Work Center / Mesin</th>
                        <th className="py-2.5 px-3 text-right">Dikerjakan (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Dikerjakan (Btg)</th>
                        <th className="py-2.5 px-3 text-right">Selesai Prime (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Selesai Prime (Btg)</th>
                        <th className="py-2.5 px-3 text-right">Recovery Rate (%)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {(report?.ncSummary?.workCenterBreakdown ?? []).map((wc, idx) => (
                        <tr key={wc.workCenter} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{wc.workCenter}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatTon(wc.issuedKg / 1000, { decimals: 2 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{wc.issuedQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{formatTon(wc.completedKg / 1000, { decimals: 2 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{wc.completedQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={cn(
                              'px-2 py-0.5 rounded-md text-[11px]',
                              wc.recoveryRate >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            )}>
                              {wc.recoveryRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={cn('inline-block w-2 h-2 rounded-full', wc.recoveryRate >= 85 ? 'bg-emerald-500' : 'bg-amber-500')} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 7: STOCK PIPA VS LOO                                              */}
          {/* ========================================================================= */}
          {activeSubTab === 'loo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Kebutuhan LOO</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{formatTon(looMetrics.totalLooTon, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton ({looMetrics.count} Order)</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Stok Alokasi Siap Kirim</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-emerald-700">{formatTon(looMetrics.totalStockTon, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Defisit / Kurang Kirim</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-rose-600">{formatTon(looMetrics.totalKurangTon, { decimals: 1 })}</span>
                    <span className="text-xs text-slate-400 font-semibold">Ton</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Tingkat Pemenuhan Order</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{looMetrics.fulfillmentRate}</span>
                    <span className="text-xs text-slate-400 font-semibold">%</span>
                  </div>
                </div>
              </div>

              {/* Table LOO */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'loo'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Komitmen Order Pengiriman (LOO) vs Ketersediaan Stok Pipa
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFullscreenTable(fullscreenTable === 'loo' ? null : 'loo')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {fullscreenTable === 'loo' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Ukuran Pipa</th>
                        <th className="py-2.5 px-3">Tipe</th>
                        <th className="py-2.5 px-3 text-right">Order LOO (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Stok Siap (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Kurang (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Fulfillment (%)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {looMetrics.combined.slice(0, 50).map((item, idx) => {
                        const shortage = Math.max(0, (item.looTon || 0) - (item.totalStockTon || 0));
                        const pct = item.persenFulfillment || 0;
                        const isFulfilled = pct >= 100;
                        const isPartial = pct >= 50 && pct < 100;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{item.customer || '-'}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">{item.ukuran || '-'}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-600">{item.type}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatTon(item.looTon, { decimals: 2 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{formatTon(item.totalStockTon, { decimals: 2 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">{formatTon(shortage, { decimals: 2 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">{pct.toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={cn(
                                'px-2 py-0.5 rounded-md text-[10.5px] font-bold',
                                isFulfilled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isPartial ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              )}>
                                {isFulfilled ? 'Terpenuhi' : isPartial ? 'Sebagian' : 'Defisit'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 8: UNFIFO (AUDIT ALUR PENGELUARAN)                                 */}
          {/* ========================================================================= */}
          {activeSubTab === 'unfifo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Kasus UNFIFO</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-rose-700">{unfifoMetrics.totalCases}</span>
                    <span className="text-xs text-slate-400 font-semibold">Insiden Terdeteksi</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Pelanggaran Pipa</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{unfifoMetrics.pipeCount}</span>
                    <span className="text-xs text-slate-400 font-semibold">Kasus ({formatTon(unfifoMetrics.pipeTon, { decimals: 1 })} T)</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Pelanggaran Coil / Strip</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{unfifoMetrics.coilCount}</span>
                    <span className="text-xs text-slate-400 font-semibold">Kasus ({formatTon(unfifoMetrics.coilTon, { decimals: 1 })} T)</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Skor Kepatuhan FIFO</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-emerald-700">{unfifoMetrics.complianceScore}</span>
                    <span className="text-xs text-slate-400 font-semibold">%</span>
                  </div>
                </div>
              </div>

              {/* Table UNFIFO Pipa & Coil */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'unfifo'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Log Temuan Alur Pengeluaran Non-FIFO (Pipa &amp; Coil)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFullscreenTable(fullscreenTable === 'unfifo' ? null : 'unfifo')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {fullscreenTable === 'unfifo' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-3">Gudang</th>
                        <th className="py-2.5 px-3">Tipe</th>
                        <th className="py-2.5 px-3">Material</th>
                        <th className="py-2.5 px-3">Batch Terlompati</th>
                        <th className="py-2.5 px-3 text-right">Berat (Ton/Kg)</th>
                        <th className="py-2.5 px-3">Alasan / Catatan</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {unfifoPipeData.map((p, idx) => (
                        <tr key={`p-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{p.gudang}</td>
                          <td className="py-2.5 px-3 font-semibold text-sky-700">Pipa</td>
                          <td className="py-2.5 px-3 font-mono">{p.kodeMaterial} ({p.ukuran || '-'})</td>
                          <td className="py-2.5 px-3 font-mono text-rose-700 font-bold">{p.batch}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatTon(p.tonase, { decimals: 2 })}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.issueNote || p.unfifoStatus || 'Tertindih tumpukan baru'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Investigasi
                            </span>
                          </td>
                        </tr>
                      ))}
                      {unfifoCoilData.map((c, idx) => (
                        <tr key={`c-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{c.gudang}</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-700">Coil/Strip</td>
                          <td className="py-2.5 px-3 font-mono">{c.kodeMaterial} ({c.specification || '-'})</td>
                          <td className="py-2.5 px-3 font-mono text-rose-700 font-bold">{c.batch}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatTon(c.tonase, { decimals: 2 })}</td>
                          <td className="py-2.5 px-3 text-slate-600">{c.issueNote || c.unfifoStatus || 'Prioritas schedule slit'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Investigasi
                            </span>
                          </td>
                        </tr>
                      ))}
                      {unfifoMetrics.totalCases === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                            Tidak ada pelanggaran alur pengeluaran (UNFIFO) yang terdeteksi pada pekan ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 9: PACKAGING (RTP & RUSAK)                                        */}
          {/* ========================================================================= */}
          {activeSubTab === 'packaging' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Box RTP Beredar</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{packagingMetrics.totalStockBox.toLocaleString('id-ID')}</span>
                    <span className="text-xs text-slate-400 font-semibold">Box</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Buffer Surplus (&ge;130%)</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-emerald-700">{packagingMetrics.surplusCount}</span>
                    <span className="text-xs text-slate-400 font-semibold">Item Customer</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Buffer Defisit (&lt;100%)</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-rose-600">{packagingMetrics.defisitCount}</span>
                    <span className="text-xs text-slate-400 font-semibold">Customer Defisit</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Box Rusak (NG)</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-amber-700">{packagingMetrics.damagedCount}</span>
                    <span className="text-xs text-slate-400 font-semibold">Box Teridentifikasi</span>
                  </div>
                </div>
              </div>

              {/* Table Packaging RTP Customer */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'packaging'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Monitoring Buffer Stock Packaging RTP Customer
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFullscreenTable(fullscreenTable === 'packaging' ? null : 'packaging')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {fullscreenTable === 'packaging' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Type Box</th>
                        <th className="py-2.5 px-3 text-right">Kebutuhan / Hari</th>
                        <th className="py-2.5 px-3 text-right">Saldo Aktual</th>
                        <th className="py-2.5 px-3 text-right">OUT</th>
                        <th className="py-2.5 px-3 text-right">IN</th>
                        <th className="py-2.5 px-3 text-center">Status Buffer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {incomingPackagingData.map((item, idx) => {
                        const std = getStandarBuffer(packagingBufferConfig, item.customer, item.type, item.qtyBoxKirimHari);
                        const stock = Number(item.stockSaatIni !== undefined ? item.stockSaatIni : (item.stockAktualInternal || 0));
                        const st = item.statusKategori || getPackagingBufferStatus(stock, std);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{item.customer}</td>
                            <td className="py-2.5 px-3 font-semibold text-emerald-800">{item.type}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-700">{std}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{stock}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-600">{item.outQty || '-'}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{item.inQty || '-'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={cn(
                                'px-2 py-0.5 rounded-md text-[10.5px] font-bold',
                                st === 'SURPLUS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : st === 'SESUAI' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              )}>
                                {st === 'SURPLUS' ? 'Surplus' : st === 'SESUAI' ? 'Pas / Sesuai' : 'Defisit'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 10: PRODUKTIVITAS GUDANG (MB51)                                   */}
          {/* ========================================================================= */}
          {activeSubTab === 'productivity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Volume Handling</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">
                      {formatTon((report?.productivitySummary?.totalTonase ?? 0) / 1000, { decimals: 1 })}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Ton</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Transaksi Ritase</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-sky-700">
                      {(report?.productivitySummary?.totalTransaksi ?? 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Tx</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Rata-rata Output per Man</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-emerald-700">
                      {(report?.productivitySummary?.avgKgPerMan ?? 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Kg/Man</span>
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-medium text-slate-500 block">Rata-rata Ritase per Man</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">
                      {report?.productivitySummary?.avgTxPerMan ?? 0}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Tx/Man</span>
                  </div>
                </div>
              </div>

              {/* Table Gudang MB51 */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'productivity'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Ranking Volume &amp; Beban Kerja Penanganan per Gudang
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFullscreenTable(fullscreenTable === 'productivity' ? null : 'productivity')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {fullscreenTable === 'productivity' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-3">Gudang</th>
                        <th className="py-2.5 px-3 text-right">Volume Handling (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Transaksi (Tx)</th>
                        <th className="py-2.5 px-3 text-right">Pangsa Volume (%)</th>
                        <th className="py-2.5 px-3 text-right">Efisiensi (Kg/Man)</th>
                        <th className="py-2.5 px-3 text-center">Tingkat Beban</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {(report?.productivitySummary?.warehouseBreakdown ?? []).map((w) => (
                        <tr key={w.warehouse} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{w.warehouse}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatTon(w.tonase / 1000, { decimals: 1 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{w.transaksi}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-700">{w.sharePercent}%</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{w.avgKgPerMan.toLocaleString('id-ID')}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={cn(
                              'px-2 py-0.5 rounded-md text-[10.5px] font-bold',
                              w.sharePercent > 15 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-50 text-slate-700 border border-slate-200'
                            )}>
                              {w.sharePercent > 15 ? 'Utama / Padat' : 'Standar'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
