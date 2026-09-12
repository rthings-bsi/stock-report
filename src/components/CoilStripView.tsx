'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { CoilStripArea } from '../types/warehouse';
import { formatTon, formatPercent, formatQty } from '@/lib/utils';
import {
  Disc,
  Table2,
  Layers,
  PieChart,
  Warehouse,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  TrendingUp,
  Info,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface CoilStripViewProps {
  data: CoilStripArea[];
  isCustomizing?: boolean;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'chart-coil-capacity', width: 'col-span-8' },
  { id: 'chart-coil-composition', width: 'col-span-4' },
  { id: 'recap-table', width: 'col-span-12' },
];

export const CoilStripView: React.FC<CoilStripViewProps> = ({
  data,
  isCustomizing = false
}) => {
  const [selectedGudang, setSelectedGudang] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof CoilStripArea>('persenTerisi');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => {
    return data.filter((d) => d.totalTon > 0 || d.coilTon > 0 || d.stripTon > 0 || d.kapasitas > 0);
  }, [data]);

  const isEmpty = rows.length === 0;

  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_coilstrip_v4');
      if (saved) setCards(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_coilstrip_v4', JSON.stringify(cards));
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

  // Aggregated KPIs
  const totalCoilQty = useMemo(() => rows.reduce((acc, curr) => acc + curr.coilQty, 0), [rows]);
  const totalCoilTon = useMemo(() => rows.reduce((acc, curr) => acc + curr.coilTon, 0), [rows]);
  const totalStripQty = useMemo(() => rows.reduce((acc, curr) => acc + curr.stripQty, 0), [rows]);
  const totalStripTon = useMemo(() => rows.reduce((acc, curr) => acc + curr.stripTon, 0), [rows]);
  const grandTotalQty = totalCoilQty + totalStripQty;
  const grandTotalTon = totalCoilTon + totalStripTon;
  const grandKapasitas = useMemo(() => rows.reduce((acc, curr) => acc + curr.kapasitas, 0), [rows]);
  const grandPersen = grandKapasitas > 0 ? (grandTotalTon / grandKapasitas) * 100 : 0;
  const grandFreeTon = Math.max(0, grandKapasitas - grandTotalTon);

  const coilSharePct = grandTotalTon > 0 ? (totalCoilTon / grandTotalTon) * 100 : 0;
  const stripSharePct = grandTotalTon > 0 ? (totalStripTon / grandTotalTon) * 100 : 0;

  // Find warehouse with highest occupancy
  const sortedByOccupancy = useMemo(() => {
    return [...rows].sort((a, b) => b.persenTerisi - a.persenTerisi);
  }, [rows]);
  const highestWarehouse = sortedByOccupancy[0] || null;

  // Filtered rows for table & views
  const availableGudangs = useMemo(() => {
    return ['ALL', ...Array.from(new Set(rows.map((r) => r.gudang))).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (selectedGudang === 'ALL') return rows;
    return rows.filter((r) => r.gudang === selectedGudang);
  }, [rows, selectedGudang]);

  const sortedTableRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
  }, [filteredRows, sortField, sortDir]);

  const handleSort = (field: keyof CoilStripArea) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Chart 1: Bar Comparison (Kapasitas vs Coil vs Strip)
  const chartData = {
    labels: rows.map((r) => `${r.gudang}`),
    datasets: [
      {
        label: 'Kapasitas (Ton)',
        data: rows.map((r) => r.kapasitas),
        backgroundColor: '#e2e8f0',
        hoverBackgroundColor: '#cbd5e1',
        borderRadius: 4,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
      },
      {
        label: 'Coil (Ton)',
        data: rows.map((r) => r.coilTon),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 4,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
      },
      {
        label: 'Strip (Ton)',
        data: rows.map((r) => r.stripTon),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 4,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'inherit', size: 11, weight: 600 as const },
          color: '#475569',
          boxWidth: 10,
          boxHeight: 10,
          borderRadius: 2,
          useBorderRadius: true,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'inherit', size: 12, weight: 700 as const },
        bodyFont: { family: 'inherit', size: 11 },
        padding: 12,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: function (context: any) {
            const val = context.raw || 0;
            return ` ${context.dataset.label}: ${val.toLocaleString('id-ID', { minimumFractionDigits: 1 })} Ton`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'inherit', size: 11, weight: 600 as const }, color: '#475569' },
        border: { color: '#e2e8f0' },
      },
      y: {
        max: 9500,
        grid: { color: '#f1f5f9' },
        border: { dash: [4, 4], display: false },
        ticks: {
          font: { family: 'inherit', size: 10, weight: 500 as const },
          color: '#64748b',
          stepSize: 2000,
          callback: (value: any) => `${value / 1000}k`,
        },
      },
    },
  };

  // Chart 2: Donut Composition
  const donutData = {
    labels: ['Coil', 'Strip'],
    datasets: [
      {
        data: [Number(totalCoilTon.toFixed(2)), Number(totalStripTon.toFixed(2))],
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

  const donutOptions = {
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
          label: function (context: any) {
            const val = context.raw || 0;
            const pct = grandTotalTon > 0 ? ((val / grandTotalTon) * 100).toFixed(1) : 0;
            return ` ${context.label}: ${formatTon(val, { showUnit: true })} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="space-y-4">

      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <Disc className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <h1 className="text-base font-bold text-white font-sans tracking-tight">
            Stock Bahan Baku: Coil &amp; Strip
          </h1>
        </div>

        {/* TOP FILTER CONTROLS */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/80">
            <Warehouse className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <span className="text-emerald-300 text-[10px] uppercase font-bold">Gudang:</span>
            <select
              value={selectedGudang}
              onChange={(e) => setSelectedGudang(e.target.value)}
              className="bg-emerald-900 border border-emerald-700 text-white text-xs font-bold rounded px-1.5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              <option value="ALL">Semua Gudang ({rows.length})</option>
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

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <p className="text-sm font-bold text-slate-700">Belum ada data Stock Coil &amp; Strip</p>
          <p className="mt-1 text-xs text-slate-500">
            Upload file export SAP Coil &amp; Strip melalui menu &quot;Upload Raw SAP&quot;.
          </p>
        </div>
      ) : (
        <>
          {/* =========================================================================
              2. EXECUTIVE MEETING SUMMARY KPI BAR (5 STRATEGIC METRICS)
              ========================================================================= */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">

            {/* Card 1: Total Tonase & Qty */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Total Bahan Baku</span>
                <div className="p-1 rounded-md bg-slate-100 text-slate-600">
                  <Disc className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 font-tabular">
                  {formatTon(grandTotalTon, { showUnit: true })}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 font-tabular">
                <span className="font-medium text-slate-600">{formatQty(grandTotalQty, { unit: 'Roll' })}</span>
                <span className="text-slate-400">Sisa: {formatTon(grandFreeTon, { showUnit: true })}</span>
              </div>
            </div>

            {/* Card 2: Kapasitas Terisi */}
            <div className={`p-4 rounded-xl border shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-2 ${
              grandPersen > 90
                ? 'bg-gradient-to-br from-white via-rose-50/40 to-rose-50/70 border-rose-200/90 text-rose-950'
                : grandPersen > 80
                ? 'bg-gradient-to-br from-white via-amber-50/40 to-amber-50/70 border-amber-200/90 text-amber-950'
                : 'bg-gradient-to-br from-white via-emerald-50/40 to-emerald-50/60 border-emerald-200/90 text-emerald-950'
            }`}>
              <div className="text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                <span className={grandPersen > 90 ? 'text-rose-900' : grandPersen > 80 ? 'text-amber-900' : 'text-emerald-900'}>
                  Kapasitas Terisi
                </span>
                <div className={`p-1 rounded-md ${
                  grandPersen > 90 ? 'bg-rose-100 text-rose-700' : grandPersen > 80 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight font-tabular">
                  {formatPercent(grandPersen)}
                </div>
              </div>
              <div className="text-[11px] font-bold flex items-center gap-1.5 pt-1 border-t border-slate-200/50">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-2xs ${
                  grandPersen > 90
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : grandPersen > 80
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {grandPersen > 90 ? 'OVERCAPACITY' : grandPersen > 80 ? 'WASPADA' : 'OPTIMAL'}
                </span>
                <span className="font-normal text-slate-500 text-[10px] font-tabular">dari {formatTon(grandKapasitas, { showUnit: true })}</span>
              </div>
            </div>

            {/* Card 3: Coil Breakdown */}
            <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center justify-between">
                <span>Coil</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs font-tabular">
                  {coilSharePct.toFixed(1)}% Share
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-emerald-950 font-tabular">
                  {formatTon(totalCoilTon, { showUnit: true })}
                </div>
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100 font-tabular">
                <span className="text-emerald-800 font-semibold">{formatQty(totalCoilQty, { unit: 'Roll' })}</span> &bull; Bahan Baku Induk
              </div>
            </div>

            {/* Card 4: Strip Breakdown */}
            <div className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between">
                <span>Strip</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs font-tabular">
                  {stripSharePct.toFixed(1)}% Share
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-amber-950 font-tabular">
                  {formatTon(totalStripTon, { showUnit: true })}
                </div>
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100 font-tabular">
                <span className="text-amber-800 font-semibold">{formatQty(totalStripQty, { unit: 'Roll' })}</span> &bull; Strip Siap Forming
              </div>
            </div>

            {/* Card 5: Critical / Highest Warehouse */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-2 col-span-2 md:col-span-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Gudang Terpadat</span>
                <div className="p-1 rounded-md bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 font-tabular">
                  {highestWarehouse ? highestWarehouse.gudang : '-'}
                </div>
              </div>
              <div className="text-[11px] text-slate-600 truncate pt-1 border-t border-slate-100 font-tabular">
                {highestWarehouse ? `${formatPercent(highestWarehouse.persenTerisi)} (${formatTon(highestWarehouse.totalTon, { showUnit: true })})` : 'Semua seimbang'}
              </div>
            </div>

          </div>

          {/* =========================================================================
              3. CHARTS GRID (BAR COMPARISON + COMPOSITION DONUT)
              ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {cards.map((card, index) => {
              // CARD 1: BAR CHART DISTRIBUSI STOCK VS KAPASITAS
              if (card.id === 'chart-coil-capacity') {
                return (
                  <CustomizableCard
                    key={card.id}
                    id={card.id}
                    title="Perbandingan Stock Bahan Baku vs Kapasitas Per Gudang"
                    subtitle="Komparasi kapasitas maksimum terhadap aktual tonase Coil dan Strip"
                    icon={Disc}
                    width={card.width}
                    isCustomizing={isCustomizing}
                    canMoveLeft={index > 0}
                    canMoveRight={index < cards.length - 1}
                    onMoveLeft={() => handleMove(index, 'left')}
                    onMoveRight={() => handleMove(index, 'right')}
                    onWidthChange={(w) => handleWidthChange(card.id, w)}
                    badge={
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-semibold tracking-wide shadow-2xs">
                        Tonase
                      </span>
                    }
                  >
                    <div className="h-64 w-full pt-1">
                      <Bar data={chartData} options={chartOptions} />
                    </div>
                  </CustomizableCard>
                );
              }

              // CARD 2: DONUT COMPOSITION COIL VS STRIP
              if (card.id === 'chart-coil-composition') {
                return (
                  <CustomizableCard
                    key={card.id}
                    id={card.id}
                    title="Komposisi Bahan Baku"
                    subtitle="Rasio Coil vs Strip"
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
                        {formatTon(grandTotalTon, { decimals: 2 })} Ton
                      </span>
                    }
                  >
                    <div className="flex flex-col justify-between h-full space-y-3 font-mono p-1">
                      <div className="h-40 sm:h-44 flex items-center justify-center relative my-auto min-w-0">
                        <Doughnut data={donutData} options={donutOptions} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                            {formatTon(grandTotalTon, { decimals: 2 })}
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
                            <span className="text-[11px] font-medium text-slate-600 truncate">Coil ({totalCoilQty} Roll)</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                            {formatTon(totalCoilTon, { decimals: 2 })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600 truncate">Strip ({totalStripQty} Roll)</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                            {formatTon(totalStripTon, { decimals: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CustomizableCard>
                );
              }

              // CARD: COMPREHENSIVE RECAPITULATION DATA TABLE
              if (card.id === 'recap-table') {
                return (
                  <CustomizableCard
                    key={card.id}
                    id={card.id}
                    title="Tabel Rekapitulasi Alokasi Bahan Baku"
                    subtitle="Rincian kuantitas roll, tonase aktual, kapasitas maksimum, dan ruang sisa per bay gudang"
                    icon={Table2}
                    width={card.width}
                    isCustomizing={isCustomizing}
                    canMoveLeft={index > 0}
                    canMoveRight={index < cards.length - 1}
                    onMoveLeft={() => handleMove(index, 'left')}
                    onMoveRight={() => handleMove(index, 'right')}
                    onWidthChange={(w) => handleWidthChange(card.id, w)}
                    badge={
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-semibold tracking-wide shadow-2xs">
                        {sortedTableRows.length} Gudang
                      </span>
                    }
                  >
                    <div className="overflow-x-auto max-h-[500px] rounded-lg border border-slate-200/80">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-700 text-[10px] uppercase tracking-wider shadow-2xs">
                          <tr>
                            <th
                              onClick={() => handleSort('gudang')}
                              className="py-3 px-3.5 font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                              rowSpan={2}
                            >
                              <div className="flex items-center gap-1.5">
                                <span>Gudang</span>
                                {sortField === 'gudang' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-slate-900" /> : <ArrowDown className="h-3 w-3 text-slate-900" />)}
                              </div>
                            </th>
                            <th className="py-3 px-3 font-bold" rowSpan={2}>Area Alokasi</th>
                            <th className="py-1.5 text-center font-bold border-l border-r border-slate-200 bg-emerald-50/80 text-emerald-950" colSpan={2}>Coil</th>
                            <th className="py-1.5 text-center font-bold bg-amber-50/80 text-amber-950 border-r border-slate-200" colSpan={2}>Strip</th>
                            <th className="py-1.5 text-center font-bold bg-slate-100 text-slate-900 border-r border-slate-200" colSpan={2}>Total Bahan Baku</th>
                            <th
                              onClick={() => handleSort('kapasitas')}
                              className="py-3 px-3 text-right font-bold border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                              rowSpan={2}
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                <span>Kapasitas</span>
                                {sortField === 'kapasitas' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-slate-900" /> : <ArrowDown className="h-3 w-3 text-slate-900" />)}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSort('persenTerisi')}
                              className="py-3 px-3.5 text-right font-bold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
                              rowSpan={2}
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                <span>% Terisi</span>
                                {sortField === 'persenTerisi' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-slate-900" /> : <ArrowDown className="h-3 w-3 text-slate-900" />)}
                              </div>
                            </th>
                          </tr>
                          <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 text-[10px]">
                            <th className="py-1.5 px-3 text-right font-semibold border-l border-slate-200">Roll</th>
                            <th className="py-1.5 px-3 text-right font-semibold border-r border-slate-200">Tonase</th>
                            <th className="py-1.5 px-3 text-right font-semibold">Roll</th>
                            <th className="py-1.5 px-3 text-right font-semibold border-r border-slate-200">Tonase</th>
                            <th className="py-1.5 px-3 text-right font-semibold text-slate-900">Total Roll</th>
                            <th className="py-1.5 px-3 text-right font-semibold text-slate-900 border-r border-slate-200">Total Ton</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800 bg-white">
                          {sortedTableRows.map((r) => {
                            const isHigh = r.persenTerisi > 90;
                            const isWarn = r.persenTerisi > 80 && r.persenTerisi <= 90;

                            return (
                              <tr
                                key={r.gudang}
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  isHigh ? 'bg-rose-50/30' : ''
                                }`}
                              >
                                <td className="py-2.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                                  {r.gudang}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                                  {r.area}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-700 font-tabular border-l border-slate-100">
                                  {formatQty(r.coilQty)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-emerald-800 font-tabular border-r border-slate-100">
                                  {formatTon(r.coilTon)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-700 font-tabular">
                                  {formatQty(r.stripQty)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-amber-900 font-tabular border-r border-slate-100">
                                  {formatTon(r.stripTon)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-tabular">
                                  {formatQty(r.totalQty)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-tabular border-r border-slate-100">
                                  {formatTon(r.totalTon)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-600 font-tabular border-r border-slate-100">
                                  {formatTon(r.kapasitas)}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-bold font-tabular">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    isHigh
                                      ? 'bg-rose-100 text-rose-800'
                                      : isWarn
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {formatPercent(r.persenTerisi)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="sticky bottom-0 border-t-2 border-slate-200 bg-slate-100/95 font-bold text-slate-900 backdrop-blur-xs shadow-xs">
                          <tr>
                            <td className="py-3 px-3.5 uppercase text-slate-900 tracking-wide" colSpan={2}>
                              TOTAL ({sortedTableRows.length} GUDANG)
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-900 font-tabular border-l border-slate-200">
                              {formatQty(totalCoilQty)}
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-900 font-tabular border-r border-slate-200">
                              {formatTon(totalCoilTon)}
                            </td>
                            <td className="py-3 px-3 text-right text-amber-950 font-tabular">
                              {formatQty(totalStripQty)}
                            </td>
                            <td className="py-3 px-3 text-right text-amber-950 font-tabular border-r border-slate-200">
                              {formatTon(totalStripTon)}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-950 font-tabular">
                              {formatQty(grandTotalQty)}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-950 font-tabular border-r border-slate-200">
                              {formatTon(grandTotalTon)}
                            </td>
                            <td className="py-3 px-3 text-right font-tabular border-r border-slate-200">
                              {formatTon(grandKapasitas)}
                            </td>
                            <td className="py-3 px-3.5 text-right text-slate-950 font-tabular">
                              {formatPercent(grandPersen)}
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
        </>
      )}
    </div>
  );
};

