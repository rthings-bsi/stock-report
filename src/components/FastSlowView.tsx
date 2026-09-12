'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { FastSlowPipe, UnfifoPipeItem } from '../types/warehouse';
import { formatTon, formatQty, formatPercent } from '@/lib/utils';
import {
  Clock,
  PieChart,
  Table2,
  ListOrdered,
  Warehouse,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Calendar,
  X,
  Search
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface FastSlowViewProps {
  data: FastSlowPipe[];
  pipeData?: UnfifoPipeItem[];
  isCustomizing?: boolean;
}

interface CardState {
  id: string;
  width: CardWidth;
}

interface TopSlowItem {
  no: number;
  gudang: string;
  kodeMaterial: string;
  ukuran: string;
  customer: string;
  batch: string;
  incDate: string;
  qtyBtg: number;
  tonase: number;
  count: number;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'bar-chart', width: 'col-span-7' },
  { id: 'pie-chart', width: 'col-span-5' },
  { id: 'top5-slow-moving', width: 'col-span-12' },
  { id: 'table-summary', width: 'col-span-7' },
  { id: 'table-detail', width: 'col-span-5' },
];

export const FastSlowView: React.FC<FastSlowViewProps> = ({
  data = [],
  pipeData = [],
  isCustomizing = false
}) => {
  const safeData = data.length > 0 ? data : [];
  const [selectedGudang, setSelectedGudang] = useState<string>('ALL');

  // Card order & size state with localStorage persistence
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [modalYearGudang, setModalYearGudang] = useState<string>('ALL');
  const [selectedDrilldownYear, setSelectedDrilldownYear] = useState<string | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowYearModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sorting state for top slow moving table
  const [topSlowSortField, setTopSlowSortField] = useState<keyof TopSlowItem>('tonase');
  const [topSlowSortDir, setTopSlowSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_fastslow_v2');
      if (saved) {
        const parsed: CardState[] = JSON.parse(saved);
        const validCards = parsed.filter((c) =>
          DEFAULT_CARDS.some((dc) => dc.id === c.id)
        );
        const missing = DEFAULT_CARDS.filter(
          (dc) => !validCards.some((c) => c.id === dc.id)
        );
        setCards([...validCards, ...missing]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_fastslow_v2', JSON.stringify(cards));
    } catch {}
  }, [cards, isMounted]);

  const handleWidthChange = (id: string, newWidth: CardWidth) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, width: newWidth } : c))
    );
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= cards.length) return;
    const newCards = [...cards];
    const [moved] = newCards.splice(index, 1);
    newCards.splice(targetIdx, 0, moved);
    setCards(newCards);
  };

  // Available gudang list from data
  const availableGudangs = useMemo(() => {
    const list = safeData.map((d) => d.gudang).filter(Boolean);
    return ['ALL', ...list];
  }, [safeData]);

  // Global metrics
  const totalFast = safeData.reduce((acc, curr) => acc + curr.fastTon, 0);
  const totalSlow = safeData.reduce((acc, curr) => acc + curr.slowTon, 0);
  const grandTotal = totalFast + totalSlow;

  const overallFastPct = grandTotal > 0 ? (totalFast / grandTotal) * 100 : 0;
  const overallSlowPct = grandTotal > 0 ? (totalSlow / grandTotal) * 100 : 0;

  // Active gudang metrics
  const activeGudangData = useMemo(() => {
    if (selectedGudang === 'ALL') return null;
    return safeData.find((d) => d.gudang === selectedGudang) || null;
  }, [safeData, selectedGudang]);

  // Helper to extract aggregated top slow moving items
  const getTopSlowItems = (gudang: string, limit: number): TopSlowItem[] => {
    if (!pipeData || pipeData.length === 0) return [];

    const isAll = gudang === 'ALL';
    const rawMatches = isAll
      ? pipeData
      : pipeData.filter((i) => i.gudang === gudang);

    const map: Record<string, TopSlowItem> = {};

    rawMatches.forEach((item) => {
      const key = isAll
        ? `${item.gudang}|${item.kodeMaterial}|${item.ukuran}|${item.customer}`
        : `${item.kodeMaterial}|${item.ukuran}|${item.customer}`;

      if (!map[key]) {
        map[key] = {
          no: 0,
          gudang: item.gudang,
          kodeMaterial: item.kodeMaterial,
          ukuran: item.ukuran,
          customer: item.customer,
          batch: item.batch,
          incDate: item.incDate,
          qtyBtg: 0,
          tonase: 0,
          count: 0
        };
      }
      map[key].qtyBtg += item.qtyBtg;
      map[key].tonase += item.tonase;
      map[key].count += 1;
      if (item.incDate && (!map[key].incDate || item.incDate < map[key].incDate)) {
        map[key].incDate = item.incDate;
        map[key].batch = item.batch;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.tonase - a.tonase)
      .slice(0, limit)
      .map((item, idx) => ({
        ...item,
        no: idx + 1,
        tonase: Number(item.tonase.toFixed(3))
      }));
  };

  // Top slow items for normal dashboard view (Top 10 when ALL, Top 10 when filtered)
  const topSlowItems = useMemo(() => {
    return getTopSlowItems(selectedGudang, 10);
  }, [pipeData, selectedGudang]);

  // Fullscreen top 10 items (Always up to 10 for the active warehouse or ALL)
  const fullscreenTop10Items = useMemo(() => {
    return getTopSlowItems(selectedGudang, 10);
  }, [pipeData, selectedGudang]);

  // Chart data filtered by selected gudang
  const filteredBarData = useMemo(() => {
    if (selectedGudang === 'ALL') return safeData;
    return safeData.filter((d) => d.gudang === selectedGudang);
  }, [safeData, selectedGudang]);

  // Bar Chart Configuration
  const barChartData = {
    labels: filteredBarData.map((d) => d.gudang),
    datasets: [
      {
        label: 'Fast Moving',
        data: filteredBarData.map((d) => d.fastTon),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        maxBarThickness: selectedGudang !== 'ALL' ? 56 : 32,
      },
      {
        label: 'Slow Moving',
        data: filteredBarData.map((d) => d.slowTon),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        maxBarThickness: selectedGudang !== 'ALL' ? 56 : 32,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'inherit', size: 11, weight: 'bold' as const },
          color: '#475569',
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'inherit', size: 12, weight: 'bold' as const },
        bodyFont: { family: 'inherit', size: 11 },
        padding: 10,
        cornerRadius: 6,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          label: function (context: any) {
            const val = context.raw || 0;
            return ` ${context.dataset.label}: ${val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Ton`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'inherit', size: 11, weight: 'bold' as const }, color: '#334155' },
        border: { color: '#cbd5e1' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'inherit', size: 10 }, color: '#64748b' },
        border: { dash: [4, 4], color: '#e2e8f0' },
      },
    },
  };

  // Doughnut Chart Configuration (Reflects Active Gudang or Global)
  const activeFastTon = activeGudangData ? activeGudangData.fastTon : totalFast;
  const activeSlowTon = activeGudangData ? activeGudangData.slowTon : totalSlow;
  const activeGrandTotal = activeFastTon + activeSlowTon;
  const activeFastPct = activeGrandTotal > 0 ? (activeFastTon / activeGrandTotal) * 100 : 0;
  const activeSlowPct = activeGrandTotal > 0 ? (activeSlowTon / activeGrandTotal) * 100 : 0;

  const doughnutData = {
    labels: ['Fast Moving', 'Slow Moving'],
    datasets: [
      {
        data: [Number(activeFastTon.toFixed(2)), Number(activeSlowTon.toFixed(2))],
        backgroundColor: ['#10b981', '#f59e0b'],
        hoverBackgroundColor: ['#059669', '#d97706'],
        borderWidth: 2,
        borderColor: '#ffffff',
        spacing: 2,
        borderRadius: 4,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    onClick: (_event: any, elements: any[]) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        if (index === 1) {
          // Slow Moving slice clicked!
          setModalYearGudang(selectedGudang);
          setSelectedDrilldownYear(null);
          setShowYearModal(true);
        }
      }
    },
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
          label: (ctx: any) => ` ${ctx.label}: ${(ctx.parsed || 0).toFixed(2)} Ton`,
        },
      },
    },
  };

  const sortItems = <T,>(
    items: T[],
    field: keyof T,
    dir: 'asc' | 'desc'
  ) => {
    return [...items].sort((a, b) => {
      const vA = a[field] ?? '';
      const vB = b[field] ?? '';
      if (typeof vA === 'number' && typeof vB === 'number') {
        return dir === 'asc' ? vA - vB : vB - vA;
      }
      return dir === 'asc'
        ? String(vA).localeCompare(String(vB))
        : String(vB).localeCompare(String(vA));
    });
  };

  const renderSortHeader = <T,>(
    label: string,
    field: keyof T,
    currentField: keyof T,
    currentDir: 'asc' | 'desc',
    onSort: (f: keyof T) => void,
    align: 'left' | 'center' | 'right' = 'left',
    colorClass: string = 'text-slate-700'
  ) => {
    const isActive = currentField === field;
    return (
      <th
        onClick={() => onSort(field)}
        className={`py-2 px-2.5 font-bold uppercase tracking-wider select-none cursor-pointer hover:bg-slate-200/80 transition-colors text-${align} ${colorClass}`}
      >
        <div className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : ''}`}>
          <span>{label}</span>
          {isActive ? (
            currentDir === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-emerald-800 shrink-0" />
            ) : (
              <ArrowDown className="h-3 w-3 text-emerald-800 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-2.5 w-2.5 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100" />
          )}
        </div>
      </th>
    );
  };

  // Render Table for Top Slow Moving Items
  const renderTopSlowTable = (itemsList: TopSlowItem[], targetLimit: number) => {
    const handleSort = (field: keyof TopSlowItem) => {
      if (topSlowSortField === field) {
        setTopSlowSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setTopSlowSortField(field);
        setTopSlowSortDir('desc');
      }
    };

    const isAll = selectedGudang === 'ALL';
    const sorted = sortItems(itemsList, topSlowSortField, topSlowSortDir);
    const sumQty = itemsList.reduce((acc, r) => acc + (r.qtyBtg || 0), 0);
    const sumTon = itemsList.reduce((acc, r) => acc + (r.tonase || 0), 0);

    if (sorted.length === 0) {
      return (
        <div className="py-8 text-center text-slate-500 text-xs font-mono">
          {isAll
            ? 'Tidak ditemukan data item slow moving.'
            : `Tidak ditemukan item slow moving untuk gudang ${selectedGudang}.`}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] shadow-2xs">
            <tr className="group text-slate-700">
              <th className="py-2 px-2 text-center font-bold text-slate-500 w-8 border-b border-slate-200">#</th>
              {isAll && renderSortHeader('Gudang', 'gudang', topSlowSortField, topSlowSortDir, handleSort, 'left')}
              {renderSortHeader('Ukuran & Customer', 'ukuran', topSlowSortField, topSlowSortDir, handleSort, 'left')}
              {renderSortHeader('Kode Material', 'kodeMaterial', topSlowSortField, topSlowSortDir, handleSort, 'left')}
              {renderSortHeader('Batch', 'batch', topSlowSortField, topSlowSortDir, handleSort, 'center')}
              {renderSortHeader('Inc. Date', 'incDate', topSlowSortField, topSlowSortDir, handleSort, 'center')}
              {renderSortHeader('Qty (Btg)', 'qtyBtg', topSlowSortField, topSlowSortDir, handleSort, 'right', 'text-slate-900')}
              {renderSortHeader('Tonase (Ton)', 'tonase', topSlowSortField, topSlowSortDir, handleSort, 'right', 'text-amber-950 font-black')}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px] bg-white">
            {sorted.map((item, idx) => (
              <tr key={`${item.gudang}-${item.kodeMaterial}-${item.batch}-${idx}`} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                <td className="py-2 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                {isAll && (
                  <td className="py-2 px-2 whitespace-nowrap font-bold text-slate-900">
                    <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                      {item.gudang}
                    </span>
                  </td>
                )}
                <td className="py-2 px-2">
                  <span className="font-bold text-slate-900 block">{item.ukuran}</span>
                  <span className="text-[10px] text-slate-500 font-sans truncate block max-w-[240px]" title={item.customer}>
                    {item.customer}
                  </span>
                </td>
                <td className="py-2 px-2 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                  {item.kodeMaterial}
                </td>
                <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-700 whitespace-nowrap">
                  <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                    {item.batch || '-'}
                  </span>
                </td>
                <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-600 whitespace-nowrap">
                  {item.incDate || '-'}
                </td>
                <td className="py-2 px-2 text-right font-medium text-slate-900">
                  {formatQty(item.qtyBtg, { zeroAsDash: true })}
                </td>
                <td className="py-2 px-2 text-right font-black text-amber-950">
                  {formatTon(item.tonase, { decimals: 3, zeroAsDash: true })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 bg-slate-100 font-bold text-[11px] text-slate-900 shadow-[0_-2px_4px_rgba(0,0,0,0.06)]">
            <tr>
              <td colSpan={isAll ? 6 : 5} className="py-2.5 px-3 text-left uppercase tracking-wider text-slate-700 text-[10px] bg-slate-100 border-t-2 border-slate-300">
                Total {targetLimit} Terbesar Slow Moving ({isAll ? 'Semua Gudang' : selectedGudang})
              </td>
              <td className="py-2.5 px-2 text-right text-slate-900 font-bold bg-slate-100 border-t-2 border-slate-300">
                {formatQty(sumQty, { zeroAsDash: true })}
              </td>
              <td className="py-2.5 px-2 text-right text-amber-950 font-black bg-slate-100 border-t-2 border-slate-300">
                {formatTon(sumTon, { decimals: 3, zeroAsDash: true })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  function getItemYear(item: { prodYear?: string; incDate?: string; batch?: string }): string {
    if (item.prodYear && item.prodYear !== 'Tidak Diketahui' && /^(19|20)\d{2}$/.test(item.prodYear)) {
      return item.prodYear;
    }
    if (item.incDate) {
      const match = item.incDate.match(/\b(19\d{2}|20\d{2})\b/);
      if (match) return match[1];
    }
    if (item.batch) {
      const matchSpindo = item.batch.match(/^[1-9](\d{2})\d{3,}/);
      if (matchSpindo) {
        const y2 = parseInt(matchSpindo[1], 10);
        if (y2 >= 10 && y2 <= 40) return `20${matchSpindo[1]}`;
      }
      const matchYYYY = item.batch.match(/^(19\d{2}|20\d{2})/);
      if (matchYYYY) return matchYYYY[1];
    }
    return item.prodYear || 'Tidak Diketahui';
  }

  const slowPipeItems = useMemo(() => {
    return (pipeData || []).filter((item) => item.unfifoStatus === 'SLOW MOVING');
  }, [pipeData]);

  const modalFilteredSlowItems = useMemo(() => {
    let items = slowPipeItems;
    if (modalYearGudang !== 'ALL') {
      items = items.filter((i) => i.gudang === modalYearGudang);
    }
    if (selectedDrilldownYear) {
      items = items.filter((i) => getItemYear(i) === selectedDrilldownYear);
    }
    if (modalSearchQuery.trim()) {
      const q = modalSearchQuery.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.ukuran.toLowerCase().includes(q) ||
          i.customer.toLowerCase().includes(q) ||
          i.kodeMaterial.toLowerCase().includes(q) ||
          i.batch.toLowerCase().includes(q) ||
          i.gudang.toLowerCase().includes(q)
      );
    }
    return items;
  }, [slowPipeItems, modalYearGudang, selectedDrilldownYear, modalSearchQuery]);

  const yearlySlowBreakdown = useMemo(() => {
    const map: Record<string, { year: string; totalTon: number; totalQty: number; itemCount: number }> = {};

    const gudangItems = modalYearGudang === 'ALL'
      ? slowPipeItems
      : slowPipeItems.filter((i) => i.gudang === modalYearGudang);

    gudangItems.forEach((item) => {
      const y = getItemYear(item);
      if (!map[y]) {
        map[y] = { year: y, totalTon: 0, totalQty: 0, itemCount: 0 };
      }
      map[y].totalTon += item.tonase;
      map[y].totalQty += item.qtyBtg;
      map[y].itemCount += 1;
    });

    if (Object.keys(map).length === 0) {
      const relevantWarehouses = modalYearGudang === 'ALL' ? safeData : safeData.filter((d) => d.gudang === modalYearGudang);
      relevantWarehouses.forEach((w) => {
        if (w.yearlySlowTon) {
          Object.entries(w.yearlySlowTon).forEach(([yr, ton]) => {
            if (!map[yr]) {
              map[yr] = { year: yr, totalTon: 0, totalQty: 0, itemCount: 0 };
            }
            map[yr].totalTon += ton;
          });
        }
      });
    }

    return Object.values(map).sort((a, b) => {
      if (a.year === 'Tidak Diketahui') return 1;
      if (b.year === 'Tidak Diketahui') return -1;
      return b.year.localeCompare(a.year);
    });
  }, [slowPipeItems, modalYearGudang, safeData]);

  const modalTotalSlowTon = useMemo(() => {
    return yearlySlowBreakdown.reduce((sum, d) => sum + d.totalTon, 0);
  }, [yearlySlowBreakdown]);

  const modalTotalSlowQty = useMemo(() => {
    return yearlySlowBreakdown.reduce((sum, d) => sum + d.totalQty, 0);
  }, [yearlySlowBreakdown]);

  const renderYearModal = () => {
    if (!showYearModal) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={() => setShowYearModal(false)}
      >
        <div
          className="relative w-full max-w-5xl max-h-[88vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden font-sans text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-white shadow-2xs shrink-0">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight font-mono">
                    Rincian Slow Moving per Tahun Produksi (Prod. Year)
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">
                    {modalYearGudang === 'ALL' ? 'Semua Gudang' : modalYearGudang}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                  Akumulasi tonase dan daftar material pipa mengendap berdasarkan kolom Prod. Year pada SAP Excel
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setShowYearModal(false)}
                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Tutup (ESC)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* KPI STATS & CONTROLS TOOLBAR */}
          <div className="p-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap font-mono">
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                <span className="text-[10px] text-amber-800 uppercase font-bold">Total Slow:</span>
                <strong className="text-xs text-amber-950 font-black">{formatTon(modalTotalSlowTon, { showUnit: true })}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Tahun Terdata:</span>
                <strong className="text-xs text-slate-800">{yearlySlowBreakdown.length} Tahun</strong>
              </div>
              {modalTotalSlowQty > 0 && (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold">Total Batang:</span>
                  <strong className="text-xs text-emerald-950">{formatQty(modalTotalSlowQty, { unit: 'Btg' })}</strong>
                </div>
              )}
            </div>

            {/* GUDANG SELECTOR */}
            <div className="flex items-center gap-2 font-mono">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Gudang:</span>
              <select
                value={modalYearGudang}
                onChange={(e) => {
                  setModalYearGudang(e.target.value);
                  setSelectedDrilldownYear(null);
                }}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:border-amber-500 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Gudang</option>
                {availableGudangs.filter((g) => g !== 'ALL').map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* MODAL BODY */}
          <div className="flex-1 overflow-auto p-4 space-y-4 max-h-[60vh]">
            {/* 1. TABEL REKAPITULASI TONASE PER TAHUN */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>Komposisi Tonase Berdasarkan Tahun Produksi</span>
                </h4>
                {selectedDrilldownYear && (
                  <button
                    type="button"
                    onClick={() => setSelectedDrilldownYear(null)}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer font-mono"
                  >
                    Tampilkan Semua Tahun
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
                  <thead className="bg-slate-100 text-[10px] text-slate-700 shadow-2xs">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Tahun Produksi (Prod. Year)</th>
                      <th className="py-2.5 px-3 text-right font-bold text-amber-950">Tonase Slow Moving (Ton)</th>
                      <th className="py-2.5 px-3 text-right font-bold">% Proporsi</th>
                      <th className="py-2.5 px-3 text-right font-bold text-slate-700">Jumlah Batang</th>
                      <th className="py-2.5 px-3 text-right font-bold text-slate-700">Jumlah Item</th>
                      <th className="py-2.5 px-3 text-center font-bold text-slate-600">Aksi Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px] bg-white">
                    {yearlySlowBreakdown.map((row) => {
                      const pct = modalTotalSlowTon > 0 ? (row.totalTon / modalTotalSlowTon) * 100 : 0;
                      const isSelectedYear = selectedDrilldownYear === row.year;
                      return (
                        <tr
                          key={row.year}
                          onClick={() => setSelectedDrilldownYear(isSelectedYear ? null : row.year)}
                          className={`cursor-pointer transition-colors ${
                            isSelectedYear
                              ? 'bg-amber-50/90 font-bold'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                isSelectedYear
                                  ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                                  : 'bg-slate-100 text-slate-800 border-slate-200'
                              }`}>
                                {row.year}
                              </span>
                              {isSelectedYear && (
                                <span className="text-[10px] text-amber-800 font-bold font-sans">
                                  (Aktif)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-950 text-xs">
                            {formatTon(row.totalTon, { showUnit: true })}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-800">{formatPercent(pct)}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                            {row.totalQty > 0 ? formatQty(row.totalQty, { unit: 'Btg' }) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {row.itemCount > 0 ? `${row.itemCount} Item` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline">
                              {isSelectedYear ? 'Tutup Detail' : 'Lihat Item →'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {yearlySlowBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-sans text-xs">
                          Belum ada data tahun produksi untuk filter gudang ini
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-xs text-slate-900 shadow-2xs">
                    <tr>
                      <td className="py-2.5 px-3 uppercase text-slate-700 text-[10px]">TOTAL SLOW MOVING</td>
                      <td className="py-2.5 px-3 text-right text-amber-950 font-black">{formatTon(modalTotalSlowTon, { showUnit: true })}</td>
                      <td className="py-2.5 px-3 text-right font-bold">100,0%</td>
                      <td className="py-2.5 px-3 text-right text-slate-900">{formatQty(modalTotalSlowQty, { unit: 'Btg' })}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{modalFilteredSlowItems.length} Item</td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-slate-500 font-normal">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 2. TABEL RINCIAN ITEM SLOW MOVING */}
            {modalFilteredSlowItems.length > 0 && (
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 font-mono">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <ListOrdered className="h-3.5 w-3.5 text-slate-600" />
                      <span>
                        Daftar Material Slow Moving {selectedDrilldownYear ? `• Tahun ${selectedDrilldownYear}` : '(Semua Tahun)'}
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-sans">
                      Menampilkan {modalFilteredSlowItems.length} baris material pipa
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari ukuran / batch / cust..."
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      className="pl-8 pr-2.5 py-1 text-xs font-sans rounded-md border border-slate-300 bg-white focus:border-amber-500 focus:outline-hidden w-48 sm:w-56"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[36vh]">
                  <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] text-slate-700 shadow-2xs">
                      <tr>
                        <th className="py-2 px-2 text-center font-bold text-slate-400 w-10">#</th>
                        <th className="py-2 px-2.5 font-bold">Gudang</th>
                        <th className="py-2 px-2.5 font-bold">Ukuran</th>
                        <th className="py-2 px-2.5 font-bold">Customer</th>
                        <th className="py-2 px-2.5 font-bold">Kode Material</th>
                        <th className="py-2 px-2.5 font-bold text-amber-900">Batch</th>
                        <th className="py-2 px-2.5 text-center font-bold text-slate-700">Prod. Year</th>
                        <th className="py-2 px-2.5 text-right font-bold text-slate-900">Qty (Btg)</th>
                        <th className="py-2 px-2.5 text-right font-bold text-amber-950">Tonase (Ton)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px] bg-white">
                      {modalFilteredSlowItems.map((item, idx) => (
                        <tr key={`slow-item-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-slate-900 whitespace-nowrap">
                            <span className="bg-slate-100 border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                              {item.gudang}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 font-bold text-slate-900 whitespace-nowrap">{item.ukuran}</td>
                          <td className="py-2 px-2.5 text-slate-600 max-w-[160px] truncate" title={item.customer}>{item.customer}</td>
                          <td className="py-2 px-2.5 text-slate-500 whitespace-nowrap text-[10px]">{item.kodeMaterial}</td>
                          <td className="py-2 px-2.5 font-bold text-amber-900 bg-amber-50/40 whitespace-nowrap">{item.batch}</td>
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-950 border border-amber-200 text-[11px] font-bold font-mono">
                              {getItemYear(item)}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-right text-slate-700 font-semibold">{formatQty(item.qtyBtg)}</td>
                          <td className="py-2 px-2.5 text-right font-bold text-amber-950">{formatTon(item.tonase, { decimals: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between font-mono text-xs">
            <span className="text-[11px] text-slate-500">
              Total {yearlySlowBreakdown.length} kelompok tahun produksi teridentifikasi
            </span>
            <button
              type="button"
              onClick={() => setShowYearModal(false)}
              className="px-5 py-1.5 rounded-md bg-slate-900 hover:bg-black text-white font-bold text-xs cursor-pointer shadow-2xs transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <Clock className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <h1 className="text-base font-bold text-white font-sans tracking-tight">
            Stock Pipa Fast Moving vs Slow Moving
          </h1>
        </div>

        {/* FILTERS */}
        <div className="flex items-center gap-2.5 flex-wrap font-mono text-xs">
          {/* GUDANG SELECTOR */}
          <div className="flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/80">
            <Warehouse className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <span className="text-emerald-300 text-[10px] uppercase font-bold">Gudang:</span>
            <select
              value={selectedGudang}
              onChange={(e) => setSelectedGudang(e.target.value)}
              className="bg-emerald-900 border border-emerald-700 text-white text-xs font-bold rounded px-1.5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              <option value="ALL">Semua Gudang ({safeData.length})</option>
              {availableGudangs.filter((g) => g !== 'ALL').map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {selectedGudang !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedGudang('ALL')}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* CUSTOMIZABLE CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {cards.map((card, index) => {
          // CARD 1: BAR CHART DISTRIBUSI FAST VS SLOW
          if (card.id === 'bar-chart') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title={
                  selectedGudang !== 'ALL'
                    ? `Distribusi Fast vs Slow Moving • ${selectedGudang}`
                    : 'Distribusi Fast vs Slow Moving Per Gudang'
                }
                subtitle={
                  selectedGudang !== 'ALL'
                    ? `Tonase material Fast Moving vs Slow Moving di ${selectedGudang}`
                    : 'Perbandingan tonase Fast vs Slow Moving di seluruh gudang'
                }
                icon={Clock}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full border border-slate-200">
                    {selectedGudang !== 'ALL' ? selectedGudang : 'Per Gudang'}
                  </span>
                }
              >
                {(expanded) => (
                  <div className="flex flex-col h-full w-full gap-5">
                    <div className={expanded ? 'h-64 sm:h-72 w-full shrink-0' : 'h-64 w-full'}>
                      <Bar data={barChartData} options={barChartOptions} />
                    </div>

                    {expanded && (
                      <div className="space-y-4 pt-3 border-t border-slate-200">
                        {/* WAREHOUSE FILTER BUTTONS */}
                        <div className="flex items-center gap-1.5 flex-wrap p-2 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 font-bold mr-1">
                            <Warehouse className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span className="text-[10px] uppercase">Filter Gudang:</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedGudang('ALL')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                              selectedGudang === 'ALL'
                                ? 'bg-emerald-800 text-white shadow-2xs'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            Semua Gudang ({safeData.length})
                          </button>
                          {availableGudangs
                            .filter((g) => g !== 'ALL')
                            .map((g) => {
                              const isSelected = selectedGudang === g;
                              return (
                                <button
                                  key={`fs-fullscreen-btn-${g}`}
                                  type="button"
                                  onClick={() => setSelectedGudang(isSelected ? 'ALL' : g)}
                                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-800 text-white shadow-2xs ring-2 ring-amber-400'
                                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {g}
                                </button>
                              );
                            })}
                        </div>

                        {/* TABLE 10 DATA TERBESAR SLOW MOVING */}
                        <div className="rounded-md border border-slate-200 bg-white p-3 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <ListOrdered className="h-4 w-4 text-amber-600" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                                10 Data Terbesar Slow Moving {selectedGudang !== 'ALL' ? `• ${selectedGudang}` : '(Semua Gudang)'}
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-amber-900 border border-amber-300 bg-amber-50 px-2 py-0.5 rounded">
                              Top 10 Slow
                            </span>
                          </div>
                          {renderTopSlowTable(fullscreenTop10Items, 10)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CustomizableCard>
            );
          }

          // CARD 2: DOUGHNUT KOMPOSISI FAST VS SLOW
          if (card.id === 'pie-chart') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title={`Komposisi Stock Pipa ${selectedGudang !== 'ALL' ? `• ${selectedGudang}` : '(Semua Gudang)'}`}
                subtitle={`Proporsi Fast vs Slow Moving ${selectedGudang !== 'ALL' ? `di ${selectedGudang}` : 'seluruh area'}`}
                icon={PieChart}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200/70">
                    {formatTon(activeGrandTotal, { decimals: 2 })} Ton
                  </span>
                }
              >
                <div className="flex flex-col justify-between h-full space-y-3 font-mono p-1">
                  <div className="h-40 sm:h-44 flex items-center justify-center relative my-auto min-w-0">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                        {formatTon(activeGrandTotal, { decimals: 2 })}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                        TOTAL TON
                      </span>
                    </div>
                  </div>

                  {/* Breakdown Pills List */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 mt-2">
                    <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate">Fast Moving ({formatPercent(activeFastPct)})</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                        {formatTon(activeFastTon, { decimals: 2 })}
                      </span>
                    </div>

                    <div
                      onClick={() => {
                        setModalYearGudang(selectedGudang);
                        setSelectedDrilldownYear(null);
                        setShowYearModal(true);
                      }}
                      className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100 cursor-pointer hover:bg-amber-50/80 transition-colors"
                      title="Klik untuk melihat rincian tonase Slow Moving per tahun"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate">Slow Moving ({formatPercent(activeSlowPct)})</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                        {formatTon(activeSlowTon, { decimals: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </CustomizableCard>
            );
          }

          // CARD 3: TABEL TOP 10 TERBESAR SLOW MOVING (SEMUA GUDANG ATAU PER GUDANG)
          if (card.id === 'top5-slow-moving') {
            const isAll = selectedGudang === 'ALL';
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title={
                  isAll
                    ? 'Top 10 Terbesar Slow Moving (Semua Gudang)'
                    : `Top 10 Terbesar Slow Moving • ${selectedGudang}`
                }
                subtitle={
                  isAll
                    ? '10 item material pipa slow moving dengan akumulasi tonase terbesar di seluruh area gudang'
                    : `10 item material pipa slow moving dengan akumulasi tonase terbesar di ${selectedGudang}`
                }
                icon={ListOrdered}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  <span className="text-[10px] font-mono font-bold text-amber-900 border border-amber-300 bg-amber-50 px-2 py-0.5 rounded">
                    {isAll ? 'Top 10 Slow (Semua Gudang)' : `Top 10 Slow • ${selectedGudang}`}
                  </span>
                }
              >
                {renderTopSlowTable(topSlowItems, 10)}
              </CustomizableCard>
            );
          }

          // CARD 4: TABEL SUMMARY REKAPITULASI
          if (card.id === 'table-summary') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Rekapitulasi Fast &amp; Slow Moving Per Gudang"
                subtitle="Klik baris gudang untuk memfilter detail dan melihat 5 item slow moving terbesar"
                icon={Table2}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300 font-semibold">
                    {safeData.length} Gudang
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 text-[10px] uppercase">
                        <th className="py-2.5 px-3 font-bold" rowSpan={2}>Gudang</th>
                        <th className="py-1 text-center font-bold border-l border-r border-slate-200 bg-slate-200/70" colSpan={2}>Fast Moving</th>
                        <th className="py-1 text-center font-bold bg-slate-200/70" colSpan={2}>Slow Moving</th>
                        <th className="py-2.5 px-3 text-right font-bold border-l border-slate-200 text-slate-900" rowSpan={2}>Total (Ton)</th>
                      </tr>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[10px]">
                        <th className="py-1 px-2.5 text-right font-bold border-l border-slate-200">Tonase</th>
                        <th className="py-1 px-2.5 text-right font-bold border-r border-slate-200">% Fast</th>
                        <th className="py-1 px-2.5 text-right font-bold">Tonase</th>
                        <th className="py-1 px-2.5 text-right font-bold">% Slow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {safeData.map((item) => {
                        const isHighSlow = item.slowPersen > 15;
                        const isSelected = selectedGudang === item.gudang;
                        return (
                          <tr
                            key={item.gudang}
                            onClick={() => setSelectedGudang(isSelected ? 'ALL' : item.gudang)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-50/80 font-semibold'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                              <Warehouse className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-800' : 'text-slate-400'}`} />
                              <span className={`px-1.5 py-0.5 rounded text-[11px] border ${
                                isSelected
                                  ? 'bg-emerald-800 text-white border-emerald-900'
                                  : 'bg-slate-100 text-slate-800 border-slate-200'
                              }`}>
                                {item.gudang}
                              </span>
                              {isHighSlow && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Slow moving > 15%"></span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-right font-semibold text-emerald-800 border-l border-slate-100">
                              {formatTon(item.fastTon)}
                            </td>
                            <td className="py-2 px-2.5 text-right text-emerald-900 font-bold border-r border-slate-100">
                              {formatPercent(item.fastPersen)}
                            </td>
                            <td className={`py-2 px-2.5 text-right font-semibold ${item.slowTon > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
                              {formatTon(item.slowTon)}
                            </td>
                            <td className={`py-2 px-2.5 text-right font-bold ${isHighSlow ? 'text-amber-700' : 'text-slate-600'}`}>
                              {formatPercent(item.slowPersen)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 border-l border-slate-100">
                              {formatTon(item.totalTon)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                      <tr>
                        <td className="py-2.5 px-3 uppercase text-slate-900">TOTAL</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-900 border-l border-slate-200">{formatTon(totalFast)}</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-900 border-r border-slate-200">{formatPercent(overallFastPct)}</td>
                        <td className="py-2.5 px-2.5 text-right text-amber-900">{formatTon(totalSlow)}</td>
                        <td className="py-2.5 px-2.5 text-right text-amber-900">{formatPercent(overallSlowPct)}</td>
                        <td className="py-2.5 px-3 text-right border-l border-slate-200 text-slate-950">{formatTon(grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CustomizableCard>
            );
          }

          // CARD 5: TABEL DETAIL FG VS WIP SLOW MOVING
          if (card.id === 'table-detail') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Rincian Slow Moving: FG vs WIP"
                icon={ListOrdered}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  <span className="text-[10px] font-mono font-bold text-amber-900 border border-amber-300 bg-amber-50 px-2 py-0.5 rounded">
                    PASM SLOW
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] border-b border-slate-200 uppercase">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Gudang</th>
                        <th className="py-2.5 px-2 text-right font-bold text-emerald-800">FG LT</th>
                        <th className="py-2.5 px-2 text-right font-bold text-emerald-800">FG ST</th>
                        <th className="py-2.5 px-2 text-right font-bold text-amber-800">WIP LT</th>
                        <th className="py-2.5 px-2 text-right font-bold text-amber-800">WIP ST</th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-900">Total Slow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {safeData.map((r) => {
                        const rowSlowTotal = (r.fgLtSlow || 0) + (r.fgStSlow || 0) + (r.wipLtSlow || 0) + (r.wipStSlow || 0);
                        const isSelected = selectedGudang === r.gudang;
                        return (
                          <tr
                            key={`slow-detail-${r.gudang}`}
                            onClick={() => setSelectedGudang(isSelected ? 'ALL' : r.gudang)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-amber-50/80 font-semibold'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[11px] border ${
                                isSelected
                                  ? 'bg-amber-800 text-white border-amber-900'
                                  : 'bg-slate-100 text-slate-800 border-slate-200'
                              }`}>
                                {r.gudang}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right">{r.fgLtSlow ? r.fgLtSlow.toFixed(2) : '-'}</td>
                            <td className="py-2 px-2 text-right">{r.fgStSlow ? r.fgStSlow.toFixed(2) : '-'}</td>
                            <td className="py-2 px-2 text-right">{r.wipLtSlow ? r.wipLtSlow.toFixed(2) : '-'}</td>
                            <td className="py-2 px-2 text-right">{r.wipStSlow ? r.wipStSlow.toFixed(2) : '-'}</td>
                            <td className="py-2 px-3 text-right font-bold text-amber-900">
                              {rowSlowTotal > 0 ? rowSlowTotal.toFixed(2) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                      <tr>
                        <td className="py-2.5 px-3">TOTAL</td>
                        <td className="py-2.5 px-2 text-right text-emerald-900">
                          {safeData.reduce((acc, c) => acc + (c.fgLtSlow || 0), 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-emerald-900">
                          {safeData.reduce((acc, c) => acc + (c.fgStSlow || 0), 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-amber-900">
                          {safeData.reduce((acc, c) => acc + (c.wipLtSlow || 0), 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-amber-900">
                          {safeData.reduce((acc, c) => acc + (c.wipStSlow || 0), 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-950 font-bold">
                          {totalSlow.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CustomizableCard>
            );
          }

          return null;
        })}
      </div>

      {/* MODAL RINCIAN SLOW MOVING PER TAHUN PRODUKSI */}
      {renderYearModal()}
    </div>
  );
};
