'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { DamagedPackagingItem } from '../types/warehouse';
import { formatExcelDate, formatExcelTime } from '@/lib/parseDamagedPackaging';
import { formatTon, formatQty } from '@/lib/utils';
import {
  PackageX,
  Table2,
  BarChart3,
  PieChart,
  Search,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  X,
  Filter,
  RotateCcw
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface DamagedPackagingViewProps {
  data?: DamagedPackagingItem[];
  isCustomizing?: boolean;
  onDataUpdate?: (newData: DamagedPackagingItem[]) => void;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'chart-customer-bar', width: 'col-span-8' },
  { id: 'chart-defect-donut', width: 'col-span-4' },
  { id: 'table-damaged-pkg', width: 'col-span-12' }
];

const DEFECT_COLOR_MAP: Record<string, string> = {
  'Slot': '#d97706',       // Amber 600
  'Dinding': '#dc2626',    // Red 600
  'Rangka': '#059669',     // Emerald 600
  'Kaki': '#0284c7',       // Sky 600
  'Pengait': '#4f46e5',    // Indigo 600
  'Label Item': '#8b5cf6', // Violet 500
  'Limbah': '#64748b'      // Slate 500
};

export const DamagedPackagingView: React.FC<DamagedPackagingViewProps> = ({
  data = [],
  isCustomizing = false,
  onDataUpdate
}) => {
  const [items, setItems] = useState<DamagedPackagingItem[]>(data);
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (data) {
      setItems(data);
    }
  }, [data]);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_damaged_pkg_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === DEFAULT_CARDS.length &&
          parsed.some((c: CardState) => c.id === 'chart-customer-bar' && c.width !== 'col-span-12')
        ) {
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
      localStorage.setItem('spindo_layout_damaged_pkg_v5', JSON.stringify(cards));
    } catch {}
  }, [cards, isMounted]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPlant, setSelectedPlant] = useState('ALL');

  // Sorting
  const [sortField, setSortField] = useState<keyof DamagedPackagingItem>('tglScanIn');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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

  // Customer List
  const customerList = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.customer))).filter(Boolean).sort();
  }, [items]);

  // Filtered & Sorted Data
  const filteredData = useMemo(() => {
    return items.filter((item) => {
      const matchCust = selectedCustomer === 'ALL' || item.customer === selectedCustomer;
      const matchCat = selectedCategory === 'ALL' || item.defectCategory === selectedCategory;
      const matchPlant = selectedPlant === 'ALL' || item.plant === selectedPlant;
      const matchSearch =
        searchQuery === '' ||
        item.packageNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.serialNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.userScan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.slot && item.slot.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.dinding && item.dinding.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.rangka && item.rangka.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.kaki && item.kaki.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.pengait && item.pengait.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCust && matchCat && matchPlant && matchSearch;
    });
  }, [items, selectedCustomer, selectedCategory, selectedPlant, searchQuery]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const vA = a[sortField] ?? '';
      const vB = b[sortField] ?? '';
      if (typeof vA === 'number' && typeof vB === 'number') {
        return sortDir === 'asc' ? vA - vB : vB - vA;
      }
      return sortDir === 'asc'
        ? String(vA).localeCompare(String(vB))
        : String(vB).localeCompare(String(vA));
    });
  }, [filteredData, sortField, sortDir]);

  const handleSort = (field: keyof DamagedPackagingItem) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Defect Category Counts for Filtered Data
  const defectCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Slot': 0,
      'Dinding': 0,
      'Rangka': 0,
      'Kaki': 0,
      'Pengait': 0,
      'Label Item': 0,
      'Limbah': 0,
    };
    filteredData.forEach((item) => {
      if (item.slot) counts['Slot']++;
      if (item.dinding) counts['Dinding']++;
      if (item.rangka) counts['Rangka']++;
      if (item.kaki) counts['Kaki']++;
      if (item.pengait) counts['Pengait']++;
      if (item.labelItem) counts['Label Item']++;
      if (item.limbah) counts['Limbah']++;
    });
    return counts;
  }, [filteredData]);

  // Customer Defect Summary for Bar Chart
  const customerDefectSummary = useMemo(() => {
    const map: Record<string, { total: number; slot: number; dinding: number; rangka: number; other: number }> = {};
    filteredData.forEach((item) => {
      const cust = item.customer || 'Unknown';
      if (!map[cust]) {
        map[cust] = { total: 0, slot: 0, dinding: 0, rangka: 0, other: 0 };
      }
      map[cust].total++;
      if (item.slot) map[cust].slot++;
      else if (item.dinding) map[cust].dinding++;
      else if (item.rangka) map[cust].rangka++;
      else map[cust].other++;
    });

    return Object.entries(map)
      .map(([customer, stats]) => ({ customer, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // Chart 1: Bar Chart Defect by Component
  const defectBarChartData = {
    labels: ['Slot / Pengunci', 'Dinding Pecah', 'Rangka', 'Kaki', 'Pengait', 'Label Item', 'Limbah'],
    datasets: [
      {
        label: 'Jumlah Temuan Defect (Unit)',
        data: [
          defectCounts['Slot'],
          defectCounts['Dinding'],
          defectCounts['Rangka'],
          defectCounts['Kaki'],
          defectCounts['Pengait'],
          defectCounts['Label Item'],
          defectCounts['Limbah'],
        ],
        backgroundColor: [
          '#d97706', // amber
          '#b91c1c', // red
          '#047857', // emerald
          '#0284c7', // sky
          '#64748b', // slate
          '#475569',
          '#334155'
        ],
        borderRadius: 2,
        barPercentage: 0.6,
      },
    ],
  };

  const defectBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'monospace', size: 10, weight: 'bold' as const },
          color: '#334155',
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'monospace', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        padding: 8,
        cornerRadius: 4,
        callbacks: {
          label: (context: any) => ` ${context.raw} Unit Packaging NG`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'monospace', size: 10, weight: 'bold' as const }, color: '#334155' },
        border: { color: '#cbd5e1' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'monospace', size: 9 }, color: '#64748b', stepSize: 1 },
        border: { dash: [4, 4], color: '#cbd5e1' },
      },
    },
  };

  // Chart 2: Donut Chart Proporsi Defect
  const nonZeroDefects = Object.entries(defectCounts).filter(([_, count]) => count > 0);
  const totalDefects = useMemo(() => {
    return nonZeroDefects.reduce((acc, [_, count]) => acc + count, 0);
  }, [nonZeroDefects]);

  const donutChartData = {
    labels: nonZeroDefects.map(([k]) => k),
    datasets: [
      {
        data: nonZeroDefects.map(([_, count]) => count),
        backgroundColor: nonZeroDefects.map(([k]) => DEFECT_COLOR_MAP[k] || '#64748b'),
        hoverBackgroundColor: nonZeroDefects.map(([k]) => DEFECT_COLOR_MAP[k] || '#64748b'),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderColor: '#ffffff',
        spacing: 2,
        borderRadius: 4,
        cutout: '72%',
      },
    ],
  };

  const donutChartOptions = {
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
        titleFont: { family: 'monospace', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        padding: { top: 8, bottom: 8, left: 12, right: 12 },
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const total = nonZeroDefects.reduce((a, b) => a + b[1], 0);
            const val = context.raw || 0;
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
            return ` ${context.label}: ${val} Unit (${pct}%)`;
          },
        },
      },
    },
  };

  // Chart 3: Grouped Bar Chart by Customer
  const customerBarChartData = {
    labels: customerDefectSummary.map((c) => c.customer),
    datasets: [
      {
        label: 'Slot / Pengunci Lepas',
        data: customerDefectSummary.map((c) => c.slot),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Dinding Pecah / Retak',
        data: customerDefectSummary.map((c) => c.dinding),
        backgroundColor: '#dc2626',
        hoverBackgroundColor: '#b91c1c',
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Rangka Tidak Utuh',
        data: customerDefectSummary.map((c) => c.rangka),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Lainnya',
        data: customerDefectSummary.map((c) => c.other),
        backgroundColor: '#64748b',
        hoverBackgroundColor: '#475569',
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const customerBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    categoryPercentage: 0.82,
    barPercentage: 0.72,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'monospace', size: 10, weight: 'bold' as const },
          color: '#334155',
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          padding: 14,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        titleColor: '#f8fafc',
        bodyColor: '#f1f5f9',
        titleFont: { family: 'monospace', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        padding: { top: 8, bottom: 8, left: 12, right: 12 },
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.raw} Unit`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: 'monospace', size: 9, weight: 'bold' as const },
          color: '#475569',
          maxRotation: 40,
          minRotation: 20,
          autoSkip: false,
        },
        border: { color: '#e2e8f0' },
      },
      y: {
        grid: { color: '#f8fafc' },
        ticks: { font: { family: 'monospace', size: 9 }, color: '#64748b', stepSize: 2 },
        border: { dash: [4, 4], color: '#e2e8f0' },
      },
    },
  };

  const renderSortHeader = (
    label: string,
    field: keyof DamagedPackagingItem,
    align: 'left' | 'center' | 'right' = 'left',
    colorClass: string = 'text-slate-700'
  ) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-2 px-2.5 font-bold uppercase tracking-wider select-none cursor-pointer hover:bg-slate-200/80 transition-colors text-${align} ${colorClass}`}
      >
        <div className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : ''}`}>
          <span>{label}</span>
          {isActive ? (
            sortDir === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-emerald-800 shrink-0" />
            ) : (
              <ArrowDown className="h-3 w-3 text-emerald-800 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-2.5 w-2.5 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <PackageX className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <h1 className="text-base font-bold text-white font-sans tracking-tight">
            Data Temuan Packaging Rusak (NG)
          </h1>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 sm:px-4 sm:py-3 rounded-xl border border-slate-200/90 shadow-2xs text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari package, serial, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter Customer */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer:</span>
            <div className="relative inline-flex items-center">
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="pl-3 pr-8 py-2 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-all appearance-none max-w-[210px] truncate shadow-2xs"
              >
                <option value="ALL">Semua Customer</option>
                {customerList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Filter Defect Category */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Defect:</span>
            <div className="relative inline-flex items-center">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-3 pr-8 py-2 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-all appearance-none shadow-2xs"
              >
                <option value="ALL">Semua Defect</option>
                <option value="Slot">Slot</option>
                <option value="Dinding">Dinding</option>
                <option value="Rangka">Rangka</option>
                <option value="Kaki">Kaki</option>
                <option value="Pengait">Pengait</option>
                <option value="Label Item">Label Item</option>
                <option value="Limbah">Limbah</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Reset Filters button */}
          {(selectedCustomer !== 'ALL' || selectedCategory !== 'ALL' || searchQuery !== '') && (
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer('ALL');
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
              title="Reset semua filter"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Filtered Counter Badge */}
        <div className="flex items-center self-end lg:self-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-xs text-slate-600">
            <span className="text-slate-500">Total terfilter:</span>
            <span className="font-bold font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              {filteredData.length}
            </span>
            <span className="text-slate-500">unit</span>
          </div>
        </div>
      </div>

      {/* CHARTS & DETAIL TABLE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-5">
        {cards.map((card, index) => {
          if (card.id === 'chart-defect-donut') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Proporsi Jenis Defect"
                subtitle="Persentase komposisi kerusakan kemasan"
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
                    {totalDefects} Qty
                  </span>
                }
              >
                <div className="flex flex-col justify-between h-full space-y-3 font-mono p-1">
                  {/* Doughnut ring with centered QTY */}
                  <div className="h-40 sm:h-44 flex items-center justify-center relative my-auto min-w-0">
                    <Doughnut data={donutChartData} options={donutChartOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                        {totalDefects}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                        TOTAL QTY
                      </span>
                    </div>
                  </div>

                  {/* Clean Legend Pill Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 mt-2">
                    {nonZeroDefects.map(([name, count]) => {
                      const total = nonZeroDefects.reduce((a, b) => a + b[1], 0);
                      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                      const color = DEFECT_COLOR_MAP[name] || '#64748b';
                      return (
                        <div
                          key={name}
                          className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[11px] font-medium text-slate-600 truncate">{name}</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                            {count} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CustomizableCard>
            );
          }

          if (card.id === 'chart-customer-bar') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Perbandingan Temuan Defect Packaging per Customer"
                subtitle="Rincian kerusakan Returnable Transport Packaging (RTP) yang diterima dari customer"
                icon={Layers}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  <span className="text-[10px] font-mono text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {customerDefectSummary.length} Customer
                  </span>
                }
              >
                <div className="h-72 w-full p-2.5">
                  <Bar data={customerBarChartData} options={customerBarChartOptions} />
                </div>
              </CustomizableCard>
            );
          }

          if (card.id === 'table-damaged-pkg') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Tabel Detail Temuan Packaging Rusak (NG)"
                subtitle="Data hasil scan in Returnable Transport Packaging (RTP) dengan kerusakan komponen"
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
                    {sortedData.length} Baris
                  </span>
                }
              >
                <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[10px] shadow-2xs">
                      <tr className="group">
                        <th className="py-2 px-2 text-center font-bold text-slate-500 w-8">#</th>
                        {renderSortHeader('Package No.', 'packageNo', 'left')}
                        {renderSortHeader('Serial No.', 'serialNo', 'left')}
                        {renderSortHeader('Plant', 'plant', 'left')}
                        {renderSortHeader('Customer', 'customer', 'left')}
                        {renderSortHeader('User Scan', 'userScan', 'left')}
                        {renderSortHeader('Tgl Scan In', 'tglScanIn', 'left')}
                        {renderSortHeader('Jam Scan In', 'jamScanIn', 'left')}
                        {renderSortHeader('Kondisi', 'kondisi', 'center')}
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-slate-700 text-left">Slot</th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-slate-700 text-left">Kaki</th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-slate-700 text-left">Rangka</th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-slate-700 text-left">Pengait</th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-slate-700 text-left">Dinding</th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-slate-700 text-left">Label Item</th>
                        <th className="py-2 px-2 font-bold uppercase tracking-wider text-slate-700 text-left">Limbah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px]">
                      {sortedData.length === 0 ? (
                        <tr>
                          <td colSpan={16} className="py-8 text-center text-slate-500 font-sans">
                            Tidak ada data packaging rusak yang sesuai filter.
                          </td>
                        </tr>
                      ) : (
                        sortedData.map((row, idx) => (
                          <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2 px-2 font-bold text-slate-900 whitespace-nowrap">{row.packageNo}</td>
                            <td className="py-2 px-2 font-semibold text-slate-700 whitespace-nowrap">{row.serialNo}</td>
                            <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{row.plant}</td>
                            <td className="py-2 px-2 font-medium text-slate-900 max-w-[180px] truncate" title={row.customer}>
                              {row.customer}
                            </td>
                            <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{row.userScan}</td>
                            <td className="py-2 px-2 text-slate-800 whitespace-nowrap font-medium">{formatExcelDate(row.tglScanIn)}</td>
                            <td className="py-2 px-2 text-slate-500 whitespace-nowrap">{formatExcelTime(row.jamScanIn)}</td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                {row.kondisi}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-amber-900 whitespace-nowrap font-medium">{row.slot || '-'}</td>
                            <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{row.kaki || '-'}</td>
                            <td className="py-2 px-2 text-amber-900 whitespace-nowrap font-medium">{row.rangka || '-'}</td>
                            <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{row.pengait || '-'}</td>
                            <td className="py-2 px-2 text-rose-900 whitespace-nowrap font-medium">{row.dinding || '-'}</td>
                            <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{row.labelItem || '-'}</td>
                            <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{row.limbah || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-100/95 backdrop-blur-xs font-bold text-[11px] text-slate-900">
                      <tr>
                        <td colSpan={4} className="py-2 px-2 text-left uppercase tracking-wider text-slate-600 text-[10px]">
                          Total: {sortedData.length} Item
                        </td>
                        <td colSpan={12} className="py-2 px-2 text-right text-slate-600 text-[10px]">
                          Slot: {sortedData.filter(s => s.slot).length} | Dinding: {sortedData.filter(s => s.dinding).length} | Rangka: {sortedData.filter(s => s.rangka).length}
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
    </div>
  );
};
