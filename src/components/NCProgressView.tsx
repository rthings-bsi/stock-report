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
  classifyTransaction,
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
  XCircle,
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
  Eye,
  BarChart3,
  PieChart,
  Table2
} from 'lucide-react';
import { CustomizableCard, CardWidth } from './CustomizableCard';

ChartJS.register(...registerables);

interface NCProgressViewProps {
  data?: NCProgressTransaction[];
  isAdmin?: boolean;
  canEdit?: boolean;
  isCustomizing?: boolean;
  onDataUpdate?: (newData: NCProgressTransaction[]) => void;
}

type SubTabType = 'in_nc' | 'out_repair' | 'in_prime' | 'reject_repair';

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
  isCustomizing = false,
  onDataUpdate
}) => {
  const [transactions, setTransactions] = useState<NCProgressTransaction[]>(data);
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('in_nc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGudang, setSelectedGudang] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [selectedWorkCenter, setSelectedWorkCenter] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | 'Grade C' | 'Grade E'>('ALL');
  const [activeChartFilter, setActiveChartFilter] = useState<{
    gudang: string;
    datasetIndex: number;
    label: string;
  } | null>(null);

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

  // Customizable Cards & Layout state
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('spindo_layout_nc_progress_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validIds = new Set(DEFAULT_CARDS.map((c) => c.id));
          const validSaved = parsed.filter((c: CardState) => validIds.has(c.id));
          DEFAULT_CARDS.forEach((dc) => {
            if (!validSaved.some((c: CardState) => c.id === dc.id)) {
              validSaved.push(dc);
            }
          });
          setCards(validSaved);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('spindo_layout_nc_progress_v1', JSON.stringify(cards));
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

  // Filter transaksi Progres NC:
  // 1. MVT 261, 262, 101: HANYA izinkan Work Center yang diawali 'REP' (case-insensitive)
  // 2. MVT 309: HANYA izinkan batch berakhiran 'C' atau 'E'
  // 3. Abaikan transaksi 'OTHER'
  const cleanTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const m = String(t.movementType || '').trim();
        const wc = String(t.workCenter || '').trim().toUpperCase();
        const isRepWC = wc.startsWith('REP');

        // MVT 261, 262, 101, 551, 553, 555: Wajib work center REP*
        if (
          m === '261' || m.startsWith('261') ||
          m === '262' || m.startsWith('262') ||
          m === '101' || m.startsWith('101') ||
          m === '551' || m.startsWith('551') ||
          m === '553' || m.startsWith('553') ||
          m === '555' || m.startsWith('555') ||
          t.transactionType === 'OUT_REPAIR' ||
          t.transactionType === 'OUT_REPAIR_RETURN' ||
          t.transactionType === 'IN_OK_PRIME' ||
          t.transactionType === 'REJECT_REPAIR'
        ) {
          if (!isRepWC) return false;
        }

        // Abaikan transaksi yang bukan alur NC/Repair
        if (t.transactionType === 'OTHER') {
          return false;
        }

        // Filter khusus IN NC (MVT 309): Hanya ambil batch NC yang berakhiran 'C' atau 'E'
        if (t.transactionType === 'IN_NC' || m === '309' || m.startsWith('309')) {
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

  // Daftar tanggal transaksi yang tersedia (diambil dari postingDate / entryDate)
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    cleanTransactions.forEach((t) => {
      const d = formatExcelDate(t.postingDate || t.entryDate);
      if (d) dates.add(d);
    });
    return Array.from(dates).sort((a, b) => {
      const partsA = a.split(/[\/\-.]/);
      const partsB = b.split(/[\/\-.]/);
      if (partsA.length === 3 && partsB.length === 3) {
        const isoA = `${partsA[2]}-${partsA[1]}-${partsA[0]}`;
        const isoB = `${partsB[2]}-${partsB[1]}-${partsB[0]}`;
        return isoB.localeCompare(isoA);
      }
      return b.localeCompare(a);
    });
  }, [cleanTransactions]);

  // Transaksi yang telah difilter berdasarkan tanggal terpilih
  const dateFilteredTransactions = useMemo(() => {
    if (selectedDate === 'ALL') return cleanTransactions;
    return cleanTransactions.filter((t) => {
      const d = formatExcelDate(t.postingDate || t.entryDate);
      return d === selectedDate || t.postingDate === selectedDate || t.entryDate === selectedDate;
    });
  }, [cleanTransactions, selectedDate]);

  // Build Pipeline & Summary (Filtered by Date if active)
  const pipeline = useMemo(() => {
    return buildNCProgressPipeline(dateFilteredTransactions);
  }, [dateFilteredTransactions]);

  const summary = useMemo<NCProgressSummary>(() => {
    return computeNCProgressSummary(dateFilteredTransactions, pipeline);
  }, [dateFilteredTransactions, pipeline]);

  // Dynamic filter lists
  const gudangList = useMemo(() => {
    return Array.from(
      new Set(cleanTransactions.map((t) => normalizeGudang(t.storageLocation)).filter(Boolean))
    ).sort();
  }, [cleanTransactions]);

  // Filtered Raw Transactions
  const filteredTransactions = useMemo(() => {
    return dateFilteredTransactions.filter((t) => {
      // Subtab filter
      if (activeSubTab === 'in_nc' && t.transactionType !== 'IN_NC') return false;
      if (activeSubTab === 'out_repair' && t.transactionType !== 'OUT_REPAIR' && t.transactionType !== 'OUT_REPAIR_RETURN') return false;
      if (activeSubTab === 'in_prime' && t.transactionType !== 'IN_OK_PRIME') return false;
      // Khusus subtab reject_repair: Tampilkan mutasi repair penyusun (261, 262, 101)
      if (activeSubTab === 'reject_repair' && t.transactionType !== 'OUT_REPAIR' && t.transactionType !== 'OUT_REPAIR_RETURN' && t.transactionType !== 'IN_OK_PRIME') return false;

      // Filter grade untuk IN_NC (Grade C vs Grade E)
      if (activeSubTab === 'in_nc' && selectedGrade !== 'ALL') {
        const b = (t.batch || '').trim().toUpperCase();
        const isGradeE = b.endsWith('E') || (!b.endsWith('C') && ((t.text || '').toUpperCase().includes('GRADE E') || (t.materialDescription || '').toUpperCase().includes('GRADE E')));
        if (selectedGrade === 'Grade C' && isGradeE) return false;
        if (selectedGrade === 'Grade E' && !isGradeE) return false;
      }

      const g = normalizeGudang(t.storageLocation);
      const matchGudang = selectedGudang === 'ALL' || g === selectedGudang || t.storageLocation === selectedGudang;
      const matchWC = selectedWorkCenter === 'ALL' || t.workCenter === selectedWorkCenter;

      const q = searchQuery.toLowerCase().trim();
      const dateStr = formatExcelDate(t.postingDate || t.entryDate).toLowerCase();
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
        (t.salesOrder && t.salesOrder.toLowerCase().includes(q)) ||
        (t.postingDate && t.postingDate.toLowerCase().includes(q)) ||
        (t.entryDate && t.entryDate.toLowerCase().includes(q)) ||
        dateStr.includes(q);

      return matchGudang && matchWC && matchSearch;
    }).sort((a, b) => {
      const dateA = a.postingDate || a.entryDate || '';
      const dateB = b.postingDate || b.entryDate || '';
      return dateB.localeCompare(dateA);
    });
  }, [dateFilteredTransactions, activeSubTab, selectedGudang, selectedWorkCenter, searchQuery, selectedGrade]);

  // Daftar Order Repair untuk Subtab 'Reject / DG Repair' (Rumus: 261 - 262 - 101)
  const rejectRepairPipelineItems = useMemo(() => {
    return pipeline
      .filter((item) => {
        // HANYA tampilkan item yang benar-benar memiliki aktivitas repair (261, 262, atau 101) atau ada reject
        const hasRepairActivity =
          (item.qty261 ?? 0) > 0 ||
          (item.qty262 ?? 0) > 0 ||
          item.qtyOutRepair > 0 ||
          item.qtyInPrime > 0 ||
          item.qtyReject > 0;

        // Jangan tampilkan item yang seluruh kuantitas repair-nya 0 (seperti stok NC murni yang belum direpair)
        if (!hasRepairActivity) return false;

        // Jangan tampilkan jika order '0' tanpa nomor SPK yang valid
        if (item.order === '0' && !hasRepairActivity) return false;

        const matchGudang =
          selectedGudang === 'ALL' ||
          item.slocNC === selectedGudang ||
          item.slocPrime === selectedGudang ||
          normalizeGudang(item.slocNC) === selectedGudang ||
          normalizeGudang(item.slocPrime) === selectedGudang;
        const matchWC = selectedWorkCenter === 'ALL' || item.workCenter === selectedWorkCenter;

        const q = searchQuery.toLowerCase().trim();
        const dateMatches = item.transactions?.some((tx) => {
          const dStr = formatExcelDate(tx.postingDate || tx.entryDate).toLowerCase();
          return (tx.postingDate && tx.postingDate.toLowerCase().includes(q)) ||
                 (tx.entryDate && tx.entryDate.toLowerCase().includes(q)) ||
                 dStr.includes(q);
        });
        const matchSearch =
          q === '' ||
          item.material.toLowerCase().includes(q) ||
          item.materialDescription.toLowerCase().includes(q) ||
          (item.customer && item.customer.toLowerCase().includes(q)) ||
          (item.order && item.order.toLowerCase().includes(q)) ||
          (item.workCenter && item.workCenter.toLowerCase().includes(q)) ||
          (item.batchNC && item.batchNC.toLowerCase().includes(q)) ||
          (item.batchPrime && item.batchPrime.toLowerCase().includes(q)) ||
          (item.ncrNumber && item.ncrNumber.toLowerCase().includes(q)) ||
          (item.problemRemark && item.problemRemark.toLowerCase().includes(q)) ||
          (item.lastDate && item.lastDate.toLowerCase().includes(q)) ||
          Boolean(dateMatches);

        return matchGudang && matchWC && matchSearch;
      })
      .sort((a, b) => {
        if (b.qtyReject !== a.qtyReject) {
          return b.qtyReject - a.qtyReject;
        }
        return (b.lastDate || '').localeCompare(a.lastDate || '');
      });
  }, [pipeline, selectedGudang, selectedWorkCenter, searchQuery]);

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
      } else if (activeSubTab === 'reject_repair') {
        if (tx.order && tx.order.trim() && tx.order !== '0') {
          key = `ORD_${tx.order.trim()}`;
        } else if (tx.ncrNumber && tx.ncrNumber.trim()) {
          key = `NCR_${tx.ncrNumber.trim().toUpperCase()}`;
        } else {
          key = `MAT_${tx.material}_${tx.batch}`;
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

  // Sorting state khusus tabel Reject / DG Repair
  const [rejectSortField, setRejectSortField] = useState<string>('qtyReject');
  const [rejectSortDir, setRejectSortDir] = useState<'asc' | 'desc'>('desc');

  const handleToggleRejectSort = (field: string) => {
    if (rejectSortField === field) {
      setRejectSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setRejectSortField(field);
      setRejectSortDir('desc');
    }
  };

  const sortedRejectRepairItems = useMemo(() => {
    return [...rejectRepairPipelineItems].sort((a, b) => {
      let valA: string | number = a.qtyReject;
      let valB: string | number = b.qtyReject;
      if (rejectSortField === 'order') {
        valA = a.order || '';
        valB = b.order || '';
      } else if (rejectSortField === 'material') {
        valA = parseMaterialUkuran(a.material, a.materialDescription);
        valB = parseMaterialUkuran(b.material, b.materialDescription);
      } else if (rejectSortField === 'qty261') {
        valA = a.qty261 ?? a.qtyOutRepair;
        valB = b.qty261 ?? b.qtyOutRepair;
      } else if (rejectSortField === 'qty262') {
        valA = a.qty262 ?? 0;
        valB = b.qty262 ?? 0;
      } else if (rejectSortField === 'qtyOutRepair') {
        valA = a.qtyOutRepair;
        valB = b.qtyOutRepair;
      } else if (rejectSortField === 'qtyInPrime') {
        valA = a.qtyInPrime;
        valB = b.qtyInPrime;
      } else if (rejectSortField === 'qtyReject') {
        valA = a.qtyReject;
        valB = b.qtyReject;
      } else if (rejectSortField === 'lastDate') {
        valA = a.lastDate || '';
        valB = b.lastDate || '';
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return rejectSortDir === 'asc' ? valA - valB : valB - valA;
      }
      return rejectSortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [rejectRepairPipelineItems, rejectSortField, rejectSortDir]);

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
    const gdMap: Record<string, { ncInGradeC: number; ncInGradeE: number; outRep: number; inPrime: number; reject: number }> = {};

    dateFilteredTransactions.forEach((tx) => {
      const g = normalizeGudang(tx.storageLocation);
      if (!gdMap[g]) gdMap[g] = { ncInGradeC: 0, ncInGradeE: 0, outRep: 0, inPrime: 0, reject: 0 };
      const ton = (tx.quantity || tx.kgGI || tx.kgGR || 0) / 1000;
      if (tx.transactionType === 'IN_NC') {
        const b = (tx.batch || '').trim().toUpperCase();
        if (b.endsWith('E') || (!b.endsWith('C') && ((tx.text || '').toUpperCase().includes('GRADE E') || (tx.materialDescription || '').toUpperCase().includes('GRADE E')))) {
          gdMap[g].ncInGradeE += ton;
        } else {
          gdMap[g].ncInGradeC += ton;
        }
      }
      else if (tx.transactionType === 'OUT_REPAIR') gdMap[g].outRep += ton;
      else if (tx.transactionType === 'OUT_REPAIR_RETURN') gdMap[g].outRep = Math.max(0, gdMap[g].outRep - ton);
      else if (tx.transactionType === 'IN_OK_PRIME') gdMap[g].inPrime += ton;
    });

    Object.keys(gdMap).forEach((g) => {
      gdMap[g].reject = Math.max(0, gdMap[g].outRep - gdMap[g].inPrime);
    });

    const labels = Object.keys(gdMap).sort();

    const datasetConfigs = [
      { label: 'IN NC Grade C (309)', key: 'ncInGradeC' as const, baseColor: '#3b82f6', hoverColor: '#2563eb' },
      { label: 'IN NC Grade E (309)', key: 'ncInGradeE' as const, baseColor: '#eab308', hoverColor: '#ca8a04' },
      { label: 'Bahan Repair (261)', key: 'outRep' as const, baseColor: '#f97316', hoverColor: '#ea580c' },
      { label: 'Hasil Repair (101)', key: 'inPrime' as const, baseColor: '#10b981', hoverColor: '#059669' },
      { label: 'Reject Repair', key: 'reject' as const, baseColor: '#ef4444', hoverColor: '#dc2626' }
    ];

    const datasets = datasetConfigs.map((cfg, dIdx) => {
      const isFilterActive = !!activeChartFilter;
      const bgColors = labels.map((l) => {
        if (!isFilterActive) return cfg.baseColor;
        const isSelected = activeChartFilter.gudang === l && activeChartFilter.datasetIndex === dIdx;
        return isSelected ? cfg.baseColor : `${cfg.baseColor}38`;
      });

      const borderColors = labels.map((l) => {
        if (!isFilterActive) return 'transparent';
        const isSelected = activeChartFilter.gudang === l && activeChartFilter.datasetIndex === dIdx;
        return isSelected ? '#0f172a' : 'transparent';
      });

      const borderWidths = labels.map((l) => {
        if (!isFilterActive) return 0;
        const isSelected = activeChartFilter.gudang === l && activeChartFilter.datasetIndex === dIdx;
        return isSelected ? 2 : 0;
      });

      return {
        label: cfg.label,
        data: labels.map((l) => gdMap[l][cfg.key]),
        backgroundColor: bgColors,
        hoverBackgroundColor: cfg.hoverColor,
        borderColor: borderColors,
        borderWidth: borderWidths,
        borderRadius: 4,
        borderSkipped: false
      };
    });

    return {
      labels,
      datasets
    };
  }, [dateFilteredTransactions, activeChartFilter]);

  const handleResetChartFilter = () => {
    setActiveChartFilter(null);
    setSelectedGudang('ALL');
    setSelectedGrade('ALL');
    setSelectedDate('ALL');
  };

  const handleChartBarClick = (_event: unknown, elements: { index: number; datasetIndex: number }[]) => {
    if (!elements || elements.length === 0) return;
    const { index, datasetIndex } = elements[0];
    const clickedGudang = gudangProgressChartData.labels[index];
    if (!clickedGudang) return;

    // Toggle reset jika batang yang sama diklik kembali
    if (
      activeChartFilter &&
      activeChartFilter.gudang === clickedGudang &&
      activeChartFilter.datasetIndex === datasetIndex
    ) {
      handleResetChartFilter();
      return;
    }

    const datasetLabels = [
      'IN NC Grade C (309)',
      'IN NC Grade E (309)',
      'Bahan Repair (261)',
      'Hasil Repair (101)',
      'Reject Repair'
    ];
    const label = datasetLabels[datasetIndex] || 'Mutasi NC';

    setActiveChartFilter({
      gudang: clickedGudang,
      datasetIndex,
      label
    });
    setSelectedGudang(clickedGudang);

    if (datasetIndex === 0) {
      setActiveSubTab('in_nc');
      setSelectedGrade('Grade C');
    } else if (datasetIndex === 1) {
      setActiveSubTab('in_nc');
      setSelectedGrade('Grade E');
    } else if (datasetIndex === 2) {
      setActiveSubTab('out_repair');
      setSelectedGrade('ALL');
    } else if (datasetIndex === 3) {
      setActiveSubTab('in_prime');
      setSelectedGrade('ALL');
    } else if (datasetIndex === 4) {
      setActiveSubTab('reject_repair');
      setSelectedGrade('ALL');
    }

    // Smooth scroll ke tabel progres NC
    setTimeout(() => {
      const tableElem = document.getElementById('table-nc-progress');
      if (tableElem) {
        tableElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Chart Data: Total Akumulasi Mutasi All Gudang
  const donutChartData = useMemo(() => {
    let totalNCInGradeCTon = 0;
    let totalNCInGradeETon = 0;
    let totalOutRepTon = 0;
    let totalInPrimeTon = 0;

    dateFilteredTransactions.forEach((tx) => {
      const ton = (tx.quantity || tx.kgGI || tx.kgGR || 0) / 1000;
      if (tx.transactionType === 'IN_NC') {
        const b = (tx.batch || '').trim().toUpperCase();
        if (b.endsWith('E') || (!b.endsWith('C') && ((tx.text || '').toUpperCase().includes('GRADE E') || (tx.materialDescription || '').toUpperCase().includes('GRADE E')))) {
          totalNCInGradeETon += ton;
        } else {
          totalNCInGradeCTon += ton;
        }
      }
      else if (tx.transactionType === 'OUT_REPAIR') totalOutRepTon += ton;
      else if (tx.transactionType === 'OUT_REPAIR_RETURN') totalOutRepTon = Math.max(0, totalOutRepTon - ton);
      else if (tx.transactionType === 'IN_OK_PRIME') totalInPrimeTon += ton;
    });

    const totalRejectTon = Math.max(0, totalOutRepTon - totalInPrimeTon);
    const totalTon = totalNCInGradeCTon + totalNCInGradeETon + totalOutRepTon + totalInPrimeTon + totalRejectTon;

    return {
      totalTon,
      totalNCInGradeCTon,
      totalNCInGradeETon,
      totalOutRepTon,
      totalInPrimeTon,
      totalRejectTon,
      chartData: {
        labels: [
          'IN NC Grade C (309)',
          'IN NC Grade E (309)',
          'Bahan Repair (261)',
          'Hasil Repair (101)',
          'Reject Repair'
        ],
        datasets: [
          {
            data: [
              parseFloat(totalNCInGradeCTon.toFixed(3)),
              parseFloat(totalNCInGradeETon.toFixed(3)),
              parseFloat(totalOutRepTon.toFixed(3)),
              parseFloat(totalInPrimeTon.toFixed(3)),
              parseFloat(totalRejectTon.toFixed(3))
            ],
            backgroundColor: [
              '#3b82f6', // Biru
              '#eab308', // Kuning
              '#f97316', // Orange
              '#10b981', // Hijau
              '#ef4444'  // Merah
            ],
            hoverBackgroundColor: [
              '#2563eb',
              '#ca8a04',
              '#ea580c',
              '#059669',
              '#dc2626'
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
  }, [dateFilteredTransactions]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <GitFork className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-sans tracking-tight">
              Monitoring Progres NC & Repair
            </h1>
            <p className="text-xs text-emerald-300/90 font-normal mt-0.5">
              Tracking pergerakan material NC, repair, dan prime antar gudang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleExportExcel}
            title="Ekspor data ke Excel"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 hover:text-white border border-emerald-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* CUSTOMIZABLE CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {cards.map((card, index) => {
          // CARD 1: BAR CHART (PROGRES MUTASI NC PER GUDANG)
          if (card.id === 'chart-nc-bar') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Progres Mutasi NC per Gudang"
                subtitle="Perbandingan pergerakan material NC, repair, dan prime (Ton)"
                icon={BarChart3}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  activeChartFilter ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetChartFilter();
                      }}
                      title="Klik untuk reset filter diagram"
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs"
                    >
                      <span>Filter: {activeChartFilter.gudang} ({activeChartFilter.label})</span>
                      <X className="h-3 w-3" />
                    </button>
                  ) : undefined
                }
              >
                {(expanded) => (
                  <div className="flex flex-col justify-between h-full w-full">
                    <div>
                      {/* Custom Clean Legend */}
                      <div className="flex flex-wrap items-center gap-4 mb-3">
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <span>IN NC Grade C (309)</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" />
                          <span>IN NC Grade E (309)</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                          <span>Bahan Repair (261)</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Hasil Repair (101)</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                          <span>Reject Repair</span>
                        </div>
                      </div>
                    </div>

                    <div className={cn("w-full pt-1", expanded ? "h-96" : "h-56 sm:h-64")}>
                      <Bar
                        data={gudangProgressChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          onClick: handleChartBarClick,
                          onHover: (event, chartElement) => {
                            const target = event.native?.target as HTMLElement;
                            if (target) {
                              target.style.cursor = chartElement && chartElement.length > 0 ? 'pointer' : 'default';
                            }
                          },
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
                )}
              </CustomizableCard>
            );
          }

          // CARD 2: DONUT CHART (TOTAL AKUMULASI)
          if (card.id === 'chart-nc-donut') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Total Akumulasi"
                subtitle="Seluruh gudang"
                icon={PieChart}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
                badge={
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200/70">
                    {formatTon(donutChartData.totalTon, { decimals: 2 })} Ton
                  </span>
                }
              >
                {(expanded) => (
                  <div className="flex flex-col justify-between h-full w-full">
                    <div className={cn("flex items-center justify-center relative my-auto", expanded ? "h-64 sm:h-72" : "h-40 sm:h-44")}>
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
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="text-[11px] font-medium text-slate-600 truncate">IN NC Grade C</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                          {formatTon(donutChartData.totalNCInGradeCTon, { decimals: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" />
                          <span className="text-[11px] font-medium text-slate-600 truncate">IN NC Grade E</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                          {formatTon(donutChartData.totalNCInGradeETon, { decimals: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                          <span className="text-[11px] font-medium text-slate-600 truncate">Bahan Repair (261)</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                          {formatTon(donutChartData.totalOutRepTon, { decimals: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[11px] font-medium text-slate-600 truncate">Hasil Repair (101)</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                          {formatTon(donutChartData.totalInPrimeTon, { decimals: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-50/80 border border-slate-100 col-span-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                          <span className="text-[11px] font-medium text-slate-600 truncate">Reject Repair</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-800 ml-1 shrink-0">
                          {formatTon(donutChartData.totalRejectTon, { decimals: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CustomizableCard>
            );
          }

          // CARD 3: TABEL PROGRES NC & REPAIR
          if (card.id === 'table-nc-progress') {
            return (
              <CustomizableCard
                key={card.id}
                id={card.id}
                title="Daftar Mutasi & Dokumen NC"
                subtitle="Data detail pergerakan dan status alur material"
                icon={Table2}
                width={card.width}
                isCustomizing={isCustomizing}
                canMoveLeft={index > 0}
                canMoveRight={index < cards.length - 1}
                onMoveLeft={() => handleMove(index, 'left')}
                onMoveRight={() => handleMove(index, 'right')}
                onWidthChange={(w) => handleWidthChange(card.id, w)}
              >
                {(expanded) => (
                  <div className="space-y-3 w-full">
                    {/* Interactive Chart Filter Banner / Active Status */}
                    {(activeChartFilter || selectedGudang !== 'ALL' || selectedGrade !== 'ALL' || selectedDate !== 'ALL') && (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs shadow-2xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                            <Filter className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                            <span>Filter Aktif:</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {selectedDate !== 'ALL' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-emerald-800 font-semibold text-[11px] border border-emerald-300 shadow-2xs">
                                <Calendar className="h-3 w-3 text-emerald-600" />
                                Tanggal: {selectedDate}
                              </span>
                            )}
                            {selectedGudang !== 'ALL' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-emerald-800 font-semibold text-[11px] border border-emerald-300 shadow-2xs">
                                <Building2 className="h-3 w-3 text-emerald-600" />
                                Gudang: {selectedGudang}
                              </span>
                            )}
                            {activeChartFilter && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs">
                                {activeChartFilter.label}
                              </span>
                            )}
                            {selectedGrade !== 'ALL' && !activeChartFilter && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-blue-800 font-semibold text-[11px] border border-blue-300 shadow-2xs">
                                Grade: {selectedGrade}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetChartFilter}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <X className="h-3 w-3" />
                          <span>Reset Filter</span>
                        </button>
                      </div>
                    )}

                    {/* Navigation Sub-Tabs & Filtering Toolbar (Compact 1 Row) */}
                    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Subtabs & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Subtabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 rounded-lg border border-slate-200/60 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('in_nc');
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === 'in_nc'
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
              <span>IN NC (309)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('out_repair');
                setSelectedGrade('ALL');
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === 'out_repair'
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Wrench className="h-3.5 w-3.5 text-orange-600" />
              <span>OUT Repair (261)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('in_prime');
                setSelectedGrade('ALL');
              }}
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

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('reject_repair');
                setSelectedGrade('ALL');
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === 'reject_repair'
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <XCircle className="h-3.5 w-3.5 text-red-600" />
              <span>Reject / DG Repair</span>
            </button>
          </div>

          {/* Quick Grade Filter Pills: Hanya tampil jika filter IN NC (Grade C/E) aktif */}
          {activeSubTab === 'in_nc' && (selectedGrade !== 'ALL' || (activeChartFilter && activeChartFilter.datasetIndex <= 1)) && (
            <div className="flex items-center gap-1 p-0.5 bg-blue-50/80 rounded-lg border border-blue-200/70 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedGrade('ALL');
                  if (activeChartFilter && activeChartFilter.datasetIndex <= 1) {
                    setActiveChartFilter(null);
                  }
                }}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                  selectedGrade === 'ALL'
                    ? "bg-white text-blue-900 shadow-2xs font-bold"
                    : "text-blue-700 hover:text-blue-950"
                )}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedGrade('Grade C');
                  if (activeChartFilter && activeChartFilter.datasetIndex === 1) {
                    setActiveChartFilter({ ...activeChartFilter, datasetIndex: 0, label: 'IN NC Grade C (309)' });
                  }
                }}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1",
                  selectedGrade === 'Grade C'
                    ? "bg-blue-600 text-white shadow-2xs font-bold"
                    : "text-blue-700 hover:text-blue-950"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Grade C
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedGrade('Grade E');
                  if (activeChartFilter && activeChartFilter.datasetIndex === 0) {
                    setActiveChartFilter({ ...activeChartFilter, datasetIndex: 1, label: 'IN NC Grade E (309)' });
                  }
                }}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1",
                  selectedGrade === 'Grade E'
                    ? "bg-yellow-500 text-slate-900 shadow-2xs font-bold"
                    : "text-yellow-800 hover:text-yellow-950"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                Grade E
              </button>
            </div>
          )}
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

          {/* Filter Tanggal */}
          {availableDates.length > 0 && (
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-600 transition-all cursor-pointer"
            >
              <option value="ALL">Semua Tanggal ({availableDates.length})</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          {/* Filter Gudang */}
          <select
            value={selectedGudang}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedGudang(val);
              if (activeChartFilter) {
                if (val === 'ALL') {
                  setActiveChartFilter(null);
                } else {
                  setActiveChartFilter({ ...activeChartFilter, gudang: val });
                }
              }
            }}
            className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-600 transition-all cursor-pointer"
          >
            <option value="ALL">Semua Gudang</option>
            {gudangList.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PRIMARY TRANSACTION / GROUPED TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'grouped' ? (
            activeSubTab === 'reject_repair' ? (
              /* DEDICATED REJECT / DG REPAIR TABLE */
              <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 backdrop-blur-sm text-slate-500 font-semibold text-[11px] tracking-wider uppercase border-b border-slate-200/80 select-none">
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-emerald-950 hover:bg-slate-100/60 transition-colors group/th"
                        onClick={() => handleToggleRejectSort('order')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>SPK Repair & WC</span>
                          {rejectSortField === 'order' ? (
                            rejectSortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-emerald-950 hover:bg-slate-100/60 transition-colors group/th"
                        onClick={() => handleToggleRejectSort('material')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Ukuran Material</span>
                          {rejectSortField === 'material' ? (
                            rejectSortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-3">Batch & SLoc</th>
                      <th
                        className="py-3 px-3 text-right cursor-pointer hover:text-amber-900 hover:bg-amber-50/60 transition-colors group/th"
                        onClick={() => handleToggleRejectSort('qty261')}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>GI Repair (261)</span>
                          {rejectSortField === 'qty261' ? (
                            rejectSortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-amber-600" /> : <ArrowDown className="h-3.5 w-3.5 text-amber-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-right cursor-pointer hover:text-sky-900 hover:bg-sky-50/60 transition-colors group/th"
                        onClick={() => handleToggleRejectSort('qty262')}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Return (262)</span>
                          {rejectSortField === 'qty262' ? (
                            rejectSortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-sky-600" /> : <ArrowDown className="h-3.5 w-3.5 text-sky-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 hover:bg-slate-100/60 transition-colors group/th"
                        onClick={() => handleToggleRejectSort('qtyOutRepair')}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Net GI</span>
                          {rejectSortField === 'qtyOutRepair' ? (
                            rejectSortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-slate-700" /> : <ArrowDown className="h-3.5 w-3.5 text-slate-700" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-right cursor-pointer hover:text-emerald-950 hover:bg-emerald-50/60 transition-colors group/th"
                        onClick={() => handleToggleRejectSort('qtyInPrime')}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Prime OK (101)</span>
                          {rejectSortField === 'qtyInPrime' ? (
                            rejectSortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover/th:text-slate-500 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-right bg-rose-50/90 text-rose-950 border-x border-rose-200/80 cursor-pointer hover:bg-rose-100/80 transition-colors group/th"
                        onClick={() => handleToggleRejectSort('qtyReject')}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Reject / DG (261-262-101)</span>
                          {rejectSortField === 'qtyReject' ? (
                            rejectSortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-rose-600" /> : <ArrowDown className="h-3.5 w-3.5 text-rose-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-rose-400 group-hover/th:text-rose-600 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/90">
                    {sortedRejectRepairItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400 font-mono text-xs">
                          Tidak ada data order repair yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      sortedRejectRepairItems.map((item, idx) => (
                        <tr
                          key={item.key || idx}
                          onClick={() => setSelectedDrilldown(item)}
                          className="hover:bg-rose-50/30 cursor-pointer transition-all duration-150 group"
                        >
                          <td className="py-3 px-3 text-center font-mono text-slate-400 text-xs font-medium">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-900 text-xs">
                              {item.order && item.order !== '0' ? item.order : '-'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {item.workCenter || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="font-mono font-bold text-slate-900 text-xs tracking-tight">
                              {parseMaterialUkuran(item.material, item.materialDescription)}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate tracking-tight mt-0.5" title={item.material}>
                              {item.material}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-xs">
                            <div className="text-[11px] text-slate-700">
                              NC: <span className="font-semibold text-slate-900">{item.batchNC || '-'}</span> ({item.slocNC || '-'})
                            </div>
                            <div className="text-[11px] text-emerald-700 mt-0.5">
                              Prime: <span className="font-semibold text-emerald-900">{item.batchPrime || '-'}</span> ({item.slocPrime || '-'})
                            </div>
                          </td>
                          {/* 261 */}
                          <td className="py-3 px-3 text-right font-mono">
                            <div className="font-bold text-amber-700 text-xs">
                              {formatQty(item.qty261 ?? item.qtyOutRepair)} <span className="text-[10px] font-normal text-slate-400">Btg</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatTon((item.kg261 ?? item.kgOutRepair) / 1000, { decimals: 3 })} T
                            </div>
                          </td>
                          {/* 262 */}
                          <td className="py-3 px-3 text-right font-mono">
                            <div className="font-bold text-sky-700 text-xs">
                              {(item.qty262 ?? 0) > 0 ? `-${formatQty(item.qty262!)}` : '0'} <span className="text-[10px] font-normal text-slate-400">Btg</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatTon((item.kg262 ?? 0) / 1000, { decimals: 3 })} T
                            </div>
                          </td>
                          {/* Net GI */}
                          <td className="py-3 px-3 text-right font-mono bg-slate-50/50">
                            <div className="font-bold text-slate-800 text-xs">
                              {formatQty(item.qtyOutRepair)} <span className="text-[10px] font-normal text-slate-400">Btg</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {formatTon(item.kgOutRepair / 1000, { decimals: 3 })} T
                            </div>
                          </td>
                          {/* 101 Prime OK */}
                          <td className="py-3 px-3 text-right font-mono">
                            <div className="font-bold text-emerald-700 text-xs">
                              {formatQty(item.qtyInPrime)} <span className="text-[10px] font-normal text-slate-400">Btg</span>
                            </div>
                            <div className="text-[10px] text-emerald-600">
                              {formatTon(item.kgInPrime / 1000, { decimals: 3 })} T
                            </div>
                          </td>
                          {/* Reject / DG = 261 - 262 - 101 */}
                          <td className="py-3 px-3 text-right font-mono bg-rose-50/70 border-x border-rose-200/70">
                            <div className={cn(
                              "font-bold text-xs",
                              item.qtyReject > 0 ? "text-rose-700 font-extrabold" : "text-slate-400"
                            )}>
                              {formatQty(item.qtyReject)} <span className="text-[10px] font-normal">Btg</span>
                            </div>
                            <div className={cn(
                              "text-[10px] font-medium",
                              item.qtyReject > 0 ? "text-rose-600" : "text-slate-400"
                            )}>
                              {formatTon(item.kgReject / 1000, { decimals: 3 })} T
                            </div>
                          </td>
                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono",
                              item.status === 'SELESAI OK'
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : item.status === 'PARTIAL REPAIR'
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            )}>
                              {item.status}
                            </span>
                          </td>
                          {/* Aksi */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedDrilldown(item)}
                              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white text-xs font-semibold border border-rose-200 hover:border-rose-600 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
                              title="Lihat rincian dokumen SAP (261, 262, 101)"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Detail</span>
                            </button>
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
                    <th
                      className="py-3 px-3.5 cursor-pointer hover:text-emerald-950 hover:bg-slate-100/60 transition-colors group/th"
                      onClick={() => handleToggleSort(activeSubTab === 'in_nc' ? 'ncrNumber' : 'order')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>
                          {activeSubTab === 'in_nc'
                            ? 'No NCR & Masalah'
                            : 'Order'}
                        </span>
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
                                  Non-NCR {item.order && item.order !== '0' ? `(Order: ${item.order})` : ''}
                                </div>
                              )}
                              <div className="text-xs text-slate-700 font-medium truncate mt-1" title={item.problemRemark}>
                                {item.problemRemark || '-'}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-mono font-bold text-slate-800 text-xs">
                                {item.order && item.order !== '0' ? item.order : '-'}
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
            )
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
                    {activeSubTab === 'in_nc'
                      ? 'Keterangan NC'
                      : activeSubTab === 'reject_repair'
                      ? 'Order / Defect Reject'
                      : 'Order / Workcenter'}
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
                    const isTxGradeE = (tx.batch || '').trim().toUpperCase().endsWith('E') ||
                                       (! (tx.batch || '').trim().toUpperCase().endsWith('C') &&
                                        ((tx.text || '').toUpperCase().includes('GRADE E') || (tx.materialDescription || '').toUpperCase().includes('GRADE E')));
                    const typeBadge =
                      tx.transactionType === 'IN_NC' ? (
                        isTxGradeE ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-yellow-50 text-yellow-800 border border-yellow-200/80 shadow-2xs">
                            IN NC E ({tx.movementType})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                            IN NC C ({tx.movementType})
                          </span>
                        )
                      ) : tx.transactionType === 'OUT_REPAIR' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-orange-50 text-orange-700 border border-orange-200/80 shadow-2xs">
                          OUT REP ({tx.movementType})
                        </span>
                      ) : tx.transactionType === 'OUT_REPAIR_RETURN' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs">
                          RET REP ({tx.movementType})
                        </span>
                      ) : tx.transactionType === 'IN_OK_PRIME' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                          IN PRIME ({tx.movementType})
                        </span>
                      ) : tx.transactionType === 'REJECT_REPAIR' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-red-50 text-red-700 border border-red-200/80 shadow-2xs">
                          REJECT / DG ({tx.movementType})
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
                          ) : activeSubTab === 'reject_repair' ? (
                            <div>
                              <div className="font-mono text-xs text-slate-800 font-bold">{tx.order ? `Order ${tx.order}` : '-'}</div>
                              <div className="text-[11px] text-rose-600 font-medium truncate mt-0.5" title={tx.problemRemark || tx.text || '-'}>
                                {tx.problemRemark || tx.text || (tx.workCenter ? `WC: ${tx.workCenter}` : '-')}
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
                                    qtyReject: tx.transactionType === 'REJECT_REPAIR' ? tx.qtyInUnOfEntry : 0,
                                    kgReject: tx.transactionType === 'REJECT_REPAIR' ? (tx.quantity || tx.kgGI || tx.kgGR || 0) : 0,
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
                    </div>
                  )}
                </CustomizableCard>
              );
            }

            return null;
          })}
        </div>

      {/* MODAL 0: DETAIL DOKUMEN PER NO NCR (GROUPED VIEW) */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                      Rincian Dokumen SAP — {
                        activeSubTab === 'in_nc'
                          ? (selectedGroup.ncrNumber || 'Non-NCR')
                          : activeSubTab === 'reject_repair'
                          ? `Reject / DG ${selectedGroup.order ? `(Order ${selectedGroup.order})` : ''}`
                          : (selectedGroup.order ? `Order ${selectedGroup.order}` : 'Non-Order')
                      }
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
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {activeSubTab === 'in_nc' ? 'Keterangan / Alasan NC' : activeSubTab === 'reject_repair' ? 'Keterangan Reject / DG' : 'Keterangan / SPK'}
                  </div>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                  <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{selectedDrilldown.order && selectedDrilldown.order !== '0' ? selectedDrilldown.order : '-'}</div>
                  <div className="text-[10px] text-slate-600 mt-1">{selectedDrilldown.workCenter || '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Hasil Repair & Rate</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-emerald-800 text-base">
                      {selectedDrilldown.recoveryRate.toFixed(1)}%
                    </span>
                    {selectedDrilldown.qtyReject > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-100 text-rose-800 border border-rose-200">
                        {selectedDrilldown.qtyReject} Btg Reject/DG
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Prime: {formatQty(selectedDrilldown.qtyInPrime)} Btg &bull; Reject: {formatQty(selectedDrilldown.qtyReject)} Btg
                  </div>
                </div>
              </div>

              {/* Transactions Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700">
                  Daftar Transaksi Terkait ({selectedDrilldown.transactions.length} Dokumen SAP)
                </h4>
                <div className="space-y-2">
                  {selectedDrilldown.transactions.map((tx, i) => {
                    const isTxE = (tx.batch || '').trim().toUpperCase().endsWith('E') ||
                                  (! (tx.batch || '').trim().toUpperCase().endsWith('C') &&
                                   ((tx.text || '').toUpperCase().includes('GRADE E') || (tx.materialDescription || '').toUpperCase().includes('GRADE E')));
                    return (
                    <div
                      key={tx.id || i}
                      className={cn(
                        "p-3 rounded-md border text-xs flex items-start justify-between gap-3",
                        tx.transactionType === 'IN_NC'
                          ? isTxE
                            ? "bg-yellow-50/50 border-yellow-200"
                            : "bg-blue-50/50 border-blue-200"
                          : tx.transactionType === 'OUT_REPAIR'
                          ? "bg-orange-50/50 border-orange-200"
                          : tx.transactionType === 'OUT_REPAIR_RETURN'
                          ? "bg-sky-50/50 border-sky-200"
                          : tx.transactionType === 'REJECT_REPAIR'
                          ? "bg-red-50/50 border-red-200"
                          : "bg-emerald-50/50 border-emerald-200"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold font-mono",
                            tx.transactionType === 'IN_NC'
                              ? isTxE
                                ? "bg-yellow-200 text-yellow-900"
                                : "bg-blue-200 text-blue-900"
                              : tx.transactionType === 'OUT_REPAIR'
                              ? "bg-orange-200 text-orange-900"
                              : tx.transactionType === 'OUT_REPAIR_RETURN'
                              ? "bg-sky-200 text-sky-900"
                              : tx.transactionType === 'REJECT_REPAIR'
                              ? "bg-red-200 text-red-900"
                              : "bg-emerald-200 text-emerald-900"
                          )}>
                            MVT {tx.movementType} {tx.transactionType === 'OUT_REPAIR_RETURN' ? '(RETURN)' : tx.transactionType === 'REJECT_REPAIR' ? '(REJECT/DG)' : ''}
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
                  );
                })}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                const batch = String(fd.get('batch') || '');
                const qtyVal = Math.abs(parseFloat(String(fd.get('qty') || '0')) || 0);
                const kgVal = Math.abs(parseFloat(String(fd.get('kg') || '0')) || 0);

                const isRepWC = wc.trim().toUpperCase().startsWith('REP');
                if (['261', '262', '101', '551', '553'].includes(mvt) && !isRepWC) {
                  alert('Untuk MVT 261, 262, 101, dan 551/553, Work Center wajib diawali REP* (contoh: REP-501)');
                  return;
                }

                let txType: NCProgressTransaction['transactionType'] = classifyTransaction(mvt, wc, ord, batch, text);
                if (txType === 'OTHER') {
                  if (mvt === '309') txType = 'IN_NC';
                  else if (mvt === '261' && isRepWC) txType = 'OUT_REPAIR';
                  else if (mvt === '262' && isRepWC) txType = 'OUT_REPAIR_RETURN';
                  else if (mvt === '101' && isRepWC) txType = 'IN_OK_PRIME';
                  else if ((mvt === '551' || mvt === '553') && isRepWC) txType = 'REJECT_REPAIR';
                }

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
                  batch: batch,
                  qtyInUnOfEntry: qtyVal,
                  quantity: kgVal,
                  materialDocument: String(fd.get('materialDocument') || `DOC-${Date.now()}`),
                  materialDocItem: '1',
                  userName: 'MANUAL_USER',
                  text: text,
                  unloadingPoint: String(fd.get('unloadingPoint') || ''),
                  salesOrder: String(fd.get('salesOrder') || ''),
                  kgGI: (mvt === '261' || mvt === '262') ? kgVal : 0,
                  kgGR: (mvt === '101' || mvt === '551' || mvt === '553') ? kgVal : 0,
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
                    <option value="262">262 - Reversal / Pengembalian Stock GI Repair</option>
                    <option value="101">101 - Goods Receipt Hasil Selesai (OK/Prime/DG)</option>
                    <option value="551">551 - Scrap / Reject Repair (551)</option>
                    <option value="553">553 - Scrap / Reject Repair (553)</option>
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
