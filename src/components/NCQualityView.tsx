'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Chart, Doughnut } from 'react-chartjs-2';
import { PipeNCWarehouse, PipeNCItem } from '../types/warehouse';
import { formatTon, formatPercent } from '@/lib/utils';
import {
  ShieldAlert,
  Table2,
  ListOrdered,
  Warehouse,
  Filter,
  Check,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldX,
  AlertCircle,
  PieChart,
  X,
  Search,
  Copy,
  ExternalLink
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface NCQualityViewProps {
  ncWarehouseData: PipeNCWarehouse[];
  ncItems: PipeNCItem[];
  isCustomizing?: boolean;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'combo-chart', width: 'col-span-7' },
  { id: 'donut-chart', width: 'col-span-5' },
  { id: 'recap-table', width: 'col-span-12' },
  { id: 'top10-grade-e', width: 'col-span-6' },
  { id: 'top10-grade-c', width: 'col-span-6' },
];

export const NCQualityView: React.FC<NCQualityViewProps> = ({
  ncWarehouseData = [],
  ncItems = [],
  isCustomizing = false
}) => {
  const [selectedGudang, setSelectedGudang] = useState<string>('ALL');
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  // Sorting state
  const [recapSortField, setRecapSortField] = useState<keyof PipeNCWarehouse>('gradeE');
  const [recapSortDir, setRecapSortDir] = useState<'asc' | 'desc'>('desc');

  const [eSortField, setESortField] = useState<keyof PipeNCItem>('totalTon');
  const [eSortDir, setESortDir] = useState<'asc' | 'desc'>('desc');

  const [cSortField, setCSortField] = useState<keyof PipeNCItem>('totalTon');
  const [cSortDir, setCSortDir] = useState<'asc' | 'desc'>('desc');

  // NC Stock Drilldown Modal State
  const [selectedNCModalGrade, setSelectedNCModalGrade] = useState<'ALL' | 'Grade E' | 'Grade C' | null>(null);
  const [modalGudangFilter, setModalGudangFilter] = useState<string>('ALL');
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [modalSortField, setModalSortField] = useState<keyof PipeNCItem>('totalTon');
  const [modalSortDir, setModalSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNCModalGrade(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_nc_v4');
      if (saved) {
        const parsed: CardState[] = JSON.parse(saved);
        const missing = DEFAULT_CARDS.filter((dc) => !parsed.some((c) => c.id === dc.id));
        setCards([...parsed, ...missing]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_nc_v4', JSON.stringify(cards));
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

  // Available gudang list for filter
  const availableGudangs = useMemo(() => {
    const set = new Set<string>();
    ncWarehouseData.forEach((w) => {
      if (w.gudang) set.add(w.gudang);
    });
    ncItems.forEach((i) => {
      if (i.gudang) set.add(i.gudang);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [ncWarehouseData, ncItems]);

  // Filtered items by selected gudang
  const filteredItems = useMemo(() => {
    return ncItems.filter((item) => {
      if (selectedGudang !== 'ALL' && item.gudang !== selectedGudang) return false;
      return true;
    });
  }, [ncItems, selectedGudang]);

  // Strictly Top 10 Terbesar Grade E (Hold Mutu)
  const top10GradeE = useMemo(() => {
    return filteredItems
      .filter((i) => i.grade === 'Grade E')
      .sort((a, b) => b.totalTon - a.totalTon)
      .slice(0, 10);
  }, [filteredItems]);

  // Strictly Top 10 Terbesar Grade C (Repair Mutu)
  const top10GradeC = useMemo(() => {
    return filteredItems
      .filter((i) => i.grade === 'Grade C')
      .sort((a, b) => b.totalTon - a.totalTon)
      .slice(0, 10);
  }, [filteredItems]);

  // Global metric sums
  const totalPrime = ncWarehouseData.reduce((acc, curr) => acc + curr.prime, 0);
  const totalGradeE = ncWarehouseData.reduce((acc, curr) => acc + curr.gradeE, 0);
  const totalGradeC = ncWarehouseData.reduce((acc, curr) => acc + curr.gradeC, 0);
  const totalNC = totalGradeE + totalGradeC;
  const totalAll = totalPrime + totalNC;

  const persenGradeETotal = totalAll > 0 ? (totalGradeE / totalAll) * 100 : 0;
  const persenGradeCTotal = totalAll > 0 ? (totalGradeC / totalAll) * 100 : 0;
  const persenNCTotal = totalAll > 0 ? (totalNC / totalAll) * 100 : 0;

  // Top 3 largest warehouses by Grade E tonnage (for warning indicator)
  const top3GradeEGudangs = useMemo(() => {
    return [...ncWarehouseData]
      .sort((a, b) => b.gradeE - a.gradeE)
      .slice(0, 3)
      .map((d) => d.gudang);
  }, [ncWarehouseData]);

  const isEmpty = ncWarehouseData.length === 0 && ncItems.length === 0;

  // Chart data (Distribution per Warehouse: PRIME vs Grade C vs Grade E)
  const chartData = {
    labels: ncWarehouseData.map((d) => d.gudang),
    datasets: [
      {
        type: 'bar' as const,
        label: 'PRIME (Ton)',
        data: ncWarehouseData.map((d) => d.prime),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 2,
      },
      {
        type: 'bar' as const,
        label: 'Grade C (Ton)',
        data: ncWarehouseData.map((d) => d.gradeC),
        backgroundColor: '#f59e0b',
        hoverBackgroundColor: '#d97706',
        borderRadius: 2,
      },
      {
        type: 'bar' as const,
        label: 'Grade E (Ton)',
        data: ncWarehouseData.map((d) => d.gradeE),
        backgroundColor: '#dc2626',
        hoverBackgroundColor: '#b91c1c',
        borderRadius: 2,
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
          font: { family: 'monospace', size: 10, weight: 'bold' as const },
          color: '#475569',
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'monospace', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        padding: 8,
        cornerRadius: 4,
        callbacks: {
          title: function (items: any[]) {
            if (items.length > 0) {
              const idx = items[0].dataIndex;
              const w = ncWarehouseData[idx];
              const totalW = w ? w.prime + w.gradeC + w.gradeE : 0;
              return `${w?.gudang} (Total: ${formatTon(totalW)})`;
            }
            return '';
          },
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
        ticks: { font: { family: 'monospace', size: 9 }, color: '#64748b' },
        border: { dash: [4, 4], color: '#cbd5e1' },
      },
    },
  };

  // Active warehouse selection metrics for donut
  const activeWarehouseNC = useMemo(() => {
    if (selectedGudang === 'ALL') return null;
    return ncWarehouseData.find((d) => d.gudang === selectedGudang) || null;
  }, [ncWarehouseData, selectedGudang]);

  const donutPrime = activeWarehouseNC ? activeWarehouseNC.prime : totalPrime;
  const donutGradeE = activeWarehouseNC ? activeWarehouseNC.gradeE : totalGradeE;
  const donutGradeC = activeWarehouseNC ? activeWarehouseNC.gradeC : totalGradeC;
  const donutTotal = donutPrime + donutGradeE + donutGradeC;
  const donutPrimePct = donutTotal > 0 ? (donutPrime / donutTotal) * 100 : 0;
  const donutGradeEPct = donutTotal > 0 ? (donutGradeE / donutTotal) * 100 : 0;
  const donutGradeCPct = donutTotal > 0 ? (donutGradeC / donutTotal) * 100 : 0;

  const donutData = {
    labels: ['PRIME', 'Grade E', 'Grade C'],
    datasets: [
      {
        data: [
          Number(donutPrime.toFixed(1)),
          Number(donutGradeE.toFixed(1)),
          Number(donutGradeC.toFixed(1)),
        ],
        backgroundColor: ['#059669', '#dc2626', '#f59e0b'],
        hoverBackgroundColor: ['#047857', '#b91c1c', '#d97706'],
        borderWidth: 2,
        borderColor: '#ffffff',
        cutout: '68%',
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: any, elements: any[]) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        if (index === 1) {
          // Grade E
          setSelectedNCModalGrade('Grade E');
          setModalGudangFilter(selectedGudang);
        } else if (index === 2) {
          // Grade C
          setSelectedNCModalGrade('Grade C');
          setModalGudangFilter(selectedGudang);
        } else if (index === 0) {
          // PRIME - open ALL NC
          setSelectedNCModalGrade('ALL');
          setModalGudangFilter(selectedGudang);
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'monospace', size: 10, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 10 },
        padding: 8,
        cornerRadius: 4,
        displayColors: false,
        callbacks: {
          title: () => '',
          label: function (context: any) {
            const val = context.raw || 0;
            const pct = donutTotal > 0 ? (val / donutTotal) * 100 : 0;
            return ` ${context.label}: ${val.toLocaleString('id-ID', { minimumFractionDigits: 1 })} Ton (${pct.toFixed(1)}%)`;
          },
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

  // Render Table strictly for Top 10 items (Grade E or Grade C)
  const renderTop10Table = (
    items: PipeNCItem[],
    targetGrade: 'Grade E' | 'Grade C',
    sortField: keyof PipeNCItem,
    sortDir: 'asc' | 'desc',
    setSortField: React.Dispatch<React.SetStateAction<keyof PipeNCItem>>,
    setSortDir: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>
  ) => {
    const handleSort = (field: keyof PipeNCItem) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
    };

    const sorted = sortItems(items, sortField, sortDir);
    const sumFg = items.reduce((a, b) => a + (b.fgTon || 0), 0);
    const sumWip = items.reduce((a, b) => a + (b.wipTon || 0), 0);
    const sumTotal = items.reduce((a, b) => a + (b.totalTon || 0), 0);

    const isGradeE = targetGrade === 'Grade E';

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[11px] shadow-2xs">
            <tr className="group text-slate-700">
              <th className="py-2.5 px-3 text-center font-bold text-slate-400 w-10">#</th>
              {renderSortHeader('Gudang', 'gudang', sortField, sortDir, handleSort, 'left')}
              {renderSortHeader('Ukuran & Customer', 'ukuran', sortField, sortDir, handleSort, 'left')}
              {renderSortHeader('Tipe', 'type', sortField, sortDir, handleSort, 'center')}
              {renderSortHeader('FG (T)', 'fgTon', sortField, sortDir, handleSort, 'right', 'text-emerald-900 font-bold')}
              {renderSortHeader('WIP (T)', 'wipTon', sortField, sortDir, handleSort, 'right', 'text-slate-600 font-bold')}
              {renderSortHeader('Total Ton', 'totalTon', sortField, sortDir, handleSort, 'right', isGradeE ? 'text-rose-900 font-black' : 'text-amber-900 font-bold')}
              {renderSortHeader('Remark / No NC', 'remarks', sortField, sortDir, handleSort, 'left', isGradeE ? 'text-rose-900 font-bold' : 'text-amber-900 font-bold')}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px] bg-white">
            {sorted.map((item, idx) => (
              <tr
                key={item.id || idx}
                onClick={() => {
                  setSelectedNCModalGrade(targetGrade);
                  setModalGudangFilter(selectedGudang);
                  setModalSearchQuery(item.ukuran);
                }}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                title="Klik untuk membuka detail rincian stock & No NC"
              >
                <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                  <span className="bg-slate-100 border border-slate-200 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                    {item.gudang}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-slate-900 block group-hover:text-emerald-800 transition-colors text-xs">{item.ukuran}</span>
                  <span className="text-[10px] text-slate-500 font-sans truncate block max-w-[170px]" title={item.customer}>
                    {item.customer}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700">
                    {item.type}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-900 font-semibold">
                  {item.fgTon ? formatTon(item.fgTon) : '-'}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-500">
                  {item.wipTon ? formatTon(item.wipTon) : '-'}
                </td>
                <td className={`py-2.5 px-3 text-right font-bold text-xs ${isGradeE ? 'text-rose-800 font-black' : 'text-amber-900 font-bold'}`}>
                  {formatTon(item.totalTon)}
                </td>
                <td className="py-2.5 px-3 min-w-[200px] max-w-[300px]">
                  <div className={`inline-block px-2.5 py-1 rounded text-[11px] font-mono leading-tight break-words border ${
                    isGradeE
                      ? 'bg-rose-50/80 border-rose-200/80 text-rose-950'
                      : 'bg-amber-50/80 border-amber-200/80 text-amber-950'
                  }`} title={item.remarks}>
                    {item.remarks || item.noNC || '-'}
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-sans">
                  Tidak ada item {targetGrade} untuk filter gudang ini
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-100/95 backdrop-blur-xs font-bold text-xs text-slate-900 shadow-[0_-3px_6px_rgba(0,0,0,0.04)]">
            <tr>
              <td colSpan={4} className="py-3 px-3 text-left uppercase tracking-wider text-slate-700 text-[10px]">
                Total 10 Terbesar ({sorted.length} Item)
              </td>
              <td className="py-3 px-3 text-right text-emerald-900">{formatTon(sumFg)}</td>
              <td className="py-3 px-3 text-right text-slate-500">{formatTon(sumWip)}</td>
              <td className={`py-3 px-3 text-right text-xs ${isGradeE ? 'text-rose-800 font-black' : 'text-amber-900 font-bold'}`}>
                {formatTon(sumTotal)}
              </td>
              <td className="py-3 px-3 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNCModalGrade(targetGrade);
                    setModalGudangFilter(selectedGudang);
                  }}
                  className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Buka Semua ({filteredItems.filter((i) => i.grade === targetGrade).length})</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // Render Table for Warehouse Recap (Tonase Pipa NC Per Gudang)
  const renderWarehouseRecapTable = () => {
    const handleSort = (field: keyof PipeNCWarehouse) => {
      if (recapSortField === field) {
        setRecapSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setRecapSortField(field);
        setRecapSortDir('desc');
      }
    };

    const sorted = sortItems(ncWarehouseData, recapSortField, recapSortDir);
    const maxGradeE = Math.max(...ncWarehouseData.map((d) => d.gradeE), 1);
    const maxGradeC = Math.max(...ncWarehouseData.map((d) => d.gradeC), 1);

    return (
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] shadow-2xs">
            <tr className="group text-slate-700">
              {renderSortHeader('Gudang', 'gudang', recapSortField, recapSortDir, handleSort, 'left')}
              {renderSortHeader('PRIME', 'prime', recapSortField, recapSortDir, handleSort, 'right', 'text-emerald-900')}
              {renderSortHeader('Grade E', 'gradeE', recapSortField, recapSortDir, handleSort, 'right', 'text-rose-900')}
              {renderSortHeader('Grade C', 'gradeC', recapSortField, recapSortDir, handleSort, 'right', 'text-amber-900')}
              {renderSortHeader('% Grd E', 'persenGradeE', recapSortField, recapSortDir, handleSort, 'right', 'text-slate-900')}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px] bg-white">
            {sorted.map((item) => {
              const isSelected = selectedGudang === item.gudang;
              const warehouseTotal = item.prime + item.gradeE + item.gradeC;
              const pctGradeE = warehouseTotal > 0 ? (item.gradeE / warehouseTotal) * 100 : 0;
              const isTop3 = top3GradeEGudangs.includes(item.gudang);
              const barWidthE = Math.min((item.gradeE / maxGradeE) * 100, 100);
              const barWidthC = Math.min((item.gradeC / maxGradeC) * 100, 100);

              return (
                <tr
                  key={item.gudang}
                  className={`transition-colors cursor-pointer border-b border-slate-100 ${
                    isSelected ? 'bg-emerald-50/90 font-semibold' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedGudang(isSelected ? 'ALL' : item.gudang)}
                >
                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Warehouse className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-800' : 'text-slate-400'}`} />
                      <span className={`px-2 py-0.5 rounded text-[11px] border ${
                        isSelected
                          ? 'bg-emerald-800 text-white border-emerald-900'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {item.gudang}
                      </span>
                      {isTop3 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                          <AlertTriangle className="h-2.5 w-2.5 text-rose-600 shrink-0" />
                          Warning
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-900">
                    {formatTon(item.prime)}
                  </td>
                  <td className="py-2.5 px-3 text-right relative">
                    <div
                      className={`absolute inset-y-1.5 right-1 rounded-xs pointer-events-none ${
                        isTop3 ? 'bg-rose-200/80' : 'bg-rose-100/40'
                      }`}
                      style={{ width: `${barWidthE * 0.7}%` }}
                    />
                    <span className={`relative z-1 font-bold ${isTop3 ? 'text-rose-800 font-black' : 'text-rose-700'}`}>
                      {formatTon(item.gradeE)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right relative">
                    <div
                      className="absolute inset-y-1.5 right-1 bg-amber-100/60 rounded-xs pointer-events-none"
                      style={{ width: `${barWidthC * 0.7}%` }}
                    />
                    <span className="relative z-1 font-medium text-amber-900">
                      {formatTon(item.gradeC)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    {isTop3 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                        {formatPercent(pctGradeE)}
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-900">
                        {formatPercent(pctGradeE)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 bg-slate-100 font-bold text-[11px] text-slate-900 shadow-[0_-2px_4px_rgba(0,0,0,0.06)]">
            <tr>
              <td className="py-3 px-3 uppercase tracking-wider text-slate-700 text-[10px] bg-slate-100 border-t-2 border-slate-300">
                Total
              </td>
              <td className="py-3 px-3 text-right text-emerald-900 font-bold bg-slate-100 border-t-2 border-slate-300">
                {formatTon(totalPrime)}
              </td>
              <td className="py-3 px-3 text-right text-rose-800 font-black bg-slate-100 border-t-2 border-slate-300">
                {formatTon(totalGradeE)}
              </td>
              <td className="py-3 px-3 text-right text-amber-900 font-bold bg-slate-100 border-t-2 border-slate-300">
                {formatTon(totalGradeC)}
              </td>
              <td className="py-3 px-3 text-right font-black text-slate-900 bg-slate-100 border-t-2 border-slate-300">
                {formatPercent(persenGradeETotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // Filtered items for NC Drilldown Modal
  const modalNCItems = useMemo(() => {
    return ncItems.filter((item) => {
      if (selectedNCModalGrade && selectedNCModalGrade !== 'ALL') {
        if (item.grade !== selectedNCModalGrade) return false;
      }
      if (modalGudangFilter !== 'ALL' && item.gudang !== modalGudangFilter) {
        return false;
      }
      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase().trim();
        const matchUkuran = item.ukuran.toLowerCase().includes(q);
        const matchCust = item.customer.toLowerCase().includes(q);
        const matchMat = (item.kodeMaterial || '').toLowerCase().includes(q);
        const matchRemarks = (item.remarks || '').toLowerCase().includes(q);
        const matchNoNC = (item.noNC || '').toLowerCase().includes(q);
        const matchGudang = item.gudang.toLowerCase().includes(q);
        return matchUkuran || matchCust || matchMat || matchRemarks || matchNoNC || matchGudang;
      }
      return true;
    });
  }, [ncItems, selectedNCModalGrade, modalGudangFilter, modalSearchQuery]);

  const sortedModalNCItems = useMemo(() => {
    return sortItems(modalNCItems, modalSortField, modalSortDir);
  }, [modalNCItems, modalSortField, modalSortDir]);

  const modalTotalFg = useMemo(() => modalNCItems.reduce((sum, d) => sum + (d.fgTon || 0), 0), [modalNCItems]);
  const modalTotalWip = useMemo(() => modalNCItems.reduce((sum, d) => sum + (d.wipTon || 0), 0), [modalNCItems]);
  const modalTotalTon = useMemo(() => modalNCItems.reduce((sum, d) => sum + (d.totalTon || 0), 0), [modalNCItems]);

  const renderNCModal = () => {
    if (!selectedNCModalGrade) return null;

    const handleModalSort = (field: keyof PipeNCItem) => {
      if (modalSortField === field) {
        setModalSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setModalSortField(field);
        setModalSortDir('desc');
      }
    };

    const countAll = ncItems.filter((i) => modalGudangFilter === 'ALL' || i.gudang === modalGudangFilter).length;
    const countGradeE = ncItems.filter((i) => i.grade === 'Grade E' && (modalGudangFilter === 'ALL' || i.gudang === modalGudangFilter)).length;
    const countGradeC = ncItems.filter((i) => i.grade === 'Grade C' && (modalGudangFilter === 'ALL' || i.gudang === modalGudangFilter)).length;

    const handleCopyTable = () => {
      const header = 'No\tGudang\tUkuran\tCustomer\tKode Material\tTipe\tGrade\tFG (Ton)\tWIP (Ton)\tTotal (Ton)\tRemark / No NC';
      const rows = sortedModalNCItems.map((item, idx) =>
        `${idx + 1}\t${item.gudang}\t${item.ukuran}\t${item.customer}\t${item.kodeMaterial || '-'}\t${item.type}\t${item.grade}\t${item.fgTon}\t${item.wipTon}\t${item.totalTon}\t${item.remarks || item.noNC || '-'}`
      );
      navigator.clipboard.writeText([header, ...rows].join('\n'));
      alert('Data stock NC berhasil disalin ke clipboard.');
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={() => setSelectedNCModalGrade(null)}
      >
        <div
          className="relative w-full max-w-7xl max-h-[88vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden font-sans text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* MODAL HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-2xs shrink-0">
                <ShieldAlert className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                    Data Stock Pipa Non Conformity (NC) &amp; Remark No NC
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                    {selectedNCModalGrade === 'ALL' ? 'Semua NC' : selectedNCModalGrade}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                  Rincian material Hold (Grade E) dan Repair (Grade C) beserta catatan mutu dan nomor dokumen NC
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleCopyTable}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md shadow-2xs cursor-pointer transition-all"
                title="Salin tabel ke clipboard (Excel pasteable)"
              >
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Salin Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedNCModalGrade(null)}
                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Tutup (ESC)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* FILTER TOOLBAR */}
          <div className="p-3 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* TABS GRADE */}
            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 font-mono">
              <button
                type="button"
                onClick={() => setSelectedNCModalGrade('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedNCModalGrade === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                Semua NC ({countAll})
              </button>
              <button
                type="button"
                onClick={() => setSelectedNCModalGrade('Grade E')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedNCModalGrade === 'Grade E'
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span>Grade E - Hold ({countGradeE})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedNCModalGrade('Grade C')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedNCModalGrade === 'Grade C'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>Grade C - Repair ({countGradeC})</span>
              </button>
            </div>

            {/* GUDANG SELECTOR & SEARCH */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Gudang:</span>
                <select
                  value={modalGudangFilter}
                  onChange={(e) => setModalGudangFilter(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Semua Gudang</option>
                  {availableGudangs.filter((g) => g !== 'ALL').map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari ukuran / No NC / cust..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs font-sans rounded-md border border-slate-300 bg-white shadow-2xs focus:border-emerald-600 focus:outline-hidden w-48 sm:w-60"
                />
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="flex-1 overflow-auto max-h-[58vh]">
            <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] shadow-2xs">
                <tr className="group text-slate-700 border-b border-slate-200">
                  <th className="py-2.5 px-3 text-center font-bold text-slate-400 w-12">#</th>
                  {renderSortHeader('Gudang', 'gudang', modalSortField, modalSortDir, handleModalSort, 'left')}
                  {renderSortHeader('Ukuran', 'ukuran', modalSortField, modalSortDir, handleModalSort, 'left')}
                  {renderSortHeader('Customer', 'customer', modalSortField, modalSortDir, handleModalSort, 'left')}
                  {renderSortHeader('Kode Material', 'kodeMaterial', modalSortField, modalSortDir, handleModalSort, 'left')}
                  {renderSortHeader('Tipe', 'type', modalSortField, modalSortDir, handleModalSort, 'center')}
                  {renderSortHeader('Grade', 'grade', modalSortField, modalSortDir, handleModalSort, 'center')}
                  {renderSortHeader('FG (T)', 'fgTon', modalSortField, modalSortDir, handleModalSort, 'right', 'text-emerald-900 font-bold')}
                  {renderSortHeader('WIP (T)', 'wipTon', modalSortField, modalSortDir, handleModalSort, 'right', 'text-slate-600 font-bold')}
                  {renderSortHeader('Total Ton', 'totalTon', modalSortField, modalSortDir, handleModalSort, 'right', 'text-slate-900 font-black')}
                  {renderSortHeader('Remark / No NC', 'remarks', modalSortField, modalSortDir, handleModalSort, 'left', 'text-amber-950 font-bold')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px] bg-white">
                {sortedModalNCItems.map((item, idx) => {
                  const isGradeE = item.grade === 'Grade E';
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 border border-slate-200 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                          {item.gudang}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap text-xs">
                        {item.ukuran}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-700 text-xs max-w-[180px] truncate" title={item.customer}>
                        {item.customer}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[10px]">
                        {item.kodeMaterial || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isGradeE
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {item.grade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-900 font-semibold">
                        {item.fgTon ? formatTon(item.fgTon) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {item.wipTon ? formatTon(item.wipTon) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-950 text-xs bg-slate-50/40">
                        {formatTon(item.totalTon)}
                      </td>
                      <td className="py-2.5 px-3 min-w-[240px] max-w-[340px]">
                        <div className="inline-block bg-amber-50/80 border border-amber-200/80 text-amber-950 px-2.5 py-1 rounded text-[11px] font-mono leading-tight break-words" title={item.remarks}>
                          {item.remarks || item.noNC || '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedModalNCItems.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 text-xs font-sans">
                      Tidak ditemukan data NC yang sesuai dengan filter pencarian
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 font-bold text-xs text-slate-900 shadow-[0_-3px_6px_rgba(0,0,0,0.05)] border-t-2 border-slate-300">
                <tr>
                  <td colSpan={7} className="py-3 px-3 uppercase tracking-wider text-slate-700 text-[10px]">
                    Total ({sortedModalNCItems.length} Item NC)
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-900 font-bold">
                    {formatTon(modalTotalFg)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 font-bold">
                    {formatTon(modalTotalWip)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-950 font-black text-xs bg-slate-200/60">
                    {formatTon(modalTotalTon)}
                  </td>
                  <td className="py-3 px-3 text-left text-slate-500 text-[10px] font-normal">
                    Tonase Terdaftar
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* MODAL FOOTER */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <span className="text-[11px] text-slate-500">
              Menampilkan {sortedModalNCItems.length} dari {ncItems.length} total baris NC
            </span>
            <button
              type="button"
              onClick={() => setSelectedNCModalGrade(null)}
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
      {/* BANNER HEADER & CONTROL TOOLBAR */}
      <div className="rounded-md border border-black/20 theme-banner text-white p-3.5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Stock Pipa Non Conformity (NC)
            </h2>
            <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-800">
              Top 10 Terbesar Per Grade
            </span>
            {selectedGudang !== 'ALL' && (
              <span className="text-[10px] font-mono bg-amber-400 text-amber-950 px-2 py-0.5 rounded font-bold">
                Gudang: {selectedGudang}
              </span>
            )}
          </div>
          <p className="text-[11px] text-emerald-200 font-medium font-mono">
            Monitoring mutu pipa Hold (Grade E) dan Repair (Grade C) per gudang
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex items-center gap-2.5 flex-wrap font-mono text-xs">
          {/* GUDANG SELECTOR */}
          <div className="flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
            <Warehouse className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <span className="text-emerald-300 text-[10px] uppercase font-bold">Gudang:</span>
            <select
              value={selectedGudang}
              onChange={(e) => setSelectedGudang(e.target.value)}
              className="bg-emerald-900 border border-emerald-700 text-white text-xs font-bold rounded px-1.5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              <option value="ALL">Semua Gudang ({ncWarehouseData.length})</option>
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
          <p className="text-sm font-bold text-slate-700">Belum ada data Pipa Non Conformity</p>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Upload file export SAP melalui menu &quot;Upload Raw SAP&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {cards.map((card, index) => {
            // CARD 2: REKAPITULASI STOCK NC PER GUDANG (TABEL)
            if (card.id === 'recap-table' && ncWarehouseData.length > 0) {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Tonase Pipa NC Per Gudang"
                  subtitle="Rekapitulasi tonase pipa PRIME vs Non Conformity (Grade E &amp; C) per unit gudang"
                  icon={Table2}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                      {ncWarehouseData.length} Gudang
                    </span>
                  }
                  headerAction={
                    selectedGudang !== 'ALL' ? (
                      <span className="text-xs font-mono text-emerald-800 font-bold bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
                        Aktif: {selectedGudang}
                      </span>
                    ) : undefined
                  }
                >
                  {renderWarehouseRecapTable()}
                </CustomizableCard>
              );
            }

            // CARD 1: GRAFIK DISTRIBUSI NC PER GUDANG
            if (card.id === 'combo-chart' && ncWarehouseData.length > 0) {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Stock Pipa Prime &amp; NC Per Gudang"
                  subtitle="Perbandingan visual komposisi PRIME, Grade C (Repair), dan Grade E (Hold Mutu) per gudang"
                  icon={ShieldAlert}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-300">
                      Per Gudang
                    </span>
                  }
                >
                  {(expanded) => (
                    <div className="flex flex-col h-full w-full gap-4">
                      <div className={expanded ? 'h-96 w-full' : 'h-64 w-full'}>
                        <Chart type="bar" data={chartData} options={chartOptions} />
                      </div>
                    </div>
                  )}
                </CustomizableCard>
              );
            }

            // CARD 2: DIAGRAM DONAT KOMPOSISI MUTU PIPA
            if (card.id === 'donut-chart') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title={`Komposisi Mutu Pipa ${selectedGudang !== 'ALL' ? `• ${selectedGudang}` : '(Semua Gudang)'}`}
                  subtitle={`Proporsi PRIME, Grade E (Hold), dan Grade C (Repair) ${selectedGudang !== 'ALL' ? `di ${selectedGudang}` : 'seluruh gudang'}`}
                  icon={PieChart}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-300">
                      Komposisi
                    </span>
                  }
                >
                  {(expanded) => (
                    <div className="flex flex-col sm:flex-row items-center justify-around py-1 gap-4 h-full">
                      <div className={`relative ${expanded ? 'h-80 w-80' : 'h-52 w-52'} flex items-center justify-center shrink-0`}>
                        <Doughnut data={donutData} options={donutOptions} />
                        <div className="absolute flex flex-col items-center pointer-events-none">
                          <span className="text-xl font-bold font-mono text-slate-900">
                            {donutPrimePct.toFixed(0)}%
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono">
                            PRIME
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5 font-mono w-full sm:w-auto">
                        <div
                          onClick={() => {
                            setSelectedNCModalGrade('ALL');
                            setModalGudangFilter(selectedGudang);
                          }}
                          className="flex items-center justify-between gap-4 p-2.5 rounded-md bg-emerald-50/70 border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/60 transition-all cursor-pointer shadow-2xs group"
                          title="Klik untuk melihat data stock"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-xs bg-emerald-600 shrink-0 group-hover:scale-125 transition-transform" />
                            <div>
                              <div className="text-[10px] font-bold uppercase text-emerald-950">PRIME</div>
                              <div className="text-xs font-bold text-slate-900">{formatTon(donutPrime, { showUnit: true })}</div>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                            {formatPercent(donutPrimePct)}
                          </span>
                        </div>

                        <div
                          onClick={() => {
                            setSelectedNCModalGrade('Grade E');
                            setModalGudangFilter(selectedGudang);
                          }}
                          className="flex items-center justify-between gap-4 p-2.5 rounded-md bg-red-50/70 border border-red-200 hover:border-red-400 hover:bg-red-100/60 transition-all cursor-pointer shadow-2xs group"
                          title="Klik untuk melihat daftar stock Grade E & Remark No NC"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-xs bg-red-600 shrink-0 group-hover:scale-125 transition-transform" />
                            <div>
                              <div className="text-[10px] font-bold uppercase text-red-950">
                                Grade E (Hold)
                              </div>
                              <div className="text-xs font-bold text-slate-900">{formatTon(donutGradeE, { showUnit: true })}</div>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-red-900 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                            {formatPercent(donutGradeEPct)}
                          </span>
                        </div>

                        <div
                          onClick={() => {
                            setSelectedNCModalGrade('Grade C');
                            setModalGudangFilter(selectedGudang);
                          }}
                          className="flex items-center justify-between gap-4 p-2.5 rounded-md bg-amber-50/70 border border-amber-200 hover:border-amber-400 hover:bg-amber-100/60 transition-all cursor-pointer shadow-2xs group"
                          title="Klik untuk melihat daftar stock Grade C & Remark No NC"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-xs bg-amber-500 shrink-0 group-hover:scale-125 transition-transform" />
                            <div>
                              <div className="text-[10px] font-bold uppercase text-amber-950">
                                Grade C (Repair)
                              </div>
                              <div className="text-xs font-bold text-slate-900">{formatTon(donutGradeC, { showUnit: true })}</div>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            {formatPercent(donutGradeCPct)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNCModalGrade('ALL');
                            setModalGudangFilter(selectedGudang);
                          }}
                          className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-950 text-slate-700 text-xs font-bold border border-slate-300 hover:border-emerald-400 transition-all cursor-pointer shadow-2xs font-mono"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                          <span>Lihat Detail Stock NC &amp; No NC ({filteredItems.length} Item)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </CustomizableCard>
              );
            }

            // CARD 3: TOP 10 TERBESAR GRADE E (HOLD MUTU)
            if (card.id === 'top10-grade-e') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title={`Top 10 Terbesar Pipa NC - Grade E (Hold Mutu) ${selectedGudang !== 'ALL' ? `• ${selectedGudang}` : ''}`}
                  subtitle="10 item mutu kritis (Cacat / Hold Mutu) terbesar yang membutuhkan disposisi QC / Rework"
                  icon={ShieldX}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <span className="text-[10px] font-mono bg-amber-100 text-amber-950 font-bold px-2 py-0.5 rounded border border-amber-300">
                      Top 10 Grade E
                    </span>
                  }
                >
                  {renderTop10Table(top10GradeE, 'Grade E', eSortField, eSortDir, setESortField, setESortDir)}
                </CustomizableCard>
              );
            }

            // CARD 4: TOP 10 TERBESAR GRADE C (REPAIR)
            if (card.id === 'top10-grade-c') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title={`Top 10 Terbesar Pipa NC - Grade C (Repair) ${selectedGudang !== 'ALL' ? `• ${selectedGudang}` : ''}`}
                  subtitle="10 item perbaikan/repair mutu terbesar yang siap diproses tim produksi / QC"
                  icon={AlertCircle}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <span className="text-[10px] font-mono bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-200">
                      Top 10 Grade C
                    </span>
                  }
                >
                  {renderTop10Table(top10GradeC, 'Grade C', cSortField, cSortDir, setCSortField, setCSortDir)}
                </CustomizableCard>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* MODAL DETAIL STOCK NC & NO NC */}
      {renderNCModal()}
    </div>
  );
};
