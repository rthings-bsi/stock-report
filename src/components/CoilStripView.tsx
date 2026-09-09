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
  ShieldAlert
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
        backgroundColor: '#cbd5e1',
        hoverBackgroundColor: '#94a3b8',
        borderRadius: 3,
        barPercentage: 0.65,
        categoryPercentage: 0.7,
      },
      {
        label: 'Coil (Ton)',
        data: rows.map((r) => r.coilTon),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 3,
        barPercentage: 0.65,
        categoryPercentage: 0.7,
      },
      {
        label: 'Strip (Ton)',
        data: rows.map((r) => r.stripTon),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 3,
        barPercentage: 0.65,
        categoryPercentage: 0.7,
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
          font: { family: 'monospace', size: 11, weight: 'bold' as const },
          color: '#334155',
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'monospace', size: 12, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        padding: 10,
        cornerRadius: 6,
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
        ticks: { font: { family: 'monospace', size: 10, weight: 'bold' as const }, color: '#334155' },
      },
      y: {
        max: 9500,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { family: 'monospace', size: 10 },
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
        data: [totalCoilTon, totalStripTon],
        backgroundColor: ['#059669', '#d97706'],
        hoverBackgroundColor: ['#047857', '#b45309'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'monospace', size: 11, weight: 'bold' as const },
          color: '#334155',
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
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
    <div className="space-y-5 font-sans">
      
      {/* =========================================================================
          1. SECTION BANNER TOP WITH EXECUTIVE GUDANG FILTER
          ========================================================================= */}
      <div className="rounded-md border border-black/20 theme-banner text-white p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Stock Bahan Baku: Coil &amp; Strip
            </h2>
            {selectedGudang !== 'ALL' && (
              <span className="text-[10px] font-mono bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-bold">
                Filter: {selectedGudang}
              </span>
            )}
          </div>
          <p className="text-[11px] text-emerald-200 font-medium font-mono mt-0.5">
            Monitoring kapasitas terisi bahan baku pipa, komposisi tonase, dan alokasi bay Plant 1105
          </p>
        </div>

        {/* TOP FILTER CONTROLS */}
        <div className="flex items-center gap-2.5 flex-wrap font-mono text-xs">
          <div className="flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
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
              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 text-[11px] font-bold rounded shadow-2xs transition-all cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-bold text-slate-700">Belum ada data Stock Coil &amp; Strip</p>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Upload file export SAP Coil &amp; Strip melalui menu &quot;Upload Raw SAP&quot;.
          </p>
        </div>
      ) : (
        <>
          {/* =========================================================================
              2. EXECUTIVE MEETING SUMMARY KPI BAR (5 STRATEGIC METRICS)
              ========================================================================= */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
            
            {/* Card 1: Total Tonase & Qty */}
            <div className="p-3.5 rounded-md bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between font-sans">
                <span>Total Bahan Baku</span>
                <Disc className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {formatTon(grandTotalTon, { showUnit: true })}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between font-sans pt-0.5">
                <span>{formatQty(grandTotalQty, { unit: 'Roll' })}</span>
                <span>Sisa: {formatTon(grandFreeTon, { showUnit: true })}</span>
              </div>
            </div>

            {/* Card 2: Kapasitas Terisi */}
            <div className={`p-3.5 rounded-md border shadow-2xs space-y-1 ${
              grandPersen > 90
                ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                : grandPersen > 80
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            }`}>
              <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between font-sans">
                <span>Kapasitas Terisi</span>
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              <div className="text-xl font-black">
                {formatPercent(grandPersen)}
              </div>
              <div className="text-[10px] font-bold font-sans flex items-center gap-1.5 pt-0.5">
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${
                  grandPersen > 90
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : grandPersen > 80
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {grandPersen > 90 ? 'OVERCAPACITY' : grandPersen > 80 ? 'WASPADA' : 'OPTIMAL'}
                </span>
                <span className="font-normal opacity-80">dari {formatTon(grandKapasitas, { showUnit: true })}</span>
              </div>
            </div>

            {/* Card 3: Coil Breakdown */}
            <div className="p-3.5 rounded-md bg-emerald-50/40 border border-emerald-200 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center justify-between font-sans">
                <span>Coil</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {coilSharePct.toFixed(1)}% Share
                </span>
              </div>
              <div className="text-xl font-black text-emerald-950">
                {formatTon(totalCoilTon, { showUnit: true })}
              </div>
              <div className="text-[10px] text-emerald-800 font-sans">
                {formatQty(totalCoilQty, { unit: 'Roll' })} &bull; Bahan Baku Induk
              </div>
            </div>

            {/* Card 4: Strip Breakdown */}
            <div className="p-3.5 rounded-md bg-amber-50/40 border border-amber-200 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between font-sans">
                <span>Strip</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  {stripSharePct.toFixed(1)}% Share
                </span>
              </div>
              <div className="text-xl font-black text-amber-950">
                {formatTon(totalStripTon, { showUnit: true })}
              </div>
              <div className="text-[10px] text-amber-800 font-sans">
                {formatQty(totalStripQty, { unit: 'Roll' })} &bull; Strip Siap Forming
              </div>
            </div>

            {/* Card 5: Critical / Highest Warehouse */}
            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200/90 shadow-2xs space-y-1 col-span-2 md:col-span-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between font-sans">
                <span>Gudang Terpadat</span>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {highestWarehouse ? highestWarehouse.gudang : '-'}
              </div>
              <div className="text-[10px] text-slate-600 font-sans truncate">
                {highestWarehouse ? `${formatPercent(highestWarehouse.persenTerisi)} (${formatTon(highestWarehouse.totalTon, { showUnit: true })})` : 'Semua seimbang'}
              </div>
            </div>

          </div>

          {/* =========================================================================
              3. EXECUTIVE MEETING INSIGHT BANNER
              ========================================================================= */}
          <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 flex items-start gap-2.5 text-xs text-emerald-950 font-sans shadow-2xs">
            <Info className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold">Executive Meeting Note: </strong>
              Total bahan baku Plant 1105 terisi <strong>{formatPercent(grandPersen)}</strong> ({formatTon(grandTotalTon, { showUnit: true })} dari kapasitas {formatTon(grandKapasitas, { showUnit: true })}). Porsi <strong>Coil mendominasi {coilSharePct.toFixed(1)}%</strong>, sementara <strong>Strip {stripSharePct.toFixed(1)}%</strong>. 
              {highestWarehouse && highestWarehouse.persenTerisi > 80 && (
                <span className="text-amber-900 font-semibold ml-1">
                  Perhatian khusus untuk area <strong>{highestWarehouse.gudang} ({highestWarehouse.area})</strong> yang telah mencapai {formatPercent(highestWarehouse.persenTerisi)} kapasitas.
                </span>
              )}
            </div>
          </div>

          {/* =========================================================================
              4. CHARTS GRID (BAR COMPARISON + COMPOSITION DONUT)
              ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
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
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                        Tonase
                      </span>
                    }
                  >
                    <div className="h-64 w-full">
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
                  >
                    <div className="flex flex-col justify-between h-full space-y-3 font-mono">
                      <div className="h-44 w-full relative flex items-center justify-center">
                        <Doughnut data={donutData} options={donutOptions} />
                        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                          <span className="text-xs font-black text-slate-900">{formatTon(grandTotalTon, { showUnit: true })}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div className="p-2 rounded bg-emerald-50/70 border border-emerald-200 space-y-0.5">
                          <span className="text-[9px] text-emerald-800 font-bold uppercase block">Coil</span>
                          <span className="font-bold text-emerald-950 block">{formatPercent(coilSharePct)}</span>
                          <span className="text-[10px] text-emerald-700">{formatQty(totalCoilQty, { unit: 'Roll' })}</span>
                        </div>

                        <div className="p-2 rounded bg-amber-50/70 border border-amber-200 space-y-0.5">
                          <span className="text-[9px] text-amber-900 font-bold uppercase block">Strip</span>
                          <span className="font-bold text-amber-950 block">{formatPercent(stripSharePct)}</span>
                          <span className="text-[10px] text-amber-800">{formatQty(totalStripQty, { unit: 'Roll' })}</span>
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
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300 font-semibold">
                        {sortedTableRows.length} Gudang
                      </span>
                    }
                  >
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-slate-700 text-[10px] uppercase shadow-2xs">
                          <tr>
                            <th
                              onClick={() => handleSort('gudang')}
                              className="py-2.5 px-3 font-bold cursor-pointer hover:bg-slate-200 transition-colors"
                              rowSpan={2}
                            >
                              <div className="flex items-center gap-1">
                                <span>Gudang</span>
                                {sortField === 'gudang' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                              </div>
                            </th>
                            <th className="py-2.5 px-3 font-bold" rowSpan={2}>Area Alokasi</th>
                            <th className="py-1 text-center font-bold border-l border-r border-slate-200 bg-emerald-50 text-emerald-950" colSpan={2}>Coil</th>
                            <th className="py-1 text-center font-bold bg-amber-50 text-amber-950 border-r border-slate-200" colSpan={2}>Strip</th>
                            <th className="py-1 text-center font-bold bg-slate-200/80 text-slate-900 border-r border-slate-200" colSpan={2}>Total Bahan Baku</th>
                            <th
                              onClick={() => handleSort('kapasitas')}
                              className="py-2.5 px-2.5 text-right font-bold border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
                              rowSpan={2}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Kapasitas</span>
                                {sortField === 'kapasitas' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSort('persenTerisi')}
                              className="py-2.5 px-3 text-right font-bold text-slate-900 cursor-pointer hover:bg-slate-200 transition-colors"
                              rowSpan={2}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>% Terisi</span>
                                {sortField === 'persenTerisi' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                              </div>
                            </th>
                          </tr>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[10px]">
                            <th className="py-1 px-2.5 text-right font-bold border-l border-slate-200">Roll</th>
                            <th className="py-1 px-2.5 text-right font-bold border-r border-slate-200">Tonase</th>
                            <th className="py-1 px-2.5 text-right font-bold">Roll</th>
                            <th className="py-1 px-2.5 text-right font-bold border-r border-slate-200">Tonase</th>
                            <th className="py-1 px-2.5 text-right font-bold text-slate-900">Total Roll</th>
                            <th className="py-1 px-2.5 text-right font-bold text-slate-900 border-r border-slate-200">Total Ton</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {sortedTableRows.map((r) => {
                            const freeTon = Math.max(0, r.kapasitas - r.totalTon);
                            const isHigh = r.persenTerisi > 90;
                            const isWarn = r.persenTerisi > 80 && r.persenTerisi <= 90;

                            return (
                              <tr
                                key={r.gudang}
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  isHigh ? 'bg-rose-50/30' : ''
                                }`}
                              >
                                <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                                  {r.gudang}
                                </td>
                                <td className="py-2 px-3 font-medium text-slate-600 whitespace-nowrap">
                                  {r.area}
                                </td>
                                <td className="py-2 px-2.5 text-right text-slate-700 border-l border-slate-100">
                                  {formatQty(r.coilQty)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-semibold text-emerald-800 border-r border-slate-100">
                                  {formatTon(r.coilTon)}
                                </td>
                                <td className="py-2 px-2.5 text-right text-slate-700">
                                  {formatQty(r.stripQty)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-semibold text-amber-900 border-r border-slate-100">
                                  {formatTon(r.stripTon)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                                  {formatQty(r.totalQty)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-bold text-slate-900 border-r border-slate-100">
                                  {formatTon(r.totalTon)}
                                </td>
                                <td className="py-2 px-2.5 text-right text-slate-600 border-r border-slate-100">
                                  {formatTon(r.kapasitas)}
                                </td>
                                <td className="py-2 px-3 text-right font-bold">
                                  <span className={isHigh ? 'text-rose-700' : isWarn ? 'text-amber-700' : 'text-emerald-700'}>
                                    {formatPercent(r.persenTerisi)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900 shadow-xs">
                          <tr>
                            <td className="py-2.5 px-3 uppercase text-slate-900" colSpan={2}>
                              TOTAL ({sortedTableRows.length} GUDANG)
                            </td>
                            <td className="py-2.5 px-2.5 text-right text-emerald-900 border-l border-slate-200">
                              {formatQty(totalCoilQty)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right text-emerald-900 border-r border-slate-200">
                              {formatTon(totalCoilTon)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right text-amber-950">
                              {formatQty(totalStripQty)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right text-amber-950 border-r border-slate-200">
                              {formatTon(totalStripTon)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right text-slate-950">
                              {formatQty(grandTotalQty)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right text-slate-950 border-r border-slate-200">
                              {formatTon(grandTotalTon)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right border-r border-slate-200">
                              {formatTon(grandKapasitas)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-950">
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
