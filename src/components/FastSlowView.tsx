'use client';

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { FastSlowPipe } from '../types/warehouse';
import { formatTon, formatPercent } from '@/lib/utils';
import { Clock, Layers, PieChart, Table2, ListOrdered } from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface FastSlowViewProps {
  data: FastSlowPipe[];
  isCustomizing?: boolean;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'bar-chart', width: 'col-span-7' },
  { id: 'pie-chart', width: 'col-span-5' },
  { id: 'table-summary', width: 'col-span-7' },
  { id: 'table-detail', width: 'col-span-5' },
];

export const FastSlowView: React.FC<FastSlowViewProps> = ({
  data,
  isCustomizing = false
}) => {
  const safeData = data.length > 0 ? data : [];

  // Card order & size state with localStorage persistence
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_fastslow');
      if (saved) setCards(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_fastslow', JSON.stringify(cards));
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

  const totalFast = safeData.reduce((acc, curr) => acc + curr.fastTon, 0);
  const totalSlow = safeData.reduce((acc, curr) => acc + curr.slowTon, 0);
  const grandTotal = totalFast + totalSlow;

  const overallFastPct = grandTotal > 0 ? (totalFast / grandTotal) * 100 : 0;
  const overallSlowPct = grandTotal > 0 ? (totalSlow / grandTotal) * 100 : 0;

  // Chart.js Configurations
  const barChartData = {
    labels: safeData.map((d) => d.gudang),
    datasets: [
      {
        label: 'Fast Moving',
        data: safeData.map((d) => d.fastTon),
        backgroundColor: '#047857',
        hoverBackgroundColor: '#065f46',
        borderRadius: 3,
      },
      {
        label: 'Slow Moving',
        data: safeData.map((d) => d.slowTon),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 3,
      },
    ],
  };

  const barChartOptions = {
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
        displayColors: true,
        callbacks: {
          label: function (context: any) {
            const val = context.raw || 0;
            return ` ${context.dataset.label}: ${val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Ton`;
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
        ticks: { font: { family: 'monospace', size: 9 }, color: '#64748b', stepSize: 100 },
        border: { dash: [4, 4], color: '#cbd5e1' },
      },
    },
  };

  const doughnutData = {
    labels: ['Fast Moving', 'Slow Moving'],
    datasets: [
      {
        data: [Number(totalFast.toFixed(1)), Number(totalSlow.toFixed(1))],
        backgroundColor: ['#047857', '#d97706'],
        hoverBackgroundColor: ['#065f46', '#b45309'],
        borderWidth: 2,
        borderColor: '#ffffff',
        cutout: '74%',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
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
            const pct = grandTotal > 0 ? (val / grandTotal) * 100 : 0;
            return `${context.label}: ${val.toLocaleString('id-ID', { minimumFractionDigits: 1 })} T (${pct.toFixed(1)}%)`;
          },
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
            Stock Pipa Fast Moving vs Slow Moving
          </h2>
        </div>
      </div>

      {/* CUSTOMIZABLE CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {cards.map((card, index) => {
          if (card.id === 'bar-chart') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Distribusi Fast vs Slow Moving Per Gudang"
                icon={Clock}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
              >
                <div className="h-64 w-full">
                  <Bar data={barChartData} options={barChartOptions} />
                </div>
              </CustomizableCard>
            );
          }

          if (card.id === 'pie-chart') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Komposisi Total Stock Pipa (Fast vs Slow)"
                icon={PieChart}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
              >
                <div className="flex flex-col sm:flex-row items-center justify-around py-1 gap-4">
                  <div className="relative h-48 w-56 flex items-center justify-center shrink-0">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                    <div className="absolute flex flex-col items-center pointer-events-none">
                      <span className="text-xl font-bold font-mono text-slate-900">{overallFastPct.toFixed(0)}%</span>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono">Fast</span>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono w-full sm:w-auto">
                    <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-xs bg-emerald-700 shrink-0" />
                        <div>
                          <div className="text-[10px] font-bold uppercase text-slate-500">Fast Moving</div>
                          <div className="text-xs font-bold text-slate-900">{formatTon(totalFast, { showUnit: true })}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                        {formatPercent(overallFastPct)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-xs bg-amber-600 shrink-0" />
                        <div>
                          <div className="text-[10px] font-bold uppercase text-slate-500">Slow Moving</div>
                          <div className="text-xs font-bold text-slate-900">{formatTon(totalSlow, { showUnit: true })}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                        {formatPercent(overallSlowPct)}
                      </span>
                    </div>
                  </div>
                </div>
              </CustomizableCard>
            );
          }

          if (card.id === 'table-summary') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Rekapitulasi Fast & Slow Moving Per Gudang"
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
                    {safeData.length} Gudang
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 text-[10px] uppercase">
                        <th className="py-2.5 px-3 font-bold" rowSpan={2}>Gudang</th>
                        <th className="py-1 text-center font-bold border-l border-r border-slate-200 bg-slate-200/70" colSpan={2}>Fast Moving</th>
                        <th className="py-1 text-center font-bold bg-slate-200/70" colSpan={2}>Slow Moving</th>
                        <th className="py-2.5 px-3 text-right font-bold border-l border-slate-200 text-slate-900" rowSpan={2}>Total (Ton)</th>
                      </tr>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[10px]">
                        <th className="py-1 px-2.5 text-right font-bold border-l border-slate-200">Tonase</th>
                        <th className="py-1 px-2.5 text-right font-bold border-r border-slate-200">% Fast</th>
                        <th className="py-1 px-2.5 text-right font-bold">Tonase</th>
                        <th className="py-1 px-2.5 text-right font-bold">% Slow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {safeData.map((item) => {
                        const isHighSlow = item.slowPersen > 15;
                        return (
                          <tr key={item.gudang} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                              {item.gudang}
                              {isHighSlow && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Slow moving > 15%"></span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-right font-semibold text-emerald-800 border-l border-slate-100">
                              {formatTon(item.fastTon)}
                            </td>
                            <td className="py-2 px-2.5 text-right text-emerald-900 font-bold border-r border-slate-100">
                              {formatPercent(item.fastPersen)}
                            </td>
                            <td className={`py-2 px-2.5 text-right font-semibold ${item.slowTon > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
                              {formatTon(item.slowTon)}
                            </td>
                            <td className={`py-2 px-2.5 text-right font-bold ${isHighSlow ? 'text-amber-700' : 'text-slate-600'}`}>
                              {formatPercent(item.slowPersen)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 border-l border-slate-100">
                              {formatTon(item.totalTon)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                      <tr>
                        <td className="py-2.5 px-3 uppercase text-slate-900">TOTAL</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-900 border-l border-slate-200">{formatTon(totalFast)}</td>
                        <td className="py-2.5 px-2.5 text-right text-emerald-900 border-r border-slate-200">{formatPercent(overallFastPct)}</td>
                        <td className="py-2.5 px-2.5 text-right text-amber-900">{formatTon(totalSlow)}</td>
                        <td className="py-2.5 px-2.5 text-right text-amber-900">{formatPercent(overallSlowPct)}</td>
                        <td className="py-2.5 px-3 text-right border-l border-slate-200 text-slate-950">{formatTon(grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CustomizableCard>
            );
          }

          if (card.id === 'table-detail') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Rincian Slow Moving: FG vs WIP"
                icon={ListOrdered}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  <span className="text-[10px] font-mono font-bold text-amber-900 border border-amber-300 bg-amber-50 px-2 py-0.5 rounded">
                    PASM SLOW
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] border-b border-slate-200 uppercase">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Gudang</th>
                        <th className="py-2.5 px-2 text-right font-bold text-emerald-800">FG LT</th>
                        <th className="py-2.5 px-2 text-right font-bold text-emerald-800">FG ST</th>
                        <th className="py-2.5 px-2 text-right font-bold text-amber-800">WIP LT</th>
                        <th className="py-2.5 px-2 text-right font-bold text-amber-800">WIP ST</th>
                        <th className="py-2.5 px-3 text-right font-bold text-slate-900">Total Slow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {safeData.map((r) => {
                        const rowSlowTotal = (r.fgLtSlow || 0) + (r.fgStSlow || 0) + (r.wipLtSlow || 0) + (r.wipStSlow || 0);
                        return (
                          <tr key={`slow-detail-${r.gudang}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-900">{r.gudang}</td>
                            <td className="py-2 px-2 text-right">{r.fgLtSlow ? r.fgLtSlow.toFixed(2) : '-'}</td>
                            <td className="py-2 px-2 text-right">{r.fgStSlow ? r.fgStSlow.toFixed(2) : '-'}</td>
                            <td className="py-2 px-2 text-right">{r.wipLtSlow ? r.wipLtSlow.toFixed(2) : '-'}</td>
                            <td className="py-2 px-2 text-right">{r.wipStSlow ? r.wipStSlow.toFixed(2) : '-'}</td>
                            <td className="py-2 px-3 text-right font-bold text-amber-900">
                              {rowSlowTotal > 0 ? rowSlowTotal.toFixed(2) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                      <tr>
                        <td className="py-2.5 px-3">TOTAL</td>
                        <td className="py-2.5 px-2 text-right text-emerald-900">
                          {safeData.reduce((acc, c) => acc + (c.fgLtSlow || 0), 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-emerald-900">
                          {safeData.reduce((acc, c) => acc + (c.fgStSlow || 0), 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-amber-900">
                          {safeData.reduce((acc, c) => acc + (c.wipLtSlow || 0), 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-amber-900">
                          {safeData.reduce((acc, c) => acc + (c.wipStSlow || 0), 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-950 font-bold">
                          {totalSlow.toFixed(2)}
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
