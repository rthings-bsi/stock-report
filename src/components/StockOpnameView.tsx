'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  StockOpnameItem,
  STODifferenceStatus,
  StockOpnameSummary,
  StockOpnamePeriodSummary
} from '../types/warehouse';
import {
  calculateSTOSummary,
  calculateSTOGudangRecap,
  calculateSTOSLocRecap,
  calculateSTOPeriodSummary
} from '@/lib/parseStockOpname';
import { exportStockOpnameToExcel } from '@/lib/exportStockOpnameExcel';
import { formatTon, formatQty, formatPercent, cn } from '@/lib/utils';
import {
  ClipboardCheck,
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
  Maximize2,
  Minimize2,
  Calendar,
  Hash,
  Scale,
  ChevronDown,
  History
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface StockOpnameViewProps {
  data?: StockOpnameItem[];
  isCustomizing?: boolean;
  onDataUpdate?: (newData: StockOpnameItem[]) => void;
  targetDate?: string;
}

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'chart-sto-variance-bar', width: 'col-span-6' },
  { id: 'chart-sto-compare-bar', width: 'col-span-6' },
  { id: 'chart-sto-sloc-bar', width: 'col-span-8' },
  { id: 'chart-sto-donut', width: 'col-span-4' },
  { id: 'chart-sto-period-trend', width: 'col-span-12' },
  { id: 'table-sto-detail', width: 'col-span-12' },
];

export const StockOpnameView: React.FC<StockOpnameViewProps> = ({
  data = [],
  isCustomizing = false,
  onDataUpdate,
  targetDate,
}) => {
  const [items, setItems] = useState<StockOpnameItem[]>(data || []);
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setItems(data || []);
  }, [data]);

  // Layout persistence
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_stock_opname_v2');
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
      localStorage.setItem('spindo_layout_stock_opname_v2', JSON.stringify(cards));
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

  // Filter & Search States
  const [activeTab, setActiveTab] = useState<'ALL' | 'SESUAI' | 'SELISIH_MINUS' | 'SELISIH_PLUS'>('ALL');
  const [selectedGudang, setSelectedGudang] = useState<string>('ALL');
  const [selectedSLoc, setSelectedSLoc] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toggles for chart view metrics
  const [accuracyMetric, setAccuracyMetric] = useState<'item' | 'ton'>('item');
  const [compareMetric, setCompareMetric] = useState<'all' | 'ton' | 'qty' | 'item'>('all');
  const [slocGudangFilter, setSlocGudangFilter] = useState<string>('ALL');
  const [slocMetric, setSlocMetric] = useState<'ton' | 'qty' | 'percent'>('ton');

  // STO Period Comparison States
  const [periodMetric, setPeriodMetric] = useState<'all' | 'ton' | 'qty' | 'accuracy' | 'item'>('all');
  const [stoPeriods, setStoPeriods] = useState<StockOpnamePeriodSummary[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState<boolean>(false);

  // Fetch STO periods history from API & merge with active uploaded items
  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      setIsLoadingPeriods(true);
      try {
        const res = await fetch('/api/warehouse?sto_history=true');
        const json = await res.json();
        if (active && json?.success && Array.isArray(json.periods)) {
          let list: StockOpnamePeriodSummary[] = [...json.periods];

          if (items.length > 0) {
            const currentPeriodKey = targetDate ? `snap_${targetDate}` : 'snap_current';
            const existingIdx = list.findIndex(
              (p) => p.periodKey === currentPeriodKey || (targetDate && p.lastUpdated === targetDate)
            );

            const currentSummary = calculateSTOPeriodSummary(
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
          setStoPeriods(list);
        }
      } catch (err) {
        console.warn('Gagal memuat riwayat STO:', err);
      } finally {
        if (active) setIsLoadingPeriods(false);
      }
    };

    fetchHistory();
    return () => {
      active = false;
    };
  }, [items, targetDate]);

  // Sinkronisasi filter gudang per SLoc dengan filter gudang global bila berubah
  useEffect(() => {
    if (selectedGudang !== 'ALL') {
      setSlocGudangFilter(selectedGudang);
    }
  }, [selectedGudang]);

  // Table Sorting & Pagination
  const [sortField, setSortField] = useState<string>('differencesFinalQty');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Daftar opsi Gudang & SLoc yang tersedia
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

  // Reset SLoc filter if not in selected Gudang
  useEffect(() => {
    if (selectedSLoc !== 'ALL' && !availableSLocs.includes(selectedSLoc)) {
      setSelectedSLoc('ALL');
    }
  }, [selectedGudang, availableSLocs, selectedSLoc]);

  // Filter items berdasarkan Gudang, SLoc, Tab, dan Search
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
        const lbl = (item.labelId || '').toLowerCase();
        const sloc = (item.sloc || '').toLowerCase();
        const gd = (item.gudang || '').toLowerCase();
        const uk = (item.ukuran || '').toLowerCase();

        return (
          mat.includes(q) ||
          desc.includes(q) ||
          batch.includes(q) ||
          lbl.includes(q) ||
          sloc.includes(q) ||
          gd.includes(q) ||
          uk.includes(q)
        );
      }

      return true;
    });
  }, [items, selectedGudang, selectedSLoc, activeTab, searchQuery]);

  // Sorting
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

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // Reset page jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedGudang, selectedSLoc, searchQuery]);

  // Ringkasan KPI dan Rekap
  const summary: StockOpnameSummary = useMemo(() => {
    return calculateSTOSummary(filteredItems);
  }, [filteredItems]);

  const allSummary: StockOpnameSummary = useMemo(() => {
    return calculateSTOSummary(items);
  }, [items]);

  const gudangRecap = useMemo(() => {
    return calculateSTOGudangRecap(
      items.filter((i) => {
        if (selectedSLoc !== 'ALL' && i.sloc !== selectedSLoc) return false;
        return true;
      })
    );
  }, [items, selectedSLoc]);

  const slocRecap = useMemo(() => {
    return calculateSTOSLocRecap(
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
    const filename = `Report_Stock_Opname_Spindo_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportStockOpnameToExcel(filteredItems, summary, gudangRecap, filename);
  };

  // ==========================================
  // CHART 1: AKURASI STO PER GUDANG (BAR)
  // Menampilkan persentase akurasi (%) per gudang
  // ==========================================
  const activeGudangs = useMemo(() => {
    return gudangRecap.filter((g) => g.itemCount > 0);
  }, [gudangRecap]);

  const accuracyChartData = useMemo(() => {
    const labels = activeGudangs.map((g) => g.gudang);

    const values = activeGudangs.map((g) => {
      if (accuracyMetric === 'item') {
        return Number((g.accuracyRate || 0).toFixed(1));
      }
      // Tonase accuracy: persentase kesesuaian berat terhadap total Stock SAP
      const baseTon = g.sapTon > 0 ? g.sapTon : g.actualTon;
      if (baseTon <= 0) return 100;
      const rate = Math.max(0, Math.min(100, (1 - Math.abs(g.varianceTon) / baseTon) * 100));
      return Number(rate.toFixed(1));
    });

    const backgroundColors = activeGudangs.map((g, idx) => {
      const val = values[idx];
      const isSelected = selectedGudang === g.gudang;
      const isAnySelected = selectedGudang !== 'ALL';

      // Tier: >=95% Emerald, 85-94.9% Amber, <85% Rose
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
      if (isSelected) return '#0f172a'; // Highlight border tebal untuk gudang terpilih

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

  // Plugin inline untuk menampilkan label persentase akurasi tepat di atas setiap batang
  const accuracyDataLabelsPlugin = useMemo(() => ({
    id: 'accuracyDataLabels',
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
          top: 20, // Ruang untuk label persentase di atas batang
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
          const tableEl = document.getElementById('table-sto-detail');
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
            title: (items: any[]) => {
              if (!items.length) return '';
              const gName = items[0].label;
              return `Gudang ${gName} • Status Akurasi`;
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
                `• Stock SAP: ${g.sapTon.toFixed(2)} T | Actual: ${g.actualTon.toFixed(2)} T`,
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

  // ==========================================
  // CHART 2: PERBANDINGAN SAP VS ACTUAL (BAR)
  // Menampilkan 3 bar langsung: Item - Qty - Tonase (%) atau detail per metrik
  // ==========================================
  const compareChartData = useMemo(() => {
    const activeGudangs = gudangRecap.filter((g) => g.sapTon > 0 || g.actualTon > 0 || g.itemCount > 0);
    const labels = activeGudangs.map((g) => g.gudang);

    // MODE 1: LANGSUNG 3 BAR (Item - Qty - Tonase)
    if (compareMetric === 'all') {
      const itemValues = activeGudangs.map((g) => {
        const base = g.sapItemCount && g.sapItemCount > 0 ? g.sapItemCount : g.itemCount;
        if (base <= 0) return 100;
        const rate = ((g.actualItemCount ?? 0) / base) * 100;
        return Number(Math.min(100, Math.max(0, rate)).toFixed(1));
      });

      const qtyValues = activeGudangs.map((g) => {
        if (g.sapQty <= 0) return 100;
        const rate = (g.actualQty / g.sapQty) * 100;
        return Number(Math.min(100, Math.max(0, rate)).toFixed(1));
      });

      const tonValues = activeGudangs.map((g) => {
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
            backgroundColor: 'rgba(99, 102, 241, 0.85)', // Indigo
            borderColor: '#4f46e5',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: selectedGudang !== 'ALL' ? 36 : 24,
            barPercentage: 0.8,
            categoryPercentage: 0.75,
          },
          {
            label: 'Qty Pcs (%)',
            data: qtyValues,
            backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald
            borderColor: '#059669',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: selectedGudang !== 'ALL' ? 36 : 24,
            barPercentage: 0.8,
            categoryPercentage: 0.75,
          },
          {
            label: 'Tonase (%)',
            data: tonValues,
            backgroundColor: 'rgba(14, 165, 233, 0.85)', // Sky
            borderColor: '#0284c7',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: selectedGudang !== 'ALL' ? 36 : 24,
            barPercentage: 0.8,
            categoryPercentage: 0.75,
          },
        ],
      };
    }

    // MODE 2: DETAIL SINGLE METRIC (Stock SAP vs Actual)
    const sapValues = activeGudangs.map((g) => {
      if (compareMetric === 'ton') return Number(g.sapTon.toFixed(2));
      if (compareMetric === 'qty') return g.sapQty;
      return g.sapItemCount ?? 0;
    });
    const actualValues = activeGudangs.map((g) => {
      if (compareMetric === 'ton') return Number(g.actualTon.toFixed(2));
      if (compareMetric === 'qty') return g.actualQty;
      return g.actualItemCount ?? 0;
    });

    const getMetricLabel = (entity: 'Stock SAP' | 'Actual') => {
      if (compareMetric === 'ton') return `${entity} (Ton)`;
      if (compareMetric === 'qty') return `${entity} (Pcs)`;
      return `${entity} (Item)`;
    };

    return {
      labels,
      datasets: [
        {
          label: getMetricLabel('Stock SAP'),
          data: sapValues,
          backgroundColor: 'rgba(100, 116, 139, 0.85)',
          borderColor: '#475569',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: selectedGudang !== 'ALL' ? 44 : 32,
          barPercentage: 0.7,
          categoryPercentage: 0.7,
        },
        {
          label: getMetricLabel('Actual'),
          data: actualValues,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#059669',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: selectedGudang !== 'ALL' ? 44 : 32,
          barPercentage: 0.7,
          categoryPercentage: 0.7,
        },
      ],
    };
  }, [gudangRecap, compareMetric, selectedGudang]);

  // Keep references to current compareMetric to prevent stale closure in Chart.js inline plugins
  const compareMetricRef = useRef(compareMetric);
  useEffect(() => {
    compareMetricRef.current = compareMetric;
  }, [compareMetric]);

  // Plugin label di atas bar: persentase untuk mode 'all', atau satuan (T, Pcs, Item) untuk mode spesifik
  const compareDataLabelsPlugin = useMemo(
    () => ({
      id: 'compareDataLabels',
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
              ctx.font = 'bold 9.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
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
          const tableEl = document.getElementById('table-sto-detail');
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
            title: (items: any[]) => {
              if (!items.length) return '';
              const gName = items[0].label;
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
          max: compareMetric === 'all' ? 105 : undefined,
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

  // ==========================================
  // CHART 3: DEVIASI SELISIH & AKURASI PER SLOC (BAR)
  // Menampilkan deviasi tonase/kuantitas atau akurasi (%) per SLoc
  // ==========================================
  const sortedSLocs = useMemo(() => {
    return [...slocRecap]
      .sort((a, b) => {
        if (slocMetric === 'percent') {
          // Urutkan dari akurasi terendah (paling kritis) ke tertinggi
          return (a.accuracyRate || 0) - (b.accuracyRate || 0);
        }
        const valA = slocMetric === 'ton' ? Math.abs(a.varianceTon) : Math.abs(a.varianceQty);
        const valB = slocMetric === 'ton' ? Math.abs(b.varianceTon) : Math.abs(b.varianceQty);
        return valB - valA;
      });
  }, [slocRecap, slocMetric]);

  const slocChartData = useMemo(() => {
    const labels = sortedSLocs.map((s) =>
      slocGudangFilter === 'ALL' ? `${s.sloc} (${s.gudang})` : s.sloc
    );
    // Batang berdiri tegak dari baseline 0 (magnitudo deviasi mutlak), tanda (+/-) ditampilkan via warna dan label
    const dataValues = sortedSLocs.map((s) => {
      if (slocMetric === 'percent') {
        return Number((s.accuracyRate || 0).toFixed(1));
      }
      return slocMetric === 'ton'
        ? Number(Math.abs(s.varianceTon).toFixed(2))
        : Math.abs(s.varianceQty);
    });

    const isAnySelected = selectedSLoc !== 'ALL';

    const backgroundColors = sortedSLocs.map((s) => {
      const isSelected = selectedSLoc === s.sloc;

      if (slocMetric === 'percent') {
        const v = s.accuracyRate || 0;
        if (v >= 95) return isAnySelected && !isSelected ? 'rgba(16, 185, 129, 0.25)' : '#10b981';
        if (v >= 85) return isAnySelected && !isSelected ? 'rgba(245, 158, 11, 0.25)' : '#f59e0b';
        return isAnySelected && !isSelected ? 'rgba(239, 68, 68, 0.25)' : '#ef4444';
      }

      const rawVal = slocMetric === 'ton' ? s.varianceTon : s.varianceQty;
      if (rawVal < 0) {
        return isAnySelected && !isSelected ? 'rgba(244, 63, 94, 0.25)' : '#f43f5e';
      }
      if (rawVal > 0) {
        return isAnySelected && !isSelected ? 'rgba(245, 158, 11, 0.25)' : '#f59e0b';
      }
      return isAnySelected && !isSelected ? 'rgba(16, 185, 129, 0.25)' : '#10b981';
    });

    const borderColors = sortedSLocs.map((s) => {
      const isSelected = selectedSLoc === s.sloc;
      if (isSelected) return '#0f172a'; // Highlight border tebal untuk SLoc terpilih

      if (slocMetric === 'percent') {
        const v = s.accuracyRate || 0;
        if (v >= 95) return '#059669';
        if (v >= 85) return '#d97706';
        return '#dc2626';
      }
      const rawVal = slocMetric === 'ton' ? s.varianceTon : s.varianceQty;
      return rawVal < 0 ? '#e11d48' : rawVal > 0 ? '#d97706' : '#059669';
    });

    const borderWidths = sortedSLocs.map((s) => {
      return selectedSLoc === s.sloc ? 2.5 : 1.5;
    });

    const hoverColors = sortedSLocs.map((s) => {
      if (slocMetric === 'percent') {
        const v = s.accuracyRate || 0;
        if (v >= 95) return '#059669';
        if (v >= 85) return '#d97706';
        return '#dc2626';
      }
      const rawVal = slocMetric === 'ton' ? s.varianceTon : s.varianceQty;
      return rawVal < 0 ? '#e11d48' : rawVal > 0 ? '#d97706' : '#059669';
    });

    return {
      labels,
      datasets: [
        {
          label:
            slocMetric === 'percent'
              ? 'Akurasi SLoc (%)'
              : slocMetric === 'ton'
              ? 'Selisih Ton (SLoc)'
              : 'Selisih Qty (SLoc)',
          data: dataValues,
          backgroundColor: backgroundColors,
          hoverBackgroundColor: hoverColors,
          borderColor: borderColors,
          borderWidth: borderWidths,
          borderRadius: {
            topLeft: 6,
            topRight: 6,
            bottomLeft: 0,
            bottomRight: 0,
          },
          borderSkipped: 'bottom' as const,
          maxBarThickness: selectedSLoc !== 'ALL' ? 44 : 36,
          barPercentage: 0.68,
          categoryPercentage: 0.74,
        },
      ],
    };
  }, [sortedSLocs, slocMetric, slocGudangFilter, selectedSLoc]);

  // Keep references to current state to prevent stale closure in Chart.js inline plugins
  const slocMetricRef = useRef(slocMetric);
  useEffect(() => {
    slocMetricRef.current = slocMetric;
  }, [slocMetric]);

  const sortedSLocsRef = useRef(sortedSLocs);
  useEffect(() => {
    sortedSLocsRef.current = sortedSLocs;
  }, [sortedSLocs]);

  // Plugin inline untuk menampilkan label nilai deviasi dan persentase akurasi SLoc tepat di atas batang
  const slocDataLabelsPlugin = useMemo(() => ({
    id: 'slocDataLabels',
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart;
      const currentMetric = slocMetricRef.current;
      const currentSLocs = sortedSLocsRef.current;

      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta || meta.hidden) return;
        meta.data.forEach((element: any, index: number) => {
          const val = dataset.data[index];
          const s = currentSLocs[index];
          if (element && typeof val === 'number') {
            ctx.save();
            ctx.textAlign = 'center';

            if (currentMetric === 'percent') {
              // Mode Akurasi (%): Tampilkan persentase akurasi di atas batang
              const text = `${val.toFixed(1)}%`;
              ctx.font = 'bold 9.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
              ctx.fillStyle = val >= 95 ? '#047857' : val >= 85 ? '#b45309' : '#b91c1c';
              ctx.textBaseline = 'bottom';
              ctx.fillText(text, element.x, Math.max(element.y - 4, 12));
            } else {
              // Mode Deviasi Tonase / Qty:
              // Batang berdiri tegak dari baseline 0, label nilai (+/-) & akurasi ditampilkan rapi di atas ujung batang
              const rawVal = currentMetric === 'ton' ? s?.varianceTon || 0 : s?.varianceQty || 0;
              const sign = rawVal > 0 ? '+' : rawVal < 0 ? '-' : '';
              const unit = currentMetric === 'ton' ? 'T' : 'Pcs';
              const absVal = Math.abs(rawVal);
              const valFormatted =
                currentMetric === 'ton'
                  ? absVal.toFixed(1)
                  : Math.round(absVal).toLocaleString('id-ID');
              const valText = `${sign}${valFormatted} ${unit}`;
              const pctText = s ? `(${s.accuracyRate.toFixed(0)}%)` : '';

              const isDeficit = rawVal < 0;
              const isSurplus = rawVal > 0;
              const valColor = isDeficit ? '#e11d48' : isSurplus ? '#d97706' : '#047857';

              // Nilai deviasi bertanda (+/-) dengan warna defisit/surplus
              ctx.textBaseline = 'bottom';
              ctx.fillStyle = valColor;
              ctx.font = 'bold 9.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
              ctx.fillText(valText, element.x, element.y - 13);

              // Persentase akurasi SLoc
              ctx.fillStyle = '#64748b';
              ctx.font = '600 8.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
              ctx.fillText(pctText, element.x, element.y - 2);
            }
            ctx.restore();
          }
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
          top: 28,
          bottom: 6,
          left: 4,
          right: 4,
        },
      },
      onClick: (_event: any, elements: any[]) => {
        if (!elements || elements.length === 0) return;
        const index = elements[0].index;
        const clickedSLoc = sortedSLocs[index]?.sloc;
        if (!clickedSLoc) return;

        if (selectedSLoc === clickedSLoc) {
          setSelectedSLoc('ALL');
        } else {
          setSelectedSLoc(clickedSLoc);
          const tableEl = document.getElementById('table-sto-detail');
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
            title: (items: any[]) => {
              if (!items.length) return '';
              const idx = items[0].dataIndex;
              const s = sortedSLocs[idx];
              return `SLoc ${s?.sloc || items[0].label} • Gudang ${s?.gudang || ''}`;
            },
            label: (context: any) => {
              const idx = context.dataIndex;
              const s = sortedSLocs[idx];
              if (!s) return '';
              if (slocMetric === 'percent') {
                return ` Akurasi SLoc: ${s.accuracyRate.toFixed(1)}%`;
              }
              const rawVal = slocMetric === 'ton' ? s.varianceTon : s.varianceQty;
              const sign = rawVal > 0 ? '+' : '';
              const unit = slocMetric === 'ton' ? 'Ton' : 'Pcs';
              const valFormatted =
                slocMetric === 'ton'
                  ? rawVal.toFixed(2)
                  : Math.round(rawVal).toLocaleString('id-ID');
              const status = rawVal < 0 ? ' (Selisih -)' : rawVal > 0 ? ' (Selisih +)' : ' (Sesuai)';
              return ` Selisih: ${sign}${valFormatted} ${unit}${status}`;
            },
            afterBody: (context: any) => {
              const idx = context[0]?.dataIndex;
              const s = sortedSLocs[idx];
              if (!s) return [];
              return [
                `• Akurasi: ${s.accuracyRate.toFixed(1)}%`,
                `• Sesuai: ${s.matchingCount} item`,
                `• Selisih (-): ${s.minusCount} item`,
                `• Selisih (+): ${s.plusCount} item`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: {
            color: '#cbd5e1',
            width: 1,
          },
          ticks: {
            color: '#475569',
            font: { family: 'ui-monospace, monospace', size: 10.5, weight: 'bold' as const },
            padding: 6,
            autoSkip: false,
          },
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: slocMetric === 'percent' ? 105 : undefined,
          grace: slocMetric === 'percent' ? undefined : '18%',
          grid: { color: '#f1f5f9' },
          border: {
            dash: [4, 4],
            display: false,
          },
          ticks: {
            color: '#94a3b8',
            font: { family: 'ui-monospace, monospace', size: 10 },
            stepSize: slocMetric === 'percent' ? 25 : undefined,
            callback: (val: any) => {
              if (slocMetric === 'percent') {
                return val <= 100 ? `${val}%` : '';
              }
              return `${val} ${slocMetric === 'ton' ? 'T' : 'Pcs'}`;
            },
          },
        },
      },
    };
  }, [sortedSLocs, slocMetric, selectedSLoc]);

  // ==========================================
  // CHART 4: DOUGHNUT STATUS PROPORSI
  // ==========================================
  const donutChartData = useMemo(() => {
    return {
      labels: ['Sesuai (0)', 'Selisih Minus (-)', 'Selisih Plus (+)'],
      datasets: [
        {
          data: [summary.matchingItems, summary.minusItems, summary.plusItems],
          backgroundColor: [
            '#10b981', // Emerald 500
            '#f43f5e', // Rose 500
            '#f59e0b', // Amber 500
          ],
          hoverBackgroundColor: [
            '#059669',
            '#e11d48',
            '#d97706',
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
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

  // ==========================================
  // CHART 5: PERBANDINGAN STO PER PERIODE
  // ==========================================
  const periodChartData = useMemo(() => {
    if (stoPeriods.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = stoPeriods.map((p) => p.label || p.lastUpdated);

    const periodValues = stoPeriods.map((p) => {
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
            label: 'Stock SAP (Ton)',
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
            label: 'Actual (Ton)',
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
            label: 'Akurasi STO (%)',
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
            label: 'Stock SAP (Ton)',
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
            label: 'Actual (Ton)',
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
            label: 'Stock SAP (Pcs)',
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
            label: 'Actual (Pcs)',
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
            label: 'Akurasi STO (%)',
            data: periodValues.map((v) => v.accuracy),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            fill: true,
            pointBackgroundColor: '#4f46e5',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            borderWidth: 2.5,
            tension: 0.25,
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
          label: 'Total Item Sensus',
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
  }, [stoPeriods, periodMetric, selectedGudang]);

  const periodMetricRef = useRef(periodMetric);
  useEffect(() => {
    periodMetricRef.current = periodMetric;
  }, [periodMetric]);

  const periodDataLabelsPlugin = useMemo(
    () => ({
      id: 'periodDataLabels',
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
                return ` ${label}: ${Number(val).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} T`;
              }
              if (label.includes('Pcs')) {
                return ` ${label}: ${Number(val).toLocaleString('id-ID')} Pcs`;
              }
              return ` ${label}: ${Number(val).toLocaleString('id-ID')}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 11, weight: 'bold' as const },
            color: '#334155',
          },
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          beginAtZero: true,
          grace: '15%',
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: 'ui-monospace, monospace', size: 10 },
            color: '#64748b',
            callback: (v: any) => {
              if (periodMetric === 'all' || periodMetric === 'ton') {
                return `${v} T`;
              }
              if (periodMetric === 'qty') {
                return v >= 1000 ? `${v / 1000}k` : v;
              }
              if (periodMetric === 'accuracy') {
                return `${v}%`;
              }
              return v;
            },
          },
        },
        ...(isCombo
          ? {
              y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                min: 0,
                max: 100,
                grid: { drawOnChartArea: false },
                ticks: {
                  font: { family: 'ui-monospace, monospace', size: 10 },
                  color: '#6366f1',
                  callback: (v: any) => `${v}%`,
                },
              },
            }
          : {}),
      },
    };
  }, [periodMetric]);

  // Helper render sort icon pada header tabel
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors" />;
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
            <ClipboardCheck className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-sans tracking-tight">
              Stock Opname (STO) &amp; Rekonsiliasi Actual vs SAP
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

      {/* 2. KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Item */}
        <div className="group relative bg-gradient-to-b from-slate-50/80 via-white to-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Item STO</span>
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
          <p className="text-[10px] text-slate-400 mt-1.5 truncate">Total record opname SAP</p>
        </div>

        {/* Item Sesuai (Akurat) */}
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
          <p className="text-[10px] text-emerald-600/80 mt-1.5 truncate">Selisih = 0 (Stock SAP = Actual)</p>
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
          <p className="text-[10px] text-rose-600/80 mt-1.5 truncate">Defisit (Actual &lt; Stock SAP)</p>
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
          <p className="text-[10px] text-amber-700/80 mt-1.5 truncate">Surplus (Actual &gt; Stock SAP)</p>
        </div>

        {/* Net Variance */}
        <div className="col-span-2 sm:col-span-1 group relative bg-gradient-to-b from-slate-50/90 via-white to-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium">
            <span>Net Variance (Total)</span>
            <div className="p-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/60 group-hover:scale-110 transition-transform duration-200">
              <Scale className="h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={cn(
                'text-2xl font-bold font-mono tracking-tight',
                summary.netVarianceTon < 0
                  ? 'text-rose-600'
                  : summary.netVarianceTon > 0
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              )}
            >
              {summary.netVarianceTon > 0 ? '+' : ''}
              {formatTon(summary.netVarianceTon)} T
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200/70">
              {summary.netVarianceQty > 0 ? '+' : ''}
              {formatQty(summary.netVarianceQty)} pcs
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1 mt-2.5 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                summary.netVarianceTon < 0
                  ? 'bg-rose-400'
                  : summary.netVarianceTon > 0
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              )}
              style={{ width: '100%' }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 truncate">Total deviasi tonase bersih</p>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
            <input
              type="text"
              placeholder="Cari Material, Batch, Label ID, SLoc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all duration-200 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 h-4 w-4 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Gudang Filter */}
          <div className="relative flex items-center gap-2 text-xs bg-slate-50/90 hover:bg-slate-100/70 border border-slate-200/90 rounded-xl px-3 py-1.5 shrink-0 transition-all duration-200 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 shadow-2xs">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium text-[11px]">Gudang:</span>
            <select
              value={selectedGudang}
              onChange={(e) => setSelectedGudang(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs pr-4 appearance-none"
            >
              <option value="ALL">Semua Gudang ({availableGudangs.length})</option>
              {availableGudangs.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 pointer-events-none absolute right-2.5" />
          </div>

          {/* SLoc Filter */}
          <div className="relative flex items-center gap-2 text-xs bg-slate-50/90 hover:bg-slate-100/70 border border-slate-200/90 rounded-xl px-3 py-1.5 shrink-0 transition-all duration-200 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 shadow-2xs">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium text-[11px]">SLoc:</span>
            <select
              value={selectedSLoc}
              onChange={(e) => setSelectedSLoc(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs pr-4 appearance-none"
            >
              <option value="ALL">Semua SLoc ({availableSLocs.length})</option>
              {availableSLocs.map((sloc) => (
                <option key={sloc} value={sloc}>
                  {sloc}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 pointer-events-none absolute right-2.5" />
          </div>
        </div>

        {/* Reset Filter Button */}
        {(selectedGudang !== 'ALL' || selectedSLoc !== 'ALL' || searchQuery || activeTab !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSelectedGudang('ALL');
              setSelectedSLoc('ALL');
              setSearchQuery('');
              setActiveTab('ALL');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/80 rounded-xl transition-all duration-200 cursor-pointer shrink-0 shadow-2xs hover:shadow-xs active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      {/* 4. Customizable Grid Container for 4 Charts */}
      <div className="grid grid-cols-12 gap-3.5">
        {/* CARD 1: AKURASI STO PER GUDANG */}
        <CustomizableCard
          id="chart-sto-variance-bar"
          title="Akurasi STO per Gudang"
          subtitle="Persentase kesesuaian actual vs Stock SAP per gudang penyimpanan"
          icon={BarChart3}
          width={cards.find((c) => c.id === 'chart-sto-variance-bar')?.width || 'col-span-6'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-sto-variance-bar', w)}
          canMoveLeft={false}
          canMoveRight={true}
          onMoveRight={() => handleMove(0, 'right')}
          badge={
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300/80 shadow-2xs">
              Target: ≥95%
            </span>
          }
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
                Item (%)
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
                Tonase (%)
              </button>
            </div>
          }
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div>
                {/* Performance Tier Legend */}
                <div className="flex flex-wrap items-center gap-3.5 mb-2.5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/30 shrink-0" />
                    <span>Tinggi (≥ 95%)</span>
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

              <div className={cn("w-full pt-1", expanded ? "flex-1 min-h-[440px]" : "h-56 sm:h-64")}>
                {activeGudangs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <BarChart3 className="h-7 w-7 text-slate-300 mb-1.5 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">
                      Belum ada data akurasi gudang
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

        {/* CARD 2: PERBANDINGAN STOCK SAP VS ACTUAL */}
        <CustomizableCard
          id="chart-sto-compare-bar"
          title="Perbandingan Stock SAP vs Actual"
          subtitle={
            compareMetric === 'all'
              ? 'Komparasi langsung 3 metrik: Item, Kuantitas (Pcs), dan Tonase'
              : 'Komparasi total saldo Stock SAP terhadap actual sensus'
          }
          icon={Scale}
          width={cards.find((c) => c.id === 'chart-sto-compare-bar')?.width || 'col-span-6'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-sto-compare-bar', w)}
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
                title="Semua Metrik: Item, Qty, Tonase"
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
                {/* Custom Clean Legend */}
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
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-500 shadow-xs shadow-slate-500/30 shrink-0" />
                      <span>Stock SAP</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/30 shrink-0" />
                      <span>Actual</span>
                    </div>
                  </div>
                )}
              </div>

              <div className={cn("w-full pt-1", expanded ? "h-96" : "h-56 sm:h-64")}>
                {compareChartData.labels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <Scale className="h-7 w-7 text-slate-300 mb-1.5 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">
                      Belum ada data perbandingan
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

        {/* CARD 3: HASIL STO PER SLOC */}
        <CustomizableCard
          id="chart-sto-sloc-bar"
          title="Hasil STO Per Sloc"
          subtitle={
            slocMetric === 'percent'
              ? `Deviasi akurasi per SLoc di ${slocGudangFilter !== 'ALL' ? slocGudangFilter : 'semua gudang'} (${sortedSLocs.length} SLoc)`
              : `Deviasi ${slocMetric === 'ton' ? 'tonase' : 'kuantitas'} per SLoc di ${slocGudangFilter !== 'ALL' ? slocGudangFilter : 'semua gudang'} (${sortedSLocs.length} SLoc)`
          }
          icon={MapPin}
          width={cards.find((c) => c.id === 'chart-sto-sloc-bar')?.width || 'col-span-8'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-sto-sloc-bar', w)}
          canMoveLeft={true}
          canMoveRight={true}
          onMoveLeft={() => handleMove(2, 'left')}
          onMoveRight={() => handleMove(2, 'right')}
          badge={
            <span className="text-[10px] font-mono bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
              {slocGudangFilter !== 'ALL' ? slocGudangFilter : 'Semua Gudang'}
            </span>
          }
          headerAction={
            <div className="flex items-center gap-1.5">
              {/* Filter Gudang per SLoc */}
              <div className="relative flex items-center gap-1 text-xs bg-white border border-slate-200/90 rounded-xl px-2.5 py-1 shadow-2xs">
                <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="text-[10px] text-slate-500 font-bold uppercase hidden sm:inline">Gudang:</span>
                <select
                  value={slocGudangFilter}
                  onChange={(e) => setSlocGudangFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs pr-4 appearance-none"
                >
                  <option value="ALL">Semua Gudang</option>
                  {availableGudangs.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-2.5 w-2.5 text-slate-400 pointer-events-none absolute right-2" />
              </div>

              {/* Metric Toggle */}
              <div className="inline-flex items-center rounded-xl bg-slate-100/80 p-1 border border-slate-200/60 text-xs">
                <button
                  type="button"
                  onClick={() => setSlocMetric('ton')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer text-[11px]',
                    slocMetric === 'ton'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Tonase
                </button>
                <button
                  type="button"
                  onClick={() => setSlocMetric('qty')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer text-[11px]',
                    slocMetric === 'qty'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Qty Pcs
                </button>
                <button
                  type="button"
                  onClick={() => setSlocMetric('percent')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-bold transition-all duration-200 cursor-pointer text-[11px]',
                    slocMetric === 'percent'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Akurasi (%)
                </button>
              </div>
            </div>
          }
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div>
                {/* Custom Clean Legend */}
                <div className="flex flex-wrap items-center gap-3.5 mb-2.5">
                  {slocMetric === 'percent' ? (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/30 shrink-0" />
                        <span>Tinggi (≥ 95%)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500/30 shrink-0" />
                        <span>Sedang (85 - 94%)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500/30 shrink-0" />
                        <span>Kritis (&lt; 85%)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500/30 shrink-0" />
                        <span>Selisih Minus (-)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500/30 shrink-0" />
                        <span>Selisih Plus (+)</span>
                      </div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 ml-1">
                        <span>(xx%) = Akurasi SLoc</span>
                      </div>
                    </>
                  )}
                  {selectedSLoc !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setSelectedSLoc('ALL')}
                      className="ml-auto text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      Reset SLoc ({selectedSLoc})
                    </button>
                  )}
                </div>
              </div>

              <div className={cn("w-full pt-1 overflow-x-auto", expanded ? "flex-1 min-h-[440px]" : "h-56 sm:h-64")}>
                {slocChartData.labels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <MapPin className="h-7 w-7 text-slate-300 mb-1.5 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">
                      Tidak ada data SLoc untuk {slocGudangFilter}
                    </p>
                  </div>
                ) : (
                  <div className="h-full w-full" style={{ minWidth: sortedSLocs.length > 12 ? `${sortedSLocs.length * 52}px` : '100%' }}>
                    <Bar
                      key={`sloc-chart-${slocMetric}-${slocGudangFilter}-${selectedSLoc}-${sortedSLocs.length}`}
                      data={slocChartData}
                      options={slocChartOptions}
                      plugins={[slocDataLabelsPlugin]}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </CustomizableCard>

        {/* CARD 4: HASIL STO ALL (DOUGHNUT) */}
        <CustomizableCard
          id="chart-sto-donut"
          title="Hasil Sto All"
          subtitle="Persentase akurasi & status selisih"
          icon={PieChart}
          width={cards.find((c) => c.id === 'chart-sto-donut')?.width || 'col-span-4'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-sto-donut', w)}
          canMoveLeft={true}
          canMoveRight={true}
          onMoveLeft={() => handleMove(3, 'left')}
          onMoveRight={() => handleMove(3, 'right')}
        >
          {(expanded) => (
            <div className="flex flex-col justify-between h-full w-full">
              <div className={cn("flex items-center justify-center relative my-auto", expanded ? "h-64 sm:h-72" : "h-40 sm:h-44")}>
                {summary.totalItems === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-6">
                    <PieChart className="h-7 w-7 text-slate-300 mb-1.5 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">
                      Belum ada data hasil STO
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

        {/* CARD 5: PERBANDINGAN STO PER PERIODE */}
        <CustomizableCard
          id="chart-sto-period-trend"
          title="Perbandingan STO per Periode"
          subtitle={
            selectedGudang !== 'ALL'
              ? `Tren komparasi hasil STO antar periode untuk ${selectedGudang}`
              : 'Tren komparasi hasil sensus fisik antar periode STO yang telah di-upload'
          }
          icon={History}
          width={cards.find((c) => c.id === 'chart-sto-period-trend')?.width || 'col-span-12'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('chart-sto-period-trend', w)}
          canMoveLeft={true}
          canMoveRight={true}
          onMoveLeft={() => handleMove(4, 'left')}
          onMoveRight={() => handleMove(4, 'right')}
          badge={
            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200/80 shadow-2xs">
              {stoPeriods.length} Periode
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
                Akurasi (%)
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
              {/* Top Sub-legend / indicator */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-3">
                  {periodMetric === 'all' && (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-slate-500 shrink-0" />
                        <span>Stock SAP (Ton)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shrink-0" />
                        <span>Actual Sensus (Ton)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                        <span className="h-2 w-3 rounded-full bg-indigo-500 shrink-0" />
                        <span>Akurasi STO (%)</span>
                      </div>
                    </>
                  )}
                  {periodMetric === 'ton' && (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-slate-500 shrink-0" />
                        <span>Stock SAP (Ton)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shrink-0" />
                        <span>Actual Sensus (Ton)</span>
                      </div>
                    </>
                  )}
                  {periodMetric === 'qty' && (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-slate-500 shrink-0" />
                        <span>Stock SAP (Pcs)</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shrink-0" />
                        <span>Actual Sensus (Pcs)</span>
                      </div>
                    </>
                  )}
                  {periodMetric === 'accuracy' && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>Tren Persentase Akurasi STO (%)</span>
                    </div>
                  )}
                  {periodMetric === 'item' && (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm bg-slate-500 shrink-0" />
                        <span>Total Item Disensus</span>
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

              {/* Chart container */}
              <div className={cn("w-full", expanded ? "flex-1 min-h-[420px]" : "h-64 sm:h-72")}>
                {isLoadingPeriods ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs font-medium text-slate-500">
                      Memuat riwayat data STO per periode...
                    </p>
                  </div>
                ) : stoPeriods.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <History className="h-7 w-7 text-slate-300 mb-1.5 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">
                      Belum ada riwayat periode STO
                    </p>
                  </div>
                ) : (
                  <Bar
                    key={`period-chart-${periodMetric}-${selectedGudang}-${stoPeriods.length}`}
                    data={periodChartData as any}
                    options={periodChartOptions as any}
                    plugins={[periodDataLabelsPlugin]}
                  />
                )}
              </div>

              {/* Period Summary Cards Grid */}
              {stoPeriods.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 pt-3.5 border-t border-slate-100 mt-3">
                  {stoPeriods.map((p) => {
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
                              "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-2xs shrink-0",
                              isHigh
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isMed
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            )}
                          >
                            {stats.accuracy.toFixed(1)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                          <div className="bg-white/90 p-1.5 rounded-lg border border-slate-200/60">
                            <span className="text-[9.5px] text-slate-400 block font-sans">Stock SAP</span>
                            <span className="font-bold text-slate-700 truncate block">
                              {stats.sapTon.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} T
                            </span>
                          </div>
                          <div className="bg-white/90 p-1.5 rounded-lg border border-slate-200/60">
                            <span className="text-[9.5px] text-slate-400 block font-sans">Actual Sensus</span>
                            <span className="font-bold text-emerald-700 truncate block">
                              {stats.actualTon.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} T
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200/50 text-[10px] font-mono text-slate-500">
                          <span>Selisih Ton:</span>
                          <span
                            className={cn(
                              "font-bold",
                              stats.varianceTon < 0
                                ? "text-rose-600"
                                : stats.varianceTon > 0
                                ? "text-amber-600"
                                : "text-emerald-600"
                            )}
                          >
                            {stats.varianceTon > 0 ? `+${stats.varianceTon.toFixed(2)}` : stats.varianceTon.toFixed(2)} T
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CustomizableCard>

        {/* CARD 6: TABEL DETAIL HASIL REKONSILIASI STO (MULTI-TAB) */}
        <CustomizableCard
          id="table-sto-detail"
          title="Detail Hasil Rekonsiliasi Stock Opname"
          icon={Table2}
          width={cards.find((c) => c.id === 'table-sto-detail')?.width || 'col-span-12'}
          isCustomizing={isCustomizing}
          onWidthChange={(w) => handleWidthChange('table-sto-detail', w)}
          canMoveLeft={true}
          canMoveRight={false}
          onMoveLeft={() => handleMove(5, 'left')}
          headerAction={
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-mono font-medium bg-slate-100/80 px-2.5 py-1 rounded-xl border border-slate-200/60 shadow-2xs">
                Menampilkan {paginatedItems.length} dari {filteredItems.length} baris
              </span>
            </div>
          }
        >
          {(expanded) => (
            <div className={cn('flex flex-col space-y-3', expanded && 'flex-1 h-full')}>
              {/* 4 Interactive Sub-Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 border border-slate-200/70 rounded-xl shadow-2xs">
                  {/* Tab 1: Semua Data */}
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

                  {/* Tab 2: Sesuai */}
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

                  {/* Tab 3: Selisih Minus */}
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

                  {/* Tab 4: Selisih Plus */}
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

              {/* Table Container */}
              <div
                className={cn(
                  'rounded-2xl border border-slate-200/90 overflow-auto bg-white shadow-xs',
                  expanded ? 'flex-1 max-h-none' : 'max-h-[520px]'
                )}
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/95 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10.5px] tracking-wider font-mono select-none">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">No</th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                        onClick={() => handleSort('sloc')}
                      >
                        <div className="flex items-center gap-1">
                          <span>SLoc</span>
                          {renderSortIcon('sloc')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                        onClick={() => handleSort('material')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Material</span>
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
                        onClick={() => handleSort('sapInitialQty')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>SAP</span>
                          {renderSortIcon('sapInitialQty')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                        onClick={() => handleSort('qtySTO')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>STO</span>
                          {renderSortIcon('qtySTO')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors font-bold group"
                        onClick={() => handleSort('differencesFinalQty')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Selisih Qty</span>
                          {renderSortIcon('differencesFinalQty')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                        onClick={() => handleSort('tonDiffFinal')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Selisih Ton</span>
                          {renderSortIcon('tonDiffFinal')}
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {paginatedItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                          <ClipboardCheck className="h-9 w-9 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                          <p className="font-semibold text-slate-600">Tidak ada data stock opname</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Coba sesuaikan kata kunci pencarian atau ubah filter gudang / tab status
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((item, idx) => {
                        const isMinus = item.status === 'SELISIH_MINUS';
                        const isPlus = item.status === 'SELISIH_PLUS';
                        const isZero = item.status === 'SESUAI';

                        return (
                          <tr
                            key={item.id || `${item.labelId}-${idx}`}
                            className={cn(
                              'hover:bg-slate-50/80 transition-colors duration-150',
                              isMinus && 'bg-rose-50/25 hover:bg-rose-50/50',
                              isPlus && 'bg-amber-50/25 hover:bg-amber-50/50'
                            )}
                          >
                            <td className="py-2 px-3 text-center text-slate-400 text-[11px]">
                              {(currentPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-800 text-xs">
                              {item.sloc}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-900 text-xs tracking-tight">
                              {item.material}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap text-[11px]">
                              {item.batch}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 tabular-nums">
                              {formatQty(item.sapInitialQty)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700 font-medium tabular-nums">
                              {formatQty(item.qtySTO)}
                            </td>
                            <td
                              className={cn(
                                'py-2 px-3 text-right font-bold whitespace-nowrap tabular-nums',
                                isMinus && 'text-rose-600 font-bold',
                                isPlus && 'text-amber-700 font-bold',
                                isZero && 'text-emerald-700'
                              )}
                            >
                              {item.differencesFinalQty > 0 ? `+${formatQty(item.differencesFinalQty)}` : formatQty(item.differencesFinalQty)}
                            </td>
                            <td
                              className={cn(
                                'py-2 px-3 text-right font-mono text-[11px] whitespace-nowrap tabular-nums',
                                isMinus && 'text-rose-600',
                                isPlus && 'text-amber-700',
                                isZero && 'text-emerald-600'
                              )}
                            >
                              {item.tonDiffFinal !== 0 ? (
                                <span>
                                  {item.tonDiffFinal > 0 ? '+' : ''}
                                  {formatTon(item.tonDiffFinal)} T
                                </span>
                              ) : (
                                <span className="text-slate-300">0.00 T</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              {isZero && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  Sesuai
                                </span>
                              )}
                              {isMinus && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs">
                                  <MinusCircle className="h-3 w-3 text-rose-600" />
                                  Selisih (-)
                                </span>
                              )}
                              {isPlus && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs">
                                  <PlusCircle className="h-3 w-3 text-amber-600" />
                                  Selisih (+)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {/* Summary Row */}
                  {filteredItems.length > 0 && (
                    <tfoot className="bg-slate-100/95 backdrop-blur-xs font-bold border-t-2 border-slate-300 font-mono text-[11px] text-slate-900 sticky bottom-0 z-10 shadow-sm">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider font-sans">
                          Total Halaman Terfilter ({filteredItems.length} Item):
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                          {formatQty(filteredItems.reduce((acc, i) => acc + i.sapInitialQty, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                          {formatQty(filteredItems.reduce((acc, i) => acc + i.qtySTO, 0))}
                        </td>
                        <td
                          className={cn(
                            'py-2.5 px-3 text-right font-bold tabular-nums',
                            summary.netVarianceQty < 0 ? 'text-rose-600' : summary.netVarianceQty > 0 ? 'text-amber-700' : 'text-emerald-700'
                          )}
                        >
                          {summary.netVarianceQty > 0 ? '+' : ''}
                          {formatQty(summary.netVarianceQty)}
                        </td>
                        <td
                          className={cn(
                            'py-2.5 px-3 text-right font-bold tabular-nums',
                            summary.netVarianceTon < 0 ? 'text-rose-600' : summary.netVarianceTon > 0 ? 'text-amber-700' : 'text-emerald-700'
                          )}
                        >
                          {summary.netVarianceTon > 0 ? '+' : ''}
                          {formatTon(summary.netVarianceTon)} T
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px] text-slate-500 font-sans">
                          {summary.accuracyRate.toFixed(1)}% Akurat
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-100 text-xs font-mono">
                  <div className="text-slate-500">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer font-sans text-xs shadow-2xs hover:shadow-xs active:scale-95 transition-all"
                    >
                      Sebelumnya
                    </button>
                    <div className="flex items-center gap-1 px-1">
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
                              'w-7 h-7 rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all duration-150',
                              currentPage === pageNum
                                ? 'bg-emerald-600 text-white font-bold shadow-xs shadow-emerald-600/30'
                                : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 shadow-2xs'
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
                      className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer font-sans text-xs shadow-2xs hover:shadow-xs active:scale-95 transition-all"
                    >
                      Selanjutnya
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

export default StockOpnameView;
