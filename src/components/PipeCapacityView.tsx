'use client';

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { WarehousePipeCapacity } from '../types/warehouse';
import { formatTon, formatPercent, formatQty } from '@/lib/utils';
import { BarChart3, TrendingUp, Table2, Users, PieChart, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
        label: '% Utilisasi',
        data: data.map((d) => d.persenTerisi),
        borderColor: '#d97706',
        backgroundColor: '#ffffff',
        borderWidth: 2.5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#d97706',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1',
      },
      {
        type: 'bar' as const,
        label: 'Kapasitas (Ton)',
        data: data.map((d) => d.kapasitas),
        backgroundColor: '#cbd5e1',
        hoverBackgroundColor: '#94a3b8',
        borderRadius: 2,
        yAxisID: 'y',
      },
      {
        type: 'bar' as const,
        label: 'Stock Aktual (Ton)',
        data: data.map((d) => d.stock),
        backgroundColor: data.map((d) => (d.persenTerisi > 100 ? '#d97706' : '#047857')),
        hoverBackgroundColor: data.map((d) => (d.persenTerisi > 100 ? '#b45309' : '#065f46')),
        borderRadius: 2,
        yAxisID: 'y',
      },
    ],
  };

  const comboChartOptions = {
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
        titleFont: { family: 'monospace', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        padding: 10,
        cornerRadius: 8,
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
        ticks: { font: { family: 'monospace', size: 10, weight: 'bold' as const }, color: '#334155' },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        max: 1000,
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'monospace', size: 9 }, color: '#94a3b8', stepSize: 250 },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        max: 150,
        grid: { drawOnChartArea: false },
        ticks: {
          font: { family: 'monospace', size: 9, weight: 'bold' as const },
          color: '#d97706',
          stepSize: 50,
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* SECTION BANNER TOP */}
      <div className="rounded-md border border-black/20 theme-banner text-white p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight uppercase">
            Stock Warehouse vs Kapasitas (Pipa)
          </h2>
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
                <div className="h-64 w-full">
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
                title="Top 5 Gudang Utilisasi Tertinggi"
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
                  <div className="space-y-2">
                    {top5Highest.map((item, idx) => {
                      const isRank1 = idx === 0;
                      return (
                        <div key={item.gudang} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <span className={`flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${
                                isRank1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-800">{item.gudang}</span>
                            </div>
                            <span className={`font-bold ${isRank1 ? 'text-amber-800' : 'text-emerald-800'}`}>
                              {formatPercent(item.persenTerisi)}
                            </span>
                          </div>

                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 relative">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isRank1 ? 'bg-amber-500' : 'bg-emerald-700'
                              }`}
                              style={{ width: `${Math.min(item.persenTerisi, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {highestWarehouse && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-2.5 font-mono">
                      <div className="flex items-center justify-between text-amber-900">
                        <span className="text-[10px] font-bold uppercase">Utilisasi Tertinggi</span>
                        <span className="rounded bg-amber-400 px-1.5 py-0.2 text-[9px] font-bold text-slate-950">
                          {highestWarehouse.persenTerisi > 100 ? 'OVERCAPACITY' : 'PRIORITAS'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-bold text-amber-950">
                        {highestWarehouse.gudang} ({formatPercent(highestWarehouse.persenTerisi)})
                      </p>
                      <p className="text-[10px] text-amber-800 font-medium">
                        Stock {formatTon(highestWarehouse.stock, { showUnit: true })} / Kapasitas {formatTon(highestWarehouse.kapasitas, { showUnit: true })}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 font-mono">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-center">
                      <span className="text-[9px] font-bold uppercase text-slate-500 block">Kapasitas</span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">{formatTon(totalKapasitas)}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-center">
                      <span className="text-[9px] font-bold uppercase text-emerald-800 block">Stock</span>
                      <p className="text-xs font-bold text-emerald-950 mt-0.5">{formatTon(totalStock)}</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-center">
                      <span className="text-[9px] font-bold uppercase text-amber-800 block">Utilisasi</span>
                      <p className="text-xs font-bold text-amber-950 mt-0.5">{formatPercent(avgPersen)}</p>
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
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300 font-semibold">
                    {data.length} Gudang Terdata
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 text-[10px] uppercase">
                        <th className="py-2.5 px-3 font-bold">Gudang</th>
                        <th className="py-2.5 px-2.5 text-right font-bold">Kapasitas (T)</th>
                        <th className="py-2.5 px-2.5 text-right font-bold text-amber-900">Stock (T)</th>
                        <th className="py-2.5 px-2.5 text-right font-bold">% Utilisasi</th>
                        <th className="py-2.5 px-2.5 text-right font-bold">Sisa Ruang</th>
                        <th className="py-2.5 px-2 text-right font-bold border-l border-slate-200 text-slate-600">WIP LT</th>
                        <th className="py-2.5 px-2 text-right font-bold text-emerald-900">FG LT</th>
                        <th className="py-2.5 px-2 text-right font-bold text-slate-600">WIP ST</th>
                        <th className="py-2.5 px-2 text-right font-bold text-emerald-900">FG ST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {data.map((item) => {
                        const isOver = item.persenTerisi > 100;
                        return (
                          <tr key={item.gudang} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-900">{item.gudang}</td>
                            <td className="py-2 px-2.5 text-right text-slate-600">{formatTon(item.kapasitas)}</td>
                            <td className={`py-2 px-2.5 text-right font-semibold ${isOver ? 'text-amber-800' : 'text-emerald-800'}`}>
                              {formatTon(item.stock)}
                            </td>
                            <td className={`py-2 px-2.5 text-right font-bold ${isOver ? 'text-amber-700' : 'text-slate-800'}`}>
                              {formatPercent(item.persenTerisi)}
                            </td>
                            <td className={`py-2 px-2.5 text-right font-medium ${item.selisih < 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                              {formatTon(item.selisih)}
                            </td>
                            <td className="py-2 px-2 text-right text-slate-600 border-l border-slate-100">{item.wipLt ? formatTon(item.wipLt) : '-'}</td>
                            <td className="py-2 px-2 text-right font-semibold text-emerald-900">{item.fgLt ? formatTon(item.fgLt) : '-'}</td>
                            <td className="py-2 px-2 text-right text-slate-600">{item.wipSt ? formatTon(item.wipSt) : '-'}</td>
                            <td className="py-2 px-2 text-right font-semibold text-emerald-900">{item.fgSt ? formatTon(item.fgSt) : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                      <tr>
                        <td className="py-2.5 px-3 uppercase text-slate-900">TOTAL</td>
                        <td className="py-2.5 px-2.5 text-right">{formatTon(totalKapasitas)}</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-950">{formatTon(totalStock)}</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-900">{formatPercent(avgPersen)}</td>
                        <td className="py-2.5 px-2.5 text-right">{formatTon(totalKapasitas - totalStock)}</td>
                        <td className="py-2.5 px-2 text-right border-l border-slate-200">{formatTon(totalWipLt)}</td>
                        <td className="py-2.5 px-2 text-right text-emerald-900">{formatTon(totalFgLt)}</td>
                        <td className="py-2.5 px-2 text-right">{formatTon(totalWipSt)}</td>
                        <td className="py-2.5 px-2 text-right text-emerald-900">{formatTon(totalFgSt)}</td>
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
                    <span className="text-slate-500 font-bold text-[10px]">Gudang:</span>
                    <select
                      value={activeGudangFilter}
                      onChange={(e) => setActiveGudangFilter(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-hidden cursor-pointer"
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
                  <div className="flex-1 max-h-[70vh] overflow-y-auto rounded border border-slate-200/80">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead className="sticky top-0 bg-slate-100 text-slate-700 text-[10px] shadow-xs z-10 select-none">
                        <tr>
                          <th
                            onClick={() => handleCustSort('customer')}
                            className="py-2 px-3 font-bold bg-slate-100 border-b border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors"
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
                            className="py-2 px-3 text-right font-bold bg-slate-100 border-b border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors"
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
                            className="py-2 px-3 text-right font-bold text-emerald-900 bg-slate-100 border-b border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors"
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
                            <td colSpan={3} className="py-6 text-center text-slate-400">
                              Tidak ada data customer untuk gudang ini.
                            </td>
                          </tr>
                        ) : (
                          currentCustomerData.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 font-medium text-slate-900 leading-normal" title={c.customer}>
                                {c.customer}
                              </td>
                              <td className="py-2 px-3 text-right leading-normal">{formatQty(c.qty)}</td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-900 leading-normal">{formatTon(c.tonase)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {currentCustomerData.length > 0 && (
                    <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between font-mono text-xs font-bold text-slate-900 mt-2 rounded">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-700 text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 font-bold">Gudang</th>
                        <th className="py-2 px-2 text-right font-bold text-slate-800">Cust Stock (T)</th>
                        <th className="py-2 px-2 text-right font-bold text-emerald-800">Free Stock (T)</th>
                        <th className="py-2 px-2 text-right font-bold text-slate-900">Total Stock (T)</th>
                        <th className="py-2 px-3 text-right font-bold text-emerald-800">% Free</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {data.map((r) => (
                        <tr key={`free-${r.gudang}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900">{r.gudang}</td>
                          <td className="py-2 px-2 text-right">{formatTon(r.customerStock)}</td>
                          <td className="py-2 px-2 text-right font-semibold text-emerald-800">{formatTon(r.freeStock)}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900">{formatTon(r.stock)}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-900">{formatPercent(r.persenFreeStock)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                      <tr>
                        <td className="py-2 px-3">TOTAL</td>
                        <td className="py-2 px-2 text-right">{formatTon(totalCustStock)}</td>
                        <td className="py-2 px-2 text-right text-emerald-950">{formatTon(totalFreeStock)}</td>
                        <td className="py-2 px-2 text-right">{formatTon(totalStock)}</td>
                        <td className="py-2 px-3 text-right text-emerald-900">
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
