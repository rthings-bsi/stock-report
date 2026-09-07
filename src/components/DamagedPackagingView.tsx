'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { DamagedPackagingItem } from '../types/warehouse';
import { readExcelFile } from '@/lib/parser';
import { parseDamagedPackagingFile } from '@/lib/parseDamagedPackaging';
import { formatTon, formatQty } from '@/lib/utils';
import {
  PackageX,
  Table2,
  BarChart3,
  PieChart,
  Search,
  Upload,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface DamagedPackagingViewProps {
  data?: DamagedPackagingItem[];
  isCustomizing?: boolean;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'chart-defect-bar', width: 'col-span-8' },
  { id: 'chart-defect-donut', width: 'col-span-4' },
  { id: 'chart-customer-bar', width: 'col-span-12' },
  { id: 'table-damaged-pkg', width: 'col-span-12' }
];

export const DamagedPackagingView: React.FC<DamagedPackagingViewProps> = ({
  data = [],
  isCustomizing = false
}) => {
  const [items, setItems] = useState<DamagedPackagingItem[]>(data);
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_damaged_pkg');
      if (saved) setCards(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_damaged_pkg', JSON.stringify(cards));
    } catch {}
  }, [cards, isMounted]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPlant, setSelectedPlant] = useState('ALL');

  // Sorting
  const [sortField, setSortField] = useState<keyof DamagedPackagingItem>('tglScanIn');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readExcelFile(file);
      const parsed = parseDamagedPackagingFile(rows);
      if (parsed.length > 0) {
        setItems(parsed);
      }
    } catch (err) {
      console.error('Gagal membaca file packaging rusak:', err);
    }
  };

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
  const donutChartData = {
    labels: nonZeroDefects.map(([k]) => k),
    datasets: [
      {
        data: nonZeroDefects.map(([_, count]) => count),
        backgroundColor: ['#d97706', '#b91c1c', '#047857', '#0284c7', '#64748b'],
        borderWidth: 2,
        borderColor: '#ffffff',
        cutout: '70%',
      },
    ],
  };

  const donutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'monospace', size: 10, weight: 'bold' as const },
          color: '#475569',
          boxWidth: 10,
          boxHeight: 10,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'monospace', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        padding: 8,
        cornerRadius: 4,
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
        borderRadius: 2,
      },
      {
        label: 'Dinding Pecah / Retak',
        data: customerDefectSummary.map((c) => c.dinding),
        backgroundColor: '#b91c1c',
        hoverBackgroundColor: '#991b1b',
        borderRadius: 2,
      },
      {
        label: 'Rangka Tidak Utuh',
        data: customerDefectSummary.map((c) => c.rangka),
        backgroundColor: '#047857',
        hoverBackgroundColor: '#065f46',
        borderRadius: 2,
      },
      {
        label: 'Lainnya',
        data: customerDefectSummary.map((c) => c.other),
        backgroundColor: '#64748b',
        hoverBackgroundColor: '#475569',
        borderRadius: 2,
      },
    ],
  };

  const customerBarChartOptions = {
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
          usePointStyle: true,
          pointStyle: 'rectRounded',
          padding: 14,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'monospace', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        padding: 8,
        cornerRadius: 4,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.raw} Unit`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'monospace', size: 9, weight: 'bold' as const }, color: '#334155' },
        border: { color: '#cbd5e1' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'monospace', size: 9 }, color: '#64748b', stepSize: 1 },
        border: { dash: [4, 4], color: '#cbd5e1' },
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
      {/* SECTION BANNER TOP */}
      <div className="rounded-md border border-black/20 theme-banner text-white p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Data Temuan Packaging Rusak (NG)
            </h2>
            <span className="text-[10px] font-mono bg-amber-950/60 text-amber-200 px-2 py-0.5 rounded border border-amber-800">
              Returnable Transport Packaging (RTP)
            </span>
          </div>
          <p className="text-[11px] text-emerald-200 font-medium font-mono">
            Monitoring scan in packaging rusak: Slot, Kaki, Rangka, Pengait, Dinding, Label Item &amp; Limbah
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv, .txt, .tsv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-bold transition-all shadow-2xs cursor-pointer border border-emerald-700"
          >
            <Upload className="h-3.5 w-3.5 text-amber-300" />
            <span>Upload File Packaging</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-md border border-slate-200 shadow-2xs font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari package, serial, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          {/* Filter Customer */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Customer:</span>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="px-2 py-1.5 rounded border border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 cursor-pointer focus:outline-hidden max-w-[200px] truncate"
            >
              <option value="ALL">Semua Customer</option>
              {customerList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filter Defect Category */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Defect:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-1.5 rounded border border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 cursor-pointer focus:outline-hidden"
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
          </div>
        </div>

        <div className="text-[11px] text-slate-500 text-right">
          Total terfilter: <span className="font-bold text-slate-900">{filteredData.length}</span> unit
        </div>
      </div>

      {/* CHARTS & DETAIL TABLE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {cards.map((card, index) => {
          if (card.id === 'chart-defect-bar') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Distribusi Kerusakan Berdasarkan Komponen Packaging"
                subtitle="Jumlah unit kemasan NG per bagian komponen"
                icon={BarChart3}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Defect Breakdown
                  </span>
                }
              >
                <div className="h-64 w-full">
                  <Bar data={defectBarChartData} options={defectBarChartOptions} />
                </div>
              </CustomizableCard>
            );
          }

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
                  <span className="text-[10px] font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    Share (%)
                  </span>
                }
              >
                <div className="h-64 w-full flex items-center justify-center">
                  <Doughnut data={donutChartData} options={donutChartOptions} />
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
                <div className="h-72 w-full">
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
                            <td className="py-2 px-2 text-slate-800 whitespace-nowrap font-medium">{row.tglScanIn}</td>
                            <td className="py-2 px-2 text-slate-500 whitespace-nowrap">{row.jamScanIn}</td>
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
