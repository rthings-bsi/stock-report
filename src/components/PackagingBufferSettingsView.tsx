'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
  Search,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Plus,
  Trash2,
  Building2,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Check,
  X
} from 'lucide-react';
import {
  PACKAGING_CUSTOMER_BOX_MASTER,
  MASTER_CUSTOMERS,
  DEFAULT_PACKAGING_BUFFER_STOCK,
  getBufferStockKey,
  getStandarBuffer
} from '@/lib/packagingMaster';
import { cn } from '@/lib/utils';

interface PackagingBufferSettingsViewProps {
  initialConfig?: Record<string, number>;
  masterData?: Record<string, string[]>;
  onUpdateMasterData?: (newMaster: Record<string, string[]>) => Promise<void> | void;
  canEdit?: boolean;
  onSave?: (newConfig: Record<string, number>) => Promise<void> | void;
}

interface BufferRowItem {
  id: string;
  customer: string;
  type: string;
  key: string;
  standarBuffer: number;
  isCustom?: boolean;
}

export const PackagingBufferSettingsView: React.FC<PackagingBufferSettingsViewProps> = ({
  initialConfig,
  masterData,
  onUpdateMasterData,
  canEdit = true,
  onSave
}) => {
  // Master data customer & box types (synchronizes with prop & localStorage)
  const [currentMasterData, setCurrentMasterData] = useState<Record<string, string[]>>(() => {
    if (masterData && Object.keys(masterData).length > 0) {
      return masterData;
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('spindo_packaging_master_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse cached master data:', e);
      }
    }
    return PACKAGING_CUSTOMER_BOX_MASTER;
  });

  // Local state for buffer configurations
  const [bufferConfig, setBufferConfig] = useState<Record<string, number>>(() => {
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      return { ...DEFAULT_PACKAGING_BUFFER_STOCK, ...initialConfig };
    }
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('spindo_packaging_buffer_stock');
        if (local) {
          const parsed = JSON.parse(local);
          return { ...DEFAULT_PACKAGING_BUFFER_STOCK, ...parsed };
        }
      } catch (e) {
        console.warn('Failed to parse local buffer stock:', e);
      }
    }
    return { ...DEFAULT_PACKAGING_BUFFER_STOCK };
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Form state for adding new box & buffer standard
  const [newCustomer, setNewCustomer] = useState('');
  const [newType, setNewType] = useState('');
  const [newBufferVal, setNewBufferVal] = useState<number>(100);

  // Sync when masterData prop updates
  useEffect(() => {
    if (masterData && Object.keys(masterData).length > 0) {
      setCurrentMasterData(masterData);
    }
  }, [masterData]);

  // Sync when initialConfig changes
  useEffect(() => {
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      setBufferConfig((prev) => ({ ...prev, ...initialConfig }));
    }
  }, [initialConfig]);

  // Customer options list derived from current master data
  const customerList = useMemo(() => {
    return Object.keys(currentMasterData).sort();
  }, [currentMasterData]);

  // Construct flat list of items combining masterData and bufferConfig
  const allRows: BufferRowItem[] = useMemo(() => {
    const list: BufferRowItem[] = [];
    const seenKeys = new Set<string>();

    // 1. Standard and dynamically added keys from masterData
    Object.entries(currentMasterData).forEach(([cust, types]) => {
      if (Array.isArray(types)) {
        types.forEach((t) => {
          const key = getBufferStockKey(cust, t);
          seenKeys.add(key);
          list.push({
            id: key,
            customer: cust,
            type: t,
            key,
            standarBuffer: bufferConfig[key] ?? DEFAULT_PACKAGING_BUFFER_STOCK[key] ?? 100,
            isCustom: !DEFAULT_PACKAGING_BUFFER_STOCK[key]
          });
        });
      }
    });

    // 2. Any additional custom keys present in bufferConfig but missing from masterData
    Object.entries(bufferConfig).forEach(([key, val]) => {
      if (!seenKeys.has(key)) {
        const parts = key.split('___');
        const cust = parts[0] || 'LAINNYA';
        const t = parts[1] || key;
        list.push({
          id: key,
          customer: cust,
          type: t,
          key,
          standarBuffer: val,
          isCustom: true
        });
      }
    });

    return list.sort((a, b) => a.customer.localeCompare(b.customer) || a.type.localeCompare(b.type));
  }, [currentMasterData, bufferConfig]);

  // Filtered rows based on customer & search query
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (selectedCustomer !== 'ALL' && row.customer !== selectedCustomer) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCust = row.customer.toLowerCase().includes(q);
        const matchType = row.type.toLowerCase().includes(q);
        return matchCust || matchType;
      }
      return true;
    });
  }, [allRows, selectedCustomer, searchQuery]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalBox = allRows.length;
    const uniqueCust = new Set(allRows.map((r) => r.customer)).size;
    const avgBuffer = totalBox > 0 ? Math.round(allRows.reduce((acc, r) => acc + r.standarBuffer, 0) / totalBox) : 0;
    return { totalBox, uniqueCust, avgBuffer };
  }, [allRows]);

  // Check if any standard buffer was modified from factory default
  const isDirty = useMemo(() => {
    for (const r of allRows) {
      const def = DEFAULT_PACKAGING_BUFFER_STOCK[r.key] ?? 100;
      if (r.standarBuffer !== def) return true;
    }
    return false;
  }, [allRows]);

  // Update specific row buffer value
  const handleUpdateVal = (key: string, newVal: number) => {
    const val = Math.max(0, isNaN(newVal) ? 0 : newVal);
    setBufferConfig((prev) => ({
      ...prev,
      [key]: val
    }));
  };

  // Save all buffer configurations
  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('spindo_packaging_buffer_stock', JSON.stringify(bufferConfig));
      }

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'packaging_buffer_stock',
          value: bufferConfig
        })
      });

      if (onSave) {
        await onSave(bufferConfig);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save buffer stock config:', err);
      alert('Gagal menyimpan konfigurasi standar buffer stock.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset handler to factory defaults
  const handleReset = () => {
    setBufferConfig({ ...DEFAULT_PACKAGING_BUFFER_STOCK });
    setShowResetConfirm(false);
  };

  // Add new box handler: otomatis mendaftarkan ke masterData + bufferConfig
  const handleAddNewBox = async () => {
    const trimmedCust = newCustomer.trim().toUpperCase();
    const trimmedType = newType.trim().toUpperCase();

    if (!trimmedCust || !trimmedType) {
      alert('Nama Customer dan Tipe Box wajib diisi.');
      return;
    }

    const key = getBufferStockKey(trimmedCust, trimmedType);
    const bufferVal = Math.max(0, newBufferVal || 0);

    // 1. Update buffer config
    const nextBufferConfig = {
      ...bufferConfig,
      [key]: bufferVal
    };
    setBufferConfig(nextBufferConfig);

    // 2. Otomatis tambahkan ke list type box master customer!
    const existingBoxes = currentMasterData[trimmedCust] ? [...currentMasterData[trimmedCust]] : [];
    if (!existingBoxes.includes(trimmedType)) {
      existingBoxes.push(trimmedType);
    }
    const nextMasterData = {
      ...currentMasterData,
      [trimmedCust]: existingBoxes
    };
    setCurrentMasterData(nextMasterData);

    if (onUpdateMasterData) {
      await onUpdateMasterData(nextMasterData);
    }

    // Persist immediately to localStorage and server API
    try {
      localStorage.setItem('spindo_packaging_buffer_stock', JSON.stringify(nextBufferConfig));
      localStorage.setItem('spindo_packaging_master_cache', JSON.stringify(nextMasterData));

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'packaging_buffer_stock', value: nextBufferConfig })
      });

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'packaging_master_db', value: nextMasterData })
      });
    } catch (e) {
      console.warn('Failed to persist new box additions:', e);
    }

    if (onSave) {
      await onSave(nextBufferConfig);
    }

    setShowAddModal(false);
    setNewCustomer('');
    setNewType('');
    setNewBufferVal(100);
  };

  // Delete box handler: menghapus tipe box dari master data & buffer config
  const handleDeleteBox = async (customer: string, type: string, key: string) => {
    if (!confirm(`Hapus tipe box "${type}" untuk customer ${customer}?\nTipe ini juga akan dihapus dari pilihan audit.`)) {
      return;
    }

    const existingBoxes = currentMasterData[customer] ? [...currentMasterData[customer]] : [];
    const remainingBoxes = existingBoxes.filter((b) => b !== type);

    const nextMasterData = { ...currentMasterData };
    if (remainingBoxes.length === 0) {
      delete nextMasterData[customer];
    } else {
      nextMasterData[customer] = remainingBoxes;
    }
    setCurrentMasterData(nextMasterData);

    if (onUpdateMasterData) {
      await onUpdateMasterData(nextMasterData);
    }

    const nextBufferConfig = { ...bufferConfig };
    delete nextBufferConfig[key];
    setBufferConfig(nextBufferConfig);

    try {
      localStorage.setItem('spindo_packaging_master_cache', JSON.stringify(nextMasterData));
      localStorage.setItem('spindo_packaging_buffer_stock', JSON.stringify(nextBufferConfig));

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'packaging_master_db', value: nextMasterData })
      });

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'packaging_buffer_stock', value: nextBufferConfig })
      });
    } catch (e) {
      console.warn('Failed to persist box deletion:', e);
    }

    if (onSave) {
      await onSave(nextBufferConfig);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-5 font-sans pb-16 sm:pb-0">
      {/* 1. Top Banner & Header (Minimalist & Consistent with other views) */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            <Boxes className="h-4.5 w-4.5 text-amber-300" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-sans tracking-tight">
              Standar Buffer Stock Packaging (RTP)
            </h1>
            <div className="text-[10.5px] text-emerald-200/80 font-sans hidden sm:block">
              Unit 5 Karawang • Plant 1105 &bull; Standar Kuota Kebutuhan Harian & Master Tipe Box
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 ml-auto font-mono text-xs">
          {isDirty && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={isSaving}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-700 bg-emerald-950/80 hover:bg-emerald-800 text-white font-semibold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 text-xs"
              title="Reset ke standar pabrik"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-300" strokeWidth={2} />
              <span className="hidden sm:inline">Reset Default</span>
              <span className="sm:hidden">Reset</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 text-xs",
                saveSuccess
                  ? "bg-emerald-400 hover:bg-emerald-300 text-emerald-950"
                  : isDirty
                    ? "bg-amber-400 hover:bg-amber-300 text-amber-950"
                    : "bg-emerald-700 hover:bg-emerald-600 text-white"
              )}
              title="Simpan perubahan standar buffer stock"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-950" strokeWidth={2.4} />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" strokeWidth={2.4} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Summary & Rules Logic Callout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Tipe Box</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.totalBox}</div>
          <span className="text-xs text-slate-500 mt-0.5 block">Tipe packaging terdaftar</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Customer</span>
          <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">{stats.uniqueCust}</div>
          <span className="text-xs text-slate-500 mt-0.5 block">Perusahaan pemilik/penerima box</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rata-rata Buffer</span>
          <div className="text-2xl font-black text-amber-700 mt-1 font-mono">{stats.avgBuffer} <span className="text-xs font-normal text-slate-500">Unit/Hari</span></div>
          <span className="text-xs text-slate-500 mt-0.5 block">Standar kuota harian</span>
        </div>

        {/* Legend Box */}
        <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-center text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">Logika Indikator Status:</span>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500 shrink-0 border border-emerald-600/50" />
              <span className="text-slate-700 font-medium"><strong>Hijau:</strong> &gt; Standar (Surplus / ≥30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-amber-400 shrink-0 border border-amber-500/50" />
              <span className="text-slate-700 font-medium"><strong>Kuning:</strong> = Standar Kebutuhan (Pas)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-rose-500 shrink-0 border border-rose-600/50" />
              <span className="text-slate-700 font-medium"><strong>Merah:</strong> &lt; Standar (Kurang / Defisit)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search, Filter Customer, Tambah Tipe Box */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={1.8} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama customer atau tipe box..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="w-48 sm:w-60">
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-sans"
            >
              <option value="ALL">Semua Customer ({customerList.length})</option>
              {customerList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              <span>Tambah Tipe Box</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Table View */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm text-[11px] uppercase tracking-wider text-slate-600 font-bold select-none">
              <tr>
                <th className="py-3 px-3.5 text-center w-12 border-r border-slate-200/80">#</th>
                <th className="py-3 px-4 border-r border-slate-200/80 min-w-[220px]">Customer</th>
                <th className="py-3 px-3.5 border-r border-slate-200/80 min-w-[130px]">Type Box</th>
                <th className="py-3 px-4 text-center border-r border-slate-200/80 w-56 bg-emerald-50/40 text-emerald-950">
                  Standar Buffer Stock / Hari (Unit)
                </th>
                <th className="py-3 px-4 text-center border-r border-slate-200/80 w-36">Status</th>
                {canEdit && <th className="py-3 px-3 text-center w-28">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="py-12 text-center text-slate-400">
                    Tidak ada data box packaging yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const defaultStd = DEFAULT_PACKAGING_BUFFER_STOCK[row.key];
                  const isModified = defaultStd !== undefined && (bufferConfig[row.key] ?? defaultStd) !== defaultStd;

                  return (
                    <tr key={row.key} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" strokeWidth={1.8} />
                          <span>{row.customer}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 border-r border-slate-100">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold font-mono text-[11px] border border-slate-200/80 shadow-2xs">
                          {row.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 border-r border-slate-100 bg-emerald-50/10">
                        <div className="flex items-center justify-center gap-2 max-w-[200px] mx-auto">
                          {canEdit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateVal(row.key, row.standarBuffer - 10)}
                                className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-xs font-bold border border-slate-200 cursor-pointer shrink-0"
                                title="Kurangi 10 unit"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                step={5}
                                value={row.standarBuffer}
                                onChange={(e) => handleUpdateVal(row.key, parseInt(e.target.value, 10))}
                                className={cn(
                                  "w-24 text-center py-1 px-2 rounded-md border text-xs font-black font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500",
                                  isModified
                                    ? "border-amber-400 bg-amber-50/40 text-amber-950 font-bold"
                                    : "border-slate-200 bg-white text-slate-900"
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateVal(row.key, row.standarBuffer + 10)}
                                className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-xs font-bold border border-slate-200 cursor-pointer shrink-0"
                                title="Tambah 10 unit"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <span className="font-mono font-bold text-slate-900">{row.standarBuffer} Unit</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center border-r border-slate-100">
                        {row.isCustom ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs font-mono">
                            Kustom / Baru
                          </span>
                        ) : isModified ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs font-mono">
                            Disesuaikan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 font-mono">
                            Standar Pabrik
                          </span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isModified && (
                              <button
                                type="button"
                                onClick={() => handleUpdateVal(row.key, defaultStd ?? 100)}
                                title="Kembalikan ke standar pabrik"
                                className="text-xs text-amber-700 hover:text-amber-900 font-semibold p-1 rounded-md hover:bg-amber-50 transition-colors cursor-pointer"
                              >
                                Reset
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteBox(row.customer, row.type, row.key)}
                              title="Hapus tipe box ini dari sistem"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-slate-50/90 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Menampilkan <strong>{filteredRows.length}</strong> dari total <strong>{allRows.length}</strong> tipe packaging terdaftar.</span>
          <span className="text-[11px] text-slate-400 font-mono">Otomatis sinkron dengan daftar box di Modul Audit Harian.</span>
        </div>
      </div>

      {/* 5. Modal Tambah Tipe Box Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-700" strokeWidth={2.4} />
                <span>Tambah Tipe Box Packaging Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Customer</label>
                <input
                  type="text"
                  list="customer-suggestions"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  placeholder="Ketik atau pilih customer (misal: PT ASTEMO MANUFACTURING)"
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-sans"
                />
                <datalist id="customer-suggestions">
                  {customerList.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <span className="text-[10.5px] text-slate-400 mt-1 block">Bisa pilih dari customer terdaftar atau ketik nama customer baru.</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipe Box (RTP)</label>
                <input
                  type="text"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Misal: IDBM-C atau YMPG D"
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Standar Buffer Stock / Hari (Unit)</label>
                <input
                  type="number"
                  min={0}
                  value={newBufferVal}
                  onChange={(e) => setNewBufferVal(parseInt(e.target.value, 10) || 0)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Rata-rata kuota pemakaian per hari sebagai acuan warna indikator.</span>
              </div>

              {/* Anti-slop notice */}
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900 leading-relaxed">
                Tipe box yang ditambahkan di sini akan <strong>otomatis terdaftar ke master box customer</strong> dan langsung muncul di pilihan dropdown audit.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 font-sans">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddNewBox}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs"
              >
                Tambahkan Box & Standar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Konfirmasi Reset Default */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-xl space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
              <RotateCcw className="h-5 w-5" strokeWidth={2} />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Reset Semua Standar Buffer?</h4>
            <p className="text-xs text-slate-500">
              Semua pengaturan kuota harian akan dikembalikan ke nilai standar pabrik (Spindo Unit 5).
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                Ya, Reset Standar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
