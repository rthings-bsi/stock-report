'use client';

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { PipeNCWarehouse, PipeNCItem } from '../types/warehouse';
import { formatTon, formatPercent } from '@/lib/utils';
import { ShieldAlert, Table2, ListOrdered, ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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
  { id: 'combo-chart', width: 'col-span-8' },
  { id: 'kpi-summary', width: 'col-span-4' },
  { id: 'recap-table', width: 'col-span-12' },
  { id: 'lt-table', width: 'col-span-6' },
  { id: 'st-table', width: 'col-span-6' },
];

export const NCQualityView: React.FC<NCQualityViewProps> = ({
  ncWarehouseData = [],
  ncItems = [],
  isCustomizing = false
}) => {
  const data = ncWarehouseData;
  const [ltPage, setLtPage] = useState<number>(1);
  const [stPage, setStPage] = useState<number>(1);
  const pageSize = 12;

  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_nc');
      if (saved) setCards(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_nc', JSON.stringify(cards));
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

  const ncLTItems = ncItems.filter((i) => i.type === 'LT');
  const ncSTItems = ncItems.filter((i) => i.type === 'ST');

  const totalLT = ncLTItems.length;
  const totalST = ncSTItems.length;

  const totalLTPage = Math.ceil(totalLT / pageSize) || 1;
  const totalSTPage = Math.ceil(totalST / pageSize) || 1;

  const paginatedLT = ncLTItems.slice((ltPage - 1) * pageSize, ltPage * pageSize);
  const paginatedST = ncSTItems.slice((stPage - 1) * pageSize, stPage * pageSize);

  const totalPrime = data.reduce((acc, curr) => acc + curr.prime, 0);
  const totalGradeE = data.reduce((acc, curr) => acc + curr.gradeE, 0);
  const totalGradeC = data.reduce((acc, curr) => acc + curr.gradeC, 0);
  const totalAll = totalPrime + totalGradeE + totalGradeC;

  const persenGradeETotal = totalAll > 0 ? (totalGradeE / totalAll) * 100 : 0;
  const persenGradeCTotal = totalAll > 0 ? (totalGradeC / totalAll) * 100 : 0;
  const persenPrimeTotal = totalAll > 0 ? (totalPrime / totalAll) * 100 : 0;

  const isEmpty = data.length === 0;

  const chartData = {
    labels: data.map((d) => d.gudang),
    datasets: [
      {
        type: 'bar' as const,
        label: 'PRIME (Ton)',
        data: data.map((d) => d.prime),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 2,
      },
      {
        type: 'bar' as const,
        label: 'Grade C (Ton)',
        data: data.map((d) => d.gradeC),
        backgroundColor: '#f59e0b',
        hoverBackgroundColor: '#d97706',
        borderRadius: 2,
      },
      {
        type: 'bar' as const,
        label: 'Grade E (Ton)',
        data: data.map((d) => d.gradeE),
        backgroundColor: '#92400e',
        hoverBackgroundColor: '#78350f',
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
          color: '#334155',
          boxWidth: 10,
          boxHeight: 10,
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
        position: 'left' as const,
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'monospace', size: 9 }, color: '#94a3b8' },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* SECTION BANNER TOP */}
      <div className="rounded-md border border-black/20 theme-banner text-white p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Stock Pipa NC
            </h2>
          </div>
          <p className="text-[11px] text-emerald-200 font-medium font-mono">
            Pemantauan mutu pipa Prime, Grade C, dan Non-Conforming (Grade E) seluruh gudang
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <div className="bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800/80 flex items-center gap-2">
            <span className="text-emerald-300 text-[10px] uppercase">Total NC:</span>
            <span className="font-bold text-amber-300">{formatTon(totalGradeC + totalGradeE, { showUnit: true })}</span>
          </div>
          <span className="text-[10px] font-mono bg-white text-slate-900 px-2.5 py-1 rounded border border-slate-200 font-bold shadow-2xs">
            {totalLT + totalST} Item NC
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-bold text-slate-700">Belum ada data Pipa NC</p>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Upload file export SAP melalui menu &quot;Upload Raw SAP&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {cards.map((card, index) => {
            if (card.id === 'combo-chart') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Proporsi Mutu Material Pipa Per Gudang (Ton)"
                  subtitle=""
                  icon={ShieldAlert}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                >
                  <div className="h-64 w-full">
                    <Chart type="bar" data={chartData} options={chartOptions} />
                  </div>
                </CustomizableCard>
              );
            }

            if (card.id === 'kpi-summary') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Komposisi Mutu Total"
                  subtitle=""
                  icon={ShieldAlert}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                >
                  <div className="space-y-3 font-mono flex flex-col justify-between h-full py-1">
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-emerald-800 font-bold uppercase block">PRIME</span>
                          <span className="text-[10px] text-emerald-700">{formatPercent(persenPrimeTotal)}</span>
                        </div>
                        <p className="text-sm font-black text-emerald-950">{formatTon(totalPrime, { showUnit: true })}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-amber-900 font-bold uppercase block">Grade C</span>
                          <span className="text-[10px] text-amber-800">{formatPercent(persenGradeCTotal)}</span>
                        </div>
                        <p className="text-sm font-black text-amber-950">{formatTon(totalGradeC, { showUnit: true })}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-amber-100/60 border border-amber-300 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-amber-950 font-bold uppercase block">Grade E</span>
                          <span className="text-[10px] text-amber-800">{formatPercent(persenGradeETotal)}</span>
                        </div>
                        <p className="text-sm font-black text-amber-950">{formatTon(totalGradeE, { showUnit: true })}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Total Akumulasi NC:</span>
                      <strong className="text-amber-950 font-black">{formatTon(totalGradeC + totalGradeE, { showUnit: true })}</strong>
                    </div>
                  </div>
                </CustomizableCard>
              );
            }

            if (card.id === 'recap-table') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Rekap Tonase Pipa NC Per Gudang (Ton)"
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
                    <span className="text-[10px] font-mono bg-emerald-950 text-amber-300 px-2.5 py-0.5 rounded border border-emerald-800 font-semibold">
                      {data.length} Gudang
                    </span>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="border-b border-emerald-100 bg-emerald-50/60 text-slate-700">
                        <tr>
                          <th className="py-2.5 px-3 font-bold">Gudang</th>
                          <th className="py-2.5 px-3 text-right font-bold text-emerald-950">PRIME (Ton)</th>
                          <th className="py-2.5 px-3 text-right font-bold text-amber-900">Grade C (Ton)</th>
                          <th className="py-2.5 px-3 text-right font-bold text-amber-900">Grade E (Ton)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {data.map((item) => (
                          <tr key={item.gudang} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-900">{item.gudang}</td>
                            <td className="py-2 px-3 text-right text-emerald-800 font-semibold">{formatTon(item.prime)}</td>
                            <td className="py-2 px-3 text-right text-amber-900">{formatTon(item.gradeC)}</td>
                            <td className="py-2 px-3 text-right text-amber-900 font-bold">{formatTon(item.gradeE)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-emerald-950 bg-emerald-50/70 font-bold text-slate-900">
                        <tr>
                          <td className="py-2.5 px-3">TOTAL</td>
                          <td className="py-2.5 px-3 text-right text-emerald-900">{formatTon(totalPrime)}</td>
                          <td className="py-2.5 px-3 text-right text-amber-900">{formatTon(totalGradeC)}</td>
                          <td className="py-2.5 px-3 text-right text-amber-950">{formatTon(totalGradeE)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CustomizableCard>
              );
            }

            if (card.id === 'lt-table') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Pipa NC - Long Tube (LT ≥ 3000 mm)"
                  subtitle=""
                  icon={ListOrdered}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <span className="text-[10px] font-mono bg-emerald-950 text-amber-300 px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                      {totalLT} Item
                    </span>
                  }
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="border-b border-emerald-100 bg-emerald-50/60 text-slate-700 text-[10px]">
                          <tr>
                            <th className="py-2 px-3 font-bold">Ukuran &amp; Customer</th>
                            <th className="py-2 px-2 text-center font-bold">Grade</th>
                            <th className="py-2 px-2 text-right font-bold text-emerald-900">FG (T)</th>
                            <th className="py-2 px-2 text-right font-bold text-slate-600">WIP (T)</th>
                            <th className="py-2 px-3 text-right font-bold text-amber-900">Total Ton</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {paginatedLT.map((item) => (
                            <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-900 block">{item.ukuran}</span>
                                <span className="text-[10px] text-slate-500 font-sans truncate block max-w-[200px]" title={item.customer}>
                                  {item.customer}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  item.grade === 'Grade C' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-amber-200 border-amber-400 text-amber-950'
                                }`}>
                                  {item.grade}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right font-semibold text-emerald-800">{item.fgTon ? formatTon(item.fgTon) : '-'}</td>
                              <td className="py-2 px-2 text-right text-slate-500">{item.wipTon ? formatTon(item.wipTon) : '-'}</td>
                              <td className="py-2 px-3 text-right font-bold text-amber-900">{formatTon(item.totalTon)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalLTPage > 1 && (
                      <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between font-mono text-xs mt-2 rounded">
                        <span className="text-slate-500 text-[11px]">Hal {ltPage} dari {totalLTPage}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={ltPage === 1}
                            onClick={() => setLtPage((p) => Math.max(1, p - 1))}
                            className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={ltPage === totalLTPage}
                            onClick={() => setLtPage((p) => Math.min(totalLTPage, p + 1))}
                            className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </CustomizableCard>
              );
            }

            if (card.id === 'st-table') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Pipa NC - Short Tube (ST < 3000 mm)"
                  subtitle=""
                  icon={ListOrdered}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  badge={
                    <span className="text-[10px] font-mono bg-emerald-950 text-amber-300 px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                      {totalST} Item
                    </span>
                  }
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="border-b border-emerald-100 bg-emerald-50/60 text-slate-700 text-[10px]">
                          <tr>
                            <th className="py-2 px-3 font-bold">Ukuran &amp; Customer</th>
                            <th className="py-2 px-2 text-center font-bold">Grade</th>
                            <th className="py-2 px-2 text-right font-bold text-emerald-900">FG (T)</th>
                            <th className="py-2 px-2 text-right font-bold text-slate-600">WIP (T)</th>
                            <th className="py-2 px-3 text-right font-bold text-amber-900">Total Ton</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {paginatedST.map((item) => (
                            <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-900 block">{item.ukuran}</span>
                                <span className="text-[10px] text-slate-500 font-sans truncate block max-w-[200px]" title={item.customer}>
                                  {item.customer}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  item.grade === 'Grade C' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-amber-200 border-amber-400 text-amber-950'
                                }`}>
                                  {item.grade}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right font-semibold text-emerald-800">{item.fgTon ? formatTon(item.fgTon) : '-'}</td>
                              <td className="py-2 px-2 text-right text-slate-500">{item.wipTon ? formatTon(item.wipTon) : '-'}</td>
                              <td className="py-2 px-3 text-right font-bold text-amber-900">{formatTon(item.totalTon)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalSTPage > 1 && (
                      <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between font-mono text-xs mt-2 rounded">
                        <span className="text-slate-500 text-[11px]">Hal {stPage} dari {totalSTPage}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={stPage === 1}
                            onClick={() => setStPage((p) => Math.max(1, p - 1))}
                            className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={stPage === totalSTPage}
                            onClick={() => setStPage((p) => Math.min(totalSTPage, p + 1))}
                            className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
