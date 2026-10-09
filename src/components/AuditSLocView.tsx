'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  AuditSLocItem,
  AuditSLocDifferenceStatus,
  AuditSLocSummary,
  AuditSLocPeriodSummary
} from '../types/warehouse';
import {
  calculateAuditSLocSummary,
  calculateAuditSLocGudangRecap,
  calculateAuditSLocRecap,
  calculateAuditSLocPeriodSummary,
  normalizeAuditSLocItem,
  getAuditSLocItemWeights
} from '@/lib/parseAuditSLoc';
import { exportAuditSLocToExcel } from '@/lib/exportAuditSLocExcel';
import { formatTon, formatQty, formatPercent, cn } from '@/lib/utils';
import {
  MapPinCheck,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  PlusCircle,
  Search,
  Filter,
  Download,
  RotateCcw,
  BarChart3,
  PieChart,
  Table2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Building2,
  MapPin,
  Calendar,
  Scale,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface AuditSLocViewProps {
  data?: AuditSLocItem[];
  isCustomizing?: boolean;
  onDataUpdate?: (newData: AuditSLocItem[]) => void;
  targetDate?: string;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'chart-asloc-accuracy-bar', width: 'col-span-6' },
  { id: 'chart-asloc-compare-bar', width: 'col-span-6' },
  { id: 'chart-asloc-sloc-bar', width: 'col-span-8' },
  { id: 'chart-asloc-donut', width: 'col-span-4' },
  { id: 'chart-asloc-period-trend', width: 'col-span-12' },
  { id: 'table-asloc-detail', width: 'col-span-12' },
];

export const AuditSLocView: React.FC<AuditSLocViewProps> = ({
  data = [],
  isCustomizing = false,
  onDataUpdate,
  targetDate,
}) => {
  const normalizedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map(normalizeAuditSLocItem);
  }, [data]);

  const [items, setItems] = useState<AuditSLocItem[]>(normalizedData);
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setItems(normalizedData);
  }, [normalizedData]);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_audit_sloc_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_CARDS.length) {
          setCards(parsed);
          return;
        }
      }
    } catch {}
    setCards(DEFAULT_CARDS);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_audit_sloc_v1', JSON.stringify(cards));
    } catch {}
  }, [cards, isMounted]);

  const handleWidthChange = (id: string, width: CardWidth) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, width } : c)));
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cards.length) return;
    setCards((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Filter & Search
  const [activeTab, setActiveTab] = useState<'ALL' | 'SESUAI' | 'SELISIH_MINUS' | 'SELISIH_PLUS'>('ALL');
  const [selectedGudang, setSelectedGudang] = useState<string>('ALL');
  const [selectedSLoc, setSelectedSLoc] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toggles for chart view metrics
  const [accuracyMetric, setAccuracyMetric] = useState<'item' | 'ton'>('item');
  const [compareMetric, setCompareMetric] = useState<'all' | 'ton' | 'qty' | 'item'>('all');
  const [slocGudangFilter, setSlocGudangFilter] = useState<string>('ALL');
  const [slocMetric, setSlocMetric] = useState<'ton' | 'qty' | 'percent'>('ton');
  const [slocDiffOnly, setSlocDiffOnly] = useState<boolean>(false);
  const [slocFilterMode, setSlocFilterMode] = useState<'all' | 'minus' | 'plus'>('all');

  // Audit SLoc Period Trend History
  const [periodMetric, setPeriodMetric] = useState<'all' | 'ton' | 'qty' | 'accuracy' | 'item'>('all');
  const [auditPeriods, setAuditPeriods] = useState<AuditSLocPeriodSummary[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      setIsLoadingPeriods(true);
      try {
        const res = await fetch('/api/warehouse?audit_sloc_history=true');
        const json = await res.json();
        if (active && json?.success && Array.isArray(json.periods)) {
          const list: AuditSLocPeriodSummary[] = [...json.periods];

          if (items.length > 0) {
            const currentPeriodKey = targetDate ? `snap_${targetDate}` : 'snap_current';
            const existingIdx = list.findIndex(
              (p) => p.periodKey === currentPeriodKey || (targetDate && p.lastUpdated === targetDate)
            );

            const currentSummary = calculateAuditSLocPeriodSummary(
              items,
              currentPeriodKey,
              targetDate || new Date().toISOString().slice(0, 10),
              targetDate ? undefined : 'Sesi Aktif'
            );

            if (existingIdx >= 0) {
              list[existingIdx] = currentSummary;
            } else {
              list.push(currentSummary);
            }
          }

          list.sort((a, b) => a.lastUpdated.localeCompare(b.lastUpdated));
          setAuditPeriods(list);
        }
      } catch (err) {
        console.warn('Gagal memuat riwayat Audit SLoc:', err);
      } finally {
        if (active) setIsLoadingPeriods(false);
      }
    };

    fetchHistory();
    return () => {
      active = false;
    };
  }, [items, targetDate]);

  useEffect(() => {
    if (selectedGudang !== 'ALL') {
      setSlocGudangFilter(selectedGudang);
    }
  }, [selectedGudang]);

  // Table Sorting & Pagination
  const [sortField, setSortField] = useState<string>('diffAuditFinalQty');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  const availableGudangs = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.gudang) set.add(i.gudang);
    });
    return Array.from(set).sort();
  }, [items]);

  const availableSLocs = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (selectedGudang === 'ALL' || i.gudang === selectedGudang) {
        if (i.sloc) set.add(i.sloc);
      }
    });
    return Array.from(set).sort();
  }, [items, selectedGudang]);

  useEffect(() => {
    if (selectedSLoc !== 'ALL' && !availableSLocs.includes(selectedSLoc)) {
      setSelectedSLoc('ALL');
    }
  }, [selectedGudang, availableSLocs, selectedSLoc]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedGudang !== 'ALL' && item.gudang !== selectedGudang) return false;
      if (selectedSLoc !== 'ALL' && item.sloc !== selectedSLoc) return false;

      if (activeTab === 'SESUAI' && item.status !== 'SESUAI') return false;
      if (activeTab === 'SELISIH_MINUS' && item.status !== 'SELISIH_MINUS') return false;
      if (activeTab === 'SELISIH_PLUS' && item.status !== 'SELISIH_PLUS') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mat = (item.material || '').toLowerCase();
        const desc = (item.materialDescription || '').toLowerCase();
        const batch = (item.batch || '').toLowerCase();
        const lbl = (item.label || item.labelId || '').toLowerCase();
        const sloc = (item.sloc || '').toLowerCase();
        const gd = (item.gudang || '').toLowerCase();
        const uk = (item.ukuran || '').toLowerCase();
        const plt = (item.plant || '').toLowerCase();

        return (
          mat.includes(q) ||
          desc.includes(q) ||
          batch.includes(q) ||
          lbl.includes(q) ||
          sloc.includes(q) ||
          gd.includes(q) ||
          uk.includes(q) ||
          plt.includes(q)
        );
      }

      return true;
    });
  }, [items, selectedGudang, selectedSLoc, activeTab, searchQuery]);

  // Sticky table totals row calculation
  const filteredTotals = useMemo(() => {
    let sapInitialQty = 0;
    let eomWeight = 0;
    let qtyAudit = 0;
    let kgAudit = 0;
    let diffKgAudit = 0;
    let diffQtyInitial = 0;
    let sapFinalQty = 0;
    let actualFinalQty = 0;
    let diffAuditFinalQty = 0;
    let tonDiffFinal = 0;
    let matchingCount = 0;

    for (const i of filteredItems) {
      sapInitialQty += i.sapInitialQty;
      eomWeight += i.eomWeight;
      qtyAudit += i.qtyAudit;
      kgAudit += i.kgAudit;
      diffKgAudit += i.diffKgAudit;
      diffQtyInitial += i.diffQtyInitial;
      sapFinalQty += i.sapFinalQty;
      actualFinalQty += i.actualFinalQty;
      diffAuditFinalQty += i.diffAuditFinalQty;
      tonDiffFinal += (i.tonDiffFinal || 0);
      if (i.status === 'SESUAI') matchingCount++;
    }

    const accuracy = filteredItems.length > 0 ? (matchingCount / filteredItems.length) * 100 : 0;

    return {
      sapInitialQty,
      eomWeight,
      qtyAudit,
      kgAudit,
      diffKgAudit,
      diffQtyInitial,
      sapFinalQty,
      actualFinalQty,
      diffAuditFinalQty,
      tonDiffFinal,
      accuracy,
      count: filteredItems.length
    };
  }, [filteredItems]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let valA: any = (a as any)[sortField];
      let valB: any = (b as any)[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedGudang, selectedSLoc, searchQuery]);

  const summary: AuditSLocSummary = useMemo(() => {
    return calculateAuditSLocSummary(filteredItems);
  }, [filteredItems]);

  const allSummary: AuditSLocSummary = useMemo(() => {
    return calculateAuditSLocSummary(items);
  }, [items]);

  const gudangRecap = useMemo(() => {
    return calculateAuditSLocGudangRecap(
      items.filter((i) => {
        if (selectedSLoc !== 'ALL' && i.sloc !== selectedSLoc) return false;
        return true;
      })
    );
  }, [items, selectedSLoc]);

  const slocRecap = useMemo(() => {
    return calculateAuditSLocRecap(
      items.filter((i) => {
        if (slocGudangFilter !== 'ALL' && i.gudang !== slocGudangFilter) return false;
        return true;
      })
    );
  }, [items, slocGudangFilter]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleExport = () => {
    const filename = `Report_Audit_SLoc_Spindo_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportAuditSLocToExcel(filteredItems, filename, summary, gudangRecap);
  };

  // WIDGET 1: AKURASI AUDIT PER GUDANG (BAR)
  const activeGudangs = useMemo(() => {
    return gudangRecap.filter((g) => g.itemCount > 0);
  }, [gudangRecap]);

  const accuracyChartData = useMemo(() => {
    const labels = activeGudangs.map((g) => g.gudang);

    const values = activeGudangs.map((g) => {
      if (accuracyMetric === 'item') {
        return Number((g.accuracyRate || 0).toFixed(1));
      }
      const baseTon = g.sapTon > 0 ? g.sapTon : g.actualTon;
      if (baseTon <= 0) return 100;
      const rate = Math.max(0, Math.min(100, (1 - Math.abs(g.varianceTon) / baseTon) * 100));
      return Number(rate.toFixed(1));
    });

    const backgroundColors = activeGudangs.map((g, idx) => {
      const val = values[idx];
      const isSelected = selectedGudang === g.gudang;
      const isAnySelected = selectedGudang !== 'ALL';

      if (val >= 95) {
        return isAnySelected && !isSelected ? 'rgba(16, 185, 129, 0.25)' : '#10b981';
      }
      if (val >= 85) {
        return isAnySelected && !isSelected ? 'rgba(245, 158, 11, 0.25)' : '#f59e0b';
      }
      return isAnySelected && !isSelected ? 'rgba(239, 68, 68, 0.25)' : '#ef4444';
    });

    const borderColors = activeGudangs.map((g, idx) => {
      const isSelected = selectedGudang === g.gudang;
      if (isSelected) return '#0f172a';

      const val = values[idx];
      if (val >= 95) return '#059669';
      if (val >= 85) return '#d97706';
      return '#dc2626';
    });

    const borderWidths = activeGudangs.map((g) => {
      return selectedGudang === g.gudang ? 2 : 1;
    });

    const hoverColors = activeGudangs.map((_, idx) => {
      const val = values[idx];
      if (val >= 95) return '#059669';
      if (val >= 85) return '#d97706';
      return '#dc2626';
    });

    return {
      labels,
      datasets: [
        {
          label: accuracyMetric === 'item' ? 'Akurasi Item (%)' : 'Akurasi Tonase (%)',
          data: values,
          backgroundColor: backgroundColors,
          hoverBackgroundColor: hoverColors,
          borderColor: borderColors,
          borderWidth: borderWidths,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: selectedGudang !== 'ALL' ? 48 : 36,
          barPercentage: 0.65,
          categoryPercentage: 0.8,
        },
      ],
    };
  }, [activeGudangs, accuracyMetric, selectedGudang]);

  const accuracyDataLabelsPlugin = useMemo(() => ({
    id: 'aslocAccuracyDataLabels',
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta || meta.hidden) return;
        meta.data.forEach((element: any, index: number) => {
          const val = dataset.data[index];
          if (element && typeof val === 'number') {
            const text = `${val.toFixed(1)}%`;
            ctx.save();
            ctx.font = 'bold 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
            ctx.fillStyle = val >= 95 ? '#047857' : val >= 85 ? '#b45309' : '#b91c1c';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(text, element.x, Math.max(element.y - 4, 12));
            ctx.restore();
          }
        });
      });
    },
  }), []);

  const accuracyChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 20,
        },
      },
      onClick: (_event: any, elements: any[]) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const clickedGudang = activeGudangs[index]?.gudang;
        if (!clickedGudang) return;

        if (selectedGudang === clickedGudang) {
          setSelectedGudang('ALL');
        } else {
          setSelectedGudang(clickedGudang);
          const tableEl = document.getElementById('table-asloc-detail');
          if (tableEl) {
            tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      },
      onHover: (event: any, chartElement: any[]) => {
        if (event.native?.target) {
          event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          titleColor: '#f8fafc',
          bodyColor: '#f1f5f9',
          titleFont: { size: 12, weight: 'bold' as const },
          bodyFont: { size: 11 },
          padding: { top: 10, bottom: 10, left: 14, right: 14 },
          cornerRadius: 8,
          boxPadding: 4,
          usePointStyle: true,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderWidth: 1,
          callbacks: {
            title: (tooltipItems: any[]) => {
              if (!tooltipItems.length) return '';
              const gName = tooltipItems[0].label;
              return `Gudang ${gName} • Status Akurasi Audit`;
            },
            label: (context: any) => {
              const val = context.parsed.y || 0;
              const typeLabel = accuracyMetric === 'item' ? 'Akurasi Item' : 'Akurasi Tonase';
              return ` ${typeLabel}: ${Number(val).toFixed(1)}%`;
            },
            afterBody: (context: any) => {
              const idx = context[0]?.dataIndex;
              const g = activeGudangs[idx];
              if (!g) return [];
              return [
                `• Item Sesuai: ${g.matchingCount} / ${g.itemCount} item (${g.matchingTon.toFixed(2)} T)`,
                `• Selisih (-): ${g.minusCount} item (${g.minusTon.toFixed(2)} T)`,
                `• Selisih (+): ${g.plusCount} item (${g.plusTon.toFixed(2)} T)`,
                `• SAP Final: ${g.sapTon.toFixed(2)} T | Actual Final: ${g.actualTon.toFixed(2)} T`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#475569',
            font: { family: 'ui-monospace, monospace', size: 11, weight: 'bold' as const },
          },
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: 105,
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'ui-monospace, monospace', size: 10 },
            stepSize: 25,
            callback: (val: any) => (val <= 100 ? `${val}%` : ''),
          },
        },
      },
    };
  }, [activeGudangs, accuracyMetric, selectedGudang]);

  // WIDGET 2: KOMPARASI SAP VS ACTUAL (BAR)
  const compareChartData = useMemo(() => {
    const activeCompareGudangs = gudangRecap.filter((g) => g.sapTon > 0 || g.actualTon > 0 || g.itemCount > 0);
    const labels = activeCompareGudangs.map((g) => g.gudang);

    if (compareMetric === 'all') {
      const itemValues = activeCompareGudangs.map((g) => {
        const base = g.sapItemCount && g.sapItemCount > 0 ? g.sapItemCount : g.itemCount;
        if (base <= 0) return 100;
        const rate = ((g.actualItemCount ?? 0) / base) * 100;
        return Number(Math.min(100, Math.max(0, rate)).toFixed(1));
      });

      const qtyValues = activeCompareGudangs.map((g) => {
        if (g.sapQty <= 0) return 100;
        const rate = (g.actualQty / g.sapQty) * 100;
        return Number(Math.min(100, Math.max(0, rate)).toFixed(1));
      });

      const tonValues = activeCompareGudangs.map((g) => {
        if (g.sapTon <= 0) return 100;
        const rate = (g.actualTon / g.sapTon) * 100;
        return Number(Math.min(100, Math.max(0, rate)).toFixed(1));
      });

      return {
        labels,
        datasets: [
          {
            label: 'Item (%)',
            data: itemValues,
            backgroundColor: 'rgba(99, 102, 241, 0.85)',
            borderColor: '#4f46e5',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: selectedGudang !== 'ALL' ? 44 : 34,
            barPercentage: 0.9,
            categoryPercentage: 0.88,
          },
          {
            label: 'Qty Pcs (%)',
            data: qtyValues,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#059669',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: selectedGudang !== 'ALL' ? 44 : 34,
            barPercentage: 0.9,
            categoryPercentage: 0.88,
          },
          {
            label: 'Tonase (%)',
            data: tonValues,
            backgroundColor: 'rgba(14, 165, 233, 0.85)',
            borderColor: '#0284c7',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: selectedGudang !== 'ALL' ? 44 : 34,
            barPercentage: 0.9,
            categoryPercentage: 0.88,
          },
        ],
      };
    }

    const sapValues = activeCompareGudangs.map((g) => {
      if (compareMetric === 'ton') return Number(g.sapTon.toFixed(2));
      if (compareMetric === 'qty') return g.sapQty;
      return g.sapItemCount ?? 0;
    });
    const actualValues = activeCompareGudangs.map((g) => {
      if (compareMetric === 'ton') return Number(g.actualTon.toFixed(2));
      if (compareMetric === 'qty') return g.actualQty;
      return g.actualItemCount ?? 0;
    });

    const getMetricLabel = (entity: 'SAP Final' | 'Actual Final') => {
      if (compareMetric === 'ton') return `${entity} (Ton)`;
      if (compareMetric === 'qty') return `${entity} (Pcs)`;
      return `${entity} (Item)`;
    };

    return {
      labels,
      datasets: [
        {
          label: getMetricLabel('SAP Final'),
          data: sapValues,
          backgroundColor: 'rgba(100, 116, 139, 0.85)',
          borderColor: '#475569',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: selectedGudang !== 'ALL' ? 48 : 36,
          barPercentage: 0.8,
          categoryPercentage: 0.8,
        },
        {
          label: getMetricLabel('Actual Final'),
          data: actualValues,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#059669',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: selectedGudang !== 'ALL' ? 48 : 36,
          barPercentage: 0.8,
          categoryPercentage: 0.8,
        },
      ],
    };
  }, [gudangRecap, compareMetric, selectedGudang]);

  const compareMetricRef = useRef(compareMetric);
  useEffect(() => {
    compareMetricRef.current = compareMetric;
  }, [compareMetric]);

  const compareDataLabelsPlugin = useMemo(
    () => ({
      id: 'aslocCompareDataLabels',
      afterDatasetsDraw(chart: any) {
        const currentMetric = compareMetricRef.current;
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (!meta || meta.hidden) return;
          meta.data.forEach((element: any, index: number) => {
            const val = dataset.data[index];
            if (element && typeof val === 'number') {
              let text = '';
              let fillStyle = '#475569';

              if (currentMetric === 'all') {
                text = `${val.toFixed(1)}%`;
                fillStyle = datasetIndex === 0 ? '#4338ca' : datasetIndex === 1 ? '#047857' : '#0369a1';
              } else if (currentMetric === 'ton') {
                text = `${val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} T`;
                fillStyle = datasetIndex === 0 ? '#475569' : '#047857';
              } else if (currentMetric === 'qty') {
                text = val >= 1000 ? `${(val / 1000).toFixed(0)}k Pcs` : `${Math.round(val).toLocaleString('id-ID')} Pcs`;
                fillStyle = datasetIndex === 0 ? '#475569' : '#047857';
              } else if (currentMetric === 'item') {
                text = `${Math.round(val).toLocaleString('id-ID')} Item`;
                fillStyle = datasetIndex === 0 ? '#475569' : '#047857';
              }

              ctx.save();
              ctx.font = 'bold 9px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.fillStyle = fillStyle;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText(text, element.x, Math.max(element.y - 4, 12));
              ctx.restore();
            }
          });
        });
      },
    }),
    []
  );

  const compareChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 24,
        },
      },
      onClick: (_event: any, elements: any[]) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const clickedGudang = activeGudangs[index]?.gudang;
        if (!clickedGudang) return;

        if (selectedGudang === clickedGudang) {
          setSelectedGudang('ALL');
        } else {
          setSelectedGudang(clickedGudang);
          const tableEl = document.getElementById('table-asloc-detail');
          if (tableEl) {
            tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      },
      onHover: (event: any, chartElement: any[]) => {
        if (event.native?.target) {
          event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
        }
      },
      plugins: {
        legend: { display: false },
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
            title: (itemsTitle: any[]) => {
              if (!itemsTitle.length) return '';
              const gName = itemsTitle[0].label;
              if (compareMetric === 'all') {
                return `Gudang ${gName} • Komparasi Item, Qty, Tonase`;
              }
              const metricLabel =
                compareMetric === 'ton' ? 'Tonase' : compareMetric === 'qty' ? 'Kuantitas (Pcs)' : 'Jumlah Item';
              return `Gudang ${gName} • Komparasi ${metricLabel}`;
            },
            label: (context: any) => {
              const val = context.raw;
              if (compareMetric === 'all') {
                return ` ${context.dataset.label}: ${val}% kesesuaian`;
              }
              const unit = compareMetric === 'ton' ? 'Ton' : compareMetric === 'qty' ? 'Pcs' : 'Item';
              return ` ${context.dataset.label}: ${Number(val).toLocaleString('id-ID')} ${unit}`;
            },
            afterBody: (context: any) => {
              const idx = context[0]?.dataIndex;
              const g = activeGudangs[idx];
              if (!g) return [];
              if (compareMetric === 'all') {
                const sapItems = g.sapItemCount ?? 0;
                const actItems = g.actualItemCount ?? 0;
                const diffItems = actItems - sapItems;
                const diffQty = g.actualQty - g.sapQty;
                const diffTon = g.actualTon - g.sapTon;
                return [
                  `• Item: Actual ${actItems.toLocaleString('id-ID')} / SAP ${sapItems.toLocaleString('id-ID')} (${((actItems / (sapItems || 1)) * 100).toFixed(1)}% | ${diffItems >= 0 ? '+' : ''}${diffItems} item)`,
                  `• Qty: Actual ${g.actualQty.toLocaleString('id-ID')} / SAP ${g.sapQty.toLocaleString('id-ID')} Pcs (${((g.actualQty / (g.sapQty || 1)) * 100).toFixed(1)}% | ${diffQty >= 0 ? '+' : ''}${diffQty.toLocaleString('id-ID')} Pcs)`,
                  `• Tonase: Actual ${g.actualTon.toFixed(2)} / SAP ${g.sapTon.toFixed(2)} Ton (${((g.actualTon / (g.sapTon || 1)) * 100).toFixed(1)}% | ${diffTon >= 0 ? '+' : ''}${diffTon.toFixed(2)} Ton)`,
                ];
              }
              if (compareMetric === 'item') {
                const sapItems = g.sapItemCount ?? 0;
                const actItems = g.actualItemCount ?? 0;
                const diffItems = actItems - sapItems;
                return [
                  `• Total Baris Item: ${g.itemCount.toLocaleString('id-ID')} item`,
                  `• Selisih Item: ${diffItems >= 0 ? '+' : ''}${diffItems.toLocaleString('id-ID')} item`,
                  `• Item Sesuai (0): ${g.matchingCount.toLocaleString('id-ID')} item`,
                  `• Item Selisih (-): ${g.minusCount.toLocaleString('id-ID')} item`,
                  `• Item Selisih (+): ${g.plusCount.toLocaleString('id-ID')} item`,
                ];
              }
              if (compareMetric === 'qty') {
                return [
                  `• Selisih Pcs: ${g.varianceQty >= 0 ? '+' : ''}${g.varianceQty.toLocaleString('id-ID')} Pcs`,
                  `• Akurasi Item: ${(g.accuracyRate || 0).toFixed(1)}%`,
                ];
              }
              return [
                `• Selisih Ton: ${g.varianceTon >= 0 ? '+' : ''}${g.varianceTon.toFixed(2)} Ton`,
                `• Akurasi Item: ${(g.accuracyRate || 0).toFixed(1)}%`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748b',
            font: { family: 'ui-monospace, monospace', size: 11, weight: 'bold' as const },
          },
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: compareMetric === 'all' ? 108 : undefined,
          grace: compareMetric === 'all' ? undefined : '14%',
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'ui-monospace, monospace', size: 10 },
            callback: (val: any) => {
              if (compareMetric === 'all') return val <= 100 ? `${val}%` : '';
              if (compareMetric === 'ton') return `${val} T`;
              if (compareMetric === 'qty') return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val} Pcs`;
              return `${val} Item`;
            },
          },
        },
      },
    };
  }, [compareMetric, activeGudangs, selectedGudang]);

  // WIDGET 3: DEVIASI & AKURASI PER SLOC (BAR)
  const sortedSLocs = useMemo(() => {
    return [...slocRecap].sort((a, b) => {
      if (slocMetric === 'percent') {
        return (a.accuracyRate || 0) - (b.accuracyRate || 0);
      }
      const valA = slocMetric === 'ton' ? (a.minusTon + a.plusTon) : (a.minusQty + a.plusQty);
      const valB = slocMetric === 'ton' ? (b.minusTon + b.plusTon) : (b.minusQty + b.plusQty);
      return valB - valA;
    });
  }, [slocRecap, slocMetric]);

  const displaySLocs = useMemo(() => {
    if (slocMetric === 'percent') {
      if (slocDiffOnly) {
        return sortedSLocs.filter((s) => s.minusCount > 0 || s.plusCount > 0);
      }
      return sortedSLocs;
    }

    if (slocFilterMode === 'minus') {
      return [...slocRecap]
        .filter((s) => s.minusCount > 0 || s.minusTon > 0 || s.minusQty > 0)
        .sort((a, b) => {
          const valA = slocMetric === 'ton' ? a.minusTon : a.minusQty;
          const valB = slocMetric === 'ton' ? b.minusTon : b.minusQty;
          return valB - valA;
        });
    }

    if (slocFilterMode === 'plus') {
      return [...slocRecap]
        .filter((s) => s.plusCount > 0 || s.plusTon > 0 || s.plusQty > 0)
        .sort((a, b) => {
          const valA = slocMetric === 'ton' ? a.plusTon : a.plusQty;
          const valB = slocMetric === 'ton' ? b.plusTon : b.plusQty;
          return valB - valA;
        });
    }

    if (slocDiffOnly) {
      return sortedSLocs.filter((s) => s.minusCount > 0 || s.plusCount > 0);
    }
    return sortedSLocs;
  }, [sortedSLocs, slocRecap, slocFilterMode, slocMetric, slocDiffOnly]);

  const slocChartData = useMemo(() => {
    const labels = displaySLocs.map((s) =>
      slocGudangFilter === 'ALL' ? `${s.sloc} (${s.gudang})` : s.sloc
    );

    const isAnySelected = selectedSLoc !== 'ALL';

    if (slocMetric === 'percent') {
      const dataValues = displaySLocs.map((s) => Number((s.accuracyRate || 0).toFixed(1)));
      const backgroundColors = displaySLocs.map((s) => {
        const isSelected = selectedSLoc === s.sloc;
        const v = s.accuracyRate || 0;
        if (v >= 95) return isAnySelected && !isSelected ? 'rgba(16, 185, 129, 0.25)' : '#10b981';
        if (v >= 85) return isAnySelected && !isSelected ? 'rgba(245, 158, 11, 0.25)' : '#f59e0b';
        return isAnySelected && !isSelected ? 'rgba(239, 68, 68, 0.25)' : '#ef4444';
      });

      const borderColors = displaySLocs.map((s) => {
        const isSelected = selectedSLoc === s.sloc;
        if (isSelected) return '#0f172a';
        const v = s.accuracyRate || 0;
        if (v >= 95) return '#059669';
        if (v >= 85) return '#d97706';
        return '#dc2626';
      });

      const borderWidths = displaySLocs.map((s) => (selectedSLoc === s.sloc ? 2.5 : 1.5));

      const hoverColors = displaySLocs.map((s) => {
        const v = s.accuracyRate || 0;
        if (v >= 95) return '#059669';
        if (v >= 85) return '#d97706';
        return '#dc2626';
      });

      return {
        labels,
        datasets: [
          {
            label: 'Akurasi SLoc (%)',
            data: dataValues,
            backgroundColor: backgroundColors,
            hoverBackgroundColor: hoverColors,
            borderColor: borderColors,
            borderWidth: borderWidths,
            borderRadius: 4,
            maxBarThickness: selectedSLoc !== 'ALL' ? 44 : 32,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
        ],
      };
    }

    const datasets: any[] = [];

    if (slocFilterMode === 'all' || slocFilterMode === 'minus') {
      const minusData = displaySLocs.map((s) => {
        if (slocMetric === 'ton') return Number(s.minusTon.toFixed(2));
        return s.minusQty;
      });

      datasets.push({
        label: slocMetric === 'ton' ? 'Selisih Minus (Ton)' : 'Selisih Minus (Pcs)',
        data: minusData,
        backgroundColor: displaySLocs.map((s) => {
          const isSelected = selectedSLoc === s.sloc;
          return isAnySelected && !isSelected ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.85)';
        }),
        borderColor: displaySLocs.map((s) => (selectedSLoc === s.sloc ? '#0f172a' : '#dc2626')),
        borderWidth: displaySLocs.map((s) => (selectedSLoc === s.sloc ? 2.5 : 1)),
        borderRadius: 4,
        maxBarThickness: 32,
        barPercentage: slocFilterMode === 'all' ? 0.85 : 0.7,
        categoryPercentage: 0.8,
      });
    }

    if (slocFilterMode === 'all' || slocFilterMode === 'plus') {
      const plusData = displaySLocs.map((s) => {
        if (slocMetric === 'ton') return Number(s.plusTon.toFixed(2));
        return s.plusQty;
      });

      datasets.push({
        label: slocMetric === 'ton' ? 'Selisih Plus (Ton)' : 'Selisih Plus (Pcs)',
        data: plusData,
        backgroundColor: displaySLocs.map((s) => {
          const isSelected = selectedSLoc === s.sloc;
          return isAnySelected && !isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.85)';
        }),
        borderColor: displaySLocs.map((s) => (selectedSLoc === s.sloc ? '#0f172a' : '#d97706')),
        borderWidth: displaySLocs.map((s) => (selectedSLoc === s.sloc ? 2.5 : 1)),
        borderRadius: 4,
        maxBarThickness: 32,
        barPercentage: slocFilterMode === 'all' ? 0.85 : 0.7,
        categoryPercentage: 0.8,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [displaySLocs, slocMetric, slocFilterMode, slocGudangFilter, selectedSLoc]);

  const slocMetricRef = useRef(slocMetric);
  useEffect(() => {
    slocMetricRef.current = slocMetric;
  }, [slocMetric]);

  const slocFilterModeRef = useRef(slocFilterMode);
  useEffect(() => {
    slocFilterModeRef.current = slocFilterMode;
  }, [slocFilterMode]);

  const slocDataLabelsPlugin = useMemo(() => ({
    id: 'aslocSlocDataLabels',
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart;
      const currentMetric = slocMetricRef.current;
      const currentMode = slocFilterModeRef.current;

      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta || meta.hidden) return;

        meta.data.forEach((element: any, index: number) => {
          const val = dataset.data[index];
          if (!element || typeof val !== 'number') return;
          if (currentMetric !== 'percent' && val <= 0) return;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          if (currentMetric === 'percent') {
            const text = `${val.toFixed(1)}%`;
            ctx.font = 'bold 9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
            ctx.fillStyle = val >= 95 ? '#047857' : val >= 85 ? '#b45309' : '#b91c1c';
            ctx.fillText(text, element.x, Math.max(element.y - 4, 12));
          } else {
            const unit = currentMetric === 'ton' ? 'T' : 'Pcs';
            const isMinus = dataset.label?.includes('Minus') || (currentMode === 'all' && datasetIndex === 0);
            const sign = isMinus ? '-' : '+';
            const valFormatted =
              currentMetric === 'ton'
                ? val.toFixed(1)
                : Math.round(val).toLocaleString('id-ID');
            const text = `${sign}${valFormatted} ${unit}`;

            let yOffset = -4;
            if (currentMode === 'all' && datasetIndex === 1 && chart.data.datasets.length > 1) {
              const minusVal = chart.data.datasets[0]?.data?.[index];
              const minusMeta = chart.getDatasetMeta(0);
              const minusEl = minusMeta?.data?.[index];
              if (minusEl && typeof minusVal === 'number' && minusVal > 0) {
                const diffY = Math.abs(element.y - minusEl.y);
                if (diffY < 24) {
                  yOffset = -17;
                }
              }
            }

            ctx.font = 'bold 8.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
            ctx.fillStyle = isMinus ? '#e11d48' : '#d97706';
            ctx.fillText(text, element.x, Math.max(element.y + yOffset, 12));
          }

          ctx.restore();
        });
      });
    },
  }), []);

  const slocChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 24,
          bottom: 6,
          left: 4,
          right: 4,
        },
      },
      onClick: (_event: any, elements: any[]) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const clickedSLoc = displaySLocs[index]?.sloc;
        if (!clickedSLoc) return;

        if (selectedSLoc === clickedSLoc) {
          setSelectedSLoc('ALL');
        } else {
          setSelectedSLoc(clickedSLoc);
          const tableEl = document.getElementById('table-asloc-detail');
          if (tableEl) {
            tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      },
      onHover: (event: any, chartElement: any[]) => {
        if (event.native?.target) {
          event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
        }
      },
      plugins: {
        legend: { display: false },
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
            title: (tooltipItems: any[]) => {
              if (!tooltipItems.length) return '';
              const idx = tooltipItems[0].dataIndex;
              const s = displaySLocs[idx];
              return s ? `SLoc ${s.sloc} (${s.gudang})` : tooltipItems[0].label;
            },
            label: (context: any) => {
              const val = context.raw;
              if (slocMetric === 'percent') {
                return ` Akurasi: ${val}%`;
              }
              const unit = slocMetric === 'ton' ? 'Ton' : 'Pcs';
              return ` ${context.dataset.label}: ${Number(val).toLocaleString('id-ID')} ${unit}`;
            },
            afterBody: (context: any) => {
              const idx = context[0]?.dataIndex;
              const s = displaySLocs[idx];
              if (!s) return [];
              return [
                `• Akurasi: ${(s.accuracyRate || 0).toFixed(1)}% (${s.matchingCount} / ${s.itemCount} item)`,
                `• Selisih (-): ${s.minusCount} item (${s.minusTon.toFixed(2)} T | ${s.minusQty.toLocaleString('id-ID')} Pcs)`,
                `• Selisih (+): ${s.plusCount} item (${s.plusTon.toFixed(2)} T | ${s.plusQty.toLocaleString('id-ID')} Pcs)`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748b',
            font: { family: 'ui-monospace, monospace', size: 10, weight: 'bold' as const },
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: slocMetric === 'percent' ? 105 : undefined,
          grace: slocMetric === 'percent' ? undefined : '14%',
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'ui-monospace, monospace', size: 10 },
            callback: (val: any) => {
              if (slocMetric === 'percent') return val <= 100 ? `${val}%` : '';
              if (slocMetric === 'ton') return `${val} T`;
              return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`;
            },
          },
        },
      },
    };
  }, [displaySLocs, slocMetric, selectedSLoc]);

  // WIDGET 4: PROPORSI STATUS AUDIT (DOUGHNUT)
  const donutChartData = useMemo(() => {
    return {
      labels: ['Sesuai', 'Selisih Minus (-)', 'Selisih Plus (+)'],
      datasets: [
        {
          data: [summary.matchingItems, summary.minusItems, summary.plusItems],
          backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
          hoverBackgroundColor: ['#059669', '#dc2626', '#d97706'],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }, [summary]);

  const donutChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
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
            label: (context: any) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = summary.totalItems;
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return ` ${label}: ${value} item (${pct}%)`;
            },
          },
        },
      },
    };
  }, [summary]);

  // WIDGET 5: RIWAYAT AUDIT PER PERIODE (BAR/LINE)
  const periodChartData = useMemo(() => {
    if (auditPeriods.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = auditPeriods.map((p) => p.label || p.lastUpdated);

    const periodValues = auditPeriods.map((p) => {
      if (selectedGudang !== 'ALL' && p.gudangBreakdown?.[selectedGudang]) {
        const g = p.gudangBreakdown[selectedGudang];
        return {
          accuracy: Number((g.accuracyRate || 0).toFixed(1)),
          sapTon: Number((g.sapTon || 0).toFixed(2)),
          actualTon: Number((g.actualTon || 0).toFixed(2)),
          varianceTon: Number((g.varianceTon || 0).toFixed(2)),
          sapQty: g.sapQty || 0,
          actualQty: g.actualQty || 0,
          varianceQty: (g.actualQty || 0) - (g.sapQty || 0),
          itemCount: g.itemCount || 0,
          matchingCount: g.matchingCount || 0,
        };
      }
      return {
        accuracy: Number((p.accuracyRate || 0).toFixed(1)),
        sapTon: Number((p.sapTon || 0).toFixed(2)),
        actualTon: Number((p.actualTon || 0).toFixed(2)),
        varianceTon: Number((p.varianceTon || 0).toFixed(2)),
        sapQty: p.sapQty || 0,
        actualQty: p.actualQty || 0,
        varianceQty: p.varianceQty || 0,
        itemCount: p.totalItems || 0,
        matchingCount: p.matchingCount || 0,
      };
    });

    if (periodMetric === 'all') {
      return {
        labels,
        datasets: [
          {
            type: 'bar' as const,
            label: 'SAP Final (Ton)',
            data: periodValues.map((v) => v.sapTon),
            backgroundColor: 'rgba(100, 116, 139, 0.85)',
            borderColor: '#475569',
            borderWidth: 1,
            borderRadius: 5,
            maxBarThickness: 44,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'bar' as const,
            label: 'Actual Final (Ton)',
            data: periodValues.map((v) => v.actualTon),
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#059669',
            borderWidth: 1,
            borderRadius: 5,
            maxBarThickness: 44,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line' as const,
            label: 'Akurasi Audit (%)',
            data: periodValues.map((v) => v.accuracy),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            borderWidth: 2.5,
            tension: 0.25,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      };
    }

    if (periodMetric === 'ton') {
      return {
        labels,
        datasets: [
          {
            type: 'bar' as const,
            label: 'SAP Final (Ton)',
            data: periodValues.map((v) => v.sapTon),
            backgroundColor: 'rgba(100, 116, 139, 0.85)',
            borderColor: '#475569',
            borderWidth: 1,
            borderRadius: 5,
            maxBarThickness: 44,
            yAxisID: 'y',
          },
          {
            type: 'bar' as const,
            label: 'Actual Final (Ton)',
            data: periodValues.map((v) => v.actualTon),
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#059669',
            borderWidth: 1,
            borderRadius: 5,
            maxBarThickness: 44,
            yAxisID: 'y',
          },
        ],
      };
    }

    if (periodMetric === 'qty') {
      return {
        labels,
        datasets: [
          {
            type: 'bar' as const,
            label: 'SAP Final (Pcs)',
            data: periodValues.map((v) => v.sapQty),
            backgroundColor: 'rgba(100, 116, 139, 0.85)',
            borderColor: '#475569',
            borderWidth: 1,
            borderRadius: 5,
            maxBarThickness: 44,
            yAxisID: 'y',
          },
          {
            type: 'bar' as const,
            label: 'Actual Final (Pcs)',
            data: periodValues.map((v) => v.actualQty),
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#059669',
            borderWidth: 1,
            borderRadius: 5,
            maxBarThickness: 44,
            yAxisID: 'y',
          },
        ],
      };
    }

    if (periodMetric === 'accuracy') {
      return {
        labels,
        datasets: [
          {
            type: 'line' as const,
            label: 'Akurasi Audit (%)',
            data: periodValues.map((v) => v.accuracy),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            fill: true,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            borderWidth: 3,
            tension: 0.3,
            yAxisID: 'y',
          },
        ],
      };
    }

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Total Item Terdaftar',
          data: periodValues.map((v) => v.itemCount),
          backgroundColor: 'rgba(100, 116, 139, 0.85)',
          borderColor: '#475569',
          borderWidth: 1,
          borderRadius: 5,
          maxBarThickness: 44,
          yAxisID: 'y',
        },
        {
          type: 'bar' as const,
          label: 'Item Sesuai (Akurat)',
          data: periodValues.map((v) => v.matchingCount),
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#059669',
          borderWidth: 1,
          borderRadius: 5,
          maxBarThickness: 44,
          yAxisID: 'y',
        },
      ],
    };
  }, [auditPeriods, periodMetric, selectedGudang]);

  const periodMetricRef = useRef(periodMetric);
  useEffect(() => {
    periodMetricRef.current = periodMetric;
  }, [periodMetric]);

  const periodDataLabelsPlugin = useMemo(
    () => ({
      id: 'aslocPeriodDataLabels',
      afterDatasetsDraw(chart: any) {
        const currentMetric = periodMetricRef.current;
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (!meta || meta.hidden) return;
          meta.data.forEach((element: any, index: number) => {
            const val = dataset.data[index];
            if (element && typeof val === 'number') {
              let text = '';
              let fillStyle = '#475569';
              let yOffset = -9;

              if (currentMetric === 'all') {
                if (dataset.type === 'line') {
                  text = `${val.toFixed(1)}%`;
                  fillStyle = '#4f46e5';
                  yOffset = -14;
                } else if (datasetIndex === 0) {
                  text = `${val.toLocaleString('id-ID', { maximumFractionDigits: 1 })} T`;
                  fillStyle = '#475569';
                } else {
                  text = `${val.toLocaleString('id-ID', { maximumFractionDigits: 1 })} T`;
                  fillStyle = '#047857';
                }
              } else if (currentMetric === 'ton') {
                text = `${val.toLocaleString('id-ID', { maximumFractionDigits: 1 })} T`;
                fillStyle = datasetIndex === 0 ? '#475569' : '#047857';
              } else if (currentMetric === 'qty') {
                text = val >= 1000 ? `${(val / 1000).toFixed(0)}k Pcs` : `${Math.round(val).toLocaleString('id-ID')} Pcs`;
                fillStyle = datasetIndex === 0 ? '#475569' : '#047857';
              } else if (currentMetric === 'accuracy') {
                text = `${val.toFixed(1)}%`;
                fillStyle = '#4f46e5';
                yOffset = -14;
              } else if (currentMetric === 'item') {
                text = `${Math.round(val).toLocaleString('id-ID')} Item`;
                fillStyle = datasetIndex === 0 ? '#475569' : '#047857';
              }

              ctx.save();
              ctx.font = 'bold 9.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
              ctx.fillStyle = fillStyle;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, element.x, element.y + yOffset);
              ctx.restore();
            }
          });
        });
      },
    }),
    []
  );

  const periodChartOptions = useMemo(() => {
    const isCombo = periodMetric === 'all';
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          align: 'end' as const,
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 3,
            usePointStyle: isCombo,
            font: {
              family: 'ui-sans-serif, system-ui, sans-serif',
              size: 11,
              weight: 600,
            },
            color: '#475569',
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: 'ui-sans-serif, system-ui, sans-serif', size: 12, weight: 'bold' as const },
          bodyFont: { family: 'ui-monospace, SFMono-Regular, monospace', size: 11 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label(context: any) {
              const val = context.raw;
              const label = context.dataset.label || '';
              if (label.includes('%')) {
                return ` ${label}: ${Number(val).toFixed(1)}%`;
              }
              if (label.includes('Ton')) {
                return ` ${label}: ${Number(val).toFixed(2)} Ton`;
              }
              if (label.includes('Pcs')) {
                return ` ${label}: ${Number(val).toLocaleString('id-ID')} Pcs`;
              }
              return ` ${label}: ${Number(val).toLocaleString('id-ID')} Item`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#475569',
            font: { family: 'ui-monospace, monospace', size: 11, weight: 'bold' as const },
          },
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'ui-monospace, monospace', size: 10 },
            callback(val: any) {
              if (periodMetric === 'accuracy') return `${val}%`;
              if (periodMetric === 'qty') return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`;
              if (periodMetric === 'item') return `${val}`;
              return `${val} T`;
            },
          },
        },
        ...(isCombo
          ? {
              y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                beginAtZero: true,
                min: 0,
                max: 105,
                grid: { drawOnChartArea: false },
                ticks: {
                  color: '#6366f1',
                  font: { family: 'ui-monospace, monospace', size: 10, weight: 'bold' as const },
                  callback(val: any) {
                    return `${val}%`;
                  },
                },
              },
            }
          : {}),
      },
    };
  }, [periodMetric]);

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-emerald-600 font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-600 font-bold" />
    );
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <MapPinCheck className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-sans tracking-tight">
              Audit SLoc Harian
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleExport}
            title="Ekspor data ke Excel"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 hover:text-white border border-emerald-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Top 5 KPI Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Item */}
        <div className="group relative bg-gradient-to-b from-slate-50/80 via-white to-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Item Audit</span>
            <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200/60 group-hover:scale-110 transition-transform duration-200">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">{formatQty(summary.totalItems)}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200/70">100%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1 mt-2.5 overflow-hidden">
            <div className="bg-slate-400 h-full rounded-full w-full" />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 truncate">Total record audit SAP</p>
        </div>

        {/* Sesuai / Akurat */}
        <div className="group relative bg-gradient-to-b from-emerald-50/70 via-emerald-50/20 to-white rounded-2xl p-4 border border-emerald-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
            <span>Sesuai (Akurat)</span>
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200/80 group-hover:scale-110 transition-transform duration-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-700">{formatQty(summary.matchingItems)}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300/80 shadow-2xs">
              {summary.accuracyRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, summary.accuracyRate))}%` }}
            />
          </div>
          <p className="text-[10px] text-emerald-600/80 mt-1.5 truncate">Selisih = 0 (SAP Final = Actual Final)</p>
        </div>

        {/* Selisih Minus */}
        <div className="group relative bg-gradient-to-b from-rose-50/70 via-rose-50/20 to-white rounded-2xl p-4 border border-rose-200/90 shadow-xs hover:shadow-md hover:border-rose-300 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 text-xs font-medium">
            <span>Selisih Minus (-)</span>
            <div className="p-1.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200/80 group-hover:scale-110 transition-transform duration-200">
              <MinusCircle className="h-3.5 w-3.5 text-rose-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tracking-tight text-rose-700">{formatQty(summary.minusItems)}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-100 text-rose-800 border border-rose-300/80 shadow-2xs">
              -{formatTon(summary.totalMinusTon)} T
            </span>
          </div>
          <div className="w-full bg-rose-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${summary.totalItems > 0 ? Math.min(100, (summary.minusItems / summary.totalItems) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-rose-600/80 mt-1.5 truncate">Defisit (Actual Final &lt; SAP Final)</p>
        </div>

        {/* Selisih Plus */}
        <div className="group relative bg-gradient-to-b from-amber-50/70 via-amber-50/20 to-white rounded-2xl p-4 border border-amber-200/90 shadow-xs hover:shadow-md hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800 text-xs font-medium">
            <span>Selisih Plus (+)</span>
            <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200/80 group-hover:scale-110 transition-transform duration-200">
              <PlusCircle className="h-3.5 w-3.5 text-amber-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tracking-tight text-amber-700">{formatQty(summary.plusItems)}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-100 text-amber-800 border border-amber-300/80 shadow-2xs">
              +{formatTon(summary.totalPlusTon)} T
            </span>
          </div>
          <div className="w-full bg-amber-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${summary.totalItems > 0 ? Math.min(100, (summary.plusItems / summary.totalItems) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-amber-700/80 mt-1.5 truncate">Surplus (Actual Final &gt; SAP Final)</p>
        </div>

        {/* Net Variance */}
        <div className="col-span-2 sm:col-span-1 group relative bg-gradient-to-b from-slate-50/90 via-white to-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium">
            <span>Net Variance</span>
            <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200/60 group-hover:scale-110 transition-transform duration-200">
              <Scale className="h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={cn(
                'text-2xl font-bold font-mono tracking-tight',
                summary.netVarianceTon < -0.01
                  ? 'text-rose-700'
                  : summary.netVarianceTon > 0.01
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              )}
            >
              {summary.netVarianceTon >= 0 ? '+' : ''}
              {formatTon(summary.netVarianceTon)} T
            </span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border shadow-2xs',
                summary.netVarianceQty < 0
                  ? 'bg-rose-100 text-rose-800 border-rose-300/80'
                  : summary.netVarianceQty > 0
                  ? 'bg-amber-100 text-amber-800 border-amber-300/80'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300/80'
              )}
            >
              {summary.netVarianceQty >= 0 ? '+' : ''}
              {formatQty(summary.netVarianceQty)} Pcs
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1 mt-2.5 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                summary.netVarianceTon < 0 ? 'bg-rose-500 w-1/2' : summary.netVarianceTon > 0 ? 'bg-amber-500 w-1/2' : 'bg-emerald-500 w-full'
              )}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5 truncate">Netto tonase selisih fisik vs SAP</p>
        </div>
      </div>

      {/* 3. Customizable Cards Grid (6 Widgets) */}
      <div className="grid grid-cols-12 gap-4">
        {/* CARD 1: AKURASI AUDIT PER GUDANG */}
        <CustomizableCard
          id="chart-asloc-accuracy-bar"
          title="Akurasi Audit per Gudang"
          subtitle="Tingkat kesesuaian fisik vs SAP per gudang (klik bar untuk filter)"
          icon={BarChart3}
          width={cards.find((c) => c.id === 'chart-asloc-accuracy-bar')?.width || 'col-span-6'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-asloc-accuracy-bar', w)}
          canMoveLeft={false}
          canMoveRight={true}
          onMoveRight={() => handleMove(0, 'right')}
          headerAction={
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setAccuracyMetric('item')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  accuracyMetric === 'item'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Item %
              </button>
              <button
                type="button"
                onClick={() => setAccuracyMetric('ton')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  accuracyMetric === 'ton'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Tonase %
              </button>
            </div>
          }
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/30 shrink-0" />
                    <span>Akurat (≥ 95%)</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500/30 shrink-0" />
                    <span>Sedang (85 - 94%)</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500/30 shrink-0" />
                    <span>Deviasi (&lt; 85%)</span>
                  </div>
                </div>
              </div>

              <div className={cn('w-full pt-1', expanded ? 'flex-1 min-h-[440px]' : 'h-56 sm:h-64')}>
                {activeGudangs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <BarChart3 className="h-7 w-7 text-slate-300 mb-1.5 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">
                      Belum ada data akurasi audit gudang
                    </p>
                  </div>
                ) : (
                  <Bar
                    data={accuracyChartData}
                    options={accuracyChartOptions}
                    plugins={[accuracyDataLabelsPlugin]}
                  />
                )}
              </div>
            </div>
          )}
        </CustomizableCard>

        {/* CARD 2: KOMPARASI SAP VS ACTUAL */}
        <CustomizableCard
          id="chart-asloc-compare-bar"
          title="Komparasi SAP vs Actual"
          subtitle={
            compareMetric === 'all'
              ? 'Komparasi langsung 3 metrik: Item, Kuantitas (Pcs), dan Tonase'
              : 'Komparasi saldo SAP Final terhadap Actual Final audit'
          }
          icon={Scale}
          width={cards.find((c) => c.id === 'chart-asloc-compare-bar')?.width || 'col-span-6'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-asloc-compare-bar', w)}
          canMoveLeft={true}
          canMoveRight={true}
          onMoveLeft={() => handleMove(1, 'left')}
          onMoveRight={() => handleMove(1, 'right')}
          headerAction={
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setCompareMetric('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  compareMetric === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs ring-1 ring-indigo-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setCompareMetric('ton')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  compareMetric === 'ton'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Tonase
              </button>
              <button
                type="button"
                onClick={() => setCompareMetric('qty')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  compareMetric === 'qty'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Qty Pcs
              </button>
              <button
                type="button"
                onClick={() => setCompareMetric('item')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  compareMetric === 'item'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Item
              </button>
            </div>
          }
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div>
                {compareMetric === 'all' ? (
                  <div className="flex flex-wrap items-center gap-4 mb-2.5">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 shadow-xs shadow-indigo-600/30 shrink-0" />
                      <span>Item (%)</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shadow-xs shadow-emerald-600/30 shrink-0" />
                      <span>Qty Pcs (%)</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-xs shadow-sky-500/30 shrink-0" />
                      <span>Tonase (%)</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-4 mb-2.5">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-sm bg-slate-500 shrink-0" />
                      <span>SAP Final</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shrink-0" />
                      <span>Actual Final</span>
                    </div>
                  </div>
                )}
              </div>

              <div className={cn('w-full', expanded ? 'flex-1 min-h-[440px]' : 'h-56 sm:h-64')}>
                {activeGudangs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <Scale className="h-7 w-7 text-slate-300 mb-1.5 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">
                      Belum ada data komparasi SAP vs Actual
                    </p>
                  </div>
                ) : (
                  <Bar
                    data={compareChartData}
                    options={compareChartOptions}
                    plugins={[compareDataLabelsPlugin]}
                  />
                )}
              </div>
            </div>
          )}
        </CustomizableCard>

        {/* CARD 3: DEVIASI & AKURASI PER SLOC */}
        <CustomizableCard
          id="chart-asloc-sloc-bar"
          title="Deviasi & Akurasi per SLoc"
          subtitle={
            slocMetric === 'percent'
              ? 'Tingkat akurasi audit per Storage Location'
              : 'Deviasi volume selisih (Minus vs Plus) per Storage Location'
          }
          icon={Building2}
          width={cards.find((c) => c.id === 'chart-asloc-sloc-bar')?.width || 'col-span-8'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-asloc-sloc-bar', w)}
          canMoveLeft={true}
          canMoveRight={true}
          onMoveLeft={() => handleMove(2, 'left')}
          onMoveRight={() => handleMove(2, 'right')}
          headerAction={
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={slocGudangFilter}
                onChange={(e) => setSlocGudangFilter(e.target.value)}
                className="text-[11px] font-mono bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 rounded-lg px-2 py-1 text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Gudang</option>
                {availableGudangs.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setSlocMetric('ton')}
                  className={cn(
                    'px-2 py-1 rounded-md font-bold transition-all cursor-pointer',
                    slocMetric === 'ton' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Ton
                </button>
                <button
                  type="button"
                  onClick={() => setSlocMetric('qty')}
                  className={cn(
                    'px-2 py-1 rounded-md font-bold transition-all cursor-pointer',
                    slocMetric === 'qty' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Qty
                </button>
                <button
                  type="button"
                  onClick={() => setSlocMetric('percent')}
                  className={cn(
                    'px-2 py-1 rounded-md font-bold transition-all cursor-pointer',
                    slocMetric === 'percent' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  %
                </button>
              </div>

              {slocMetric !== 'percent' && (
                <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setSlocFilterMode('all')}
                    className={cn(
                      'px-1.5 py-1 rounded-md font-bold transition-all cursor-pointer',
                      slocFilterMode === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlocFilterMode('minus')}
                    className={cn(
                      'px-1.5 py-1 rounded-md font-bold transition-all cursor-pointer',
                      slocFilterMode === 'minus' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-rose-700'
                    )}
                  >
                    Minus
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlocFilterMode('plus')}
                    className={cn(
                      'px-1.5 py-1 rounded-md font-bold transition-all cursor-pointer',
                      slocFilterMode === 'plus' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-500 hover:text-amber-800'
                    )}
                  >
                    Plus
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSlocDiffOnly(!slocDiffOnly)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer',
                  slocDiffOnly
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-white text-slate-500 border-slate-200/80 hover:text-slate-800'
                )}
                title="Hanya tampilkan SLoc yang memiliki selisih"
              >
                Selisih
              </button>
            </div>
          }
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-4">
                  {slocMetric === 'percent' ? (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Akurat (≥ 95%)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Sedang (85 - 94%)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Deviasi (&lt; 85%)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {(slocFilterMode === 'all' || slocFilterMode === 'minus') && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-sm bg-rose-500 shrink-0" />
                          <span>Defisit Minus (-)</span>
                        </div>
                      )}
                      {(slocFilterMode === 'all' || slocFilterMode === 'plus') && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500 shrink-0" />
                          <span>Surplus Plus (+)</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className={cn('w-full', expanded ? 'flex-1 min-h-[440px]' : 'h-56 sm:h-64')}>
                {displaySLocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <Building2 className="h-7 w-7 text-slate-300 mb-1.5 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">
                      Tidak ada data SLoc yang sesuai dengan filter
                    </p>
                  </div>
                ) : (
                  <Bar
                    data={slocChartData}
                    options={slocChartOptions}
                    plugins={[slocDataLabelsPlugin]}
                  />
                )}
              </div>
            </div>
          )}
        </CustomizableCard>

        {/* CARD 4: PROPORSI STATUS AUDIT */}
        <CustomizableCard
          id="chart-asloc-donut"
          title="Proporsi Status Audit"
          subtitle="Persentase akurasi & distribusi status selisih"
          icon={PieChart}
          width={cards.find((c) => c.id === 'chart-asloc-donut')?.width || 'col-span-4'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-asloc-donut', w)}
          canMoveLeft={true}
          canMoveRight={true}
          onMoveLeft={() => handleMove(3, 'left')}
          onMoveRight={() => handleMove(3, 'right')}
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div className={cn('flex items-center justify-center relative my-auto', expanded ? 'h-64 sm:h-72' : 'h-40 sm:h-44')}>
                {summary.totalItems === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-6">
                    <PieChart className="h-7 w-7 text-slate-300 mb-1.5 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">
                      Belum ada data hasil audit SLoc
                    </p>
                  </div>
                ) : (
                  <>
                    <Doughnut data={donutChartData} options={donutChartOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight">
                        {summary.accuracyRate.toFixed(1)}%
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        AKURASI
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Breakdown Pills List */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 mt-2">
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-b from-emerald-50/60 to-emerald-50/20 border border-emerald-100/90 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/30 shrink-0" />
                    <span className="text-[11px] font-semibold text-emerald-800 truncate">Sesuai</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-900 mt-1">
                    {summary.matchingItems}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-b from-rose-50/60 to-rose-50/20 border border-rose-100/90 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shadow-xs shadow-rose-500/30 shrink-0" />
                    <span className="text-[11px] font-semibold text-rose-800 truncate">Minus (-)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-900 mt-1">
                    {summary.minusItems}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-b from-amber-50/60 to-amber-50/20 border border-amber-100/90 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 shadow-xs shadow-amber-500/30 shrink-0" />
                    <span className="text-[11px] font-semibold text-amber-800 truncate">Plus (+)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-900 mt-1">
                    {summary.plusItems}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CustomizableCard>

        {/* CARD 5: RIWAYAT AUDIT PER PERIODE */}
        <CustomizableCard
          id="chart-asloc-period-trend"
          title="Riwayat Audit per Periode"
          subtitle={
            selectedGudang !== 'ALL'
              ? `Tren komparasi hasil audit SLoc antar periode untuk ${selectedGudang}`
              : 'Tren komparasi hasil rekonsiliasi antar periode Audit SLoc SAP'
          }
          icon={History}
          width={cards.find((c) => c.id === 'chart-asloc-period-trend')?.width || 'col-span-12'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-asloc-period-trend', w)}
          canMoveLeft={true}
          canMoveRight={true}
          onMoveLeft={() => handleMove(4, 'left')}
          onMoveRight={() => handleMove(4, 'right')}
          badge={
            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200/80 shadow-2xs">
              {auditPeriods.length} Periode
            </span>
          }
          headerAction={
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setPeriodMetric('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  periodMetric === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPeriodMetric('ton')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  periodMetric === 'ton'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Tonase
              </button>
              <button
                type="button"
                onClick={() => setPeriodMetric('qty')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  periodMetric === 'qty'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Qty Pcs
              </button>
              <button
                type="button"
                onClick={() => setPeriodMetric('accuracy')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  periodMetric === 'accuracy'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Akurasi %
              </button>
              <button
                type="button"
                onClick={() => setPeriodMetric('item')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer',
                  periodMetric === 'item'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Item
              </button>
            </div>
          }
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-4">
                  {periodMetric === 'all' && (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-slate-500 shrink-0" />
                        <span>SAP Final (Ton)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shrink-0" />
                        <span>Actual Final (Ton)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>Akurasi Audit (%)</span>
                      </div>
                    </>
                  )}
                  {periodMetric === 'ton' && (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-slate-500 shrink-0" />
                        <span>SAP Final (Ton)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shrink-0" />
                        <span>Actual Final (Ton)</span>
                      </div>
                    </>
                  )}
                  {periodMetric === 'qty' && (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-slate-500 shrink-0" />
                        <span>SAP Final (Pcs)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shrink-0" />
                        <span>Actual Final (Pcs)</span>
                      </div>
                    </>
                  )}
                  {periodMetric === 'accuracy' && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Tren Persentase Akurasi Audit SLoc (%)</span>
                    </div>
                  )}
                  {periodMetric === 'item' && (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-slate-500 shrink-0" />
                        <span>Total Item Terdaftar</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shrink-0" />
                        <span>Item Sesuai (Akurat)</span>
                      </div>
                    </>
                  )}
                </div>

                {selectedGudang !== 'ALL' && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    <span>Filter Gudang:</span>
                    <span className="font-bold">{selectedGudang}</span>
                  </div>
                )}
              </div>

              <div className={cn('w-full', expanded ? 'flex-1 min-h-[420px]' : 'h-64 sm:h-72')}>
                {isLoadingPeriods ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs font-medium text-slate-500">
                      Memuat riwayat data Audit SLoc per periode...
                    </p>
                  </div>
                ) : auditPeriods.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <History className="h-7 w-7 text-slate-300 mb-1.5 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">
                      Belum ada riwayat periode Audit SLoc
                    </p>
                  </div>
                ) : (
                  <Bar
                    key={`period-asloc-chart-${periodMetric}-${selectedGudang}-${auditPeriods.length}`}
                    data={periodChartData as any}
                    options={periodChartOptions as any}
                    plugins={[periodDataLabelsPlugin]}
                  />
                )}
              </div>

              {/* Period Summary Cards Grid */}
              {auditPeriods.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 pt-3.5 border-t border-slate-100 mt-3">
                  {auditPeriods.map((p) => {
                    const stats = (selectedGudang !== 'ALL' && p.gudangBreakdown?.[selectedGudang])
                      ? {
                          accuracy: p.gudangBreakdown[selectedGudang].accuracyRate,
                          sapTon: p.gudangBreakdown[selectedGudang].sapTon,
                          actualTon: p.gudangBreakdown[selectedGudang].actualTon,
                          varianceTon: p.gudangBreakdown[selectedGudang].varianceTon,
                          sapQty: p.gudangBreakdown[selectedGudang].sapQty,
                          actualQty: p.gudangBreakdown[selectedGudang].actualQty,
                          totalItems: p.gudangBreakdown[selectedGudang].itemCount,
                          matching: p.gudangBreakdown[selectedGudang].matchingCount,
                        }
                      : {
                          accuracy: p.accuracyRate,
                          sapTon: p.sapTon,
                          actualTon: p.actualTon,
                          varianceTon: p.varianceTon,
                          sapQty: p.sapQty,
                          actualQty: p.actualQty,
                          totalItems: p.totalItems,
                          matching: p.matchingCount,
                        };

                    const isHigh = stats.accuracy >= 95;
                    const isMed = stats.accuracy >= 85 && stats.accuracy < 95;

                    return (
                      <div
                        key={p.periodKey}
                        className="flex flex-col p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 transition-all duration-200 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {p.label || p.lastUpdated}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border shrink-0',
                              isHigh
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isMed
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            )}
                          >
                            {stats.accuracy.toFixed(1)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono border-t border-slate-200/60 pt-1.5">
                          <div>
                            <span className="text-slate-400 text-[10px] block">SAP Final</span>
                            <span className="font-semibold text-slate-700">{stats.sapTon.toFixed(2)} T</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Actual Final</span>
                            <span className="font-semibold text-emerald-700">{stats.actualTon.toFixed(2)} T</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Selisih Net</span>
                            <span
                              className={cn(
                                'font-bold',
                                stats.varianceTon < 0 ? 'text-rose-700' : stats.varianceTon > 0 ? 'text-amber-700' : 'text-slate-600'
                              )}
                            >
                              {stats.varianceTon >= 0 ? '+' : ''}{stats.varianceTon.toFixed(2)} T
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Item Akurat</span>
                            <span className="font-semibold text-slate-700">
                              {stats.matching}/{stats.totalItems}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CustomizableCard>

        {/* CARD 6: TABEL DETAIL HASIL REKONSILIASI AUDIT SLOC */}
        <CustomizableCard
          id="table-asloc-detail"
          title="Detail Hasil Rekonsiliasi Audit SLoc"
          icon={Table2}
          width={cards.find((c) => c.id === 'table-asloc-detail')?.width || 'col-span-12'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('table-asloc-detail', w)}
          canMoveLeft={true}
          canMoveRight={false}
          onMoveLeft={() => handleMove(5, 'left')}
        >
          {(expanded) => (
            <div className={cn('flex flex-col space-y-3', expanded && 'flex-1 h-full')}>
              {/* 4 Interactive Sub-Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 border border-slate-200/70 rounded-xl shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer',
                      activeTab === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <span>Semua Data</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                        activeTab === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200/70 text-slate-600'
                      )}
                    >
                      {items.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('SESUAI')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer',
                      activeTab === 'SESUAI'
                        ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-200/60 font-bold'
                        : 'text-slate-600 hover:text-emerald-700'
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Sesuai</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                        activeTab === 'SESUAI'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      )}
                    >
                      {allSummary.matchingItems}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('SELISIH_MINUS')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer',
                      activeTab === 'SELISIH_MINUS'
                        ? 'bg-white text-rose-700 shadow-xs ring-1 ring-rose-200/60 font-bold'
                        : 'text-slate-600 hover:text-rose-700'
                    )}
                  >
                    <MinusCircle className="h-3.5 w-3.5 text-rose-600" />
                    <span>Selisih Minus (-)</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                        activeTab === 'SELISIH_MINUS'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {allSummary.minusItems}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('SELISIH_PLUS')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer',
                      activeTab === 'SELISIH_PLUS'
                        ? 'bg-white text-amber-800 shadow-xs ring-1 ring-amber-200/60 font-bold'
                        : 'text-slate-600 hover:text-amber-800'
                    )}
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Selisih Plus (+)</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                        activeTab === 'SELISIH_PLUS'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {allSummary.plusItems}
                    </span>
                  </button>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari Material, Ukuran, Batch, SLoc, Label..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200/90 text-xs bg-slate-50/50 hover:bg-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all placeholder:text-slate-400 font-sans"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <select
                      value={selectedGudang}
                      onChange={(e) => setSelectedGudang(e.target.value)}
                      className="pl-8 pr-7 py-1.5 rounded-xl border border-slate-200/90 text-xs bg-slate-50/50 hover:bg-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all text-slate-700 font-mono cursor-pointer"
                    >
                      <option value="ALL">Semua Gudang</option>
                      {availableGudangs.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <select
                      value={selectedSLoc}
                      onChange={(e) => setSelectedSLoc(e.target.value)}
                      className="pl-8 pr-7 py-1.5 rounded-xl border border-slate-200/90 text-xs bg-slate-50/50 hover:bg-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-hidden transition-all text-slate-700 font-mono cursor-pointer"
                    >
                      <option value="ALL">Semua SLoc</option>
                      {availableSLocs.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(selectedGudang !== 'ALL' || selectedSLoc !== 'ALL' || searchQuery || activeTab !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGudang('ALL');
                        setSelectedSLoc('ALL');
                        setSearchQuery('');
                        setActiveTab('ALL');
                      }}
                      className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      title="Reset semua filter"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table Container */}
              <div
                className={cn(
                  'rounded-2xl border border-slate-200/90 overflow-auto bg-white shadow-xs',
                  expanded ? 'flex-1 max-h-none' : 'max-h-[520px]'
                )}
              >
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-slate-50/95 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider font-mono select-none">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">No</th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                        onClick={() => handleSort('sloc')}
                      >
                        <div className="flex items-center gap-1">
                          <span>SLoc / Gudang</span>
                          {renderSortIcon('sloc')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                        onClick={() => handleSort('material')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Material & Ukuran</span>
                          {renderSortIcon('material')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                        onClick={() => handleSort('batch')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Batch</span>
                          {renderSortIcon('batch')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                        onClick={() => handleSort('sapFinalQty')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>SAP (Pcs)</span>
                          {renderSortIcon('sapFinalQty')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                        onClick={() => handleSort('actualFinalQty')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Fisik (Pcs)</span>
                          {renderSortIcon('actualFinalQty')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors font-bold group"
                        onClick={() => handleSort('diffAuditFinalQty')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Selisih (Pcs)</span>
                          {renderSortIcon('diffAuditFinalQty')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                        onClick={() => handleSort('tonDiffFinal')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Selisih (Ton)</span>
                          {renderSortIcon('tonDiffFinal')}
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {paginatedItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-12 text-center text-slate-400 font-sans"
                        >
                          <MapPinCheck className="h-9 w-9 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                          <p className="font-semibold text-slate-600">Tidak ada data audit SLoc</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Coba sesuaikan kata kunci pencarian atau ubah filter gudang / tab status
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((item, idx) => {
                        const isMinus = item.status === 'SELISIH_MINUS';
                        const isPlus = item.status === 'SELISIH_PLUS';

                        return (
                          <tr
                            key={item.id || `${item.label}-${idx}`}
                            className={cn(
                              'hover:bg-slate-50/80 transition-colors duration-150',
                              isMinus && 'bg-rose-50/25 hover:bg-rose-50/50',
                              isPlus && 'bg-amber-50/25 hover:bg-amber-50/50'
                            )}
                          >
                            <td className="py-2 px-3 text-center text-slate-400 text-[11px]">
                              {(currentPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs">{item.sloc}</span>
                                <span className="text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded border border-slate-200">
                                  {item.gudang}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-xs tracking-tight">
                                  {item.material}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
                                  {item.ukuran && <span className="font-medium text-slate-600">{item.ukuran}</span>}
                                  {item.ukuran && item.materialDescription && <span>•</span>}
                                  {item.materialDescription && (
                                    <span className="truncate max-w-[220px]" title={item.materialDescription}>
                                      {item.materialDescription}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-700 font-semibold text-xs">
                              {item.batch}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-slate-800 text-xs">
                              {item.sapFinalQty.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-emerald-800 text-xs">
                              {item.actualFinalQty.toLocaleString('id-ID')}
                            </td>
                            <td
                              className={cn(
                                'py-2 px-3 text-right font-bold text-xs',
                                isMinus ? 'text-rose-600' : isPlus ? 'text-amber-700' : 'text-slate-500'
                              )}
                            >
                              {item.diffAuditFinalQty > 0 ? '+' : ''}
                              {item.diffAuditFinalQty.toLocaleString('id-ID')}
                            </td>
                            <td
                              className={cn(
                                'py-2 px-3 text-right font-bold text-xs',
                                isMinus ? 'text-rose-600' : isPlus ? 'text-amber-700' : 'text-slate-500'
                              )}
                            >
                              {item.tonDiffFinal > 0 ? '+' : ''}
                              {formatTon(item.tonDiffFinal || 0)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {item.status === 'SESUAI' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  <span>SESUAI</span>
                                </span>
                              ) : item.status === 'SELISIH_MINUS' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                  <MinusCircle className="h-3 w-3 text-rose-600" />
                                  <span>MINUS (-)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                                  <PlusCircle className="h-3 w-3 text-amber-600" />
                                  <span>PLUS (+)</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {/* Sticky Footer Totals Row */}
                  {filteredItems.length > 0 && (
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 text-slate-800 font-mono font-bold text-xs sticky bottom-0 z-10 shadow-xs">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px] font-sans">
                          TOTAL ({filteredTotals.count} item • Akurasi: {filteredTotals.accuracy.toFixed(1)}%):
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-900">
                          {filteredTotals.sapFinalQty.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-800">
                          {filteredTotals.actualFinalQty.toLocaleString('id-ID')}
                        </td>
                        <td
                          className={cn(
                            'py-2.5 px-3 text-right',
                            filteredTotals.diffAuditFinalQty < 0
                              ? 'text-rose-700'
                              : filteredTotals.diffAuditFinalQty > 0
                              ? 'text-amber-800'
                              : 'text-slate-700'
                          )}
                        >
                          {filteredTotals.diffAuditFinalQty >= 0 ? '+' : ''}
                          {filteredTotals.diffAuditFinalQty.toLocaleString('id-ID')}
                        </td>
                        <td
                          className={cn(
                            'py-2.5 px-3 text-right',
                            filteredTotals.tonDiffFinal < 0
                              ? 'text-rose-700'
                              : filteredTotals.tonDiffFinal > 0
                              ? 'text-amber-800'
                              : 'text-slate-700'
                          )}
                        >
                          {filteredTotals.tonDiffFinal >= 0 ? '+' : ''}
                          {formatTon(filteredTotals.tonDiffFinal)} T
                        </td>
                        <td className="py-2.5 px-3 text-center text-[11px] text-emerald-800">
                          {filteredTotals.accuracy.toFixed(1)}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-500 font-mono">
                    Halaman <span className="font-bold text-slate-800">{currentPage}</span> dari{' '}
                    <span className="font-bold text-slate-800">{totalPages}</span> ({filteredItems.length} total baris)
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Sebelumnya</span>
                    </button>

                    <div className="hidden sm:flex items-center gap-1 px-2 font-mono text-xs">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = i + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pageNum = currentPage - 3 + i;
                          if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                        }
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                              'h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer',
                              currentPage === pageNum
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CustomizableCard>
      </div>
    </div>
  );
};
export default AuditSLocView;
