'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  StockOpnameItem,
  STODifferenceStatus,
  StockOpnameSummary
} from '../types/warehouse';
import {
  calculateSTOSummary,
  calculateSTOGudangRecap,
  calculateSTOSLocRecap,
  generateMockStockOpnameData
} from '@/lib/parseStockOpname';
import { exportStockOpnameToExcel } from '@/lib/exportStockOpnameExcel';
import { formatTon, formatQty, formatPercent, cn } from '@/lib/utils';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  PlusCircle,
  Search,
  Filter,
  Download,
  RotateCcw,
  BarChart3,
  PieChart,
  Table2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Building2,
  MapPin,
  Maximize2,
  Minimize2,
  Calendar,
  Hash,
  Scale
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface StockOpnameViewProps {
  data?: StockOpnameItem[];
  isCustomizing?: boolean;
  onDataUpdate?: (newData: StockOpnameItem[]) => void;
  targetDate?: string;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'chart-sto-variance-bar', width: 'col-span-6' },
  { id: 'chart-sto-compare-bar', width: 'col-span-6' },
  { id: 'chart-sto-sloc-bar', width: 'col-span-8' },
  { id: 'chart-sto-donut', width: 'col-span-4' },
  { id: 'table-sto-detail', width: 'col-span-12' },
];

export const StockOpnameView: React.FC<StockOpnameViewProps> = ({
  data = [],
  isCustomizing = false,
  onDataUpdate,
  targetDate,
}) => {
  // Gunakan data props jika tersedia dan ada isinya, atau fallback ke mock data realistis
  const initialItems = useMemo(() => {
    return data && data.length > 0 ? data : generateMockStockOpnameData();
  }, [data]);

  const [items, setItems] = useState<StockOpnameItem[]>(initialItems);
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (data && data.length > 0) {
      setItems(data);
    }
  }, [data]);

  // Layout persistence
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_stock_opname_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_CARDS.length) {
          setCards(parsed);
          return;
        }
      }
    } catch {}
    setCards(DEFAULT_CARDS);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_stock_opname_v1', JSON.stringify(cards));
    } catch {}
  }, [cards, isMounted]);

  const handleWidthChange = (id: string, width: CardWidth) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, width } : c)));
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cards.length) return;
    setCards((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Filter & Search States
  const [activeTab, setActiveTab] = useState<'ALL' | 'SESUAI' | 'SELISIH_MINUS' | 'SELISIH_PLUS'>('ALL');
  const [selectedGudang, setSelectedGudang] = useState<string>('ALL');
  const [selectedSLoc, setSelectedSLoc] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toggles for chart view metrics
  const [varianceMetric, setVarianceMetric] = useState<'ton' | 'qty'>('ton');
  const [compareMetric, setCompareMetric] = useState<'ton' | 'qty'>('ton');

  // Table Sorting & Pagination
  const [sortField, setSortField] = useState<string>('differencesFinalQty');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Daftar opsi Gudang & SLoc yang tersedia
  const availableGudangs = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.gudang) set.add(i.gudang);
    });
    return Array.from(set).sort();
  }, [items]);

  const availableSLocs = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (selectedGudang === 'ALL' || i.gudang === selectedGudang) {
        if (i.sloc) set.add(i.sloc);
      }
    });
    return Array.from(set).sort();
  }, [items, selectedGudang]);

  // Reset SLoc filter if not in selected Gudang
  useEffect(() => {
    if (selectedSLoc !== 'ALL' && !availableSLocs.includes(selectedSLoc)) {
      setSelectedSLoc('ALL');
    }
  }, [selectedGudang, availableSLocs, selectedSLoc]);

  // Filter items berdasarkan Gudang, SLoc, Tab, dan Search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedGudang !== 'ALL' && item.gudang !== selectedGudang) return false;
      if (selectedSLoc !== 'ALL' && item.sloc !== selectedSLoc) return false;

      if (activeTab === 'SESUAI' && item.status !== 'SESUAI') return false;
      if (activeTab === 'SELISIH_MINUS' && item.status !== 'SELISIH_MINUS') return false;
      if (activeTab === 'SELISIH_PLUS' && item.status !== 'SELISIH_PLUS') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mat = (item.material || '').toLowerCase();
        const desc = (item.materialDescription || '').toLowerCase();
        const batch = (item.batch || '').toLowerCase();
        const lbl = (item.labelId || '').toLowerCase();
        const sloc = (item.sloc || '').toLowerCase();
        const gd = (item.gudang || '').toLowerCase();
        const uk = (item.ukuran || '').toLowerCase();

        return (
          mat.includes(q) ||
          desc.includes(q) ||
          batch.includes(q) ||
          lbl.includes(q) ||
          sloc.includes(q) ||
          gd.includes(q) ||
          uk.includes(q)
        );
      }

      return true;
    });
  }, [items, selectedGudang, selectedSLoc, activeTab, searchQuery]);

  // Sorting
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let valA: any = (a as any)[sortField];
      let valB: any = (b as any)[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortField, sortDir]);

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // Reset page jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedGudang, selectedSLoc, searchQuery]);

  // Ringkasan KPI dan Rekap
  const summary: StockOpnameSummary = useMemo(() => {
    return calculateSTOSummary(filteredItems);
  }, [filteredItems]);

  const allSummary: StockOpnameSummary = useMemo(() => {
    return calculateSTOSummary(items);
  }, [items]);

  const gudangRecap = useMemo(() => {
    return calculateSTOGudangRecap(
      items.filter((i) => {
        if (selectedSLoc !== 'ALL' && i.sloc !== selectedSLoc) return false;
        return true;
      })
    );
  }, [items, selectedSLoc]);

  const slocRecap = useMemo(() => {
    return calculateSTOSLocRecap(
      items.filter((i) => {
        if (selectedGudang !== 'ALL' && i.gudang !== selectedGudang) return false;
        return true;
      })
    );
  }, [items, selectedGudang]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleExport = () => {
    const filename = `Report_Stock_Opname_Spindo_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportStockOpnameToExcel(filteredItems, summary, gudangRecap, filename);
  };

  // ==========================================
  // CHART 1: SELISIH STO PER GUDANG (BAR)
  // ==========================================
  const varianceChartData = useMemo(() => {
    const activeGudangs = gudangRecap.filter((g) => g.itemCount > 0 || Math.abs(g.varianceTon) > 0.01 || Math.abs(g.varianceQty) > 0);
    const labels = activeGudangs.map((g) => g.gudang);
    const dataValues = activeGudangs.map((g) =>
      varianceMetric === 'ton' ? Number(g.varianceTon.toFixed(2)) : g.varianceQty
    );

    const backgroundColors = dataValues.map((v) =>
      v < 0 ? 'rgba(225, 29, 72, 0.85)' : v > 0 ? 'rgba(14, 165, 233, 0.85)' : 'rgba(16, 185, 129, 0.85)'
    );
    const borderColors = dataValues.map((v) =>
      v < 0 ? '#e11d48' : v > 0 ? '#0ea5e9' : '#10b981'
    );

    return {
      labels,
      datasets: [
        {
          label: varianceMetric === 'ton' ? 'Selisih Ton (Aktual - SAP)' : 'Selisih Qty Batang (Aktual - SAP)',
          data: dataValues,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 4,
          maxBarThickness: selectedGudang !== 'ALL' ? 44 : 34,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
      ],
    };
  }, [gudangRecap, varianceMetric, selectedGudang]);

  const varianceChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          titleColor: '#f8fafc',
          bodyColor: '#f1f5f9',
          titleFont: { size: 12, weight: 'bold' as const },
          bodyFont: { size: 11 },
          padding: { top: 8, bottom: 8, left: 12, right: 12 },
          cornerRadius: 8,
          boxPadding: 4,
          usePointStyle: true,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: (context: any) => {
              const val = context.raw;
              const unit = varianceMetric === 'ton' ? 'Ton' : 'Btg';
              const sign = val > 0 ? '+' : '';
              return ` Selisih: ${sign}${val} ${unit}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748b',
            font: { family: 'ui-monospace, monospace', size: 11, weight: 'bold' as const },
          },
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'ui-monospace, monospace', size: 10 },
            callback: (val: any) => `${val} ${varianceMetric === 'ton' ? 'T' : 'B'}`,
          },
        },
      },
    };
  }, [varianceMetric]);

  // ==========================================
  // CHART 2: PERBANDINGAN SAP VS FISIK (BAR)
  // ==========================================
  const compareChartData = useMemo(() => {
    const activeGudangs = gudangRecap.filter((g) => g.sapTon > 0 || g.actualTon > 0 || g.itemCount > 0);
    const labels = activeGudangs.map((g) => g.gudang);
    const sapValues = activeGudangs.map((g) =>
      compareMetric === 'ton' ? Number(g.sapTon.toFixed(2)) : g.sapQty
    );
    const actualValues = activeGudangs.map((g) =>
      compareMetric === 'ton' ? Number(g.actualTon.toFixed(2)) : g.actualQty
    );

    return {
      labels,
      datasets: [
        {
          label: compareMetric === 'ton' ? 'Buku SAP (Ton)' : 'Buku SAP (Btg)',
          data: sapValues,
          backgroundColor: 'rgba(100, 116, 139, 0.85)',
          borderColor: '#475569',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: selectedGudang !== 'ALL' ? 44 : 32,
          barPercentage: 0.7,
          categoryPercentage: 0.7,
        },
        {
          label: compareMetric === 'ton' ? 'Fisik Aktual (Ton)' : 'Fisik Aktual (Btg)',
          data: actualValues,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#059669',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: selectedGudang !== 'ALL' ? 44 : 32,
          barPercentage: 0.7,
          categoryPercentage: 0.7,
        },
      ],
    };
  }, [gudangRecap, compareMetric, selectedGudang]);

  const compareChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          titleColor: '#f8fafc',
          bodyColor: '#f1f5f9',
          titleFont: { size: 12, weight: 'bold' as const },
          bodyFont: { size: 11 },
          padding: { top: 8, bottom: 8, left: 12, right: 12 },
          cornerRadius: 8,
          boxPadding: 4,
          usePointStyle: true,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: (context: any) => {
              const val = context.raw;
              const unit = compareMetric === 'ton' ? 'Ton' : 'Btg';
              return ` ${context.dataset.label}: ${val} ${unit}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748b',
            font: { family: 'ui-monospace, monospace', size: 11, weight: 'bold' as const },
          },
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'ui-monospace, monospace', size: 10 },
            callback: (val: any) => `${val} ${compareMetric === 'ton' ? 'T' : 'B'}`,
          },
        },
      },
    };
  }, [compareMetric]);

  // ==========================================
  // CHART 3: DEVIASI SELISIH PER SLOC (BAR)
  // ==========================================
  const slocChartData = useMemo(() => {
    const sortedSLocs = [...slocRecap]
      .sort((a, b) => Math.abs(b.varianceTon) - Math.abs(a.varianceTon))
      .slice(0, 10);

    const labels = sortedSLocs.map((s) => `${s.sloc} (${s.gudang})`);
    const dataValues = sortedSLocs.map((s) => Number(s.varianceTon.toFixed(2)));

    const backgroundColors = dataValues.map((v) =>
      v < 0 ? 'rgba(225, 29, 72, 0.85)' : v > 0 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(16, 185, 129, 0.85)'
    );

    return {
      labels,
      datasets: [
        {
          label: 'Selisih Ton (SLoc)',
          data: dataValues,
          backgroundColor: backgroundColors,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: dataValues.map((v) => (v < 0 ? '#e11d48' : v > 0 ? '#f59e0b' : '#10b981')),
          maxBarThickness: 34,
          barPercentage: 0.7,
          categoryPercentage: 0.75,
        },
      ],
    };
  }, [slocRecap]);

  const slocChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          titleColor: '#f8fafc',
          bodyColor: '#f1f5f9',
          titleFont: { size: 12, weight: 'bold' as const },
          bodyFont: { size: 11 },
          padding: { top: 8, bottom: 8, left: 12, right: 12 },
          cornerRadius: 8,
          boxPadding: 4,
          usePointStyle: true,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: (context: any) => {
              const val = context.raw;
              const sign = val > 0 ? '+' : '';
              return ` Selisih: ${sign}${val} Ton`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748b',
            font: { family: 'ui-monospace, monospace', size: 11, weight: 'bold' as const },
          },
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'ui-monospace, monospace', size: 10 },
            callback: (val: any) => `${val} T`,
          },
        },
      },
    };
  }, []);

  // ==========================================
  // CHART 4: DOUGHNUT STATUS PROPORSI
  // ==========================================
  const donutChartData = useMemo(() => {
    return {
      labels: ['Sesuai (0)', 'Selisih Minus (-)', 'Selisih Plus (+)'],
      datasets: [
        {
          data: [summary.matchingItems, summary.minusItems, summary.plusItems],
          backgroundColor: [
            '#10b981', // Emerald 500
            '#f43f5e', // Rose 500
            '#f59e0b', // Amber 500
          ],
          hoverBackgroundColor: [
            '#059669',
            '#e11d48',
            '#d97706',
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  }, [summary]);

  const donutChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          titleColor: '#f8fafc',
          bodyColor: '#f1f5f9',
          titleFont: { size: 12, weight: 'bold' as const },
          bodyFont: { size: 11 },
          padding: { top: 8, bottom: 8, left: 12, right: 12 },
          cornerRadius: 8,
          boxPadding: 4,
          usePointStyle: true,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = summary.totalItems;
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return ` ${label}: ${value} item (${pct}%)`;
            },
          },
        },
      },
    };
  }, [summary]);

  return (
    <div className="space-y-4 font-sans text-slate-800 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <ClipboardCheck className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-sans tracking-tight">
              Stock Opname (STO) &amp; Rekonsiliasi Fisik vs SAP
            </h1>
            <p className="text-xs text-emerald-300/90 font-normal mt-0.5">
              Monitoring deviasi sensus fisik gudang vs saldo buku SAP Spindo Plant 1105
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleExport}
            title="Ekspor data ke Excel"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 hover:text-white border border-emerald-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Total Item */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Item Disensus</span>
            <Layers className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-slate-900">{formatQty(summary.totalItems)}</span>
            <span className="text-[11px] text-slate-500 font-mono">100%</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Total record opname SAP</p>
        </div>

        {/* Item Sesuai (Akurat) */}
        <div className="bg-white rounded-xl p-3 border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
            <span>Sesuai (Akurat)</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-emerald-700">{formatQty(summary.matchingItems)}</span>
            <span className="text-xs font-bold font-mono text-emerald-600">
              {summary.accuracyRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-emerald-600/80 mt-1 truncate">Selisih = 0 (Buku = Fisik)</p>
        </div>

        {/* Selisih Minus */}
        <div className="bg-white rounded-xl p-3 border border-rose-200/80 bg-rose-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-medium">
            <span>Selisih Minus (-)</span>
            <MinusCircle className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-rose-700">{formatQty(summary.minusItems)}</span>
            <span className="text-xs font-bold font-mono text-rose-600">
              -{formatTon(summary.totalMinusTon)} T
            </span>
          </div>
          <p className="text-[10px] text-rose-600/80 mt-1 truncate">Defisit (Fisik &lt; Buku SAP)</p>
        </div>

        {/* Selisih Plus */}
        <div className="bg-white rounded-xl p-3 border border-amber-200/80 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-medium">
            <span>Selisih Plus (+)</span>
            <PlusCircle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-700">{formatQty(summary.plusItems)}</span>
            <span className="text-xs font-bold font-mono text-amber-600">
              +{formatTon(summary.totalPlusTon)} T
            </span>
          </div>
          <p className="text-[10px] text-amber-700/80 mt-1 truncate">Surplus (Fisik &gt; Buku SAP)</p>
        </div>

        {/* Net Variance */}
        <div className="col-span-2 sm:col-span-1 bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium">
            <span>Net Variance (Total)</span>
            <Scale className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              className={cn(
                'text-xl font-bold font-mono',
                summary.netVarianceTon < 0
                  ? 'text-rose-600'
                  : summary.netVarianceTon > 0
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              )}
            >
              {summary.netVarianceTon > 0 ? '+' : ''}
              {formatTon(summary.netVarianceTon)} T
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {summary.netVarianceQty > 0 ? '+' : ''}
              {formatQty(summary.netVarianceQty)} btg
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Total deviasi tonase bersih</p>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Material, Batch, Label ID, SLoc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Gudang Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 shrink-0">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium text-[11px]">Gudang:</span>
            <select
              value={selectedGudang}
              onChange={(e) => setSelectedGudang(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">Semua Gudang ({availableGudangs.length})</option>
              {availableGudangs.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* SLoc Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 shrink-0">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium text-[11px]">SLoc:</span>
            <select
              value={selectedSLoc}
              onChange={(e) => setSelectedSLoc(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">Semua SLoc ({availableSLocs.length})</option>
              {availableSLocs.map((sloc) => (
                <option key={sloc} value={sloc}>
                  {sloc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reset Filter Button */}
        {(selectedGudang !== 'ALL' || selectedSLoc !== 'ALL' || searchQuery || activeTab !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSelectedGudang('ALL');
              setSelectedSLoc('ALL');
              setSearchQuery('');
              setActiveTab('ALL');
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      {/* 4. Customizable Grid Container for 4 Charts */}
      <div className="grid grid-cols-12 gap-3.5">
        {/* CARD 1: SELISIH STO PER GUDANG */}
        <CustomizableCard
          id="chart-sto-variance-bar"
          title="Selisih STO per Gudang"
          subtitle="Deviasi selisih kuantitas / tonase rekonsiliasi opname"
          icon={BarChart3}
          width={cards.find((c) => c.id === 'chart-sto-variance-bar')?.width || 'col-span-6'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-sto-variance-bar', w)}
          canMoveLeft={false}
          canMoveRight={true}
          onMoveRight={() => handleMove(0, 'right')}
          badge={
            <span className="text-[10px] font-mono bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-300">
              Per Gudang
            </span>
          }
          headerAction={
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-mono">
              <button
                type="button"
                onClick={() => setVarianceMetric('ton')}
                className={cn(
                  'px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer',
                  varianceMetric === 'ton'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Tonase
              </button>
              <button
                type="button"
                onClick={() => setVarianceMetric('qty')}
                className={cn(
                  'px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer',
                  varianceMetric === 'qty'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Qty Btg
              </button>
            </div>
          }
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div>
                {/* Custom Clean Legend */}
                <div className="flex flex-wrap items-center gap-4 mb-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    <span>Defisit (Minus)</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                    <span>Surplus (Plus)</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Akurat (0)</span>
                  </div>
                </div>
              </div>

              <div className={cn("w-full pt-1", expanded ? "h-96" : "h-56 sm:h-64")}>
                <Bar data={varianceChartData} options={varianceChartOptions} />
              </div>
            </div>
          )}
        </CustomizableCard>

        {/* CARD 2: PERBANDINGAN BUKU SAP VS FISIK */}
        <CustomizableCard
          id="chart-sto-compare-bar"
          title="Perbandingan Buku SAP vs Fisik"
          subtitle="Komparasi total saldo buku SAP terhadap aktual sensus"
          icon={Scale}
          width={cards.find((c) => c.id === 'chart-sto-compare-bar')?.width || 'col-span-6'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-sto-compare-bar', w)}
          canMoveLeft={true}
          canMoveRight={true}
          onMoveLeft={() => handleMove(1, 'left')}
          onMoveRight={() => handleMove(1, 'right')}
          badge={
            <span className="text-[10px] font-mono bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-300">
              Komparasi
            </span>
          }
          headerAction={
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-mono">
              <button
                type="button"
                onClick={() => setCompareMetric('ton')}
                className={cn(
                  'px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer',
                  compareMetric === 'ton'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Tonase
              </button>
              <button
                type="button"
                onClick={() => setCompareMetric('qty')}
                className={cn(
                  'px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer',
                  compareMetric === 'qty'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Qty Btg
              </button>
            </div>
          }
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div>
                {/* Custom Clean Legend */}
                <div className="flex flex-wrap items-center gap-4 mb-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
                    <span>Buku SAP</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Fisik Aktual</span>
                  </div>
                </div>
              </div>

              <div className={cn("w-full pt-1", expanded ? "h-96" : "h-56 sm:h-64")}>
                <Bar data={compareChartData} options={compareChartOptions} />
              </div>
            </div>
          )}
        </CustomizableCard>

        {/* CARD 3: DEVIASI SELISIH PER SLOC */}
        <CustomizableCard
          id="chart-sto-sloc-bar"
          title="Deviasi Selisih per SLoc"
          subtitle="Top 10 lokasi simpan SAP dengan deviasi tonase terbesar"
          icon={MapPin}
          width={cards.find((c) => c.id === 'chart-sto-sloc-bar')?.width || 'col-span-8'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-sto-sloc-bar', w)}
          canMoveLeft={true}
          canMoveRight={true}
          onMoveLeft={() => handleMove(2, 'left')}
          onMoveRight={() => handleMove(2, 'right')}
          badge={
            <span className="text-[10px] font-mono bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-300">
              Top 10 SLoc
            </span>
          }
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div className={cn("w-full pt-1", expanded ? "h-96" : "h-56 sm:h-64")}>
                <Bar data={slocChartData} options={slocChartOptions} />
              </div>
            </div>
          )}
        </CustomizableCard>

        {/* CARD 4: DOUGHNUT PROPORSI STATUS */}
        <CustomizableCard
          id="chart-sto-donut"
          title="Proporsi Hasil STO"
          subtitle="Persentase akurasi & status selisih"
          icon={PieChart}
          width={cards.find((c) => c.id === 'chart-sto-donut')?.width || 'col-span-4'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-sto-donut', w)}
          canMoveLeft={true}
          canMoveRight={true}
          onMoveLeft={() => handleMove(3, 'left')}
          onMoveRight={() => handleMove(3, 'right')}
          badge={
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {summary.accuracyRate.toFixed(1)}% Akurasi
            </span>
          }
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div className={cn("flex items-center justify-center relative my-auto", expanded ? "h-64 sm:h-72" : "h-40 sm:h-44")}>
                <Doughnut data={donutChartData} options={donutChartOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight">
                    {summary.accuracyRate.toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                    AKURASI
                  </span>
                </div>
              </div>

              {/* Breakdown Pills List */}
              <div className="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-slate-100 mt-2">
                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-emerald-50/50 border border-emerald-100/80">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[10px] font-medium text-emerald-800 truncate">Sesuai</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-900 mt-0.5">
                    {summary.matchingItems}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-rose-50/50 border border-rose-100/80">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-[10px] font-medium text-rose-800 truncate">Minus (-)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-900 mt-0.5">
                    {summary.minusItems}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-50/50 border border-amber-100/80">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-[10px] font-medium text-amber-800 truncate">Plus (+)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-900 mt-0.5">
                    {summary.plusItems}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CustomizableCard>

        {/* CARD 5: TABEL DETAIL HASIL REKONSILIASI STO (MULTI-TAB) */}
        <CustomizableCard
          id="table-sto-detail"
          title="Detail Hasil Rekonsiliasi Stock Opname"
          subtitle="Data per item material, batch, saldo awal, mutasi cut-off, dan hasil akhir sensus"
          icon={Table2}
          width={cards.find((c) => c.id === 'table-sto-detail')?.width || 'col-span-12'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('table-sto-detail', w)}
          canMoveLeft={true}
          canMoveRight={false}
          onMoveLeft={() => handleMove(4, 'left')}
          headerAction={
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-mono font-medium">
                Menampilkan {paginatedItems.length} dari {filteredItems.length} baris
              </span>
            </div>
          }
        >
          {(expanded) => (
            <div className={cn('flex flex-col space-y-3', expanded && 'flex-1 h-full')}>
              {/* 4 Interactive Sub-Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {/* Tab 1: Semua Data */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      activeTab === 'ALL'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <span>Semua Data</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                        activeTab === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200/70 text-slate-600'
                      )}
                    >
                      {items.length}
                    </span>
                  </button>

                  {/* Tab 2: Sesuai */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('SESUAI')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      activeTab === 'SESUAI'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-600 hover:text-emerald-700'
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Tidak Selisih (Sesuai)</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                        activeTab === 'SESUAI'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      )}
                    >
                      {allSummary.matchingItems}
                    </span>
                  </button>

                  {/* Tab 3: Selisih Minus */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('SELISIH_MINUS')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      activeTab === 'SELISIH_MINUS'
                        ? 'bg-white text-rose-700 shadow-2xs'
                        : 'text-slate-600 hover:text-rose-700'
                    )}
                  >
                    <MinusCircle className="h-3.5 w-3.5 text-rose-600" />
                    <span>Selisih Minus (-)</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                        activeTab === 'SELISIH_MINUS'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {allSummary.minusItems}
                    </span>
                  </button>

                  {/* Tab 4: Selisih Plus */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('SELISIH_PLUS')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      activeTab === 'SELISIH_PLUS'
                        ? 'bg-white text-amber-800 shadow-2xs'
                        : 'text-slate-600 hover:text-amber-800'
                    )}
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Selisih Plus (+)</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                        activeTab === 'SELISIH_PLUS'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {allSummary.plusItems}
                    </span>
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div
                className={cn(
                  'rounded-xl border border-slate-200/80 overflow-auto bg-white shadow-2xs',
                  expanded ? 'flex-1 max-h-none' : 'max-h-[520px]'
                )}
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200/80 text-slate-600 font-semibold uppercase text-[10.5px] tracking-wider font-mono">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">No</th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('sloc')}
                      >
                        <div className="flex items-center gap-1">
                          <span>SLoc</span>
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('material')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Material</span>
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('batch')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Batch</span>
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('sapInitialQty')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>SAP Awal</span>
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('qtySTO')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Fisik Awal</span>
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-right">Susulan</th>
                      <th className="py-2.5 px-3 text-center">Mutasi (IN/OUT)</th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors font-bold text-slate-900"
                        onClick={() => handleSort('sapFinalQty')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>SAP Final</span>
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors font-bold text-emerald-800 bg-emerald-50/40"
                        onClick={() => handleSort('actualFinalQty')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Fisik Final</span>
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors font-bold"
                        onClick={() => handleSort('differencesFinalQty')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Selisih Qty</span>
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort('tonDiffFinal')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Selisih Ton</span>
                          <ArrowUpDown className="h-3 w-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {paginatedItems.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-12 text-center text-slate-400 font-sans">
                          <ClipboardCheck className="h-9 w-9 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                          <p className="font-semibold text-slate-600">Tidak ada data stock opname</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Coba sesuaikan kata kunci pencarian atau ubah filter gudang / tab status
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((item, idx) => {
                        const isMinus = item.status === 'SELISIH_MINUS';
                        const isPlus = item.status === 'SELISIH_PLUS';
                        const isZero = item.status === 'SESUAI';

                        return (
                          <tr
                            key={item.id || `${item.labelId}-${idx}`}
                            className={cn(
                              'hover:bg-slate-50/80 transition-colors',
                              isMinus && 'bg-rose-50/20 hover:bg-rose-50/40',
                              isPlus && 'bg-amber-50/20 hover:bg-amber-50/40'
                            )}
                          >
                            <td className="py-2 px-3 text-center text-slate-400 text-[11px]">
                              {(currentPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-800 text-xs">
                              {item.sloc}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-900 text-xs tracking-tight">
                              {item.material}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap text-[11px]">
                              {item.batch}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              {formatQty(item.sapInitialQty)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700 font-medium">
                              {formatQty(item.qtySTO)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500 text-[11px]">
                              {item.additionalSTO > 0 ? `+${formatQty(item.additionalSTO)}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500 text-[10.5px] whitespace-nowrap">
                              {item.qtyIn > 0 || item.qtyOut > 0 ? (
                                <span>
                                  +{item.qtyIn} / -{item.qtyOut}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 bg-slate-50/40">
                              {formatQty(item.sapFinalQty)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-800 bg-emerald-50/30">
                              {formatQty(item.actualFinalQty)}
                            </td>
                            <td
                              className={cn(
                                'py-2 px-3 text-right font-bold whitespace-nowrap',
                                isMinus && 'text-rose-600 font-bold',
                                isPlus && 'text-amber-700 font-bold',
                                isZero && 'text-emerald-700'
                              )}
                            >
                              {item.differencesFinalQty > 0 ? `+${formatQty(item.differencesFinalQty)}` : formatQty(item.differencesFinalQty)}
                            </td>
                            <td
                              className={cn(
                                'py-2 px-3 text-right font-mono text-[11px] whitespace-nowrap',
                                isMinus && 'text-rose-600',
                                isPlus && 'text-amber-700',
                                isZero && 'text-emerald-600'
                              )}
                            >
                              {item.tonDiffFinal !== 0 ? (
                                <span>
                                  {item.tonDiffFinal > 0 ? '+' : ''}
                                  {formatTon(item.tonDiffFinal)} T
                                </span>
                              ) : (
                                <span className="text-slate-300">0.00 T</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              {isZero && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-sans bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                                  Sesuai
                                </span>
                              )}
                              {isMinus && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-sans bg-rose-100 text-rose-800 border border-rose-200">
                                  <MinusCircle className="h-2.5 w-2.5 text-rose-600" />
                                  Selisih (-)
                                </span>
                              )}
                              {isPlus && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-sans bg-amber-100 text-amber-800 border border-amber-200">
                                  <PlusCircle className="h-2.5 w-2.5 text-amber-600" />
                                  Selisih (+)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {/* Summary Row */}
                  {filteredItems.length > 0 && (
                    <tfoot className="bg-slate-100/90 font-bold border-t border-slate-300 font-mono text-[11px] text-slate-900 sticky bottom-0 z-10">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider font-sans">
                          Total Halaman Terfilter ({filteredItems.length} Item):
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {formatQty(filteredItems.reduce((acc, i) => acc + i.sapInitialQty, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {formatQty(filteredItems.reduce((acc, i) => acc + i.qtySTO, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {formatQty(filteredItems.reduce((acc, i) => acc + i.additionalSTO, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 text-[10px]">
                          +{filteredItems.reduce((acc, i) => acc + i.qtyIn, 0)} / -{filteredItems.reduce((acc, i) => acc + i.qtyOut, 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-900 bg-slate-200/50">
                          {formatQty(summary.totalSapQty)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-900 bg-emerald-100/40">
                          {formatQty(summary.totalActualQty)}
                        </td>
                        <td
                          className={cn(
                            'py-2.5 px-3 text-right font-bold',
                            summary.netVarianceQty < 0 ? 'text-rose-600' : summary.netVarianceQty > 0 ? 'text-amber-700' : 'text-emerald-700'
                          )}
                        >
                          {summary.netVarianceQty > 0 ? '+' : ''}
                          {formatQty(summary.netVarianceQty)}
                        </td>
                        <td
                          className={cn(
                            'py-2.5 px-3 text-right font-bold',
                            summary.netVarianceTon < 0 ? 'text-rose-600' : summary.netVarianceTon > 0 ? 'text-amber-700' : 'text-emerald-700'
                          )}
                        >
                          {summary.netVarianceTon > 0 ? '+' : ''}
                          {formatTon(summary.netVarianceTon)} T
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px] text-slate-500 font-sans">
                          {summary.accuracyRate.toFixed(1)}% Akurat
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-100 text-xs font-mono">
                  <div className="text-slate-500">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer font-sans text-xs"
                    >
                      Sebelumnya
                    </button>
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = i + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pageNum = currentPage - 3 + i;
                          if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                        }
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                              'w-7 h-7 rounded text-xs flex items-center justify-center cursor-pointer transition-colors',
                              currentPage === pageNum
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer font-sans text-xs"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CustomizableCard>
      </div>
    </div>
  );
};

export default StockOpnameView;
