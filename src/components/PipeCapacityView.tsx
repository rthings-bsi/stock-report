'use client';

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { WarehousePipeCapacity } from '../types/warehouse';
import { formatTon, formatPercent, formatQty } from '@/lib/utils';
import { BarChart3, TrendingUp, Table2, Users, PieChart, ArrowUpDown, ArrowUp, ArrowDown, Warehouse } from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface CustomerBreakdownItem {
  customer: string;
  qty: number;
  tonase: number;
}

interface PipeCapacityViewProps {
  data: WarehousePipeCapacity[];
  selectedGudang?: string;
  onSelectGudang?: (gudang: string) => void;
  customerBreakdown?: Record<string, CustomerBreakdownItem[]>;
  isCustomizing?: boolean;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'combo-chart', width: 'col-span-8' },
  { id: 'top5-utilization', width: 'col-span-4' },
  { id: 'main-table', width: 'col-span-12' },
  { id: 'customer-breakdown', width: 'col-span-6' },
  { id: 'free-stock-table', width: 'col-span-6' },
];

export const PipeCapacityView: React.FC<PipeCapacityViewProps> = ({
  data,
  customerBreakdown = {},
  isCustomizing = false
}) => {
  const [activeGudangFilter, setActiveGudangFilter] = useState<string>('ALL');
  const [custSortKey, setCustSortKey] = useState<'customer' | 'qty' | 'tonase'>('tonase');
  const [custSortOrder, setCustSortOrder] = useState<'asc' | 'desc'>('desc');

  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_pipecapacity');
      if (saved) setCards(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_pipecapacity', JSON.stringify(cards));
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

  const totalKapasitas = data.reduce((sum, d) => sum + d.kapasitas, 0);
  const totalStock = data.reduce((sum, d) => sum + d.stock, 0);
  const avgPersen = totalKapasitas > 0 ? (totalStock / totalKapasitas) * 100 : 0;

  const totalWipLt = data.reduce((sum, d) => sum + d.wipLt, 0);
  const totalFgLt = data.reduce((sum, d) => sum + d.fgLt, 0);
  const totalWipSt = data.reduce((sum, d) => sum + d.wipSt, 0);
  const totalFgSt = data.reduce((sum, d) => sum + d.fgSt, 0);

  const totalCustStock = data.reduce((sum, d) => sum + d.customerStock, 0);
  const totalFreeStock = data.reduce((sum, d) => sum + d.freeStock, 0);

  const top5Highest = [...data]
    .sort((a, b) => b.persenTerisi - a.persenTerisi)
    .slice(0, 5);

  const highestWarehouse = top5Highest[0] || data[0] || null;

  const allAvailableGudangs = Array.from(
    new Set([
      'ALL',
      ...data.map((d) => d.gudang),
      ...Object.keys(customerBreakdown).filter((k) => k !== 'ALL')
    ])
  );

  const rawCustomerData =
    customerBreakdown[activeGudangFilter] ||
    (customerBreakdown['ALL'] ? customerBreakdown['ALL'] : []);
  const customerTotalQty = rawCustomerData.reduce((sum, d) => sum + d.qty, 0);
  const customerTotalTon = rawCustomerData.reduce((sum, d) => sum + d.tonase, 0);

  const currentCustomerData = [...rawCustomerData].sort((a, b) => {
    let comp = 0;
    if (custSortKey === 'customer') {
      comp = a.customer.localeCompare(b.customer);
    } else if (custSortKey === 'qty') {
      comp = a.qty - b.qty;
    } else {
      comp = a.tonase - b.tonase;
    }
    return custSortOrder === 'asc' ? comp : -comp;
  });

  const handleCustSort = (key: 'customer' | 'qty' | 'tonase') => {
    if (custSortKey === key) {
      setCustSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCustSortKey(key);
      setCustSortOrder('desc');
    }
  };

  const comboChartData = {
    labels: data.map((d) => d.gudang),
    datasets: [
      {
        type: 'line' as const,
        label: '% Terisi',
        data: data.map((d) => d.persenTerisi),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.04)',
        borderWidth: 2.5,
        tension: 0.35,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#f59e0b',
        pointBorderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6.5,
        pointHoverBackgroundColor: '#f59e0b',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        yAxisID: 'y1',
        order: 1,
      },
      {
        type: 'bar' as const,
        label: 'Kapasitas (Ton)',
        data: data.map((d) => d.kapasitas),
        backgroundColor: '#e2e8f0',
        hoverBackgroundColor: '#cbd5e1',
        borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        yAxisID: 'y',
        order: 3,
      },
      {
        type: 'bar' as const,
        label: 'Stock Aktual (Ton)',
        data: data.map((d) => d.stock),
        backgroundColor: data.map((d) => {
          if (d.persenTerisi > 90) return '#ef4444';
          if (d.persenTerisi > 80) return '#f59e0b';
          return '#059669';
        }),
        hoverBackgroundColor: data.map((d) => {
          if (d.persenTerisi > 90) return '#dc2626';
          if (d.persenTerisi > 80) return '#d97706';
          return '#047857';
        }),
        borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        yAxisID: 'y',
        order: 2,
      },
    ],
  };

  const comboChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 12, weight: 600 as const },
          color: '#475569',
          usePointStyle: true,
          pointStyle: 'circle' as const,
          boxWidth: 8,
          boxHeight: 8,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: 'ui-sans-serif, system-ui, sans-serif', size: 12, weight: 700 as const },
        bodyFont: { family: 'ui-sans-serif, system-ui, sans-serif', size: 11, weight: 500 as const },
        padding: 12,
        cornerRadius: 10,
        boxPadding: 4,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function (context: any) {
            const val = context.raw || 0;
            if (context.dataset.yAxisID === 'y1') {
              return ` ${context.dataset.label}: ${val.toFixed(1)}%`;
            }
            return ` ${context.dataset.label}: ${val.toLocaleString('id-ID', { minimumFractionDigits: 1 })} Ton`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 11, weight: 600 as const }, color: '#475569' },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        max: 1000,
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 10, weight: 500 as const }, color: '#94a3b8', stepSize: 250 },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        max: 150,
        grid: { drawOnChartArea: false },
        ticks: {
          font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 10, weight: 600 as const },
          color: '#d97706',
          stepSize: 50,
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <Warehouse className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <h1 className="text-base font-bold text-white font-sans tracking-tight">
            Stock Warehouse vs Kapasitas (Pipa)
          </h1>
        </div>
      </div>

      {/* CUSTOMIZABLE CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {cards.map((card, index) => {
          if (card.id === 'combo-chart') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Tonase Pipa Per Gudang vs Kapasitas"
                icon={BarChart3}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
              >
                <div className="h-68 w-full pt-1">
                  <Chart type="bar" data={comboChartData} options={comboChartOptions} />
                </div>
              </CustomizableCard>
            );
          }

          if (card.id === 'top5-utilization') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Top 5 Gudang Terisi Tertinggi"
                icon={TrendingUp}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
              >
                <div className="space-y-4 flex flex-col justify-between h-full">
                  <div className="space-y-2.5">
                    {top5Highest.map((item, idx) => {
                      const pct = item.persenTerisi;
                      const badgeBg =
                        pct > 90
                          ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-xs'
                          : pct > 80
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200/80';
                      const textCls =
                        pct > 90
                          ? 'text-red-600 font-bold'
                          : pct > 80
                          ? 'text-amber-600 font-bold'
                          : 'text-emerald-700 font-bold';
                      const barGradient =
                        pct > 90
                          ? 'from-red-500 to-rose-600'
                          : pct > 80
                          ? 'from-amber-400 to-amber-500'
                          : 'from-emerald-500 to-teal-600';

                      return (
                        <div key={item.gudang} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-md text-[10px] font-bold ${badgeBg}`}>
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800">{item.gudang}</span>
                            </div>
                            <span className={`font-mono text-xs ${textCls}`}>
                              {formatPercent(item.persenTerisi)}
                            </span>
                          </div>

                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100/90 relative">
                            <div
                              className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${barGradient}`}
                              style={{ width: `${Math.min(item.persenTerisi, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {highestWarehouse && (() => {
                    const pct = highestWarehouse.persenTerisi;
                    const boxStyles =
                      pct > 100
                        ? 'border-red-300/80 bg-gradient-to-br from-red-50/90 via-red-50/40 to-white'
                        : pct > 90
                        ? 'border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-rose-50/40 to-white'
                        : pct > 80
                        ? 'border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-white'
                        : 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white';
                    const headerText =
                      pct > 90
                        ? 'text-rose-950'
                        : pct > 80
                        ? 'text-amber-950'
                        : 'text-emerald-950';
                    const subText =
                      pct > 90
                        ? 'text-rose-700'
                        : pct > 80
                        ? 'text-amber-700'
                        : 'text-emerald-700';
                    const tagBg =
                      pct > 100
                        ? 'bg-rose-600 text-white shadow-xs'
                        : pct > 90
                        ? 'bg-rose-600 text-white shadow-xs'
                        : pct > 80
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-emerald-600 text-white shadow-xs';
                    const tagLabel =
                      pct > 100
                        ? 'OVERCAPACITY'
                        : pct > 90
                        ? 'KRITIS'
                        : pct > 80
                        ? 'PRIORITAS'
                        : 'NORMAL';

                    return (
                      <div className={`rounded-xl border ${boxStyles} p-3 shadow-xs relative overflow-hidden`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Terisi Tertinggi</span>
                          <span className={`rounded-full ${tagBg} px-2 py-0.5 text-[9px] font-bold tracking-wide flex items-center gap-1`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            {tagLabel}
                          </span>
                        </div>
                        <p className={`mt-1 text-sm font-bold tracking-tight ${headerText}`}>
                          {highestWarehouse.gudang} ({formatPercent(highestWarehouse.persenTerisi)})
                        </p>
                        <p className={`text-[11px] ${subText} font-medium mt-0.5`}>
                          Stock {formatTon(highestWarehouse.stock, { showUnit: true })} / Kapasitas {formatTon(highestWarehouse.kapasitas, { showUnit: true })}
                        </p>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-slate-100/40 p-2.5 text-center shadow-2xs hover:border-slate-300 transition-colors">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Kapasitas</span>
                      <p className="text-xs font-bold text-slate-900 mt-1 font-mono">{formatTon(totalKapasitas)}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/80 to-emerald-100/30 p-2.5 text-center shadow-2xs hover:border-emerald-300 transition-colors">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 block">Stock</span>
                      <p className="text-xs font-bold text-emerald-950 mt-1 font-mono">{formatTon(totalStock)}</p>
                    </div>
                    <div className={`rounded-xl border ${
                      avgPersen > 90
                        ? 'border-red-200/80 bg-gradient-to-b from-red-50/80 to-red-100/30 hover:border-red-300'
                        : avgPersen > 80
                        ? 'border-amber-200/80 bg-gradient-to-b from-amber-50/80 to-amber-100/30 hover:border-amber-300'
                        : 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/80 to-emerald-100/30 hover:border-emerald-300'
                    } p-2.5 text-center shadow-2xs transition-colors`}>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                        avgPersen > 90
                          ? 'text-red-800'
                          : avgPersen > 80
                          ? 'text-amber-800'
                          : 'text-emerald-800'
                      } block`}>% Terisi</span>
                      <p className={`text-xs font-bold font-mono ${
                        avgPersen > 90
                          ? 'text-red-950'
                          : avgPersen > 80
                          ? 'text-amber-950'
                          : 'text-emerald-950'
                      } mt-1`}>{formatPercent(avgPersen)}</p>
                    </div>
                  </div>
                </div>
              </CustomizableCard>
            );
          }

          if (card.id === 'main-table') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Rekapitulasi Stock Pipa Per Gudang (Ton)"
                icon={Table2}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200/80 font-semibold shadow-2xs">
                    {data.length} Gudang Terdata
                  </span>
                }
              >
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-2xs">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-100/90 via-slate-50 to-slate-100/90 text-slate-700 text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-3.5 font-bold">Gudang</th>
                        <th className="py-2.5 px-2.5 text-right font-bold">Kapasitas (T)</th>
                        <th className="py-2.5 px-2.5 text-right font-bold text-amber-900">Stock (T)</th>
                        <th className="py-2.5 px-2.5 text-right font-bold">% Terisi</th>
                        <th className="py-2.5 px-2.5 text-right font-bold">Sisa Ruang</th>
                        <th className="py-2.5 px-2.5 text-right font-bold border-l border-slate-200 text-slate-600">WIP LT</th>
                        <th className="py-2.5 px-2.5 text-right font-bold text-emerald-900">FG LT</th>
                        <th className="py-2.5 px-2.5 text-right font-bold text-slate-600">WIP ST</th>
                        <th className="py-2.5 px-2.5 text-right font-bold text-emerald-900">FG ST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 bg-white">
                      {data.map((item) => {
                        const pct = item.persenTerisi;
                        const stockColor =
                          pct > 90
                            ? 'text-red-700 font-bold'
                            : pct > 80
                            ? 'text-amber-700 font-bold'
                            : 'text-emerald-800 font-semibold';
                        const pctColor =
                          pct > 90
                            ? 'text-red-700 font-bold'
                            : pct > 80
                            ? 'text-amber-700 font-bold'
                            : 'text-slate-800 font-semibold';

                        return (
                          <tr key={item.gudang} className="hover:bg-slate-50/90 transition-colors">
                            <td className="py-2.5 px-3.5 font-bold text-slate-900">{item.gudang}</td>
                            <td className="py-2.5 px-2.5 text-right text-slate-600">{formatTon(item.kapasitas)}</td>
                            <td className={`py-2.5 px-2.5 text-right ${stockColor}`}>
                              {formatTon(item.stock)}
                            </td>
                            <td className={`py-2.5 px-2.5 text-right ${pctColor}`}>
                              {formatPercent(item.persenTerisi)}
                            </td>
                            <td className={`py-2.5 px-2.5 text-right font-medium ${item.selisih < 0 ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                              {formatTon(item.selisih)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right text-slate-600 border-l border-slate-100">{item.wipLt ? formatTon(item.wipLt) : '-'}</td>
                            <td className="py-2.5 px-2.5 text-right font-semibold text-emerald-900">{item.fgLt ? formatTon(item.fgLt) : '-'}</td>
                            <td className="py-2.5 px-2.5 text-right text-slate-600">{item.wipSt ? formatTon(item.wipSt) : '-'}</td>
                            <td className="py-2.5 px-2.5 text-right font-semibold text-emerald-900">{item.fgSt ? formatTon(item.fgSt) : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-100/90 font-bold text-slate-900">
                      <tr>
                        <td className="py-2.5 px-3.5 uppercase text-slate-900">TOTAL</td>
                        <td className="py-2.5 px-2.5 text-right">{formatTon(totalKapasitas)}</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-950">{formatTon(totalStock)}</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-900">{formatPercent(avgPersen)}</td>
                        <td className="py-2.5 px-2.5 text-right">{formatTon(totalKapasitas - totalStock)}</td>
                        <td className="py-2.5 px-2.5 text-right border-l border-slate-200">{formatTon(totalWipLt)}</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-900">{formatTon(totalFgLt)}</td>
                        <td className="py-2.5 px-2.5 text-right">{formatTon(totalWipSt)}</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-900">{formatTon(totalFgSt)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CustomizableCard>
            );
          }

          if (card.id === 'customer-breakdown') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Distribusi Stock Pipa Customer"
                icon={Users}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                headerAction={
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="text-slate-500 font-bold text-[10px] uppercase">Gudang:</span>
                    <select
                      value={activeGudangFilter}
                      onChange={(e) => setActiveGudangFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-hidden cursor-pointer"
                    >
                      {allAvailableGudangs.map((g) => (
                        <option key={g} value={g}>
                          {g === 'ALL' ? 'Semua Gudang' : g}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              >
                <div className="flex flex-col justify-between h-full">
                  <div className="flex-1 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200/80 shadow-2xs">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead className="sticky top-0 bg-gradient-to-r from-slate-100/95 via-slate-50/95 to-slate-100/95 backdrop-blur-xs text-slate-700 text-[10px] shadow-2xs z-10 select-none">
                        <tr>
                          <th
                            onClick={() => handleCustSort('customer')}
                            className="py-2.5 px-3.5 font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-200/60 transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Nama Customer</span>
                              {custSortKey === 'customer' ? (
                                custSortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-800 shrink-0" /> : <ArrowDown className="h-3 w-3 text-emerald-800 shrink-0" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 shrink-0" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleCustSort('qty')}
                            className="py-2.5 px-3 text-right font-bold border-b border-slate-200 cursor-pointer hover:bg-slate-200/60 transition-colors"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Qty (Pcs)</span>
                              {custSortKey === 'qty' ? (
                                custSortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-800 shrink-0" /> : <ArrowDown className="h-3 w-3 text-emerald-800 shrink-0" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 shrink-0" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleCustSort('tonase')}
                            className="py-2.5 px-3.5 text-right font-bold text-emerald-900 border-b border-slate-200 cursor-pointer hover:bg-slate-200/60 transition-colors"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Tonase (Ton)</span>
                              {custSortKey === 'tonase' ? (
                                custSortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-emerald-800 shrink-0" /> : <ArrowDown className="h-3 w-3 text-emerald-800 shrink-0" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 shrink-0" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                        {currentCustomerData.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400">
                              Tidak ada data customer untuk gudang ini.
                            </td>
                          </tr>
                        ) : (
                          currentCustomerData.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50/90 transition-colors">
                              <td className="py-2.5 px-3.5 font-medium text-slate-900 leading-normal" title={c.customer}>
                                {c.customer}
                              </td>
                              <td className="py-2.5 px-3 text-right leading-normal">{formatQty(c.qty)}</td>
                              <td className="py-2.5 px-3.5 text-right font-bold text-emerald-900 leading-normal">{formatTon(c.tonase)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {currentCustomerData.length > 0 && (
                    <div className="p-3 border border-slate-200/80 bg-slate-50 flex items-center justify-between font-mono text-xs font-bold text-slate-900 mt-3 rounded-xl shadow-2xs">
                      <span>TOTAL ({activeGudangFilter})</span>
                      <div className="space-x-4">
                        <span>{formatQty(customerTotalQty)} Pcs</span>
                        <span className="text-emerald-950">{formatTon(customerTotalTon, { showUnit: true })}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CustomizableCard>
            );
          }

          if (card.id === 'free-stock-table') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Customer vs Free Stock"
                icon={PieChart}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
              >
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-2xs">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead className="bg-gradient-to-r from-slate-100/90 via-slate-50 to-slate-100/90 text-slate-700 text-[10px] border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3.5 font-bold">Gudang</th>
                        <th className="py-2.5 px-2.5 text-right font-bold text-slate-800">Cust Stock (T)</th>
                        <th className="py-2.5 px-2.5 text-right font-bold text-emerald-800">Free Stock (T)</th>
                        <th className="py-2.5 px-2.5 text-right font-bold text-slate-900">Total Stock (T)</th>
                        <th className="py-2.5 px-3.5 text-right font-bold text-emerald-800">% Free</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      {data.map((r) => (
                        <tr key={`free-${r.gudang}`} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-slate-900">{r.gudang}</td>
                          <td className="py-2.5 px-2.5 text-right">{formatTon(r.customerStock)}</td>
                          <td className="py-2.5 px-2.5 text-right font-semibold text-emerald-800">{formatTon(r.freeStock)}</td>
                          <td className="py-2.5 px-2.5 text-right font-bold text-slate-900">{formatTon(r.stock)}</td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-emerald-900">{formatPercent(r.persenFreeStock)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-100/90 font-bold text-slate-900">
                      <tr>
                        <td className="py-2.5 px-3.5">TOTAL</td>
                        <td className="py-2.5 px-2.5 text-right">{formatTon(totalCustStock)}</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-950">{formatTon(totalFreeStock)}</td>
                        <td className="py-2.5 px-2.5 text-right">{formatTon(totalStock)}</td>
                        <td className="py-2.5 px-3.5 text-right text-emerald-900">
                          {totalStock > 0 ? formatPercent((totalFreeStock / totalStock) * 100) : '0,0%'}
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
