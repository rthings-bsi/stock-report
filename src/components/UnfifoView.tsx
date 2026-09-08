'use client';

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { UnfifoCoilItem, UnfifoPipeItem } from '../types/warehouse';
import { Layers, Disc, ChevronLeft, ChevronRight, Table2, Info, Pencil, Plus, Check, Trash2, X, AlertTriangle, FileText, CheckCircle2, MessageSquarePlus } from 'lucide-react';
import { formatTon, formatQty } from '@/lib/utils';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface UnfifoViewProps {
  coilData?: UnfifoCoilItem[];
  pipeData?: UnfifoPipeItem[];
  isCustomizing?: boolean;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_PIPE_CARDS: CardState[] = [
  { id: 'chart-pipe-unfifo', width: 'col-span-8' },
  { id: 'summary-pipe-unfifo', width: 'col-span-4' },
  { id: 'table-pipe-unfifo', width: 'col-span-12' },
];

const DEFAULT_COIL_CARDS: CardState[] = [
  { id: 'chart-coil-unfifo', width: 'col-span-8' },
  { id: 'summary-coil-unfifo', width: 'col-span-4' },
  { id: 'table-coil-unfifo', width: 'col-span-12' },
];

export const UnfifoView: React.FC<UnfifoViewProps> = ({
  coilData = [],
  pipeData = [],
  isCustomizing = false
}) => {
  const [activeTab, setActiveTab] = useState<'pipe' | 'coil'>('pipe');
  const [selectedPipeGudang, setSelectedPipeGudang] = useState<string>('ALL');
  const [selectedCoilGudang, setSelectedCoilGudang] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentCoilPage, setCurrentCoilPage] = useState<number>(1);
  const pageSize = 15;

  const [pipeCards, setPipeCards] = useState<CardState[]>(DEFAULT_PIPE_CARDS);
  const [coilCards, setCoilCards] = useState<CardState[]>(DEFAULT_COIL_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  // Issue Keys & State Management
  const getPipeKey = (item: UnfifoPipeItem) => `${item.gudang}#${item.kodeMaterial}#${item.batch}#${item.ukuran}`;
  const getCoilKey = (item: UnfifoCoilItem) => `${item.gudang}#${item.kodeMaterial}#${item.batch}#${item.specification}`;

  const [pipeIssues, setPipeIssues] = useState<Record<string, string>>({});
  const [coilIssues, setCoilIssues] = useState<Record<string, string>>({});

  const [pipeIssueFilter, setPipeIssueFilter] = useState<'ALL' | 'WITH_ISSUE' | 'NO_ISSUE'>('ALL');
  const [coilIssueFilter, setCoilIssueFilter] = useState<'ALL' | 'WITH_ISSUE' | 'NO_ISSUE'>('ALL');

  const [activeEditModal, setActiveEditModal] = useState<{
    type: 'pipe' | 'coil';
    key: string;
    gudang: string;
    material: string;
    spec: string;
    customer?: string;
    batch: string;
    tonase: number;
    qty: number;
    unit: string;
    incDate: string;
  } | null>(null);

  const [tempIssueText, setTempIssueText] = useState<string>('');

  useEffect(() => {
    try {
      const savedP = localStorage.getItem('spindo_unfifo_pipe_issues');
      if (savedP) setPipeIssues(JSON.parse(savedP));
      const savedC = localStorage.getItem('spindo_unfifo_coil_issues');
      if (savedC) setCoilIssues(JSON.parse(savedC));
    } catch {}
  }, []);

  const handleSaveIssue = (type: 'pipe' | 'coil', key: string, text: string) => {
    if (type === 'pipe') {
      setPipeIssues((prev) => {
        const updated = { ...prev };
        if (text.trim()) {
          updated[key] = text.trim();
        } else {
          delete updated[key];
        }
        try {
          localStorage.setItem('spindo_unfifo_pipe_issues', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } else {
      setCoilIssues((prev) => {
        const updated = { ...prev };
        if (text.trim()) {
          updated[key] = text.trim();
        } else {
          delete updated[key];
        }
        try {
          localStorage.setItem('spindo_unfifo_coil_issues', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
    setActiveEditModal(null);
    setTempIssueText('');
  };

  const openPipeEdit = (item: UnfifoPipeItem) => {
    const key = getPipeKey(item);
    setActiveEditModal({
      type: 'pipe',
      key,
      gudang: item.gudang,
      material: item.kodeMaterial,
      spec: item.ukuran,
      customer: item.customer,
      batch: item.batch,
      tonase: item.tonase,
      qty: item.qtyBtg,
      unit: 'Btg',
      incDate: item.incDate
    });
    setTempIssueText(pipeIssues[key] || '');
  };

  const openCoilEdit = (item: UnfifoCoilItem) => {
    const key = getCoilKey(item);
    setActiveEditModal({
      type: 'coil',
      key,
      gudang: item.gudang,
      material: item.kodeMaterial,
      spec: item.specification,
      customer: item.manufaktur,
      batch: item.batch,
      tonase: item.tonase,
      qty: item.qtyRoll,
      unit: 'Roll',
      incDate: item.incDate
    });
    setTempIssueText(coilIssues[key] || '');
  };

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedPipe = localStorage.getItem('spindo_layout_unfifo_pipe');
      if (savedPipe) setPipeCards(JSON.parse(savedPipe));
      const savedCoil = localStorage.getItem('spindo_layout_unfifo_coil');
      if (savedCoil) setCoilCards(JSON.parse(savedCoil));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_unfifo_pipe', JSON.stringify(pipeCards));
      localStorage.setItem('spindo_layout_unfifo_coil', JSON.stringify(coilCards));
    } catch {}
  }, [pipeCards, coilCards, isMounted]);

  const handleWidthChange = (id: string, newWidth: CardWidth) => {
    if (activeTab === 'pipe') {
      setPipeCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, width: newWidth } : c))
      );
    } else {
      setCoilCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, width: newWidth } : c))
      );
    }
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    if (activeTab === 'pipe') {
      const targetIdx = direction === 'left' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= pipeCards.length) return;
      const newCards = [...pipeCards];
      const [moved] = newCards.splice(index, 1);
      newCards.splice(targetIdx, 0, moved);
      setPipeCards(newCards);
    } else {
      const targetIdx = direction === 'left' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= coilCards.length) return;
      const newCards = [...coilCards];
      const [moved] = newCards.splice(index, 1);
      newCards.splice(targetIdx, 0, moved);
      setCoilCards(newCards);
    }
  };

  const availablePipeGudangs = ['ALL', ...Array.from(new Set(pipeData.map((d) => d.gudang))).sort()];
  const availableCoilGudangs = ['ALL', ...Array.from(new Set(coilData.map((d) => d.gudang))).sort()];
  
  const sortedPipeData = [...pipeData].sort((a, b) => b.tonase - a.tonase || b.qtyBtg - a.qtyBtg);
  const sortedCoilData = [...coilData].sort((a, b) => b.tonase - a.tonase || b.qtyRoll - a.qtyRoll);

  const gudangFilteredPipeData = selectedPipeGudang === 'ALL'
    ? sortedPipeData
    : sortedPipeData.filter((d) => d.gudang === selectedPipeGudang);

  const pipeWithIssueCount = gudangFilteredPipeData.filter((d) => Boolean(pipeIssues[getPipeKey(d)])).length;
  const pipeNoIssueCount = gudangFilteredPipeData.length - pipeWithIssueCount;

  const filteredPipeData = React.useMemo(() => {
    if (pipeIssueFilter === 'WITH_ISSUE') {
      return gudangFilteredPipeData.filter((d) => Boolean(pipeIssues[getPipeKey(d)]));
    }
    if (pipeIssueFilter === 'NO_ISSUE') {
      return gudangFilteredPipeData.filter((d) => !pipeIssues[getPipeKey(d)]);
    }
    return gudangFilteredPipeData;
  }, [gudangFilteredPipeData, pipeIssueFilter, pipeIssues]);

  const gudangFilteredCoilData = selectedCoilGudang === 'ALL'
    ? sortedCoilData
    : sortedCoilData.filter((d) => d.gudang === selectedCoilGudang);

  const coilWithIssueCount = gudangFilteredCoilData.filter((d) => Boolean(coilIssues[getCoilKey(d)])).length;
  const coilNoIssueCount = gudangFilteredCoilData.length - coilWithIssueCount;

  const filteredCoilData = React.useMemo(() => {
    if (coilIssueFilter === 'WITH_ISSUE') {
      return gudangFilteredCoilData.filter((d) => Boolean(coilIssues[getCoilKey(d)]));
    }
    if (coilIssueFilter === 'NO_ISSUE') {
      return gudangFilteredCoilData.filter((d) => !coilIssues[getCoilKey(d)]);
    }
    return gudangFilteredCoilData;
  }, [gudangFilteredCoilData, coilIssueFilter, coilIssues]);

  const totalPages = Math.ceil(filteredPipeData.length / pageSize) || 1;
  const paginatedPipeData = filteredPipeData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalCoilPages = Math.ceil(filteredCoilData.length / pageSize) || 1;
  const paginatedCoilData = filteredCoilData.slice(
    (currentCoilPage - 1) * pageSize,
    currentCoilPage * pageSize
  );

  const handleGudangChange = (g: string) => {
    setSelectedPipeGudang(g);
    setCurrentPage(1);
  };

  const handleCoilGudangChange = (g: string) => {
    setSelectedCoilGudang(g);
    setCurrentCoilPage(1);
  };

  const totalCoilUnfifoTon = filteredCoilData.reduce((sum, d) => sum + d.tonase, 0);
  const totalCoilUnfifoQty = filteredCoilData.reduce((sum, d) => sum + d.qtyRoll, 0);

  const totalPipeUnfifoTon = filteredPipeData.reduce((sum, d) => sum + d.tonase, 0);
  const totalPipeUnfifoQty = filteredPipeData.reduce((sum, d) => sum + d.qtyBtg, 0);

  // 1. Agregasi Tonase Pipa UNFIFO per Gudang
  const pipeUnfifoGudangSummary = React.useMemo(() => {
    const summaryMap: Record<string, { gudang: string; totalTon: number; totalQty: number }> = {};
    pipeData.forEach((item) => {
      const g = item.gudang || 'Gd.01';
      if (!summaryMap[g]) {
        summaryMap[g] = { gudang: g, totalTon: 0, totalQty: 0 };
      }
      summaryMap[g].totalTon += item.tonase;
      summaryMap[g].totalQty += item.qtyBtg;
    });
    return Object.values(summaryMap).sort((a, b) => b.totalTon - a.totalTon);
  }, [pipeData]);

  // 2. Agregasi Tonase Coil & Strip UNFIFO per Gudang (Dipisah Coil Induk vs Slitting Strip)
  const coilUnfifoGudangSummary = React.useMemo(() => {
    const summaryMap: Record<
      string,
      { gudang: string; totalTon: number; totalQty: number; coilTon: number; coilQty: number; stripTon: number; stripQty: number }
    > = {};

    coilData.forEach((item) => {
      const g = item.gudang || 'Gd.07';
      if (!summaryMap[g]) {
        summaryMap[g] = { gudang: g, totalTon: 0, totalQty: 0, coilTon: 0, coilQty: 0, stripTon: 0, stripQty: 0 };
      }
      const desc = `${item.kodeMaterial} ${item.specification}`.toUpperCase();
      const isStrip = desc.includes('STRIP') || desc.includes('SLIT');

      summaryMap[g].totalTon += item.tonase;
      summaryMap[g].totalQty += item.qtyRoll;
      if (isStrip) {
        summaryMap[g].stripTon += item.tonase;
        summaryMap[g].stripQty += item.qtyRoll;
      } else {
        summaryMap[g].coilTon += item.tonase;
        summaryMap[g].coilQty += item.qtyRoll;
      }
    });
    return Object.values(summaryMap).sort((a, b) => b.totalTon - a.totalTon);
  }, [coilData]);

  const pipeBarChartData = {
    labels: pipeUnfifoGudangSummary.map((d) => d.gudang),
    datasets: [
      {
        label: 'Tonase Pipa UNFIFO (Ton)',
        data: pipeUnfifoGudangSummary.map((d) => Number(d.totalTon.toFixed(2))),
        backgroundColor: pipeUnfifoGudangSummary.map((d) =>
          selectedPipeGudang === d.gudang ? '#065f46' : '#d97706'
        ),
        hoverBackgroundColor: pipeUnfifoGudangSummary.map((d) =>
          selectedPipeGudang === d.gudang ? '#047857' : '#b45309'
        ),
        borderRadius: 2,
        barPercentage: 0.6,
      },
    ],
  };

  const pipeBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: any, elements: any[]) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const clickedGudang = pipeUnfifoGudangSummary[index]?.gudang;
        if (clickedGudang) {
          handleGudangChange(selectedPipeGudang === clickedGudang ? 'ALL' : clickedGudang);
        }
      }
    },
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
            return ` Tonase: ${val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Ton (Klik untuk filter)`;
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
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'monospace', size: 9 }, color: '#94a3b8', stepSize: 15 },
      },
    },
  };

  const coilBarChartData = {
    labels: coilUnfifoGudangSummary.map((d) => d.gudang),
    datasets: [
      {
        label: 'Coil (Ton)',
        data: coilUnfifoGudangSummary.map((d) => Number(d.coilTon.toFixed(2))),
        backgroundColor: '#047857',
        hoverBackgroundColor: '#065f46',
        borderRadius: 3,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
      {
        label: 'Strip (Ton)',
        data: coilUnfifoGudangSummary.map((d) => Number(d.stripTon.toFixed(2))),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 3,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  const coilBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: any, elements: any[]) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const clickedGudang = coilUnfifoGudangSummary[index]?.gudang;
        if (clickedGudang) {
          handleCoilGudangChange(selectedCoilGudang === clickedGudang ? 'ALL' : clickedGudang);
        }
      }
    },
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
          label: function (context: any) {
            const val = context.raw || 0;
            const idx = context.dataIndex;
            const item = coilUnfifoGudangSummary[idx];
            const rolls = context.datasetIndex === 0 ? item?.coilQty : item?.stripQty;
            return ` ${context.dataset.label}: ${val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Ton (${rolls || 0} Roll)`;
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

  const ISSUE_PRESETS = [
    'Akses Tertutup Tumpukan Bundle Lain',
    'Order Cancel / Reschedule Pengiriman Customer',
    'Posisi Rak Paling Dalam / Butuh Manuver Crane',
    'Menunggu Kelengkapan Surat Jalan & Armada',
    'Hold Mutu / Rekomendasi QC',
    'Kesalahan Penataan Lokasi Penyimpanan',
    'Spesifikasi Khusus / Target Order Tertentu'
  ];

  const renderEditIssueModal = () => {
    if (!activeEditModal) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={() => setActiveEditModal(null)}
      >
        <div
          className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-sans text-slate-800 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-2xs shrink-0">
                <FileText className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Catatan Issue / Penyebab UNFIFO
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {activeEditModal.type === 'pipe' ? 'Produk Pipa' : 'Bahan Baku Coil & Strip'} • {activeEditModal.gudang}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveEditModal(null)}
              className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Item Details Info */}
          <div className="p-4 bg-slate-100/70 border-b border-slate-200/80 grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Material &amp; Dimensi:</span>
              <strong className="text-slate-900 block truncate">{activeEditModal.spec}</strong>
              <span className="text-[10px] text-slate-600 font-mono">{activeEditModal.material}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Batch &amp; Tonase:</span>
              <strong className="text-amber-950 font-bold block">Batch: {activeEditModal.batch}</strong>
              <span className="text-[11px] text-emerald-900 font-bold">
                {formatTon(activeEditModal.tonase, { decimals: 2, showUnit: true })} ({activeEditModal.qty} {activeEditModal.unit})
              </span>
            </div>
            {activeEditModal.customer && (
              <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Customer / Manufaktur:</span>
                <strong className="text-slate-800 truncate max-w-[240px]">{activeEditModal.customer}</strong>
              </div>
            )}
          </div>

          {/* Body: Form */}
          <div className="p-4 space-y-3 font-sans">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Pilih Alasan Cepat (Preset):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ISSUE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTempIssueText((prev) => (prev ? `${prev} • ${preset}` : preset));
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-950 hover:border-emerald-300 border border-slate-200 text-[11px] font-mono text-slate-700 transition-colors cursor-pointer text-left"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ketik Penjelasan / Detail Issue Manual:
              </label>
              <textarea
                autoFocus
                rows={3}
                value={tempIssueText}
                onChange={(e) => setTempIssueText(e.target.value)}
                placeholder="Contoh: Akses crane terhalang tumpukan rak 2, order delivery mundur ke tgl 20..."
                className="w-full p-2.5 text-xs font-mono rounded-lg border border-slate-300 bg-white shadow-2xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between font-mono text-xs">
            <div>
              {(activeEditModal.type === 'pipe' ? pipeIssues[activeEditModal.key] : coilIssues[activeEditModal.key]) && (
                <button
                  type="button"
                  onClick={() => handleSaveIssue(activeEditModal.type, activeEditModal.key, '')}
                  className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900 font-bold hover:underline cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus Catatan</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveEditModal(null)}
                className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveIssue(activeEditModal.type, activeEditModal.key, tempIssueText)}
                className="px-4 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Simpan Catatan</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* SECTION BANNER TOP */}
      <div className="rounded-md border border-black/20 theme-banner text-white p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Deviasi Alur Pengeluaran (UNFIFO)
          </h2>
        </div>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md border border-amber-300 bg-amber-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-xs font-bold uppercase tracking-wider">Produk Pipa UNFIFO</span>
            <Layers className="h-4 w-4 text-amber-700" />
          </div>
          <p className="mt-1 text-2xl font-black font-mono text-amber-950">
            {formatTon(totalPipeUnfifoTon, { showUnit: true, decimals: 2 })}
          </p>
          <div className="mt-2 text-xs text-amber-800 font-mono font-medium">
            {formatQty(totalPipeUnfifoQty, { unit: 'Btg' })} ({filteredPipeData.length} item) perlu prioritas delivery
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-xs font-bold uppercase tracking-wider">Bahan Baku Coil &amp; Strip UNFIFO</span>
            <Disc className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-1 text-2xl font-black font-mono text-slate-900">
            {formatTon(totalCoilUnfifoTon, { showUnit: true, decimals: 2 })}
          </p>
          <div className="mt-2 text-xs text-slate-500 font-mono font-medium">
            {formatQty(totalCoilUnfifoQty, { unit: 'Roll' })} ({filteredCoilData.length} item) berstatus UNFIFO / SLOW
          </div>
        </div>
      </div>

      {/* 2 TAB NAVIGATION FOR TABLES */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 font-mono">
        <button
          onClick={() => setActiveTab('pipe')}
          className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'pipe'
              ? 'bg-emerald-800 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Data Pipa UNFIFO ({pipeData.length})
        </button>
        <button
          onClick={() => setActiveTab('coil')}
          className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'coil'
              ? 'bg-emerald-800 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Data Coil &amp; Strip UNFIFO ({coilData.length})
        </button>
      </div>

      {/* TAB 1: PIPA UNFIFO CARDS */}
      {activeTab === 'pipe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {pipeCards.map((card, index) => {
            if (card.id === 'chart-pipe-unfifo' && pipeData.length > 0) {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Perbandingan Tonase Pipa UNFIFO Antar Gudang (Ton)"
                  subtitle={selectedPipeGudang === 'ALL' ? '' : `Filter aktif: ${selectedPipeGudang}`}
                  icon={Layers}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < pipeCards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                >
                  <div className="h-56 w-full">
                    <Bar data={pipeBarChartData} options={pipeBarChartOptions} />
                  </div>
                </CustomizableCard>
              );
            }

            if (card.id === 'summary-pipe-unfifo') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Ringkasan Alokasi Pipa UNFIFO"
                  subtitle={selectedPipeGudang === 'ALL' ? '' : `Filter aktif: ${selectedPipeGudang}`}
                  icon={Info}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < pipeCards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                >
                  <div className="flex flex-col justify-between h-full py-1">
                    <div className="grid grid-cols-2 gap-2.5 font-mono">
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 font-bold uppercase block">Total Batang</span>
                        <p className="text-lg font-black text-emerald-950 mt-0.5">{formatQty(totalPipeUnfifoQty, { unit: 'Btg' })}</p>
                        <span className="text-[10px] text-emerald-700">Prioritas pengeluaran</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="text-[10px] text-amber-900 font-bold uppercase block">Total Tonase</span>
                        <p className="text-lg font-black text-amber-950 mt-0.5">{formatTon(totalPipeUnfifoTon, { showUnit: true })}</p>
                        <span className="text-[10px] text-amber-800">Tonase tertahan</span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-600 border-t border-slate-100 pt-2 space-y-1.5 mt-2">
                      <div className="flex items-center justify-between">
                        <span>Lokasi Gudang:</span>
                        <strong className="text-slate-900">
                          {selectedPipeGudang === 'ALL' ? `${availablePipeGudangs.length - 1} Gudang Terdata` : selectedPipeGudang}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Alokasi Customer:</span>
                        <strong className="text-slate-900">
                          {Array.from(new Set(filteredPipeData.map((d) => d.customer))).length} Customer
                        </strong>
                      </div>
                    </div>
                  </div>
                </CustomizableCard>
              );
            }

            if (card.id === 'table-pipe-unfifo') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Daftar Produk Pipa Berstatus UNFIFO"
                  icon={Table2}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < pipeCards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  headerAction={
                    <div className="flex items-center gap-2.5 font-mono text-xs flex-wrap">
                      <div className="inline-flex p-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px]">
                        <button
                          type="button"
                          onClick={() => { setPipeIssueFilter('ALL'); setCurrentPage(1); }}
                          className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            pipeIssueFilter === 'ALL'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Semua ({gudangFilteredPipeData.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPipeIssueFilter('WITH_ISSUE'); setCurrentPage(1); }}
                          className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            pipeIssueFilter === 'WITH_ISSUE'
                              ? 'bg-amber-500 text-slate-950 shadow-2xs'
                              : 'text-amber-800 hover:bg-amber-100/50'
                          }`}
                        >
                          Ada Issue ({pipeWithIssueCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPipeIssueFilter('NO_ISSUE'); setCurrentPage(1); }}
                          className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            pipeIssueFilter === 'NO_ISSUE'
                              ? 'bg-slate-700 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Belum Ada ({pipeNoIssueCount})
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold text-[10px]">Gudang:</span>
                        <select
                          value={selectedPipeGudang}
                          onChange={(e) => handleGudangChange(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-hidden cursor-pointer"
                        >
                          {availablePipeGudangs.map((g) => {
                            const count = g === 'ALL'
                              ? pipeData.length
                              : pipeData.filter((d) => d.gudang === g).length;
                            return (
                              <option key={g} value={g}>
                                {g === 'ALL' ? `Semua (${count})` : `${g} (${count})`}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  }
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
                        <thead className="border-b border-emerald-100 bg-emerald-50/50 text-slate-700">
                          <tr>
                            <th className="py-2.5 px-3 font-bold">Gudang</th>
                            <th className="py-2.5 px-3 font-bold">Kode Material</th>
                            <th className="py-2.5 px-3 font-bold">Ukuran (D x T x P)</th>
                            <th className="py-2.5 px-3 font-bold">Customer</th>
                            <th className="py-2.5 px-3 font-bold text-amber-900">Batch</th>
                            <th className="py-2.5 px-3 font-bold text-slate-600">Tgl Masuk</th>
                            <th className="py-2.5 px-3 text-right font-bold text-slate-900">Qty (Btg)</th>
                            <th className="py-2.5 px-3.5 text-right font-bold text-amber-900">Tonase (Ton)</th>
                            <th className="py-2.5 px-3 font-bold text-slate-900">Penyebab / Issue UNFIFO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {paginatedPipeData.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400 font-sans text-xs">
                                Tidak ada produk Pipa berstatus UNFIFO untuk filter ini.
                              </td>
                            </tr>
                          ) : (
                            paginatedPipeData.map((row, idx) => {
                              const itemKey = getPipeKey(row);
                              const issueText = pipeIssues[itemKey];
                              return (
                                <tr key={`pipe-unf-${idx}`} className="hover:bg-emerald-50/30 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{row.gudang}</td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap text-[11px]">{row.kodeMaterial}</td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{row.ukuran}</td>
                                  <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate" title={row.customer}>{row.customer}</td>
                                  <td className="py-2.5 px-3 font-bold text-amber-900 bg-amber-50/40 whitespace-nowrap">{row.batch}</td>
                                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{row.incDate}</td>
                                  <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">{formatQty(row.qtyBtg)}</td>
                                  <td className="py-2.5 px-3.5 text-right font-bold text-amber-900">{formatTon(row.tonase, { decimals: 2 })}</td>
                                  <td className="py-2 px-3 min-w-[200px] max-w-[320px]">
                                    {issueText ? (
                                      <div
                                        onClick={() => openPipeEdit(row)}
                                        className="group flex items-center justify-between gap-1.5 p-1.5 rounded bg-amber-50/90 border border-amber-200/80 hover:border-amber-400 hover:bg-amber-100/70 cursor-pointer transition-all shadow-2xs"
                                        title="Klik untuk mengubah catatan issue"
                                      >
                                        <span className="text-amber-950 font-bold text-[11px] leading-tight break-words">
                                          {issueText}
                                        </span>
                                        <Pencil className="h-3 w-3 text-amber-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openPipeEdit(row)}
                                        className="text-[10px] font-bold text-slate-500 hover:text-emerald-900 hover:bg-emerald-50 border border-dashed border-slate-300 hover:border-emerald-400 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                        <span>Ketik Issue</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {filteredPipeData.length > 0 && (
                          <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                            <tr>
                              <td className="py-2.5 px-3" colSpan={6}>TOTAL PIPA UNFIFO ({selectedPipeGudang})</td>
                              <td className="py-2.5 px-3 text-right">{formatQty(totalPipeUnfifoQty)}</td>
                              <td className="py-2.5 px-3.5 text-right text-amber-950 font-bold">{formatTon(totalPipeUnfifoTon, { decimals: 2 })}</td>
                              <td className="py-2.5 px-3 text-[10px] text-slate-500 font-normal">
                                {pipeWithIssueCount} dari {gudangFilteredPipeData.length} item tercatat issue
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between font-mono text-xs mt-2 rounded">
                        <div className="text-slate-500 text-[11px]">
                          Hal <strong className="text-slate-800">{currentPage}</strong> / <strong className="text-slate-800">{totalPages}</strong> ({filteredPipeData.length} item)
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* TAB 2: COIL & STRIP UNFIFO CARDS */}
      {activeTab === 'coil' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {coilCards.map((card, index) => {
            if (card.id === 'chart-coil-unfifo' && coilData.length > 0) {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Perbandingan Tonase Coil vs Strip UNFIFO (Ton)"
                  subtitle={selectedCoilGudang === 'ALL' ? '' : `Filter aktif: ${selectedCoilGudang}`}
                  icon={Disc}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < coilCards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                >
                  <div className="h-56 w-full">
                    <Bar data={coilBarChartData} options={coilBarChartOptions} />
                  </div>
                </CustomizableCard>
              );
            }

            if (card.id === 'summary-coil-unfifo') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Ringkasan Alokasi Coil & Strip UNFIFO"
                  subtitle={selectedCoilGudang === 'ALL' ? '' : `Filter aktif: ${selectedCoilGudang}`}
                  icon={Info}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < coilCards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                >
                  <div className="flex flex-col justify-between h-full py-1">
                    <div className="grid grid-cols-2 gap-2.5 font-mono">
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 font-bold uppercase block">Total Roll</span>
                        <p className="text-lg font-black text-emerald-950 mt-0.5">{formatQty(totalCoilUnfifoQty, { unit: 'Roll' })}</p>
                        <span className="text-[10px] text-emerald-700">Area Bahan Baku</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="text-[10px] text-amber-900 font-bold uppercase block">Total Tonase</span>
                        <p className="text-lg font-black text-amber-950 mt-0.5">{formatTon(totalCoilUnfifoTon, { showUnit: true })}</p>
                        <span className="text-[10px] text-amber-800">Perlu proses slitting</span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-600 border-t border-slate-100 pt-2 space-y-1 mt-2">
                      <div className="flex items-center justify-between">
                        <span>Lokasi Gudang:</span>
                        <strong className="text-slate-900">
                          {selectedCoilGudang === 'ALL' ? `${availableCoilGudangs.length - 1} Gudang Terdata` : selectedCoilGudang}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Rentang Tebal:</span>
                        <strong className="text-slate-900">{Math.min(...filteredCoilData.map(d=>d.tebal)).toFixed(2)} - {Math.max(...filteredCoilData.map(d=>d.tebal)).toFixed(2)} mm</strong>
                      </div>
                    </div>
                  </div>
                </CustomizableCard>
              );
            }

            if (card.id === 'table-coil-unfifo') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Daftar Bahan Baku Coil & Strip Berstatus UNFIFO"
                  icon={Table2}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < coilCards.length - 1}
                  onMoveLeft={() => handleMove(index, 'left')}
                  onMoveRight={() => handleMove(index, 'right')}
                  onWidthChange={(w) => handleWidthChange(card.id, w)}
                  headerAction={
                    <div className="flex items-center gap-2.5 font-mono text-xs flex-wrap">
                      <div className="inline-flex p-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px]">
                        <button
                          type="button"
                          onClick={() => { setCoilIssueFilter('ALL'); setCurrentCoilPage(1); }}
                          className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            coilIssueFilter === 'ALL'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Semua ({gudangFilteredCoilData.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setCoilIssueFilter('WITH_ISSUE'); setCurrentCoilPage(1); }}
                          className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            coilIssueFilter === 'WITH_ISSUE'
                              ? 'bg-amber-500 text-slate-950 shadow-2xs'
                              : 'text-amber-800 hover:bg-amber-100/50'
                          }`}
                        >
                          Ada Issue ({coilWithIssueCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setCoilIssueFilter('NO_ISSUE'); setCurrentCoilPage(1); }}
                          className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                            coilIssueFilter === 'NO_ISSUE'
                              ? 'bg-slate-700 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Belum Ada ({coilNoIssueCount})
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold text-[10px]">Gudang:</span>
                        <select
                          value={selectedCoilGudang}
                          onChange={(e) => handleCoilGudangChange(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-hidden cursor-pointer"
                        >
                          {availableCoilGudangs.map((g) => {
                            const count = g === 'ALL'
                              ? coilData.length
                              : coilData.filter((d) => d.gudang === g).length;
                            return (
                              <option key={g} value={g}>
                                {g === 'ALL' ? `Semua (${count})` : `${g} (${count})`}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  }
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
                        <thead className="border-b border-emerald-100 bg-emerald-50/50 text-slate-700">
                          <tr>
                            <th className="py-2.5 px-3 font-bold">SLOC</th>
                            <th className="py-2.5 px-3 font-bold">Kode Material</th>
                            <th className="py-2.5 px-3 font-bold">Spesifikasi Material</th>
                            <th className="py-2.5 px-3 font-bold text-amber-900">Batch</th>
                            <th className="py-2.5 px-2 text-right font-bold">Tebal</th>
                            <th className="py-2.5 px-2 text-right font-bold">Lebar</th>
                            <th className="py-2.5 px-3 font-bold text-slate-600">Tgl Masuk</th>
                            <th className="py-2.5 px-2 text-center font-bold text-amber-900">Status</th>
                            <th className="py-2.5 px-3 text-right font-bold text-slate-900">Qty (Roll)</th>
                            <th className="py-2.5 px-3.5 text-right font-bold text-amber-900">Tonase (Ton)</th>
                            <th className="py-2.5 px-3 font-bold text-slate-900">Penyebab / Issue UNFIFO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {paginatedCoilData.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="py-8 text-center text-slate-400 font-sans text-xs">
                                Tidak ada item Coil &amp; Strip yang berstatus UNFIFO untuk filter ini.
                              </td>
                            </tr>
                          ) : (
                            paginatedCoilData.map((row, idx) => {
                              const itemKey = getCoilKey(row);
                              const issueText = coilIssues[itemKey];
                              return (
                                <tr key={`coil-unf-${idx}`} className="hover:bg-emerald-50/30 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{row.gudang}</td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap text-[11px]">{row.kodeMaterial}</td>
                                  <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[220px] truncate" title={row.specification}>
                                    {row.specification}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-amber-900 bg-amber-50/40 whitespace-nowrap">{row.batch}</td>
                                  <td className="py-2.5 px-2 text-right text-slate-600 font-mono">{row.tebal.toFixed(2)}</td>
                                  <td className="py-2.5 px-2 text-right text-slate-600 font-mono">{row.lebar.toFixed(1)}</td>
                                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{row.incDate}</td>
                                  <td className="py-2.5 px-2 text-center font-bold text-amber-900">
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px]">
                                      {row.unfifoStatus || 'UNFIFO'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">{formatQty(row.qtyRoll)}</td>
                                  <td className="py-2.5 px-3.5 text-right font-bold text-amber-900">{formatTon(row.tonase, { decimals: 2 })}</td>
                                  <td className="py-2 px-3 min-w-[200px] max-w-[320px]">
                                    {issueText ? (
                                      <div
                                        onClick={() => openCoilEdit(row)}
                                        className="group flex items-center justify-between gap-1.5 p-1.5 rounded bg-amber-50/90 border border-amber-200/80 hover:border-amber-400 hover:bg-amber-100/70 cursor-pointer transition-all shadow-2xs"
                                        title="Klik untuk mengubah catatan issue"
                                      >
                                        <span className="text-amber-950 font-bold text-[11px] leading-tight break-words">
                                          {issueText}
                                        </span>
                                        <Pencil className="h-3 w-3 text-amber-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openCoilEdit(row)}
                                        className="text-[10px] font-bold text-slate-500 hover:text-emerald-900 hover:bg-emerald-50 border border-dashed border-slate-300 hover:border-emerald-400 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                        <span>Ketik Issue</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {filteredCoilData.length > 0 && (
                          <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                            <tr>
                              <td className="py-2.5 px-3" colSpan={8}>TOTAL COIL &amp; STRIP UNFIFO ({selectedCoilGudang})</td>
                              <td className="py-2.5 px-3 text-right">{formatQty(totalCoilUnfifoQty)}</td>
                              <td className="py-2.5 px-3.5 text-right text-amber-950 font-bold">{formatTon(totalCoilUnfifoTon, { decimals: 2 })}</td>
                              <td className="py-2.5 px-3 text-[10px] text-slate-500 font-normal">
                                {coilWithIssueCount} dari {gudangFilteredCoilData.length} item tercatat issue
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {totalCoilPages > 1 && (
                      <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between font-mono text-xs mt-2 rounded">
                        <div className="text-slate-500 text-[11px]">
                          Hal <strong className="text-slate-800">{currentCoilPage}</strong> / <strong className="text-slate-800">{totalCoilPages}</strong> ({filteredCoilData.length} item)
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={currentCoilPage === 1}
                            onClick={() => setCurrentCoilPage((p) => Math.max(1, p - 1))}
                            className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={currentCoilPage === totalCoilPages}
                            onClick={() => setCurrentCoilPage((p) => Math.min(totalCoilPages, p + 1))}
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

      {/* MODAL INPUT ISSUE / PENYEBAB UNFIFO */}
      {renderEditIssueModal()}
    </div>
  );
};
