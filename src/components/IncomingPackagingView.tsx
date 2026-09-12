'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { IncomingPackagingItem } from '../types/warehouse';
import { formatQty } from '@/lib/utils';
import { parseIncomingPackagingFile } from '@/lib/parseIncomingPackaging';
import { readExcelFile } from '@/lib/parser';
import {
  PACKAGING_CUSTOMER_BOX_MASTER,
  MASTER_CUSTOMERS,
  getBoxTypesForCustomer
} from '@/lib/packagingMaster';
import { exportPackagingCheckSheet } from '@/lib/exportPackagingExcel';
import {
  Plus,
  Minus,
  Pencil,
  Trash2,
  Download,
  Upload,
  Search,
  X,
  Check,
  PackagePlus,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  PackageCheck,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  RotateCcw,
  LayoutGrid,
  Table2,
  Calendar,
  Filter,
  CheckCircle2,
  Box
} from 'lucide-react';

interface IncomingPackagingViewProps {
  data?: IncomingPackagingItem[];
  stockCustomers?: string[];
  isCustomizing?: boolean;
  isAdmin?: boolean;
  onDataUpdate?: (newData: IncomingPackagingItem[]) => void;
}

// Helpers for robust date normalization
function getTodayIsoString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayDisplayString(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
}

function normalizeDateToIso(val?: string | Date): string {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  // Match YYYY-MM-DD
  const mIso = str.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
  if (mIso) {
    return `${mIso[1]}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
  }
  // Match DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const mLocal = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/);
  if (mLocal) {
    return `${mLocal[3]}-${mLocal[2].padStart(2, '0')}-${mLocal[1].padStart(2, '0')}`;
  }
  return str;
}

function formatDisplayDate(val?: string): string {
  if (!val) return '-';
  const iso = normalizeDateToIso(val);
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return val;
}

const EMPTY_FORM: Omit<IncomingPackagingItem, 'id'> = {
  tglIncoming: getTodayIsoString(),
  customer: MASTER_CUSTOMERS[0] || '',
  type: (PACKAGING_CUSTOMER_BOX_MASTER[MASTER_CUSTOMERS[0]] || [])[0] || '',
  stockAktualInternal: 0,
  outQty: 0,
  inQty: 0,
  stockSaatIni: 0,
  detailNG: {
    slot: '-',
    kaki: '-',
    dinding: '-',
    rangka: '-'
  },
  keterangan: ''
};

export const IncomingPackagingView: React.FC<IncomingPackagingViewProps> = ({
  data = [],
  stockCustomers = [],
  isAdmin = false,
  onDataUpdate
}) => {
  const [items, setItems] = useState<IncomingPackagingItem[]>(data);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Date Filter State: Default to today (Hari ini)
  const todayIso = useMemo(() => getTodayIsoString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  // Filter Pop-up Modal State for Mobile & Quick Access
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Modal State for Add & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<IncomingPackagingItem, 'id'>>(EMPTY_FORM);
  const [isCustomCustomer, setIsCustomCustomer] = useState(false);
  const [isCustomType, setIsCustomType] = useState(false);
  const [formError, setFormError] = useState('');

  // Qty State for Detail Temuan NG
  const [slotQty, setSlotQty] = useState(0);
  const [kakiQty, setKakiQty] = useState(0);
  const [dindingQty, setDindingQty] = useState(0);
  const [rangkaQty, setRangkaQty] = useState(0);

  // Delete Confirm Modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Reset All Confirm Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof IncomingPackagingItem>('stockSaatIni');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local cache immediately on mount, then sync with database API
  useEffect(() => {
    try {
      const cached = localStorage.getItem('spindo_audit_pkg_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch {}

    const fetchServerData = async () => {
      try {
        const res = await fetch('/api/incoming-packaging', { cache: 'no-store' });
        const json = await res.json();
        if (json?.success && Array.isArray(json.items)) {
          setItems(json.items);
          localStorage.setItem('spindo_audit_pkg_cache', JSON.stringify(json.items));
          if (onDataUpdate) {
            onDataUpdate(json.items);
          }
        }
      } catch (err) {
        console.error('Failed to sync packaging audits from database:', err);
      }
    };
    fetchServerData();
  }, []);

  useEffect(() => {
    if (data && data.length > 0) {
      setItems(data);
    }
  }, [data]);

  const notifyChange = async (newItems: IncomingPackagingItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem('spindo_audit_pkg_cache', JSON.stringify(newItems));
    } catch {}
    if (onDataUpdate) {
      onDataUpdate(newItems);
    }
    try {
      await fetch('/api/incoming-packaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItems),
      });
    } catch (err) {
      console.error('Failed to save packaging audits to server:', err);
    }
  };

  const handleResetAll = () => {
    notifyChange([]);
    setIsResetModalOpen(false);
  };

  // Helper to extract numeric qty from detailNG
  const parseDefectQty = (val: any): number => {
    if (!val || val === '-') return 0;
    if (val === 'NG') return 1;
    const n = parseInt(String(val).replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    const defaultCust = MASTER_CUSTOMERS[0] || '';
    const availableBoxes = getBoxTypesForCustomer(defaultCust);
    const defaultBox = availableBoxes[0] || '';

    setFormData({
      ...EMPTY_FORM,
      tglIncoming: getTodayIsoString(),
      customer: defaultCust,
      type: defaultBox
    });
    setIsCustomCustomer(false);
    setIsCustomType(false);
    setSlotQty(0);
    setKakiQty(0);
    setDindingQty(0);
    setRangkaQty(0);
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (item: IncomingPackagingItem) => {
    setEditingId(item.id);
    const isMasterCust = MASTER_CUSTOMERS.includes(item.customer);
    const availableBoxes = getBoxTypesForCustomer(item.customer);
    const isMasterBox = availableBoxes.includes(item.type);

    setIsCustomCustomer(!isMasterCust);
    setIsCustomType(!isMasterBox);

    setFormData({
      tglIncoming: normalizeDateToIso(item.tglIncoming) || getTodayIsoString(),
      customer: item.customer,
      type: item.type,
      stockAktualInternal: item.stockAktualInternal,
      outQty: item.outQty,
      inQty: item.inQty,
      stockSaatIni: item.stockSaatIni,
      detailNG: {
        slot: item.detailNG?.slot ?? '-',
        kaki: item.detailNG?.kaki ?? '-',
        dinding: item.detailNG?.dinding ?? '-',
        rangka: item.detailNG?.rangka ?? '-'
      },
      keterangan: item.keterangan || ''
    });

    setSlotQty(parseDefectQty(item.detailNG?.slot));
    setKakiQty(parseDefectQty(item.detailNG?.kaki));
    setDindingQty(parseDefectQty(item.detailNG?.dinding));
    setRangkaQty(parseDefectQty(item.detailNG?.rangka));

    setFormError('');
    setIsModalOpen(true);
  };

  // Handle Customer Change in Form
  const handleCustomerChange = (newCust: string) => {
    if (newCust === '__CUSTOM__') {
      setIsCustomCustomer(true);
      setIsCustomType(true);
      setFormData((prev) => ({ ...prev, customer: '', type: '' }));
      return;
    }

    setIsCustomCustomer(false);
    const boxes = getBoxTypesForCustomer(newCust);
    const nextBox = boxes.includes(formData.type) ? formData.type : (boxes[0] || '');
    setIsCustomType(false);
    setFormData((prev) => ({
      ...prev,
      customer: newCust,
      type: nextBox
    }));
  };

  // Handle Type Change in Form
  const handleTypeChange = (newType: string) => {
    if (newType === '__CUSTOM__') {
      setIsCustomType(true);
      setFormData((prev) => ({ ...prev, type: '' }));
      return;
    }
    setIsCustomType(false);
    setFormData((prev) => ({ ...prev, type: newType }));
  };

  // Save Form (Create or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer.trim()) {
      setFormError('Nama Customer wajib diisi.');
      return;
    }
    if (!formData.type.trim()) {
      setFormError('Type Box Packaging wajib dipilih / diisi.');
      return;
    }

    const calculatedStock =
      Number(formData.stockAktualInternal || 0) - Number(formData.outQty || 0) + Number(formData.inQty || 0);

    const formattedNG = {
      slot: slotQty > 0 ? `${slotQty}` : '-',
      kaki: kakiQty > 0 ? `${kakiQty}` : '-',
      dinding: dindingQty > 0 ? `${dindingQty}` : '-',
      rangka: rangkaQty > 0 ? `${rangkaQty}` : '-'
    };

    const targetDate = normalizeDateToIso(formData.tglIncoming) || todayIso;

    // Auto-update filter tanggal agar item yang baru disimpan langsung tampak di daftar
    if (selectedDate && selectedDate !== targetDate) {
      setSelectedDate(targetDate);
    }

    if (editingId) {
      const updated = items.map((item) => {
        if (item.id === editingId) {
          return {
            ...item,
            ...formData,
            tglIncoming: targetDate,
            stockSaatIni: calculatedStock,
            detailNG: formattedNG
          };
        }
        return item;
      });
      notifyChange(updated);
    } else {
      const newItem: IncomingPackagingItem = {
        id: `audit_pkg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        ...formData,
        tglIncoming: targetDate,
        stockSaatIni: calculatedStock,
        detailNG: formattedNG
      };
      notifyChange([newItem, ...items]);
    }

    setIsModalOpen(false);
  };

  // Delete Row
  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    const updated = items.filter((i) => i.id !== deleteTargetId);
    notifyChange(updated);
    setDeleteTargetId(null);
  };

  // Export to Excel (Styled Check Sheet Packaging Standard Spindo)
  const handleExportExcel = async () => {
    const dataToExport = filteredData.length > 0 ? filteredData : items;
    if (dataToExport.length === 0) return;
    try {
      const dateLabel = selectedDate ? formatDisplayDate(selectedDate) : undefined;
      await exportPackagingCheckSheet(dataToExport, dateLabel);
    } catch (err) {
      console.error('Failed to export styled check sheet:', err);
    }
  };

  // Import from Excel file
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readExcelFile(file);
      const parsed = parseIncomingPackagingFile(rows);
      if (parsed.length > 0) {
        notifyChange(parsed);
      }
    } catch (err) {
      console.error('Gagal import file:', err);
    }
  };

  // Combined Unique Customer list from Master + Actual Items
  const customerList = useMemo(() => {
    const set = new Set<string>(MASTER_CUSTOMERS);
    items.forEach((i) => {
      if (i.customer) set.add(i.customer.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  // Unique Type list reactive to selected customer
  const typeList = useMemo(() => {
    if (selectedCustomer !== 'ALL') {
      const masterBoxes = getBoxTypesForCustomer(selectedCustomer);
      const itemBoxes = items
        .filter((i) => i.customer === selectedCustomer && i.type)
        .map((i) => i.type.trim());
      return Array.from(new Set([...masterBoxes, ...itemBoxes])).sort();
    }
    const set = new Set<string>();
    Object.values(PACKAGING_CUSTOMER_BOX_MASTER).forEach((boxes) => {
      boxes.forEach((b) => set.add(b));
    });
    items.forEach((i) => {
      if (i.type) set.add(i.type.trim());
    });
    return Array.from(set).sort();
  }, [items, selectedCustomer]);

  // Filtered & Sorted Data
  const filteredData = useMemo(() => {
    return items.filter((item) => {
      // 1. Date Filter: Jika selectedDate diisi, bandingkan dengan tanggal item
      if (selectedDate) {
        const itemDateIso = normalizeDateToIso(item.tglIncoming);
        if (itemDateIso && itemDateIso !== selectedDate) return false;
      }

      // 2. Customer Filter
      const matchCust = selectedCustomer === 'ALL' || item.customer === selectedCustomer;

      // 3. Type Box Filter
      const matchType = selectedType === 'ALL' || item.type === selectedType;

      // 4. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.customer && item.customer.toLowerCase().includes(q)) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        (item.tglIncoming && item.tglIncoming.toLowerCase().includes(q)) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(q));

      return matchCust && matchType && matchSearch;
    });
  }, [items, selectedDate, selectedCustomer, selectedType, searchQuery]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDir]);

  const handleSort = (field: keyof IncomingPackagingItem) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Aggregates for active filtered view
  const totalStockAwal = useMemo(() => filteredData.reduce((acc, c) => acc + (c.stockAktualInternal || 0), 0), [filteredData]);
  const totalOut = useMemo(() => filteredData.reduce((acc, c) => acc + (c.outQty || 0), 0), [filteredData]);
  const totalIn = useMemo(() => filteredData.reduce((acc, c) => acc + (c.inQty || 0), 0), [filteredData]);
  const totalStockSaatIni = useMemo(() => filteredData.reduce((acc, c) => acc + (c.stockSaatIni || 0), 0), [filteredData]);

  const countNG = useMemo(() => {
    let count = 0;
    filteredData.forEach((item) => {
      const { slot, kaki, dinding, rangka } = item.detailNG || {};
      if (slot && slot !== '-' && slot !== '0') count++;
      if (kaki && kaki !== '-' && kaki !== '0') count++;
      if (dinding && dinding !== '-' && dinding !== '0') count++;
      if (rangka && rangka !== '-' && rangka !== '0') count++;
    });
    return count;
  }, [filteredData]);

  // Today item count for header badge
  const todayItemCount = useMemo(() => {
    return items.filter((i) => normalizeDateToIso(i.tglIncoming) === todayIso).length;
  }, [items, todayIso]);

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedDate !== todayIso) count++;
    if (selectedCustomer !== 'ALL') count++;
    if (selectedType !== 'ALL') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedDate, todayIso, selectedCustomer, selectedType, searchQuery]);

  const currentBoxOptions = useMemo(() => {
    if (!formData.customer) return [];
    return getBoxTypesForCustomer(formData.customer);
  }, [formData.customer]);

  const renderSortHeader = (
    label: string,
    field: keyof IncomingPackagingItem,
    align: 'left' | 'right' | 'center' = 'left',
    customCls = '',
    rowSpan = 2
  ) => {
    const isSorted = sortField === field;
    return (
      <th
        rowSpan={rowSpan}
        onClick={() => handleSort(field)}
        className={`py-2 px-2.5 font-bold uppercase tracking-wider text-${align} cursor-pointer select-none transition-colors ${customCls}`}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <span>{label}</span>
          {isSorted ? (
            sortDir === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-emerald-800 shrink-0" />
            ) : (
              <ArrowDown className="h-3 w-3 text-emerald-800 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-2.5 w-2.5 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-5 font-sans pb-16 sm:pb-0">
      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <PackagePlus className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <h1 className="text-base font-bold text-white font-sans tracking-tight">
            Audit Harian Packaging (RTP)
          </h1>
        </div>

        {/* Action Toolbar (Desktop only for Header Buttons) */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap font-mono text-xs">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-950 font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 text-xs"
            title="Tambah Data Audit Baru"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-800" strokeWidth={2.5} />
            <span>Tambah Audit</span>
          </button>

          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, .txt, .tsv"
                className="hidden"
                onChange={handleImportExcel}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-700 bg-emerald-950/80 hover:bg-emerald-900 text-white font-semibold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                title="Import File Excel / CSV"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2} />
                <span>Import</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-700 bg-emerald-950/80 hover:bg-emerald-900 text-white font-semibold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                title="Download Spreadsheet Excel"
              >
                <Download className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2} />
                <span>Export</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                title="Reset Semua Data Input"
              >
                <RotateCcw className="h-3.5 w-3.5 text-rose-100" />
                <span>Reset</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* DESKTOP FULL KPI STATS CARDS (HIDDEN ON MOBILE) */}
      <div className="hidden sm:grid sm:grid-cols-5 gap-3 font-mono text-xs">
        {/* Hero Card: Stock Saat Ini */}
        <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-300/90 shadow-2xs space-y-1 ring-1 ring-emerald-500/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 flex items-center justify-between font-sans">
            <span>Stock Saat Ini</span>
            <PackageCheck className="h-3.5 w-3.5 text-emerald-800" />
          </div>
          <div className="text-base font-black text-emerald-950">
            {formatQty(totalStockSaatIni)} <span className="text-xs font-normal">Unit</span>
          </div>
          <div className="text-[10px] text-emerald-800 font-sans">Sisa Saldo RTP Aktif</div>
        </div>

        {/* Stock Awal */}
        <div className="p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between font-sans">
            <span>Stock Awal</span>
            <Boxes className="h-3.5 w-3.5 text-slate-600" />
          </div>
          <div className="text-base font-bold text-slate-900">{formatQty(totalStockAwal)}</div>
          <div className="text-[9.5px] text-slate-500 font-sans truncate">Stock Internal</div>
        </div>

        {/* Total OUT */}
        <div className="p-3 rounded-lg bg-white border border-rose-200/90 shadow-2xs space-y-1 bg-rose-50/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between font-sans">
            <span>Total OUT</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="text-base font-bold text-rose-700">{formatQty(totalOut)}</div>
          <div className="text-[9.5px] text-slate-500 font-sans truncate">Kirim ke Cust</div>
        </div>

        {/* Total IN */}
        <div className="p-3 rounded-lg bg-white border border-sky-200/90 shadow-2xs space-y-1 bg-sky-50/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 flex items-center justify-between font-sans">
            <span>Total IN</span>
            <ArrowDownLeft className="h-3.5 w-3.5 text-sky-600" />
          </div>
          <div className="text-base font-bold text-sky-800">{formatQty(totalIn)}</div>
          <div className="text-[9.5px] text-slate-500 font-sans truncate">Terima Kembali</div>
        </div>

        {/* Temuan NG */}
        <div className="p-3 rounded-lg bg-white border border-amber-200/90 shadow-2xs space-y-1 bg-amber-50/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between font-sans">
            <span>Temuan NG</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="text-base font-bold text-amber-900">{countNG} Box</div>
          <div className="text-[9.5px] text-slate-500 font-sans truncate">Slot / Kaki / Dinding / Rangka</div>
        </div>
      </div>

      {/* TOOLBAR: FILTER & SEARCH */}
      {/* 1. MOBILE COMPACT TOOLBAR (1 BARIS DENGAN POP-UP FILTER) */}
      <div className="sm:hidden bg-white p-2 rounded-md border border-slate-200/90 shadow-2xs space-y-1.5 font-mono text-xs">
        <div className="flex items-center gap-1.5">
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari audit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-md border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-700 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter Pop-up Trigger Button */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-md border font-bold text-xs flex items-center gap-1 cursor-pointer shadow-2xs shrink-0 transition-colors ${
              activeFilterCount > 0
                ? 'bg-emerald-50 border-emerald-700 text-emerald-950'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-3.5 w-3.5 text-emerald-800" strokeWidth={2.2} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-emerald-800 text-white text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Export Check Sheet Button (Mobile) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs shrink-0"
            title="Download Excel Check Sheet"
          >
            <Download className="h-4 w-4 text-emerald-800" strokeWidth={2.2} />
          </button>
        </div>

        {/* Active Filter Notice & Reset (Mobile) */}
        {(selectedCustomer !== 'ALL' || selectedType !== 'ALL' || searchQuery || selectedDate !== todayIso) && (
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 font-sans">
            <span className="truncate">
              {sortedData.length} baris &bull; {selectedDate ? formatDisplayDate(selectedDate) : 'Semua Tgl'}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer('ALL');
                setSelectedType('ALL');
                setSearchQuery('');
                setSelectedDate(todayIso);
              }}
              className="font-bold text-rose-700 hover:underline cursor-pointer whitespace-nowrap ml-2"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* 2. DESKTOP EXPANDED TOOLBAR */}
      <div className="hidden sm:block bg-white p-2.5 sm:p-3 rounded-md border border-slate-200/90 shadow-2xs space-y-2 font-mono text-xs">
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Tanggal Audit Picker */}
          <div className="col-span-3 flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full py-1.5 px-2.5 rounded-md border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:outline-hidden focus:border-emerald-700 shadow-2xs cursor-pointer"
                title="Filter Tanggal Audit"
              />
            </div>
            {selectedDate ? (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="px-2 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10.5px] text-slate-600 font-bold whitespace-nowrap cursor-pointer shadow-2xs"
                title="Tampilkan Semua Tanggal"
              >
                Semua
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className="px-2 py-1.5 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[10.5px] text-emerald-900 font-bold whitespace-nowrap cursor-pointer shadow-2xs"
                title="Kembali ke Tanggal Hari Ini"
              >
                Hari Ini
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="col-span-4 relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari customer, tipe box, ket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-md border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Customer Filter */}
          <div className="col-span-3">
            <select
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setSelectedType('ALL');
              }}
              className="w-full py-1.5 px-2 rounded-md border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-emerald-700 cursor-pointer shadow-2xs truncate font-mono"
            >
              <option value="ALL">Semua Customer</option>
              {customerList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Type Box Filter & Desktop View Toggle */}
          <div className="col-span-2 flex items-center gap-1.5">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full py-1.5 px-2 rounded-md border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-emerald-700 cursor-pointer shadow-2xs truncate font-mono"
            >
              <option value="ALL">Semua Box</option>
              {typeList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-0.5 border border-slate-200 rounded-md p-0.5 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-emerald-800 text-white font-bold' : 'text-slate-500 hover:bg-slate-200'
                }`}
                title="Tampilan Tabel"
              >
                <Table2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-emerald-800 text-white font-bold' : 'text-slate-500 hover:bg-slate-200'
                }`}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Notice & Reset (Desktop) */}
        {(selectedCustomer !== 'ALL' || selectedType !== 'ALL' || searchQuery || selectedDate !== todayIso) && (
          <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-1 border-t border-slate-100 font-sans">
            <span>
              Menampilkan: <strong className="text-slate-900 font-mono">{sortedData.length}</strong> / <span className="font-mono">{items.length}</span> baris
              {selectedDate ? ` (Tgl: ${formatDisplayDate(selectedDate)})` : ' (Semua Tanggal)'}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer('ALL');
                setSelectedType('ALL');
                setSearchQuery('');
                setSelectedDate(todayIso);
              }}
              className="font-bold text-rose-700 hover:underline cursor-pointer text-xs"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. MOBILE CARDS VIEW (OTOMATIS TAMPIL DI SMARTPHONE / LAYAR KECIL)       */}
      {/* ========================================================================= */}
      <div className="sm:hidden grid grid-cols-1 gap-2.5 font-mono text-xs">
        {sortedData.map((item, idx) => (
          <div
            key={item.id || idx}
            className="p-3.5 rounded-lg border border-slate-200/90 bg-white shadow-2xs hover:border-emerald-300 transition-all space-y-2.5 relative"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="space-y-1 flex-1">
                <div className="font-bold text-slate-900 text-xs leading-tight">{item.customer}</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-950 font-bold border border-emerald-300/80 text-[10.5px]">
                    {item.type}
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans">
                    {formatDisplayDate(item.tglIncoming)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="p-1.5 rounded hover:bg-emerald-50 text-slate-500 hover:text-emerald-800 transition-colors"
                  title="Edit Baris"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(item.id)}
                  className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-700 transition-colors"
                  title="Hapus Baris"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Mutasi Numbers */}
            <div className="grid grid-cols-4 gap-1 text-center text-[11px] bg-slate-50 p-2 rounded-md border border-slate-100">
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">Awal</div>
                <div className="font-bold text-slate-900">{formatQty(item.stockAktualInternal)}</div>
              </div>
              <div>
                <div className="text-[9px] text-rose-700 uppercase font-sans">OUT</div>
                <div className="font-bold text-rose-700">{item.outQty > 0 ? formatQty(item.outQty) : '-'}</div>
              </div>
              <div>
                <div className="text-[9px] text-sky-800 uppercase font-sans">IN</div>
                <div className="font-bold text-sky-800">{item.inQty > 0 ? formatQty(item.inQty) : '-'}</div>
              </div>
              <div>
                <div className="text-[9px] text-emerald-950 font-bold uppercase font-sans">Saat Ini</div>
                <div className="font-black text-emerald-950">{formatQty(item.stockSaatIni)}</div>
              </div>
            </div>

            {/* Temuan NG */}
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-slate-500">Temuan NG:</span>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {item.detailNG?.slot && item.detailNG.slot !== '-' && item.detailNG.slot !== '0' && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px]">
                    Slot: {item.detailNG.slot}
                  </span>
                )}
                {item.detailNG?.kaki && item.detailNG.kaki !== '-' && item.detailNG.kaki !== '0' && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px]">
                    Kaki: {item.detailNG.kaki}
                  </span>
                )}
                {item.detailNG?.dinding && item.detailNG.dinding !== '-' && item.detailNG.dinding !== '0' && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px]">
                    Dinding: {item.detailNG.dinding}
                  </span>
                )}
                {item.detailNG?.rangka && item.detailNG.rangka !== '-' && item.detailNG.rangka !== '0' && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px]">
                    Rangka: {item.detailNG.rangka}
                  </span>
                )}
                {(!item.detailNG || Object.values(item.detailNG).every((v) => !v || v === '-' || v === '0')) && (
                  <span className="text-emerald-700 font-medium">Kondisi OK (0 NG)</span>
                )}
              </div>
            </div>

            {item.keterangan && (
              <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 font-sans">
                Ket: {item.keterangan}
              </div>
            )}
          </div>
        ))}

        {sortedData.length === 0 && (
          <div className="py-10 text-center text-slate-500 text-xs font-sans space-y-3 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
            <Box className="h-8 w-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <div className="font-bold text-slate-800 text-sm">
                {items.length > 0
                  ? `Tidak ada data audit untuk tanggal ${selectedDate ? formatDisplayDate(selectedDate) : 'ini'}`
                  : 'Belum ada data audit packaging'}
              </div>
              <p className="text-[11px] text-slate-500">
                {items.length > 0
                  ? `Tersimpan ${items.length} data audit pada riwayat tanggal lain.`
                  : 'Silakan input catatan audit fisik harian packaging.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap font-mono">
              {items.length > 0 && selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="px-3 py-1.5 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer shadow-2xs"
                >
                  Tampilkan Semua ({items.length} Data)
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Tambah Audit Baru</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP / TABLET VIEW (TABLE / CARDS TOGGLEABLE)                      */}
      {/* ========================================================================= */}
      <div className="hidden sm:block">
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 font-mono text-xs">
            {sortedData.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-lg border border-slate-200/90 bg-white shadow-2xs hover:border-emerald-300 transition-all space-y-2.5 relative"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{item.customer}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-950 font-bold border border-emerald-300/80 text-[11px]">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Tgl: {formatDisplayDate(item.tglIncoming)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1 rounded hover:bg-emerald-50 text-slate-500 hover:text-emerald-800 transition-colors cursor-pointer"
                      title="Edit Baris"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(item.id)}
                      className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-700 transition-colors cursor-pointer"
                      title="Hapus Baris"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mutasi Numbers */}
                <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] bg-slate-50 p-2 rounded-md border border-slate-100">
                  <div>
                    <div className="text-[9.5px] text-slate-500">Awal</div>
                    <div className="font-bold text-slate-900">{formatQty(item.stockAktualInternal)}</div>
                  </div>
                  <div>
                    <div className="text-[9.5px] text-rose-700">OUT</div>
                    <div className="font-bold text-rose-700">{item.outQty > 0 ? formatQty(item.outQty) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-[9.5px] text-sky-800">IN</div>
                    <div className="font-bold text-sky-800">{item.inQty > 0 ? formatQty(item.inQty) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-[9.5px] text-emerald-950 font-bold">Saat Ini</div>
                    <div className="font-black text-emerald-950">{formatQty(item.stockSaatIni)}</div>
                  </div>
                </div>

                {/* Temuan NG */}
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-500">Temuan NG:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {item.detailNG?.slot && item.detailNG.slot !== '-' && item.detailNG.slot !== '0' && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px]">
                        Slot: {item.detailNG.slot}
                      </span>
                    )}
                    {item.detailNG?.kaki && item.detailNG.kaki !== '-' && item.detailNG.kaki !== '0' && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px]">
                        Kaki: {item.detailNG.kaki}
                      </span>
                    )}
                    {item.detailNG?.dinding && item.detailNG.dinding !== '-' && item.detailNG.dinding !== '0' && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px]">
                        Dinding: {item.detailNG.dinding}
                      </span>
                    )}
                    {item.detailNG?.rangka && item.detailNG.rangka !== '-' && item.detailNG.rangka !== '0' && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px]">
                        Rangka: {item.detailNG.rangka}
                      </span>
                    )}
                    {(!item.detailNG || Object.values(item.detailNG).every((v) => !v || v === '-' || v === '0')) && (
                      <span className="text-emerald-700 font-medium">Kondisi OK (0 NG)</span>
                    )}
                  </div>
                </div>

                {item.keterangan && (
                  <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 font-sans">
                    Ket: {item.keterangan}
                  </div>
                )}
              </div>
            ))}

            {sortedData.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs font-sans space-y-2 bg-white rounded-lg border border-slate-200">
                <Box className="h-8 w-8 text-slate-300 mx-auto" />
                <div>Belum ada data audit packaging untuk filter ini.</div>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-3 py-1.5 rounded-md bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Input Audit Sekarang</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-slate-100 text-[10.5px] shadow-2xs">
                  <tr className="group text-slate-700">
                    <th rowSpan={2} className="py-2.5 px-3 text-center font-bold text-slate-400 w-10 border-b border-r border-slate-200 bg-slate-100">
                      #
                    </th>
                    {renderSortHeader('Tgl Audit', 'tglIncoming', 'center', 'border-b border-r border-slate-200 bg-slate-100 min-w-[90px]', 2)}
                    {renderSortHeader('Customer', 'customer', 'left', 'border-b border-r border-slate-200 bg-slate-100 min-w-[180px]', 2)}
                    {renderSortHeader('Type Box', 'type', 'left', 'border-b border-r border-slate-200 bg-slate-100 min-w-[110px]', 2)}
                    {renderSortHeader('Stock Awal', 'stockAktualInternal', 'right', 'border-b border-r border-slate-200 bg-slate-100 text-slate-700', 2)}
                    {renderSortHeader('OUT', 'outQty', 'right', 'border-b border-r border-slate-200 bg-slate-100 text-rose-700', 2)}
                    {renderSortHeader('IN', 'inQty', 'right', 'border-b border-r border-slate-200 bg-slate-100 text-sky-800', 2)}
                    {renderSortHeader('Stock Akhir', 'stockSaatIni', 'right', 'border-b border-r border-slate-200 bg-slate-100 text-emerald-950 font-black', 2)}

                    {/* Group Header: Temuan NG */}
                    <th colSpan={4} className="py-1 px-2 text-center font-bold border-b border-r border-slate-200 bg-amber-50/80 text-amber-950 text-[10px]">
                      Detail Temuan NG (Unit)
                    </th>

                    <th rowSpan={2} className="py-2.5 px-3 text-left font-bold text-slate-600 border-b border-r border-slate-200 bg-slate-100 min-w-[140px]">
                      Keterangan
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 text-center font-bold text-slate-400 w-20 border-b border-slate-200 bg-slate-100">
                      Aksi
                    </th>
                  </tr>

                  {/* Sub-header row for Detail NG */}
                  <tr className="text-slate-600 text-[10px]">
                    <th className="py-1 px-2 text-center font-semibold border-b border-r border-slate-200 bg-amber-50/40 text-rose-800">
                      Slot
                    </th>
                    <th className="py-1 px-2 text-center font-semibold border-b border-r border-slate-200 bg-amber-50/40 text-rose-800">
                      Kaki
                    </th>
                    <th className="py-1 px-2 text-center font-semibold border-b border-r border-slate-200 bg-amber-50/40 text-rose-800">
                      Dinding
                    </th>
                    <th className="py-1 px-2 text-center font-semibold border-b border-r border-slate-200 bg-amber-50/40 text-rose-800">
                      Rangka
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px] bg-white">
                  {sortedData.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-bold border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 whitespace-nowrap text-slate-600">
                        {formatDisplayDate(row.tglIncoming)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100">
                        <span>{row.customer}</span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-950 font-bold border border-emerald-300/80 shadow-2xs inline-block">
                          {row.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700 border-r border-slate-100">
                        {formatQty(row.stockAktualInternal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-700 border-r border-slate-100">
                        {row.outQty > 0 ? formatQty(row.outQty) : <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-sky-800 border-r border-slate-100">
                        {row.inQty > 0 ? formatQty(row.inQty) : <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right border-r border-slate-100">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-950 font-black border border-emerald-300/80 shadow-2xs inline-block">
                          {formatQty(row.stockSaatIni)}
                        </span>
                      </td>

                      {/* NG Details */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 font-medium">
                        {row.detailNG?.slot && row.detailNG.slot !== '-' && row.detailNG.slot !== '0' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            {row.detailNG.slot}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 font-medium">
                        {row.detailNG?.kaki && row.detailNG.kaki !== '-' && row.detailNG.kaki !== '0' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            {row.detailNG.kaki}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 font-medium">
                        {row.detailNG?.dinding && row.detailNG.dinding !== '-' && row.detailNG.dinding !== '0' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            {row.detailNG.dinding}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-100 font-medium">
                        {row.detailNG?.rangka && row.detailNG.rangka !== '-' && row.detailNG.rangka !== '0' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            {row.detailNG.rangka}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 border-r border-slate-100 text-slate-500 font-sans truncate max-w-[200px]" title={row.keterangan}>
                        {row.keterangan || '-'}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            className="p-1.5 rounded hover:bg-emerald-50 text-slate-500 hover:text-emerald-800 transition-colors cursor-pointer"
                            title="Edit Baris"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(row.id)}
                            className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Hapus Baris"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {sortedData.length === 0 && (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-500 text-xs font-sans">
                        <div className="space-y-2.5 max-w-sm mx-auto">
                          <Box className="h-8 w-8 text-slate-400 mx-auto" />
                          <div className="font-bold text-slate-800 text-sm">
                            {items.length > 0
                              ? `Tidak ada data audit untuk tanggal ${selectedDate ? formatDisplayDate(selectedDate) : 'ini'}`
                              : 'Belum ada data audit packaging'}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {items.length > 0
                              ? `Tersimpan ${items.length} data audit pada riwayat tanggal lain.`
                              : 'Silakan klik tombol di bawah untuk menambah audit harian.'}
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-1 font-mono">
                            {items.length > 0 && selectedDate && (
                              <button
                                type="button"
                                onClick={() => setSelectedDate('')}
                                className="px-3 py-1.5 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs cursor-pointer shadow-2xs"
                              >
                                Tampilkan Semua ({items.length} Data)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleOpenCreate}
                              className="px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>+ Tambah Baris Audit Baru</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-100 font-bold text-[11px] text-slate-900 shadow-[0_-2px_4px_rgba(0,0,0,0.06)]">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 uppercase tracking-wider text-slate-700 text-[10px] bg-slate-100">
                      TOTAL AUDIT ({sortedData.length} Baris)
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 font-bold bg-slate-100">
                      {formatQty(totalStockAwal)}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-700 font-bold bg-slate-100">
                      {formatQty(totalOut)}
                    </td>
                    <td className="py-3 px-3 text-right text-sky-800 font-bold bg-slate-100">
                      {formatQty(totalIn)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-950 font-black bg-slate-100">
                      {formatQty(totalStockSaatIni)}
                    </td>
                    <td colSpan={6} className="py-3 px-2 text-center text-slate-600 text-[10px] bg-slate-100">
                      Total Temuan NG: {countNG} Box
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL FORM: INPUT / EDIT AUDIT HARIAN PACKAGING                           */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 font-sans">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-emerald-100 p-3.5 sm:p-4 bg-emerald-50/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-2xs font-bold font-mono text-xs">
                  {editingId ? <Pencil className="h-4 w-4 text-emerald-200" /> : <PackagePlus className="h-4 w-4 text-emerald-200" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {editingId ? 'Edit Data Audit Packaging' : 'Input Audit Harian Packaging'}
                  </h3>
                  <p className="text-[10.5px] text-slate-600 font-sans">
                    Pilih Customer & Tipe Box untuk input mutasi saldo atau temuan NG
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-emerald-100/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveForm} className="p-4 sm:p-5 space-y-4 font-mono text-xs overflow-y-auto flex-1">
              {formError && (
                <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5 font-sans">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Tgl Audit */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase font-sans">
                  Tanggal Audit *
                </label>
                <input
                  type="date"
                  required
                  value={normalizeDateToIso(formData.tglIncoming)}
                  onChange={(e) => setFormData({ ...formData, tglIncoming: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs text-xs font-mono cursor-pointer"
                />
              </div>

              {/* Row 2: Customer Selection */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase flex items-center justify-between font-sans">
                  <span>Customer *</span>
                  <span className="text-emerald-800 text-[9.5px] font-semibold">Master DB ({MASTER_CUSTOMERS.length} PT)</span>
                </label>
                
                {!isCustomCustomer ? (
                  <select
                    required
                    value={formData.customer}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs text-xs font-mono cursor-pointer"
                  >
                    <option value="" disabled>-- Pilih Customer --</option>
                    {MASTER_CUSTOMERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Customer Lainnya (Ketik Manual)</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      autoFocus
                      value={formData.customer}
                      onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                      placeholder="Ketik nama PT / Customer baru..."
                      className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCustomer(false);
                        handleCustomerChange(MASTER_CUSTOMERS[0] || '');
                      }}
                      className="px-2 py-2 rounded-md border border-slate-300 text-[10px] text-slate-600 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                    >
                      Pilih List
                    </button>
                  </div>
                )}
              </div>

              {/* Row 3: Type Box Selection (Cascading from Customer) */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase flex items-center justify-between font-sans">
                  <span>Type Box Packaging *</span>
                  {currentBoxOptions.length > 0 && !isCustomType && (
                    <span className="text-emerald-800 text-[9.5px] font-semibold">
                      {currentBoxOptions.length} Tipe Tersedia
                    </span>
                  )}
                </label>

                {!isCustomType && currentBoxOptions.length > 0 ? (
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs text-xs font-mono cursor-pointer"
                  >
                    <option value="" disabled>-- Pilih Tipe Box --</option>
                    {currentBoxOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Tipe Box Lainnya (Ketik Manual)</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder="Contoh: IDBM A / YMWJ A / DPU A"
                      className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 text-xs font-mono"
                    />
                    {currentBoxOptions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomType(false);
                          setFormData((prev) => ({ ...prev, type: currentBoxOptions[0] || '' }));
                        }}
                        className="px-2 py-2 rounded-md border border-slate-300 text-[10px] text-slate-600 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                      >
                        Pilih List
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Row 4: Mutasi Saldo (Stock Awal, OUT, IN) */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-sans flex items-center justify-between">
                  <span>Mutasi Saldo Packaging (Unit)</span>
                  <span className="text-emerald-800 font-bold">
                    Stock Akhir: {Number(formData.stockAktualInternal || 0) - Number(formData.outQty || 0) + Number(formData.inQty || 0)} Unit
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 font-sans">Stock Awal</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.stockAktualInternal}
                      onChange={(e) => setFormData({ ...formData, stockAktualInternal: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full px-2 py-2 rounded-md border border-slate-300 bg-white text-slate-900 font-bold text-center focus:outline-hidden focus:border-emerald-700 text-sm sm:text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-rose-800 font-sans">OUT (Kirim)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.outQty}
                      onChange={(e) => setFormData({ ...formData, outQty: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full px-2 py-2 rounded-md border border-rose-300 bg-white text-rose-700 font-bold text-center focus:outline-hidden focus:border-rose-600 text-sm sm:text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-sky-800 font-sans">IN (Terima)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.inQty}
                      onChange={(e) => setFormData({ ...formData, inQty: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full px-2 py-2 rounded-md border border-sky-300 bg-white text-sky-800 font-bold text-center focus:outline-hidden focus:border-sky-600 text-sm sm:text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Detail Temuan NG */}
              <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/80 space-y-2.5">
                <div className="text-[10px] font-bold uppercase text-amber-900 tracking-wider font-sans flex items-center justify-between">
                  <span>Detail Temuan Kondisi NG</span>
                  <span className="text-amber-800 font-bold text-[9.5px]">Counter (+ / -)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Slot */}
                  <div className="p-2 rounded-md bg-white border border-amber-200 text-center space-y-1">
                    <div className="text-[10px] font-bold text-slate-700 font-sans">Slot</div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSlotQty((q) => Math.max(0, q - 1))}
                        className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={slotQty}
                        onChange={(e) => setSlotQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-10 text-center font-bold text-rose-700 border-b border-slate-300 focus:outline-hidden text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setSlotQty((q) => q + 1)}
                        className="h-6 w-6 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center justify-center cursor-pointer font-bold"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Kaki */}
                  <div className="p-2 rounded-md bg-white border border-amber-200 text-center space-y-1">
                    <div className="text-[10px] font-bold text-slate-700 font-sans">Kaki</div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setKakiQty((q) => Math.max(0, q - 1))}
                        className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={kakiQty}
                        onChange={(e) => setKakiQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-10 text-center font-bold text-rose-700 border-b border-slate-300 focus:outline-hidden text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setKakiQty((q) => q + 1)}
                        className="h-6 w-6 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center justify-center cursor-pointer font-bold"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Dinding */}
                  <div className="p-2 rounded-md bg-white border border-amber-200 text-center space-y-1">
                    <div className="text-[10px] font-bold text-slate-700 font-sans">Dinding</div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDindingQty((q) => Math.max(0, q - 1))}
                        className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={dindingQty}
                        onChange={(e) => setDindingQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-10 text-center font-bold text-rose-700 border-b border-slate-300 focus:outline-hidden text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setDindingQty((q) => q + 1)}
                        className="h-6 w-6 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center justify-center cursor-pointer font-bold"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Rangka */}
                  <div className="p-2 rounded-md bg-white border border-amber-200 text-center space-y-1">
                    <div className="text-[10px] font-bold text-slate-700 font-sans">Rangka</div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setRangkaQty((q) => Math.max(0, q - 1))}
                        className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={rangkaQty}
                        onChange={(e) => setRangkaQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-10 text-center font-bold text-rose-700 border-b border-slate-300 focus:outline-hidden text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setRangkaQty((q) => q + 1)}
                        className="h-6 w-6 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center justify-center cursor-pointer font-bold"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 6: Keterangan */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase font-sans">Keterangan / Catatan</label>
                <input
                  type="text"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Catatan tambahan kondisi / surat jalan..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Tambah Baris'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ROW CONFIRM MODAL */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Hapus Baris Audit?</h4>
                <p className="text-xs text-slate-500 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 font-mono text-xs">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-2xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET ALL CONFIRM MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Reset Seluruh Data Audit?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini akan mengosongkan seluruh baris input audit packaging.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 font-mono text-xs">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-2xs"
              >
                Ya, Reset Semua
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FILTER POP-UP MODAL (MODAL KHUSUS FILTER TAMPILAN) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-emerald-100 p-3.5 bg-emerald-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-800 text-white shadow-2xs">
                  <Filter className="h-4 w-4 text-emerald-100" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Filter Data Audit Packaging
                  </h3>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Atur tanggal, customer, dan tipe box packaging
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-emerald-100/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 font-mono text-xs overflow-y-auto flex-1">
              {/* Field 1: Tanggal Audit */}
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase flex items-center justify-between font-sans">
                  <span>Tanggal Audit</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayIso)}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        selectedDate === todayIso
                          ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDate('')}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                        !selectedDate
                          ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      Semua
                    </button>
                  </div>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-md border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:outline-hidden focus:border-emerald-700 shadow-2xs cursor-pointer"
                />
              </div>

              {/* Field 2: Customer */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase font-sans">
                  Pilih Customer
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => {
                    setSelectedCustomer(e.target.value);
                    setSelectedType('ALL');
                  }}
                  className="w-full py-2 px-2.5 rounded-md border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-emerald-700 cursor-pointer shadow-2xs font-mono"
                >
                  <option value="ALL">Semua Customer ({customerList.length})</option>
                  {customerList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: Type Box */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase font-sans">
                  Pilih Type Box
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-md border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-emerald-700 cursor-pointer shadow-2xs font-mono"
                >
                  <option value="ALL">Semua Tipe Box ({typeList.length})</option>
                  {typeList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 4: Pencarian Keyword */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase font-sans">
                  Pencarian Kata Kunci
                </label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ketik customer, tipe, keterangan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 rounded-md border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-emerald-700 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between font-mono text-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer('ALL');
                  setSelectedType('ALL');
                  setSearchQuery('');
                  setSelectedDate(todayIso);
                }}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-rose-700 hover:bg-rose-50 font-bold cursor-pointer text-[11px]"
              >
                Reset Filter
              </button>

              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="px-4 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-bold cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span>Terapkan ({sortedData.length} Baris)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) FOR MOBILE */}
      <div className="fixed bottom-6 right-5 sm:hidden z-40">
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#047857] hover:bg-[#065f46] text-white shadow-xl shadow-emerald-950/40 active:scale-90 transition-all cursor-pointer ring-2 ring-white/80"
          aria-label="Tambah Data Audit"
          title="Tambah Data Audit"
        >
          <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
