'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { IncomingPackagingItem } from '../types/warehouse';
import { formatQty } from '@/lib/utils';
import { parseIncomingPackagingFile } from '@/lib/parseIncomingPackaging';
import { readExcelFile } from '@/lib/parser';
import {
  Plus,
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
  Table2,
  RotateCcw
} from 'lucide-react';

interface IncomingPackagingViewProps {
  data?: IncomingPackagingItem[];
  stockCustomers?: string[];
  isCustomizing?: boolean;
  onDataUpdate?: (newData: IncomingPackagingItem[]) => void;
}

const EMPTY_FORM: Omit<IncomingPackagingItem, 'id'> = {
  tglIncoming: new Date().toLocaleDateString('id-ID'),
  customer: '',
  type: '',
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
  onDataUpdate
}) => {
  const [items, setItems] = useState<IncomingPackagingItem[]>(data);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal State for Add & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<IncomingPackagingItem, 'id'>>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  // Qty State for Detail Temuan NG
  const [slotQty, setSlotQty] = useState(0);
  const [kakiQty, setKakiQty] = useState(0);
  const [dindingQty, setDindingQty] = useState(0);
  const [rangkaQty, setRangkaQty] = useState(0);

  // Autocomplete state for Customer
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Delete Confirm Modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Reset All Confirm Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof IncomingPackagingItem>('stockSaatIni');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setItems(data);
    }
  }, [data]);

  // Click outside to close customer suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifyChange = (newItems: IncomingPackagingItem[]) => {
    setItems(newItems);
    if (onDataUpdate) {
      onDataUpdate(newItems);
    }
  };

  const handleResetAll = () => {
    notifyChange([]);
    setIsResetModalOpen(false);
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      tglIncoming: new Date().toLocaleDateString('id-ID')
    });
    setSlotQty(0);
    setKakiQty(0);
    setDindingQty(0);
    setRangkaQty(0);
    setShowCustomerDropdown(false);
    setFormError('');
    setIsModalOpen(true);
  };

  // Helper to extract numeric qty from detailNG
  const parseDefectQty = (val: any): number => {
    if (!val || val === '-') return 0;
    if (val === 'NG') return 1;
    const n = parseInt(String(val).replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };

  // Open Edit Form
  const handleOpenEdit = (item: IncomingPackagingItem) => {
    setEditingId(item.id);
    setFormData({
      tglIncoming: item.tglIncoming || '',
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
    setShowCustomerDropdown(false);
    setFormError('');
    setIsModalOpen(true);
  };

  // Customer List
  const customerList = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.customer))).filter(Boolean).sort();
  }, [items]);

  // Type List
  const typeList = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.type))).filter(Boolean).sort();
  }, [items]);

  // Filtered Customer Suggestions from Stock
  const customerSuggestions = useMemo(() => {
    const q = (formData.customer || '').trim().toLowerCase();
    const list = Array.from(new Set([...(stockCustomers || []), ...customerList])).filter(Boolean);
    if (!q) return list.slice(0, 8);
    return list.filter((c) => c.toLowerCase().includes(q)).slice(0, 10);
  }, [formData.customer, stockCustomers, customerList]);

  // Save Form (Create or Update)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer.trim()) {
      setFormError('Nama Customer wajib diisi');
      return;
    }
    if (!formData.type.trim()) {
      setFormError('Type Packaging wajib diisi');
      return;
    }

    const calculatedStock = Number(formData.stockAktualInternal || 0) - Number(formData.outQty || 0) + Number(formData.inQty || 0);

    const savedDetailNG = {
      slot: slotQty > 0 ? slotQty : '-',
      kaki: kakiQty > 0 ? kakiQty : '-',
      dinding: dindingQty > 0 ? dindingQty : '-',
      rangka: rangkaQty > 0 ? rangkaQty : '-'
    };

    if (editingId) {
      // UPDATE
      const updated = items.map((i) =>
        i.id === editingId
          ? {
              ...i,
              ...formData,
              stockAktualInternal: Number(formData.stockAktualInternal || 0),
              outQty: Number(formData.outQty || 0),
              inQty: Number(formData.inQty || 0),
              stockSaatIni: calculatedStock,
              detailNG: savedDetailNG
            }
          : i
      );
      notifyChange(updated);
    } else {
      // CREATE
      const newItem: IncomingPackagingItem = {
        id: `INC-PKG-${Date.now()}-${items.length + 1}`,
        no: items.length + 1,
        ...formData,
        stockAktualInternal: Number(formData.stockAktualInternal || 0),
        outQty: Number(formData.outQty || 0),
        inQty: Number(formData.inQty || 0),
        stockSaatIni: calculatedStock,
        detailNG: savedDetailNG
      };
      notifyChange([newItem, ...items]);
    }

    setIsModalOpen(false);
  };

  // Delete item
  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    const updated = items.filter((i) => i.id !== deleteTargetId);
    notifyChange(updated);
    setDeleteTargetId(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (items.length === 0) return;
    const exportRows = items.map((item, idx) => ({
      'No': idx + 1,
      'Tgl Incoming': item.tglIncoming || '-',
      'Customer': item.customer,
      'Type': item.type,
      'Stock Aktual Internal': item.stockAktualInternal,
      'OUT': item.outQty,
      'IN': item.inQty,
      'Stock Saat ini': item.stockSaatIni,
      'Detail NG Slot': item.detailNG?.slot ?? '-',
      'Detail NG Kaki': item.detailNG?.kaki ?? '-',
      'Detail NG Dinding': item.detailNG?.dinding ?? '-',
      'Detail NG Rangka': item.detailNG?.rangka ?? '-',
      'Keterangan': item.keterangan || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Incoming Packaging');
    XLSX.writeFile(workbook, `incoming_packaging_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  // Filtered & Sorted Data
  const filteredData = useMemo(() => {
    return items.filter((item) => {
      const matchCust = selectedCustomer === 'ALL' || item.customer === selectedCustomer;
      const matchType = selectedType === 'ALL' || item.type === selectedType;
      const matchSearch =
        !searchQuery ||
        item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tglIncoming && item.tglIncoming.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCust && matchType && matchSearch;
    });
  }, [items, selectedCustomer, selectedType, searchQuery]);

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

  // Aggregates
  const totalStockAwal = useMemo(() => items.reduce((acc, c) => acc + c.stockAktualInternal, 0), [items]);
  const totalOut = useMemo(() => items.reduce((acc, c) => acc + c.outQty, 0), [items]);
  const totalIn = useMemo(() => items.reduce((acc, c) => acc + c.inQty, 0), [items]);
  const totalStockSaatIni = useMemo(() => items.reduce((acc, c) => acc + c.stockSaatIni, 0), [items]);

  const countNG = useMemo(() => {
    let count = 0;
    items.forEach((item) => {
      const { slot, kaki, dinding, rangka } = item.detailNG || {};
      if (slot && slot !== '-' && slot !== '0') count++;
      if (kaki && kaki !== '-' && kaki !== '0') count++;
      if (dinding && dinding !== '-' && dinding !== '0') count++;
      if (rangka && rangka !== '-' && rangka !== '0') count++;
    });
    return count;
  }, [items]);

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
    <div className="space-y-5 font-sans">
      {/* SECTION HEADER BANNER & ACTION TOOLBAR */}
      <div className="rounded-lg border border-emerald-200/90 bg-gradient-to-r from-emerald-50/70 via-emerald-50/20 to-white p-4 sm:p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-xs font-bold ring-2 ring-emerald-700/20 shrink-0">
              <PackageCheck className="h-5 w-5 text-emerald-100" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  INPUT &amp; KELOLA INCOMING PACKAGING (RTP)
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100/90 text-emerald-900 border border-emerald-300/80">
                  Returnable Transport Packaging
                </span>
              </div>
              <p className="text-xs text-slate-600 font-sans mt-0.5">
                Pencatatan mutasi stock packaging customer: Stock Awal, OUT, IN, dan Detail Temuan Kerusakan (NG)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap font-mono text-xs shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv, .txt, .tsv"
            className="hidden"
            onChange={handleImportExcel}
          />
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-2.5 py-1.5 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            title="Kosongkan / Reset Semua Data Input"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
            <span>Reset Data</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-950 text-slate-700 font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            title="Import File Excel / CSV"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-950 text-slate-700 font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            title="Download Spreadsheet Excel"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ring-1 ring-emerald-700/50"
          >
            <Plus className="h-4 w-4 text-emerald-200" strokeWidth={2.5} />
            <span>Tambah Data Baru</span>
          </button>
        </div>
      </div>

      {/* KPI STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between font-sans">
            <span>Stock Awal</span>
            <Boxes className="h-3.5 w-3.5 text-slate-600" />
          </div>
          <div className="text-base font-bold text-slate-900">{formatQty(totalStockAwal)} Unit</div>
          <div className="text-[10px] text-slate-500 font-sans">Stock Aktual Internal</div>
        </div>

        <div className="p-3 rounded-lg bg-white border border-rose-200/90 shadow-2xs space-y-1 bg-rose-50/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between font-sans">
            <span>Total OUT</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="text-base font-bold text-rose-700">{formatQty(totalOut)} Unit</div>
          <div className="text-[10px] text-slate-500 font-sans">Pengiriman ke Cust</div>
        </div>

        <div className="p-3 rounded-lg bg-white border border-sky-200/90 shadow-2xs space-y-1 bg-sky-50/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 flex items-center justify-between font-sans">
            <span>Total IN</span>
            <ArrowDownLeft className="h-3.5 w-3.5 text-sky-600" />
          </div>
          <div className="text-base font-bold text-sky-800">{formatQty(totalIn)} Unit</div>
          <div className="text-[10px] text-slate-500 font-sans">Penerimaan Kembali</div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-300/90 shadow-2xs space-y-1 ring-1 ring-emerald-500/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 flex items-center justify-between font-sans">
            <span>Stock Saat Ini</span>
            <PackageCheck className="h-3.5 w-3.5 text-emerald-800" />
          </div>
          <div className="text-base font-black text-emerald-950">{formatQty(totalStockSaatIni)} Unit</div>
          <div className="text-[10px] text-emerald-800 font-sans">Sisa Saldo RTP Aktif</div>
        </div>

        <div className="p-3 rounded-lg bg-white border border-amber-200/90 shadow-2xs space-y-1 bg-amber-50/20 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between font-sans">
            <span>Temuan NG</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="text-base font-bold text-amber-900">{countNG} Item</div>
          <div className="text-[10px] text-slate-500 font-sans">Slot / Kaki / Dinding / Rangka</div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari customer, tipe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs transition-colors"
            />
          </div>

          {/* Customer Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Customer:</span>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="py-1.5 px-2 rounded-md border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="ALL">Semua Customer ({customerList.length})</option>
              {customerList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-1.5 px-2 rounded-md border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="ALL">Semua Type ({typeList.length})</option>
              {typeList.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
            <span>Menampilkan:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/90">
              {sortedData.length}
            </span>
            <span className="text-slate-400">/ {items.length} data</span>
          </div>
          {(selectedCustomer !== 'ALL' || selectedType !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer('ALL');
                setSelectedType('ALL');
                setSearchQuery('');
              }}
              className="px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* MAIN DATA TABLE (CLEAN SHADCN/IOS AESTHETIC - NO LOUD BLOCKS) */}
      <div className="rounded-md border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 shadow-2xs">
              {/* SUPER HEADER ROW 1 */}
              <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold border-b border-slate-200">
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 bg-slate-100 w-8">#</th>
                {renderSortHeader('Tgl Incoming', 'tglIncoming', 'left', 'border-r border-slate-200/80 bg-slate-100 hover:bg-slate-200/70', 2)}
                {renderSortHeader('Customer', 'customer', 'left', 'border-r border-slate-200/80 bg-slate-100 hover:bg-slate-200/70', 2)}
                {renderSortHeader('Type', 'type', 'left', 'border-r border-slate-200/80 bg-slate-100 hover:bg-slate-200/70', 2)}
                {renderSortHeader('Stock Aktual Internal', 'stockAktualInternal', 'right', 'border-r border-slate-200/80 bg-slate-100 text-amber-950 font-bold hover:bg-slate-200/70', 2)}
                {renderSortHeader('OUT', 'outQty', 'right', 'border-r border-slate-200/80 bg-slate-100 text-rose-800 font-bold hover:bg-slate-200/70', 2)}
                {renderSortHeader('IN', 'inQty', 'right', 'border-r border-slate-200/80 bg-slate-100 text-sky-800 font-bold hover:bg-slate-200/70', 2)}
                {renderSortHeader('Stock Saat ini', 'stockSaatIni', 'right', 'border-r border-slate-200/80 bg-slate-100 text-emerald-950 font-black hover:bg-slate-200/70', 2)}
                <th colSpan={4} className="py-2 px-3 text-center border-b border-r border-slate-200/80 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                  Detail NG
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-center bg-slate-100 text-slate-700 w-20">Aksi</th>
              </tr>
              {/* DETAIL NG SUB-HEADERS ROW 2 */}
              <tr className="bg-slate-50 text-slate-600 text-[9.5px] font-bold border-b border-slate-200">
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 bg-slate-50">Slot</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 bg-slate-50">Kaki</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 bg-slate-50">Dinding</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 bg-slate-50">Rangka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px] bg-white">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500 font-sans">
                    <div className="space-y-2">
                      <p>Tidak ada data incoming packaging yang sesuai filter.</p>
                      <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-800 text-white font-bold text-xs shadow-2xs hover:bg-emerald-900 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-amber-300" />
                        <span>Tambah Data Pertama</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/90 transition-colors group">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-bold border-r border-slate-100">{idx + 1}</td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium border-r border-slate-100">
                      {row.tglIncoming && row.tglIncoming !== '-' ? (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-800 font-mono font-bold">
                          {row.tglIncoming}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100 max-w-[220px] truncate" title={row.customer}>
                      {row.customer}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap border-r border-slate-100">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[10px] font-bold">
                        {row.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 border-r border-slate-100">
                      {formatQty(row.stockAktualInternal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-700 border-r border-slate-100">
                      {row.outQty > 0 ? formatQty(row.outQty) : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-sky-700 border-r border-slate-100">
                      {row.inQty > 0 ? formatQty(row.inQty) : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-100">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-950 font-black border border-emerald-300/80 shadow-2xs inline-block">
                        {formatQty(row.stockSaatIni)}
                      </span>
                    </td>
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
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(row)}
                          className="p-1 rounded hover:bg-emerald-50 text-slate-500 hover:text-emerald-800 transition-colors cursor-pointer"
                          title="Edit Baris"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(row.id)}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Hapus Baris"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-100 font-bold text-[11px] text-slate-900 shadow-[0_-2px_4px_rgba(0,0,0,0.06)]">
              <tr>
                <td colSpan={4} className="py-3 px-3 uppercase tracking-wider text-slate-700 text-[10px] bg-slate-100">
                  TOTAL KESELURUHAN ({sortedData.length} Baris)
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
                <td colSpan={5} className="py-3 px-2 text-center text-slate-600 text-[10px] bg-slate-100">
                  Detail NG: {countNG} Unit
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL FORM: CREATE / EDIT INCOMING PACKAGING */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-100 p-4 bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-2xs font-bold font-mono text-xs">
                  {editingId ? <Pencil className="h-4 w-4 text-emerald-200" /> : <PackagePlus className="h-4 w-4 text-emerald-200" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingId ? 'Edit Data Incoming Packaging' : 'Tambah Data Incoming Packaging'}
                  </h3>
                  <p className="text-[10px] text-slate-600 font-sans">
                    {editingId ? 'Ubah mutasi atau kondisi detail NG' : 'Input data mutasi stock packaging RTP'}
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

            {/* Form Body */}
            <form onSubmit={handleSaveForm} className="p-5 space-y-4 font-mono text-xs">
              {formError && (
                <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Tgl & Customer with Autocomplete Reference from Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Tgl Incoming</label>
                  <input
                    type="text"
                    value={formData.tglIncoming}
                    onChange={(e) => setFormData({ ...formData, tglIncoming: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs"
                  />
                </div>

                <div className="space-y-1 relative" ref={customerDropdownRef}>
                  <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between">
                    <span>Customer *</span>
                    <span className="text-emerald-800 text-[9px] font-semibold lowercase">auto-suggest</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.customer}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onChange={(e) => {
                        setFormData({ ...formData, customer: e.target.value });
                        setShowCustomerDropdown(true);
                      }}
                      placeholder="Ketik nama customer..."
                      className="w-full pl-2.5 pr-7 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs"
                    />
                    <Building2 className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Floating Suggestions Dropdown */}
                  {showCustomerDropdown && customerSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl z-50 divide-y divide-slate-100 font-sans text-xs">
                      <div className="px-2.5 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase font-mono">
                        Referensi Customer Stock:
                      </div>
                      {customerSuggestions.map((cust) => (
                        <button
                          key={cust}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, customer: cust });
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 hover:text-emerald-950 transition-colors cursor-pointer text-slate-800 font-medium flex items-center justify-between"
                        >
                          <span className="truncate">{cust}</span>
                          <Check className="h-3 w-3 text-emerald-700 opacity-0 hover:opacity-100 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Type Packaging */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Type Packaging RTP *</label>
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="Contoh: IDBM A / SHW0 A / BDK0 A / CNC HC"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs"
                />
              </div>

              {/* Row 3: Mutasi Quantity */}
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Mutasi Saldo Packaging (Unit)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-950">Stock Aktual</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.stockAktualInternal}
                      onChange={(e) => setFormData({ ...formData, stockAktualInternal: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded border border-amber-300 bg-white text-slate-900 font-bold focus:outline-hidden focus:border-amber-600 shadow-2xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-rose-800">OUT (Keluar)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.outQty}
                      onChange={(e) => setFormData({ ...formData, outQty: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded border border-rose-300 bg-white text-rose-700 font-bold focus:outline-hidden focus:border-rose-600 shadow-2xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-sky-800">IN (Masuk)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.inQty}
                      onChange={(e) => setFormData({ ...formData, inQty: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded border border-sky-300 bg-white text-sky-800 font-bold focus:outline-hidden focus:border-sky-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span>Hasil Stock Saat Ini:</span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300 text-sm font-black">
                    {Number(formData.stockAktualInternal || 0) - Number(formData.outQty || 0) + Number(formData.inQty || 0)} Unit
                  </span>
                </div>
              </div>

              {/* Row 4: Detail NG (Input Qty) */}
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider">
                    Temuan Kerusakan (Detail NG) - Input Qty
                  </span>
                  <span className="text-slate-400 font-normal lowercase text-[10px]">
                    isi jumlah unit rusak
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Slot Qty */}
                  <div className={`p-2 rounded-md border transition-all ${
                    slotQty > 0 ? 'bg-rose-50/80 border-rose-300' : 'bg-white border-slate-200'
                  }`}>
                    <label className={`text-[10px] font-bold block mb-1 text-center ${
                      slotQty > 0 ? 'text-rose-900 font-bold' : 'text-slate-600'
                    }`}>
                      Slot
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={slotQty}
                      onChange={(e) => setSlotQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className={`w-full py-1 text-center font-bold text-xs rounded border focus:outline-hidden ${
                        slotQty > 0
                          ? 'border-rose-300 text-rose-800 bg-white'
                          : 'border-slate-200 text-slate-700 bg-slate-50/50'
                      }`}
                    />
                  </div>

                  {/* Kaki Qty */}
                  <div className={`p-2 rounded-md border transition-all ${
                    kakiQty > 0 ? 'bg-rose-50/80 border-rose-300' : 'bg-white border-slate-200'
                  }`}>
                    <label className={`text-[10px] font-bold block mb-1 text-center ${
                      kakiQty > 0 ? 'text-rose-900 font-bold' : 'text-slate-600'
                    }`}>
                      Kaki
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={kakiQty}
                      onChange={(e) => setKakiQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className={`w-full py-1 text-center font-bold text-xs rounded border focus:outline-hidden ${
                        kakiQty > 0
                          ? 'border-rose-300 text-rose-800 bg-white'
                          : 'border-slate-200 text-slate-700 bg-slate-50/50'
                      }`}
                    />
                  </div>

                  {/* Dinding Qty */}
                  <div className={`p-2 rounded-md border transition-all ${
                    dindingQty > 0 ? 'bg-rose-50/80 border-rose-300' : 'bg-white border-slate-200'
                  }`}>
                    <label className={`text-[10px] font-bold block mb-1 text-center ${
                      dindingQty > 0 ? 'text-rose-900 font-bold' : 'text-slate-600'
                    }`}>
                      Dinding
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={dindingQty}
                      onChange={(e) => setDindingQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className={`w-full py-1 text-center font-bold text-xs rounded border focus:outline-hidden ${
                        dindingQty > 0
                          ? 'border-rose-300 text-rose-800 bg-white'
                          : 'border-slate-200 text-slate-700 bg-slate-50/50'
                      }`}
                    />
                  </div>

                  {/* Rangka Qty */}
                  <div className={`p-2 rounded-md border transition-all ${
                    rangkaQty > 0 ? 'bg-rose-50/80 border-rose-300' : 'bg-white border-slate-200'
                  }`}>
                    <label className={`text-[10px] font-bold block mb-1 text-center ${
                      rangkaQty > 0 ? 'text-rose-900 font-bold' : 'text-slate-600'
                    }`}>
                      Rangka
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={rangkaQty}
                      onChange={(e) => setRangkaQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className={`w-full py-1 text-center font-bold text-xs rounded border focus:outline-hidden ${
                        rangkaQty > 0
                          ? 'border-rose-300 text-rose-800 bg-white'
                          : 'border-slate-200 text-slate-700 bg-slate-50/50'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ring-1 ring-emerald-700/50"
                >
                  <Check className="h-4 w-4 text-emerald-200" strokeWidth={2.5} />
                  <span>{editingId ? 'Simpan Perubahan' : 'Tambahkan Baris'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-mono text-xs">
          <div className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Data</h3>
            </div>
            <p className="text-slate-600 font-sans text-xs">
              Apakah Anda yakin ingin menghapus baris data packaging ini? Perubahan akan langsung disimpan ke database.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 rounded bg-rose-700 text-white hover:bg-rose-800 font-bold shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM RESET ALL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-mono text-xs">
          <div className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900">Reset Semua Data Input</h3>
            </div>
            <p className="text-slate-600 font-sans text-xs">
              Apakah Anda yakin ingin mengosongkan seluruh data tabel Incoming Packaging? Tindakan ini akan menghapus semua baris terinput.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="px-3 py-1.5 rounded bg-rose-700 text-white hover:bg-rose-800 font-bold shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Ya, Kosongkan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
