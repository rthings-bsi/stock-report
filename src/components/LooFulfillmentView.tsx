'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  LooComparisonItem,
  WarehousePipeCapacity,
  LooWarehouseRecap
} from '../types/warehouse';
import { formatTon, formatQty, formatPercent } from '@/lib/utils';
import {
  TrendingUp,
  Table2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Warehouse,
  BarChart3
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface LooFulfillmentViewProps {
  stData?: LooComparisonItem[];
  ltData?: LooComparisonItem[];
  pipeCapacities?: WarehousePipeCapacity[];
  isCustomizing?: boolean;
}

interface CardState {
  id: string;
  width: CardWidth;
}

export interface LooTableItem {
  no: number;
  customer: string;
  ukuran: string;
  kodeMaterial: string;
  gudang?: string;
  type?: 'ST' | 'LT';
  fgQty: number;
  fgTon: number;
  wipQty: number;
  wipTon: number;
  totalQty: number;
  totalStockTon: number;
  looQty: number;
  looTon: number;
  persenFulfillment: number;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'top15-customer-chart', width: 'col-span-12' },
  { id: 'stock-vs-loo-table', width: 'col-span-12' },
];

export const LooFulfillmentView: React.FC<LooFulfillmentViewProps> = ({
  stData = [],
  ltData = [],
  pipeCapacities = [],
  isCustomizing = false
}) => {
  const [selectedGudang, setSelectedGudang] = useState<string>('ALL');
  const [chartSortMetric, setChartSortMetric] = useState<'stock' | 'loo'>('stock');
  const [chartTopCount, setChartTopCount] = useState<number>(15);
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  // Sorting state for detail stock vs loo table
  const [tableSortField, setTableSortField] = useState<keyof LooTableItem>('looTon');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_loo_v7');
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
      localStorage.setItem('spindo_layout_loo_v7', JSON.stringify(cards));
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

  // 1. Calculate per-warehouse recaps for summary indicators & dropdown list
  const warehouseRecaps = useMemo<LooWarehouseRecap[]>(() => {
    const gudangSet = new Set<string>();

    if (pipeCapacities && pipeCapacities.length > 0) {
      pipeCapacities.forEach((p) => {
        if (p.gudang) gudangSet.add(p.gudang);
      });
    }

    const scanItems = (items: LooComparisonItem[]) => {
      items.forEach((item) => {
        if (item.gudangBreakdown) {
          Object.keys(item.gudangBreakdown).forEach((g) => gudangSet.add(g));
        }
        if (item.gudangs && item.gudangs.length > 0) {
          item.gudangs.forEach((g) => gudangSet.add(g));
        } else if (item.gudang && item.gudang !== '-') {
          item.gudang.split(',').forEach((g) => {
            const trimmed = g.trim();
            if (trimmed) gudangSet.add(trimmed);
          });
        }
      });
    };

    scanItems(stData);
    scanItems(ltData);

    const gudangList = Array.from(gudangSet).filter(Boolean).sort();

    return gudangList.map((g) => {
      const pipeCap = pipeCapacities?.find((p) => p.gudang === g);

      let itemFg = 0;
      let itemWip = 0;
      let itemLoo = 0;
      let count = 0;

      const processItem = (item: LooComparisonItem) => {
        const hasBreakdown = item.gudangBreakdown && item.gudangBreakdown[g];
        const inGudangs = item.gudangs && item.gudangs.includes(g);
        const inGudangStr = item.gudang && item.gudang.includes(g);

        if (hasBreakdown || inGudangs || inGudangStr) {
          count++;
          if (hasBreakdown && item.gudangBreakdown) {
            const b = item.gudangBreakdown[g];
            itemFg += b.fgTon || 0;
            itemWip += b.wipTon || 0;
          } else {
            itemFg += item.fgTon || 0;
            itemWip += item.wipTon || 0;
          }
          itemLoo += item.looTon || 0;
        }
      };

      stData.forEach(processItem);
      ltData.forEach(processItem);

      const fgTon = pipeCap ? pipeCap.fgLt + pipeCap.fgSt : itemFg;
      const wipTon = pipeCap ? pipeCap.wipLt + pipeCap.wipSt : itemWip;
      const totalStockTon = pipeCap ? pipeCap.stock : fgTon + wipTon;
      const looTon = itemLoo;
      const selisihTon = totalStockTon - looTon;

      const persenFulfillment =
        looTon > 0
          ? (totalStockTon / looTon) * 100
          : totalStockTon > 0
          ? 100
          : 0;

      const status: 'Surplus' | 'Terpenuhi' | 'Defisit' =
        persenFulfillment >= 100
          ? selisihTon > 0
            ? 'Surplus'
            : 'Terpenuhi'
          : 'Defisit';

      return {
        gudang: g,
        fgTon: Number(fgTon.toFixed(2)),
        wipTon: Number(wipTon.toFixed(2)),
        totalStockTon: Number(totalStockTon.toFixed(2)),
        looTon: Number(looTon.toFixed(2)),
        selisihTon: Number(selisihTon.toFixed(2)),
        persenFulfillment: Number(persenFulfillment.toFixed(1)),
        itemCount: count,
        status,
      };
    });
  }, [pipeCapacities, stData, ltData]);

  // List of available gudang for filter dropdown
  const availableGudangs = useMemo(() => {
    return ['ALL', ...warehouseRecaps.map((w) => w.gudang)];
  }, [warehouseRecaps]);

  // 2. Material-level items for Stock vs LOO table and Top 15 Chart
  const stockLooItems = useMemo<LooTableItem[]>(() => {
    const allItems = [...stData, ...ltData];
    const result: LooTableItem[] = [];

    allItems.forEach((item) => {
      let fgTon = item.fgTon || 0;
      let wipTon = item.wipTon || 0;
      let totalStockTon = item.totalStockTon || (fgTon + wipTon);
      let fgQty = item.fgQty || 0;
      let wipQty = item.wipQty || 0;
      let totalQty = item.totalQty || (fgQty + wipQty);
      let looTon = item.looTon || 0;
      let looQty = item.looQty || 0;

      if (selectedGudang !== 'ALL') {
        const breakdown = item.gudangBreakdown?.[selectedGudang];
        const inGudangs = item.gudangs && item.gudangs.includes(selectedGudang);
        const inGudangStr = item.gudang && item.gudang.includes(selectedGudang);

        if (!breakdown && !inGudangs && !inGudangStr) {
          return;
        }

        if (breakdown) {
          fgTon = breakdown.fgTon || 0;
          wipTon = breakdown.wipTon || 0;
          totalStockTon = breakdown.totalStockTon || (fgTon + wipTon);
          fgQty = breakdown.fgQty || 0;
          wipQty = breakdown.wipQty || 0;
          totalQty = (breakdown.totalQty ?? (fgQty + wipQty)) || 0;
        }
      }

      if (totalStockTon > 0 || looTon > 0 || totalQty > 0 || looQty > 0) {
        const persenFulfillment =
          looTon > 0
            ? (totalStockTon / looTon) * 100
            : totalStockTon > 0
            ? 100
            : 0;

        result.push({
          no: 0,
          customer: item.customer,
          ukuran: item.ukuran,
          kodeMaterial: item.kodeMaterial,
          gudang: item.gudang,
          type: item.type,
          fgQty,
          fgTon: Number(fgTon.toFixed(2)),
          wipQty,
          wipTon: Number(wipTon.toFixed(2)),
          totalQty,
          totalStockTon: Number(totalStockTon.toFixed(2)),
          looQty,
          looTon: Number(looTon.toFixed(2)),
          persenFulfillment: Number(persenFulfillment.toFixed(1))
        });
      }
    });

    return result;
  }, [stData, ltData, selectedGudang]);

  // 3. Top Customer + Ukuran items for the chart (matching user's Excel chart)
  const top15ChartItems = useMemo(() => {
    const copy = [...stockLooItems];
    if (chartSortMetric === 'stock') {
      copy.sort((a, b) => (b.totalStockTon || 0) - (a.totalStockTon || 0) || (b.looTon || 0) - (a.looTon || 0));
    } else {
      copy.sort((a, b) => (b.looTon || 0) - (a.looTon || 0) || (b.totalStockTon || 0) - (a.totalStockTon || 0));
    }
    return copy.slice(0, chartTopCount);
  }, [stockLooItems, chartSortMetric, chartTopCount]);

  const isEmpty = warehouseRecaps.length === 0;

  // Chart configuration: Clustered column chart for Top Customer + Ukuran (LOO vs WIP vs FG)
  const top15ChartData = {
    labels: top15ChartItems.map((item) => {
      const cleanCust = item.customer.replace(/^PT\.?\s*/i, '').trim();
      const shortCust = cleanCust.length > 20 ? cleanCust.slice(0, 20) + '...' : cleanCust;
      return [shortCust, item.ukuran];
    }),
    datasets: [
      {
        label: 'LOO (Ton)',
        data: top15ChartItems.map((r) => r.looTon),
        backgroundColor: '#38bdf8', // Sky 400 (light blue)
        hoverBackgroundColor: '#0284c7',
        borderRadius: 2,
        barPercentage: 0.85,
        categoryPercentage: 0.85,
      },
      {
        label: 'Stock WIP (Ton)',
        data: top15ChartItems.map((r) => r.wipTon),
        backgroundColor: '#d97706', // Amber 600 (WIP)
        hoverBackgroundColor: '#b45309',
        borderRadius: 2,
        barPercentage: 0.85,
        categoryPercentage: 0.85,
      },
      {
        label: 'Stock FG (Ton)',
        data: top15ChartItems.map((r) => r.fgTon),
        backgroundColor: '#047857', // Emerald 700 (FG)
        hoverBackgroundColor: '#065f46',
        borderRadius: 2,
        barPercentage: 0.85,
        categoryPercentage: 0.85,
      },
    ],
  };

  // Custom Chart.js inline plugin to draw data values above each bar
  const top15DataLabelsPlugin = useMemo(() => ({
    id: 'top15DataLabels',
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (meta.hidden) return;
        meta.data.forEach((element: any, index: number) => {
          const val = dataset.data[index];
          if (element && typeof val === 'number') {
            const text = val > 0
              ? val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
              : '-';
            ctx.save();
            ctx.font = 'bold 8px monospace';
            ctx.fillStyle = datasetIndex === 0 ? '#0284c7' : datasetIndex === 1 ? '#b45309' : '#047857';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(text, element.x, Math.max(element.y - 3, 10));
            ctx.restore();
          }
        });
      });
    }
  }), []);

  const top15ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        bottom: 6,
        left: 4,
        right: 4
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'monospace', size: 11, weight: 'bold' as const },
          color: '#334155',
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          padding: 18,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'monospace', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        padding: 10,
        cornerRadius: 4,
        callbacks: {
          title: function (items: any[]) {
            if (items.length > 0) {
              const idx = items[0].dataIndex;
              const item = top15ChartItems[idx];
              return `${item?.customer || ''}`;
            }
            return '';
          },
          afterTitle: function (items: any[]) {
            if (items.length > 0) {
              const idx = items[0].dataIndex;
              const item = top15ChartItems[idx];
              return `Ukuran: ${item?.ukuran || ''} | Mat: ${item?.kodeMaterial || '-'}`;
            }
            return '';
          },
          label: function (context: any) {
            const val = context.raw || 0;
            return ` ${context.dataset.label}: ${val.toFixed(2)} Ton`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 0,
          font: { family: 'monospace', size: 9, weight: 'bold' as const },
          color: '#334155'
        },
        border: { color: '#cbd5e1' },
      },
      y: {
        grace: '15%',
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { family: 'monospace', size: 9 },
          color: '#64748b',
          callback: (val: any) => `${val} T`
        },
        border: { dash: [4, 4], color: '#cbd5e1' },
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

  // Render Exact Stock vs LOO Table according to User Specification:
  // No. | Nama Customer | Ukuran | Kode Material | [Stock FG: Qty (Pcs) | Tonase] | [Stock WIP: Qty (Pcs) | Tonase] | [Total Stock: Qty (Pcs) | Tonase] | [Target LOO: Qty (Pcs) | Tonase] | % Stock vs LOO
  const renderStockVsLooTable = () => {
    const handleSort = (field: keyof LooTableItem) => {
      if (tableSortField === field) {
        setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setTableSortField(field);
        setTableSortDir('desc');
      }
    };

    const renderSortIcon = (field: keyof LooTableItem) => {
      const isActive = tableSortField === field;
      if (!isActive) {
        return <ArrowUpDown className="h-2.5 w-2.5 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100" />;
      }
      return tableSortDir === 'asc' ? (
        <ArrowUp className="h-3 w-3 text-emerald-800 shrink-0" />
      ) : (
        <ArrowDown className="h-3 w-3 text-emerald-800 shrink-0" />
      );
    };

    const sorted = sortItems(stockLooItems, tableSortField, tableSortDir).map((item, idx) => ({
      ...item,
      no: idx + 1
    }));

    const sumFgQty = stockLooItems.reduce((acc, r) => acc + (r.fgQty || 0), 0);
    const sumFgTon = stockLooItems.reduce((acc, r) => acc + (r.fgTon || 0), 0);
    const sumWipQty = stockLooItems.reduce((acc, r) => acc + (r.wipQty || 0), 0);
    const sumWipTon = stockLooItems.reduce((acc, r) => acc + (r.wipTon || 0), 0);
    const sumTotalQty = stockLooItems.reduce((acc, r) => acc + (r.totalQty || 0), 0);
    const sumTotalTon = stockLooItems.reduce((acc, r) => acc + (r.totalStockTon || 0), 0);
    const sumLooQty = stockLooItems.reduce((acc, r) => acc + (r.looQty || 0), 0);
    const sumLooTon = stockLooItems.reduce((acc, r) => acc + (r.looTon || 0), 0);
    const overallAvgFulfill = sumLooTon > 0 ? (sumTotalTon / sumLooTon) * 100 : 0;

    if (sorted.length === 0) {
      return (
        <div className="py-10 text-center text-slate-500 text-xs font-mono">
          Tidak ada data Stock vs LOO untuk {selectedGudang !== 'ALL' ? `gudang ${selectedGudang}` : 'seluruh gudang'}.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead className="sticky top-0 z-10 border-b border-slate-300 bg-slate-100 text-[10px] shadow-2xs">
            {/* Header Tier 1: Group Categories */}
            <tr className="border-b border-slate-200 text-slate-800">
              <th rowSpan={2} className="py-2 px-2 text-center font-bold text-slate-500 w-9 border-r border-slate-200">
                No.
              </th>
              <th
                rowSpan={2}
                onClick={() => handleSort('customer')}
                className="py-2 px-2.5 font-bold uppercase tracking-wider select-none cursor-pointer hover:bg-slate-200/80 transition-colors text-left text-slate-700 border-r border-slate-200"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Nama Customer</span>
                  {renderSortIcon('customer')}
                </div>
              </th>
              <th
                rowSpan={2}
                onClick={() => handleSort('ukuran')}
                className="py-2 px-2.5 font-bold uppercase tracking-wider select-none cursor-pointer hover:bg-slate-200/80 transition-colors text-left text-slate-700 border-r border-slate-200"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Ukuran</span>
                  {renderSortIcon('ukuran')}
                </div>
              </th>
              <th
                rowSpan={2}
                onClick={() => handleSort('kodeMaterial')}
                className="py-2 px-2.5 font-bold uppercase tracking-wider select-none cursor-pointer hover:bg-slate-200/80 transition-colors text-left text-slate-700 border-r border-slate-200"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Kode Material</span>
                  {renderSortIcon('kodeMaterial')}
                </div>
              </th>
              <th colSpan={2} className="py-1.5 px-2 text-center font-bold uppercase tracking-wider text-emerald-950 bg-emerald-100/60 border-r border-slate-200">
                Stock FG
              </th>
              <th colSpan={2} className="py-1.5 px-2 text-center font-bold uppercase tracking-wider text-slate-800 bg-slate-200/60 border-r border-slate-200">
                Stock WIP
              </th>
              <th colSpan={2} className="py-1.5 px-2 text-center font-bold uppercase tracking-wider text-slate-900 bg-slate-200/80 border-r border-slate-200">
                Total Stock
              </th>
              <th colSpan={2} className="py-1.5 px-2 text-center font-bold uppercase tracking-wider text-amber-950 bg-amber-100/60 border-r border-slate-200">
                Target LOO
              </th>
              <th
                rowSpan={2}
                onClick={() => handleSort('persenFulfillment')}
                className="py-2 px-2.5 font-bold uppercase tracking-wider select-none cursor-pointer hover:bg-slate-200/80 transition-colors text-right text-slate-900"
              >
                <div className="inline-flex items-center justify-end w-full gap-1">
                  <span>% Stock vs LOO</span>
                  {renderSortIcon('persenFulfillment')}
                </div>
              </th>
            </tr>
            {/* Header Tier 2: Qty ( Pcs ) & Tonase */}
            <tr className="border-b border-slate-300 text-[10px]">
              <th
                onClick={() => handleSort('fgQty')}
                className="py-1 px-2 text-right font-bold text-emerald-950 bg-emerald-50/70 select-none cursor-pointer hover:bg-emerald-100/60"
              >
                Qty ( Pcs )
              </th>
              <th
                onClick={() => handleSort('fgTon')}
                className="py-1 px-2 text-right font-bold text-emerald-950 bg-emerald-50/70 border-r border-slate-200 select-none cursor-pointer hover:bg-emerald-100/60"
              >
                Tonase
              </th>
              <th
                onClick={() => handleSort('wipQty')}
                className="py-1 px-2 text-right font-bold text-slate-700 bg-slate-100 select-none cursor-pointer hover:bg-slate-200/60"
              >
                Qty ( Pcs )
              </th>
              <th
                onClick={() => handleSort('wipTon')}
                className="py-1 px-2 text-right font-bold text-slate-700 bg-slate-100 border-r border-slate-200 select-none cursor-pointer hover:bg-slate-200/60"
              >
                Tonase
              </th>
              <th
                onClick={() => handleSort('totalQty')}
                className="py-1 px-2 text-right font-bold text-slate-900 bg-slate-100 select-none cursor-pointer hover:bg-slate-200/60"
              >
                Qty ( Pcs )
              </th>
              <th
                onClick={() => handleSort('totalStockTon')}
                className="py-1 px-2 text-right font-bold text-slate-900 bg-slate-100 border-r border-slate-200 select-none cursor-pointer hover:bg-slate-200/60"
              >
                Tonase
              </th>
              <th
                onClick={() => handleSort('looQty')}
                className="py-1 px-2 text-right font-bold text-amber-950 bg-amber-50/70 select-none cursor-pointer hover:bg-amber-100/60"
              >
                Qty ( Pcs )
              </th>
              <th
                onClick={() => handleSort('looTon')}
                className="py-1 px-2 text-right font-bold text-amber-950 bg-amber-50/70 border-r border-slate-200 select-none cursor-pointer hover:bg-amber-100/60"
              >
                Tonase
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px]">
            {sorted.map((row) => {
              const hasLoo = (row.looTon || 0) > 0 || (row.looQty || 0) > 0;
              const isFulfilled = row.persenFulfillment >= 100;
              const isDeficit = row.persenFulfillment < 50;

              return (
                <tr key={`${row.no}-${row.kodeMaterial}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-2 text-center text-slate-400 font-bold border-r border-slate-100">
                    {row.no}
                  </td>
                  <td className="py-2 px-2.5 font-semibold text-slate-900 border-r border-slate-100 max-w-[220px] truncate" title={row.customer}>
                    {row.customer}
                  </td>
                  <td className="py-2 px-2.5 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                    {row.ukuran}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap">
                    <span className="font-mono text-[11px] font-bold text-slate-900 block">{row.kodeMaterial}</span>
                    {row.gudang && (
                      <span className="text-[9px] text-slate-400 font-mono block">
                        {row.gudang}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right text-emerald-950 font-medium">
                    {row.fgQty ? formatQty(row.fgQty, { zeroAsDash: true }) : '-'}
                  </td>
                  <td className="py-2 px-2 text-right text-emerald-950 font-bold border-r border-slate-100">
                    {row.fgTon ? formatTon(row.fgTon, { decimals: 2, zeroAsDash: true }) : '-'}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-600">
                    {row.wipQty ? formatQty(row.wipQty, { zeroAsDash: true }) : '-'}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-700 font-medium border-r border-slate-100">
                    {row.wipTon ? formatTon(row.wipTon, { decimals: 2, zeroAsDash: true }) : '-'}
                  </td>
                  <td className="py-2 px-2 text-right font-bold text-slate-900">
                    {row.totalQty ? formatQty(row.totalQty, { zeroAsDash: true }) : '-'}
                  </td>
                  <td className="py-2 px-2 text-right font-black text-slate-900 border-r border-slate-100">
                    {row.totalStockTon ? formatTon(row.totalStockTon, { decimals: 2, zeroAsDash: true }) : '-'}
                  </td>
                  <td className="py-2 px-2 text-right font-semibold text-amber-950">
                    {row.looQty ? formatQty(row.looQty, { zeroAsDash: true }) : '-'}
                  </td>
                  <td className="py-2 px-2 text-right font-bold text-amber-950 border-r border-slate-100">
                    {row.looTon ? formatTon(row.looTon, { decimals: 2, zeroAsDash: true }) : '-'}
                  </td>
                  <td className="py-2 px-2.5 text-right whitespace-nowrap">
                    {hasLoo ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        isFulfilled
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isDeficit
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}>
                        {formatPercent(row.persenFulfillment)}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-100/95 backdrop-blur-xs font-bold text-[11px] text-slate-900">
            <tr>
              <td colSpan={4} className="py-2.5 px-3 text-left uppercase tracking-wider text-slate-700 text-[10px]">
                TOTAL ({stockLooItems.length} ITEM{selectedGudang !== 'ALL' ? ` • ${selectedGudang}` : ''})
              </td>
              <td className="py-2 px-2 text-right text-emerald-950 font-bold">
                {formatQty(sumFgQty, { zeroAsDash: true })}
              </td>
              <td className="py-2 px-2 text-right text-emerald-950 font-black border-r border-slate-200">
                {formatTon(sumFgTon, { decimals: 2, zeroAsDash: true })}
              </td>
              <td className="py-2 px-2 text-right text-slate-800">
                {formatQty(sumWipQty, { zeroAsDash: true })}
              </td>
              <td className="py-2 px-2 text-right text-slate-800 border-r border-slate-200">
                {formatTon(sumWipTon, { decimals: 2, zeroAsDash: true })}
              </td>
              <td className="py-2 px-2 text-right text-slate-950 font-black">
                {formatQty(sumTotalQty, { zeroAsDash: true })}
              </td>
              <td className="py-2 px-2 text-right text-slate-950 font-black border-r border-slate-200">
                {formatTon(sumTotalTon, { decimals: 2, zeroAsDash: true })}
              </td>
              <td className="py-2 px-2 text-right text-amber-950 font-bold">
                {formatQty(sumLooQty, { zeroAsDash: true })}
              </td>
              <td className="py-2 px-2 text-right text-amber-950 font-black border-r border-slate-200">
                {formatTon(sumLooTon, { decimals: 2, zeroAsDash: true })}
              </td>
              <td className="py-2 px-2.5 text-right font-black">
                <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  overallAvgFulfill >= 100
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {formatPercent(overallAvgFulfill)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
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
              Stock Pipa vs LOO: Per Gudang
            </h2>
            <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-800">
              Delivery Fulfillment
            </span>
            {selectedGudang !== 'ALL' && (
              <span className="text-[10px] font-mono bg-amber-400 text-amber-950 px-2 py-0.5 rounded font-bold">
                Gudang: {selectedGudang}
              </span>
            )}
          </div>
          <p className="text-[11px] text-emerald-200 font-medium font-mono">
            Monitoring kesiapan stock pipa aktual (FG &amp; WIP) terhadap target open LOO customer per gudang
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
              <option value="ALL">Semua Gudang ({warehouseRecaps.length})</option>
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
          <p className="text-sm font-bold text-slate-700">Belum ada data Stock vs LOO</p>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Upload file export SAP melalui menu &quot;Upload Raw SAP&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {cards.map((card, index) => {
            // CARD 1: GRAFIK CLUSTERED BAR TOP CUSTOMER + UKURAN (SESUAI GAMBAR SAP EXCEL)
            if (card.id === 'top15-customer-chart' && top15ChartItems.length > 0) {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title={`Top ${chartTopCount} Customer+Ukuran ${selectedGudang !== 'ALL' ? selectedGudang : 'Semua Gudang'}`}
                  subtitle={`Komparasi tonase target LOO vs stock pipa WIP & FG aktual (Top ${chartTopCount} item)`}
                  icon={BarChart3}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <select
                      value={chartTopCount}
                      onChange={(e) => setChartTopCount(Number(e.target.value))}
                      className="text-[10px] font-mono bg-emerald-50 text-emerald-900 font-bold px-2 py-0.5 rounded border border-emerald-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 cursor-pointer shadow-2xs"
                    >
                      <option value={5}>Top 5 Item</option>
                      <option value={10}>Top 10 Item</option>
                      <option value={15}>Top 15 Item</option>
                      <option value={20}>Top 20 Item</option>
                    </select>
                  }
                  headerAction={
                    <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setChartSortMetric('stock')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          chartSortMetric === 'stock'
                            ? 'bg-emerald-800 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Urut: Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartSortMetric('loo')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          chartSortMetric === 'loo'
                            ? 'bg-emerald-800 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Urut: LOO
                      </button>
                    </div>
                  }
                >
                  {(expanded) => (
                    <div className="flex flex-col h-full w-full gap-4">
                      <div className={expanded ? 'h-[500px] w-full' : 'h-80 w-full'}>
                        <Bar
                          data={top15ChartData}
                          options={top15ChartOptions}
                          plugins={[top15DataLabelsPlugin]}
                        />
                      </div>
                    </div>
                  )}
                </CustomizableCard>
              );
            }

            // CARD 2: TABEL DETAIL STOCK VS LOO DENGAN FORMAT SPESIFIK USER
            // No. | Nama Customer | Ukuran | Kode Material | [Stock FG] | [Stock WIP] | [Total Stock] | [Target LOO] | % Stock vs LOO
            if (card.id === 'stock-vs-loo-table') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title={`Tabel Stock Pipa vs LOO ${selectedGudang !== 'ALL' ? `• ${selectedGudang}` : ''}`}
                  subtitle={`Rincian perbandingan kuantitas dan tonase stock pipa (FG & WIP) terhadap target open LOO customer ${selectedGudang !== 'ALL' ? `di ${selectedGudang}` : 'seluruh gudang'}`}
                  icon={Table2}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {stockLooItems.length} Item
                    </span>
                  }
                >
                  {renderStockVsLooTable()}
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
