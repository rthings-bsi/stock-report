'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  NCProgressTransaction,
  NCProgressPipelineItem,
  NCProgressSummary
} from '../types/warehouse';
import {
  buildNCProgressPipeline,
  computeNCProgressSummary,
  parseNCProgressTsv,
  parseNCProgressRows,
  formatExcelDate,
  formatExcelTime,
  parseMaterialUkuran,
  normalizeGudang,
  normalizeNCRNumber,
  extractNCRAndRemark
} from '@/lib/parseNCProgress';
import { exportNCProgressToExcel } from '@/lib/exportNCProgressExcel';
import { readExcelFile } from '@/lib/parser';
import { formatTon, formatQty, formatPercent, cn } from '@/lib/utils';
import {
  ShieldAlert,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  RefreshCw,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  GitFork,
  Layers,
  ChevronDown,
  Info,
  X,
  FileSpreadsheet,
  Check,
  Building2,
  Calendar,
  User,
  Hash,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Trash2,
  Pencil,
  Eye
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface NCProgressViewProps {
  data?: NCProgressTransaction[];
  isAdmin?: boolean;
  canEdit?: boolean;
  onDataUpdate?: (newData: NCProgressTransaction[]) => void;
}

type SubTabType = 'in_nc' | 'out_repair' | 'in_prime';

interface CardState {
  id: string;
  width: CardWidth;
}

const DEFAULT_CARDS: CardState[] = [
  { id: 'chart-nc-bar', width: 'col-span-8' },
  { id: 'chart-nc-donut', width: 'col-span-4' },
  { id: 'table-nc-progress', width: 'col-span-12' }
];

interface GroupedNCItem {
  id: string;
  groupKey: string;
  ncrNumber?: string;
  problemRemark?: string;
  material: string;
  materialDescription: string;
  customer?: string;
  ukuran: string;
  batches: string[];
  gudangs: string[];
  slocs: string[];
  order?: string;
  workCenter?: string;
  postingDate: string;
  totalQty: number;
  totalKg: number;
  totalTon: number;
  transactionCount: number;
  movementType: string;
  transactionType: NCProgressTransaction['transactionType'];
  transactions: NCProgressTransaction[];
}

export const NCProgressView: React.FC<NCProgressViewProps> = ({
  data = [],
  isAdmin = false,
  canEdit = true,
  onDataUpdate
}) => {
  const [transactions, setTransactions] = useState<NCProgressTransaction[]>(data);
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('in_nc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGudang, setSelectedGudang] = useState('ALL');
  const [selectedWorkCenter, setSelectedWorkCenter] = useState('ALL');

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<NCProgressTransaction | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupedNCItem | null>(null);
  const [selectedDrilldown, setSelectedDrilldown] = useState<NCProgressPipelineItem | null>(null);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // Import / Paste Text state
  const [pasteText, setPasteText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [importError, setImportError] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<string>('postingDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Sync external props data
  useEffect(() => {
    if (data) {
      setTransactions(data);
    }
  }, [data]);

  const updateTransactionsList = (newList: NCProgressTransaction[]) => {
    setTransactions(newList);
    if (onDataUpdate) {
      onDataUpdate(newList);
    }
    try {
      localStorage.setItem('spindo_nc_progress_data', JSON.stringify(newList));
    } catch {}
  };

  // Filter IN NC (MVT 309) & standardisasi Nomor NCR (<NO>/NCR-SKF/<BULAN>/<TAHUN>)
  const cleanTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.transactionType === 'IN_NC' || t.movementType === '309' || String(t.movementType).startsWith('309')) {
          const b = (t.batch || '').trim().toUpperCase();
          return b.endsWith('C') || b.endsWith('E');
        }
        return true;
      })
      .map((t) => {
        let ncrNumber = t.ncrNumber;
        let problemRemark = t.problemRemark;
        if (ncrNumber) {
          ncrNumber = normalizeNCRNumber(ncrNumber);
        }
        if (t.text) {
          const extracted = extractNCRAndRemark(t.text);
          if (extracted.ncrNumber) {
            ncrNumber = extracted.ncrNumber;
            problemRemark = extracted.problemRemark !== undefined ? extracted.problemRemark : problemRemark;
          }
        }
        if (ncrNumber !== t.ncrNumber || problemRemark !== t.problemRemark) {
          return { ...t, ncrNumber, problemRemark };
        }
        return t;
      });
  }, [transactions]);

  // Build Pipeline & Summary
  const pipeline = useMemo(() => {
    return buildNCProgressPipeline(cleanTransactions);
  }, [cleanTransactions]);

  const summary = useMemo<NCProgressSummary>(() => {
    return computeNCProgressSummary(cleanTransactions, pipeline);
  }, [cleanTransactions, pipeline]);

  // Dynamic filter lists
  const gudangList = useMemo(() => {
    return Array.from(
      new Set(cleanTransactions.map((t) => normalizeGudang(t.storageLocation)).filter(Boolean))
    ).sort();
  }, [cleanTransactions]);

  const workCenterList = useMemo(() => {
    return Array.from(
      new Set(cleanTransactions.map((t) => t.workCenter).filter((w): w is string => Boolean(w && w.trim())))
    ).sort();
  }, [cleanTransactions]);

  // Filtered Raw Transactions
  const filteredTransactions = useMemo(() => {
    return cleanTransactions.filter((t) => {
      // Subtab filter
      if (activeSubTab === 'in_nc' && t.transactionType !== 'IN_NC') return false;
      if (activeSubTab === 'out_repair' && t.transactionType !== 'OUT_REPAIR') return false;
      if (activeSubTab === 'in_prime' && t.transactionType !== 'IN_OK_PRIME') return false;

      const g = normalizeGudang(t.storageLocation);
      const matchGudang = selectedGudang === 'ALL' || g === selectedGudang || t.storageLocation === selectedGudang;
      const matchWC = selectedWorkCenter === 'ALL' || t.workCenter === selectedWorkCenter;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        t.material.toLowerCase().includes(q) ||
        t.materialDescription.toLowerCase().includes(q) ||
        (t.customer && t.customer.toLowerCase().includes(q)) ||
        (t.order && t.order.toLowerCase().includes(q)) ||
        (t.batch && t.batch.toLowerCase().includes(q)) ||
        (t.materialDocument && t.materialDocument.toLowerCase().includes(q)) ||
        (t.userName && t.userName.toLowerCase().includes(q)) ||
        (t.text && t.text.toLowerCase().includes(q)) ||
        (t.ncrNumber && t.ncrNumber.toLowerCase().includes(q)) ||
        (t.unloadingPoint && t.unloadingPoint.toLowerCase().includes(q)) ||
        (t.salesOrder && t.salesOrder.toLowerCase().includes(q));

      return matchGudang && matchWC && matchSearch;
    }).sort((a, b) => {
      const dateA = a.postingDate || a.entryDate || '';
      const dateB = b.postingDate || b.entryDate || '';
      return dateB.localeCompare(dateA);
    });
  }, [cleanTransactions, activeSubTab, selectedGudang, selectedWorkCenter, searchQuery]);

  // Konsolidasi Data Gabungan per No NCR / SPK
  const groupedItems = useMemo<GroupedNCItem[]>(() => {
    const map = new Map<string, NCProgressTransaction[]>();

    filteredTransactions.forEach((tx) => {
      let key = '';
      if (activeSubTab === 'in_nc') {
        if (tx.ncrNumber && tx.ncrNumber.trim()) {
          key = `NCR_${tx.ncrNumber.trim().toUpperCase()}`;
        } else {
          key = `MAT_${tx.material}_${tx.batch.slice(0, 7)}`;
        }
      } else if (activeSubTab === 'out_repair') {
        if (tx.order && tx.order.trim() && tx.order !== '0') {
          key = `ORD_${tx.order.trim()}`;
        } else if (tx.ncrNumber && tx.ncrNumber.trim()) {
          key = `NCR_${tx.ncrNumber.trim().toUpperCase()}`;
        } else {
          key = `MAT_${tx.material}_${tx.batch.slice(0, 7)}`;
        }
      } else {
        if (tx.order && tx.order.trim() && tx.order !== '0') {
          key = `ORD_${tx.order.trim()}`;
        } else {
          key = `MAT_${tx.material}_${tx.batch}`;
        }
      }

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(tx);
    });

    const result: GroupedNCItem[] = [];

    map.forEach((txList, key) => {
      txList.sort((a, b) => {
        const dateA = a.postingDate || a.entryDate || '';
        const dateB = b.postingDate || b.entryDate || '';
        return dateB.localeCompare(dateA);
      });

      const first = txList[0];
      const totalQty = txList.reduce((acc, curr) => acc + curr.qtyInUnOfEntry, 0);
      const totalKg = txList.reduce((acc, curr) => acc + (curr.quantity || curr.kgGI || curr.kgGR || 0), 0);
      const totalTon = totalKg / 1000;

      const batches = Array.from(new Set(txList.map((t) => t.batch).filter(Boolean)));
      const gudangs = Array.from(new Set(txList.map((t) => normalizeGudang(t.storageLocation)).filter(Boolean)));
      const slocs = Array.from(new Set(txList.map((t) => t.storageLocation).filter(Boolean)));

      const nonNullRemark =
        txList
          .map((t) => t.problemRemark)
          .filter((r): r is string => Boolean(r && r.trim()))
          .sort((a, b) => b.length - a.length)[0] || first.problemRemark || '-';

      const nonNullNcr = txList.map((t) => t.ncrNumber).filter((n): n is string => Boolean(n && n.trim()))[0] || first.ncrNumber;
      const nonNullOrder = txList.map((t) => t.order).filter((o): o is string => Boolean(o && o.trim() && o !== '0'))[0] || first.order;
      const nonNullWC = txList.map((t) => t.workCenter).filter((w): w is string => Boolean(w && w.trim()))[0] || first.workCenter;
      const nonNullCustomer = txList.map((t) => t.customer).filter((c): c is string => Boolean(c && c.trim()))[0] || first.customer;

      result.push({
        id: key,
        groupKey: key,
        ncrNumber: nonNullNcr,
        problemRemark: nonNullRemark,
        material: first.material,
        materialDescription: first.materialDescription,
        customer: nonNullCustomer,
        ukuran: parseMaterialUkuran(first.material, first.materialDescription),
        batches,
        gudangs,
        slocs,
        order: nonNullOrder,
        workCenter: nonNullWC,
        postingDate: first.postingDate || first.entryDate,
        totalQty,
        totalKg,
        totalTon,
        transactionCount: txList.length,
        movementType: first.movementType,
        transactionType: first.transactionType,
        transactions: txList
      });
    });

    return result;
  }, [filteredTransactions, activeSubTab]);

  const handleToggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedGroupedItems = useMemo(() => {
    return [...groupedItems].sort((a, b) => {
      let valA: string | number = a.postingDate;
      let valB: string | number = b.postingDate;
      if (sortField === 'totalQty') {
        valA = a.totalQty;
        valB = b.totalQty;
      } else if (sortField === 'totalTon') {
        valA = a.totalTon;
        valB = b.totalTon;
      } else if (sortField === 'transactionCount') {
        valA = a.transactionCount;
        valB = b.transactionCount;
      } else if (sortField === 'ncrNumber') {
        valA = a.ncrNumber || '';
        valB = b.ncrNumber || '';
      } else if (sortField === 'order') {
        valA = a.order || '';
        valB = b.order || '';
      } else if (sortField === 'material') {
        valA = a.ukuran || a.material;
        valB = b.ukuran || b.material;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [groupedItems, sortField, sortDir]);

  const handleDeleteSingleTxFromGroup = (txId?: string) => {
    if (!txId) return;
    if (window.confirm('Hapus baris dokumen transaksi ini?')) {
      const nextList = transactions.filter((t) => t.id !== txId);
      updateTransactionsList(nextList);
      if (selectedGroup) {
        const updatedTx = selectedGroup.transactions.filter((t) => t.id !== txId);
        if (updatedTx.length === 0) {
          setSelectedGroup(null);
        } else {
          const updatedTotalQty = updatedTx.reduce((acc, curr) => acc + curr.qtyInUnOfEntry, 0);
          const updatedTotalKg = updatedTx.reduce((acc, curr) => acc + (curr.quantity || curr.kgGI || curr.kgGR || 0), 0);
          setSelectedGroup({
            ...selectedGroup,
            transactions: updatedTx,
            totalQty: updatedTotalQty,
            totalKg: updatedTotalKg,
            totalTon: updatedTotalKg / 1000,
            transactionCount: updatedTx.length
          });
        }
      }
    }
  };

  const handleExportExcel = () => {
    exportNCProgressToExcel(cleanTransactions, pipeline, summary);
  };

  const handleProcessImportText = () => {
    if (!pasteText || !pasteText.trim()) {
      setImportError('Silakan tempel (paste) data transaksi SAP atau teks TSV terlebih dahulu.');
      return;
    }

    try {
      const parsed = parseNCProgressTsv(pasteText);
      if (parsed.length === 0) {
        setImportError('Tidak ada data valid yang dapat dikenali. Pastikan teks berisi kolom transaksi SAP (MVT 309, 261 REP, 101 REP).');
        return;
      }

      let nextList: NCProgressTransaction[] = [];
      if (importMode === 'replace') {
        nextList = parsed;
      } else {
        // Append mode: deduplicate by id / materialDocument + item
        const existingMap = new Map(transactions.map((t) => [`${t.materialDocument}_${t.materialDocItem}_${t.movementType}`, t]));
        parsed.forEach((t) => {
          existingMap.set(`${t.materialDocument}_${t.materialDocItem}_${t.movementType}`, t);
        });
        nextList = Array.from(existingMap.values());
      }

      updateTransactionsList(nextList);
      setPasteText('');
      setImportError(null);
      setIsImportModalOpen(false);
    } catch (e: unknown) {
      setImportError(`Gagal memproses data teks: ${e instanceof Error ? e.message : 'Format tidak valid'}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRows = await readExcelFile(file);
      const parsed = parseNCProgressRows(rawRows);
      if (parsed.length === 0) {
        setImportError('Spreadsheet tidak berisi data transaksi SAP yang sesuai.');
        return;
      }

      let nextList: NCProgressTransaction[] = [];
      if (importMode === 'replace') {
        nextList = parsed;
      } else {
        const existingMap = new Map(transactions.map((t) => [`${t.materialDocument}_${t.materialDocItem}_${t.movementType}`, t]));
        parsed.forEach((t) => {
          existingMap.set(`${t.materialDocument}_${t.materialDocItem}_${t.movementType}`, t);
        });
        nextList = Array.from(existingMap.values());
      }

      updateTransactionsList(nextList);
      setImportError(null);
      setIsImportModalOpen(false);
    } catch (err: unknown) {
      setImportError(`Gagal membaca file spreadsheet: ${err instanceof Error ? err.message : 'Error file'}`);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Hapus baris transaksi ini?')) {
      const nextList = transactions.filter((t) => t.id !== id);
      updateTransactionsList(nextList);
    }
  };

  // Chart Data: Progres Mutasi NC per Gudang (5A* = Gd.01 s/d 5N* = Gd.14)
  const gudangProgressChartData = useMemo(() => {
    const gdMap: Record<string, { ncIn: number; outRep: number; inPrime: number; reject: number }> = {};

    cleanTransactions.forEach((tx) => {
      const g = normalizeGudang(tx.storageLocation);
      if (!gdMap[g]) gdMap[g] = { ncIn: 0, outRep: 0, inPrime: 0, reject: 0 };
      const ton = (tx.quantity || tx.kgGI || tx.kgGR || 0) / 1000;
      if (tx.transactionType === 'IN_NC') gdMap[g].ncIn += ton;
      else if (tx.transactionType === 'OUT_REPAIR') gdMap[g].outRep += ton;
      else if (tx.transactionType === 'IN_OK_PRIME') gdMap[g].inPrime += ton;
    });

    Object.keys(gdMap).forEach((g) => {
      gdMap[g].reject = Math.max(0, gdMap[g].outRep - gdMap[g].inPrime);
    });

    const labels = Object.keys(gdMap).sort();
    return {
      labels,
      datasets: [
        {
          label: 'IN NC (309)',
          data: labels.map((l) => gdMap[l].ncIn),
          backgroundColor: '#f43f5e',
          hoverBackgroundColor: '#e11d48',
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'OUT Repair (261)',
          data: labels.map((l) => gdMap[l].outRep),
          backgroundColor: '#f59e0b',
          hoverBackgroundColor: '#d97706',
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'IN Prime OK (101)',
          data: labels.map((l) => gdMap[l].inPrime),
          backgroundColor: '#10b981',
          hoverBackgroundColor: '#059669',
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Reject Repair',
          data: labels.map((l) => gdMap[l].reject),
          backgroundColor: '#0ea5e9',
          hoverBackgroundColor: '#0284c7',
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    };
  }, [cleanTransactions]);

  // Chart Data: Total Akumulasi Mutasi All Gudang
  const donutChartData = useMemo(() => {
    let totalNCInTon = 0;
    let totalOutRepTon = 0;
    let totalInPrimeTon = 0;

    cleanTransactions.forEach((tx) => {
      const ton = (tx.quantity || tx.kgGI || tx.kgGR || 0) / 1000;
      if (tx.transactionType === 'IN_NC') totalNCInTon += ton;
      else if (tx.transactionType === 'OUT_REPAIR') totalOutRepTon += ton;
      else if (tx.transactionType === 'IN_OK_PRIME') totalInPrimeTon += ton;
    });

    const totalRejectTon = Math.max(0, totalOutRepTon - totalInPrimeTon);
    const totalTon = totalNCInTon + totalOutRepTon + totalInPrimeTon + totalRejectTon;

    return {
      totalTon,
      totalNCInTon,
      totalOutRepTon,
      totalInPrimeTon,
      totalRejectTon,
      chartData: {
        labels: [
          'IN NC (309)',
          'OUT Repair (261)',
          'IN Prime OK (101)',
          'Reject Repair'
        ],
        datasets: [
          {
            data: [
              parseFloat(totalNCInTon.toFixed(3)),
              parseFloat(totalOutRepTon.toFixed(3)),
              parseFloat(totalInPrimeTon.toFixed(3)),
              parseFloat(totalRejectTon.toFixed(3))
            ],
            backgroundColor: [
              '#f43f5e', // Rose
              '#f59e0b', // Amber
              '#10b981', // Emerald
              '#0ea5e9'  // Sky
            ],
            hoverBackgroundColor: [
              '#e11d48',
              '#d97706',
              '#059669',
              '#0284c7'
            ],
            borderWidth: 2,
            borderColor: '#ffffff',
            spacing: 2,
            borderRadius: 4,
            hoverOffset: 6
          }
        ]
      }
    };
  }, [cleanTransactions]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <GitFork className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <h1 className="text-base font-bold text-white font-sans tracking-tight">
            Monitoring Progres NC & Repair
          </h1>
        </div>
      </div>

      {/* Visual Charts Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Card: Bar Chart */}
        <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Progres Mutasi NC per Gudang
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Perbandingan pergerakan material NC, repair, dan prime (Ton)
                </p>
              </div>
            </div>

            {/* Custom Clean Legend */}
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <span>IN NC (309)</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span>OUT Repair (261)</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span>IN Prime OK (101)</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                <span>Reject Repair</span>
              </div>
            </div>
          </div>

          <div className="h-56 w-full pt-1">
            <Bar
              data={gudangProgressChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.94)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f1f5f9',
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 11 },
                    padding: { top: 8, bottom: 8, left: 12, right: 12 },
                    cornerRadius: 8,
                    boxPadding: 4,
                    usePointStyle: true,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                      label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.y || 0).toFixed(3)} Ton`
                    }
                  }
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: {
                      color: '#64748b',
                      font: { family: 'ui-monospace, monospace', size: 11, weight: 'bold' }
                    }
                  },
                  y: {
                    grid: {
                      color: '#f1f5f9'
                    },
                    ticks: {
                      color: '#94a3b8',
                      font: { family: 'ui-monospace, monospace', size: 10 }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Right Card: Donut Chart */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Total Akumulasi
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Seluruh gudang
              </p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200/70">
              {formatTon(donutChartData.totalTon, { decimals: 2 })} Ton
            </span>
          </div>

          <div className="h-40 sm:h-44 flex items-center justify-center relative my-auto">
            <Doughnut
              data={donutChartData.chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.94)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f1f5f9',
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 11 },
                    padding: { top: 8, bottom: 8, left: 12, right: 12 },
                    cornerRadius: 8,
                    boxPadding: 4,
                    usePointStyle: true,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                      label: (ctx) => ` ${ctx.label}: ${(ctx.parsed || 0).toFixed(3)} Ton`
                    }
                  }
                },
                cutout: '72%'
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                {formatTon(donutChartData.totalTon, { decimals: 2 })}
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
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-[11px] font-medium text-slate-600 truncate">IN NC (309)</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                {formatTon(donutChartData.totalNCInTon, { decimals: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[11px] font-medium text-slate-600 truncate">OUT REP (261)</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                {formatTon(donutChartData.totalOutRepTon, { decimals: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] font-medium text-slate-600 truncate">IN PRIME (101)</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                {formatTon(donutChartData.totalInPrimeTon, { decimals: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                <span className="text-[11px] font-medium text-slate-600 truncate">Reject Repair</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                {formatTon(donutChartData.totalRejectTon, { decimals: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Filtering Toolbar (Compact 1 Row) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Subtabs & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Subtabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 rounded-lg border border-slate-200/60 text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('in_nc')}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === 'in_nc'
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
              <span>IN NC (309)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('out_repair')}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === 'out_repair'
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Wrench className="h-3.5 w-3.5 text-amber-600" />
              <span>OUT Repair (261)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('in_prime')}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === 'in_prime'
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>IN Prime (101)</span>
            </button>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 rounded-lg border border-slate-200/60 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={cn(
                "px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === 'grouped'
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Layers className="h-3.5 w-3.5 text-slate-600" />
              <span>Gabung</span>
              <span className="px-1 py-0.2 rounded-full text-[10px] font-mono bg-slate-200/80 text-slate-700">
                {groupedItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={cn(
                "px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === 'flat'
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>Semua</span>
              <span className="px-1 py-0.2 rounded-full text-[10px] font-mono bg-slate-200/80 text-slate-700">
                {filteredTransactions.length}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Search, Gudang & Workcenter */}
        <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial sm:min-w-[420px] justify-end">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56 group">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
            <input
              type="text"
              placeholder="Cari Material, NCR, Batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-600 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter Gudang */}
          <select
            value={selectedGudang}
            onChange={(e) => setSelectedGudang(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-600 transition-all cursor-pointer"
          >
            <option value="ALL">Semua Gudang</option>
            {gudangList.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Filter Work Center */}
          <select
            value={selectedWorkCenter}
            onChange={(e) => setSelectedWorkCenter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-600 transition-all cursor-pointer"
          >
            <option value="ALL">Semua WC</option>
            {workCenterList.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PRIMARY TRANSACTION / GROUPED TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'grouped' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 backdrop-blur-sm text-slate-500 font-semibold text-[11px] tracking-wider uppercase border-b border-slate-200/80 select-none">
                  <th className="py-3 px-3.5 w-12 text-center">No</th>
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:text-emerald-950 hover:bg-slate-100/60 transition-colors group/th"
                    onClick={() => handleToggleSort(activeSubTab === 'in_nc' ? 'ncrNumber' : 'order')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{activeSubTab === 'in_nc' ? 'No NCR & Masalah' : 'Order'}</span>
                      {sortField === (activeSubTab === 'in_nc' ? 'ncrNumber' : 'order') ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:text-emerald-950 hover:bg-slate-100/60 transition-colors group/th"
                    onClick={() => handleToggleSort('material')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Ukuran Material</span>
                      {sortField === 'material' ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3.5">Gudang & Batch</th>
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:text-emerald-950 hover:bg-slate-100/60 transition-colors group/th"
                    onClick={() => handleToggleSort('postingDate')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tgl Posting</span>
                      {sortField === 'postingDate' ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3.5 text-center cursor-pointer hover:text-emerald-950 hover:bg-slate-100/60 transition-colors group/th"
                    onClick={() => handleToggleSort('transactionCount')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Jml Dokumen</span>
                      {sortField === 'transactionCount' ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3.5 text-right cursor-pointer hover:text-emerald-950 hover:bg-slate-100/60 transition-colors group/th"
                    onClick={() => handleToggleSort('totalQty')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Kuantitas</span>
                      {sortField === 'totalQty' ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/90">
                {sortedGroupedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                      Tidak ada data yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  sortedGroupedItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedGroup(item)}
                      className="hover:bg-emerald-50/30 cursor-pointer transition-all duration-150 group"
                    >
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400 text-xs font-medium">{idx + 1}</td>
                      <td className="py-3 px-3.5 max-w-sm">
                        {activeSubTab === 'in_nc' ? (
                          <>
                            {item.ncrNumber ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50/80 border border-rose-200/70 text-rose-700 font-mono font-bold text-xs tracking-tight shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-rose-200 shrink-0" />
                                <span>{item.ncrNumber}</span>
                              </div>
                            ) : (
                              <div className="font-mono text-slate-500 text-xs italic">
                                Non-NCR {item.order ? `(Order: ${item.order})` : ''}
                              </div>
                            )}
                            <div className="text-xs text-slate-700 font-medium truncate mt-1" title={item.problemRemark}>
                              {item.problemRemark || '-'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-mono font-bold text-slate-800 text-xs">
                              {item.order || '-'}
                            </div>
                            {item.workCenter && (
                              <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                {item.workCenter}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3 px-3.5 max-w-xs">
                        <div className="font-mono font-bold text-slate-900 text-xs tracking-tight">
                          {item.ukuran}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate tracking-tight mt-0.5" title={item.material}>
                          {item.material}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-xs">
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          {item.gudangs.map((g) => (
                            <span key={g} className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200/70 shadow-2xs">
                              {g}
                            </span>
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono font-medium">
                          {item.batches.length <= 2 ? (
                            item.batches.join(', ')
                          ) : (
                            <>
                              <span className="font-semibold text-slate-700">{item.batches[0]}</span>{' '}
                              <span className="text-slate-400 font-normal">(+{item.batches.length - 1} batch)</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600 text-xs font-medium whitespace-nowrap">
                        {formatExcelDate(item.postingDate)}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100/90 text-slate-700 border border-slate-200/70 font-mono group-hover:bg-emerald-50 group-hover:text-emerald-800 group-hover:border-emerald-200/80 transition-colors shadow-2xs">
                          {item.transactionCount} Dokumen
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                          {formatQty(item.totalQty)} <span className="font-sans font-medium text-slate-500 text-[11px]">Btg</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 font-semibold mt-0.5 whitespace-nowrap">
                          {formatTon(item.totalTon, { decimals: 3 })} Ton
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedGroup(item)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50/90 hover:bg-emerald-600 text-emerald-700 hover:text-white text-xs font-semibold border border-emerald-200/80 hover:border-emerald-600 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer active:scale-95"
                            title="Buka rincian dokumen SAP"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Detail</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 backdrop-blur-sm text-slate-500 font-semibold text-[11px] tracking-wider uppercase border-b border-slate-200/80 select-none">
                  <th className="py-3 px-3.5 w-12 text-center">No</th>
                  <th className="py-3 px-3.5">Tipe / Mvt</th>
                  <th className="py-3 px-3.5">Tgl Posting / Jam</th>
                  <th className="py-3 px-3.5">Ukuran</th>
                  <th className="py-3 px-3.5">Batch & Gudang</th>
                  <th className="py-3 px-3.5">
                    {activeSubTab === 'in_nc' ? 'Keterangan NC' : 'Order / Workcenter'}
                  </th>
                  <th className="py-3 px-3.5 text-right">Kuantitas</th>
                  <th className="py-3 px-3.5 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/90">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                      Tidak ada data transaksi yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, idx) => {
                    const typeBadge =
                      tx.transactionType === 'IN_NC' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                          IN NC ({tx.movementType})
                        </span>
                      ) : tx.transactionType === 'OUT_REPAIR' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                          OUT REP ({tx.movementType})
                        </span>
                      ) : tx.transactionType === 'IN_OK_PRIME' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                          IN PRIME ({tx.movementType})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                          MVT {tx.movementType}
                        </span>
                      );

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-all duration-150">
                        <td className="py-3 px-3.5 text-center font-mono text-slate-400 text-xs font-medium">{idx + 1}</td>
                        <td className="py-3 px-3.5">{typeBadge}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-600 text-xs font-medium whitespace-nowrap">
                          <div>{formatExcelDate(tx.postingDate || tx.entryDate)}</div>
                          <div className="text-[10px] text-slate-400">{formatExcelTime(tx.timeOfEntry) || '-'}</div>
                        </td>
                        <td className="py-3 px-3.5 max-w-xs">
                          <div className="font-mono font-bold text-slate-900 text-xs tracking-tight">
                            {parseMaterialUkuran(tx.material, tx.materialDescription)}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-xs">
                          <div className="font-bold text-slate-800">{tx.batch}</div>
                          <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                            {normalizeGudang(tx.storageLocation)}{' '}
                            <span className="text-slate-400 font-normal">({tx.storageLocation})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 max-w-sm">
                          {activeSubTab === 'in_nc' ? (
                            <div>
                              {tx.ncrNumber && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50/80 border border-rose-200/70 text-rose-700 font-mono font-bold text-xs tracking-tight shadow-2xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-rose-200 shrink-0" />
                                  <span>{tx.ncrNumber}</span>
                                </div>
                              )}
                              <div className="text-xs text-slate-700 font-medium truncate mt-1" title={tx.problemRemark || '-'}>
                                {tx.problemRemark || '-'}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-mono text-xs text-slate-800 font-bold">{tx.order || '-'}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{tx.workCenter || '-'}</div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                            {formatQty(tx.qtyInUnOfEntry)} <span className="font-sans font-medium text-slate-500 text-[11px]">Btg</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 font-semibold mt-0.5 whitespace-nowrap">
                            {formatTon((tx.quantity || tx.kgGI || tx.kgGR || 0) / 1000, { decimals: 3 })} Ton
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const item = pipeline.find((p) =>
                                  p.transactions.some((t) => t.id === tx.id) ||
                                  (tx.ncrNumber && p.ncrNumber === tx.ncrNumber) ||
                                  (tx.order && p.order === tx.order)
                                );
                                if (item) {
                                  setSelectedDrilldown(item);
                                } else {
                                  setSelectedDrilldown({
                                    key: tx.id || String(idx),
                                    material: tx.material,
                                    materialDescription: tx.materialDescription,
                                    customer: tx.customer || '-',
                                    ncrNumber: tx.ncrNumber,
                                    problemRemark: tx.problemRemark || tx.text,
                                    order: tx.order,
                                    workCenter: tx.workCenter,
                                    qtyNCIn: tx.transactionType === 'IN_NC' ? tx.qtyInUnOfEntry : 0,
                                    kgNCIn: tx.transactionType === 'IN_NC' ? (tx.quantity || tx.kgGI || tx.kgGR || 0) : 0,
                                    qtyOutRepair: tx.transactionType === 'OUT_REPAIR' ? tx.qtyInUnOfEntry : 0,
                                    kgOutRepair: tx.transactionType === 'OUT_REPAIR' ? (tx.quantity || tx.kgGI || tx.kgGR || 0) : 0,
                                    qtyInPrime: tx.transactionType === 'IN_OK_PRIME' ? tx.qtyInUnOfEntry : 0,
                                    kgInPrime: tx.transactionType === 'IN_OK_PRIME' ? (tx.quantity || tx.kgGI || tx.kgGR || 0) : 0,
                                    status: tx.transactionType === 'IN_OK_PRIME' ? 'SELESAI OK' : tx.transactionType === 'OUT_REPAIR' ? 'DALAM REPAIR' : 'TERDAFTAR NC',
                                    recoveryRate: 0,
                                    transactions: [tx]
                                  });
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200/60 transition-all cursor-pointer"
                              title="Detail Alur Mutasi & Dokumen"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200/60 transition-all cursor-pointer"
                                title="Hapus baris"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL 0: DETAIL DOKUMEN PER NO NCR (GROUPED VIEW) */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#047857] text-white">
                  <ShieldAlert className="h-4 w-4 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Rincian Dokumen SAP — {activeSubTab === 'in_nc' ? (selectedGroup.ncrNumber || 'Non-NCR') : (selectedGroup.order ? `Order ${selectedGroup.order}` : 'Non-Order')}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      {selectedGroup.transactions.length} Dokumen SAP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedGroup.ukuran} &bull; {selectedGroup.material}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-md border border-slate-200 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Keterangan / Alasan NC</div>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">
                    {selectedGroup.problemRemark || '-'}
                  </div>
                  {selectedGroup.customer && (
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      Cust: {selectedGroup.customer}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Lokasi Gudang & Batch</div>
                  <div className="font-mono text-xs font-bold text-emerald-800 mt-0.5">
                    {selectedGroup.gudangs.join(', ')}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1 truncate" title={selectedGroup.batches.join(', ')}>
                    Batch: {selectedGroup.batches.join(', ')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Akumulasi</div>
                  <div className="font-mono font-bold text-slate-900 text-base mt-0.5">
                    {formatQty(selectedGroup.totalQty)} <span className="text-xs font-normal text-slate-500">Btg</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-emerald-800">
                    {formatTon(selectedGroup.totalTon, { decimals: 3 })} Ton ({selectedGroup.totalKg.toLocaleString('id-ID')} KG)
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700">
                    Daftar Baris Dokumen Transaksi ({selectedGroup.transactions.length})
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Pergerakan SAP MB51
                  </span>
                </div>

                <div className="border border-slate-200 rounded-md overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2 px-2.5 text-center w-8">No</th>
                        <th className="py-2 px-2.5">MatDoc & Item</th>
                        <th className="py-2 px-2.5">Mvt</th>
                        <th className="py-2 px-2.5">Tgl Posting / Jam</th>
                        <th className="py-2 px-2.5">Batch</th>
                        <th className="py-2 px-2.5">SLoc</th>
                        <th className="py-2 px-2.5 text-right">Kuantitas</th>
                        <th className="py-2 px-2.5">User</th>
                        <th className="py-2 px-2.5">Catatan</th>
                        {canEdit && <th className="py-2 px-2.5 text-center w-10">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {selectedGroup.transactions.map((tx, idx) => (
                        <tr key={tx.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2.5 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-slate-800">
                            <div>{tx.materialDocument}</div>
                            <div className="text-[10px] text-slate-400 font-normal">Item {tx.materialDocItem}</div>
                          </td>
                          <td className="py-2 px-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              {tx.movementType}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-[11px] text-slate-600">
                            <div>{formatExcelDate(tx.postingDate || tx.entryDate)}</div>
                            <div className="text-[10px] text-slate-400">{formatExcelTime(tx.timeOfEntry)}</div>
                          </td>
                          <td className="py-2 px-2.5 font-bold text-slate-800">{tx.batch}</td>
                          <td className="py-2 px-2.5 text-[11px] text-emerald-800">{tx.storageLocation}</td>
                          <td className="py-2 px-2.5 text-right">
                            <div className="font-bold text-slate-900">{formatQty(tx.qtyInUnOfEntry)} Btg</div>
                            <div className="text-[10px] text-slate-500">{(tx.quantity || tx.kgGI || tx.kgGR || 0).toLocaleString('id-ID')} KG</div>
                          </td>
                          <td className="py-2 px-2.5 text-[10px] text-slate-500">{tx.userName || '-'}</td>
                          <td className="py-2 px-2.5 text-[10px] text-slate-600 font-sans max-w-xs truncate" title={tx.text || '-'}>
                            {tx.text || '-'}
                          </td>
                          {canEdit && (
                            <td className="py-2 px-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleTxFromGroup(tx.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus baris dokumen ini"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-3 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Total: {selectedGroup.transactions.length} transaksi SAP
              </span>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-1.5 rounded-md bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: DRILLDOWN DETAIL ALUR TRANSAKSI */}
      {selectedDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#047857] text-white">
                  <GitFork className="h-4 w-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Detail Alur Mutasi & Dokumen SAP
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {parseMaterialUkuran(selectedDrilldown.material, selectedDrilldown.materialDescription)} &bull; {selectedDrilldown.customer}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDrilldown(null)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Summary Info Cards */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-md border border-slate-200 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">No NCR</div>
                  <div className="font-mono font-bold text-rose-800 text-xs mt-0.5">{selectedDrilldown.ncrNumber || '-'}</div>
                  <div className="text-[10px] text-slate-600 mt-1">{selectedDrilldown.problemRemark || '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">SPK Repair / W.Center</div>
                  <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{selectedDrilldown.order || '-'}</div>
                  <div className="text-[10px] text-slate-600 mt-1">{selectedDrilldown.workCenter || 'REP-501'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Recovery Rate</div>
                  <div className="font-mono font-bold text-emerald-800 text-base mt-0.5">
                    {selectedDrilldown.recoveryRate.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {formatQty(selectedDrilldown.qtyInPrime)} / {formatQty(selectedDrilldown.qtyOutRepair || selectedDrilldown.qtyNCIn)} Btg
                  </div>
                </div>
              </div>

              {/* Transactions Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700">
                  Daftar Transaksi Terkait ({selectedDrilldown.transactions.length} Dokumen SAP)
                </h4>
                <div className="space-y-2">
                  {selectedDrilldown.transactions.map((tx, i) => (
                    <div
                      key={tx.id || i}
                      className={cn(
                        "p-3 rounded-md border text-xs flex items-start justify-between gap-3",
                        tx.transactionType === 'IN_NC'
                          ? "bg-rose-50/50 border-rose-200"
                          : tx.transactionType === 'OUT_REPAIR'
                          ? "bg-amber-50/50 border-amber-200"
                          : "bg-emerald-50/50 border-emerald-200"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold font-mono",
                            tx.transactionType === 'IN_NC'
                              ? "bg-rose-200 text-rose-900"
                              : tx.transactionType === 'OUT_REPAIR'
                              ? "bg-amber-200 text-amber-900"
                              : "bg-emerald-200 text-emerald-900"
                          )}>
                            MVT {tx.movementType}
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            MatDoc: {tx.materialDocument} (Item {tx.materialDocItem})
                          </span>
                        </div>
                        <div className="text-slate-600 font-mono text-[11px]">
                          Tgl Posting: <b>{formatExcelDate(tx.postingDate || tx.entryDate)}</b> ({formatExcelTime(tx.timeOfEntry) || '-'}) &bull; SLoc: <b>{tx.storageLocation}</b> &bull; User: <b>{tx.userName}</b>
                        </div>
                        <div className="text-[11px] text-slate-700 font-mono">
                          Batch: <b>{tx.batch}</b> &bull; Qty: <b>{formatQty(tx.qtyInUnOfEntry)} Btg</b> &bull; Berat: <b>{tx.quantity || tx.kgGI || tx.kgGR} KG</b>
                        </div>
                        {tx.text && (
                          <div className="text-[11px] text-slate-500 bg-white/80 p-1.5 rounded border border-slate-200">
                            Catatan: {tx.text}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-3 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDrilldown(null)}
                className="px-4 py-1.5 rounded-md bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPOR DATA TRANSAKSI / PASTE TSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#047857] text-white">
                  <Upload className="h-4 w-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Impor Data Transaksi Mutasi NC (SAP MB51 / ZMM)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mendukung pergerakan MVT 309 (Masuk NC), MVT 261 REP, dan MVT 101 REP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportError(null);
                }}
                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-900 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Mode Import */}
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                <span>Metode Impor:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-emerald-700"
                  />
                  <span>Gabungkan (Append / Update)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-emerald-700"
                  />
                  <span>Timpa Seluruh Data (Replace)</span>
                </label>
              </div>

              {/* Upload Excel */}
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-md bg-slate-50 text-center hover:bg-slate-100/60 transition-colors">
                <FileSpreadsheet className="h-8 w-8 text-emerald-800 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800 mb-1">Upload File Spreadsheet (.xlsx / .xls)</p>
                <p className="text-[11px] text-slate-500 mb-3">Export standar SAP MB51 / ZMM Transaksi Mutasi</p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 transition-colors cursor-pointer shadow-2xs">
                  <span>Pilih File Excel</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Paste Text / TSV */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Atau Tempel (Paste) Teks dari SAP GUI / Excel:</span>
                  <span className="text-[10px] font-mono text-slate-400">Tab-separated / TSV</span>
                </label>
                <textarea
                  rows={6}
                  placeholder={`Contyle paste:\n10/09/2026\t06:55:48\t1105\t5M08\t10/09/2026\t101\tPT. SETIA GUNA SEJATI\t\t500000408790\tREP-501\tYAB12BFH0250+01796\t...\n10/09/2026\t06:47:37\t1105\t5M08\t10/09/2026\t261\t\t\t500000408790\tREP-501\tYAB12BFH0250+01796\t...`}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full p-2.5 font-mono text-[11px] border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-slate-50 text-slate-800"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 p-3.5 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                {pasteText.trim() ? `${pasteText.trim().split(/\r?\n/).length} baris teks terdeteksi` : 'Siap memproses'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessImportText}
                  disabled={!pasteText.trim()}
                  className="px-4 py-1.5 rounded-md bg-[#047857] hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  Proses Data Teks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH / EDIT TRANSAKSI MANUAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#047857] text-white">
                  <Plus className="h-4 w-4 text-amber-300" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Input Transaksi Mutasi NC Manual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);

                const mvt = String(fd.get('movementType') || '309');
                const wc = String(fd.get('workCenter') || '');
                const ord = String(fd.get('order') || '');
                const text = String(fd.get('text') || '');
                const qtyVal = Math.abs(parseFloat(String(fd.get('qty') || '0')) || 0);
                const kgVal = Math.abs(parseFloat(String(fd.get('kg') || '0')) || 0);

                let txType: NCProgressTransaction['transactionType'] = 'OTHER';
                if (mvt === '309') txType = 'IN_NC';
                else if (mvt === '261') txType = 'OUT_REPAIR';
                else if (mvt === '101') txType = 'IN_OK_PRIME';

                const newTx: NCProgressTransaction = {
                  id: `MANUAL_${Date.now()}`,
                  entryDate: String(fd.get('postingDate') || new Date().toLocaleDateString('id-ID')),
                  timeOfEntry: new Date().toLocaleTimeString('id-ID'),
                  plant: '1105',
                  storageLocation: String(fd.get('storageLocation') || '5M08'),
                  postingDate: String(fd.get('postingDate') || new Date().toLocaleDateString('id-ID')),
                  movementType: mvt,
                  customer: String(fd.get('customer') || ''),
                  order: ord,
                  workCenter: wc,
                  material: String(fd.get('material') || ''),
                  materialDescription: String(fd.get('materialDescription') || ''),
                  batch: String(fd.get('batch') || ''),
                  qtyInUnOfEntry: qtyVal,
                  quantity: kgVal,
                  materialDocument: String(fd.get('materialDocument') || `DOC-${Date.now()}`),
                  materialDocItem: '1',
                  userName: 'MANUAL_USER',
                  text: text,
                  unloadingPoint: String(fd.get('unloadingPoint') || ''),
                  salesOrder: String(fd.get('salesOrder') || ''),
                  kgGI: mvt === '261' ? kgVal : 0,
                  kgGR: mvt === '101' ? kgVal : 0,
                  transactionType: txType,
                  ...extractNCRAndRemark(text)
                };

                updateTransactionsList([newTx, ...transactions]);
                setIsAddModalOpen(false);
              }}
              className="p-5 space-y-3.5 overflow-y-auto text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Movement Type (MVT)</label>
                  <select
                    name="movementType"
                    defaultValue="309"
                    className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="309">309 - Reclassification Masuk NC</option>
                    <option value="261">261 - Goods Issue ke SPK Repair</option>
                    <option value="101">101 - Goods Receipt Hasil Selesai (OK/Prime)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SLoc / Gudang</label>
                  <input
                    type="text"
                    name="storageLocation"
                    defaultValue="5M08"
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="5M08 / 5M13"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode Material</label>
                  <input
                    type="text"
                    name="material"
                    className="w-full p-2 border border-slate-300 rounded-md font-mono"
                    placeholder="YAB12BFH0250+01796"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No Batch</label>
                  <input
                    type="text"
                    name="batch"
                    className="w-full p-2 border border-slate-300 rounded-md font-mono"
                    placeholder="5263000HJA"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Material</label>
                <input
                  type="text"
                  name="materialDescription"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  placeholder="PM 11APOIBRB MILL CUT DEB MP 34,0x2,5x1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer</label>
                  <input
                    type="text"
                    name="customer"
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="PT. SETIA GUNA SEJATI"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Posting</label>
                  <input
                    type="text"
                    name="postingDate"
                    defaultValue={new Date().toLocaleDateString('id-ID')}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono"
                    placeholder="10/09/2026"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SPK / Order No (Repair)</label>
                  <input
                    type="text"
                    name="order"
                    className="w-full p-2 border border-slate-300 rounded-md font-mono"
                    placeholder="500000408790"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Work Center</label>
                  <input
                    type="text"
                    name="workCenter"
                    defaultValue="REP-501"
                    className="w-full p-2 border border-slate-300 rounded-md font-mono"
                    placeholder="REP-501"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qty Batang / Pcs</label>
                  <input
                    type="number"
                    name="qty"
                    className="w-full p-2 border border-slate-300 rounded-md font-mono"
                    placeholder="2599"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Berat Total (KG)</label>
                  <input
                    type="number"
                    step="0.001"
                    name="kg"
                    className="w-full p-2 border border-slate-300 rounded-md font-mono"
                    placeholder="907.051"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Masalah / No NCR</label>
                <input
                  type="text"
                  name="text"
                  className="w-full p-2 border border-slate-300 rounded-md"
                  placeholder="21/NCR-SKF/IX/2026 KARAT LUAR DALAM SEBAGIAN"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#047857] hover:bg-emerald-800 text-white font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
