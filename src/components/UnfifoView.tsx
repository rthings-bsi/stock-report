'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { UnfifoCoilItem, UnfifoPipeItem } from '../types/warehouse';
import {
  Layers,
  Disc,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Table2,
  Info,
  Pencil,
  Plus,
  Check,
  Trash2,
  X,
  AlertTriangle,
  FileText,
  CheckCircle2,
  MessageSquarePlus,
  Warehouse,
  BarChart3,
  TrendingDown,
  Clock,
  PieChart
} from 'lucide-react';
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
  { id: 'chart-pipe-causes', width: 'col-span-12' },
  { id: 'table-pipe-unfifo', width: 'col-span-12' },
];

const DEFAULT_COIL_CARDS: CardState[] = [
  { id: 'chart-coil-unfifo', width: 'col-span-8' },
  { id: 'summary-coil-unfifo', width: 'col-span-4' },
  { id: 'chart-coil-causes', width: 'col-span-12' },
  { id: 'table-coil-unfifo', width: 'col-span-12' },
];

const ISSUE_PRESETS = [
  'Belum ada PO',
  'Hold Qc',
  'Pipa Tertumpuk',
  'Pipa Khusus Order Tertentu'
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
    // 1. Load from localStorage for immediate render
    try {
      const savedP = localStorage.getItem('spindo_unfifo_pipe_issues');
      if (savedP) setPipeIssues(JSON.parse(savedP));
      const savedC = localStorage.getItem('spindo_unfifo_coil_issues');
      if (savedC) setCoilIssues(JSON.parse(savedC));
    } catch {}

    // 2. Fetch latest from Database via /api/settings
    fetch('/api/settings?key=unfifo_pipe_issues')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data && typeof res.data === 'object') {
          setPipeIssues((prev) => {
            const merged = { ...prev, ...res.data };
            try {
              localStorage.setItem('spindo_unfifo_pipe_issues', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch((err) => console.warn('Failed to load pipe issues from DB:', err));

    fetch('/api/settings?key=unfifo_coil_issues')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data && typeof res.data === 'object') {
          setCoilIssues((prev) => {
            const merged = { ...prev, ...res.data };
            try {
              localStorage.setItem('spindo_unfifo_coil_issues', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch((err) => console.warn('Failed to load coil issues from DB:', err));
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

        // Sync to Database
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'unfifo_pipe_issues', value: updated })
        }).catch((err) => console.warn('Failed to save pipe issue to DB:', err));

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

        // Sync to Database
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'unfifo_coil_issues', value: updated })
        }).catch((err) => console.warn('Failed to save coil issue to DB:', err));

        return updated;
      });
    }
    setActiveEditModal(null);
    setTempIssueText('');
  };

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedPipe = localStorage.getItem('spindo_layout_unfifo_pipe_v4');
      if (savedPipe) setPipeCards(JSON.parse(savedPipe));
      const savedCoil = localStorage.getItem('spindo_layout_unfifo_coil_v4');
      if (savedCoil) setCoilCards(JSON.parse(savedCoil));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_unfifo_pipe_v4', JSON.stringify(pipeCards));
      localStorage.setItem('spindo_layout_unfifo_coil_v4', JSON.stringify(coilCards));
    } catch {}
  }, [pipeCards, coilCards, isMounted]);

  const handleMovePipe = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= pipeCards.length) return;
    const newCards = [...pipeCards];
    const [moved] = newCards.splice(index, 1);
    newCards.splice(targetIdx, 0, moved);
    setPipeCards(newCards);
  };

  const handleMoveCoil = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= coilCards.length) return;
    const newCards = [...coilCards];
    const [moved] = newCards.splice(index, 1);
    newCards.splice(targetIdx, 0, moved);
    setCoilCards(newCards);
  };

  const handleWidthChangePipe = (id: string, newWidth: CardWidth) => {
    setPipeCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, width: newWidth } : c))
    );
  };

  const handleWidthChangeCoil = (id: string, newWidth: CardWidth) => {
    setCoilCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, width: newWidth } : c))
    );
  };

  // Helper date parser
  const parseDate = (dStr: string) => {
    if (!dStr) return new Date(0);
    const parts = dStr.split(/[\/\-.]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dStr);
  };

  const sortedPipeData = useMemo(() => {
    return [...pipeData].sort((a, b) => {
      const dateA = parseDate(a.incDate).getTime();
      const dateB = parseDate(b.incDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return b.tonase - a.tonase;
    });
  }, [pipeData]);

  const sortedCoilData = useMemo(() => {
    return [...coilData].sort((a, b) => {
      const dateA = parseDate(a.incDate).getTime();
      const dateB = parseDate(b.incDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return b.tonase - a.tonase;
    });
  }, [coilData]);

  const availablePipeGudangs = ['ALL', ...Array.from(new Set(pipeData.map((d) => d.gudang))).sort()];
  const availableCoilGudangs = ['ALL', ...Array.from(new Set(coilData.map((d) => d.gudang))).sort()];

  const filteredPipeData = selectedPipeGudang === 'ALL'
    ? sortedPipeData
    : sortedPipeData.filter((d) => d.gudang === selectedPipeGudang);

  const gudangFilteredPipeData = selectedPipeGudang === 'ALL'
    ? sortedPipeData
    : sortedPipeData.filter((d) => d.gudang === selectedPipeGudang);

  const pipeWithIssueCount = gudangFilteredPipeData.filter((d) => Boolean(pipeIssues[getPipeKey(d)])).length;
  const pipeNoIssueCount = gudangFilteredPipeData.length - pipeWithIssueCount;

  const finalFilteredPipeData = useMemo(() => {
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

  const finalFilteredCoilData = useMemo(() => {
    if (coilIssueFilter === 'WITH_ISSUE') {
      return gudangFilteredCoilData.filter((d) => Boolean(coilIssues[getCoilKey(d)]));
    }
    if (coilIssueFilter === 'NO_ISSUE') {
      return gudangFilteredCoilData.filter((d) => !coilIssues[getCoilKey(d)]);
    }
    return gudangFilteredCoilData;
  }, [gudangFilteredCoilData, coilIssueFilter, coilIssues]);

  const filteredCoilData = selectedCoilGudang === 'ALL'
    ? sortedCoilData
    : sortedCoilData.filter((d) => d.gudang === selectedCoilGudang);

  const totalPipeUnfifoTon = filteredPipeData.reduce((sum, d) => sum + d.tonase, 0);
  const totalPipeUnfifoQty = filteredPipeData.reduce((sum, d) => sum + d.qtyBtg, 0);
  const totalCoilUnfifoTon = filteredCoilData.reduce((sum, d) => sum + d.tonase, 0);
  const totalCoilUnfifoQty = filteredCoilData.reduce((sum, d) => sum + d.qtyRoll, 0);

  const totalPipePages = Math.ceil(finalFilteredPipeData.length / pageSize) || 1;
  const paginatedPipeData = finalFilteredPipeData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalCoilPages = Math.ceil(finalFilteredCoilData.length / pageSize) || 1;
  const paginatedCoilData = finalFilteredCoilData.slice((currentCoilPage - 1) * pageSize, currentCoilPage * pageSize);

  const handleGudangChange = (gudang: string) => {
    setSelectedPipeGudang(gudang);
    setCurrentPage(1);
  };

  const handleCoilGudangChange = (gudang: string) => {
    setSelectedCoilGudang(gudang);
    setCurrentCoilPage(1);
  };

  // Grouping Summaries
  const pipeUnfifoGudangSummary = useMemo(() => {
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

  const coilUnfifoGudangSummary = useMemo(() => {
    const summaryMap: Record<
      string,
      { gudang: string; totalTon: number; totalQty: number; coilTon: number; coilQty: number; stripTon: number; stripQty: number }
    > = {};
    coilData.forEach((item) => {
      const g = item.gudang || 'Gd.07';
      if (!summaryMap[g]) {
        summaryMap[g] = { gudang: g, totalTon: 0, totalQty: 0, coilTon: 0, coilQty: 0, stripTon: 0, stripQty: 0 };
      }
      summaryMap[g].totalTon += item.tonase;
      summaryMap[g].totalQty += item.qtyRoll;
      const isStrip = (item.specification && item.specification.toLowerCase().includes('strip')) || (item.lebar && item.lebar < 600);
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

  // =========================================================================
  // ROOT CAUSE / FAKTOR PENYEBAB UNFIFO AGGREGATION & CHARTS
  // =========================================================================
  const parseCauseCategory = (text: string | undefined): string => {
    if (!text || !text.trim()) return 'Menunggu Investigasi Lapangan';
    const lower = text.toLowerCase();
    if (lower.includes('po') || lower.includes('order cancel') || lower.includes('customer')) return 'Belum ada PO';
    if (lower.includes('qc') || lower.includes('hold') || lower.includes('mutu')) return 'Hold Qc';
    if (lower.includes('tumpuk') || lower.includes('tertutup') || lower.includes('crane') || lower.includes('rak')) return 'Pipa Tertumpuk';
    if (lower.includes('khusus') || lower.includes('tertentu') || lower.includes('target')) return 'Pipa Khusus Order Tertentu';
    return text.trim();
  };

  const pipeCausesSummary = useMemo(() => {
    const summaryMap: Record<string, { cause: string; count: number; totalTon: number; totalQty: number }> = {};
    
    pipeData.forEach((d) => {
      const issue = pipeIssues[getPipeKey(d)];
      if (issue && issue.trim()) {
        const category = parseCauseCategory(issue);
        if (!summaryMap[category]) {
          summaryMap[category] = { cause: category, count: 0, totalTon: 0, totalQty: 0 };
        }
        summaryMap[category].count += 1;
        summaryMap[category].totalTon += d.tonase;
        summaryMap[category].totalQty += d.qtyBtg;
      }
    });

    return Object.values(summaryMap).sort((a, b) => b.totalTon - a.totalTon);
  }, [pipeData, pipeIssues]);

  const pipeCausesBarData = {
    labels: pipeCausesSummary.map((c) => {
      if (c.cause.length > 25) {
        return c.cause.split(' / ')[0] || c.cause;
      }
      return c.cause;
    }),
    datasets: [
      {
        label: 'Tonase (Ton)',
        data: pipeCausesSummary.map((c) => Number(c.totalTon.toFixed(2))),
        backgroundColor: ['#e11d48', '#ea580c', '#d97706', '#0284c7', '#8b5cf6', '#64748b', '#059669'],
        hoverBackgroundColor: ['#be123c', '#c2410c', '#b45309', '#0369a1', '#7c3aed', '#475569', '#047857'],
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.58,
        categoryPercentage: 0.8,
      },
    ],
  };

  const pipeCausesBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'sans-serif', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        callbacks: {
          title: function (contexts: any[]) {
            const index = contexts[0]?.dataIndex;
            return pipeCausesSummary[index]?.cause || '';
          },
          label: function (context: any) {
            const index = context.dataIndex;
            const item = pipeCausesSummary[index];
            const pct = totalPipeUnfifoTon > 0 ? ((context.raw / totalPipeUnfifoTon) * 100).toFixed(1) : 0;
            return ` Tonase: ${context.raw} Ton (${pct}%) • ${item?.count || 0} Item`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: 'sans-serif', size: 10, weight: 'bold' as const },
          color: '#334155',
          maxRotation: 20,
          minRotation: 0,
        },
        border: { color: '#cbd5e1' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { family: 'monospace', size: 9 },
          color: '#64748b',
          callback: (val: any) => `${val} T`,
        },
        border: { dash: [4, 4], color: '#cbd5e1' },
      },
    },
  };

  const coilCausesSummary = useMemo(() => {
    const summaryMap: Record<string, { cause: string; count: number; totalTon: number; totalQty: number }> = {};

    coilData.forEach((d) => {
      const issue = coilIssues[getCoilKey(d)];
      if (issue && issue.trim()) {
        const category = parseCauseCategory(issue);
        if (!summaryMap[category]) {
          summaryMap[category] = { cause: category, count: 0, totalTon: 0, totalQty: 0 };
        }
        summaryMap[category].count += 1;
        summaryMap[category].totalTon += d.tonase;
        summaryMap[category].totalQty += d.qtyRoll;
      }
    });

    return Object.values(summaryMap).sort((a, b) => b.totalTon - a.totalTon);
  }, [coilData, coilIssues]);

  const coilCausesBarData = {
    labels: coilCausesSummary.map((c) => {
      if (c.cause.length > 25) {
        return c.cause.split(' / ')[0] || c.cause;
      }
      return c.cause;
    }),
    datasets: [
      {
        label: 'Tonase (Ton)',
        data: coilCausesSummary.map((c) => Number(c.totalTon.toFixed(2))),
        backgroundColor: ['#059669', '#0284c7', '#d97706', '#e11d48', '#8b5cf6'],
        hoverBackgroundColor: ['#047857', '#0369a1', '#b45309', '#be123c', '#7c3aed'],
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.58,
        categoryPercentage: 0.8,
      },
    ],
  };

  const coilCausesBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'sans-serif', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        callbacks: {
          title: function (contexts: any[]) {
            const index = contexts[0]?.dataIndex;
            return coilCausesSummary[index]?.cause || '';
          },
          label: function (context: any) {
            const index = context.dataIndex;
            const item = coilCausesSummary[index];
            const pct = totalCoilUnfifoTon > 0 ? ((context.raw / totalCoilUnfifoTon) * 100).toFixed(1) : 0;
            return ` Tonase: ${context.raw} Ton (${pct}%) • ${item?.count || 0} Roll`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: 'sans-serif', size: 10, weight: 'bold' as const },
          color: '#334155',
          maxRotation: 20,
          minRotation: 0,
        },
        border: { color: '#cbd5e1' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { family: 'monospace', size: 9 },
          color: '#64748b',
          callback: (val: any) => `${val} T`,
        },
        border: { dash: [4, 4], color: '#cbd5e1' },
      },
    },
  };

  const PIPE_DONUT_COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#64748b'];
  const PIPE_DONUT_HOVER_COLORS = ['#e11d48', '#d97706', '#059669', '#0284c7', '#7c3aed', '#475569'];

  const pipeDonutBreakdown = useMemo(() => {
    const topGudangs = pipeUnfifoGudangSummary.slice(0, 5);
    const otherTon = pipeUnfifoGudangSummary.slice(5).reduce((sum, g) => sum + g.totalTon, 0);
    const items = topGudangs.map((g, i) => ({
      label: g.gudang,
      value: g.totalTon,
      color: PIPE_DONUT_COLORS[i % PIPE_DONUT_COLORS.length],
    }));
    if (otherTon > 0) {
      items.push({
        label: 'Lainnya',
        value: otherTon,
        color: PIPE_DONUT_COLORS[items.length % PIPE_DONUT_COLORS.length],
      });
    }
    return items;
  }, [pipeUnfifoGudangSummary]);

  const pipeSummaryDonutData = useMemo(() => {
    return {
      labels: pipeDonutBreakdown.map((i) => i.label),
      datasets: [
        {
          data: pipeDonutBreakdown.map((i) => Number(i.value.toFixed(2))),
          backgroundColor: pipeDonutBreakdown.map((i) => i.color),
          hoverBackgroundColor: PIPE_DONUT_HOVER_COLORS.slice(0, pipeDonutBreakdown.length),
          borderWidth: 2,
          borderColor: '#ffffff',
          spacing: 2,
          borderRadius: 4,
          hoverOffset: 6,
        },
      ],
    };
  }, [pipeDonutBreakdown]);

  const pipeSummaryDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        titleColor: '#f8fafc',
        bodyColor: '#f1f5f9',
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        padding: { top: 8, bottom: 8, left: 12, right: 12 },
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function (context: any) {
            const val = context.raw || 0;
            const pct = totalPipeUnfifoTon > 0 ? ((val / totalPipeUnfifoTon) * 100).toFixed(1) : 0;
            return ` ${context.label}: ${formatTon(val, { showUnit: true })} (${pct}%)`;
          },
        },
      },
    },
  };

  const totalCoilOnlyTon = useMemo(() => {
    return filteredCoilData.filter(d => !((d.specification && d.specification.toLowerCase().includes('strip')) || (d.lebar && d.lebar < 600))).reduce((sum, d) => sum + d.tonase, 0);
  }, [filteredCoilData]);

  const totalStripOnlyTon = useMemo(() => {
    return filteredCoilData.filter(d => ((d.specification && d.specification.toLowerCase().includes('strip')) || (d.lebar && d.lebar < 600))).reduce((sum, d) => sum + d.tonase, 0);
  }, [filteredCoilData]);

  const totalCoilOnlyQty = useMemo(() => {
    return filteredCoilData.filter(d => !((d.specification && d.specification.toLowerCase().includes('strip')) || (d.lebar && d.lebar < 600))).reduce((sum, d) => sum + d.qtyRoll, 0);
  }, [filteredCoilData]);

  const totalStripOnlyQty = useMemo(() => {
    return filteredCoilData.filter(d => ((d.specification && d.specification.toLowerCase().includes('strip')) || (d.lebar && d.lebar < 600))).reduce((sum, d) => sum + d.qtyRoll, 0);
  }, [filteredCoilData]);

  const coilSummaryDonutData = useMemo(() => {
    return {
      labels: ['Coil', 'Strip'],
      datasets: [
        {
          data: [Number(totalCoilOnlyTon.toFixed(2)), Number(totalStripOnlyTon.toFixed(2))],
          backgroundColor: ['#10b981', '#f59e0b'],
          hoverBackgroundColor: ['#059669', '#d97706'],
          borderWidth: 2,
          borderColor: '#ffffff',
          spacing: 2,
          borderRadius: 4,
          hoverOffset: 6,
        },
      ],
    };
  }, [totalCoilOnlyTon, totalStripOnlyTon]);

  const coilSummaryDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        titleColor: '#f8fafc',
        bodyColor: '#f1f5f9',
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        padding: { top: 8, bottom: 8, left: 12, right: 12 },
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function (context: any) {
            const val = context.raw || 0;
            const pct = totalCoilUnfifoTon > 0 ? ((val / totalCoilUnfifoTon) * 100).toFixed(1) : 0;
            return ` ${context.label}: ${formatTon(val, { showUnit: true })} (${pct}%)`;
          },
        },
      },
    },
  };

  // Charts Config
  const pipeBarChartData = {
    labels: pipeUnfifoGudangSummary.map((d) => d.gudang),
    datasets: [
      {
        label: 'Tonase Pipa UNFIFO (Ton)',
        data: pipeUnfifoGudangSummary.map((d) => Number(d.totalTon.toFixed(2))),
        backgroundColor: pipeUnfifoGudangSummary.map((d) =>
          selectedPipeGudang === d.gudang ? '#047857' : '#d97706'
        ),
        hoverBackgroundColor: pipeUnfifoGudangSummary.map((d) =>
          selectedPipeGudang === d.gudang ? '#065f46' : '#b45309'
        ),
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.62,
        categoryPercentage: 0.8,
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
          usePointStyle: true,
          pointStyle: 'rectRounded' as const,
          padding: 12,
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
        border: { color: '#cbd5e1' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'monospace', size: 9 }, color: '#64748b', stepSize: 15 },
        border: { dash: [4, 4], color: '#cbd5e1' },
      },
    },
  };

  const coilBarChartData = {
    labels: coilUnfifoGudangSummary.map((d) => d.gudang),
    datasets: [
      {
        label: 'Coil (Ton)',
        data: coilUnfifoGudangSummary.map((d) => Number(d.coilTon.toFixed(2))),
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.62,
        categoryPercentage: 0.8,
      },
      {
        label: 'Strip (Ton)',
        data: coilUnfifoGudangSummary.map((d) => Number(d.stripTon.toFixed(2))),
        backgroundColor: '#d97706',
        hoverBackgroundColor: '#b45309',
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.62,
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
          pointStyle: 'rectRounded' as const,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'monospace', size: 11, weight: 'bold' as const },
        bodyFont: { family: 'monospace', size: 11 },
        padding: 10,
        cornerRadius: 8,
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
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 font-mono text-xs">
            {/* Meta Info */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Material:</span>
                <strong className="text-slate-900">{activeEditModal.material}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Batch:</span>
                <strong className="text-amber-900">{activeEditModal.batch}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Spesifikasi / Ukuran:</span>
                <strong className="text-slate-800">{activeEditModal.spec}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Kuantitas:</span>
                <strong className="text-slate-900">{formatQty(activeEditModal.qty, { unit: activeEditModal.unit })} ({formatTon(activeEditModal.tonase, { showUnit: true })})</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Tgl Masuk:</span>
                <strong className="text-slate-700">{activeEditModal.incDate}</strong>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                <span>Pilih Pintasan Alasan Cepat:</span>
                <span className="text-[10px] text-slate-400 font-normal">Klik untuk memasukkan</span>
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
    <div className="space-y-6 font-sans">
      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200 shadow-2xs">
            <Clock className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <h1 className="text-base font-bold text-white font-sans tracking-tight">
            Deviasi Alur Pengeluaran (UNFIFO)
          </h1>
        </div>

        {/* FILTERS */}
        <div className="flex items-center gap-2.5 flex-wrap font-mono text-xs">
          {/* GUDANG SELECTOR */}
          <div className="relative flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/80 shadow-2xs">
            <Warehouse className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <span className="text-emerald-300 text-[10px] uppercase font-bold">Gudang:</span>
            <div className="relative inline-flex items-center">
              <select
                value={activeTab === 'pipe' ? selectedPipeGudang : selectedCoilGudang}
                onChange={(e) => {
                  if (activeTab === 'pipe') {
                    handleGudangChange(e.target.value);
                  } else {
                    handleCoilGudangChange(e.target.value);
                  }
                }}
                className="appearance-none bg-emerald-900/90 border border-emerald-700/90 text-white text-xs font-bold rounded-md pl-2 pr-6 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                <option value="ALL">
                  Semua Gudang ({activeTab === 'pipe' ? availablePipeGudangs.length - 1 : availableCoilGudangs.length - 1})
                </option>
                {(activeTab === 'pipe' ? availablePipeGudangs : availableCoilGudangs)
                  .filter((g) => g !== 'ALL')
                  .map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-1.5 h-3 w-3 text-emerald-300 pointer-events-none" />
            </div>
          </div>

          {(activeTab === 'pipe' ? selectedPipeGudang : selectedCoilGudang) !== 'ALL' && (
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'pipe') {
                  handleGudangChange('ALL');
                } else {
                  handleCoilGudangChange('ALL');
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* 2 TAB NAVIGATION FOR TABLES */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('pipe')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pipe'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-emerald-700" />
            <span>Data Pipa UNFIFO ({pipeData.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coil')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'coil'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Disc className="h-3.5 w-3.5 text-amber-700" />
            <span>Data Coil &amp; Strip UNFIFO ({coilData.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PIPA UNFIFO CARDS */}
      {activeTab === 'pipe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
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
                  onMoveLeft={() => handleMovePipe(index, 'left')}
                  onMoveRight={() => handleMovePipe(index, 'right')}
                  onWidthChange={(w) => handleWidthChangePipe(card.id, w)}
                >
                  <div className="h-64 sm:h-72 w-full min-w-0 p-1">
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
                  title="Proporsi Gudang Pipa UNFIFO"
                  subtitle={selectedPipeGudang === 'ALL' ? 'Distribusi tonase pipa per gudang' : `Filter aktif: ${selectedPipeGudang}`}
                  icon={PieChart}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < pipeCards.length - 1}
                  onMoveLeft={() => handleMovePipe(index, 'left')}
                  onMoveRight={() => handleMovePipe(index, 'right')}
                  onWidthChange={(w) => handleWidthChangePipe(card.id, w)}
                  badge={
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200/70">
                      {formatTon(totalPipeUnfifoTon, { decimals: 2 })} Ton
                    </span>
                  }
                >
                  <div className="flex flex-col justify-between h-full space-y-3 font-mono p-1">
                    <div className="h-40 sm:h-44 flex items-center justify-center relative my-auto min-w-0">
                      <Doughnut data={pipeSummaryDonutData} options={pipeSummaryDonutOptions} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                          {formatTon(totalPipeUnfifoTon, { decimals: 2 })}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                          TOTAL TON
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Pills List */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 mt-2">
                      {pipeDonutBreakdown.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-[11px] font-medium text-slate-600 truncate">{item.label}</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                            {formatTon(item.value, { decimals: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CustomizableCard>
              );
            }

            // CARD: ANALISIS FAKTOR PENYEBAB UNFIFO (VERTICAL BAR CHART)
            if (card.id === 'chart-pipe-causes') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Faktor Penyebab UNFIFO Produk Pipa"
                  subtitle="Distribusi tonase per kategori kendala pengeluaran pipa di Plant 1105"
                  icon={BarChart3}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < pipeCards.length - 1}
                  onMoveLeft={() => handleMovePipe(index, 'left')}
                  onMoveRight={() => handleMovePipe(index, 'right')}
                  onWidthChange={(w) => handleWidthChangePipe(card.id, w)}
                  badge={
                    pipeCausesSummary.length > 0 ? (
                      <span className="text-[10px] font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                        {pipeCausesSummary.length} Kategori Masalah
                      </span>
                    ) : undefined
                  }
                >
                  {pipeCausesSummary.length === 0 ? (
                    <div className="py-8 px-4 text-center font-mono">
                      <AlertTriangle className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">Belum Ada Catatan Alasan / Issue Pipa</p>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Klik tombol <span className="text-emerald-700 font-bold font-mono">&quot;+ Catat Alasan&quot;</span> pada tabel di bawah untuk mengisi kendala aktual di lapangan.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 items-start">
                      {/* Vertical Bar Chart */}
                      <div className="lg:col-span-7 xl:col-span-7 h-64 sm:h-72 w-full min-w-0">
                        <Bar data={pipeCausesBarData} options={pipeCausesBarOptions} />
                      </div>

                      {/* Breakdown Ranking Table */}
                      <div className="lg:col-span-5 xl:col-span-5 space-y-2.5 font-mono text-xs border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6 pt-4 lg:pt-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Peringkat Dominasi Penyebab:
                        </span>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {pipeCausesSummary.map((item, rIdx) => {
                            const pct = totalPipeUnfifoTon > 0 ? ((item.totalTon / totalPipeUnfifoTon) * 100).toFixed(1) : 0;
                            return (
                              <div
                                key={item.cause}
                                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/90 hover:bg-slate-100/90 transition-all space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`h-5 w-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                      rIdx === 0
                                        ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                        : rIdx === 1
                                        ? 'bg-slate-700 text-white shadow-2xs'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {rIdx + 1}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-800 truncate" title={item.cause}>
                                      {item.cause}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <strong className="text-slate-900 tabular-nums">{formatTon(item.totalTon, { showUnit: true })}</strong>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 gap-2">
                                  <div className="flex-1 bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-amber-500"
                                      style={{ width: `${Math.min(100, Math.max(3, Number(pct)))}%` }}
                                    />
                                  </div>
                                  <span className="shrink-0 tabular-nums">({pct}% &bull; {item.count} item)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
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
                  onMoveLeft={() => handleMovePipe(index, 'left')}
                  onMoveRight={() => handleMovePipe(index, 'right')}
                  onWidthChange={(w) => handleWidthChangePipe(card.id, w)}
                  headerAction={
                    <div className="flex items-center gap-2.5 font-mono text-xs flex-wrap">
                      <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px]">
                        <button
                          type="button"
                          onClick={() => { setPipeIssueFilter('ALL'); setCurrentPage(1); }}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
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
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
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
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            pipeIssueFilter === 'NO_ISSUE'
                              ? 'bg-slate-800 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Belum Ada ({pipeNoIssueCount})
                        </button>
                      </div>
                    </div>
                  }
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="py-3 px-3 font-bold">Gudang</th>
                            <th className="py-3 px-3 font-bold">Kode Material</th>
                            <th className="py-3 px-3 font-bold">Ukuran (D x T x P)</th>
                            <th className="py-3 px-3 font-bold">Customer</th>
                            <th className="py-3 px-3 font-bold text-amber-900">Batch</th>
                            <th className="py-3 px-3 font-bold text-slate-600">Tgl Masuk</th>
                            <th className="py-3 px-3 text-right font-bold text-slate-900">Qty (Btg)</th>
                            <th className="py-3 px-3.5 text-right font-bold text-amber-900">Tonase (Ton)</th>
                            <th className="py-3 px-3 font-bold text-slate-900">Penyebab / Issue UNFIFO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {paginatedPipeData.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                                {pipeIssueFilter !== 'ALL'
                                  ? 'Tidak ada item pipa dengan filter issue yang dipilih.'
                                  : 'Tidak ada data produk pipa UNFIFO.'}
                              </td>
                            </tr>
                          ) : (
                            paginatedPipeData.map((row, idx) => {
                              const itemKey = getPipeKey(row);
                              const issueText = pipeIssues[itemKey];

                              return (
                                <tr key={`pipe-row-${itemKey}-${(currentPage - 1) * pageSize + idx}`} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{row.gudang}</td>
                                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-medium">{row.kodeMaterial}</td>
                                  <td className="py-2.5 px-3 text-slate-800 font-bold whitespace-nowrap">{row.ukuran}</td>
                                  <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate" title={row.customer}>{row.customer || '-'}</td>
                                  <td className="py-2.5 px-3 text-amber-900 font-bold whitespace-nowrap">{row.batch}</td>
                                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{row.incDate}</td>
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">{formatQty(row.qtyBtg)}</td>
                                  <td className="py-2.5 px-3.5 text-right font-bold text-amber-900 whitespace-nowrap tabular-nums">{formatTon(row.tonase)}</td>
                                  <td className="py-2 px-3">
                                    {issueText ? (
                                      <div
                                        onClick={() => setActiveEditModal({
                                          type: 'pipe',
                                          key: itemKey,
                                          gudang: row.gudang,
                                          material: row.kodeMaterial,
                                          spec: row.ukuran,
                                          customer: row.customer,
                                          batch: row.batch,
                                          tonase: row.tonase,
                                          qty: row.qtyBtg,
                                          unit: 'Btg',
                                          incDate: row.incDate
                                        })}
                                        className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-[11px] text-amber-950 font-medium hover:bg-amber-100 transition-colors cursor-pointer max-w-[280px]"
                                        title="Klik untuk mengubah catatan issue"
                                      >
                                        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                        <span className="truncate">{issueText}</span>
                                        <Pencil className="h-2.5 w-2.5 text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setActiveEditModal({
                                          type: 'pipe',
                                          key: itemKey,
                                          gudang: row.gudang,
                                          material: row.kodeMaterial,
                                          spec: row.ukuran,
                                          customer: row.customer,
                                          batch: row.batch,
                                          tonase: row.tonase,
                                          qty: row.qtyBtg,
                                          unit: 'Btg',
                                          incDate: row.incDate
                                        })}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-slate-300 text-[11px] text-slate-500 hover:text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer"
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                        <span>Catat Alasan</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900 tabular-nums">
                          <tr>
                            <td className="py-3 px-3" colSpan={6}>TOTAL PIPA UNFIFO ({selectedPipeGudang})</td>
                            <td className="py-3 px-3 text-right">{formatQty(totalPipeUnfifoQty)}</td>
                            <td className="py-3 px-3.5 text-right text-amber-900">{formatTon(totalPipeUnfifoTon)}</td>
                            <td className="py-3 px-3 text-[10px] text-slate-500 font-normal">
                              {pipeWithIssueCount} dari {gudangFilteredPipeData.length} item tercatat issue
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPipePages > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2.5 text-xs font-mono mt-2">
                        <span className="text-slate-500">
                          Halaman {currentPage} dari {totalPipePages} ({finalFilteredPipeData.length} item)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition-colors"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPipePages, p + 1))}
                            disabled={currentPage === totalPipePages}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition-colors"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
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
                  onMoveLeft={() => handleMoveCoil(index, 'left')}
                  onMoveRight={() => handleMoveCoil(index, 'right')}
                  onWidthChange={(w) => handleWidthChangeCoil(card.id, w)}
                >
                  <div className="h-64 sm:h-72 w-full min-w-0 p-1">
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
                  title="Proporsi Bahan Baku Coil vs Strip"
                  subtitle={selectedCoilGudang === 'ALL' ? 'Rasio komposisi bahan baku UNFIFO' : `Filter aktif: ${selectedCoilGudang}`}
                  icon={PieChart}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < coilCards.length - 1}
                  onMoveLeft={() => handleMoveCoil(index, 'left')}
                  onMoveRight={() => handleMoveCoil(index, 'right')}
                  onWidthChange={(w) => handleWidthChangeCoil(card.id, w)}
                  badge={
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200/70">
                      {formatTon(totalCoilUnfifoTon, { decimals: 2 })} Ton
                    </span>
                  }
                >
                  <div className="flex flex-col justify-between h-full space-y-3 font-mono p-1">
                    <div className="h-40 sm:h-44 flex items-center justify-center relative my-auto min-w-0">
                      <Doughnut data={coilSummaryDonutData} options={coilSummaryDonutOptions} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                          {formatTon(totalCoilUnfifoTon, { decimals: 2 })}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                          TOTAL TON
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Pills List */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 mt-2">
                      <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[11px] font-medium text-slate-600 truncate">Coil ({totalCoilOnlyQty} Roll)</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                          {formatTon(totalCoilOnlyTon, { decimals: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-[11px] font-medium text-slate-600 truncate">Strip ({totalStripOnlyQty} Roll)</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                          {formatTon(totalStripOnlyTon, { decimals: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CustomizableCard>
              );
            }

            // CARD: ANALISIS FAKTOR PENYEBAB COIL UNFIFO (VERTICAL BAR CHART)
            if (card.id === 'chart-coil-causes') {
              return (
                <CustomizableCard
                  key={card.id}
                  id={card.id}
                  title="Faktor Penyebab UNFIFO Bahan Baku Coil & Strip"
                  subtitle="Distribusi tonase per kategori kendala pengeluaran bahan baku induk di bay gudang"
                  icon={BarChart3}
                  width={card.width}
                  isCustomizing={isCustomizing}
                  canMoveLeft={index > 0}
                  canMoveRight={index < coilCards.length - 1}
                  onMoveLeft={() => handleMoveCoil(index, 'left')}
                  onMoveRight={() => handleMoveCoil(index, 'right')}
                  onWidthChange={(w) => handleWidthChangeCoil(card.id, w)}
                  badge={
                    coilCausesSummary.length > 0 ? (
                      <span className="text-[10px] font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                        {coilCausesSummary.length} Kategori Masalah
                      </span>
                    ) : undefined
                  }
                >
                  {coilCausesSummary.length === 0 ? (
                    <div className="py-8 px-4 text-center font-mono">
                      <AlertTriangle className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">Belum Ada Catatan Alasan / Issue Coil & Strip</p>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Klik tombol <span className="text-emerald-700 font-bold font-mono">&quot;+ Catat Alasan&quot;</span> pada tabel di bawah untuk mengisi kendala aktual di lapangan.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 items-start">
                      {/* Vertical Bar Chart */}
                      <div className="lg:col-span-7 xl:col-span-7 h-64 sm:h-72 w-full min-w-0">
                        <Bar data={coilCausesBarData} options={coilCausesBarOptions} />
                      </div>

                      {/* Breakdown Ranking Table */}
                      <div className="lg:col-span-5 xl:col-span-5 space-y-2.5 font-mono text-xs border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6 pt-4 lg:pt-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Peringkat Dominasi Kendala:
                        </span>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {coilCausesSummary.map((item, rIdx) => {
                            const pct = totalCoilUnfifoTon > 0 ? ((item.totalTon / totalCoilUnfifoTon) * 100).toFixed(1) : 0;
                            return (
                              <div
                                key={item.cause}
                                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/90 hover:bg-slate-100/90 transition-all space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`h-5 w-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                      rIdx === 0
                                        ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                        : rIdx === 1
                                        ? 'bg-slate-700 text-white shadow-2xs'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {rIdx + 1}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-800 truncate" title={item.cause}>
                                      {item.cause}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <strong className="text-slate-900 tabular-nums">{formatTon(item.totalTon, { showUnit: true })}</strong>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 gap-2">
                                  <div className="flex-1 bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-emerald-600"
                                      style={{ width: `${Math.min(100, Math.max(3, Number(pct)))}%` }}
                                    />
                                  </div>
                                  <span className="shrink-0 tabular-nums">({pct}% &bull; {item.count} roll)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
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
                  onMoveLeft={() => handleMoveCoil(index, 'left')}
                  onMoveRight={() => handleMoveCoil(index, 'right')}
                  onWidthChange={(w) => handleWidthChangeCoil(card.id, w)}
                  headerAction={
                    <div className="flex items-center gap-2.5 font-mono text-xs flex-wrap">
                      <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px]">
                        <button
                          type="button"
                          onClick={() => { setCoilIssueFilter('ALL'); setCurrentCoilPage(1); }}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
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
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
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
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            coilIssueFilter === 'NO_ISSUE'
                              ? 'bg-slate-800 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Belum Ada ({coilNoIssueCount})
                        </button>
                      </div>
                    </div>
                  }
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="py-3 px-3 font-bold">SLOC</th>
                            <th className="py-3 px-3 font-bold">Kode Material</th>
                            <th className="py-3 px-3 font-bold">Spesifikasi Material</th>
                            <th className="py-3 px-3 font-bold text-amber-900">Batch</th>
                            <th className="py-3 px-3 font-bold text-slate-600">Tgl Masuk</th>
                            <th className="py-3 px-3 text-right font-bold text-slate-900">Qty (Roll)</th>
                            <th className="py-3 px-3.5 text-right font-bold text-amber-900">Tonase (Ton)</th>
                            <th className="py-3 px-3 font-bold text-slate-900">Penyebab / Issue UNFIFO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {paginatedCoilData.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                                {coilIssueFilter !== 'ALL'
                                  ? 'Tidak ada item coil/strip dengan filter issue yang dipilih.'
                                  : 'Tidak ada data coil & strip UNFIFO.'}
                              </td>
                            </tr>
                          ) : (
                            paginatedCoilData.map((row, idx) => {
                              const itemKey = getCoilKey(row);
                              const issueText = coilIssues[itemKey];

                              return (
                                <tr key={`coil-row-${itemKey}-${(currentCoilPage - 1) * pageSize + idx}`} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{row.gudang}</td>
                                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-medium">{row.kodeMaterial}</td>
                                  <td className="py-2.5 px-3 text-slate-800 font-bold whitespace-nowrap">{row.specification || `${row.tebal} x ${row.lebar}`}</td>
                                  <td className="py-2.5 px-3 text-amber-900 font-bold whitespace-nowrap">{row.batch}</td>
                                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{row.incDate}</td>
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">{formatQty(row.qtyRoll)}</td>
                                  <td className="py-2.5 px-3.5 text-right font-bold text-amber-900 whitespace-nowrap tabular-nums">{formatTon(row.tonase)}</td>
                                  <td className="py-2 px-3">
                                    {issueText ? (
                                      <div
                                        onClick={() => setActiveEditModal({
                                          type: 'coil',
                                          key: itemKey,
                                          gudang: row.gudang,
                                          material: row.kodeMaterial,
                                          spec: row.specification || `${row.tebal} x ${row.lebar}`,
                                          batch: row.batch,
                                          tonase: row.tonase,
                                          qty: row.qtyRoll,
                                          unit: 'Roll',
                                          incDate: row.incDate
                                        })}
                                        className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-[11px] text-amber-950 font-medium hover:bg-amber-100 transition-colors cursor-pointer max-w-[280px]"
                                        title="Klik untuk mengubah catatan issue"
                                      >
                                        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                        <span className="truncate">{issueText}</span>
                                        <Pencil className="h-2.5 w-2.5 text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setActiveEditModal({
                                          type: 'coil',
                                          key: itemKey,
                                          gudang: row.gudang,
                                          material: row.kodeMaterial,
                                          spec: row.specification || `${row.tebal} x ${row.lebar}`,
                                          batch: row.batch,
                                          tonase: row.tonase,
                                          qty: row.qtyRoll,
                                          unit: 'Roll',
                                          incDate: row.incDate
                                        })}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-slate-300 text-[11px] text-slate-500 hover:text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer"
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                        <span>Catat Alasan</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900 tabular-nums">
                          <tr>
                            <td className="py-3 px-3" colSpan={5}>TOTAL COIL &amp; STRIP UNFIFO ({selectedCoilGudang})</td>
                            <td className="py-3 px-3 text-right">{formatQty(totalCoilUnfifoQty)}</td>
                            <td className="py-3 px-3.5 text-right text-amber-900">{formatTon(totalCoilUnfifoTon)}</td>
                            <td className="py-3 px-3 text-[10px] text-slate-500 font-normal">
                              {coilWithIssueCount} dari {gudangFilteredCoilData.length} item tercatat issue
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalCoilPages > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2.5 text-xs font-mono mt-2">
                        <span className="text-slate-500">
                          Halaman {currentCoilPage} dari {totalCoilPages} ({finalFilteredCoilData.length} item)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCurrentCoilPage((p) => Math.max(1, p - 1))}
                            disabled={currentCoilPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition-colors"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setCurrentCoilPage((p) => Math.min(totalCoilPages, p + 1))}
                            disabled={currentCoilPage === totalCoilPages}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 hover:text-slate-900 shadow-2xs transition-colors"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
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

      {/* RENDER MODAL CATAT ALASAN / ISSUE */}
      {renderEditIssueModal()}
    </div>
  );
};
