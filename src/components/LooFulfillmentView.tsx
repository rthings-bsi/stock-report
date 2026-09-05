'use client';

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { LooComparisonItem } from '../types/warehouse';
import { formatTon, formatPercent } from '@/lib/utils';
import { TrendingUp, Table2, CheckCircle2, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, PackageCheck, AlertCircle } from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface LooFulfillmentViewProps {
  stData: LooComparisonItem[];
  ltData: LooComparisonItem[];
  isCustomizing?: boolean;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'chart-st', width: 'col-span-6' },
  { id: 'chart-lt', width: 'col-span-6' },
  { id: 'table-st', width: 'col-span-6' },
  { id: 'table-lt', width: 'col-span-6' },
];

export const LooFulfillmentView: React.FC<LooFulfillmentViewProps> = ({
  stData = [],
  ltData = [],
  isCustomizing = false
}) => {
  const st = stData;
  const lt = ltData;
  const isEmpty = st.length === 0 && lt.length === 0;

  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  // Sorting state for tables
  const [stSortField, setStSortField] = useState<keyof LooComparisonItem>('persenFulfillment');
  const [stSortDir, setStSortDir] = useState<'asc' | 'desc'>('desc');
  const [ltSortField, setLtSortField] = useState<keyof LooComparisonItem>('persenFulfillment');
  const [ltSortDir, setLtSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_loo');
      if (saved) setCards(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_loo', JSON.stringify(cards));
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

  // Metrics computation
  const totalStStock = st.reduce((acc, r) => acc + (r.totalStockTon || 0), 0);
  const totalStLoo = st.reduce((acc, r) => acc + (r.looTon || 0), 0);
  const stFulfilledCount = st.filter((r) => r.persenFulfillment >= 100).length;

  const totalLtStock = lt.reduce((acc, r) => acc + (r.totalStockTon || 0), 0);
  const totalLtLoo = lt.reduce((acc, r) => acc + (r.looTon || 0), 0);
  const ltFulfilledCount = lt.filter((r) => r.persenFulfillment >= 100).length;

  const stChartData = {
    labels: st.map((r, i) => r.gudang ? `${r.gudang} (#${i + 1})` : `ST #${i + 1}`),
    datasets: [
      {
        label: 'Stock FG (Ton)',
        data: st.map((r) => r.fgTon || 0),
        backgroundColor: '#047857',
        hoverBackgroundColor: '#065f46',
        borderRadius: 2,
      },
      {
        label: 'Stock WIP (Ton)',
        data: st.map((r) => r.wipTon || 0),
        backgroundColor: '#6ee7b7',
        hoverBackgroundColor: '#34d399',
        borderRadius: 2,
      },
      {
        label: 'Target LOO (Ton)',
        data: st.map((r) => r.looTon),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 2,
      },
    ],
  };

  const stChartOptions = {
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
              const item = st[idx];
              return `${item?.gudang || '-'} | ${item?.ukuran}`;
            }
            return '';
          },
          label: function (context: any) {
            const idx = context.dataIndex;
            const item = st[idx];
            const val = context.raw || 0;
            return ` ${context.dataset.label}: ${val.toFixed(2)} Ton (Cust: ${item?.customer})`;
          },
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
        ticks: { font: { family: 'monospace', size: 9 }, color: '#64748b' },
        border: { dash: [4, 4], color: '#cbd5e1' },
      },
    },
  };

  const ltChartData = {
    labels: lt.map((r, i) => r.gudang ? `${r.gudang} (#${i + 1})` : `LT #${i + 1}`),
    datasets: [
      {
        label: 'Stock FG (Ton)',
        data: lt.map((r) => r.fgTon || 0),
        backgroundColor: '#047857',
        hoverBackgroundColor: '#065f46',
        borderRadius: 2,
      },
      {
        label: 'Stock WIP (Ton)',
        data: lt.map((r) => r.wipTon || 0),
        backgroundColor: '#6ee7b7',
        hoverBackgroundColor: '#34d399',
        borderRadius: 2,
      },
      {
        label: 'Target LOO (Ton)',
        data: lt.map((r) => r.looTon),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 2,
      },
    ],
  };

  const ltChartOptions = {
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
              const item = lt[idx];
              return `${item?.gudang || '-'} | ${item?.ukuran}`;
            }
            return '';
          },
          label: function (context: any) {
            const idx = context.dataIndex;
            const item = lt[idx];
            const val = context.raw || 0;
            return ` ${context.dataset.label}: ${val.toFixed(2)} Ton (Cust: ${item?.customer})`;
          },
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
        ticks: { font: { family: 'monospace', size: 9 }, color: '#64748b' },
        border: { dash: [4, 4], color: '#cbd5e1' },
      },
    },
  };

  const sortItems = (
    items: LooComparisonItem[],
    field: keyof LooComparisonItem,
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

  const renderSortHeader = (
    label: string,
    field: keyof LooComparisonItem,
    currentField: keyof LooComparisonItem,
    currentDir: 'asc' | 'desc',
    onSort: (f: keyof LooComparisonItem) => void,
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

  const renderTable = (
    items: LooComparisonItem[],
    sortField: keyof LooComparisonItem,
    sortDir: 'asc' | 'desc',
    setSortField: React.Dispatch<React.SetStateAction<keyof LooComparisonItem>>,
    setSortDir: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>
  ) => {
    const handleSort = (field: keyof LooComparisonItem) => {
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
    const sumStock = items.reduce((a, b) => a + (b.totalStockTon || 0), 0);
    const sumLoo = items.reduce((a, b) => a + (b.looTon || 0), 0);
    const avgFulfill = sumLoo > 0 ? (sumStock / sumLoo) * 100 : 0;

    return (
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[10px] shadow-2xs">
            <tr className="group">
              <th className="py-2 px-2 text-center font-bold text-slate-500 w-8">#</th>
              {renderSortHeader('Gudang', 'gudang', sortField, sortDir, handleSort, 'left')}
              {renderSortHeader('Customer', 'customer', sortField, sortDir, handleSort, 'left')}
              {renderSortHeader('Ukuran', 'ukuran', sortField, sortDir, handleSort, 'left')}
              {renderSortHeader('FG', 'fgTon', sortField, sortDir, handleSort, 'right', 'text-emerald-900')}
              {renderSortHeader('WIP', 'wipTon', sortField, sortDir, handleSort, 'right', 'text-slate-600')}
              {renderSortHeader('Stock', 'totalStockTon', sortField, sortDir, handleSort, 'right', 'text-slate-900')}
              {renderSortHeader('LOO', 'looTon', sortField, sortDir, handleSort, 'right', 'text-amber-900')}
              {renderSortHeader('Status', 'persenFulfillment', sortField, sortDir, handleSort, 'right', 'text-slate-900')}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px]">
            {sorted.map((row, idx) => {
              const isFulfilled = row.persenFulfillment >= 100;
              const isDeficit = row.persenFulfillment < 50;

              return (
                <tr key={`${row.no}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-2 text-center text-slate-400 font-bold">{row.no}</td>
                  <td className="py-2 px-2 font-bold text-slate-900 whitespace-nowrap">
                    <span className="bg-slate-100 border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                      {row.gudang || '-'}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-medium text-slate-800 max-w-[150px] truncate" title={row.customer}>
                    {row.customer}
                  </td>
                  <td className="py-2 px-2 font-bold text-slate-900 whitespace-nowrap">{row.ukuran}</td>
                  <td className="py-2 px-2 text-right text-emerald-900 font-semibold">{row.fgTon ? formatTon(row.fgTon) : '-'}</td>
                  <td className="py-2 px-2 text-right text-slate-500">{row.wipTon ? formatTon(row.wipTon) : '-'}</td>
                  <td className="py-2 px-2 text-right font-bold text-slate-900">{formatTon(row.totalStockTon)}</td>
                  <td className="py-2 px-2 text-right font-semibold text-amber-900">{formatTon(row.looTon)}</td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0 hidden sm:block">
                        <div
                          className={`h-full rounded-full ${isFulfilled ? 'bg-emerald-600' : isDeficit ? 'bg-amber-600' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(row.persenFulfillment, 100)}%` }}
                        />
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        isFulfilled
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isDeficit
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}>
                        {formatPercent(row.persenFulfillment)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-100/95 backdrop-blur-xs font-bold text-[11px] text-slate-900">
            <tr>
              <td colSpan={4} className="py-2 px-2 text-left uppercase tracking-wider text-slate-600 text-[10px]">
                Total Top 10
              </td>
              <td className="py-2 px-2 text-right text-emerald-900">{formatTon(sumFg)}</td>
              <td className="py-2 px-2 text-right text-slate-500">{formatTon(sumWip)}</td>
              <td className="py-2 px-2 text-right text-slate-900">{formatTon(sumStock)}</td>
              <td className="py-2 px-2 text-right text-amber-900">{formatTon(sumLoo)}</td>
              <td className="py-2 px-2 text-right">
                <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  avgFulfill >= 100
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {formatPercent(avgFulfill)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* BANNER HEADER */}
      <div className="rounded-md border border-black/20 theme-banner text-white p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Top 10 Stock Pipa Warehouse vs Sisa LOO
            </h2>
            <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-800">
              Delivery Fulfillment
            </span>
          </div>
          <p className="text-[11px] text-emerald-200 font-medium font-mono">
            Monitoring kesiapan stock aktual (FG & WIP) terhadap target open LOO customer
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <div className="bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800/80 flex items-center gap-2">
            <span className="text-emerald-300 text-[10px] uppercase">Fulfilled:</span>
            <span className="font-bold text-white">{stFulfilledCount + ltFulfilledCount} / {st.length + lt.length} Item</span>
          </div>
          <span className="text-[10px] font-mono bg-white text-slate-900 px-2.5 py-1 rounded border border-slate-200 font-bold shadow-2xs">
            {isEmpty ? 'Belum Ada Data' : `${st.length + lt.length} Item Total`}
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-bold text-slate-700">Belum ada data Stock vs LOO</p>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Upload file export SAP melalui menu &quot;Upload Raw SAP&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {cards.map((card, index) => {
            if (card.id === 'chart-st' && st.length > 0) {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Perbandingan Stock vs LOO - Top 10 Short Tube (ST)"
                  subtitle=""
                  icon={TrendingUp}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ST (&lt; 3000 mm)
                    </span>
                  }
                >
                  {(expanded) => (
                    <div className="flex flex-col h-full w-full gap-4">
                      <div className={expanded ? 'h-80 w-full shrink-0' : 'h-56 w-full'}>
                        <Bar data={stChartData} options={stChartOptions} />
                      </div>
                      {expanded && (
                        <div className="flex-1 mt-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                            Rincian Data Top 10 Short Tube (ST)
                          </h4>
                          {renderTable(st, stSortField, stSortDir, setStSortField, setStSortDir)}
                        </div>
                      )}
                    </div>
                  )}
                </CustomizableCard>
              );
            }

            if (card.id === 'chart-lt' && lt.length > 0) {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Perbandingan Stock vs LOO - Top 10 Long Tube (LT)"
                  subtitle=""
                  icon={TrendingUp}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      LT (&ge; 3000 mm)
                    </span>
                  }
                >
                  {(expanded) => (
                    <div className="flex flex-col h-full w-full gap-4">
                      <div className={expanded ? 'h-80 w-full shrink-0' : 'h-56 w-full'}>
                        <Bar data={ltChartData} options={ltChartOptions} />
                      </div>
                      {expanded && (
                        <div className="flex-1 mt-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                            Rincian Data Top 10 Long Tube (LT)
                          </h4>
                          {renderTable(lt, ltSortField, ltSortDir, setLtSortField, setLtSortDir)}
                        </div>
                      )}
                    </div>
                  )}
                </CustomizableCard>
              );
            }

            if (card.id === 'table-st' && st.length > 0) {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Tabel Detail Top 10 Short Tube (ST)"
                  subtitle=""
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
                      {st.length} Item
                    </span>
                  }
                >
                  {renderTable(st, stSortField, stSortDir, setStSortField, setStSortDir)}
                </CustomizableCard>
              );
            }

            if (card.id === 'table-lt' && lt.length > 0) {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Tabel Detail Top 10 Long Tube (LT)"
                  subtitle=""
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
                      {lt.length} Item
                    </span>
                  }
                >
                  {renderTable(lt, ltSortField, ltSortDir, setLtSortField, setLtSortDir)}
                </CustomizableCard>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
};
