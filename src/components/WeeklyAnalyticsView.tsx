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
import { Bar } from 'react-chartjs-2';
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
} from 'lucide-react';
import {
  WeeklyPeriod,
  WeeklyReportData,
} from '@/lib/weeklyAnalytics';
import { exportWeeklyAnalyticsToExcel } from '@/lib/exportWeeklyExcel';
import { cn, formatTon } from '@/lib/utils';
import { tooltipStyleStrong } from '@/lib/chartTheme';

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

interface WeeklyAnalyticsViewProps {
  onOpenUploadModal?: () => void;
}

type SubTab = 'overview' | 'nc' | 'productivity' | 'capacity';

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

export default function WeeklyAnalyticsView({
  onOpenUploadModal,
}: WeeklyAnalyticsViewProps) {
  const [availableWeeks, setAvailableWeeks] = useState<WeeklyPeriod[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [fullscreenTable, setFullscreenTable] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch data dari API /api/weekly
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
      setError(err?.message || 'Terjadi kesalahan sistem saat memuat data');
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

  // Chart Data untuk Tren NC Harian (MVT 309, 261, 101)
  const ncDailyChartData = useMemo(() => {
    if (!report?.ncSummary?.dailyBreakdown) {
      return { labels: [], datasets: [] };
    }
    const days = report.ncSummary.dailyBreakdown;
    const labels = days.map((d) => `${d.dayName} (${d.date.slice(8, 10)})`);
    const inNcTon = days.map((d) => Number((d.inNcKg / 1000).toFixed(2)));
    const issuedTon = days.map((d) => Number((d.issuedRepairKg / 1000).toFixed(2)));
    const completedTon = days.map((d) => Number((d.completedPrimeKg / 1000).toFixed(2)));

    return {
      labels,
      datasets: [
        {
          label: 'NC Masuk (MVT 309)',
          data: inNcTon,
          backgroundColor: '#ef4444',
          hoverBackgroundColor: '#dc2626',
          borderRadius: 4,
          maxBarThickness: 32,
        },
        {
          label: 'Kirim Repair (MVT 261)',
          data: issuedTon,
          backgroundColor: '#d97706',
          hoverBackgroundColor: '#b45309',
          borderRadius: 4,
          maxBarThickness: 32,
        },
        {
          label: 'Selesai Repair (MVT 101)',
          data: completedTon,
          backgroundColor: '#059669',
          hoverBackgroundColor: '#047857',
          borderRadius: 4,
          maxBarThickness: 32,
        },
      ],
    };
  }, [report]);

  // Chart Data untuk Tren Produktivitas Harian (MB51 Tonase)
  const prodDailyChartData = useMemo(() => {
    if (!report?.productivitySummary?.dailyTrend) {
      return { labels: [], datasets: [] };
    }
    const days = report.productivitySummary.dailyTrend;
    const labels = days.map((d) => `${d.dayName} (${d.date.slice(8, 10)})`);
    const tonase = days.map((d) => Number((d.tonase / 1000).toFixed(2)));

    return {
      labels,
      datasets: [
        {
          label: 'Volume Handling (Ton)',
          data: tonase,
          backgroundColor: '#0284c7',
          hoverBackgroundColor: '#0369a1',
          borderRadius: 6,
          maxBarThickness: 42,
        },
      ],
    };
  }, [report]);

  // Chart Data untuk Performa Shift (MB51)
  const shiftChartData = useMemo(() => {
    if (!report?.productivitySummary?.shiftBreakdown) {
      return { labels: [], datasets: [] };
    }
    const shifts = report.productivitySummary.shiftBreakdown;
    return {
      labels: ['Shift 1 (07:00–15:00)', 'Shift 2 (15:00–23:00)', 'Shift 3 (23:00–07:00)'],
      datasets: [
        {
          label: 'Tonase (Ton)',
          data: [
            Number((shifts['Shift 1'].tonase / 1000).toFixed(2)),
            Number((shifts['Shift 2'].tonase / 1000).toFixed(2)),
            Number((shifts['Shift 3'].tonase / 1000).toFixed(2)),
          ],
          backgroundColor: ['#059669', '#0284c7', '#d97706'],
          hoverBackgroundColor: ['#047857', '#0369a1', '#b45309'],
          borderRadius: 6,
          maxBarThickness: 48,
        },
      ],
    };
  }, [report]);

  return (
    <div className="space-y-3.5 pb-10">
      {/* Toast Notifikasi */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950 text-white text-xs font-semibold shadow-lg border border-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP BANNER HEADER (Standard Spindo Dark Emerald Theme) */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <BarChart3 className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <h1 className="text-base font-bold text-white font-sans tracking-tight">
            Analisis Mingguan
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
          {/* Week Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedWeekId}
              onChange={(e) => handleWeekChange(e.target.value)}
              disabled={isLoading || availableWeeks.length === 0}
              className="text-xs font-semibold text-emerald-100 bg-emerald-800/90 hover:bg-emerald-700/90 border border-emerald-700/80 rounded-xl px-3 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400/30 cursor-pointer shadow-2xs pr-8 transition-colors disabled:opacity-50"
              title="Pilih pekan kalender analisa"
            >
              {availableWeeks.map((w) => (
                <option key={w.id} value={w.id} className="text-slate-900 bg-white font-sans">
                  {w.label} ({w.startDate.slice(5)} s/d {w.endDate.slice(5)})
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
            title="Segarkan data mingguan"
            className="p-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/90 text-emerald-100 border border-emerald-700/80 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={isLoading || !report}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/90 text-emerald-100 font-semibold text-xs transition-colors border border-emerald-700/80 disabled:opacity-40 cursor-pointer"
            title="Download Laporan Excel Mingguan (5 Sheet Lengkap)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Mengagregasi data operasional mingguan...</p>
        </div>
      )}

      {/* Content when ready */}
      {!isLoading && report && (
        <>
          {/* 2. UNIFIED OPERATIONAL METRIC LEDGER (Consistent with ProductivityView) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-100">
              {/* Metric 1: NC Recovery Rate */}
              <div className="p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      NC Recovery Rate
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-semibold font-mono px-2 py-0.5 rounded-md',
                        report.ncSummary.recoveryRate >= 85
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      )}
                    >
                      {report.ncSummary.recoveryRate >= 85 ? 'Target Tercapai' : 'Perlu Optimasi'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                      {report.ncSummary.recoveryRate}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">%</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Selesai <strong className="font-semibold text-emerald-700">{formatTon(report.ncSummary.total101Kg / 1000, { decimals: 1 })} T</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Net Kirim <strong className="font-semibold text-slate-700">{formatTon(report.ncSummary.netRepairIssuedKg / 1000, { decimals: 1 })} T</strong></span>
                </div>
              </div>

              {/* Metric 2: NC Masuk (MVT 309) & Antrean */}
              <div className="p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      NC Masuk (MVT 309)
                    </span>
                    <span className="text-[11px] font-semibold font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {report.ncSummary.total309Qty.toLocaleString('id-ID')} Btg
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                      {formatTon(report.ncSummary.total309Kg / 1000, { decimals: 1 })}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Ton</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Antrean <strong className="font-semibold text-amber-700">{formatTon(report.ncSummary.netOutstandingKg / 1000, { decimals: 1 })} T</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>{report.ncSummary.netOutstandingQty.toLocaleString('id-ID')} btg sisa</span>
                </div>
              </div>

              {/* Metric 3: Handling Produktivitas MB51 (Soft Emerald Accent) */}
              <div className="p-4 sm:p-5 flex flex-col justify-between bg-emerald-50/20">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-800">
                      Handling MB51
                    </span>
                    <span className="text-[11px] font-semibold font-mono text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      {report.productivitySummary.totalTransaksi.toLocaleString('id-ID')} Tx
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700 tracking-tight tabular-nums">
                      {formatTon(report.productivitySummary.totalTonase / 1000, { decimals: 1 })}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600/80">Ton</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-emerald-100/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Efisiensi</span>
                  <span className="font-semibold text-emerald-800 font-mono">
                    {report.productivitySummary.avgKgPerMan.toLocaleString('id-ID')} Kg/Man
                  </span>
                </div>
              </div>

              {/* Metric 4: Delta Stok & Okupansi Kapasitas */}
              <div className="p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      Delta Stok Pipa
                    </span>
                    <span className="text-[11px] font-semibold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      {report.capacitySummary.avgPipeOccupancy}% Okupansi
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                      {report.capacitySummary.deltaPipeStock >= 0 ? '+' : ''}
                      {formatTon(report.capacitySummary.deltaPipeStock / 1000, { decimals: 1 })}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Ton</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Stok Akhir <strong className="font-semibold text-slate-800">{formatTon(report.capacitySummary.endPipeStock / 1000, { decimals: 1 })} T</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Coil <strong className="font-semibold text-slate-800">{formatTon(report.capacitySummary.endCoilStock / 1000, { decimals: 1 })} T</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SEGMENTED SUB-TABS (Minimalist & Clean Matching App Standards) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-2.5 sm:p-3">
            <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 shadow-2xs overflow-x-auto scrollbar-none max-w-full shrink-0">
              {[
                { id: 'overview', label: 'Ringkasan Eksekutif', icon: Award },
                { id: 'nc', label: 'Progres NC & Repair', icon: GitFork },
                { id: 'productivity', label: 'Produktivitas Gudang (MB51)', icon: Users },
                { id: 'capacity', label: 'Pergerakan Stok & Kapasitas', icon: Layers },
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* SUB-TAB 1: RINGKASAN EKSEKUTIF */}
          {activeSubTab === 'overview' && (
            <div className="space-y-4">
              {/* Dual Column: Tren NC Harian & Volume Shift MB51 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Tren NC Harian */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                        Tren Pemulihan NC Harian
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        NC Masuk (309) vs Kirim Repair (261) vs Selesai (101)
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                      7 Hari
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
                          tooltip: {
                            ...tooltipStyleStrong,
                          },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { font: { family: 'ui-monospace, monospace', size: 10 } },
                          },
                          y: {
                            grid: { color: '#f1f5f9' },
                            ticks: {
                              font: { family: 'ui-monospace, monospace', size: 10 },
                              callback: (v: any) => `${v} T`,
                            },
                          },
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
                        Perbandingan output tonase Shift 1, Shift 2, dan Shift 3
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                      Akumulasi Pekan
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
                          tooltip: {
                            ...tooltipStyleStrong,
                          },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { font: { size: 10, weight: 'bold' as const } },
                          },
                          y: {
                            grid: { color: '#f1f5f9' },
                            ticks: {
                              font: { family: 'ui-monospace, monospace', size: 10 },
                              callback: (v: any) => `${v} T`,
                            },
                          },
                        },
                      }}
                    />
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
                        Poin Evaluasi &amp; Rekomendasi Eksekutif
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Sintesis cerdas performa operasional pekan {report.period.label}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {report.period.startDate} s/d {report.period.endDate}
                  </span>
                </div>

                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.keyInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 rounded-xl flex items-start gap-3 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-200/60 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold font-mono">
                        {idx + 1}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        {insight}
                      </p>
                    </div>
                  ))}
                  {report.keyInsights.length === 0 && (
                    <p className="text-xs text-slate-500 italic p-3 col-span-2 text-center">
                      Belum ada cukup data aktivitas pada pekan ini untuk menghasilkan kesimpulan otomatis.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: PROGRES NC & REPAIR */}
          {activeSubTab === 'nc' && (
            <div className="space-y-4">
              {/* Funnel Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-3 tracking-tight">
                  Pipeline Pemulihan Pipa Non-Conforming (NC)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {/* Step 1: 309 In */}
                  <div className="bg-rose-50/50 border border-rose-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-rose-700 block">1. NC Masuk (MVT 309)</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {formatTon(report.ncSummary.total309Kg / 1000, { decimals: 1 })}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">Ton</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-rose-100">
                      {report.ncSummary.total309Qty.toLocaleString('id-ID')} Batang
                    </span>
                  </div>

                  {/* Step 2: 261 Kirim Repair */}
                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-700 block">2. Kirim Repair (MVT 261)</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {formatTon(report.ncSummary.total261Kg / 1000, { decimals: 1 })}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">Ton</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-amber-100">
                      {report.ncSummary.total261Qty.toLocaleString('id-ID')} Batang
                    </span>
                  </div>

                  {/* Step 3: 262 Return */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block">3. Return Repair (MVT 262)</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {formatTon(report.ncSummary.total262Kg / 1000, { decimals: 1 })}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">Ton</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200">
                      {report.ncSummary.total262Qty.toLocaleString('id-ID')} Batang
                    </span>
                  </div>

                  {/* Step 4: 101 Selesai Prime */}
                  <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 block">4. Selesai Prime (MVT 101)</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {formatTon(report.ncSummary.total101Kg / 1000, { decimals: 1 })}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">Ton</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold font-mono mt-2 pt-2 border-t border-emerald-100">
                      {report.ncSummary.recoveryRate}% Recovery Rate
                    </span>
                  </div>

                  {/* Step 5: Sisa Antrean */}
                  <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">5. Sisa Antrean NC</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-amber-800">
                          {formatTon(report.ncSummary.netOutstandingKg / 1000, { decimals: 1 })}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">Ton</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200">
                      {report.ncSummary.netOutstandingQty.toLocaleString('id-ID')} Batang
                    </span>
                  </div>
                </div>
              </div>

              {/* Work Center Leaderboard Table */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'work_center'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Performa Stasiun Perbaikan (Work Center)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ranking stasiun repair berdasarkan volume pipa yang diselesaikan (MVT 101)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {report.ncSummary.workCenterBreakdown.length} Mesin
                    </span>
                    <button
                      type="button"
                      onClick={() => setFullscreenTable(fullscreenTable === 'work_center' ? null : 'work_center')}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={fullscreenTable === 'work_center' ? 'Tutup layar penuh' : 'Layar penuh'}
                    >
                      {fullscreenTable === 'work_center' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
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
                      {report.ncSummary.workCenterBreakdown.map((wc, idx) => (
                        <tr key={wc.workCenter} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{wc.workCenter}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatTon(wc.issuedKg / 1000, { decimals: 2 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{wc.issuedQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatTon(wc.completedKg / 1000, { decimals: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{wc.completedQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md font-bold text-[11px]',
                                wc.recoveryRate >= 85
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              )}
                            >
                              {wc.recoveryRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={cn(
                                'inline-block w-2 h-2 rounded-full',
                                wc.recoveryRate >= 85 ? 'bg-emerald-500' : 'bg-amber-500'
                              )}
                            />
                          </td>
                        </tr>
                      ))}
                      {report.ncSummary.workCenterBreakdown.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                            Tidak ada transaksi Work Center repair pada pekan ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>

              {/* Dual Breakdown: Gudang Asal NC & Top 10 Material NC */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gudang Asal NC */}
                <TableCardContainer
                  isFullscreen={fullscreenTable === 'nc_sloc'}
                  onCloseFullscreen={() => setFullscreenTable(null)}
                >
                  <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                        Gudang Sumber NC Terbanyak
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Distribusi lokasi penemuan pipa non-conforming
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFullscreenTable(fullscreenTable === 'nc_sloc' ? null : 'nc_sloc')}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {fullscreenTable === 'nc_sloc' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                          <th className="py-2.5 px-3">Gudang</th>
                          <th className="py-2.5 px-3 text-right">NC Masuk (Ton)</th>
                          <th className="py-2.5 px-3 text-right">Btg</th>
                          <th className="py-2.5 px-3 text-right">Selesai (Ton)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.ncSummary.storageLocationBreakdown.map((s) => (
                          <tr key={s.gudang} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{s.gudang}</td>
                            <td className="py-2.5 px-3 text-right text-rose-600 font-mono font-semibold">
                              {formatTon(s.inNcKg / 1000, { decimals: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500 font-mono">{s.inNcQty}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-600 font-mono font-semibold">
                              {formatTon(s.completedKg / 1000, { decimals: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TableCardContainer>

                {/* Top Material NC */}
                <TableCardContainer
                  isFullscreen={fullscreenTable === 'nc_material'}
                  onCloseFullscreen={() => setFullscreenTable(null)}
                >
                  <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                        Top Material NC Direpair
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Material pipa yang paling sering masuk proses repair
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFullscreenTable(fullscreenTable === 'nc_material' ? null : 'nc_material')}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {fullscreenTable === 'nc_material' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                          <th className="py-2.5 px-3">Material &amp; Deskripsi</th>
                          <th className="py-2.5 px-3 text-right">NC Masuk (Ton)</th>
                          <th className="py-2.5 px-3 text-right">Selesai (Ton)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.ncSummary.topMaterials.slice(0, 7).map((m) => (
                          <tr key={m.material} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900 block font-mono text-[11px]">{m.material}</span>
                              <span className="text-[11px] text-slate-500 truncate max-w-xs block">{m.description || '-'}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                              {formatTon(m.inNcKg / 1000, { decimals: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600">
                              {formatTon(m.completedKg / 1000, { decimals: 2 })}
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

          {/* SUB-TAB 3: PRODUKTIVITAS GUDANG (MB51) */}
          {activeSubTab === 'productivity' && (
            <div className="space-y-4">
              {/* Daily Trend Handling */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Tren Volume Handling Harian (MB51)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tonase pergerakan material in/out selama sepekan kerja
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200/60">
                    Total: {formatTon(report.productivitySummary.totalTonase / 1000, { decimals: 1, showUnit: true })}
                  </span>
                </div>
                <div className="p-4 h-64">
                  <Bar
                    data={prodDailyChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          ...tooltipStyleStrong,
                        },
                      },
                      scales: {
                        x: {
                          grid: { display: false },
                          ticks: { font: { family: 'ui-monospace, monospace', size: 10 } },
                        },
                        y: {
                          grid: { color: '#f1f5f9' },
                          ticks: {
                            font: { family: 'ui-monospace, monospace', size: 10 },
                            callback: (v: any) => `${v} T`,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Warehouse Productivity Leaderboard */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'prod_wh'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Peringkat Produktivitas Gudang
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Perbandingan output penanganan tonase dan efisiensi rasio per manpower
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFullscreenTable(fullscreenTable === 'prod_wh' ? null : 'prod_wh')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {fullscreenTable === 'prod_wh' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Gudang</th>
                        <th className="py-2.5 px-3 text-right">Tonase (Ton)</th>
                        <th className="py-2.5 px-3 text-right">Transaksi (Rit)</th>
                        <th className="py-2.5 px-3 text-right">Efisiensi (Kg/Man)</th>
                        <th className="py-2.5 px-3 text-right">Pangsa Volume (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {report.productivitySummary.warehouseBreakdown.map((w, idx) => (
                        <tr key={w.warehouse} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{w.warehouse}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatTon(w.tonase / 1000, { decimals: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{w.transaksi}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-700">
                            {w.avgKgPerMan.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                            {w.sharePercent}%
                          </td>
                        </tr>
                      ))}
                      {report.productivitySummary.warehouseBreakdown.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                            Belum ada catatan transaksi produktivitas MB51 pada pekan ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TableCardContainer>
            </div>
          )}

          {/* SUB-TAB 4: KAPASITAS & PERGERAKAN STOK */}
          {activeSubTab === 'capacity' && (
            <div className="space-y-4">
              {/* Snapshot Comparison Baseline Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Perbandingan Stok Awal vs Akhir Pekan
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Baseline: Snapshot <strong>{report.capacitySummary.startSnapshotKey || 'Awal'}</strong> s/d <strong>{report.capacitySummary.endSnapshotKey || 'Akhir'}</strong>
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">Rata-rata Okupansi Pipa</span>
                    <span className="text-base font-bold font-mono text-slate-900">{report.capacitySummary.avgPipeOccupancy}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {/* Pipa Summary */}
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/70">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Stok Pipa Jadi</span>
                    <div className="flex items-baseline justify-between mt-2.5">
                      <div>
                        <span className="text-xs text-slate-500">Awal:</span>{' '}
                        <strong className="text-slate-900 font-mono font-semibold">
                          {formatTon(report.capacitySummary.startPipeStock / 1000, { decimals: 1, showUnit: true })}
                        </strong>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <span className="text-xs text-slate-500">Akhir:</span>{' '}
                        <strong className="text-slate-900 font-mono font-semibold">
                          {formatTon(report.capacitySummary.endPipeStock / 1000, { decimals: 1, showUnit: true })}
                        </strong>
                      </div>
                      <div>
                        <span
                          className={cn(
                            'text-xs font-bold font-mono px-2 py-0.5 rounded-md',
                            report.capacitySummary.deltaPipeStock >= 0
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {report.capacitySummary.deltaPipeStock >= 0 ? '+' : ''}
                          {formatTon(report.capacitySummary.deltaPipeStock / 1000, { decimals: 1, showUnit: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Coil Summary */}
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/70">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Stok Bahan Baku Coil</span>
                    <div className="flex items-baseline justify-between mt-2.5">
                      <div>
                        <span className="text-xs text-slate-500">Awal:</span>{' '}
                        <strong className="text-slate-900 font-mono font-semibold">
                          {formatTon(report.capacitySummary.startCoilStock / 1000, { decimals: 1, showUnit: true })}
                        </strong>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <span className="text-xs text-slate-500">Akhir:</span>{' '}
                        <strong className="text-slate-900 font-mono font-semibold">
                          {formatTon(report.capacitySummary.endCoilStock / 1000, { decimals: 1, showUnit: true })}
                        </strong>
                      </div>
                      <div>
                        <span
                          className={cn(
                            'text-xs font-bold font-mono px-2 py-0.5 rounded-md',
                            report.capacitySummary.deltaCoilStock >= 0
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {report.capacitySummary.deltaCoilStock >= 0 ? '+' : ''}
                          {formatTon(report.capacitySummary.deltaCoilStock / 1000, { decimals: 1, showUnit: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warehouse Table */}
              <TableCardContainer
                isFullscreen={fullscreenTable === 'cap_wh'}
                onCloseFullscreen={() => setFullscreenTable(null)}
              >
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Dinamika Pergerakan Stok per Gudang
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Rincian perubahan stok dan persentase okupansi per gudang
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFullscreenTable(fullscreenTable === 'cap_wh' ? null : 'cap_wh')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {fullscreenTable === 'cap_wh' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
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
                        <th className="py-2.5 px-3 text-right">Okupansi Akhir (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {report.capacitySummary.warehouseMovement.map((w) => (
                        <tr key={w.gudang} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{w.gudang}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {formatTon(w.kapasitas / 1000, { decimals: 1 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatTon(w.stockStart / 1000, { decimals: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatTon(w.stockEnd / 1000, { decimals: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            <span
                              className={cn(
                                'font-semibold',
                                w.deltaStock > 0 ? 'text-sky-600' : w.deltaStock < 0 ? 'text-amber-600' : 'text-slate-400'
                              )}
                            >
                              {w.deltaStock > 0 ? '+' : ''}{formatTon(w.deltaStock / 1000, { decimals: 2 })}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            <span
                              className={cn(
                                'font-bold px-2 py-0.5 rounded-md text-[11px]',
                                w.occupancyEnd >= 90
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                  : w.occupancyEnd >= 75
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              )}
                            >
                              {w.occupancyEnd}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {report.capacitySummary.warehouseMovement.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                            Belum ada catatan pergerakan kapasitas gudang pada pekan ini.
                          </td>
                        </tr>
                      )}
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
