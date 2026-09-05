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
import { CoilStripArea } from '../types/warehouse';
import { formatTon, formatPercent, formatQty } from '@/lib/utils';
import { Disc, Table2, Layers } from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
  { id: 'kpi-summary', width: 'col-span-4' },
  { id: 'recap-table', width: 'col-span-12' },
];

export const CoilStripView: React.FC<CoilStripViewProps> = ({
  data,
  isCustomizing = false
}) => {
  const rows = data.filter((d) => d.totalTon > 0 || d.coilTon > 0 || d.stripTon > 0);
  const isEmpty = rows.length === 0;

  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_coilstrip');
      if (saved) setCards(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_coilstrip', JSON.stringify(cards));
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

  const totalCoilQty = rows.reduce((acc, curr) => acc + curr.coilQty, 0);
  const totalCoilTon = rows.reduce((acc, curr) => acc + curr.coilTon, 0);
  const totalStripQty = rows.reduce((acc, curr) => acc + curr.stripQty, 0);
  const totalStripTon = rows.reduce((acc, curr) => acc + curr.stripTon, 0);
  const grandTotalQty = totalCoilQty + totalStripQty;
  const grandTotalTon = totalCoilTon + totalStripTon;
  const grandKapasitas = rows.reduce((acc, curr) => acc + curr.kapasitas, 0);
  const grandPersen = grandKapasitas > 0 ? (grandTotalTon / grandKapasitas) * 100 : 0;

  const chartData = {
    labels: rows.map((r) => r.gudang),
    datasets: [
      {
        label: 'Kapasitas (Ton)',
        data: rows.map((r) => r.kapasitas),
        backgroundColor: '#cbd5e1',
        hoverBackgroundColor: '#94a3b8',
        borderRadius: 2,
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
      {
        label: 'Coil (Ton)',
        data: rows.map((r) => r.coilTon),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 2,
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
      {
        label: 'Slitting Strip (Ton)',
        data: rows.map((r) => r.stripTon),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 2,
        barPercentage: 0.6,
        categoryPercentage: 0.6,
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
        max: 9000,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { family: 'monospace', size: 9 },
          color: '#94a3b8',
          stepSize: 1500,
          callback: (value: any) => (value >= 1000 ? `${value / 1000}k` : value),
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
            Stock Bahan Baku: Coil & Strip
          </h2>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {cards.map((card, index) => {
            if (card.id === 'chart-coil-capacity') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Perbandingan Stock Bahan Baku vs Kapasitas"
                  subtitle=""
                  icon={Disc}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                >
                  <div className="h-56 w-full">
                    <Bar data={chartData} options={chartOptions} />
                  </div>
                </CustomizableCard>
              );
            }

            if (card.id === 'kpi-summary') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Ringkasan Bahan Baku"
                  subtitle=""
                  icon={Layers}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < cards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                >
                  <div className="space-y-3 font-mono py-1 flex flex-col justify-between h-full">
                    <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-800 font-bold uppercase block">Coil</span>
                        <span className="text-xs text-emerald-700">{formatQty(totalCoilQty, { unit: 'Roll' })}</span>
                      </div>
                      <p className="text-base font-black text-emerald-950">{formatTon(totalCoilTon, { showUnit: true })}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-amber-900 font-bold uppercase block">Slitting Strip</span>
                        <span className="text-xs text-amber-800">{formatQty(totalStripQty, { unit: 'Roll' })}</span>
                      </div>
                      <p className="text-base font-black text-amber-950">{formatTon(totalStripTon, { showUnit: true })}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-500">Utilisasi Area:</span>
                      <strong className="text-emerald-900 font-black text-sm">{formatPercent(grandPersen)}</strong>
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
                  title="Rekapitulasi Stock Bahan Baku (Coil & Strip)"
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
                      Unit 5
                    </span>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 text-[10px] uppercase">
                          <th className="py-2.5 px-3 font-bold" rowSpan={2}>Gudang</th>
                          <th className="py-2.5 px-3 font-bold" rowSpan={2}>Area Alokasi</th>
                          <th className="py-1 text-center font-bold border-l border-r border-slate-200 bg-slate-200/70" colSpan={2}>Coil</th>
                          <th className="py-1 text-center font-bold bg-slate-200/70" colSpan={2}>Slitting Strip</th>
                          <th className="py-1 text-center font-bold border-l border-slate-200 bg-slate-200/70 text-slate-900" colSpan={2}>Total Stock</th>
                          <th className="py-2.5 px-2.5 text-right font-bold border-l border-slate-200" rowSpan={2}>Kapasitas</th>
                          <th className="py-2.5 px-3 text-right font-bold text-slate-900" rowSpan={2}>% Terisi</th>
                        </tr>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[10px]">
                          <th className="py-1 px-2.5 text-right font-bold border-l border-slate-200">Qty (Roll)</th>
                          <th className="py-1 px-2.5 text-right font-bold border-r border-slate-200">Tonase</th>
                          <th className="py-1 px-2.5 text-right font-bold">Qty (Roll)</th>
                          <th className="py-1 px-2.5 text-right font-bold">Tonase</th>
                          <th className="py-1 px-2.5 text-right font-bold border-l border-slate-200 text-slate-900">Total Qty</th>
                          <th className="py-1 px-2.5 text-right font-bold text-slate-900">Total Ton</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {rows.map((r) => (
                          <tr key={r.gudang} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 font-bold text-slate-900">{r.gudang}</td>
                            <td className="py-2 px-3 font-medium text-slate-600">{r.area}</td>
                            <td className="py-2 px-2.5 text-right text-slate-700 border-l border-slate-100">{formatQty(r.coilQty)}</td>
                            <td className="py-2 px-2.5 text-right font-semibold text-emerald-800 border-r border-slate-100">{formatTon(r.coilTon)}</td>
                            <td className="py-2 px-2.5 text-right text-slate-700">{formatQty(r.stripQty)}</td>
                            <td className="py-2 px-2.5 text-right font-semibold text-amber-900">{formatTon(r.stripTon)}</td>
                            <td className="py-2 px-2.5 text-right font-bold text-slate-900 border-l border-slate-100">{formatQty(r.totalQty)}</td>
                            <td className="py-2 px-2.5 text-right font-bold text-slate-900">{formatTon(r.totalTon)}</td>
                            <td className="py-2 px-2.5 text-right text-slate-500 border-l border-slate-100">{formatTon(r.kapasitas)}</td>
                            <td className="py-2 px-3 text-right font-bold text-amber-800">{formatPercent(r.persenTerisi)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                        <tr>
                          <td className="py-2.5 px-3 uppercase text-slate-900" colSpan={2}>TOTAL</td>
                          <td className="py-2.5 px-2.5 text-right text-emerald-900 border-l border-slate-200">{formatQty(totalCoilQty)}</td>
                          <td className="py-2.5 px-2.5 text-right text-emerald-900 border-r border-slate-200">{formatTon(totalCoilTon)}</td>
                          <td className="py-2.5 px-2.5 text-right text-amber-950">{formatQty(totalStripQty)}</td>
                          <td className="py-2.5 px-2.5 text-right text-amber-950">{formatTon(totalStripTon)}</td>
                          <td className="py-2.5 px-2.5 text-right border-l border-slate-200 text-slate-950">{formatQty(grandTotalQty)}</td>
                          <td className="py-2.5 px-2.5 text-right text-slate-950">{formatTon(grandTotalTon)}</td>
                          <td className="py-2.5 px-2.5 text-right border-l border-slate-200">{formatTon(grandKapasitas)}</td>
                          <td className="py-2.5 px-3 text-right text-amber-950">{formatPercent(grandPersen)}</td>
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
      )}
    </div>
  );
};
